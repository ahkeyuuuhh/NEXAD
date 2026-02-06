import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { consultationService } from '../../services/consultationService';
import { messageService, MessageWithSender } from '../../services/messageService';
import { notificationService } from '../../services/notificationService';
import { profileService, TeacherProfile } from '../../services/profileService';
import type { ConsultationRequest } from '../../types';

// Dashboard data limits
const CONSULTATION_LIMIT = 5;
const MESSAGE_LIMIT = 5;

interface DashboardData {
  pendingRequests: ConsultationRequest[];
  unreadMessages: MessageWithSender[];
  unreadNotificationCount: number;
  profile: TeacherProfile | null;
  upcomingAppointments: ConsultationRequest[];
}

export default function TeacherDashboard({ navigation, route }: any) {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    pendingRequests: [],
    unreadMessages: [],
    unreadNotificationCount: 0,
    profile: null,
    upcomingAppointments: [],
  });

  const authContext = useAuth();
  const currentUser = authContext.user;
  const userId = currentUser?.user_id;

  const loadDashboardData = useCallback(async () => {
    if (!userId) return;
    try {
      const [pendingResult, messagesResult, notificationsResult, profileResult, appointmentsResult] = await Promise.all([
        consultationService.getTeacherRequests(userId, 'pending', 1, CONSULTATION_LIMIT),
        messageService.getUnreadMessages(userId, MESSAGE_LIMIT),
        notificationService.getUnreadCount(userId),
        profileService.getTeacherProfile(userId),
        consultationService.getTeacherRequests(userId, 'accepted', 1, CONSULTATION_LIMIT),
      ]);

      setDashboardData({
        pendingRequests: pendingResult.data?.data || [],
        unreadMessages: messagesResult.data || [],
        unreadNotificationCount: notificationsResult.data || 0,
        profile: profileResult.data || null,
        upcomingAppointments: appointmentsResult.data?.data || [],
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data.');
    }
  }, [userId]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadDashboardData();
      setIsLoading(false);
    };
    init();
  }, [loadDashboardData]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await authContext.signOut();
        },
      },
    ]);
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const result = await consultationService.updateStatus(requestId, 'accepted');
      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }
      Alert.alert('Success', 'Request approved');
      await loadDashboardData();
    } catch (error) {
      Alert.alert('Error', 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    Alert.alert('Reject Request', 'Are you sure you want to reject this request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await consultationService.updateStatus(requestId, 'declined');
            if (result.error) {
              Alert.alert('Error', result.error);
              return;
            }
            Alert.alert('Success', 'Request rejected');
            await loadDashboardData();
          } catch (error) {
            Alert.alert('Error', 'Failed to reject request');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  const profile = dashboardData.profile || currentUser;
  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Professor';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{fullName[0] || 'P'}</Text>
          </View>
          <Text style={styles.headerTitle}>{fullName}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => Alert.alert('Notifications', 'Feature coming soon!')}
          >
            <Text style={styles.iconText}>🔔</Text>
            {dashboardData.unreadNotificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{dashboardData.unreadNotificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setShowSideMenu(true)}
          >
            <Text style={styles.iconText}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Calendar View of Appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Consultations Calendar</Text>
          <TouchableOpacity 
            style={styles.calendarCard}
            onPress={() => navigation.navigate('TeacherConsultations')}
          >
            <View style={styles.calendarCardContent}>
              <Text style={styles.calendarIcon}>📅</Text>
              <View style={styles.calendarInfo}>
                <Text style={styles.calendarTitle}>View Calendar & Consultations</Text>
                <Text style={styles.calendarSubtext}>
                  {dashboardData.upcomingAppointments.length} upcoming appointments
                </Text>
              </View>
              <Text style={styles.calendarArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Pending Requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Requests</Text>
            {dashboardData.pendingRequests.length > CONSULTATION_LIMIT && (
              <TouchableOpacity onPress={() => navigation.navigate('RequestManagement')}>
                <Text style={styles.viewAllText}>View All →</Text>
              </TouchableOpacity>
            )}
          </View>

          {dashboardData.pendingRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No pending requests</Text>
            </View>
          ) : (
            dashboardData.pendingRequests.map((request, index) => (
              <TouchableOpacity 
                key={request.id} 
                style={styles.requestCard}
                onPress={() => navigation.navigate('RequestApproval', { request })}
              >
                <View style={styles.requestCardHeader}>
                  <View style={styles.requestAvatar}>
                    <Text style={styles.requestAvatarText}>
                      {request.student?.first_name?.[0] || 'S'}
                    </Text>
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>
                      {request.student?.first_name || 'Student'} {request.student?.last_name || 'Name'}
                    </Text>
                    <Text style={styles.requestSubject} numberOfLines={2}>
                      {request.subject_line || 'No subject provided'}
                    </Text>
                    <Text style={styles.requestDate}>
                      {request.preferred_time_slots && request.preferred_time_slots.length > 0 
                        ? new Date(request.preferred_time_slots[0].start).toLocaleDateString() 
                        : 'No date'}
                    </Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <View style={styles.tapToViewHint}>
                    <Text style={styles.tapToViewText}>Tap to review →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Unread Messages */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Unread Messages</Text>
            {dashboardData.unreadMessages.length > MESSAGE_LIMIT && (
              <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'View all messages')}>
                <Text style={styles.viewAllText}>View All →</Text>
              </TouchableOpacity>
            )}
          </View>

          {dashboardData.unreadMessages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No unread messages</Text>
            </View>
          ) : (
            dashboardData.unreadMessages.map((message) => (
              <TouchableOpacity 
                key={message.id} 
                style={styles.messageCard}
                onPress={() => Alert.alert('Coming Soon', 'Open message thread')}
              >
                <View style={styles.messageHeader}>
                  <Text style={styles.messageSubject} numberOfLines={1}>
                    {message.sender ? `From ${message.sender.first_name} ${message.sender.last_name}` : 'Unknown Sender'}
                  </Text>
                </View>
                <Text style={styles.messagePreview} numberOfLines={2}>
                  {message.content}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Side Menu Modal */}
      <Modal
        visible={showSideMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSideMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSideMenu(false)}
        >
          <View style={styles.sideMenu}>
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setShowSideMenu(false);
              Alert.alert('Coming Soon', 'My Schedule');
            }}>
              <Text style={styles.menuItemText}>📅 My Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setShowSideMenu(false);
              Alert.alert('Coming Soon', 'All Requests');
            }}>
              <Text style={styles.menuItemText}>📋 All Requests</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setShowSideMenu(false);
              Alert.alert('Coming Soon', 'Messages');
            }}>
              <Text style={styles.menuItemText}>💬 Messages</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setShowSideMenu(false);
              Alert.alert('Coming Soon', 'Profile Settings');
            }}>
              <Text style={styles.menuItemText}>⚙️ Settings</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={[styles.menuItem, styles.signOutItem]} onPress={() => {
              setShowSideMenu(false);
              handleSignOut();
            }}>
              <Text style={[styles.menuItemText, styles.signOutText]}>🚪 Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconText: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  viewAllText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  calendarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  calendarInfo: {
    flex: 1,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  calendarSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  calendarArrow: {
    fontSize: 20,
    color: '#3b82f6',
    fontWeight: '600',
  },
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  requestCardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  requestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  requestSubject: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  tapToViewHint: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tapToViewText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  messageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageHeader: {
    marginBottom: 8,
  },
  messageSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  messagePreview: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sideMenu: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#1f2937',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  signOutItem: {
    marginTop: 8,
  },
  signOutText: {
    color: '#ef4444',
    fontWeight: '600',
  },
});
