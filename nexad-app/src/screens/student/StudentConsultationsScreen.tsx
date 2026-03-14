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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { useAuth } from '../../contexts/AuthContext';
import { consultationService } from '../../services/consultationService';
import { profileService } from '../../services/profileService';
import type { ConsultationRequest } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { C, T, S, R, shadow } from '../../config/theme';

interface ConsultationWithTeacher extends ConsultationRequest {
  teacherName: string;
}

interface MarkedDates {
  [date: string]: {
    marked: boolean;
    dotColor: string;
    selected?: boolean;
    selectedColor?: string;
  };
}

export default function StudentConsultationsScreen({ navigation, route }: any) {
  const [allConsultations, setAllConsultations] = useState<ConsultationWithTeacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [consultationTab, setConsultationTab] = useState<'upcoming' | 'all' | 'missed'>('upcoming');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  
  const authContext = useAuth();
  const userId = authContext.user?.user_id;

  const loadConsultations = async () => {
    if (!userId) return;

    try {
      // Get all consultations for this student
      const allConsultationsResult = await consultationService.getStudentRequests(userId, 1, 1000);
      const allData = allConsultationsResult.data?.data || [];
      
      // Load teacher names for each consultation
      const consultationsWithNames = await Promise.all(
        allData.map(async (consultation: ConsultationRequest) => {
          try {
            const profileResponse = await profileService.getTeacherProfile(consultation.teacher_id);
            const profile = profileResponse.data;
            return {
              ...consultation,
              teacherName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Teacher',
            };
          } catch (error) {
            console.error('Error loading teacher profile:', error);
            return {
              ...consultation,
              teacherName: 'Unknown Teacher',
            };
          }
        })
      );

      setAllConsultations(consultationsWithNames);
      
      // Mark dates on calendar (only for approved)
      const approved = consultationsWithNames.filter((c: ConsultationWithTeacher) => c.status === 'accepted');
      const marks: MarkedDates = {};
      const now = new Date();
      approved.forEach((consultation: ConsultationWithTeacher) => {
        if (consultation.scheduled_start_time) {
          const date = consultation.scheduled_start_time.split('T')[0];
          const isMissed =
            !!consultation.scheduled_end_time &&
            new Date(consultation.scheduled_end_time) < now;
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

  const applyFilter = (_data: ConsultationWithTeacher[], _status: string) => {
    // filter is now handled by consultationTab in the accordion section
  };

  const checkIfMissed = (c: ConsultationWithTeacher): boolean => {
    if (!c.scheduled_end_time) return false;
    return new Date(c.scheduled_end_time) < new Date() && c.status === 'accepted';
  };

  useEffect(() => {
    loadConsultations();
  }, [userId]);

  useEffect(() => {
    // No-op: kept for backward compat
  }, [consultationTab]);

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

  const selectedDateConsultations = selectedDate
    ? allConsultations.filter(c => {
        if (!c.scheduled_start_time) return false;
        return c.scheduled_start_time.split('T')[0] === selectedDate;
      })
    : [];

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={18} color={C.ink2} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Consultations</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}>
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
              backgroundColor: 'rgba(32, 33, 36, 0.25)', // Darker background for whole calendar
              calendarBackground: 'rgba(32, 33, 36, 0.25)', // Darker background for whole calendar
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
            <Text style={styles.selectedDateTitle}>{formatDate(selectedDate)}</Text>
            {selectedDateConsultations.length > 0 ? (
              selectedDateConsultations.map((c) => {
                const missed = checkIfMissed(c);
                return (
                  <View key={c.id} style={styles.consultationCard}>
                    <View style={styles.consultationHeader}>
                      <Text style={styles.teacherName}>{c.teacherName}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: missed ? '#FEE2E2' : C.surfaceAlt }]}>
                        <Text style={[styles.statusText, { color: missed ? '#DC2626' : C.ink2 }]}>
                          {missed ? 'Missed' : c.status === 'accepted' ? 'Scheduled' : c.status === 'pending' ? 'Pending' : c.status}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.consultationDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Time:</Text>
                        <Text style={styles.detailValue}>
                          {formatTime(c.scheduled_start_time || '')} – {formatTime(c.scheduled_end_time || '')}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Subject:</Text>
                        <Text style={styles.detailValue}>{c.subject_line}</Text>
                      </View>
                      {c.description ? (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Description:</Text>
                          <Text style={styles.detailValue} numberOfLines={2}>{c.description}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.noConsultationsCard}>
                <Text style={styles.noConsultationsText}>No consultations on this date</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noSelectionContainer}>
            <Text style={styles.noSelectionText}>Select a date to view consultations</Text>
          </View>
        )}

        {/* Consultations List — Tabs + Accordion */}
        <View style={styles.allConsultationsSection}>
          {/* Tab Bar */}
          <View style={styles.tabRow}>
            {(['upcoming', 'all', 'missed'] as const).map((tab) => {
              const label = tab === 'upcoming' ? 'Upcoming' : tab === 'all' ? 'All' : 'Missed';
              const count =
                tab === 'upcoming'
                  ? allConsultations.filter(c => c.status === 'accepted' && c.scheduled_start_time && new Date(c.scheduled_start_time) >= new Date() && !checkIfMissed(c)).length
                  : tab === 'missed'
                  ? allConsultations.filter(c => checkIfMissed(c)).length
                  : allConsultations.filter(c => {
                      const missed = checkIfMissed(c);
                      const upcoming = c.status === 'accepted' && !!c.scheduled_start_time && new Date(c.scheduled_start_time) >= new Date() && !missed;
                      return upcoming || missed;
                    }).length;
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

          <Text style={[styles.sectionTitle, { marginBottom: S.md }]}>
            {consultationTab === 'upcoming' ? 'Upcoming Consultations' : consultationTab === 'missed' ? 'Missed Consultations' : 'All Consultations'}
          </Text>

          {/* Expandable Cards */}
          {(() => {
            const filtered =
              consultationTab === 'upcoming'
                ? allConsultations
                    .filter(c => c.status === 'accepted' && c.scheduled_start_time && new Date(c.scheduled_start_time) >= new Date() && !checkIfMissed(c))
                    .sort((a, b) => new Date(a.scheduled_start_time || 0).getTime() - new Date(b.scheduled_start_time || 0).getTime())
                : consultationTab === 'missed'
                ? allConsultations
                    .filter(c => checkIfMissed(c))
                    .sort((a, b) => new Date(b.scheduled_start_time || 0).getTime() - new Date(a.scheduled_start_time || 0).getTime())
                : allConsultations
                    .filter(c => {
                      const missed = checkIfMissed(c);
                      const upcoming = c.status === 'accepted' && !!c.scheduled_start_time && new Date(c.scheduled_start_time) >= new Date() && !missed;
                      return upcoming || missed;
                    })
                    .sort((a, b) => new Date(b.scheduled_start_time || 0).getTime() - new Date(a.scheduled_start_time || 0).getTime());

            if (filtered.length === 0) {
              return (
                <View style={styles.noConsultationsCard}>
                  <Text style={styles.noConsultationsText}>
                    {consultationTab === 'missed'
                      ? 'No missed consultations'
                      : consultationTab === 'upcoming'
                      ? 'No upcoming consultations'
                      : 'No consultations'}
                  </Text>
                </View>
              );
            }

            return filtered.map((c) => {
              const missed = checkIfMissed(c);
              const isExpanded = expandedCardId === c.id;
              const statusLabel = missed ? 'Missed' : c.status === 'accepted' ? 'Scheduled' : c.status === 'pending' ? 'Pending' : c.status;
              return (
                <View
                  key={c.id}
                  style={[styles.consultationCard, missed && styles.consultationCardMissed]}
                >
                  {/* Tap to expand/collapse */}
                  <TouchableOpacity
                    style={styles.cardHeaderRow}
                    onPress={() => setExpandedCardId(isExpanded ? null : c.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.teacherName}>{c.teacherName}</Text>
                      <Text style={[styles.cardDateLine, missed && { color: '#DC2626' }]}>
                        {formatDate(c.scheduled_start_time || '')} · {formatTime(c.scheduled_start_time || '')}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.statusBadge, { backgroundColor: missed ? '#FEE2E2' : C.surfaceAlt }]}>
                        <Text style={[styles.statusText, { color: missed ? '#DC2626' : C.ink2 }]}>{statusLabel}</Text>
                      </View>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={C.ink3} />
                    </View>
                  </TouchableOpacity>

                  {/* Expanded body */}
                  {isExpanded && (
                    <View style={styles.cardExpandedBody}>
                      <View style={styles.cardExpandDivider} />
                      <View style={styles.consultationDetails}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Subject:</Text>
                          <Text style={styles.detailValue}>{c.subject_line}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Time:</Text>
                          <Text style={styles.detailValue}>
                            {formatTime(c.scheduled_start_time || '')} – {formatTime(c.scheduled_end_time || '')}
                          </Text>
                        </View>
                        {c.description ? (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Description:</Text>
                            <Text style={styles.detailValue}>{c.description}</Text>
                          </View>
                        ) : null}
                        {(c as any).classroom_number ? (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Room:</Text>
                            <Text style={styles.detailValue}>Room {(c as any).classroom_number}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  )}
                </View>
              );
            });
          })()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: 'transparent' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:      { ...T.body, color: C.ink4, marginTop: S.md },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: S.lg, paddingVertical: S.md,
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backButton: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: S.sm, paddingVertical: 6,
  },
  backButtonText: { ...T.body, color: C.ink2 },
  headerTitle:    { ...T.h2 },
  placeholder:    { width: 60 },

  // Calendar
  calendarContainer: {
    backgroundColor: C.surface,
    margin: S.lg, borderRadius: R.lg, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderLight,
    ...shadow.soft,
  },
  legend:     { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: S.lg, marginBottom: S.lg, gap: S.xl },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: S.xs },
  legendDot:  { width: 7, height: 7, borderRadius: 4 },
  legendText: { ...T.tiny },

  // Selected date section
  selectedDateSection:  { paddingHorizontal: S.lg, marginBottom: S.xl },
  selectedDateTitle:    { ...T.h3, marginBottom: S.md },
  noSelectionContainer: { paddingHorizontal: S.lg, paddingVertical: 32, alignItems: 'center' },
  noSelectionText:      { ...T.body, color: C.ink4, textAlign: 'center' },

  // Consultation section
  allConsultationsSection: { paddingHorizontal: S.lg, marginBottom: S.xl },
  sectionTitle:            { ...T.h3 },

  // Tab bar
  tabRow: {
    flexDirection: 'row', gap: S.sm, marginBottom: S.md,
  },
  tabItem: {
    flex: 1, paddingVertical: 9, borderRadius: R.md, alignItems: 'center',
    backgroundColor: C.surfaceAlt,
  },
  tabItemActive:       { backgroundColor: C.action },
  tabItemMissedActive: { backgroundColor: '#DC2626' },
  tabItemText:         { ...T.label, color: C.ink3, fontSize: 11 },
  tabItemTextActive:   { color: C.actionText },

  // Consultation card
  consultationCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg, marginBottom: S.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderLight,
    overflow: 'hidden',
    ...shadow.soft,
  },
  consultationCardMissed: {
    borderColor: '#FCA5A5',
  },
  cardHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: S.lg,
  },
  cardDateLine:    { ...T.small, color: C.ink3, marginTop: 2 },
  cardExpandedBody: { paddingHorizontal: S.lg, paddingBottom: S.lg },
  cardExpandDivider: {
    height: StyleSheet.hairlineWidth, backgroundColor: C.borderLight, marginBottom: S.md,
  },

  consultationHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.md,
  },
  teacherName:         { ...T.h3, flex: 1 },
  statusBadge:         { paddingHorizontal: S.md, paddingVertical: 3, borderRadius: R.full },
  statusText:          { ...T.tiny, fontWeight: '600' as const },
  consultationDetails: { gap: S.sm },
  detailRow:           { flexDirection: 'row' },
  detailLabel:         { ...T.small, color: C.ink4, width: 100 },
  detailValue:         { ...T.small, color: C.ink1, flex: 1 },

  noConsultationsCard: {
    backgroundColor: C.surface, borderRadius: R.lg, padding: S.xl,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderLight,
  },
  noConsultationsText: { ...T.body, color: C.ink4, textAlign: 'center' },
});
