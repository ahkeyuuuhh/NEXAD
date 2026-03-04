import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { consultationService } from '../../services/consultationService';
import { messageService, MessageWithSender } from '../../services/messageService';
import { profileService, StudentProfile } from '../../services/profileService';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import type { ConsultationRequest } from '../../types';
import { C, F, T, S, R, shadow } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import { FloatingTabBar } from '../../components/FloatingTabBar';

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

  const { unreadCount: realtimeUnreadCount, refresh: refreshNotifCount } = useRealtimeNotifications(userId);

  const menuAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const openMenu = () => {
    setShowSideMenu(true);
    menuAnim.setValue(300);
    backdropAnim.setValue(0);
    Animated.parallel([
      Animated.timing(menuAnim, {
        toValue: 0, duration: 340,
        easing: Easing.out(Easing.bezier(0.16, 1, 0.3, 1)),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1, duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };
  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(menuAnim, {
        toValue: 300, duration: 220,
        easing: Easing.in(Easing.bezier(0.6, 0, 1, 1)),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0, duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => { if (finished) setShowSideMenu(false); });
  };

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

      // Load teacher names for approved consultations (no slice here — sort first, then show all)
      const consultationsWithTeachers = await Promise.all(
        approvedConsultations.map(async (consultation) => {
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

      // Sort accepted consultations: upcoming first (ascending), then past (descending)
      const now = Date.now();
      const future = consultationsWithTeachers
        .filter(c => c.scheduled_start_time && new Date(c.scheduled_start_time).getTime() >= now)
        .sort((a, b) => new Date(a.scheduled_start_time!).getTime() - new Date(b.scheduled_start_time!).getTime());
      const past = consultationsWithTeachers
        .filter(c => !c.scheduled_start_time || new Date(c.scheduled_start_time).getTime() < now)
        .sort((a, b) => new Date(b.scheduled_start_time!).getTime() - new Date(a.scheduled_start_time!).getTime());
      const sortedConsultations = [...future, ...past];

      setDashboardData({
        upcomingConsultations: sortedConsultations,
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
  // Also refresh the notification count so the badge clears after viewing notifications
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
      refreshNotifCount();
    }, [loadDashboardData, refreshNotifCount])
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
        <ActivityIndicator size="large" color="#0A0A0A" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity style={styles.profileButton} onPress={() => setShowProfileMenu(true)}>
            <View style={styles.profileImage}>
              <Text style={styles.profileInitial}>{getUserName().charAt(0).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.appTitle}>NEXAD</Text>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={22} color={C.ink2} />
            {realtimeUnreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{realtimeUnreadCount > 9 ? '9+' : realtimeUnreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={openMenu}>
            <Ionicons name="menu-outline" size={24} color={C.ink2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[C.accent]} />}
      >
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{getUserName()}! 👋</Text>
        </View>

        {/* UPCOMING APPOINTMENTS CAROUSEL */}
        <View style={styles.carouselSection}>
          <View style={styles.carouselHeader}>
            <View>
              <Text style={styles.carouselTitle}>Upcoming Appointments</Text>
              {dashboardData.upcomingConsultations.length > 0 && (
                <Text style={styles.carouselSubtitle}>
                  {dashboardData.upcomingConsultations.length} appointment{dashboardData.upcomingConsultations.length !== 1 ? 's' : ''} scheduled
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('StudentConsultations')} style={styles.viewAllBtn}>
              <Text style={styles.viewAllBtnText}>View All</Text>
              <Ionicons name="arrow-forward" size={13} color={C.ink2} />
            </TouchableOpacity>
          </View>

          {dashboardData.upcomingConsultations.length === 0 ? (
            <View style={styles.carouselEmpty}>
              <Ionicons name="calendar-outline" size={36} color={C.ink5} />
              <Text style={styles.carouselEmptyText}>No upcoming appointments</Text>
            </View>
          ) : dashboardData.upcomingConsultations.length === 1 ? (
            // ── Single appointment: full-width card ──
            (() => {
              const c = dashboardData.upcomingConsultations[0];
              const isMissed = !!c.scheduled_start_time &&
                new Date(c.scheduled_start_time).getTime() < Date.now() &&
                c.status === 'accepted';
              const cardBg = isMissed ? '#7F1D1D' : '#1C1C1C';
              const decorBg = isMissed ? '#991B1B' : '#2E2E2E';
              return (
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => { setSelectedConsultation(c); setShowDetailsModal(true); }}
                  style={styles.carouselSingleWrap}
                >
                  <View style={[styles.carouselCardFull, { backgroundColor: cardBg }]}>
                    <View style={[styles.carouselDecorCircle, { backgroundColor: decorBg }]} />
                    <View style={[styles.carouselDecorCircle2, { backgroundColor: decorBg }]} />
                    <View style={styles.carouselCardTop}>
                      <View style={styles.carouselAvatar}>
                        <Text style={styles.carouselAvatarText}>{c.teacherName.charAt(0).toUpperCase()}</Text>
                      </View>
                      {isMissed ? (
                        <View style={styles.carouselMissedBadge}><Text style={styles.carouselMissedBadgeText}>MISSED</Text></View>
                      ) : (
                        <View style={styles.carouselDurationBadge}>
                          <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.8)" />
                          <Text style={styles.carouselDurationText}>
                            {c.scheduled_start_time && c.scheduled_end_time
                              ? `${Math.round((new Date(c.scheduled_end_time).getTime() - new Date(c.scheduled_start_time).getTime()) / 60000)} min`
                              : 'TBD'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.carouselTeacher} numberOfLines={1}>{c.teacherName}</Text>
                    <Text style={styles.carouselSubject} numberOfLines={2}>{c.subject_line}</Text>
                    <View style={styles.carouselDivider} />
                    <View style={styles.carouselMetaRow2}>
                      <View style={styles.carouselMetaItem}>
                        <View style={styles.carouselMetaIcon}><Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.7)" /></View>
                        <Text style={styles.carouselMetaText}>{formatDate(c.scheduled_start_time)}</Text>
                      </View>
                      <View style={styles.carouselMetaItem}>
                        <View style={styles.carouselMetaIcon}><Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.7)" /></View>
                        <Text style={styles.carouselMetaText}>{formatTime(c.scheduled_start_time)}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })()
          ) : (
            // ── Multiple appointments: horizontal carousel ──
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselScroll}
              decelerationRate="fast"
              snapToInterval={252}
              snapToAlignment="start"
            >
              {dashboardData.upcomingConsultations.slice(0, CONSULTATION_LIMIT).map((c, idx) => {
                const isMissed = !!c.scheduled_start_time &&
                  new Date(c.scheduled_start_time).getTime() < Date.now() &&
                  c.status === 'accepted';
                const cardColors = [
                  { bg: '#1C1C1C', accent2: '#2E2E2E' },
                  { bg: '#111827', accent2: '#1F2937' },
                  { bg: '#1A1A2E', accent2: '#252545' },
                  { bg: '#0F172A', accent2: '#1E293B' },
                  { bg: '#18181B', accent2: '#27272A' },
                ];
                const cardColor = isMissed
                  ? { bg: '#7F1D1D', accent2: '#991B1B' }
                  : cardColors[idx % cardColors.length];

                return (
                  <TouchableOpacity
                    key={c.id}
                    activeOpacity={0.88}
                    onPress={() => { setSelectedConsultation(c); setShowDetailsModal(true); }}
                    style={styles.carouselCardWrap}
                  >
                    <View style={[styles.carouselCard, { backgroundColor: cardColor.bg }]}>
                      <View style={[styles.carouselDecorCircle, { backgroundColor: cardColor.accent2 }]} />
                      <View style={[styles.carouselDecorCircle2, { backgroundColor: cardColor.accent2 }]} />
                      <View style={styles.carouselCardTop}>
                        <View style={styles.carouselAvatar}>
                          <Text style={styles.carouselAvatarText}>{c.teacherName.charAt(0).toUpperCase()}</Text>
                        </View>
                        {isMissed ? (
                          <View style={styles.carouselMissedBadge}><Text style={styles.carouselMissedBadgeText}>MISSED</Text></View>
                        ) : (
                          <View style={styles.carouselDurationBadge}>
                            <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.carouselDurationText}>
                              {c.scheduled_start_time && c.scheduled_end_time
                                ? `${Math.round((new Date(c.scheduled_end_time).getTime() - new Date(c.scheduled_start_time).getTime()) / 60000)} min`
                                : 'TBD'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.carouselTeacher} numberOfLines={1}>{c.teacherName}</Text>
                      <Text style={styles.carouselSubject} numberOfLines={2}>{c.subject_line}</Text>
                      <View style={styles.carouselDivider} />
                      <View style={styles.carouselMeta}>
                        <View style={styles.carouselMetaItem}>
                          <View style={styles.carouselMetaIcon}><Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.7)" /></View>
                          <Text style={styles.carouselMetaText}>{formatDate(c.scheduled_start_time)}</Text>
                        </View>
                        <View style={styles.carouselMetaItem}>
                          <View style={styles.carouselMetaIcon}><Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.7)" /></View>
                          <Text style={styles.carouselMetaText}>{formatTime(c.scheduled_start_time)}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.ctaCard} onPress={handleRequestConsultation}>
          <View style={styles.ctaContent}>
            <Ionicons name="create-outline" size={32} color={C.ink1} style={{ marginRight: S.md }} />
            <View style={styles.ctaTextContainer}>
              <Text style={styles.ctaTitle}>Request a Consultation</Text>
              <Text style={styles.ctaSubtitle}>Connect with your teachers</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={24} color={C.ink2} />
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
              <TouchableOpacity
                key={request.id}
                style={styles.pendingCard}
                onPress={() => {
                  setSelectedConsultation(request);
                  setShowDetailsModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.pendingAvatar}>
                  <Text style={styles.pendingAvatarText}>{request.teacherName.charAt(0)}</Text>
                </View>
                <View style={styles.pendingContent}>
                  <Text style={styles.pendingTeacher}>{request.teacherName}</Text>
                  <Text style={styles.pendingTopic} numberOfLines={1}>{request.subject_line}</Text>
                  <Text style={styles.pendingTime}>Requested {formatTimeAgo(request.submitted_at)}</Text>
                </View>
                <View style={styles.pendingStatusBadge}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="hourglass-outline" size={12} color={C.ink3} />
                    <Text style={styles.pendingStatusText}>Pending</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}



        {/* MESSAGES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Unread Messages</Text>
            <TouchableOpacity><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
          </View>
          {dashboardData.unreadMessages.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="chatbubble-outline" size={40} color={C.ink4} style={{ marginBottom: S.md }} />
              <Text style={styles.emptyText}>No unread messages</Text>
            </View>
          ) : (
            dashboardData.unreadMessages.slice(0, MESSAGE_LIMIT).map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.messageCard}
                onPress={() => navigation.navigate('StudentConsultations')}
                activeOpacity={0.7}
              >
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

      {/* Burger Menu Drawer */}
      <Modal visible={showSideMenu} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={styles.drawerOverlay}>
          <Animated.View style={[styles.drawerBackdrop, { opacity: backdropAnim }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeMenu} />
          </Animated.View>
          <Animated.View style={[styles.drawer, { transform: [{ translateX: menuAnim }] }]}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerAvatar}>
                <Text style={styles.drawerAvatarText}>{getUserName().charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.drawerHeaderInfo}>
                <Text style={styles.drawerName}>{getUserName()} {dashboardData.profile?.last_name || ''}</Text>
                <Text style={styles.drawerRole}>Student</Text>
              </View>
              <TouchableOpacity onPress={closeMenu} style={styles.drawerClose}>
                <Ionicons name="close" size={20} color={C.ink3} />
              </TouchableOpacity>
            </View>
            <View style={styles.drawerDivider} />
            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); }}>
              <Ionicons name="home-outline" size={20} color={C.ink2} style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); navigation.navigate('StudentClassrooms'); }}>
              <Ionicons name="book-outline" size={20} color={C.ink2} style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>My Classes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); navigation.navigate('FindTeacher'); }}>
              <Ionicons name="search-outline" size={20} color={C.ink2} style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Find a Teacher</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); navigation.navigate('StudentConsultations'); }}>
              <Ionicons name="chatbubble-outline" size={20} color={C.ink2} style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Messages</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); navigation.navigate('ConsultationHistory'); }}>
              <Ionicons name="time-outline" size={20} color={C.ink2} style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Consultation History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); navigation.navigate('Notifications'); }}>
              <Ionicons name="notifications-outline" size={20} color={C.ink2} style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Notifications</Text>
            </TouchableOpacity>
            <View style={styles.drawerDivider} />
            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); handleSignOut(); }}>
              <Ionicons name="log-out-outline" size={20} color={C.red} style={styles.drawerItemIcon} />
              <Text style={[styles.drawerItemText, { color: C.red }]}>Sign Out</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

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
              <Ionicons name="person-outline" size={18} color={C.ink2} style={{ marginRight: S.md }} />
              <Text style={styles.profileMenuItemText}>Account Profile Settings</Text>
            </TouchableOpacity>
            <View style={styles.profileMenuDivider} />
            <TouchableOpacity style={styles.profileMenuItem} onPress={() => { setShowProfileMenu(false); handleSignOut(); }}>
              <Ionicons name="log-out-outline" size={18} color={C.red} style={{ marginRight: S.md }} />
              <Text style={[styles.profileMenuItemText, styles.signOutText]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>



      {/* CONSULTATION DETAILS MODAL */}
      <Modal visible={showDetailsModal} transparent animationType="slide" onRequestClose={() => setShowDetailsModal(false)}>
        <View style={styles.detailsModalOverlay}>
          <View style={styles.detailsModalContent}>
            {selectedConsultation && (() => {
              const isMissedInModal = selectedConsultation.status === 'accepted' &&
                !!selectedConsultation.scheduled_start_time &&
                new Date(selectedConsultation.scheduled_start_time).getTime() < Date.now();
              const statusLabel = isMissedInModal ? 'Missed' : selectedConsultation.status;
              const headerBg = isMissedInModal ? '#7F1D1D' : '#1C1C1C';
              const headerDecor = isMissedInModal ? '#991B1B' : '#2E2E2E';
              return (
                <>
                  {/* Dark header band */}
                  <View style={[styles.dmHeader, { backgroundColor: headerBg }]}>
                    <View style={[styles.dmHeaderDecor, { backgroundColor: headerDecor }]} />
                    <View style={[styles.dmHeaderDecor2, { backgroundColor: headerDecor }]} />
                    <TouchableOpacity style={styles.dmCloseBtn} onPress={() => setShowDetailsModal(false)}>
                      <Ionicons name="close" size={18} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                    <View style={styles.dmAvatarWrap}>
                      <Text style={styles.dmAvatarText}>{selectedConsultation.teacherName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.dmTeacherName}>{selectedConsultation.teacherName}</Text>
                    <Text style={styles.dmSubjectLine} numberOfLines={2}>{selectedConsultation.subject_line}</Text>
                    {/* Status pill inside header */}
                    <View style={[styles.dmStatusPill, isMissedInModal && styles.dmStatusPillMissed]}>
                      <View style={[styles.dmStatusDot, isMissedInModal && { backgroundColor: '#FCA5A5' }]} />
                      <Text style={styles.dmStatusPillText}>{statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}</Text>
                    </View>
                  </View>

                  {/* Body */}
                  <ScrollView style={styles.dmBody} showsVerticalScrollIndicator={false}>
                    {selectedConsultation.description && (
                      <View style={styles.dmInfoCard}>
                        <View style={styles.dmInfoRow}>
                          <View style={styles.dmIconBox}><Ionicons name="document-text-outline" size={16} color={C.ink2} /></View>
                          <View style={styles.dmInfoContent}>
                            <Text style={styles.dmInfoLabel}>Description</Text>
                            <Text style={styles.dmInfoValue}>{selectedConsultation.description}</Text>
                          </View>
                        </View>
                      </View>
                    )}

                    <View style={styles.dmInfoCard}>
                      <View style={styles.dmInfoRow}>
                        <View style={styles.dmIconBox}><Ionicons name="calendar-outline" size={16} color={C.ink2} /></View>
                        <View style={styles.dmInfoContent}>
                          <Text style={styles.dmInfoLabel}>Date</Text>
                          <Text style={styles.dmInfoValue}>{formatDate(selectedConsultation.scheduled_start_time)}</Text>
                        </View>
                      </View>
                      <View style={styles.dmInfoDivider} />
                      <View style={styles.dmInfoRow}>
                        <View style={styles.dmIconBox}><Ionicons name="time-outline" size={16} color={C.ink2} /></View>
                        <View style={styles.dmInfoContent}>
                          <Text style={styles.dmInfoLabel}>Time</Text>
                          <Text style={styles.dmInfoValue}>
                            {formatTime(selectedConsultation.scheduled_start_time)} — {formatTime(selectedConsultation.scheduled_end_time)}
                          </Text>
                        </View>
                      </View>
                      {selectedConsultation.classroom_number && (
                        <>
                          <View style={styles.dmInfoDivider} />
                          <View style={styles.dmInfoRow}>
                            <View style={styles.dmIconBox}><Ionicons name="location-outline" size={16} color={C.ink2} /></View>
                            <View style={styles.dmInfoContent}>
                              <Text style={styles.dmInfoLabel}>Classroom</Text>
                              <Text style={styles.dmInfoValue}>Room {selectedConsultation.classroom_number}</Text>
                            </View>
                          </View>
                        </>
                      )}
                    </View>

                    <View style={{ height: 24 }} />
                  </ScrollView>
                </>
              );
            })()}
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
    case 'accepted':  return { backgroundColor: C.accent };
    case 'pending':   return { backgroundColor: C.ink3 };
    case 'declined':  return { backgroundColor: C.ink4 };
    case 'completed': return { backgroundColor: C.accentMid };
    case 'missed':    return { backgroundColor: C.red };
    default:          return { backgroundColor: C.surfaceAlt };
  }
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: C.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  loadingText:      { marginTop: S.md, ...T.body, color: C.ink4 },

  // ─── Top Bar ──────────────────────────────────────────
  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.xl, paddingTop: S.lg, paddingBottom: S.md, backgroundColor: C.bg },
  topBarLeft:{ flexDirection: 'row', alignItems: 'center', gap: S.md },
  topBarRight:{ flexDirection: 'row', alignItems: 'center', gap: S.sm },
  iconButton:{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderLight },
  appTitle:  { ...T.h2, color: C.ink1 },
  rightIcons:{ flexDirection: 'row', alignItems: 'center', gap: S.sm },
  notificationBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: C.red, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.bg },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' as const },
  profileButton:  { },
  profileImage:   { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.borderLight },
  profileInitial: { color: C.ink1, fontSize: 16, fontWeight: '600' as const },

  // ─── Scroll ───────────────────────────────────────────
  scrollView:    { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  greetingSection: { paddingHorizontal: S.xl, paddingTop: S.xl, paddingBottom: S.md },
  greeting: { ...T.body, color: C.ink3 },
  userName: { ...T.h1, color: C.ink1, marginTop: 2 },

  // ─── Upcoming Appointments Carousel ──────────────────
  carouselSection:    { marginBottom: S.xl },
  carouselHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: S.xl, marginBottom: S.lg },
  carouselTitle:      { ...T.h3, color: C.ink1 },
  carouselSubtitle:   { ...T.small, color: C.ink3, marginTop: 2 },
  viewAllBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllBtnText:     { ...T.label, color: C.ink2, fontSize: 13 },
  carouselScroll:     { paddingLeft: S.xl, paddingRight: S.md },
  carouselEmpty:      { marginHorizontal: S.xl, backgroundColor: C.surface, borderRadius: R.xl, padding: 32, alignItems: 'center', gap: S.md, borderWidth: 1, borderColor: C.borderLight },
  carouselEmptyText:  { ...T.body, color: C.ink4 },
  carouselCardWrap:   { marginRight: S.md },
  carouselCard: {
    width: 236,
    borderRadius: R.xl,
    padding: S.xl,
    paddingBottom: S.lg,
    overflow: 'hidden' as const,
    ...shadow.lift,
  },
  // Single-card responsive styles
  carouselSingleWrap: { marginHorizontal: S.xl },
  carouselCardFull: {
    width: '100%' as const,
    borderRadius: R.xl,
    padding: S.xl,
    paddingBottom: S.lg,
    overflow: 'hidden' as const,
    ...shadow.lift,
  },
  carouselMetaRow2: { flexDirection: 'row' as const, gap: S.xl },
  carouselDecorCircle:  { position: 'absolute' as const, width: 120, height: 120, borderRadius: 60, top: -40, right: -30, backgroundColor: 'rgba(255,255,255,0.05)' },
  carouselDecorCircle2: { position: 'absolute' as const, width: 70, height: 70, borderRadius: 35, bottom: 10, right: 20, backgroundColor: 'rgba(255,255,255,0.04)' },
  carouselCardTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: S.lg },
  carouselAvatar:         { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)' },
  carouselAvatarText:     { color: '#FFFFFF', fontSize: 20, fontWeight: '700' as const },
  carouselDurationBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.full },
  carouselDurationText:   { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600' as const },
  carouselMissedBadge:    { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.full },
  carouselMissedBadgeText:{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.8 },
  carouselTeacher:        { color: '#FFFFFF', fontSize: 16, fontWeight: '700' as const, marginBottom: 4 },
  carouselSubject:        { color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 18, marginBottom: S.lg },
  carouselDivider:        { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: S.md },
  carouselMeta:           { gap: S.sm },
  carouselMetaItem:       { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  carouselMetaIcon:       { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  carouselMetaText:       { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500' as const },

  // ─── Legacy (kept for TS compat) ──────────────────────
  reminderCard:       { backgroundColor: C.surface, marginHorizontal: S.xl, marginBottom: S.xl, borderRadius: R.xl, padding: S.xl, borderWidth: 1, borderColor: C.borderLight },
  reminderHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: S.lg },
  reminderIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: S.md },
  reminderTitle:      { ...T.cap, color: C.ink3, flex: 1 },
  reminderTeacher:    { ...T.h2, color: C.ink1, marginBottom: 4 },
  reminderTopic:      { ...T.body, color: C.ink3 },
  reminderMeta:       { marginTop: S.lg, gap: S.sm },
  reminderMetaRow:    { flexDirection: 'row', alignItems: 'center' },
  reminderDate:       { ...T.small, color: C.ink3 },
  reminderTime:       { ...T.small, color: C.ink3 },
  reminderButton:     { backgroundColor: C.accent, paddingVertical: 14, borderRadius: R.lg, alignItems: 'center', marginTop: S.xl, flexDirection: 'row', justifyContent: 'center', gap: S.sm },
  reminderButtonText: { color: C.accentText, fontWeight: '600' as const, fontSize: 14 },
  reminderCardMissed: { borderLeftColor: C.red },
  missedBadge:        { backgroundColor: C.redBg, paddingHorizontal: S.sm, paddingVertical: 3, borderRadius: R.sm },
  missedBadgeText:    { color: C.red, fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.5 },
  appointmentCardMissed: { borderColor: C.red + '30', borderWidth: 1 },

  // ─── CTA Card ─────────────────────────────────────────
  ctaCard: {
    backgroundColor: C.surface,
    marginHorizontal: S.xl,
    marginBottom: S.xl,
    borderRadius: R.xl,
    padding: S.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: C.borderLight,
    ...shadow.soft,
  },
  ctaContent:       { flexDirection: 'row', alignItems: 'center', flex: 1 },
  ctaTextContainer: { flex: 1 },
  ctaTitle:         { ...T.label, color: C.ink1, fontSize: 14 },
  ctaSubtitle:      { ...T.small, color: C.ink3, marginTop: 2 },

  // ─── Sections ─────────────────────────────────────────
  section:       { marginBottom: S.xl, paddingHorizontal: S.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.lg },
  sectionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  sectionTitle:  { ...T.h3, color: C.ink1 },
  viewAllText:   { ...T.label, color: C.ink2 },

  // ─── Empty State ──────────────────────────────────────
  emptyCard: { backgroundColor: C.surface, borderRadius: R.xl, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: C.borderLight },
  emptyText: { ...T.body, color: C.ink4 },

  // ─── Appointment Cards ────────────────────────────────
  appointmentCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: S.lg,
    marginBottom: S.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderLight,
    ...shadow.soft,
  },
  appointmentAvatar:     { width: 48, height: 48, borderRadius: 24, backgroundColor: C.accentSoft, justifyContent: 'center', alignItems: 'center', marginRight: S.lg },
  appointmentAvatarText: { color: C.accent, fontSize: 18, fontWeight: '600' as const },
  appointmentContent:    { flex: 1 },
  appointmentTeacher:    { ...T.label, color: C.ink1, fontSize: 14 },
  appointmentTopic:      { ...T.small, color: C.ink3, marginTop: 4 },
  appointmentTime:       { ...T.tiny, marginTop: 6, color: C.ink3 },
  statusBadge:           { paddingHorizontal: S.sm + 4, paddingVertical: 5, borderRadius: R.full },
  statusText:            { fontSize: 11, fontWeight: '600' as const, color: '#fff', textTransform: 'capitalize' },

  // ─── Message Cards ────────────────────────────────────
  messageCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: S.lg,
    marginBottom: S.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: C.borderLight,
    ...shadow.soft,
  },
  messageAvatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: S.lg },
  messageAvatarText: { color: C.ink2, fontSize: 16, fontWeight: '600' as const },
  messageContent:    { flex: 1 },
  messageSender:     { ...T.label, color: C.ink1, fontSize: 14 },
  messagePreview:    { ...T.small, color: C.ink3, marginTop: 4, lineHeight: 19 },
  messageTime:       { ...T.tiny, marginTop: 6 },
  unreadDot:         { width: 10, height: 10, borderRadius: 5, backgroundColor: C.ink2, marginTop: 6 },

  bottomSpacing: { height: 40 },

  // ─── Profile Modal ────────────────────────────────────
  modalOverlay:    { flex: 1, backgroundColor: C.scrim, justifyContent: 'flex-start', alignItems: 'flex-start', paddingTop: 72, paddingLeft: S.xl },
  profileMenu:     { backgroundColor: C.surface, borderRadius: R.xl, width: 280, padding: S.xl, ...shadow.lift },
  profileMenuHeader:     { flexDirection: 'row', alignItems: 'center', paddingBottom: S.lg },
  profileMenuAvatar:     { width: 48, height: 48, borderRadius: 24, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: S.md },
  profileMenuAvatarText: { color: C.ink1, fontSize: 20, fontWeight: '600' as const },
  profileMenuInfo:  { flex: 1 },
  profileMenuName:  { ...T.label, color: C.ink1, fontSize: 14 },
  profileMenuEmail: { ...T.small, color: C.ink3, marginTop: 2 },
  profileMenuDivider:    { height: 1, backgroundColor: C.borderLight, marginVertical: S.sm },
  profileMenuItem:       { flexDirection: 'row', alignItems: 'center', paddingVertical: S.md, paddingHorizontal: S.sm, borderRadius: R.md },
  profileMenuItemIcon:   { fontSize: 18, marginRight: S.md },
  profileMenuItemText:   { ...T.body, color: C.ink1 },
  signOutText:           { color: C.red, fontWeight: '600' as const },

  // ─── Burger Drawer ────────────────────────────────────
  drawerOverlay:    { flex: 1 },
  drawerBackdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: C.scrim },
  drawer:           { position: 'absolute', top: 0, bottom: 0, right: 0, width: 300, backgroundColor: C.surface, paddingTop: 60, paddingBottom: 32, borderTopLeftRadius: R.xl, borderBottomLeftRadius: R.xl, ...shadow.lift },
  drawerHeader:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.xl, paddingBottom: S.lg },
  drawerAvatar:     { width: 52, height: 52, borderRadius: 26, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: S.md, borderWidth: 1, borderColor: C.borderLight },
  drawerAvatarText: { fontSize: 20, fontWeight: '600' as const, color: C.ink1 },
  drawerHeaderInfo: { flex: 1 },
  drawerName:       { ...T.label, color: C.ink1, fontSize: 15 },
  drawerRole:       { ...T.small, color: C.ink3, marginTop: 2 },
  drawerClose:      { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  drawerDivider:    { height: 1, backgroundColor: C.borderLight, marginHorizontal: S.xl, marginVertical: S.sm },
  drawerItem:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.xl, paddingVertical: 14 },
  drawerItemIcon:   { marginRight: S.lg },
  drawerItemText:   { ...T.body, color: C.ink1 },

  // ─── Side Menu (kept for TS compat) ───────────────────
  sideMenuContainer: { flex: 1, flexDirection: 'row' },
  sideMenuOverlay:   { flex: 1, backgroundColor: C.scrim },
  sideMenu:          { width: '75%', backgroundColor: C.surface, paddingTop: 60, paddingHorizontal: S.xl },
  sideMenuHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, paddingBottom: S.lg, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  sideMenuTitle:     { ...T.h2, color: C.ink1 },
  sideMenuItem:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: S.sm, borderRadius: R.md, marginBottom: 4 },
  sideMenuItemText:  { ...T.body, color: C.ink1 },

  // ─── Pending Cards ────────────────────────────────────
  pendingBadge:        { backgroundColor: C.surfaceAlt, paddingHorizontal: S.sm + 2, paddingVertical: 4, borderRadius: R.full },
  pendingBadgeText:    { color: C.ink2, fontSize: 12, fontWeight: '600' as const },
  pendingCard: {
    backgroundColor: C.surface,
    padding: S.lg,
    borderRadius: R.xl,
    marginBottom: S.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderLight,
    ...shadow.soft,
  },
  pendingAvatar:       { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: S.lg },
  pendingAvatarText:   { fontSize: 18, fontWeight: '600' as const, color: C.ink2 },
  pendingContent:      { flex: 1 },
  pendingTeacher:      { ...T.label, color: C.ink1, fontSize: 14, marginBottom: 2 },
  pendingTopic:        { ...T.small, color: C.ink3, marginBottom: 4 },
  pendingTime:         { ...T.tiny },
  pendingStatusBadge:  { backgroundColor: C.surfaceAlt, paddingHorizontal: S.sm + 2, paddingVertical: 6, borderRadius: R.sm },
  pendingStatusText:   { fontSize: 11, fontWeight: '600' as const, color: C.ink3 },

  // ─── Details Modal (redesigned) ──────────────────────
  detailsModalOverlay:  { flex: 1, backgroundColor: C.scrim, justifyContent: 'flex-end' },
  detailsModalContent:  { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' as const, maxHeight: '85%', ...shadow.lift },

  // Dark header band
  dmHeader:           { padding: S.xl, paddingTop: S.xl + 8, paddingBottom: S.xl + 4, overflow: 'hidden' as const, position: 'relative' as const, alignItems: 'center' },
  dmHeaderDecor:      { position: 'absolute' as const, width: 160, height: 160, borderRadius: 80, top: -60, right: -40, backgroundColor: 'rgba(255,255,255,0.06)' },
  dmHeaderDecor2:     { position: 'absolute' as const, width: 90, height: 90, borderRadius: 45, bottom: -20, left: 20, backgroundColor: 'rgba(255,255,255,0.04)' },
  dmCloseBtn:         { position: 'absolute' as const, top: S.lg, right: S.lg, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  dmAvatarWrap:       { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: S.md },
  dmAvatarText:       { color: '#FFFFFF', fontSize: 26, fontWeight: '700' as const },
  dmTeacherName:      { color: '#FFFFFF', fontSize: 18, fontWeight: '700' as const, textAlign: 'center' as const, marginBottom: 4 },
  dmSubjectLine:      { color: 'rgba(255,255,255,0.65)', fontSize: 13, textAlign: 'center' as const, lineHeight: 18, marginBottom: S.md, paddingHorizontal: S.xl },
  dmStatusPill:       { flexDirection: 'row' as const, alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: R.full },
  dmStatusPillMissed: { backgroundColor: 'rgba(255,255,255,0.22)' },
  dmStatusDot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: '#86EFAC' },
  dmStatusPillText:   { color: '#FFFFFF', fontSize: 12, fontWeight: '600' as const },

  // Info cards in body
  dmBody:             { padding: S.xl },
  dmInfoCard:         { backgroundColor: C.bg, borderRadius: R.xl, marginBottom: S.md, overflow: 'hidden' as const, borderWidth: 1, borderColor: C.borderLight },
  dmInfoRow:          { flexDirection: 'row' as const, alignItems: 'flex-start', padding: S.lg, gap: S.md },
  dmIconBox:          { width: 36, height: 36, borderRadius: R.md, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.borderLight },
  dmInfoContent:      { flex: 1 },
  dmInfoLabel:        { fontSize: 11, fontWeight: '600' as const, color: C.ink4, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 3 },
  dmInfoValue:        { ...T.body, color: C.ink1, lineHeight: 22 },
  dmInfoDivider:      { height: 1, backgroundColor: C.borderLight, marginLeft: 52 },

  // Legacy (kept for safety) ─────────────────────────────
  detailsModalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: S.xl, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  detailsModalTitle:    { ...T.h2 },
  detailsModalBody:     { padding: S.xl },
  detailsSection:       { marginBottom: S.xl },
  detailsLabel:         { ...T.cap, color: C.ink4, marginBottom: 8 },
  detailsValue:         { ...T.body, color: C.ink1, lineHeight: 24 },

  // ─── Legacy refs ──────────────────────────────────────
  calendarCard:          { backgroundColor: C.surface, marginHorizontal: S.xl, marginBottom: S.xl, borderRadius: R.xl, padding: S.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadow.card },
  calendarContent:       { flexDirection: 'row', alignItems: 'center', flex: 1 },
  calendarIcon:          { fontSize: 32, marginRight: S.md },
  calendarTextContainer: { flex: 1 },
  calendarTitle:         { ...T.label, color: C.ink1 },
  calendarSubtitle:      { ...T.small, color: C.ink3, marginTop: 2 },
  calendarArrow:         { fontSize: 24, color: C.ink2, fontWeight: '600' as const },
  iconText:              { fontSize: 20 },
  closeIcon:             { fontSize: 24, color: C.ink3 },
  sideMenuItemIcon:      { fontSize: 22, marginRight: S.lg },
  detailsModalClose:     { fontSize: 24, color: C.ink3 },
  emptyIcon:             { fontSize: 40, marginBottom: S.md },
  ctaIcon:               { marginRight: S.md },
  ctaArrow:              { fontSize: 24, color: C.ink2, fontWeight: '600' as const },
  reminderIcon:          { marginRight: S.sm },
  reminderButtonMissed:  { backgroundColor: C.red },
});
