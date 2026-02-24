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
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { consultationService } from '../../services/consultationService';
import { messageService, MessageWithSender } from '../../services/messageService';
import { notificationService } from '../../services/notificationService';
import { profileService, TeacherProfile } from '../../services/profileService';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import type { ConsultationRequest } from '../../types';

// Dashboard data limits
const CONSULTATION_LIMIT = 5;
const MESSAGE_LIMIT = 5;

interface ConsultationWithStudent extends ConsultationRequest {
  studentName: string;
}

interface MarkedDates {
  [date: string]: {
    marked: boolean;
    dotColor: string;
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
            };
          } catch (error) {
            return {
              ...consultation,
              studentName: 'Unknown Student',
            };
          }
        })
      );

      // Mark dates on calendar
      const marks: MarkedDates = {};
      upcomingWithNames.forEach(consultation => {
        if (consultation.scheduled_start_time) {
          const date = consultation.scheduled_start_time.split('T')[0];
          marks[date] = {
            marked: true,
            dotColor: '#3b82f6',
          };
        }
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
      const consultationDate = consultation.scheduled_start_time.split('T')[0];
      return consultationDate === date;
    });
  };

  const checkIfMissed = (consultation: ConsultationWithStudent): boolean => {
    if (!consultation.scheduled_end_time) return false;
    const endTime = new Date(consultation.scheduled_end_time);
    const now = new Date();
    return now > endTime && consultation.status === 'accepted';
  };

  const getStatusDisplay = (consultation: ConsultationWithStudent) => {
    if (consultation.status === 'completed') {
      return { text: 'Done', color: '#10b981', bgColor: '#dcfce7' };
    }
    if (consultation.status === 'cancelled') {
      return { text: 'Cancelled', color: '#ef4444', bgColor: '#fee2e2' };
    }
    if (checkIfMissed(consultation)) {
      return { text: 'Missed', color: '#f59e0b', bgColor: '#fef3c7' };
    }
    return { text: 'Scheduled', color: '#3b82f6', bgColor: '#dbeafe' };
  };

  const handleDayPress = (day: DateData) => {
    const date = day.dateString;
    const consultationsOnDate = getConsultationsForDate(date);
    
    if (consultationsOnDate.length > 0) {
      // Show the first consultation for that date
      setSelectedConsultation(consultationsOnDate[0]);
      setShowDetailModal(true);
    } else {
      Alert.alert('No Consultations', 'No consultations scheduled for this date.');
    }
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
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={styles.iconText}>🔔</Text>
            {realtimeUnreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{realtimeUnreadCount}</Text>
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Consultations Calendar</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TeacherConsultations')}>
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.calendarWrapper}>
            <Calendar
              markedDates={markedDates}
              onDayPress={handleDayPress}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#1f2937',
                selectedDayBackgroundColor: '#3b82f6',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#3b82f6',
                dayTextColor: '#1f2937',
                textDisabledColor: '#d1d5db',
                dotColor: '#3b82f6',
                selectedDotColor: '#ffffff',
                arrowColor: '#3b82f6',
                monthTextColor: '#1f2937',
                textMonthFontWeight: 'bold',
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 12,
              }}
            />
          </View>
        </View>

        {/* Quick Stats Card */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.statsCard}
            onPress={() => navigation.navigate('TeacherConsultations')}
          >
            <View style={styles.calendarCardContent}>
              <Text style={styles.calendarIcon}>📊</Text>
              <View style={styles.calendarInfo}>
                <Text style={styles.calendarTitle}>Quick Stats</Text>
                <Text style={styles.calendarSubtext}>
                  {dashboardData.upcomingAppointments.length} upcoming • {dashboardData.pendingRequests.length} pending
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
            {dashboardData.pendingRequests.length > 4 && (
              <TouchableOpacity onPress={() => navigation.navigate('AllRequests')}>
                <Text style={styles.viewAllText}>View All →</Text>
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
                    <Text style={styles.requestAvatarText}>
                      {request.studentName?.[0] || 'S'}
                    </Text>
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
        <View style={styles.sideMenuContainer}>
          <TouchableOpacity 
            style={styles.sideMenuOverlay}
            activeOpacity={1}
            onPress={() => setShowSideMenu(false)}
          />
          <View style={styles.sideMenu}>
            <View style={styles.sideMenuHeader}>
              <Text style={styles.sideMenuTitle}>NEXAD</Text>
              <TouchableOpacity onPress={() => setShowSideMenu(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setShowSideMenu(false);
            }}>
              <Text style={styles.menuItemText}>🏠 Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setShowSideMenu(false);
              navigation.navigate('TeacherConsultations');
            }}>
              <Text style={styles.menuItemText}>📅 My Consultations</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setShowSideMenu(false);
              navigation.navigate('AllRequests');
            }}>
              <Text style={styles.menuItemText}>📝 All Requests</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setShowSideMenu(false);
              navigation.navigate('ClassroomHub');
            }}>
              <Text style={styles.menuItemText}>🏫 Classroom Hub</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setShowSideMenu(false);
              navigation.navigate('Notifications');
            }}>
              <Text style={styles.menuItemText}>🔔 Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setShowSideMenu(false);
              navigation.navigate('ConsultationHistory');
            }}>
              <Text style={styles.menuItemText}>📋 History</Text>
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
        </View>
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
            {selectedConsultation && (
              <>
                <View style={styles.modalHeader2}>
                  <Text style={styles.modalTitle2}>Consultation Details</Text>
                  <TouchableOpacity
                    onPress={() => setShowDetailModal(false)}
                    style={styles.closeButton2}
                  >
                    <Text style={styles.closeButtonText2}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody2}>
                  <View style={styles.modalSection2}>
                    <Text style={styles.modalLabel2}>Student</Text>
                    <Text style={styles.modalValue2}>{selectedConsultation.studentName}</Text>
                  </View>

                  <View style={styles.modalSection2}>
                    <Text style={styles.modalLabel2}>Subject</Text>
                    <Text style={styles.modalValue2}>{selectedConsultation.subject_line}</Text>
                  </View>

                  {selectedConsultation.description && (
                    <View style={styles.modalSection2}>
                      <Text style={styles.modalLabel2}>Description</Text>
                      <Text style={styles.modalValue2}>{selectedConsultation.description}</Text>
                    </View>
                  )}

                  <View style={styles.modalSection2}>
                    <Text style={styles.modalLabel2}>Date & Time</Text>
                    <Text style={styles.modalValue2}>
                      {formatDate(selectedConsultation.scheduled_start_time || '')}
                    </Text>
                    <Text style={styles.modalValue2}>
                      {formatTime(selectedConsultation.scheduled_start_time || '')} - {formatTime(selectedConsultation.scheduled_end_time || '')}
                    </Text>
                  </View>

                  <View style={styles.modalSection2}>
                    <Text style={styles.modalLabel2}>Current Status</Text>
                    <View style={styles.modalStatusContainer2}>
                      {(() => {
                        const status = getStatusDisplay(selectedConsultation);
                        return (
                          <View style={[styles.modalStatusBadge2, { backgroundColor: status.bgColor }]}>
                            <Text style={[styles.modalStatusText2, { color: status.color }]}>{status.text}</Text>
                          </View>
                        );
                      })()}
                    </View>
                  </View>

                  {(selectedConsultation.status === 'accepted' || checkIfMissed(selectedConsultation)) && (
                    <View style={styles.modalActions2}>
                      <TouchableOpacity
                        style={styles.modalActionButton2}
                        onPress={() => handleMarkAsCompleted(selectedConsultation.id)}
                      >
                        <Text style={styles.modalActionButtonText2}>✓ Mark as Done</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalActionButton2, styles.cancelButton2]}
                        onPress={() => handleMarkAsCancelled(selectedConsultation.id)}
                      >
                        <Text style={[styles.modalActionButtonText2, styles.cancelButtonText2]}>✕ Cancel Consultation</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {checkIfMissed(selectedConsultation) && (
                    <View style={styles.missedNotice2}>
                      <Text style={styles.missedNoticeText2}>
                        ⚠️ This consultation was not marked as completed or cancelled and has passed its scheduled time. You can still update its status.
                      </Text>
                    </View>
                  )}
                </ScrollView>
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
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  sideMenuContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sideMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sideMenu: {
    width: '75%',
    backgroundColor: '#ffffff',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  sideMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sideMenuTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#6B4EFF',
  },
  closeIcon: {
    fontSize: 24,
    color: '#6b7280',
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
  modalOverlay2: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent2: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle2: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton2: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText2: {
    fontSize: 20,
    color: '#6b7280',
  },
  modalBody2: {
    padding: 20,
  },
  modalSection2: {
    marginBottom: 20,
  },
  modalLabel2: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
  },
  modalValue2: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
  },
  modalStatusContainer2: {
    flexDirection: 'row',
  },
  modalStatusBadge2: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  modalStatusText2: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions2: {
    marginTop: 20,
    gap: 12,
  },
  modalActionButton2: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalActionButtonText2: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton2: {
    backgroundColor: '#ef4444',
  },
  cancelButtonText2: {
    color: '#fff',
  },
  missedNotice2: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  missedNoticeText2: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
});
