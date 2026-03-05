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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// react-native-calendars not used — replaced with custom week strip
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { consultationService } from '../../services/consultationService';
import { messageService, MessageWithSender } from '../../services/messageService';
import { notificationService } from '../../services/notificationService';
import { profileService, TeacherProfile } from '../../services/profileService';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { supabase } from '../../config/supabase';
import type { ConsultationRequest } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { C, F, T, S, R, shadow } from '../../config/theme';
import { FloatingTabBar } from '../../components/FloatingTabBar'; // kept for future use

// Dashboard data limits
const CONSULTATION_LIMIT = 5;
const MESSAGE_LIMIT = 5;

interface ConsultationWithStudent extends ConsultationRequest {
  studentName: string;
  studentPhotoUrl?: string;
}

interface MarkedDates {
  [date: string]: {
    dots?: Array<{ key: string; color: string; selectedDotColor: string }>;
    marked?: boolean;
    dotColor?: string;
    selected?: boolean;
    selectedColor?: string;
  };
}

interface DashboardData {
  pendingRequests: ConsultationWithStudent[];
  unreadMessages: MessageWithSender[];
  profile: TeacherProfile | null;
  upcomingAppointments: ConsultationWithStudent[];
}

export default function TeacherDashboard({ navigation, route }: any) {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationWithStudent | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    pendingRequests: [],
    unreadMessages: [],
    profile: null,
    upcomingAppointments: [],
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
      Animated.spring(menuAnim, {
        toValue: 0,
        damping: 28,
        stiffness: 280,
        mass: 0.8,
        overshootClamping: true,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1, duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };
  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(menuAnim, {
        toValue: 300, duration: 200,
        easing: Easing.in(Easing.bezier(0.4, 0, 1, 1)),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0, duration: 160,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => { if (finished) setShowSideMenu(false); });
  };

  const loadDashboardData = useCallback(async () => {
    if (!userId) return;
    try {
      const [pendingResult, messagesResult, profileResult] = await Promise.all([
        consultationService.getTeacherRequests(userId, 'pending', 1, CONSULTATION_LIMIT),
        messageService.getUnreadMessages(userId, MESSAGE_LIMIT),
        profileService.getTeacherProfile(userId),
      ]);

      // Load pending requests with student names
      const pendingRequests = pendingResult.data?.data || [];
      const pendingWithNames = await Promise.all(
        pendingRequests.map(async (request) => {
          try {
            const profileResponse = await profileService.getStudentProfile(request.student_id);
            const profile = profileResponse.data;
            return {
              ...request,
              studentName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Student',
              studentPhotoUrl: profile?.profile_photo_url,
            };
          } catch (error) {
            return {
              ...request,
              studentName: 'Unknown Student',
            };
          }
        })
      );

      // Load approved consultations with student names
      const approved = await consultationService.getApprovedConsultations(userId);
      const upcomingWithNames = await Promise.all(
        approved.map(async (consultation) => {
          try {
            const profileResponse = await profileService.getStudentProfile(consultation.student_id);
            const profile = profileResponse.data;
            return {
              ...consultation,
              studentName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Student',
              studentPhotoUrl: profile?.profile_photo_url,
            };
          } catch (error) {
            return {
              ...consultation,
              studentName: 'Unknown Student',
            };
          }
        })
      );

      // Mark dates on calendar — red dot for missed, white for upcoming
      const now = Date.now();
      const toLocalDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const marks: MarkedDates = {};
      upcomingWithNames.forEach(consultation => {
        if (!consultation.scheduled_start_time) return;
        const date = toLocalDate(new Date(consultation.scheduled_start_time));
        const isPast = new Date(consultation.scheduled_start_time).getTime() < now;
        const isMissed = isPast && consultation.status === 'accepted';
        const dotColor = isMissed ? C.ink4 : C.ink2;
        const dotKey = isMissed ? 'missed' : 'upcoming';
        if (!marks[date]) {
          marks[date] = { dots: [] };
        }
        const existing = marks[date].dots!;
        // Only add each type of dot once per day
        if (!existing.some(d => d.key === dotKey)) {
          existing.push({ key: dotKey, color: dotColor, selectedDotColor: '#fff' });
        }
        // Sort so missed (red) always comes first
        marks[date].dots!.sort((a, b) => (a.key === 'missed' ? -1 : 1));
      });
      setMarkedDates(marks);

      setDashboardData({
        pendingRequests: pendingWithNames,
        unreadMessages: messagesResult.data || [],
        profile: profileResult.data || null,
        upcomingAppointments: upcomingWithNames,
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

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (error) {
      return 'Invalid time';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getConsultationsForDate = (date: string) => {
    return dashboardData.upcomingAppointments.filter(consultation => {
      if (!consultation.scheduled_start_time) return false;
      const d = new Date(consultation.scheduled_start_time);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const consultationDate = `${y}-${m}-${day}`;
      return consultationDate === date;
    });
  };

  const checkIfMissed = (consultation: ConsultationWithStudent): boolean => {
    const refTime = consultation.scheduled_end_time || consultation.scheduled_start_time;
    if (!refTime) return false;
    return new Date(refTime).getTime() < Date.now() && consultation.status === 'accepted';
  };

  const getStatusDisplay = (consultation: ConsultationWithStudent) => {
    if (consultation.status === 'completed') {
      return { text: 'Done', color: C.ink1, bgColor: C.ink1 };
    }
    if (consultation.status === 'cancelled') {
      return { text: 'Cancelled', color: C.ink4, bgColor: C.surfaceAlt };
    }
    if (checkIfMissed(consultation)) {
      return { text: 'Missed', color: C.ink2, bgColor: C.surfaceAlt };
    }
    return { text: 'Scheduled', color: C.ink1, bgColor: C.action };
  };

  const handleDayPress = (date: string) => {
    const consultationsOnDate = getConsultationsForDate(date);
    setSelectedDate(date);
    if (consultationsOnDate.length === 0) {
      return;
    }
    // Prioritise missed consultations first, then earliest upcoming
    const sorted = [...consultationsOnDate].sort((a, b) => {
      const aMissed = checkIfMissed(a) ? 0 : 1;
      const bMissed = checkIfMissed(b) ? 0 : 1;
      if (aMissed !== bMissed) return aMissed - bMissed;
      return new Date(a.scheduled_start_time || 0).getTime() - new Date(b.scheduled_start_time || 0).getTime();
    });
    setSelectedConsultation(sorted[0]);
    setShowDetailModal(true);
  };

  const handleMarkAsCompleted = async (consultationId: string) => {
    Alert.alert(
      'Mark as Done',
      'Are you sure you want to mark this consultation as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Done',
          style: 'default',
          onPress: async () => {
            try {
              const consultation = selectedConsultation;
              const result = await consultationService.updateStatus(consultationId, 'completed');
              if (result.error) {
                Alert.alert('Error', result.error);
                return;
              }

              // NOTE: DB trigger (notify_student_status_change) handles student notification.
              Alert.alert('Success', 'Consultation marked as completed');
              setShowDetailModal(false);
              await loadDashboardData();
            } catch (error) {
              Alert.alert('Error', 'Failed to update consultation status');
            }
          },
        },
      ]
    );
  };

  const handleMarkAsCancelled = async (consultationId: string) => {
    Alert.alert(
      'Cancel Consultation',
      'Are you sure you want to cancel this consultation?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const consultation = selectedConsultation;
              const result = await consultationService.updateStatus(consultationId, 'cancelled');
              if (result.error) {
                Alert.alert('Error', result.error);
                return;
              }

              // NOTE: DB trigger (notify_student_status_change) handles student notification.
              Alert.alert('Success', 'Consultation cancelled');
              setShowDetailModal(false);
              await loadDashboardData();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel consultation');
            }
          },
        },
      ]
    );
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

      // NOTE: DB trigger (notify_student_status_change) handles student notification.
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

            // NOTE: DB trigger (notify_student_status_change) handles student notification.
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
        <ActivityIndicator size="large" color={C.ink1} />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  const profile = dashboardData.profile || currentUser;
  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Professor';
  const firstName = profile?.first_name || 'Professor';

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => setShowProfileMenu(true)}>
            <View style={styles.avatar}>
              {profile?.profile_photo_url ? (
                <Image source={{ uri: profile.profile_photo_url }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{fullName[0] || 'P'}</Text>
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerGreeting}>{getGreeting()}</Text>
            <Text style={styles.headerTitle}>{firstName}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color={C.ink2} />
            {realtimeUnreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{realtimeUnreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={openMenu}>
            <Ionicons name="menu-outline" size={24} color={C.ink2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Calendar — week strip */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Consultations</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TeacherConsultations')}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="arrow-forward" size={14} color={C.ink2} style={{ marginLeft: 4 }} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Week strip card */}
          {(() => {
            // Helper: YYYY-MM-DD in LOCAL time (avoids UTC-offset mismatch)
            const toLocalDate = (d: Date) => {
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              return `${y}-${m}-${day}`;
            };
            const todayDate = new Date();
            const todayStr = toLocalDate(todayDate);
            // Sunday of the displayed week
            const base = new Date(todayDate);
            base.setDate(todayDate.getDate() - todayDate.getDay() + weekOffset * 7);
            // Build 7 day objects
            const days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(base);
              d.setDate(base.getDate() + i);
              return d;
            });
            // Month label logic: centre = Wednesday
            const midMonth = days[3].toLocaleString('en-US', { month: 'long' });
            const leftMonth  = days[0].getMonth() !== days[3].getMonth()
              ? days[0].toLocaleString('en-US', { month: 'short' })
              : null;
            const rightMonth = days[6].getMonth() !== days[3].getMonth()
              ? days[6].toLocaleString('en-US', { month: 'short' })
              : null;
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

            return (
              <View style={styles.weekCard}>
                {/* Glass sheen – subtle white highlight from top */}
                <LinearGradient
                  colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 0.55 }}
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                />
                {/* Month navigation header */}
                <View style={styles.weekMonthRow}>
                  <TouchableOpacity
                    style={styles.weekNavBtn}
                    onPress={() => setWeekOffset(w => w - 1)}
                  >
                    {leftMonth && <Text style={styles.weekMonthAdj}>{leftMonth}</Text>}
                    <Ionicons name="chevron-back" size={16} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>

                  <Text style={styles.weekMonthTitle}>{midMonth}</Text>

                  <TouchableOpacity
                    style={styles.weekNavBtn}
                    onPress={() => setWeekOffset(w => w + 1)}
                  >
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.5)" />
                    {rightMonth && <Text style={styles.weekMonthAdj}>{rightMonth}</Text>}
                  </TouchableOpacity>
                </View>

                {/* Day columns */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={62}
                  decelerationRate="fast"
                  contentContainerStyle={styles.weekDaysRow}
                >
                  {days.map((d, i) => {
                    const dateStr = toLocalDate(d);
                    const isToday    = dateStr === todayStr;
                    const isSelected = dateStr === selectedDate;
                    const dots = markedDates[dateStr]?.dots ?? [];
                    const hasScheduled = dots.some(dot => dot.key === 'upcoming');
                    const hasMissed    = dots.some(dot => dot.key === 'missed');

                    return (
                      <TouchableOpacity
                        key={dateStr}
                        style={styles.weekDayCol}
                        onPress={() => handleDayPress(dateStr)}
                        activeOpacity={0.7}
                      >
                        {/* Pill wraps day name + number + dots */}
                        <View style={[
                          styles.weekPill,
                          isSelected && styles.weekPillSelected,
                          !isSelected && isToday && styles.weekPillToday,
                        ]}>
                          <Text style={[
                            styles.weekDayName,
                            isSelected && styles.weekDayNameSelected,
                            !isSelected && isToday && styles.weekDayNameToday,
                          ]}>
                            {dayNames[i]}
                          </Text>
                          <Text style={[
                            styles.weekDayNum,
                            isSelected && styles.weekDayNumTextSelected,
                            !isSelected && isToday && styles.weekDayNumTextToday,
                          ]}>
                            {d.getDate()}
                          </Text>
                          {/* Dot indicators inside pill */}
                          <View style={styles.weekDotRow}>
                            {hasScheduled && <View style={[styles.weekDot, { backgroundColor: isSelected ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.85)' }]} />}
                            {hasMissed    && <View style={[styles.weekDot, { backgroundColor: '#F87171' }]} />}
                            {!hasScheduled && !hasMissed && <View style={[styles.weekDot, { backgroundColor: 'transparent' }]} />}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Legend */}
                <View style={styles.weekLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: 'rgba(255,255,255,0.85)' }]} />
                    <Text style={styles.weekLegendText}>Scheduled</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F87171' }]} />
                    <Text style={styles.weekLegendText}>Missed</Text>
                  </View>
                </View>
              </View>
            );
          })()}
        </View>

        {/* Quick Stats Row */}
        <View style={styles.section}>
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statCardWrap}
              onPress={() => navigation.navigate('TeacherConsultations')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FFFFFF', '#E8F0F8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statCard}
              >
                <View style={styles.statIconCircle}>
                  <Ionicons name="calendar" size={20} color={C.ink2} />
                </View>
                <Text style={styles.statNumber}>{dashboardData.upcomingAppointments.length}</Text>
                <Text style={styles.statLabel}>Upcoming</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statCardWrap}
              onPress={() => navigation.navigate('AllRequests')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FFFFFF', '#E8F0F8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statCard}
              >
                <View style={styles.statIconCircle}>
                  <Ionicons name="hourglass" size={20} color={C.ink2} />
                </View>
                <Text style={styles.statNumber}>{dashboardData.pendingRequests.length}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statCardWrap}
              onPress={() => Alert.alert('Messages', 'View all messages')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FFFFFF', '#E8F0F8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statCard}
              >
                <View style={styles.statIconCircle}>
                  <Ionicons name="chatbubble" size={20} color={C.ink2} />
                </View>
                <Text style={styles.statNumber}>{dashboardData.unreadMessages.length}</Text>
                <Text style={styles.statLabel}>Messages</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pending Requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Requests</Text>
            {dashboardData.pendingRequests.length > 4 && (
              <TouchableOpacity onPress={() => navigation.navigate('AllRequests')}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.viewAllText}>View All</Text>
                  <Ionicons name="arrow-forward" size={14} color={C.ink2} style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
            )}
          </View>

          {dashboardData.pendingRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No pending requests</Text>
            </View>
          ) : (
            dashboardData.pendingRequests.slice(0, 4).map((request, index) => (
              <TouchableOpacity 
                key={request.id} 
                style={styles.requestCard}
                onPress={() => navigation.navigate('RequestApproval', { request })}
              >
                <View style={styles.requestCardHeader}>
                  <View style={styles.requestAvatar}>
                    {request.studentPhotoUrl
                      ? <Image source={{ uri: request.studentPhotoUrl }} style={styles.requestAvatarImg} />
                      : <Text style={styles.requestAvatarText}>
                          {request.studentName?.[0] || 'S'}
                        </Text>
                    }
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>
                      {request.studentName}
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
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.viewAllText}>View All</Text>
                  <Ionicons name="arrow-forward" size={14} color={C.ink2} style={{ marginLeft: 4 }} />
                </View>
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

      {/* Burger Menu Drawer */}
      <Modal visible={showSideMenu} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={styles.drawerOverlay}>
          <Animated.View style={[styles.drawerBackdrop, { opacity: backdropAnim }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeMenu} />
          </Animated.View>
          <Animated.View style={[styles.drawer, { transform: [{ translateX: menuAnim }] }]}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerAvatar}>
                {profile?.profile_photo_url ? (
                  <Image source={{ uri: profile.profile_photo_url }} style={styles.drawerAvatarImg} />
                ) : (
                  <Text style={styles.drawerAvatarText}>{fullName[0] || 'P'}</Text>
                )}
              </View>
              <View style={styles.drawerHeaderInfo}>
                <Text style={styles.drawerName}>{fullName}</Text>
                <Text style={styles.drawerRole}>Teacher</Text>
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
            <TouchableOpacity style={styles.drawerItem} onPress={() => {
              closeMenu();
              navigation.navigate('ClassroomHub');
              // Mark all classroom_announcement notifications as read
              supabase.from('notifications').update({ is_read: true })
                .eq('user_id', userId).eq('type', 'classroom_announcement').eq('is_read', false)
                .then(() => setClassroomUnreadCount(0));
            }}>
              <Ionicons name="book-outline" size={20} color={C.ink2} style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>My Classes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); navigation.navigate('AllRequests'); }}>
              <Ionicons name="document-text-outline" size={20} color={C.ink2} style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Requests</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); navigation.navigate('TeacherConsultations'); }}>
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

      {/* Profile Menu Modal */}
      <Modal visible={showProfileMenu} transparent animationType="fade" onRequestClose={() => setShowProfileMenu(false)}>
        <TouchableOpacity style={styles.profileOverlay} activeOpacity={1} onPress={() => setShowProfileMenu(false)}>
          <View style={styles.profileMenu}>
            <View style={styles.profileMenuHeader}>
              <View style={styles.profileMenuAvatar}>
                {profile?.profile_photo_url ? (
                  <Image source={{ uri: profile.profile_photo_url }} style={styles.profileMenuAvatarImg} />
                ) : (
                  <Text style={styles.profileMenuAvatarText}>{fullName[0] || 'P'}</Text>
                )}
              </View>
              <View style={styles.profileMenuInfo}>
                <Text style={styles.profileMenuName}>{fullName}</Text>
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
              <Text style={[styles.profileMenuItemText, { color: C.red }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>



      {/* Consultation Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay2}>
          <View style={styles.modalContent2}>
            {selectedConsultation && (() => {
              const isMissed = checkIfMissed(selectedConsultation);
              const status = getStatusDisplay(selectedConsultation);
              const headerBg = isMissed ? '#7F1D1D' : '#1C1C1C';
              const headerDecor = isMissed ? '#991B1B' : '#2E2E2E';
              return (
                <>
                  {/* Dark header */}
                  <View style={[styles.tdmHeader, { backgroundColor: headerBg }]}>
                    <View style={[styles.tdmHeaderDecor,  { backgroundColor: headerDecor }]} />
                    <View style={[styles.tdmHeaderDecor2, { backgroundColor: headerDecor }]} />
                    <TouchableOpacity style={styles.tdmCloseBtn} onPress={() => setShowDetailModal(false)}>
                      <Ionicons name="close" size={18} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                    <View style={styles.tdmAvatarWrap}>
                      {selectedConsultation.studentPhotoUrl
                        ? <Image source={{ uri: selectedConsultation.studentPhotoUrl }} style={styles.tdmAvatarImg} />
                        : <Text style={styles.tdmAvatarText}>{selectedConsultation.studentName.charAt(0).toUpperCase()}</Text>
                      }
                    </View>
                    <Text style={styles.tdmStudentName}>{selectedConsultation.studentName}</Text>
                    <Text style={styles.tdmSubjectLine} numberOfLines={2}>{selectedConsultation.subject_line}</Text>
                    <View style={[styles.tdmStatusPill, isMissed && styles.tdmStatusPillMissed]}>
                      <View style={[styles.tdmStatusDot, isMissed && { backgroundColor: '#FCA5A5' }]} />
                      <Text style={styles.tdmStatusPillText}>{status.text}</Text>
                    </View>
                  </View>

                  {/* Body */}
                  <ScrollView style={styles.modalBody2} showsVerticalScrollIndicator={false}>
                    {selectedConsultation.description && (
                      <View style={styles.tdmInfoCard}>
                        <View style={styles.tdmInfoRow}>
                          <View style={styles.tdmIconBox}><Ionicons name="document-text-outline" size={16} color={C.ink2} /></View>
                          <View style={styles.tdmInfoContent}>
                            <Text style={styles.tdmInfoLabel}>Description</Text>
                            <Text style={styles.tdmInfoValue}>{selectedConsultation.description}</Text>
                          </View>
                        </View>
                      </View>
                    )}

                    <View style={styles.tdmInfoCard}>
                      <View style={styles.tdmInfoRow}>
                        <View style={styles.tdmIconBox}><Ionicons name="calendar-outline" size={16} color={C.ink2} /></View>
                        <View style={styles.tdmInfoContent}>
                          <Text style={styles.tdmInfoLabel}>Date</Text>
                          <Text style={styles.tdmInfoValue}>{formatDate(selectedConsultation.scheduled_start_time || '')}</Text>
                        </View>
                      </View>
                      <View style={styles.tdmInfoDivider} />
                      <View style={styles.tdmInfoRow}>
                        <View style={styles.tdmIconBox}><Ionicons name="time-outline" size={16} color={C.ink2} /></View>
                        <View style={styles.tdmInfoContent}>
                          <Text style={styles.tdmInfoLabel}>Time</Text>
                          <Text style={styles.tdmInfoValue}>
                            {formatTime(selectedConsultation.scheduled_start_time || '')} — {formatTime(selectedConsultation.scheduled_end_time || '')}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {isMissed && (
                      <View style={styles.tdmMissedBanner}>
                        <Ionicons name="warning-outline" size={15} color={C.ink2} />
                        <Text style={styles.tdmMissedText}>Passed scheduled time without being marked completed or cancelled.</Text>
                      </View>
                    )}

                    {(selectedConsultation.status === 'accepted' || isMissed) && (
                      <View style={styles.tdmActions}>
                        <TouchableOpacity
                          style={styles.tdmActionPrimary}
                          onPress={() => handleMarkAsCompleted(selectedConsultation.id)}
                        >
                          <Ionicons name="checkmark-circle-outline" size={18} color={C.accentText} />
                          <Text style={styles.tdmActionPrimaryText}>Mark as Done</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.tdmActionSecondary}
                          onPress={() => handleMarkAsCancelled(selectedConsultation.id)}
                        >
                          <Ionicons name="close-circle-outline" size={18} color={C.ink2} />
                          <Text style={styles.tdmActionSecondaryText}>Cancel Consultation</Text>
                        </TouchableOpacity>
                      </View>
                    )}

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

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: 'transparent' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  loadingText:      { marginTop: S.md, ...T.body, color: C.ink4 },

  // ─── Header ───────────────────────────────────────────
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: S.xl, paddingTop: S.lg, paddingBottom: S.md,
    backgroundColor: 'transparent',
  },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar:        { width: 48, height: 48, borderRadius: 24, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: S.md, borderWidth: 1, borderColor: C.borderLight },
  avatarText:    { color: C.ink1, fontSize: 19, fontWeight: '600' as const },
  avatarImg:     { width: 44, height: 44, borderRadius: 22 },
  headerTextWrap:{ flex: 1 },
  headerGreeting:{ ...T.small, color: C.ink3, marginBottom: 2 },
  headerTitle:   { ...T.h2, color: C.ink1 },
  headerRight:   { flexDirection: 'row', gap: S.sm },
  avatarBtn:     { },

  iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderLight, position: 'relative' },
  badge:      { position: 'absolute', top: -2, right: -2, backgroundColor: C.red, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.bg },
  badgeText:  { color: '#fff', fontSize: 10, fontWeight: '700' as const },

  // ─── Content ──────────────────────────────────────────
  content:       { flex: 1 },
  section:       { marginTop: S.xl, paddingHorizontal: S.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.lg },
  sectionTitle:  { ...T.h3, color: C.ink1 },
  viewAllText:   { ...T.label, color: C.accent },

  // ─── Stats Row ────────────────────────────────────────
  statsRow:       { flexDirection: 'row', gap: S.md },
  statCardWrap:   { flex: 1, borderRadius: R.xl, overflow: 'hidden' as const, shadowColor: '#A0B8D0', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
  statCard:       { padding: S.lg, alignItems: 'center' as const, borderRadius: R.xl, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)' },
  statIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(200,218,235,0.6)', justifyContent: 'center' as const, alignItems: 'center' as const, marginBottom: S.sm },
  statNumber:     { ...T.h1, color: C.ink1, marginBottom: 2 },
  statLabel:      { ...T.small, color: C.ink3 },

  // ─── Calendar ─────────────────────────────────────────
  // Week strip styles
  weekCard:           { borderRadius: R.xl, paddingVertical: S.lg, paddingHorizontal: S.md, overflow: 'hidden' as const, backgroundColor: '#1E1E1E', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', shadowColor: '#000000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.55, shadowRadius: 22, elevation: 14 },
  weekMonthRow:       { flexDirection: 'row' as const, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.sm, marginBottom: S.md },
  weekNavBtn:         { flexDirection: 'row' as const, alignItems: 'center', gap: 2, minWidth: 56, padding: 4 },
  weekMonthAdj:       { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '500' as const },
  weekMonthTitle:     { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF', textAlign: 'center' as const, flex: 1 },
  weekDaysRow:        { flexDirection: 'row' as const, gap: 4, paddingHorizontal: S.sm, paddingVertical: 4 },
  weekDayCol:             { alignItems: 'center' as const, width: 58, gap: 6 },
  weekPill:               { alignItems: 'center' as const, justifyContent: 'center' as const, alignSelf: 'center' as const, width: 50, paddingVertical: 16, borderRadius: 28, gap: 3, backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  weekPillSelected:       { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: 'rgba(255,255,255,0.9)' },
  weekPillToday:          { backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)' },
  weekDayName:            { fontSize: 11, fontWeight: '500' as const, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: 0.3 },
  weekDayNameSelected:    { color: 'rgba(0,0,0,0.55)' },
  weekDayNameToday:       { color: 'rgba(255,255,255,0.65)' },
  weekDayNum:             { fontSize: 15, fontWeight: '700' as const, color: 'rgba(255,255,255,0.8)' },
  weekDayNumTextSelected: { color: '#111111' },
  weekDayNumTextToday:    { color: '#FFFFFF' },
  weekDotRow:         { flexDirection: 'row' as const, gap: 3, height: 7, alignItems: 'center' as const, justifyContent: 'center' as const },
  weekDot:            { width: 5, height: 5, borderRadius: 3 },
  weekLegend:         { flexDirection: 'row' as const, justifyContent: 'center', gap: 24, marginTop: S.md, paddingTop: S.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  weekLegendText:     { ...T.tiny, color: 'rgba(255,255,255,0.5)' },

  // Legacy calendar (unused but kept to avoid RN style ref errors)
  calendarWrapper: { backgroundColor: C.surface, borderRadius: R.xl, overflow: 'hidden', borderWidth: 1, borderColor: C.borderLight, ...shadow.soft },
  calendarLegend:  { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingVertical: S.md, paddingHorizontal: S.lg, borderTopWidth: 1, borderTopColor: C.borderLight },
  legendItem:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:       { width: 10, height: 10, borderRadius: 5 },
  legendText:      { ...T.tiny },

  // ─── Request Cards ────────────────────────────────────
  requestCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: S.lg,
    marginBottom: S.md,
    borderWidth: 1,
    borderColor: C.borderLight,
    ...shadow.soft,
  },
  requestCardHeader: { flexDirection: 'row' },
  requestAvatar:     { width: 48, height: 48, borderRadius: 24, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: S.lg },
  requestAvatarText: { fontSize: 20, fontWeight: '600' as const, color: C.ink2 },
  requestAvatarImg:  { width: 48, height: 48, borderRadius: 24 },
  requestInfo:       { flex: 1 },
  requestName:       { ...T.label, color: C.ink1, fontSize: 14, marginBottom: 4 },
  requestSubject:    { ...T.small, color: C.ink3, marginBottom: 4 },
  requestDate:       { ...T.tiny },

  // ─── Message Cards ────────────────────────────────────
  messageCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: S.lg,
    marginBottom: S.md,
    borderWidth: 1,
    borderColor: C.borderLight,
    ...shadow.soft,
  },
  messageHeader:  { marginBottom: S.sm },
  messageSubject: { ...T.label, color: C.ink1, fontSize: 14 },
  messagePreview: { ...T.small, color: C.ink3, lineHeight: 20 },

  // ─── Empty State ──────────────────────────────────────
  emptyState:     { backgroundColor: C.surface, borderRadius: R.xl, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: C.borderLight },
  emptyStateText: { ...T.body, color: C.ink4 },

  // ─── Burger Drawer ────────────────────────────────────
  drawerOverlay:    { flex: 1 },
  drawerBackdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: C.scrim },
  drawer:           { position: 'absolute', top: 0, bottom: 0, right: 0, width: 300, backgroundColor: C.surface, paddingTop: 60, paddingBottom: 32, borderTopLeftRadius: R.xl, borderBottomLeftRadius: R.xl, ...shadow.lift },
  drawerHeader:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.xl, paddingBottom: S.lg },
  drawerAvatar:     { width: 52, height: 52, borderRadius: 26, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: S.md, borderWidth: 1, borderColor: C.borderLight },
  drawerAvatarText: { fontSize: 20, fontWeight: '600' as const, color: C.ink1 },
  drawerAvatarImg:  { width: 52, height: 52, borderRadius: 26 },
  drawerHeaderInfo: { flex: 1 },
  drawerName:       { ...T.label, color: C.ink1, fontSize: 15 },
  drawerRole:       { ...T.small, color: C.ink3, marginTop: 2 },
  drawerClose:      { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  drawerDivider:    { height: 1, backgroundColor: C.borderLight, marginHorizontal: S.xl, marginVertical: S.sm },
  drawerItem:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.xl, paddingVertical: 14 },
  drawerItemIcon:   { marginRight: S.lg },
  drawerItemText:   { ...T.body, color: C.ink1 },

  // ─── Profile Menu ─────────────────────────────────────
  profileOverlay:        { flex: 1, backgroundColor: C.scrim, justifyContent: 'flex-start', alignItems: 'flex-start', paddingTop: 72, paddingLeft: S.xl },
  profileMenu:           { backgroundColor: C.surface, borderRadius: R.xl, width: 280, padding: S.xl, ...shadow.lift },
  profileMenuHeader:     { flexDirection: 'row', alignItems: 'center', paddingBottom: S.lg },
  profileMenuAvatar:     { width: 48, height: 48, borderRadius: 24, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: S.md },
  profileMenuAvatarText: { color: C.ink1, fontSize: 20, fontWeight: '600' as const },
  profileMenuAvatarImg:  { width: 48, height: 48, borderRadius: 24 },
  profileMenuInfo:       { flex: 1 },
  profileMenuName:       { ...T.label, color: C.ink1, fontSize: 14 },
  profileMenuEmail:      { ...T.small, color: C.ink3, marginTop: 2 },
  profileMenuDivider:    { height: 1, backgroundColor: C.borderLight, marginVertical: S.sm },
  profileMenuItem:       { flexDirection: 'row', alignItems: 'center', paddingVertical: S.md, paddingHorizontal: S.sm, borderRadius: R.md },
  profileMenuItemText:   { ...T.body, color: C.ink1 },

  // ─── Side Menu (kept for TS compat) ───────────────────
  sideMenuContainer:  { flex: 1, flexDirection: 'row' },
  sideMenuOverlay:    { flex: 1, backgroundColor: C.scrim },
  sideMenu:           { width: '75%', backgroundColor: C.surface, paddingTop: 60, paddingHorizontal: S.xl },
  sideMenuHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, paddingBottom: S.lg, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  sideMenuTitle:      { ...T.h2, color: C.ink1 },
  menuItem:           { paddingVertical: S.lg, paddingHorizontal: S.md, borderRadius: R.md },
  menuItemText:       { ...T.body, color: C.ink1 },
  menuDivider:        { height: 1, backgroundColor: C.borderLight, marginVertical: S.sm },
  signOutItem:        { marginTop: S.sm },
  signOutText:        { color: C.red, fontWeight: '600' as const },

  // ─── Detail Modal (redesigned) ───────────────────────
  modalOverlay2:      { flex: 1, backgroundColor: C.scrim, justifyContent: 'flex-end' },
  modalContent2:      { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' as const, maxHeight: '88%', ...shadow.lift },
  modalBody2:         { padding: S.xl },

  tdmHeader:          { padding: S.xl, paddingTop: S.xl + 8, paddingBottom: S.xl + 4, overflow: 'hidden' as const, position: 'relative' as const, alignItems: 'center' as const },
  tdmHeaderDecor:     { position: 'absolute' as const, width: 160, height: 160, borderRadius: 80, top: -60, right: -40, backgroundColor: 'rgba(255,255,255,0.06)' },
  tdmHeaderDecor2:    { position: 'absolute' as const, width: 90,  height: 90,  borderRadius: 45, bottom: -20, left: 20, backgroundColor: 'rgba(255,255,255,0.04)' },
  tdmCloseBtn:        { position: 'absolute' as const, top: S.lg, right: S.lg, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center' as const, alignItems: 'center' as const },
  tdmAvatarWrap:      { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center' as const, alignItems: 'center' as const, marginBottom: S.md },
  tdmAvatarText:      { color: '#FFFFFF', fontSize: 26, fontWeight: '700' as const },
  tdmAvatarImg:       { width: 64, height: 64, borderRadius: 32 },
  tdmStudentName:     { color: '#FFFFFF', fontSize: 18, fontWeight: '700' as const, textAlign: 'center' as const, marginBottom: 4 },
  tdmSubjectLine:     { color: 'rgba(255,255,255,0.65)', fontSize: 13, textAlign: 'center' as const, lineHeight: 18, marginBottom: S.md, paddingHorizontal: S.xl },
  tdmStatusPill:      { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: R.full },
  tdmStatusPillMissed:{ backgroundColor: 'rgba(255,255,255,0.22)' },
  tdmStatusDot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: '#86EFAC' },
  tdmStatusPillText:  { color: '#FFFFFF', fontSize: 12, fontWeight: '600' as const },
  tdmInfoCard:        { backgroundColor: C.bg, borderRadius: R.xl, marginBottom: S.md, overflow: 'hidden' as const, borderWidth: 1, borderColor: C.borderLight },
  tdmInfoRow:         { flexDirection: 'row' as const, alignItems: 'flex-start' as const, padding: S.lg, gap: S.md },
  tdmIconBox:         { width: 36, height: 36, borderRadius: R.md, backgroundColor: C.surface, justifyContent: 'center' as const, alignItems: 'center' as const, borderWidth: 1, borderColor: C.borderLight },
  tdmInfoContent:     { flex: 1 },
  tdmInfoLabel:       { fontSize: 11, fontWeight: '600' as const, color: C.ink4, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 3 },
  tdmInfoValue:       { ...T.body, color: C.ink1, lineHeight: 22 },
  tdmInfoDivider:     { height: 1, backgroundColor: C.borderLight, marginLeft: 52 },
  tdmMissedBanner:    { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: S.sm, backgroundColor: C.surfaceAlt, borderRadius: R.lg, padding: S.lg, marginBottom: S.md, borderWidth: 1, borderColor: C.borderLight },
  tdmMissedText:      { ...T.small, color: C.ink2, lineHeight: 18, flex: 1 },
  tdmActions:         { gap: S.md, marginTop: S.sm },
  tdmActionPrimary:   { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: S.sm, backgroundColor: C.accent, paddingVertical: 15, borderRadius: R.lg, ...shadow.soft },
  tdmActionPrimaryText:   { ...T.label, color: C.accentText, fontSize: 15, fontWeight: '600' as const },
  tdmActionSecondary: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: S.sm, backgroundColor: C.surfaceAlt, paddingVertical: 15, borderRadius: R.lg, borderWidth: 1, borderColor: C.borderLight },
  tdmActionSecondaryText: { ...T.label, color: C.ink2, fontSize: 15 },

  // Legacy modal refs (kept for TS) ─────────────────────
  modalHeader2:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: S.xl, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  modalTitle2:        { ...T.h2 },
  closeButton2:       { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  closeButtonText2:   { fontSize: 20, color: C.ink3 },
  modalSection2:      { marginBottom: S.xl },
  modalLabel2:        { ...T.cap, color: C.ink4, marginBottom: 8 },
  modalValue2:        { ...T.body, color: C.ink1, lineHeight: 24 },
  modalStatusContainer2: { flexDirection: 'row' },
  modalStatusBadge2:  { paddingHorizontal: S.lg, paddingVertical: S.sm, borderRadius: R.full },
  modalStatusText2:   { ...T.label, fontWeight: '600' as const },
  modalActions2:      { marginTop: S.xl, gap: S.md },
  modalActionButton2: { backgroundColor: C.accent, paddingVertical: 16, borderRadius: R.lg, alignItems: 'center', ...shadow.soft },
  modalActionButtonText2: { ...T.label, color: C.accentText, fontSize: 16 },
  cancelButton2:      { backgroundColor: C.surfaceAlt },
  cancelButtonText2:  { color: C.ink2 },
  missedNotice2:      { backgroundColor: C.surfaceAlt, padding: S.lg, borderRadius: R.lg, marginTop: S.xl, borderWidth: 1, borderColor: C.borderLight },
  missedNoticeText2:  { ...T.small, color: C.ink2, lineHeight: 20 },

  // ─── Legacy (unused but kept for TS) ──────────────────
  statsCard:           { backgroundColor: C.surface, borderRadius: R.xl, padding: S.xl, ...shadow.card },
  calendarCard:        { backgroundColor: C.surface, borderRadius: R.xl, padding: S.xl, ...shadow.card },
  calendarCardContent: { flexDirection: 'row', alignItems: 'center' },
  calendarIcon:        { marginRight: S.lg },
  calendarInfo:        { flex: 1 },
  calendarTitle:       { ...T.label, color: C.ink1, marginBottom: 4 },
  calendarSubtext:     { ...T.small, color: C.ink3 },
  calendarArrow:       { fontSize: 20, color: C.ink2, fontWeight: '600' as const },
});
