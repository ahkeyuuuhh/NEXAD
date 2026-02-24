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
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { consultationService } from '../../services/consultationService';
import { messageService, MessageWithSender } from '../../services/messageService';
import { profileService, StudentProfile } from '../../services/profileService';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import type { ConsultationRequest } from '../../types';

// Dashboard data limits
const CONSULTATION_LIMIT = 5;
const MESSAGE_LIMIT = 5;

interface ConsultationWithTeacher extends ConsultationRequest {
  teacherName: string;
}

interface DashboardData {
  upcomingConsultations: ConsultationWithTeacher[];
  pendingRequests: ConsultationWithTeacher[];
  unreadMessages: MessageWithSender[];
  profile: StudentProfile | null;
}

export default function StudentDashboard({ navigation, route }: any) {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationWithTeacher | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    upcomingConsultations: [],
    pendingRequests: [],
    unreadMessages: [],
    profile: null,
  });

  const authContext = useAuth();
  const currentUser = authContext.user;
  const userId = currentUser?.user_id;

  const { unreadCount: realtimeUnreadCount } = useRealtimeNotifications(userId);

  const loadDashboardData = useCallback(async () => {
    if (!userId) return;
    try {
      const [consultationsResult, messagesResult, profileResult] = await Promise.all([
        consultationService.getStudentRequests(userId, 1, 100),
        messageService.getUnreadMessages(userId, MESSAGE_LIMIT),
        profileService.getStudentProfile(userId),
      ]);

      // Filter consultations by status
      const allConsultations = consultationsResult.data?.data || [];
      const approvedConsultations = allConsultations.filter(c => c.status === 'accepted');
      const pendingConsultations = allConsultations.filter(c => c.status === 'pending' || c.status === 'awaiting_teacher');

      // Load teacher names for approved consultations
      const consultationsWithTeachers = await Promise.all(
        approvedConsultations.slice(0, CONSULTATION_LIMIT).map(async (consultation) => {
          try {
            const teacherProfile = await profileService.getTeacherProfile(consultation.teacher_id);
            return {
              ...consultation,
              teacherName: teacherProfile.data
                ? `${teacherProfile.data.first_name} ${teacherProfile.data.last_name}`
                : 'Unknown Teacher',
            };
          } catch (error) {
            return {
              ...consultation,
              teacherName: 'Unknown Teacher',
            };
          }
        })
      );

      // Load teacher names for pending requests
      const pendingWithTeachers = await Promise.all(
        pendingConsultations.slice(0, CONSULTATION_LIMIT).map(async (consultation) => {
          try {
            const teacherProfile = await profileService.getTeacherProfile(consultation.teacher_id);
            return {
              ...consultation,
              teacherName: teacherProfile.data
                ? `${teacherProfile.data.first_name} ${teacherProfile.data.last_name}`
                : 'Unknown Teacher',
            };
          } catch (error) {
            return {
              ...consultation,
              teacherName: 'Unknown Teacher',
            };
          }
        })
      );

      setDashboardData({
        upcomingConsultations: consultationsWithTeachers,
        pendingRequests: pendingWithTeachers,
        unreadMessages: messagesResult.data || [],
        profile: profileResult.data || null,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data.');
    }
  }, [userId]);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

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

  const handleRequestConsultation = () => {
    navigation.navigate('FindTeacher');
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getUserName = () => dashboardData.profile?.first_name || currentUser?.first_name || 'Student';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B4EFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <Text style={styles.appTitle}>NEXAD</Text>
        <View style={styles.rightIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.iconText}>🔔</Text>
            {realtimeUnreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{realtimeUnreadCount > 9 ? '9+' : realtimeUnreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton} onPress={() => setShowProfileMenu(true)}>
            <View style={styles.profileImage}>
              <Text style={styles.profileInitial}>{getUserName().charAt(0).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowSideMenu(true)}>
            <Text style={styles.iconText}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#6B4EFF']} />}
      >
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{getUserName()}! 👋</Text>
        </View>

        {/* REMINDER CARD */}
        {dashboardData.upcomingConsultations.length > 0 && (
          <View style={styles.reminderCard}>
            <View style={styles.reminderHeader}>
              <Text style={styles.reminderIcon}>⏰</Text>
              <Text style={styles.reminderTitle}>Next Consultation</Text>
            </View>
            <Text style={styles.reminderTeacher}>
              {dashboardData.upcomingConsultations[0].teacherName}
            </Text>
            <Text style={styles.reminderTopic}>{dashboardData.upcomingConsultations[0].subject_line}</Text>
            <Text style={styles.reminderDate}>📅 {formatDate(dashboardData.upcomingConsultations[0].scheduled_start_time)}</Text>
            <Text style={styles.reminderTime}>🕐 {formatTime(dashboardData.upcomingConsultations[0].scheduled_start_time)}</Text>
            <TouchableOpacity 
              style={styles.reminderButton}
              onPress={() => {
                setSelectedConsultation(dashboardData.upcomingConsultations[0]);
                setShowDetailsModal(true);
              }}
            >
              <Text style={styles.reminderButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity style={styles.ctaCard} onPress={handleRequestConsultation}>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaIcon}>📝</Text>
            <View style={styles.ctaTextContainer}>
              <Text style={styles.ctaTitle}>Request a Consultation</Text>
              <Text style={styles.ctaSubtitle}>Connect with your teachers</Text>
            </View>
          </View>
          <Text style={styles.ctaArrow}>→</Text>
        </TouchableOpacity>

        {/* PENDING REQUESTS */}
        {dashboardData.pendingRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Requests</Text>
              <View style={styles.sectionHeaderRight}>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>{dashboardData.pendingRequests.length}</Text>
                </View>
                {dashboardData.pendingRequests.length > 4 && (
                  <TouchableOpacity onPress={() => navigation.navigate('PendingRequests')}>
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {dashboardData.pendingRequests.slice(0, 4).map((request) => (
              <View key={request.id} style={styles.pendingCard}>
                <View style={styles.pendingAvatar}>
                  <Text style={styles.pendingAvatarText}>{request.teacherName.charAt(0)}</Text>
                </View>
                <View style={styles.pendingContent}>
                  <Text style={styles.pendingTeacher}>{request.teacherName}</Text>
                  <Text style={styles.pendingTopic} numberOfLines={1}>{request.subject_line}</Text>
                  <Text style={styles.pendingTime}>Requested {formatTimeAgo(request.submitted_at)}</Text>
                </View>
                <View style={styles.pendingStatusBadge}>
                  <Text style={styles.pendingStatusText}>⏳ Pending</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* APPOINTMENTS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
            <TouchableOpacity onPress={() => navigation.navigate('StudentConsultations')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {dashboardData.upcomingConsultations.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>No upcoming appointments</Text>
            </View>
          ) : (
            dashboardData.upcomingConsultations.slice(0, CONSULTATION_LIMIT).map((c) => (
              <TouchableOpacity key={c.id} style={styles.appointmentCard}>
                <View style={styles.appointmentAvatar}>
                  <Text style={styles.appointmentAvatarText}>{c.teacherName.charAt(0)}</Text>
                </View>
                <View style={styles.appointmentContent}>
                  <Text style={styles.appointmentTeacher}>{c.teacherName}</Text>
                  <Text style={styles.appointmentTopic} numberOfLines={1}>{c.subject_line}</Text>
                  <Text style={styles.appointmentTime}>{formatDate(c.scheduled_start_time)}</Text>
                </View>
                <View style={[styles.statusBadge, getStatusStyle(c.status)]}>
                  <Text style={styles.statusText}>{c.status}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* MESSAGES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Unread Messages</Text>
            <TouchableOpacity><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
          </View>
          {dashboardData.unreadMessages.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>No unread messages</Text>
            </View>
          ) : (
            dashboardData.unreadMessages.slice(0, MESSAGE_LIMIT).map((m) => (
              <TouchableOpacity key={m.id} style={styles.messageCard}>
                <View style={styles.messageAvatar}>
                  <Text style={styles.messageAvatarText}>{(m.sender?.first_name || 'U').charAt(0)}</Text>
                </View>
                <View style={styles.messageContent}>
                  <Text style={styles.messageSender}>{m.sender?.first_name} {m.sender?.last_name}</Text>
                  <Text style={styles.messagePreview} numberOfLines={2}>{m.content}</Text>
                  <Text style={styles.messageTime}>{formatTimeAgo(m.created_at)}</Text>
                </View>
                <View style={styles.unreadDot} />
              </TouchableOpacity>
            ))
          )}
        </View>
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* PROFILE MODAL */}
      <Modal visible={showProfileMenu} transparent animationType="fade" onRequestClose={() => setShowProfileMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowProfileMenu(false)}>
          <View style={styles.profileMenu}>
            <View style={styles.profileMenuHeader}>
              <View style={styles.profileMenuAvatar}><Text style={styles.profileMenuAvatarText}>{getUserName().charAt(0).toUpperCase()}</Text></View>
              <View style={styles.profileMenuInfo}>
                <Text style={styles.profileMenuName}>{getUserName()} {dashboardData.profile?.last_name || ''}</Text>
                <Text style={styles.profileMenuEmail}>{dashboardData.profile?.email || currentUser?.email || ''}</Text>
              </View>
            </View>
            <View style={styles.profileMenuDivider} />
            <TouchableOpacity style={styles.profileMenuItem} onPress={() => setShowProfileMenu(false)}>
              <Text style={styles.profileMenuItemIcon}>👤</Text>
              <Text style={styles.profileMenuItemText}>Account Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileMenuItem} onPress={() => setShowProfileMenu(false)}>
              <Text style={styles.profileMenuItemIcon}>⚙️</Text>
              <Text style={styles.profileMenuItemText}>Preferences</Text>
            </TouchableOpacity>
            <View style={styles.profileMenuDivider} />
            <TouchableOpacity style={styles.profileMenuItem} onPress={() => { setShowProfileMenu(false); handleSignOut(); }}>
              <Text style={styles.profileMenuItemIcon}>🚪</Text>
              <Text style={[styles.profileMenuItemText, styles.signOutText]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* SIDE MENU */}
      <Modal visible={showSideMenu} transparent animationType="slide" onRequestClose={() => setShowSideMenu(false)}>
        <View style={styles.sideMenuContainer}>
          <TouchableOpacity style={styles.sideMenuOverlay} activeOpacity={1} onPress={() => setShowSideMenu(false)} />
          <View style={styles.sideMenu}>
            <View style={styles.sideMenuHeader}>
              <Text style={styles.sideMenuTitle}>NEXAD</Text>
              <TouchableOpacity onPress={() => setShowSideMenu(false)}><Text style={styles.closeIcon}>✕</Text></TouchableOpacity>
            </View>
            {[
              { icon: '🏠', label: 'Dashboard', action: () => setShowSideMenu(false) },
              { icon: '📝', label: 'My Consultations', action: () => navigation.navigate('StudentConsultations') },
              { icon: '⏳', label: 'Pending Requests', action: () => navigation.navigate('PendingRequests') },
              { icon: '🏫', label: 'My Classrooms', action: () => navigation.navigate('StudentClassrooms') },
              { icon: '🔔', label: 'Notifications', action: () => navigation.navigate('Notifications') },
              { icon: '📋', label: 'Consultation History', action: () => navigation.navigate('ConsultationHistory') },
              { icon: '🔍', label: 'Find Teachers', action: () => navigation.navigate('FindTeacher') },
              { icon: '⚙️', label: 'Settings', action: () => Alert.alert('Coming Soon', 'Settings feature') },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={styles.sideMenuItem} onPress={() => {
                setShowSideMenu(false);
                item.action();
              }}>
                <Text style={styles.sideMenuItemIcon}>{item.icon}</Text>
                <Text style={styles.sideMenuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* CONSULTATION DETAILS MODAL */}
      <Modal visible={showDetailsModal} transparent animationType="slide" onRequestClose={() => setShowDetailsModal(false)}>
        <View style={styles.detailsModalOverlay}>
          <View style={styles.detailsModalContent}>
            {selectedConsultation && (
              <>
                <View style={styles.detailsModalHeader}>
                  <Text style={styles.detailsModalTitle}>Consultation Details</Text>
                  <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                    <Text style={styles.detailsModalClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.detailsModalBody}>
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsLabel}>Teacher</Text>
                    <Text style={styles.detailsValue}>{selectedConsultation.teacherName}</Text>
                  </View>
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsLabel}>Subject</Text>
                    <Text style={styles.detailsValue}>{selectedConsultation.subject_line}</Text>
                  </View>
                  {selectedConsultation.description && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Description</Text>
                      <Text style={styles.detailsValue}>{selectedConsultation.description}</Text>
                    </View>
                  )}
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsLabel}>Date</Text>
                    <Text style={styles.detailsValue}>{formatDate(selectedConsultation.scheduled_start_time)}</Text>
                  </View>
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsLabel}>Time</Text>
                    <Text style={styles.detailsValue}>
                      {formatTime(selectedConsultation.scheduled_start_time)} - {formatTime(selectedConsultation.scheduled_end_time)}
                    </Text>
                  </View>
                  {selectedConsultation.classroom_number && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Classroom</Text>
                      <Text style={styles.detailsValue}>Room {selectedConsultation.classroom_number}</Text>
                    </View>
                  )}
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsLabel}>Status</Text>
                    <View style={[styles.statusBadge, getStatusStyle(selectedConsultation.status)]}>
                      <Text style={styles.statusText}>{selectedConsultation.status}</Text>
                    </View>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function formatDate(d?: string): string {
  if (!d) return 'TBD';
  try {
    return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return 'TBD'; }
}

function formatTime(d?: string): string {
  if (!d) return 'TBD';
  try {
    return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return 'TBD'; }
}

function formatTimeAgo(d: string): string {
  try {
    const ms = Date.now() - new Date(d).getTime();
    const m = Math.floor(ms / 60000), h = Math.floor(m / 60), day = Math.floor(h / 24);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (day < 7) return `${day}d ago`;
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function getStatusStyle(s: string): object {
  switch (s) {
    case 'accepted': return { backgroundColor: '#dcfce7' };
    case 'pending': return { backgroundColor: '#fef3c7' };
    case 'declined': return { backgroundColor: '#fee2e2' };
    case 'completed': return { backgroundColor: '#e0e7ff' };
    default: return { backgroundColor: '#f3f4f6' };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6b7280' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#f3f4f6' },
  iconText: { fontSize: 20 },
  appTitle: { fontSize: 20, fontWeight: '800', color: '#6B4EFF', letterSpacing: 1 },
  rightIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notificationBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  profileButton: { marginLeft: 4 },
  profileImage: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#6B4EFF', justifyContent: 'center', alignItems: 'center' },
  profileInitial: { color: '#fff', fontSize: 16, fontWeight: '700' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  greetingSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  greeting: { fontSize: 16, color: '#6b7280' },
  userName: { fontSize: 24, fontWeight: '700', color: '#111827' },
  reminderCard: { backgroundColor: '#6B4EFF', marginHorizontal: 20, marginBottom: 16, borderRadius: 16, padding: 16 },
  reminderHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reminderIcon: { fontSize: 20, marginRight: 8 },
  reminderTitle: { color: '#fff', fontSize: 14, fontWeight: '600', opacity: 0.9 },
  reminderTeacher: { color: '#fff', fontSize: 18, fontWeight: '700' },
  reminderTopic: { color: '#fff', fontSize: 14, opacity: 0.9, marginTop: 4 },
  reminderDate: { color: '#fff', fontSize: 13, marginTop: 8, opacity: 0.8 },
  reminderTime: { color: '#fff', fontSize: 13, marginTop: 4, opacity: 0.8 },
  reminderButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  reminderButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  ctaCard: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 20, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: '#6B4EFF', borderStyle: 'dashed' },
  ctaContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  ctaIcon: { fontSize: 32, marginRight: 12 },
  ctaTextContainer: { flex: 1 },
  ctaTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  ctaSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  ctaArrow: { fontSize: 24, color: '#6B4EFF', fontWeight: '700' },
  calendarCard: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 20, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  calendarContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  calendarIcon: { fontSize: 32, marginRight: 12 },
  calendarTextContainer: { flex: 1 },
  calendarTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  calendarSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  calendarArrow: { fontSize: 24, color: '#3b82f6', fontWeight: '700' },
  section: { marginBottom: 20, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  viewAllText: { fontSize: 14, color: '#6B4EFF', fontWeight: '600' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  appointmentCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  appointmentAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  appointmentAvatarText: { color: '#4f46e5', fontSize: 18, fontWeight: '700' },
  appointmentContent: { flex: 1 },
  appointmentTeacher: { fontSize: 15, fontWeight: '600', color: '#111827' },
  appointmentTopic: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  appointmentTime: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600', color: '#374151', textTransform: 'capitalize' },
  messageCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#e5e7eb' },
  messageAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  messageAvatarText: { color: '#d97706', fontSize: 16, fontWeight: '700' },
  messageContent: { flex: 1 },
  messageSender: { fontSize: 14, fontWeight: '600', color: '#111827' },
  messagePreview: { fontSize: 13, color: '#6b7280', marginTop: 4, lineHeight: 18 },
  messageTime: { fontSize: 11, color: '#9ca3af', marginTop: 6 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6B4EFF', marginTop: 4 },
  bottomSpacing: { height: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 60, paddingRight: 16 },
  profileMenu: { backgroundColor: '#fff', borderRadius: 16, width: 280, padding: 16 },
  profileMenuHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 16 },
  profileMenuAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6B4EFF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  profileMenuAvatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileMenuInfo: { flex: 1 },
  profileMenuName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  profileMenuEmail: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  profileMenuDivider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },
  profileMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  profileMenuItemIcon: { fontSize: 18, marginRight: 12 },
  profileMenuItemText: { fontSize: 15, color: '#374151' },
  signOutText: { color: '#ef4444' },
  sideMenuContainer: { flex: 1, flexDirection: 'row' },
  sideMenuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sideMenu: { width: '75%', backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 20 },
  sideMenuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  sideMenuTitle: { fontSize: 24, fontWeight: '800', color: '#6B4EFF' },
  closeIcon: { fontSize: 24, color: '#6b7280' },
  sideMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 8, marginBottom: 4 },
  sideMenuItemIcon: { fontSize: 22, marginRight: 16 },
  sideMenuItemText: { fontSize: 16, color: '#374151', fontWeight: '500' },
  pendingBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pendingBadgeText: { color: '#f59e0b', fontSize: 12, fontWeight: '700' },
  pendingCard: { backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#fbbf24' },
  pendingAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  pendingAvatarText: { fontSize: 18, fontWeight: '700', color: '#f59e0b' },
  pendingContent: { flex: 1 },
  pendingTeacher: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  pendingTopic: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  pendingTime: { fontSize: 11, color: '#9ca3af' },
  pendingStatusBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  pendingStatusText: { fontSize: 11, fontWeight: '600', color: '#f59e0b' },
  detailsModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  detailsModalContent: { backgroundColor: '#fff', borderRadius: 16, width: '100%', maxHeight: '80%', overflow: 'hidden' },
  detailsModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  detailsModalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  detailsModalClose: { fontSize: 24, color: '#6b7280' },
  detailsModalBody: { padding: 20 },
  detailsSection: { marginBottom: 20 },
  detailsLabel: { fontSize: 14, fontWeight: '600', color: '#6b7280', marginBottom: 6 },
  detailsValue: { fontSize: 16, color: '#111827', lineHeight: 24 },
});
