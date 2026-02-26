import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../config/supabase';
import { notificationService } from '../services/notificationService';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  related_id?: string; // binId / requestId – used for deep-link navigation
}

// Generate a stable instance ID once per module load – not per render
let _instanceCounter = 0;

/**
 * useRealtimeNotifications
 *
 * Each call to this hook creates its OWN uniquely-named Supabase Realtime
 * channel so that the dashboard and the NotificationsScreen can both
 * subscribe simultaneously without overwriting each other.
 *
 * Features:
 * - Instant badge update when a new notification arrives
 * - Fires a local push notification for every new server-side INSERT
 * - markAsRead / markAllAsRead update the DB and state in one call
 * - Dedup guard prevents a race-condition from adding the same row twice
 */
export function useRealtimeNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Unique ID for this hook instance so the channel name never collides
  const instanceId = useRef<string>(`${++_instanceCounter}`);
  // Track whether we've finished the initial fetch so we don't fire
  // local push notifications for notifications that already existed.
  const initialLoadDone = useRef(false);

  // ─── helpers ──────────────────────────────────────────────────────────────

  const recalcUnread = (list: AppNotification[]) =>
    list.filter(n => !n.is_read).length;

  // ─── fetch ─────────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    const result = await notificationService.getUserNotifications(userId, 100);
    if (result.data) {
      const list = result.data as AppNotification[];
      setNotifications(list);
      setUnreadCount(recalcUnread(list));
    }
    setIsLoading(false);
    initialLoadDone.current = true;
  }, [userId]);

  // ─── mark read helpers ─────────────────────────────────────────────────────

  const markAsRead = useCallback(async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
    setNotifications(prev => {
      const next = prev.map(n =>
        n.id === notificationId
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n
      );
      setUnreadCount(recalcUnread(next));
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    setNotifications(prev => {
      const unread = prev.filter(n => !n.is_read);
      // Fire DB updates without waiting (fire-and-forget)
      unread.forEach(n => notificationService.markAsRead(n.id));
      const next = prev.map(n => ({
        ...n,
        is_read: true,
        read_at: new Date().toISOString(),
      }));
      setUnreadCount(0);
      return next;
    });
  }, [userId]);

  // ─── realtime subscription ─────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;

    // Load existing notifications first
    fetchNotifications();

    // Build a unique channel name per hook instance so that two simultaneous
    // subscriptions (e.g. dashboard + NotificationsScreen) never conflict.
    const channelName = `notif-user-${userId}-${instanceId.current}`;

    // Remove any stale channel from a previous render cycle
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          setNotifications(prev => {
            // Dedup guard: ignore if we already have this notification
            if (prev.some(n => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });
          setUnreadCount(prev => prev + 1);
          // Only fire local push for truly new notifications (not the initial load)
          if (initialLoadDone.current) {
            notificationService
              .sendLocalNotification(newNotif.title, newNotif.message, {
                type: newNotif.type,
              })
              .catch(() => {
                // Silently ignore if push not available (Expo Go)
              });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as AppNotification;
          setNotifications(prev => {
            const next = prev.map(n => (n.id === updated.id ? updated : n));
            setUnreadCount(recalcUnread(next));
            return next;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const deletedId = (payload.old as AppNotification).id;
          setNotifications(prev => {
            const next = prev.filter(n => n.id !== deletedId);
            setUnreadCount(recalcUnread(next));
            return next;
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to notifications for user ${userId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[Realtime] Notification channel error — falling back to fetch');
          fetchNotifications();
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      initialLoadDone.current = false;
    };
  }, [userId]); // intentionally only depends on userId — fetchNotifications is stable

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
