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

export default function StudentConsultationsScreen({ navigation }: any) {
  const [consultations, setConsultations] = useState<ConsultationWithTeacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  
  const authContext = useAuth();
  const userId = authContext.user?.user_id;

  const loadConsultations = async () => {
    if (!userId) return;

    try {
      // Get all approved consultations for this student
      const allConsultationsResult = await consultationService.getStudentRequests(userId, 1, 1000);
      const allConsultations = allConsultationsResult.data?.data || [];
      const approved = allConsultations.filter((c: ConsultationRequest) => c.status === 'accepted');
      
      // Load teacher names for each consultation
      const consultationsWithNames = await Promise.all(
        approved.map(async (consultation: ConsultationRequest) => {
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

      setConsultations(consultationsWithNames);
      
      // Mark dates on calendar
      const marks: MarkedDates = {};
      consultationsWithNames.forEach((consultation: ConsultationWithTeacher) => {
        if (consultation.scheduled_start_time) {
          const date = consultation.scheduled_start_time.split('T')[0];
          marks[date] = {
            marked: true,
            dotColor: '#3b82f6',
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
        selectedColor: key === date ? '#3b82f6' : undefined,
      };
    });
    
    // If the selected date isn't marked, add it
    if (!updatedMarks[date]) {
      updatedMarks[date] = {
        marked: false,
        dotColor: '#3b82f6',
        selected: true,
        selectedColor: '#3b82f6',
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
          <ActivityIndicator size="large" color="#3b82f6" />
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
          <Text style={styles.backButtonText}>← Back</Text>
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
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
          />
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
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
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>Approved</Text>
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
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>Approved</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  placeholder: {
    width: 60,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  selectedDateSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  noSelectionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 32,
    alignItems: 'center',
  },
  noSelectionText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  allConsultationsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  consultationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  consultationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '600',
  },
  consultationDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  noConsultationsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  noConsultationsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
