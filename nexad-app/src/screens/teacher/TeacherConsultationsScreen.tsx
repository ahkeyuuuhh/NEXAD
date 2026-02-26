import React, { useState, useEffect } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { useAuth } from '../../contexts/AuthContext';
import { consultationService } from '../../services/consultationService';
import { notificationService } from '../../services/notificationService';
import { profileService } from '../../services/profileService';
import { Ionicons } from '@expo/vector-icons';
import type { ConsultationRequest } from '../../types';
import { C, F, T, S, R, shadow } from '../../config/theme';

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

export default function TeacherConsultationsScreen({ navigation }: any) {
  const [consultations, setConsultations] = useState<ConsultationWithStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationWithStudent | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const authContext = useAuth();
  const userId = authContext.user?.user_id;

  const loadConsultations = async () => {
    if (!userId) return;

    try {
      // Get all approved consultations
      const approved = await consultationService.getApprovedConsultations(userId);
      
      // Load student names for each consultation
      const consultationsWithNames = await Promise.all(
        approved.map(async (consultation) => {
          try {
            const profileResponse = await profileService.getStudentProfile(consultation.student_id);
            const profile = profileResponse.data;
            return {
              ...consultation,
              studentName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Student',
            };
          } catch (error) {
            console.error('Error loading student profile:', error);
            return {
              ...consultation,
              studentName: 'Unknown Student',
            };
          }
        })
      );

      setConsultations(consultationsWithNames);
      
      // Mark dates on calendar
      const marks: MarkedDates = {};
      consultationsWithNames.forEach(consultation => {
        if (consultation.scheduled_start_time) {
          const date = consultation.scheduled_start_time.split('T')[0];
          marks[date] = {
            marked: true,
            dotColor: C.ink2,
          };
        }
      });
      setMarkedDates(marks);
      
    } catch (error) {
      console.error('Error loading consultations:', error);
      Alert.alert('Error', 'Failed to load consultations');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadConsultations();
  }, [userId]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadConsultations();
  };

  const onDayPress = (day: DateData) => {
    const date = day.dateString;
    setSelectedDate(date);
    
    // Update marked dates to show selection
    const updatedMarks: MarkedDates = {};
    Object.keys(markedDates).forEach(key => {
      updatedMarks[key] = {
        ...markedDates[key],
        selected: key === date,
        selectedColor: key === date ? C.ink2 : undefined,
      };
    });
    
    // If the selected date isn't marked, add it
    if (!updatedMarks[date]) {
      updatedMarks[date] = {
        marked: false,
        dotColor: C.ink2,
        selected: true,
        selectedColor: C.ink2,
      };
    }
    
    setMarkedDates(updatedMarks);
  };

  const getConsultationsForDate = (date: string) => {
    return consultations.filter(consultation => {
      if (!consultation.scheduled_start_time) return false;
      const consultationDate = consultation.scheduled_start_time.split('T')[0];
      return consultationDate === date;
    });
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

  const handleViewConsultation = (consultation: ConsultationWithStudent) => {
    setSelectedConsultation(consultation);
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
              await loadConsultations();
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
              await loadConsultations();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel consultation');
            }
          },
        },
      ]
    );
  };

  const checkIfMissed = (consultation: ConsultationWithStudent): boolean => {
    if (!consultation.scheduled_end_time) return false;
    const endTime = new Date(consultation.scheduled_end_time);
    const now = new Date();
    return now > endTime && consultation.status === 'accepted';
  };

  const getStatusDisplay = (consultation: ConsultationWithStudent) => {
    if (consultation.status === 'completed') {
      return { text: 'Done', color: '#fff', bgColor: C.ink2 };
    }
    if (consultation.status === 'cancelled') {
      return { text: 'Cancelled', color: C.ink3, bgColor: C.surfaceAlt };
    }
    if (checkIfMissed(consultation)) {
      return { text: 'Missed', color: C.ink3, bgColor: C.surfaceAlt };
    }
    return { text: 'Scheduled', color: C.ink2, bgColor: C.surfaceAlt };
  };

  const selectedDateConsultations = selectedDate ? getConsultationsForDate(selectedDate) : [];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.ink2} />
          <Text style={styles.loadingText}>Loading consultations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={18} color={C.ink2} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Consultations</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            markedDates={markedDates}
            onDayPress={onDayPress}
            theme={{
              backgroundColor: C.surface,
              calendarBackground: C.surface,
              textSectionTitleColor: C.ink1,
              selectedDayBackgroundColor: C.ink1,
              selectedDayTextColor: '#ffffff',
              todayTextColor: C.ink1,
              dayTextColor: C.ink1,
              textDisabledColor: C.border,
              dotColor: C.ink2,
              selectedDotColor: '#ffffff',
              arrowColor: C.ink1,
              monthTextColor: C.ink1,
              textMonthFontWeight: 'bold',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
          />
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: C.ink2 }]} />
            <Text style={styles.legendText}>Has Consultations</Text>
          </View>
        </View>

        {/* Selected Date Consultations */}
        {selectedDate ? (
          <View style={styles.selectedDateSection}>
            <Text style={styles.selectedDateTitle}>
              {formatDate(selectedDate)}
            </Text>
            {selectedDateConsultations.length > 0 ? (
              selectedDateConsultations.map((consultation) => {
                const status = getStatusDisplay(consultation);
                return (
                  <TouchableOpacity
                    key={consultation.id}
                    style={styles.consultationCard}
                    onPress={() => handleViewConsultation(consultation)}
                  >
                    <View style={styles.consultationHeader}>
                      <Text style={styles.studentName}>{consultation.studentName}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
                        <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.consultationDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Time:</Text>
                        <Text style={styles.detailValue}>
                          {formatTime(consultation.scheduled_start_time || '')} - {formatTime(consultation.scheduled_end_time || '')}
                        </Text>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Subject:</Text>
                        <Text style={styles.detailValue}>{consultation.subject_line}</Text>
                      </View>
                      
                      {consultation.description && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Description:</Text>
                          <Text style={styles.detailValue} numberOfLines={2}>{consultation.description}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.tapToManageText}>Tap to manage \u2192</Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.noConsultationsCard}>
                <Text style={styles.noConsultationsText}>
                  No consultations scheduled for this date
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noSelectionContainer}>
            <Text style={styles.noSelectionText}>
              Select a date to view consultations
            </Text>
          </View>
        )}

        {/* All Upcoming Consultations */}
        <View style={styles.allConsultationsSection}>
          <Text style={styles.sectionTitle}>All Upcoming Consultations</Text>
          {consultations.length > 0 ? (
            consultations
              .filter(c => c.scheduled_start_time && new Date(c.scheduled_start_time) >= new Date())
              .sort((a, b) => {
                const dateA = new Date(a.scheduled_start_time || 0);
                const dateB = new Date(b.scheduled_start_time || 0);
                return dateA.getTime() - dateB.getTime();
              })
              .map((consultation) => {
                const status = getStatusDisplay(consultation);
                return (
                  <TouchableOpacity
                    key={consultation.id}
                    style={styles.consultationCard}
                    onPress={() => handleViewConsultation(consultation)}
                  >
                    <View style={styles.consultationHeader}>
                      <Text style={styles.studentName}>{consultation.studentName}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
                        <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.consultationDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date:</Text>
                        <Text style={styles.detailValue}>
                          {formatDate(consultation.scheduled_start_time || '')}
                        </Text>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Time:</Text>
                        <Text style={styles.detailValue}>
                          {formatTime(consultation.scheduled_start_time || '')} - {formatTime(consultation.scheduled_end_time || '')}
                        </Text>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Subject:</Text>
                        <Text style={styles.detailValue}>{consultation.subject_line}</Text>
                      </View>
                      
                      {consultation.description && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Description:</Text>
                          <Text style={styles.detailValue} numberOfLines={2}>{consultation.description}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.tapToManageText}>Tap to manage \u2192</Text>
                  </TouchableOpacity>
                );
              })
          ) : (
            <View style={styles.noConsultationsCard}>
              <Text style={styles.noConsultationsText}>
                No upcoming consultations
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Consultation Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedConsultation && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Consultation Details</Text>
                  <TouchableOpacity
                    onPress={() => setShowDetailModal(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={18} color={C.ink3} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Student</Text>
                    <Text style={styles.modalValue}>{selectedConsultation.studentName}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Subject</Text>
                    <Text style={styles.modalValue}>{selectedConsultation.subject_line}</Text>
                  </View>

                  {selectedConsultation.description && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Description</Text>
                      <Text style={styles.modalValue}>{selectedConsultation.description}</Text>
                    </View>
                  )}

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Date & Time</Text>
                    <Text style={styles.modalValue}>
                      {formatDate(selectedConsultation.scheduled_start_time || '')}
                    </Text>
                    <Text style={styles.modalValue}>
                      {formatTime(selectedConsultation.scheduled_start_time || '')} - {formatTime(selectedConsultation.scheduled_end_time || '')}
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Current Status</Text>
                    <View style={styles.modalStatusContainer}>
                      {(() => {
                        const status = getStatusDisplay(selectedConsultation);
                        return (
                          <View style={[styles.modalStatusBadge, { backgroundColor: status.bgColor }]}>
                            <Text style={[styles.modalStatusText, { color: status.color }]}>{status.text}</Text>
                          </View>
                        );
                      })()}
                    </View>
                  </View>

                  {(selectedConsultation.status === 'accepted' || checkIfMissed(selectedConsultation)) && (
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={styles.modalActionButton}
                        onPress={() => handleMarkAsCompleted(selectedConsultation.id)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="checkmark" size={18} color="#fff" />
                          <Text style={styles.modalActionButtonText}>Mark as Done</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalActionButton, styles.cancelButton]}
                        onPress={() => handleMarkAsCancelled(selectedConsultation.id)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="close" size={18} color="#fff" />
                          <Text style={[styles.modalActionButtonText, styles.cancelButtonText]}>Cancel Consultation</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}

                  {checkIfMissed(selectedConsultation) && (
                    <View style={styles.missedNotice}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                        <Ionicons name="alert-circle-outline" size={18} color={C.ink3} style={{ marginTop: 1 }} />
                        <Text style={[styles.missedNoticeText, { flex: 1 }]}>
                          This consultation was not marked as completed or cancelled and has passed its scheduled time. You can still update its status.
                        </Text>
                      </View>
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
    backgroundColor: C.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: C.ink3,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.xl,
    paddingVertical: S.lg,
    backgroundColor: C.bg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: S.sm,
  },
  backButtonText: {
    color: C.ink2,
    fontSize: 16,
    fontWeight: '400' as const,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: C.ink1,
  },
  placeholder: {
    width: 60,
  },
  calendarContainer: {
    backgroundColor: C.surface,
    margin: S.xl,
    borderRadius: R.xl,
    overflow: 'hidden',
    ...shadow.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: S.lg,
    marginBottom: S.lg,
    gap: S.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: C.ink3,
  },
  selectedDateSection: {
    paddingHorizontal: S.xl,
    marginBottom: S.xl2,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: C.ink1,
    marginBottom: S.md,
  },
  noSelectionContainer: {
    paddingHorizontal: S.xl,
    paddingVertical: 32,
    alignItems: 'center',
  },
  noSelectionText: {
    fontSize: 16,
    color: C.ink3,
    textAlign: 'center',
  },
  allConsultationsSection: {
    paddingHorizontal: S.xl,
    marginBottom: S.xl2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: C.ink1,
    marginBottom: S.md,
  },
  consultationCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: S.lg,
    marginBottom: S.md,
    ...shadow.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
  },
  consultationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S.md,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: C.ink1,
    flex: 1,
  },
  statusBadge: {
    backgroundColor: C.accentSoft,
    paddingHorizontal: S.md,
    paddingVertical: 5,
    borderRadius: R.full,
  },
  statusText: {
    color: C.accent,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  consultationDetails: {
    gap: S.sm,
  },
  detailRow: {
    flexDirection: 'row',
  },
  detailLabel: {
    fontSize: 14,
    color: C.ink3,
    fontWeight: '400' as const,
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: C.ink1,
    flex: 1,
  },
  noConsultationsCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: S.xl2,
    alignItems: 'center',
    ...shadow.soft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
  },
  noConsultationsText: {
    fontSize: 14,
    color: C.ink3,
    textAlign: 'center',
  },
  tapToManageText: {
    marginTop: S.sm,
    fontSize: 13,
    color: C.accentMid,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: C.scrim,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.xxl,
    borderTopRightRadius: R.xxl,
    maxHeight: '80%',
    paddingBottom: S.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: S.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: C.ink1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: C.ink3,
  },
  modalBody: {
    padding: S.xl,
  },
  modalSection: {
    marginBottom: S.xl,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: C.ink4,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  modalValue: {
    fontSize: 16,
    color: C.ink1,
    lineHeight: 24,
  },
  modalStatusContainer: {
    flexDirection: 'row',
  },
  modalStatusBadge: {
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
    borderRadius: R.full,
  },
  modalStatusText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  modalActions: {
    marginTop: S.xl,
    gap: S.md,
  },
  modalActionButton: {
    backgroundColor: C.accent,
    paddingVertical: 16,
    borderRadius: R.lg,
    alignItems: 'center',
    ...shadow.card,
  },
  modalActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  cancelButton: {
    backgroundColor: C.surfaceAlt,
  },
  cancelButtonText: {
    color: C.ink2,
  },
  missedNotice: {
    backgroundColor: C.warmLight,
    padding: S.lg,
    borderRadius: R.lg,
    marginTop: S.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.warm + '30',
  },
  missedNoticeText: {
    fontSize: 14,
    color: C.ink2,
    lineHeight: 20,
  },
});
