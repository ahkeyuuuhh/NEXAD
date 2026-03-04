import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import type { AppNotification } from '../../hooks/useRealtimeNotifications';
import { Ionicons } from '@expo/vector-icons';
import { C, F, T, S, R, shared, shadow } from '../../config/theme';

export default function NotificationsScreen({ navigation }: any) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  const authContext = useAuth();
  const userId = authContext.user?.user_id;
  const userRole = authContext.user?.role;

  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead: markAllAsReadHook,
    deleteNotification,
    refresh,
  } = useRealtimeNotifications(userId);

  // Auto-mark all notifications as read when this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      markAllAsReadHook();
    }, [markAllAsReadHook])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  // Strip leading/trailing emoji characters from database-generated text
  const stripEmoji = useCallback((text: string) =>
    text.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{FE00}-\u{FEFF}\u{1FA00}-\u{1FAFF}]/gu, '').replace(/\s{2,}/g, ' ').trim(),
  []);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    await markAsRead(notificationId);
  }, [markAsRead]);

  const handleDeleteNotification = useCallback(async (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Remove this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteNotification(notificationId) },
      ]
    );
  }, [deleteNotification]);

  const handleLongPress = useCallback((id: string) => {
    setIsSelectMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleCancelSelect = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      'Delete Notifications',
      `Delete ${selectedIds.size} notification${selectedIds.size > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await Promise.all([...selectedIds].map(id => deleteNotification(id)));
            setIsSelectMode(false);
            setSelectedIds(new Set());
          },
        },
      ]
    );
  }, [selectedIds, deleteNotification]);

  const handleSelectAll = useCallback(() => {
    const current = filter === 'all' ? notifications : notifications.filter(n => !n.is_read);
    if (selectedIds.size === current.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(current.map(n => n.id)));
    }
  }, [filter, notifications, selectedIds.size]);

  // Returns a label + screen name for actionable deep-link notifications.
  // Navigates directly on tap — no modal needed for actionable items.
  const getDeepLinkAction = useCallback(
    (notification: AppNotification): { label: string; screen: string; params: object } | null => {
      const rid = notification.related_id;

      // ── Student-side ────────────────────────────────────────────────
      if (userRole === 'student' || !userRole) {
        switch (notification.type) {
          case 'submission_for_consultation':
            // With rid → jump straight to the bin so they can tap "Request Consultation"
            // Without rid (old notification) → classrooms list so they can locate the bin
            return rid
              ? { label: 'Request Consultation →', screen: 'AttachmentBinSubmission', params: { binId: rid } }
              : { label: 'Go to Classrooms →', screen: 'StudentClassrooms', params: {} };
          case 'submission_revised':
            // With rid → jump straight to the bin to re-submit
            // Without rid → classrooms list
            return rid
              ? { label: 'Re-submit Now →', screen: 'AttachmentBinSubmission', params: { binId: rid } }
              : { label: 'Go to Classrooms →', screen: 'StudentClassrooms', params: {} };
          case 'submission_approved':
            return rid
              ? { label: 'View Submission →', screen: 'AttachmentBinSubmission', params: { binId: rid } }
              : { label: 'Go to Classrooms →', screen: 'StudentClassrooms', params: {} };
          case 'request_accepted':
            // Go to the active consultations screen pre-filtered to Approved
            // so the student immediately sees the scheduled date/time/room.
            return { label: 'View Approved Consultation →', screen: 'StudentConsultations', params: { initialFilter: 'approved' } };
          case 'request_declined':
            return { label: 'View History →', screen: 'ConsultationHistory', params: { initialFilter: 'declined' } };
          case 'consultation_completed':
            // Navigate directly to the Completed tab so they see the finished session
            return { label: 'View Completed →', screen: 'ConsultationHistory', params: { initialFilter: 'completed' } };
          default:
            return null;
        }
      }

      // ── Teacher-side ────────────────────────────────────────────────
      switch (notification.type) {
        case 'request_submitted':
          return { label: 'Review Request →', screen: 'AllRequests', params: {} };
        case 'document_uploaded':
        case 'attachment_bin_created':
          return rid
            ? { label: 'Review Submission →', screen: 'TeacherBinReview', params: { binId: rid } }
            : null;
        default:
          return null;
      }
    },
    [userRole]
  );

  const handleNotificationPress = useCallback((notification: AppNotification) => {
    // Always mark as read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    // For actionable notifications: navigate directly, skip the modal
    const action = getDeepLinkAction(notification);
    if (action) {
      navigation.navigate(action.screen as never, action.params as never);
    } else {
      // Non-actionable: show detail modal
      setSelectedNotification(notification);
      setShowDetailModal(true);
    }
  }, [markAsRead, getDeepLinkAction]);

  const handleMarkAllAsRead = useCallback(async () => {
    const hasUnread = notifications.some(n => !n.is_read);
    if (!hasUnread) return;
    Alert.alert(
      'Mark All as Read',
      'Mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All',
          style: 'default',
          onPress: async () => {
            await markAllAsReadHook();
          },
        },
      ]
    );
  }, [markAllAsReadHook, notifications]);

  const closeDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedNotification(null);
  }, []);

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (error) {
      return 'Unknown';
    }
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'request_accepted':           return 'checkmark-circle-outline';
      case 'request_submitted':          return 'document-text-outline';
      case 'request_declined':           return 'close-circle-outline';
      case 'consultation_cancelled':     return 'close-outline';
      case 'consultation_completed':     return 'checkmark-done-outline';
      case 'new_message':                return 'chatbubble-outline';
      case 'consultation_reminder':      return 'alarm-outline';
      case 'classroom_announcement':
      case 'new_announcement':           return 'megaphone-outline';
      case 'ai_brief_ready':             return 'sparkles-outline';
      case 'submission_approved':        return 'checkmark-circle-outline';
      case 'submission_revised':         return 'create-outline';
      case 'submission_for_consultation':return 'chatbubbles-outline';
      case 'student_joined_classroom':   return 'school-outline';
      default:                           return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'request_declined':
      case 'consultation_cancelled':     return C.ink4;
      default:                           return C.ink2;
    }
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.is_read);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.ink2} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={isSelectMode ? handleCancelSelect : () => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name={isSelectMode ? 'close' : 'chevron-back'} size={20} color={C.ink2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isSelectMode ? `${selectedIds.size} selected` : 'Notifications'}
        </Text>
        <TouchableOpacity
          onPress={isSelectMode ? handleSelectAll : handleMarkAllAsRead}
          style={styles.markAllButton}
          disabled={!isSelectMode && unreadCount === 0}
        >
          <Text style={[styles.markAllText, !isSelectMode && unreadCount === 0 && styles.markAllTextDisabled]}>
            {isSelectMode
              ? (selectedIds.size === (filter === 'all' ? notifications : notifications.filter(n => !n.is_read)).length ? 'Deselect all' : 'Select all')
              : 'Mark all'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterTabText, filter === 'unread' && styles.filterTabTextActive]}>
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={56} color={C.ink5} />
            <Text style={styles.emptyText}>
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              You'll see notifications about your consultations here
            </Text>
          </View>
        ) : (
          filteredNotifications.map((notification) => {
            const isSelected = selectedIds.has(notification.id);
            const cardView = (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationCard,
                  !notification.is_read && styles.notificationCardUnread,
                  isSelected && styles.notificationCardSelected,
                ]}
                onPress={() => isSelectMode ? handleToggleSelect(notification.id) : handleNotificationPress(notification)}
                onLongPress={() => !isSelectMode && handleLongPress(notification.id)}
                delayLongPress={350}
              >
                {isSelectMode && (
                  <View style={[styles.selectCheckbox, isSelected && styles.selectCheckboxActive]}>
                    {isSelected && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </View>
                )}
                <View style={[styles.notificationIcon, { borderColor: getNotificationColor(notification.type) }]}>
                  <Ionicons name={getNotificationIcon(notification.type) as any} size={20} color={getNotificationColor(notification.type)} />
                </View>

                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <Text style={styles.notificationTitle} numberOfLines={1}>{stripEmoji(notification.title)}</Text>
                    {!notification.is_read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notificationMessage} numberOfLines={2}>{stripEmoji(notification.message)}</Text>
                  <Text style={styles.notificationTime}>{formatTimeAgo(notification.created_at)}</Text>
                </View>
              </TouchableOpacity>
            );
            if (isSelectMode) {
              return <React.Fragment key={notification.id}>{cardView}</React.Fragment>;
            }
            return (
              <Swipeable
                key={notification.id}
                renderRightActions={() => (
                  <TouchableOpacity
                    style={styles.swipeDeleteAction}
                    onPress={() => handleDeleteNotification(notification.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                )}
              >
                {cardView}
              </Swipeable>
            );
          })
        )}
      </ScrollView>

      {/* Multi-select delete bar */}
      {isSelectMode && (
        <View style={styles.selectActionBar}>
          <TouchableOpacity
            style={[styles.selectDeleteBtn, selectedIds.size === 0 && { opacity: 0.4 }]}
            onPress={handleDeleteSelected}
            disabled={selectedIds.size === 0}
          >
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.selectDeleteBtnText}>Delete ({selectedIds.size})</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notification Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeDetailModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedNotification && (
              <>
                <View style={styles.modalHeader}>
                  <Ionicons name={getNotificationIcon(selectedNotification.type) as any} size={28} color={C.ink2} />
                  <Text style={styles.modalTitle}>{selectedNotification.title}</Text>
                  <TouchableOpacity onPress={closeDetailModal} style={styles.modalCloseBtn}>
                    <Ionicons name="close" size={22} color={C.ink3} />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalBody}>
                  <Text style={styles.modalMessage}>{selectedNotification.message}</Text>
                  <Text style={styles.modalTime}>
                    {formatTimeAgo(selectedNotification.created_at)}
                  </Text>
                </View>
                {/* Contextual deep-link CTA (replaces dead-end 'Done' for actionable notifications) */}
                {(() => {
                  const action = getDeepLinkAction(selectedNotification);
                  return action ? (
                    <TouchableOpacity
                      style={styles.modalActionBtn}
                      onPress={() => {
                        closeDetailModal();
                        navigation.navigate(action.screen as never, action.params as never);
                      }}
                    >
                      <Text style={styles.modalActionBtnText}>{action.label}</Text>
                    </TouchableOpacity>
                  ) : null;
                })()}
                <TouchableOpacity style={[styles.modalDoneBtn, { marginTop: 8 }]} onPress={closeDetailModal}>
                  <Text style={styles.modalDoneBtnText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: S.md,
    fontSize: 16,
    fontWeight: '400' as const,
    color: C.ink3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: R.full,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.soft,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: C.ink1,
  },
  markAllButton: {
    paddingVertical: S.xs,
    paddingHorizontal: S.sm,
  },
  markAllText: {
    fontWeight: '600' as const,
    fontSize: 14,
    color: C.ink2,
  },
  markAllTextDisabled: {
    color: C.ink5,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    paddingHorizontal: S.lg,
    paddingTop: S.md,
    paddingBottom: S.sm,
    gap: S.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: R.sm,
    alignItems: 'center',
    backgroundColor: C.surfaceAlt,
  },
  filterTabActive: {
    backgroundColor: C.action,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: C.ink3,
  },
  filterTabTextActive: {
    color: C.actionText,
  },
  content: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  notificationCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 10,
    marginBottom: 8,
    marginHorizontal: 4,
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
    ...shadow.card,
  },
  swipeDeleteAction: {
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    borderRadius: R.lg,
    marginBottom: 8,
    marginHorizontal: 4,
  },
  notificationCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  selectCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    alignSelf: 'center',
    flexShrink: 0,
  },
  selectCheckboxActive: {
    backgroundColor: C.action,
    borderColor: C.action,
  },
  selectActionBar: {
    backgroundColor: C.surface,
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    paddingBottom: S.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    ...shadow.float,
  },
  selectDeleteBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: R.lg,
    gap: S.sm,
  },
  selectDeleteBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  notificationCardUnread: {
    backgroundColor: C.surfaceRaised,
  },
  notificationIcon: {
    width: 38,
    height: 38,
    borderRadius: R.full,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: S.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: S.xs,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: C.ink1,
    flex: 1,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: R.full,
    backgroundColor: C.ink1,
    marginLeft: S.sm,
  },
  notificationMessage: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: C.ink3,
    lineHeight: 18,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: C.ink4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: C.ink2,
    marginTop: S.lg,
    marginBottom: S.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink4,
    textAlign: 'center',
  },
  // ─── Detail Modal ───────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: C.scrim,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.xxl,
    borderTopRightRadius: R.xxl,
    paddingHorizontal: S.xl,
    paddingBottom: S.xxl,
    paddingTop: S.sm,
    ...shadow.float,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    gap: S.md,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600' as const,
    color: C.ink1,
  },
  modalCloseBtn: {
    padding: S.xs,
  },
  modalBody: {
    paddingVertical: S.xl,
    gap: S.sm,
  },
  modalMessage: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: C.ink2,
    lineHeight: 22,
  },
  modalTime: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: C.ink4,
    marginTop: S.xs,
  },
  modalActionBtn: {
    backgroundColor: C.action,
    borderRadius: R.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 0,
  },
  modalActionBtnText: {
    color: C.actionText,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalDoneBtn: {
    backgroundColor: C.surfaceAlt,
    borderRadius: R.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalDoneBtnText: {
    color: C.ink2,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
