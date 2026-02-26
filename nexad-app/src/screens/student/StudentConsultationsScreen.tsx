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
import { C, F, T, S, R, shared, shadow } from '../../config/theme';

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
  const initialFilter = (route?.params?.initialFilter as 'all' | 'approved' | 'pending') || 'all';
  const [consultations, setConsultations] = useState<ConsultationWithTeacher[]>([]);
  const [allConsultations, setAllConsultations] = useState<ConsultationWithTeacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>(initialFilter);
  
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
      applyFilter(consultationsWithNames, filterStatus);
      
      // Mark dates on calendar (only for approved)
      const approved = consultationsWithNames.filter((c: ConsultationWithTeacher) => c.status === 'accepted');
      const marks: MarkedDates = {};
      approved.forEach((consultation: ConsultationWithTeacher) => {
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

  const applyFilter = (data: ConsultationWithTeacher[], status: 'all' | 'approved' | 'pending') => {
    let filtered = data;
    if (status === 'approved') {
      filtered = data.filter(c => c.status === 'accepted');
    } else if (status === 'pending') {
      filtered = data.filter(c => c.status === 'pending' || c.status === 'awaiting_teacher');
    }
    setConsultations(filtered);
  };

  useEffect(() => {
    loadConsultations();
  }, [userId]);

  useEffect(() => {
    applyFilter(allConsultations, filterStatus);
  }, [filterStatus]);

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
          <Ionicons name="chevron-back" size={20} color={C.ink1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Consultations</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'all' && styles.filterTabActive]}
          onPress={() => setFilterStatus('all')}
        >
          <Text style={[styles.filterTabText, filterStatus === 'all' && styles.filterTabTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'approved' && styles.filterTabActive]}
          onPress={() => setFilterStatus('approved')}
        >
          <Text style={[styles.filterTabText, filterStatus === 'approved' && styles.filterTabTextActive]}>Approved</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'pending' && styles.filterTabActive]}
          onPress={() => setFilterStatus('pending')}
        >
          <Text style={[styles.filterTabText, filterStatus === 'pending' && styles.filterTabTextActive]}>Pending</Text>
        </TouchableOpacity>
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
              selectedDayBackgroundColor: C.ink2,
              selectedDayTextColor: C.actionText,
              todayTextColor: C.ink2,
              dayTextColor: C.ink1,
              textDisabledColor: C.ink5,
              dotColor: C.ink2,
              selectedDotColor: C.actionText,
              arrowColor: C.ink2,
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
              selectedDateConsultations.map((consultation) => (
                <View key={consultation.id} style={styles.consultationCard}>
                  <View style={styles.consultationHeader}>
                    <Text style={styles.teacherName}>{consultation.teacherName}</Text>
                    <View style={[styles.statusBadge, getStatusBadgeStyle(consultation.status)]}>
                      <Text style={[styles.statusText, getStatusTextStyle(consultation.status)]}>
                        {consultation.status === 'accepted' ? 'Approved' : consultation.status === 'pending' ? 'Pending' : consultation.status}
                      </Text>
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
                        <Text style={styles.detailValue}>{consultation.description}</Text>
                      </View>
                    )}
                    {(consultation as any).classroom_number ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Room:</Text>
                        <Text style={styles.detailValue}>{(consultation as any).classroom_number}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))
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
              .map((consultation) => (
                <View key={consultation.id} style={styles.consultationCard}>
                  <View style={styles.consultationHeader}>
                    <Text style={styles.teacherName}>{consultation.teacherName}</Text>
                    <View style={[styles.statusBadge, getStatusBadgeStyle(consultation.status)]}>
                      <Text style={[styles.statusText, getStatusTextStyle(consultation.status)]}>
                        {consultation.status === 'accepted' ? 'Approved' : consultation.status === 'pending' ? 'Pending' : consultation.status}
                      </Text>
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
                        <Text style={styles.detailValue}>{consultation.description}</Text>
                      </View>
                    )}
                    {(consultation as any).classroom_number ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Room:</Text>
                        <Text style={styles.detailValue}>{(consultation as any).classroom_number}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))
          ) : (
            <View style={styles.noConsultationsCard}>
              <Text style={styles.noConsultationsText}>
                No upcoming consultations
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case 'accepted':
      return { backgroundColor: C.surfaceAlt };
    case 'pending':
    case 'awaiting_teacher':
      return { backgroundColor: C.surfaceAlt };
    case 'declined':
      return { backgroundColor: C.surfaceAlt };
    default:
      return { backgroundColor: C.surfaceAlt };
  }
};

const getStatusTextStyle = (status: string) => {
  switch (status) {
    case 'accepted':
      return { color: C.ink2 };
    case 'pending':
    case 'awaiting_teacher':
      return { color: C.ink3 };
    case 'declined':
      return { color: C.ink3 };
    default:
      return { color: C.ink3 };
  }
};

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: C.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:      { ...T.body, color: C.ink4, marginTop: S.md },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: S.lg, paddingVertical: S.md,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    ...shadow.soft,
  },
  headerTitle:  { ...T.h2 },
  placeholder:  { width: 60 },

  // Filter
  filterContainer: {
    flexDirection: 'row', backgroundColor: C.surface,
    paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm, gap: S.sm,
  },
  filterTab:           { flex: 1, paddingVertical: 9, borderRadius: R.md, alignItems: 'center', backgroundColor: C.surfaceAlt },
  filterTabActive:     { backgroundColor: C.action },
  filterTabText:       { ...T.label, color: C.ink3 },
  filterTabTextActive: { ...T.label, color: C.actionText },

  // Calendar
  calendarContainer: {
    backgroundColor: C.surface,
    margin: S.lg, borderRadius: R.lg, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderLight,
    ...shadow.soft,
  },
  legend:      { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: S.lg, marginBottom: S.lg },
  legendItem:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: S.sm },
  legendDot:   { width: 7, height: 7, borderRadius: 4, marginRight: S.xs, backgroundColor: C.ink2 },
  legendText:  { ...T.tiny },

  // Selected date section
  selectedDateSection: { paddingHorizontal: S.lg, marginBottom: S.xl },
  selectedDateTitle:   { ...T.h3, marginBottom: S.md },

  noSelectionContainer: { paddingHorizontal: S.lg, paddingVertical: 32, alignItems: 'center' },
  noSelectionText:      { ...T.body, color: C.ink4, textAlign: 'center' },

  allConsultationsSection: { paddingHorizontal: S.lg, marginBottom: S.xl },
  sectionTitle:            { ...T.h3, marginBottom: S.md },

  // Consultation card
  consultationCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg, padding: S.lg, marginBottom: S.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderLight,
    ...shadow.soft,
  },
  consultationHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.md,
  },
  teacherName: { ...T.h3, flex: 1 },
  statusBadge: {
    backgroundColor: C.accent,
    paddingHorizontal: S.md, paddingVertical: 3,
    borderRadius: R.full,
  },
  statusText:          { color: C.actionText, ...T.tiny, fontWeight: '600' as const },
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
