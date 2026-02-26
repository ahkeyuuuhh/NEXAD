import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import type { ApiResponse } from '../types';

const EAS_PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || 'c58f8a0d-88ab-4e14-93b2-368c91253b52';
const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

// Configure how notifications appear when the app is in the foreground
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    } as any),
  });
} catch (error) {
  console.log('Push notifications not available in Expo Go - this is expected');
}

export const notificationService = {
  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<ApiResponse<boolean>> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return { error: 'Notification permissions not granted' };
      }

      return { data: true };
    } catch (error: any) {
      console.log('Notification permission error:', error.message);
      return { error: error.message };
    }
  },

  /**
   * Register this device's Expo push token to the database.
   * Must be called after every login so the token is always fresh.
   */
  async registerForPushNotifications(userId: string): Promise<ApiResponse<string>> {
    try {
      const permResult = await this.requestPermissions();
      if (permResult.error) {
        console.log('[Push] Permission denied:', permResult.error);
        return { error: permResult.error };
      }

      // getExpoPushTokenAsync requires the EAS project ID
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: EAS_PROJECT_ID,
      });
      const token = tokenData.data;
      console.log('[Push] Got push token:', token);

      // Upsert by token so re-logins or re-installs update the existing row
      const { error } = await supabase.from('push_tokens').upsert(
        {
          user_id: userId,
          token,
          device_name: Platform.OS,
          device_os: Platform.OS,
          last_used_at: new Date().toISOString(),
          is_active: true,
        },
        { onConflict: 'token' }
      );

      if (error) {
        console.log('[Push] DB upsert error:', error.message);
        throw error;
      }

      console.log('[Push] Token saved to DB for user', userId);
      return { data: token };
    } catch (error: any) {
      console.log('[Push] registerForPushNotifications error:', error.message);
      return { error: error.message };
    }
  },

  /**
   * Send an Expo push notification to a specific user by looking up
   * their registered token(s) from the database.
   * This is what makes notifications work on OTHER devices.
   */
  async sendPushToUser(userId: string, title: string, body: string, data?: any): Promise<void> {
    try {
      const { data: tokens, error } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(5);

      if (error || !tokens?.length) {
        console.log('[Push] No active tokens for user', userId);
        return;
      }

      const messages = tokens.map(({ token }: { token: string }) => ({
        to: token,
        title,
        body,
        data: data || {},
        sound: 'default',
        priority: 'high',
        channelId: 'default',
      }));

      const response = await fetch(EXPO_PUSH_API, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      console.log('[Push] Expo push API response:', JSON.stringify(result));
    } catch (error: any) {
      // Never throw — in-app Realtime will still catch it for foreground users
      console.log('[Push] sendPushToUser failed:', error.message);
    }
  },

  /**
   * Send local notification
   */
  async sendLocalNotification(title: string, body: string, data?: any): Promise<ApiResponse<string>> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null, // Send immediately
      });

      return { data: notificationId };
    } catch (error: any) {
      return { error: error.message || 'Failed to send notification' };
    }
  },

  /**
   * Schedule notification for later
   */
  async scheduleNotification(
    title: string,
    body: string,
    triggerDate: Date,
    data?: any
  ): Promise<ApiResponse<string>> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: { date: triggerDate } as any,
      });

      return { data: notificationId };
    } catch (error: any) {
      return { error: error.message || 'Failed to schedule notification' };
    }
  },

  /**
   * Cancel scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<ApiResponse<null>> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      return { data: null };
    } catch (error: any) {
      return { error: error.message || 'Failed to cancel notification' };
    }
  },

  /**
   * Get user notifications from database
   */
  async getUserNotifications(userId: string, limit: number = 20): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch notifications' };
    }
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) throw error;

      return { data: null };
    } catch (error: any) {
      return { error: error.message || 'Failed to mark notification as read' };
    }
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<ApiResponse<number>> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      return { data: count || 0 };
    } catch (error: any) {
      return { error: error.message || 'Failed to get unread count' };
    }
  },

  /**
   * Create a notification row via a SECURITY DEFINER RPC function.
   * This bypasses all RLS policies, so a student can notify a teacher
   * and vice-versa — the root cause of past notification failures.
   * Also sends an Expo push notification to the target user's device.
   *
   * Valid type values (must match notification_type enum):
   *   request_submitted | request_accepted | request_declined |
   *   consultation_reminder | new_message | classroom_announcement |
   *   attachment_bin_created | document_uploaded | ai_brief_ready |
   *   consultation_completed | consultation_cancelled | new_announcement
   */
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: string = 'request_submitted',
    consultationRequestId?: string,
    relatedId?: string
  ): Promise<ApiResponse<any>> {
    try {
      // Use SECURITY DEFINER RPC — runs as DB owner, bypasses all RLS.
      const { data, error } = await supabase.rpc('create_notification', {
        p_user_id:                 userId,
        p_title:                   title,
        p_message:                 message,
        p_type:                    type,
        p_consultation_request_id: consultationRequestId ?? null,
        p_related_id:              relatedId ?? consultationRequestId ?? null,
      });

      if (error) {
        console.error('[Notif] RPC create_notification failed for user', userId,
          '| type:', type, '| error:', error.message, '| code:', error.code,
          '\nFalling back to direct insert...');

        // Fallback: direct insert using the correct column names
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('notifications')
          .insert({
            user_id:                  userId,
            title,
            message,
            type,
            consultation_request_id:  consultationRequestId ?? null,
            related_id:               relatedId ?? consultationRequestId ?? null,
            is_read:                  false,
            created_at:               new Date().toISOString(),
          })
          .select('*')
          .single();

        if (fallbackError) {
          console.error('[Notif] Fallback insert also failed:', fallbackError.message);
          throw fallbackError;
        }

        console.log('[Notif] Fallback insert succeeded for user', userId);
        this.sendPushToUser(userId, title, message, { type, consultationRequestId, relatedId }).catch(() => {});
        return { data: fallbackData };
      }

      console.log('[Notif] RPC succeeded for user', userId, '| type:', type);
      this.sendPushToUser(userId, title, message, { type, consultationRequestId, relatedId }).catch(() => {});

      return { data };
    } catch (error: any) {
      console.error('[Notif] createNotification totally failed:', error.message);
      return { error: error.message || 'Failed to create notification' };
    }
  },

  /**
   * Create notification for consultation approval
   */
  async notifyConsultationApproved(
    studentId: string,
    teacherName: string,
    subject: string,
    scheduledTime: string,
    classroomNumber?: string
  ): Promise<ApiResponse<any>> {
    const locationText = classroomNumber ? ` in Room ${classroomNumber}` : '';
    const title = 'Consultation Approved! 🎉';
    const message = `Your consultation request with ${teacherName} about "${subject}" has been approved${locationText}. Scheduled for ${new Date(scheduledTime).toLocaleString()}.`;
    
    return await this.createNotification(studentId, title, message, 'request_accepted');
  },

  /**
   * Create notification for consultation declined
   */
  async notifyConsultationDeclined(
    studentId: string,
    teacherName: string,
    subject: string
  ): Promise<ApiResponse<any>> {
    const title = 'Request Declined';
    const message = `${teacherName} has declined your consultation request about "${subject}". You can submit a new request with different time preferences.`;
    
    return await this.createNotification(studentId, title, message, 'request_declined');
  },

  /**
   * Create notification for new consultation request
   */
  async notifyNewConsultationRequest(
    teacherId: string,
    studentName: string,
    subject: string,
    consultationRequestId?: string
  ): Promise<ApiResponse<any>> {
    const title = 'New Consultation Request 📝';
    const message = `${studentName} has requested a consultation about "${subject}".`;
    
    return await this.createNotification(teacherId, title, message, 'request_submitted', consultationRequestId);
  },

  /**
   * Create notification for consultation cancellation
   */
  async notifyConsultationCancelled(
    userId: string,
    subject: string,
    reason: string = 'No reason provided'
  ): Promise<ApiResponse<any>> {
    const title = 'Consultation Cancelled ❌';
    const message = `Your consultation about "${subject}" has been cancelled. ${reason}`;
    
    return await this.createNotification(userId, title, message, 'consultation_cancelled');
  },

  /**
   * Create notification for consultation completion
   */
  async notifyConsultationCompleted(
    userId: string,
    subject: string
  ): Promise<ApiResponse<any>> {
    const title = 'Consultation Completed ✅';
    const message = `Your consultation about "${subject}" has been marked as completed.`;
    
    return await this.createNotification(userId, title, message, 'consultation_completed');
  },

  /**
   * Notify a user that they received a new message
   */
  async notifyNewMessage(
    recipientId: string,
    senderName: string,
    messagePreview: string,
    consultationRequestId?: string
  ): Promise<ApiResponse<any>> {
    const title = `New message from ${senderName} 💬`;
    const preview = messagePreview.length > 80
      ? `${messagePreview.substring(0, 80)}…`
      : messagePreview;

    return await this.createNotification(
      recipientId,
      title,
      preview,
      'new_message',
      consultationRequestId
    );
  },

  /**
   * Notify a teacher that a student cancelled their pending consultation request
   */
  async notifyConsultationRequestCancelled(
    teacherId: string,
    studentName: string,
    subject: string
  ): Promise<ApiResponse<any>> {
    const title = 'Consultation Request Withdrawn';
    const message = `${studentName} has cancelled their consultation request about "${subject}".`;

    return await this.createNotification(teacherId, title, message, 'request_submitted');
  },

  /**
   * Notify all provided user IDs about a new classroom announcement.
   * Call with the array of student user IDs from the classroom.
   */
  async notifyNewAnnouncement(
    studentIds: string[],
    teacherName: string,
    classroomName: string,
    announcementTitle: string,
    announcementId?: string
  ): Promise<void> {
    const title = `📢 New announcement in ${classroomName}`;
    const message = `${teacherName}: ${announcementTitle}`;

    await Promise.all(
      studentIds.map(studentId =>
        this.createNotification(studentId, title, message, 'new_announcement').catch(() => {})
      )
    );
  },
};
