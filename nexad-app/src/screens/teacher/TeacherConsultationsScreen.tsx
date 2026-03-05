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
  const [consultationTab, setConsultationTab] = useState<'all' | 'upcoming' | 'missed'>('upcoming');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  
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
      const now = new Date();
      consultationsWithNames.forEach(consultation => {
        if (consultation.scheduled_start_time) {
          const date = consultation.scheduled_start_time.split('T')[0];
          const isMissed =
            !!consultation.scheduled_end_time &&
            new Date(consultation.scheduled_end_time) < now &&
            consultation.status === 'accepted';
          const existing = marks[date];
          marks[date] = {
            marked: true,
            dotColor: (isMissed || existing?.dotColor === '#DC2626') ? '#DC2626' : C.ink2,
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
            renderArrow={(direction) => (
              <Ionicons
                name={direction === 'left' ? 'chevron-back' : 'chevron-forward'}
                size={20}
                color={C.ink1}
              />
            )}
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
            <Text style={styles.legendText}>Scheduled</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
            <Text style={styles.legendText}>Missed</Text>
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

        {/* Consultations List — Tabs + Accordion */}
        <View style={styles.allConsultationsSection}>
          {/* Tab Bar */}
          <View style={styles.tabRow}>
            {(['upcoming', 'all', 'missed'] as const).map((tab) => {
              const label = tab === 'upcoming' ? 'Upcoming' : tab === 'all' ? 'All' : 'Missed';
              const count = tab === 'upcoming'
                ? consultations.filter(c => c.scheduled_start_time && new Date(c.scheduled_start_time) >= new Date() && !checkIfMissed(c)).length
                : tab === 'missed'
                ? consultations.filter(c => checkIfMissed(c)).length
                : consultations.length;
              const isActive = consultationTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabItem, isActive && styles.tabItemActive, tab === 'missed' && isActive && styles.tabItemMissedActive]}
                  onPress={() => { setConsultationTab(tab); setExpandedCardId(null); }}
                >
                  <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]}>
                    {label} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Accordion Header */}
          <Text style={[styles.sectionTitle, { marginBottom: S.md }]}>
            {consultationTab === 'upcoming' ? 'Upcoming Consultations' : consultationTab === 'missed' ? 'Missed Consultations' : 'All Consultations'}
          </Text>

          {/* Individual Expandable Cards */}
          {(() => {
            const filtered = consultationTab === 'upcoming'
              ? consultations.filter(c => c.scheduled_start_time && new Date(c.scheduled_start_time) >= new Date() && !checkIfMissed(c)).sort((a, b) => new Date(a.scheduled_start_time || 0).getTime() - new Date(b.scheduled_start_time || 0).getTime())
              : consultationTab === 'missed'
              ? consultations.filter(c => checkIfMissed(c)).sort((a, b) => new Date(b.scheduled_start_time || 0).getTime() - new Date(a.scheduled_start_time || 0).getTime())
              : [...consultations].sort((a, b) => new Date(b.scheduled_start_time || 0).getTime() - new Date(a.scheduled_start_time || 0).getTime());

            if (filtered.length === 0) {
              return (
                <View style={styles.noConsultationsCard}>
                  <Text style={styles.noConsultationsText}>
                    {consultationTab === 'missed' ? 'No missed consultations' : consultationTab === 'upcoming' ? 'No upcoming consultations' : 'No consultations'}
                  </Text>
                </View>
              );
            }

            return filtered.map((consultation) => {
              const status = getStatusDisplay(consultation);
              const missed = checkIfMissed(consultation);
              const isExpanded = expandedCardId === consultation.id;
              return (
                <View
                  key={consultation.id}
                  style={[styles.consultationCard, missed && styles.consultationCardMissed]}
                >
                  {/* Card header row — tap to expand/collapse */}
                  <TouchableOpacity
                    style={styles.cardHeaderRow}
                    onPress={() => setExpandedCardId(isExpanded ? null : consultation.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{consultation.studentName}</Text>
                      <Text style={[styles.cardDateLine, missed && { color: '#DC2626' }]}>
                        {formatDate(consultation.scheduled_start_time || '')} · {formatTime(consultation.scheduled_start_time || '')}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.statusBadge, { backgroundColor: missed ? '#FEE2E2' : status.bgColor }]}>
                        <Text style={[styles.statusText, { color: missed ? '#DC2626' : status.color }]}>{status.text}</Text>
                      </View>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={C.ink3} />
                    </View>
                  </TouchableOpacity>

                  {/* Expanded details */}
                  {isExpanded && (
                    <View style={styles.cardExpandedBody}>
                      <View style={styles.cardExpandDivider} />
                      <View style={styles.consultationDetails}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Subject:</Text>
                          <Text style={styles.detailValue}>{consultation.subject_line}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Time:</Text>
                          <Text style={styles.detailValue}>
                            {formatTime(consultation.scheduled_start_time || '')} – {formatTime(consultation.scheduled_end_time || '')}
                          </Text>
                        </View>
                        {consultation.description && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Description:</Text>
                            <Text style={styles.detailValue} numberOfLines={3}>{consultation.description}</Text>
                          </View>
                        )}
                      </View>
                      {(consultation.status === 'accepted' || missed) && (
                        <View style={styles.cardActions}>
                          <TouchableOpacity
                            style={styles.cardActionBtn}
                            onPress={() => handleMarkAsCompleted(consultation.id)}
                          >
                            <Ionicons name="checkmark" size={15} color="#fff" />
                            <Text style={styles.cardActionBtnText}>Mark Done</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.cardActionBtn, styles.cardActionBtnCancel]}
                            onPress={() => handleMarkAsCancelled(consultation.id)}
                          >
                            <Ionicons name="close" size={15} color={C.ink2} />
                            <Text style={[styles.cardActionBtnText, { color: C.ink2 }]}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {missed && (
                        <View style={[styles.missedNotice, { marginTop: S.md }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                            <Ionicons name="alert-circle-outline" size={15} color={C.ink3} style={{ marginTop: 1 }} />
                            <Text style={[styles.missedNoticeText, { flex: 1, fontSize: 13 }]}>
                              This consultation has passed its scheduled time. Update its status above.
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            });
          })()}
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
            {selectedConsultation && (() => {
              const missed = checkIfMissed(selectedConsultation);
              const headerBg = missed ? '#7F1D1D' : '#1C1C1C';
              const headerDecor = missed ? '#991B1B' : '#2E2E2E';
              const status = getStatusDisplay(selectedConsultation);
              return (
                <>
                  {/* Dark header band */}
                  <View style={[styles.dmHeader, { backgroundColor: headerBg }]}>
                    <View style={[styles.dmHeaderDecor, { backgroundColor: headerDecor }]} />
                    <View style={[styles.dmHeaderDecor2, { backgroundColor: headerDecor }]} />
                    <TouchableOpacity style={styles.dmCloseBtn} onPress={() => setShowDetailModal(false)}>
                      <Ionicons name="close" size={18} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                    <View style={styles.dmAvatarWrap}>
                      <Text style={styles.dmAvatarText}>{selectedConsultation.studentName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.dmName}>{selectedConsultation.studentName}</Text>
                    <Text style={styles.dmSubject} numberOfLines={2}>{selectedConsultation.subject_line}</Text>
                    <View style={[styles.dmStatusPill, missed && styles.dmStatusPillMissed]}>
                      <View style={[styles.dmStatusDot, missed && { backgroundColor: '#FCA5A5' }]} />
                      <Text style={styles.dmStatusPillText}>{status.text}</Text>
                    </View>
                  </View>

                  {/* Body */}
                  <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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
                          <Text style={styles.dmInfoValue}>{formatDate(selectedConsultation.scheduled_start_time || '')}</Text>
                        </View>
                      </View>
                      <View style={styles.dmInfoDivider} />
                      <View style={styles.dmInfoRow}>
                        <View style={styles.dmIconBox}><Ionicons name="time-outline" size={16} color={C.ink2} /></View>
                        <View style={styles.dmInfoContent}>
                          <Text style={styles.dmInfoLabel}>Time</Text>
                          <Text style={styles.dmInfoValue}>
                            {formatTime(selectedConsultation.scheduled_start_time || '')} — {formatTime(selectedConsultation.scheduled_end_time || '')}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {(selectedConsultation.status === 'accepted' || missed) && (
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
                            <Ionicons name="close" size={18} color={C.ink2} />
                            <Text style={[styles.modalActionButtonText, styles.cancelButtonText]}>Cancel Consultation</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    )}

                    {missed && (
                      <View style={styles.missedNotice}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                          <Ionicons name="alert-circle-outline" size={18} color={C.ink3} style={{ marginTop: 1 }} />
                          <Text style={[styles.missedNoticeText, { flex: 1 }]}>
                            This consultation was not marked as completed or cancelled and has passed its scheduled time. You can still update its status.
                          </Text>
                        </View>
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
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    backgroundColor: 'transparent',
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
  tabRow: {
    flexDirection: 'row',
    gap: S.sm,
    marginBottom: S.md,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: R.sm,
    alignItems: 'center',
    backgroundColor: C.surfaceAlt,
  },
  tabItemActive: {
    backgroundColor: C.action,
  },
  tabItemMissedActive: {
    backgroundColor: '#DC2626',
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: C.ink3,
  },
  tabItemTextActive: {
    color: '#fff',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: S.md,
    paddingVertical: S.xs,
  },
  consultationCardMissed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: C.ink1,
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
    maxHeight: '85%',
    paddingBottom: S.xl,
    overflow: 'hidden' as const,
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
  // ─── Dark-header modal styles (matching StudentDashboard) ───────────────────
  dmHeader: { padding: S.xl, paddingTop: S.xl + 8, paddingBottom: S.xl + 4, overflow: 'hidden' as const, position: 'relative' as const, alignItems: 'center' },
  dmHeaderDecor:  { position: 'absolute' as const, width: 160, height: 160, borderRadius: 80, top: -60, right: -40, backgroundColor: 'rgba(255,255,255,0.06)' },
  dmHeaderDecor2: { position: 'absolute' as const, width: 90, height: 90, borderRadius: 45, bottom: -20, left: 20, backgroundColor: 'rgba(255,255,255,0.04)' },
  dmCloseBtn:    { position: 'absolute' as const, top: S.lg, right: S.lg, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  dmAvatarWrap:  { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: S.md },
  dmAvatarText:  { color: '#FFFFFF', fontSize: 24, fontWeight: '700' as const },
  dmName:        { color: '#FFFFFF', fontSize: 17, fontWeight: '700' as const, textAlign: 'center' as const, marginBottom: 3 },
  dmSubject:     { color: 'rgba(255,255,255,0.65)', fontSize: 13, textAlign: 'center' as const, lineHeight: 18, marginBottom: S.md, paddingHorizontal: S.xl },
  dmStatusPill:       { flexDirection: 'row' as const, alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: R.full },
  dmStatusPillMissed: { backgroundColor: 'rgba(255,255,255,0.22)' },
  dmStatusDot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: '#86EFAC' },
  dmStatusPillText:   { color: '#FFFFFF', fontSize: 12, fontWeight: '600' as const },
  dmInfoCard:     { backgroundColor: C.bg, borderRadius: R.xl, marginBottom: S.md, overflow: 'hidden' as const, borderWidth: 1, borderColor: C.borderLight },
  dmInfoRow:      { flexDirection: 'row' as const, alignItems: 'flex-start', padding: S.lg, gap: S.md },
  dmIconBox:      { width: 34, height: 34, borderRadius: R.md, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.borderLight },
  dmInfoContent:  { flex: 1 },
  dmInfoLabel:    { fontSize: 11, fontWeight: '600' as const, color: C.ink4, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 3 },
  dmInfoValue:    { fontSize: 15, color: C.ink1, lineHeight: 22 },
  dmInfoDivider:  { height: 1, backgroundColor: C.borderLight, marginLeft: 50 },
  // ─── Individual card expansion ───────────────────────────────────────────────
  cardHeaderRow:     { flexDirection: 'row' as const, alignItems: 'center', justifyContent: 'space-between' },
  cardDateLine:      { fontSize: 12, color: C.ink3, marginTop: 3, fontWeight: '400' as const },
  cardExpandedBody:  { marginTop: S.md },
  cardExpandDivider: { height: 1, backgroundColor: C.borderLight, marginBottom: S.md },
  cardActions:       { flexDirection: 'row' as const, gap: S.sm, marginTop: S.md },
  cardActionBtn:     { flex: 1, flexDirection: 'row' as const, alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: C.action, paddingVertical: 11, borderRadius: R.md },
  cardActionBtnCancel: { backgroundColor: C.surfaceAlt },
  cardActionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' as const },
});
