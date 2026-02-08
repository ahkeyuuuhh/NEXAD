import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { consultationService } from '../../services/consultationService';
import { profileService } from '../../services/profileService';
import type { ConsultationRequest } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

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

export default function RequestApprovalScreen({ navigation, route }: any) {
  const { request } = route.params as { request: ConsultationRequest };
  const authContext = useAuth();
  const userId = authContext.user?.user_id;

  const [studentName, setStudentName] = useState('Loading...');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startHour, setStartHour] = useState(13);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(14);
  const [endMinute, setEndMinute] = useState(0);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStudent, setIsLoadingStudent] = useState(true);
  const [existingConsultations, setExistingConsultations] = useState<ConsultationWithStudent[]>([]);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [isLoadingConsultations, setIsLoadingConsultations] = useState(true);

  useEffect(() => {
    loadStudentProfile();
    loadExistingConsultations();
  }, []);

  const loadExistingConsultations = async () => {
    if (!userId) return;
    try {
      const approved = await consultationService.getApprovedConsultations(userId);
      
      // Load student names
      const consultationsWithNames = await Promise.all(
        approved.map(async (consultation) => {
          try {
            const profileResponse = await profileService.getStudentProfile(consultation.student_id);
            const profile = profileResponse.data;
            return {
              ...consultation,
              studentName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
            };
          } catch (error) {
            return {
              ...consultation,
              studentName: 'Unknown',
            };
          }
        })
      );

      setExistingConsultations(consultationsWithNames);
      
      // Mark dates on calendar
      const marks: MarkedDates = {};
      consultationsWithNames.forEach(consultation => {
        if (consultation.scheduled_start_time) {
          const date = consultation.scheduled_start_time.split('T')[0];
          marks[date] = {
            marked: true,
            dotColor: '#ef4444',
          };
        }
      });
      setMarkedDates(marks);
    } catch (error) {
      console.error('Error loading consultations:', error);
    } finally {
      setIsLoadingConsultations(false);
    }
  };

  const loadStudentProfile = async () => {
    try {
      const result = await profileService.getStudentProfile(request.student_id);
      if (result.data) {
        setStudentName(`${result.data.first_name} ${result.data.last_name}`);
      } else {
        setStudentName('Student Name');
      }
    } catch (error) {
      console.error('Error loading student profile:', error);
      setStudentName('Student Name');
    } finally {
      setIsLoadingStudent(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const validateDateTime = () => {
    // Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selDate = new Date(selectedDate);
    selDate.setHours(0, 0, 0, 0);
    
    if (selDate < today) {
      Alert.alert('Invalid Date', 'Please select a future date');
      return false;
    }

    // Validate end time is after start time
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    if (endMinutes <= startMinutes) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return false;
    }

    // Check for conflicts with existing consultations
    const dateStr = selectedDate.toISOString().split('T')[0];
    const consultationsOnDate = existingConsultations.filter(c => {
      if (!c.scheduled_start_time) return false;
      return c.scheduled_start_time.split('T')[0] === dateStr;
    });

    const newStart = new Date(selectedDate);
    newStart.setHours(startHour, startMinute, 0, 0);
    const newEnd = new Date(selectedDate);
    newEnd.setHours(endHour, endMinute, 0, 0);

    for (const consultation of consultationsOnDate) {
      const existingStart = new Date(consultation.scheduled_start_time!);
      const existingEnd = new Date(consultation.scheduled_end_time!);
      
      // Check for overlap
      if ((newStart >= existingStart && newStart < existingEnd) ||
          (newEnd > existingStart && newEnd <= existingEnd) ||
          (newStart <= existingStart && newEnd >= existingEnd)) {
        Alert.alert(
          'Time Conflict',
          `This time slot conflicts with an existing consultation with ${consultation.studentName} at ${formatTime(consultation.scheduled_start_time!)}`
        );
        return false;
      }
    }

    return true;
  };

  const handleApprove = async () => {
    if (!validateDateTime()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine date and time into proper ISO strings
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(startHour, startMinute, 0, 0);
      const endDateTime = new Date(selectedDate);
      endDateTime.setHours(endHour, endMinute, 0, 0);

      const result = await consultationService.scheduleConsultation(
        request.id,
        startDateTime.toISOString(),
        endDateTime.toISOString()
      );

      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      Alert.alert(
        'Request Approved',
        'The consultation request has been approved and scheduled.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error approving request:', error);
      Alert.alert('Error', 'Failed to approve consultation request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this consultation request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const result = await consultationService.updateStatus(request.id, 'declined');

              if (result.error) {
                Alert.alert('Error', result.error);
                return;
              }

              Alert.alert(
                'Request Declined',
                'The consultation request has been declined.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error: any) {
              console.error('Error declining request:', error);
              Alert.alert('Error', 'Failed to decline request');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Request Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Requests</Text>

          <View style={styles.studentCard}>
            <View style={styles.studentAvatar}>
              <Text style={styles.avatarText}>
                {studentName[0] || 'S'}
              </Text>
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>
                {isLoadingStudent ? 'Loading...' : studentName}
              </Text>
              <Text style={styles.requestSubject} numberOfLines={3}>
                {request.subject_line}
              </Text>
              <Text style={styles.requestDescription}>
                {request.description}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Submitted:</Text>
                <Text style={styles.metaValue}>{formatDate(request.submitted_at)}</Text>
              </View>
              {request.urgency === 'urgent' && (
                <View style={styles.urgentBadge}>
                  <Text style={styles.urgentText}>URGENT</Text>
                </View>
              )}
              {request.preferred_time_slots && request.preferred_time_slots.length > 0 && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Preferred Time:</Text>
                  <Text style={styles.metaValue}>
                    {formatDate(request.preferred_time_slots[0].start)} at{' '}
                    {formatTime(request.preferred_time_slots[0].start)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Calendar Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Schedule - Available Times</Text>
          <Text style={styles.calendarSubtext}>Red dots indicate existing consultations</Text>
          
          {isLoadingConsultations ? (
            <ActivityIndicator size="large" color="#3b82f6" style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.calendarContainer}>
              <Calendar
                markedDates={{
                  ...markedDates,
                  [selectedDate.toISOString().split('T')[0]]: {
                    ...markedDates[selectedDate.toISOString().split('T')[0]],
                    selected: true,
                    selectedColor: '#3b82f6',
                  },
                }}
                onDayPress={(day: DateData) => {
                  setSelectedDate(new Date(day.dateString));
                }}
                minDate={new Date().toISOString().split('T')[0]}
                theme={{
                  backgroundColor: '#ffffff',
                  calendarBackground: '#ffffff',
                  textSectionTitleColor: '#1f2937',
                  selectedDayBackgroundColor: '#3b82f6',
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: '#3b82f6',
                  dayTextColor: '#1f2937',
                  textDisabledColor: '#d1d5db',
                  dotColor: '#ef4444',
                  selectedDotColor: '#ffffff',
                  arrowColor: '#3b82f6',
                  monthTextColor: '#1f2937',
                  textMonthFontWeight: 'bold',
                }}
              />
            </View>
          )}

          {/* Show consultations for selected date */}
          {existingConsultations.filter(c => 
            c.scheduled_start_time?.split('T')[0] === selectedDate.toISOString().split('T')[0]
          ).length > 0 && (
            <View style={styles.existingConsultations}>
              <Text style={styles.existingTitle}>Consultations on this date:</Text>
              {existingConsultations
                .filter(c => c.scheduled_start_time?.split('T')[0] === selectedDate.toISOString().split('T')[0])
                .map(consultation => (
                  <View key={consultation.id} style={styles.existingItem}>
                    <Text style={styles.existingTime}>
                      {formatTime(consultation.scheduled_start_time!)} - {formatTime(consultation.scheduled_end_time!)}
                    </Text>
                    <Text style={styles.existingStudent}>{consultation.studentName}</Text>
                  </View>
                ))
              }
            </View>
          )}
        </View>

        {/* Date and Time Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule Consultation</Text>

          {/* Show Selected Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Selected Date *</Text>
            <View style={styles.pickerButton}>
              <Text style={styles.pickerButtonText}>
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              <Text style={styles.pickerIcon}>📅</Text>
            </View>
            <Text style={styles.helperText}>Tap a date on the calendar above to change</Text>
          </View>

          {/* Time Pickers */}
          <View style={styles.timeRow}>
            <View style={[styles.inputGroup, styles.timeInput]}>
              <Text style={styles.inputLabel}>Start Time *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Text style={styles.pickerButtonText}>
                  {`${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`}
                </Text>
                <Text style={styles.pickerIcon}>🕐</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, styles.timeInput]}>
              <Text style={styles.inputLabel}>End Time *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Text style={styles.pickerButtonText}>
                  {`${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`}
                </Text>
                <Text style={styles.pickerIcon}>🕐</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Custom Time Picker Modals */}
          <Modal
            visible={showStartTimePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowStartTimePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.timePickerModal}>
                <Text style={styles.timePickerTitle}>Select Start Time</Text>
                <View style={styles.timePickerRow}>
                  <View style={styles.timePickerColumn}>
                    <Text style={styles.timePickerLabel}>Hour</Text>
                    <ScrollView style={styles.timePickerScroll}>
                      {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                        <TouchableOpacity
                          key={hour}
                          style={[
                            styles.timePickerOption,
                            startHour === hour && styles.timePickerOptionSelected
                          ]}
                          onPress={() => setStartHour(hour)}
                        >
                          <Text style={[
                            styles.timePickerOptionText,
                            startHour === hour && styles.timePickerOptionTextSelected
                          ]}>
                            {hour.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <View style={styles.timePickerColumn}>
                    <Text style={styles.timePickerLabel}>Minute</Text>
                    <ScrollView style={styles.timePickerScroll}>
                      {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                        <TouchableOpacity
                          key={minute}
                          style={[
                            styles.timePickerOption,
                            startMinute === minute && styles.timePickerOptionSelected
                          ]}
                          onPress={() => setStartMinute(minute)}
                        >
                          <Text style={[
                            styles.timePickerOptionText,
                            startMinute === minute && styles.timePickerOptionTextSelected
                          ]}>
                            {minute.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.timePickerDoneButton}
                  onPress={() => setShowStartTimePicker(false)}
                >
                  <Text style={styles.timePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            visible={showEndTimePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowEndTimePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.timePickerModal}>
                <Text style={styles.timePickerTitle}>Select End Time</Text>
                <View style={styles.timePickerRow}>
                  <View style={styles.timePickerColumn}>
                    <Text style={styles.timePickerLabel}>Hour</Text>
                    <ScrollView style={styles.timePickerScroll}>
                      {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                        <TouchableOpacity
                          key={hour}
                          style={[
                            styles.timePickerOption,
                            endHour === hour && styles.timePickerOptionSelected
                          ]}
                          onPress={() => setEndHour(hour)}
                        >
                          <Text style={[
                            styles.timePickerOptionText,
                            endHour === hour && styles.timePickerOptionTextSelected
                          ]}>
                            {hour.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <View style={styles.timePickerColumn}>
                    <Text style={styles.timePickerLabel}>Minute</Text>
                    <ScrollView style={styles.timePickerScroll}>
                      {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                        <TouchableOpacity
                          key={minute}
                          style={[
                            styles.timePickerOption,
                            endMinute === minute && styles.timePickerOptionSelected
                          ]}
                          onPress={() => setEndMinute(minute)}
                        >
                          <Text style={[
                            styles.timePickerOptionText,
                            endMinute === minute && styles.timePickerOptionTextSelected
                          ]}>
                            {minute.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.timePickerDoneButton}
                  onPress={() => setShowEndTimePicker(false)}
                >
                  <Text style={styles.timePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Text style={styles.timeNote}>
            ⚠️ System will check for conflicts with existing consultations
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.approveButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleApprove}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.approveButtonText}>✓ Approve & Schedule</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.declineButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleDecline}
              disabled={isSubmitting}
            >
              <Text style={styles.declineButtonText}>✕ Decline Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    fontSize: 24,
    color: '#2563eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  studentCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  studentAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  requestSubject: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  requestDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 6,
  },
  metaValue: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  urgentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
  },
  urgentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
  },
  existingConsultations: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  existingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  existingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  existingTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  existingStudent: {
    fontSize: 12,
    color: '#92400e',
  },
  calendarPlaceholder: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  calendarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  calendarSubtext: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  pickerButton: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  pickerIcon: {
    fontSize: 20,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInput: {
    flex: 1,
  },
  timeNote: {
    fontSize: 12,
    color: '#92400e',
    fontStyle: 'italic',
    marginTop: 8,
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 6,
  },
  actionSection: {
    gap: 12,
  },
  approveButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  timePickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  timePickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  timePickerRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  timePickerColumn: {
    flex: 1,
  },
  timePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 10,
    textAlign: 'center',
  },
  timePickerScroll: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
  },
  timePickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  timePickerOptionSelected: {
    backgroundColor: '#dbeafe',
  },
  timePickerOptionText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
  timePickerOptionTextSelected: {
    color: '#1e40af',
    fontWeight: '700',
  },
  timePickerDoneButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  timePickerDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
    fontStyle: 'italic',
  },
});
