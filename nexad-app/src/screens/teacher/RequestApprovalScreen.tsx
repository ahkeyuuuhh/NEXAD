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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { consultationService } from '../../services/consultationService';
import { profileService } from '../../services/profileService';
import type { ConsultationRequest } from '../../types';

export default function RequestApprovalScreen({ navigation, route }: any) {
  const { request } = route.params as { request: ConsultationRequest };

  const [studentName, setStudentName] = useState('Loading...');
  const [selectedDate, setSelectedDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStudent, setIsLoadingStudent] = useState(true);

  useEffect(() => {
    loadStudentProfile();
    // Set default date to today
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
    // Set default times
    setStartTime('13:00');
    setEndTime('14:00');
  }, []);

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
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(selectedDate)) {
      Alert.alert('Invalid Date', 'Please enter date in YYYY-MM-DD format (e.g., 2026-02-15)');
      return false;
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime)) {
      Alert.alert('Invalid Start Time', 'Please enter time in HH:MM format (e.g., 13:00)');
      return false;
    }
    if (!timeRegex.test(endTime)) {
      Alert.alert('Invalid End Time', 'Please enter time in HH:MM format (e.g., 14:00)');
      return false;
    }

    // Validate date is not in the past
    const selectedDateTime = new Date(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDateTime < today) {
      Alert.alert('Invalid Date', 'Please select a future date');
      return false;
    }

    // Validate end time is after start time
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (endMinutes <= startMinutes) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return false;
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
      const startDateTime = `${selectedDate}T${startTime}:00.000Z`;
      const endDateTime = `${selectedDate}T${endTime}:00.000Z`;

      const result = await consultationService.scheduleConsultation(
        request.id,
        startDateTime,
        endDateTime
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
          <Text style={styles.sectionTitle}>Calendar View of Available Date and Time</Text>

          <View style={styles.calendarPlaceholder}>
            <Text style={styles.calendarIcon}>📅</Text>
            <Text style={styles.calendarText}>Select date and time below</Text>
            <Text style={styles.calendarSubtext}>Enter in the specified format</Text>
          </View>

          {/* Date Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Select Date *</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (e.g., 2026-02-15)"
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholderTextColor="#9ca3af"
              maxLength={10}
            />
          </View>

          {/* Time Inputs */}
          <View style={styles.timeRow}>
            <View style={[styles.inputGroup, styles.timeInput]}>
              <Text style={styles.inputLabel}>Start Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM (e.g., 13:00)"
                value={startTime}
                onChangeText={setStartTime}
                placeholderTextColor="#9ca3af"
                maxLength={5}
              />
            </View>

            <View style={[styles.inputGroup, styles.timeInput]}>
              <Text style={styles.inputLabel}>End Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM (e.g., 14:00)"
                value={endTime}
                onChangeText={setEndTime}
                placeholderTextColor="#9ca3af"
                maxLength={5}
              />
            </View>
          </View>

          <Text style={styles.timeNote}>
            Note: Date format: YYYY-MM-DD, Time format: HH:MM (24-hour)
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.approveButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleApprove}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.approveButtonText}>Approve</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.declineButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleDecline}
            disabled={isSubmitting}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
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
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  actionSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 14,
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
});
