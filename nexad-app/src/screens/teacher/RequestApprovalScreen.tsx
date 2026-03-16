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
  LayoutAnimation,
  UIManager,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, DateData } from 'react-native-calendars';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { consultationService } from '../../services/consultationService';
import { profileService } from '../../services/profileService';
import { notificationService } from '../../services/notificationService';
import { aiService } from '../../services/aiService';
import { documentService } from '../../services/documentService';
import { cloudmersiveService } from '../../services/cloudmersiveService';
import type { ConsultationRequest } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { C, T, S, R, F, shadow } from '../../config/theme';
import FileViewerModal, { isImageFile } from '../../components/FileViewerModal';

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
  const [studentPhotoUrl, setStudentPhotoUrl] = useState<string | undefined>();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startHour, setStartHour] = useState(13);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(14);
  const [endMinute, setEndMinute] = useState(0);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [classroomNumber, setClassroomNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStudent, setIsLoadingStudent] = useState(true);
  const [existingConsultations, setExistingConsultations] = useState<ConsultationWithStudent[]>([]);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [isLoadingConsultations, setIsLoadingConsultations] = useState(true);
  const [smartBrief, setSmartBrief] = useState<any>(null);
  const [isLoadingBrief, setIsLoadingBrief] = useState(true);
  const [consultationBrief, setConsultationBrief] = useState<any>(null);
  const [isLoadingConsultationBrief, setIsLoadingConsultationBrief] = useState(true);
  const [analysisUnavailableReason, setAnalysisUnavailableReason] = useState('No document submitted - AI analysis is not available for this request.');
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [fileViewer, setFileViewer] = useState<{ visible: boolean; url: string; name: string; isImage: boolean }>({
    visible: false, url: '', name: '', isImage: false,
  });
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    fileOverview: true,
    contentAnalysis: false,
    academicIntegrity: false,
    primaryConcerns: false,
    consultationFocus: false,
  });

  // Enable LayoutAnimation on Android
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const toggleCard = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toYmd = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getCalendarBounds = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const preferredStart = request.preferred_time_slots?.[0]?.start;
    const preferredEnd = request.preferred_time_slots?.[0]?.end;

    if (!preferredStart || !preferredEnd) {
      return {
        minDate: toYmd(today),
        maxDate: undefined as string | undefined,
        restrictedToPreferredRange: false,
      };
    }

    const startDate = new Date(preferredStart);
    const endDate = new Date(preferredEnd);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const effectiveStart = startDate > today ? startDate : today;
    const minDate = toYmd(effectiveStart);
    const maxDate = toYmd(endDate >= effectiveStart ? endDate : effectiveStart);

    return {
      minDate,
      maxDate,
      restrictedToPreferredRange: true,
    };
  };

  useEffect(() => {
    loadStudentProfile();
    loadExistingConsultations();
    loadSmartBrief();
    loadUploadedDocuments();
    loadConsultationBrief();
  }, []);

  useEffect(() => {
    const bounds = getCalendarBounds();
    const selectedYmd = toYmd(selectedDate);

    if (selectedYmd < bounds.minDate) {
      setSelectedDate(new Date(bounds.minDate));
      return;
    }

    if (bounds.maxDate && selectedYmd > bounds.maxDate) {
      setSelectedDate(new Date(bounds.maxDate));
    }
  }, [request.preferred_time_slots, selectedDate]);

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

      // Mark existing consultations with red dots
      consultationsWithNames.forEach(consultation => {
        if (consultation.scheduled_start_time) {
          const date = consultation.scheduled_start_time.split('T')[0];
          marks[date] = {
            marked: true,
            dotColor: '#EF4444', // Red for conflicts/existing consultations
            selected: false,
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
        setStudentPhotoUrl(result.data.profile_photo_url);
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

  const loadSmartBrief = async () => {
    try {
      const result = await aiService.getSmartBrief(request.id);
      if (result.data) {
        setSmartBrief(result.data);
      }
    } catch (error) {
      console.error('Error loading smart brief:', error);
    } finally {
      setIsLoadingBrief(false);
    }
  };

  const loadConsultationBrief = async () => {
    try {
      // Get document name from uploaded docs or fall back to subject line
      const docs = await documentService.getConsultationDocuments(request.id);
      const firstDoc = docs.data?.[0];

      // If no file was submitted, skip AI/plagiarism analysis entirely
      if (!firstDoc) {
        setConsultationBrief(null);
        setAnalysisUnavailableReason('No document submitted - AI analysis is not available for this request.');
        return;
      }

      const fileNameLower = (firstDoc.file_name || '').toLowerCase();
      const fileTypeLower = (firstDoc.file_type || '').toLowerCase();
      const isImageSubmission = /\.(jpg|jpeg|png|gif|bmp|tiff|webp)$/.test(fileNameLower)
        || /(jpg|jpeg|png|gif|bmp|tiff|webp|image)/.test(fileTypeLower);

      // Teacher side: do not run AI/plagiarism analysis for image-only submissions
      if (isImageSubmission) {
        setConsultationBrief(null);
        setAnalysisUnavailableReason('Image submission detected - AI content and integrity analysis is skipped for images.');
        return;
      }

      const fileName = firstDoc?.file_name || request.subject_line || 'Student Document';

      // Extract file text if a document was uploaded
      // Use cloudmersiveService which tries cloud API first (handles custom PDF font encodings)
      let fileContent: string | undefined;
      if (firstDoc?.storage_path) {
        const urlResult = await documentService.getDocumentUrl(firstDoc.storage_path);
        if (urlResult.data) {
          const textResult = await cloudmersiveService.extractTextFromFile(
            urlResult.data,
            firstDoc.file_name || fileName,
            firstDoc.file_type || 'pdf'
          );
          fileContent = textResult.data || '';
          console.log('[RequestApproval] Extracted text length:', fileContent.length);
        }
      }

      const brief = await aiService.generateConsultationBrief({
        fileName,
        studentDescription: request.description || '',
        subjectLine: request.subject_line || '',
        topic: request.topic || 'academic',
        fileContent,
      });
      setConsultationBrief(brief);
      setAnalysisUnavailableReason('No document submitted - AI analysis is not available for this request.');
    } catch (error) {
      console.error('Error generating consultation brief:', error);
    } finally {
      setIsLoadingConsultationBrief(false);
    }
  };

  const loadUploadedDocuments = async () => {
    try {
      const result = await documentService.getConsultationDocuments(request.id);
      if (result.data) {
        console.log('Documents loaded:', result.data.length, 'files');
        setUploadedDocuments(result.data);
      } else {
        console.log('No documents found for request:', request.id);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoadingDocuments(false);
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

  const formatPreferredDateRange = () => {
    try {
      const firstSlot = request.preferred_time_slots?.[0];
      if (!firstSlot?.start) return 'No preferred range provided';

      const startDate = new Date(firstSlot.start);
      const endDate = firstSlot.end ? new Date(firstSlot.end) : startDate;

      const startText = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endText = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      if (startDate.toDateString() === endDate.toDateString()) {
        return endText;
      }

      return `${startText} - ${endText}`;
    } catch {
      return 'Preferred range unavailable';
    }
  };

  const validateDateTime = () => {
    // Validate classroom number
    if (!classroomNumber.trim()) {
      Alert.alert('Classroom Required', 'Please enter a classroom number');
      return false;
    }

    // Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selDate = new Date(selectedDate);
    selDate.setHours(0, 0, 0, 0);
    
    if (selDate < today) {
      Alert.alert('Invalid Date', 'Please select a future date');
      return false;
    }

    // ─── NEW: Validate date is within student's preferred range ─────────────────────────
    const preferredStart = request.preferred_time_slots?.[0]?.start;
    const preferredEnd = request.preferred_time_slots?.[0]?.end;
    
    if (preferredStart && preferredEnd) {
      const startDate = new Date(preferredStart);
      const endDate = new Date(preferredEnd);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      if (selDate < startDate || selDate > endDate) {
        const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        Alert.alert(
          'Date Outside Preferred Range',
          `Student's preferred dates are ${startStr} - ${endStr}. Please select a date within this range.`
        );
        return false;
      }
    }

    // If today is selected, validate the start time is not already past
    const isToday = selDate.getTime() === today.getTime();
    if (isToday) {
      const now = new Date();
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(startHour, startMinute, 0, 0);
      if (startDateTime <= now) {
        Alert.alert('Invalid Time', 'The selected start time has already passed. Please choose a future time.');
        return false;
      }
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
        endDateTime.toISOString(),
        classroomNumber.trim()
      );

      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      // NOTE: DB trigger (notify_student_status_change) handles student notification.
      // Also send a device push so the student gets a sound immediately.
      notificationService.sendPushToUser(
        request.student_id,
        'Consultation Approved ✓',
        'Your consultation request has been approved and scheduled.',
        { type: 'request_accepted', consultationRequestId: request.id }
      ).catch(() => {});
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

              // NOTE: DB trigger (notify_student_status_change) handles student notification.
              // Also send a device push so the student gets a sound immediately.
              notificationService.sendPushToUser(
                request.student_id,
                'Consultation Request Update',
                'Your consultation request has been reviewed by the teacher.',
                { type: 'request_declined', consultationRequestId: request.id }
              ).catch(() => {});
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
          <Ionicons name="chevron-back" size={22} color={C.ink1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Details</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* ─── Student card ─── */}
        <View style={styles.heroSection}>
            <Text style={styles.gradientSectionLabel}>PENDING REQUEST</Text>
            <View style={styles.heroGlassCard}>
              <View style={styles.gradientStudentRow}>
                <View style={styles.gradientAvatar}>
                  {studentPhotoUrl ? (
                    <Image source={{ uri: studentPhotoUrl }} style={styles.gradientAvatarImg} />
                  ) : (
                    <Text style={styles.gradientAvatarText}>
                      {(isLoadingStudent ? '?' : studentName)[0]?.toUpperCase() || 'S'}
                    </Text>
                  )}
                </View>
                <View style={styles.gradientStudentInfo}>
                  <Text style={styles.gradientStudentName}>
                    {isLoadingStudent ? 'Loading...' : studentName}
                  </Text>
                  <Text style={styles.gradientSubject} numberOfLines={2}>
                    {request.subject_line}
                  </Text>
                </View>
                {request.urgency === 'urgent' && (
                  <View style={styles.gradientUrgentBadge}>
                    <Text style={styles.gradientUrgentText}>⚡ URGENT</Text>
                  </View>
                )}
              </View>
              {!!request.description && (
                <View style={styles.heroCardDivider} />
              )}
              {!!request.description && (
                <Text style={styles.gradientDescription} numberOfLines={3}>
                  {request.description}
                </Text>
              )}
              <View style={styles.gradientMetaRow}>
                <View style={styles.gradientMetaChip}>
                  <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.55)" />
                  <Text style={styles.gradientMetaText}>{formatDate(request.submitted_at)}</Text>
                </View>
                {request.preferred_time_slots && request.preferred_time_slots.length > 0 && (
                  <View style={styles.gradientMetaChip}>
                    <Ionicons name="calendar-clear-outline" size={11} color="rgba(255,255,255,0.55)" />
                    <Text style={styles.gradientMetaText}>
                      Preferred: {formatPreferredDateRange()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
        </View>

        {/* ─── AI Consultation Prep Brief ─── */}
        <View style={[styles.section, { paddingBottom: 20 }]}>
          <View style={styles.smartBriefHeader}>
            <Text style={styles.sectionTitle}>AI Consultation Prep Brief</Text>
            <View style={styles.aiGeneratedBadge}>
              <Ionicons name="sparkles" size={10} color="#7C3AED" />
              <Text style={styles.aiGeneratedText}>AI Generated</Text>
            </View>
          </View>

          {isLoadingConsultationBrief ? (
            <View style={styles.loadingBrief}>
              <ActivityIndicator size="small" color={C.ink2} />
              <Text style={styles.loadingBriefText}>Analyzing document content...</Text>
            </View>
          ) : consultationBrief ? (
            <>
              {/* File Overview */}
              <TouchableOpacity style={styles.lightGlassCard} onPress={() => toggleCard('fileOverview')} activeOpacity={0.8}>
                <View style={styles.accordionHeader}>
                  <View style={styles.accordionHeaderLeft}>
                    <View style={[styles.accordionIconBadge, { backgroundColor: '#EEF2FF' }]}>
                      <Ionicons name="information-circle" size={15} color="#4F46E5" />
                    </View>
                    <Text style={styles.accordionTitle}>File Overview</Text>
                  </View>
                  <Ionicons name={expandedCards.fileOverview ? 'chevron-up' : 'chevron-down'} size={16} color={C.ink4} />
                </View>
                {expandedCards.fileOverview && (
                  <View style={styles.accordionBody}>
                    <Text style={styles.briefText}>{consultationBrief.file_overview}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Content Analysis */}
              {consultationBrief.content_analysis && (
                <TouchableOpacity style={styles.lightGlassCard} onPress={() => toggleCard('contentAnalysis')} activeOpacity={0.8}>
                  <View style={styles.accordionHeader}>
                    <View style={styles.accordionHeaderLeft}>
                      <View style={[styles.accordionIconBadge, { backgroundColor: '#ECFDF5' }]}>
                        <Ionicons name="document-text" size={15} color="#059669" />
                      </View>
                      <Text style={styles.accordionTitle}>Content Analysis</Text>
                    </View>
                    <View style={styles.accordionHeaderRight}>
                      {consultationBrief.content_analysis.word_count > 0 && (
                        <Text style={styles.accordionMeta}>~{consultationBrief.content_analysis.word_count} words</Text>
                      )}
                      <Ionicons name={expandedCards.contentAnalysis ? 'chevron-up' : 'chevron-down'} size={16} color={C.ink4} />
                    </View>
                  </View>
                  {expandedCards.contentAnalysis && (
                    <View style={styles.accordionBody}>
                      <Text style={styles.briefText}>{consultationBrief.content_analysis.summary}</Text>
                      {consultationBrief.content_analysis.key_topics?.length > 0 && (
                        <View style={styles.chipRow}>
                          {consultationBrief.content_analysis.key_topics.map((t: string, i: number) => (
                            <View key={i} style={styles.topicChip}>
                              <Text style={styles.topicChipText}>{t}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {consultationBrief.content_analysis.flags?.map((flag: string, i: number) => (
                        <View key={i} style={styles.flagRow}>
                          <Text style={styles.flagIcon}>⚠</Text>
                          <Text style={styles.flagText}>{flag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* Academic Integrity */}
              {(() => {
                const integrity = consultationBrief.academic_integrity;
                const pct = integrity?.percentage_match ?? 0;
                const status = integrity?.status ?? 'Clean';
                const isHigh = pct >= 66;
                const isMid = pct >= 41;
                const scaleColor = isHigh ? '#DC2626' : isMid ? '#D97706' : '#16A34A';
                const scaleIconBg = isHigh ? '#FEF2F2' : isMid ? '#FFFBEB' : '#F0FDF4';
                return (
                  <TouchableOpacity style={styles.lightGlassCard} onPress={() => toggleCard('academicIntegrity')} activeOpacity={0.8}>
                    <View style={styles.accordionHeader}>
                      <View style={styles.accordionHeaderLeft}>
                        <View style={[styles.accordionIconBadge, { backgroundColor: scaleIconBg }]}>
                          <Ionicons name={isHigh ? 'warning' : isMid ? 'alert-circle' : 'shield-checkmark'} size={15} color={scaleColor} />
                        </View>
                        <Text style={styles.accordionTitle}>Academic Integrity</Text>
                      </View>
                      <View style={styles.accordionHeaderRight}>
                        <Text style={[styles.accordionMetaBold, { color: scaleColor }]}>{pct}%</Text>
                        <Ionicons name={expandedCards.academicIntegrity ? 'chevron-up' : 'chevron-down'} size={16} color={C.ink4} />
                      </View>
                    </View>
                    <View style={styles.integrityScaleWrap}>
                      <View style={styles.integrityTrackBg}>
                        <View style={[styles.integrityTrackFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: scaleColor }]} />
                        <View style={[styles.integrityMarker, { left: '41%' as any }]} />
                        <View style={[styles.integrityMarker, { left: '66%' as any }]} />
                      </View>
                      <View style={styles.integrityScaleRow}>
                        <Text style={styles.integrityScaleLabel}>0%</Text>
                        <Text style={[styles.integrityScaleLabel, { color: '#16A34A' }]}>Clean</Text>
                        <Text style={[styles.integrityScaleLabel, { color: '#D97706' }]}>Review</Text>
                        <Text style={[styles.integrityScaleLabel, { color: '#DC2626' }]}>High Risk</Text>
                        <Text style={styles.integrityScaleLabel}>100%</Text>
                      </View>
                    </View>
                    {expandedCards.academicIntegrity && (
                      <View style={styles.accordionBody}>
                        <View style={styles.integrityChipRow}>
                          <View style={[styles.integrityChip, { backgroundColor: scaleColor + '18', borderColor: scaleColor }]}>
                            <Text style={[styles.integrityChipText, { color: scaleColor }]}>{pct}% match estimate</Text>
                          </View>
                          <View style={[styles.integrityChip, { backgroundColor: scaleColor + '18', borderColor: scaleColor }]}>
                            <Text style={[styles.integrityChipText, { color: scaleColor }]}>{status}</Text>
                          </View>
                        </View>
                        <Text style={styles.briefText}>{integrity?.analysis}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })()}

              {/* Primary Concerns */}
              {consultationBrief.primary_concerns?.length > 0 && (
                <TouchableOpacity style={styles.lightGlassCard} onPress={() => toggleCard('primaryConcerns')} activeOpacity={0.8}>
                  <View style={styles.accordionHeader}>
                    <View style={styles.accordionHeaderLeft}>
                      <View style={[styles.accordionIconBadge, { backgroundColor: '#F5F3FF' }]}>
                        <Ionicons name="alert-circle" size={15} color="#7C3AED" />
                      </View>
                      <Text style={styles.accordionTitle}>Primary Concerns</Text>
                    </View>
                    <View style={styles.accordionHeaderRight}>
                      <Text style={styles.accordionMeta}>{consultationBrief.primary_concerns.length} item{consultationBrief.primary_concerns.length !== 1 ? 's' : ''}</Text>
                      <Ionicons name={expandedCards.primaryConcerns ? 'chevron-up' : 'chevron-down'} size={16} color={C.ink4} />
                    </View>
                  </View>
                  {expandedCards.primaryConcerns && (
                    <View style={styles.accordionBody}>
                      {consultationBrief.primary_concerns.map((concern: string, i: number) => (
                        <View key={i} style={styles.bulletPoint}>
                          <Text style={[styles.bullet, { color: '#7C3AED' }]}>•</Text>
                          <Text style={styles.bulletText}>{concern}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* Consultation Focus */}
              {consultationBrief.consultation_focus && (
                <TouchableOpacity style={styles.lightGlassCard} onPress={() => toggleCard('consultationFocus')} activeOpacity={0.8}>
                  <View style={styles.accordionHeader}>
                    <View style={styles.accordionHeaderLeft}>
                      <View style={[styles.accordionIconBadge, { backgroundColor: '#E0F7FA' }]}>
                        <Ionicons name="chatbubble" size={15} color="#0891B2" />
                      </View>
                      <Text style={styles.accordionTitle}>Consultation Focus</Text>
                    </View>
                    <Ionicons name={expandedCards.consultationFocus ? 'chevron-up' : 'chevron-down'} size={16} color={C.ink4} />
                  </View>
                  {expandedCards.consultationFocus && (
                    <View style={styles.accordionBody}>
                      <Text style={styles.briefText}>{consultationBrief.consultation_focus}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.noDataCard}>
              <Text style={styles.noDataText}>{analysisUnavailableReason}</Text>
            </View>
          )}
        </View>

        {/* ─── Student Documents ─── */}
        {isLoadingDocuments ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}><Ionicons name="attach" size={16} color={C.ink3} /> Student Documents</Text>
            <View style={styles.loadingBrief}>
              <ActivityIndicator size="small" color={C.ink3} />
              <Text style={styles.loadingBriefText}>Loading documents...</Text>
            </View>
          </View>
        ) : uploadedDocuments.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.smartBriefHeader}>
              <Text style={styles.sectionTitle}><Ionicons name="attach" size={16} color={C.ink3} /> Student Documents & Drafts</Text>
              <View style={styles.documentBadge}>
                <Text style={styles.documentBadgeText}>{uploadedDocuments.length} file(s)</Text>
              </View>
            </View>
            <Text style={styles.documentsSubtext}>Student has uploaded the following materials for review:</Text>
            {uploadedDocuments.map((doc, index) => (
              <TouchableOpacity
                key={doc.id || index}
                style={styles.documentCard}
                activeOpacity={0.75}
                onPress={async () => {
                  try {
                    const urlResult = await documentService.getDocumentUrl(doc.storage_path);
                    if (urlResult.data) {
                      setFileViewer({
                        visible: true,
                        url: urlResult.data,
                        name: doc.file_name || 'Document',
                        isImage: isImageFile(doc.file_name, doc.file_type),
                      });
                    } else {
                      Alert.alert('Error', urlResult.error || 'Failed to get document link');
                    }
                  } catch (error) {
                    Alert.alert('Error', 'Failed to load document');
                  }
                }}
              >
                <View style={styles.documentIcon}>
                  <Ionicons name="document-text-outline" size={16} color={C.ink3} />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName} numberOfLines={1}>{doc.file_name || 'Document'}</Text>
                  <Text style={styles.documentMeta}>
                    {doc.file_size_bytes ? `${(doc.file_size_bytes / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}{doc.uploaded_at ? ` · Uploaded ${new Date(doc.uploaded_at).toLocaleDateString()}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.ink3} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}><Ionicons name="attach" size={16} color={C.ink3} /> Student Documents & Drafts</Text>
            <View style={styles.noDataCard}>
              <Text style={styles.noDataText}>No documents uploaded for this consultation.</Text>
            </View>
          </View>
        )}

        {/* ─── Calendar Section ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Schedule - Available Times</Text>
          {getCalendarBounds().restrictedToPreferredRange && (
            <Text style={styles.calendarSubtext}>Only dates within the student's preferred range are selectable.</Text>
          )}
          <Text style={[styles.calendarSubtext, { marginTop: getCalendarBounds().restrictedToPreferredRange ? 4 : 0 }]}>
            <Text style={{ color: '#EF4444', fontWeight: '600' }}>Red dots:</Text> Your existing consultations
          </Text>
          {isLoadingConsultations ? (
            <ActivityIndicator size="large" color={C.ink2} style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.calendarContainer}>
              <Calendar
                markedDates={{
                  ...markedDates,
                  [selectedDate.toISOString().split('T')[0]]: {
                    ...markedDates[selectedDate.toISOString().split('T')[0]],
                    selected: true,
                    selectedColor: C.ink1,
                  },
                }}
                onDayPress={(day: DateData) => setSelectedDate(new Date(day.dateString))}
                minDate={getCalendarBounds().minDate}
                maxDate={getCalendarBounds().maxDate}
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
                  textSectionTitleColor: C.ink3,
                  selectedDayBackgroundColor: C.action,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: C.action,
                  todayBackgroundColor: C.surfaceAlt,
                  dayTextColor: C.ink1,
                  textDisabledColor: C.ink5,
                  dotColor: '#EF4444',
                  selectedDotColor: '#ffffff',
                  arrowColor: C.ink2,
                  monthTextColor: C.ink1,
                  textMonthFontWeight: 'bold',
                  textDayFontWeight: '500',
                }}
              />
            </View>
          )}
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
                ))}
            </View>
          )}
        </View>

        {/* ─── Date and Time Selection ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule Consultation</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Selected Date *</Text>
            <View style={styles.pickerButton}>
              <Text style={styles.pickerButtonText}>
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={C.ink2} />
            </View>
            <Text style={styles.helperText}>Tap a date on the calendar above to change</Text>
          </View>

          <View style={styles.timeRow}>
            <View style={[styles.inputGroup, styles.timeInput]}>
              <Text style={styles.inputLabel}>Start Time *</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowStartTimePicker(true)}>
                <Text style={styles.pickerButtonText}>{`${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`}</Text>
                <Ionicons name="time-outline" size={18} color={C.ink2} />
              </TouchableOpacity>
            </View>
            <View style={[styles.inputGroup, styles.timeInput]}>
              <Text style={styles.inputLabel}>End Time *</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowEndTimePicker(true)}>
                <Text style={styles.pickerButtonText}>{`${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`}</Text>
                <Ionicons name="time-outline" size={18} color={C.ink2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Custom Time Picker Modals */}
          <Modal
            visible={showStartTimePicker}
            transparent={true}
            animationType="slide"
            presentationStyle="pageSheet"
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
            presentationStyle="pageSheet"
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
            <Ionicons name="alert-circle-outline" size={12} color={C.ink3} /> System will check for conflicts with existing consultations
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Classroom Number *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 101, A-205, Room 3"
              placeholderTextColor={C.ink4}
              value={classroomNumber}
              onChangeText={setClassroomNumber}
              autoCapitalize="characters"
            />
            <Text style={styles.helperText}>Enter the classroom where the consultation will be held</Text>
          </View>
        </View>

        {/* ─── Action Buttons ─── */}
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
                <Text style={styles.approveButtonText}><Ionicons name="checkmark" size={16} color="#fff" /> Approve & Schedule</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.declineButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleDecline}
              disabled={isSubmitting}
            >
              <Text style={styles.declineButtonText}><Ionicons name="close" size={16} color="#fff" /> Decline Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <FileViewerModal
        visible={fileViewer.visible}
        url={fileViewer.url}
        fileName={fileViewer.name}
        isImage={fileViewer.isImage}
        onClose={() => setFileViewer(v => ({ ...v, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: C.ink2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: C.ink1,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: C.bg,
  },
  section: {
    backgroundColor: C.bg,
    padding: 16,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  // ── Dark section (used for all lower sections) ────────────────────────────
  darkSection: {
    backgroundColor: C.bg,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  darkSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: C.ink1,
    marginBottom: 4,
  },
  darkSubtext: {
    fontSize: 12,
    color: C.ink3,
    marginBottom: 14,
    fontStyle: 'italic' as const,
  },
  darkBadge: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  darkBadgeText: {
    fontSize: 11,
    color: C.ink3,
    fontWeight: '600' as const,
  },
  darkDocCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  darkDocIcon: {
    width: 38,
    height: 38,
    backgroundColor: C.surfaceAlt,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  darkDocName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: C.ink1,
    marginBottom: 2,
  },
  darkDocMeta: {
    fontSize: 11,
    color: C.ink3,
  },
  darkCalendarWrap: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden' as const,
    marginBottom: 12,
  },
  darkExistingWrap: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginTop: 4,
  },
  darkExistingTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: C.ink3,
    marginBottom: 8,
  },
  darkExistingItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 4,
  },
  darkExistingTime: {
    fontSize: 12,
    color: C.ink1,
    fontWeight: '600' as const,
  },
  darkExistingStudent: {
    fontSize: 12,
    color: C.ink3,
  },
  darkLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: C.ink2,
    marginBottom: 8,
  },
  darkPickerButton: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  darkPickerText: {
    fontSize: 14,
    color: C.ink1,
  },
  darkHelperText: {
    fontSize: 11,
    color: C.ink3,
    marginTop: 5,
    marginBottom: 12,
  },
  darkTextInput: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: C.ink1,
  },
  darkApproveButton: {
    backgroundColor: C.action,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  darkApproveText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  darkDeclineButton: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  darkDeclineText: {
    color: C.ink2,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: C.ink1,
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  studentCard: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  studentAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: C.ink3,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: C.ink1,
    marginBottom: 6,
  },
  requestSubject: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink1,
    marginBottom: 8,
  },
  requestDescription: {
    fontSize: 13,
    color: C.ink3,
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: C.ink3,
    marginRight: 6,
  },
  metaValue: {
    fontSize: 12,
    color: C.ink1,
    flex: 1,
  },
  urgentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.ink2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
  },
  urgentText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#fff',
  },
  calendarContainer: {
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    marginBottom: 16,
  },
  existingConsultations: {
    backgroundColor: C.surfaceAlt,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  existingTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: C.ink3,
    marginBottom: 8,
  },
  existingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  existingTime: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: C.ink1,
  },
  existingStudent: {
    fontSize: 12,
    color: C.ink3,
  },
  calendarPlaceholder: {
    backgroundColor: C.bg,
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
    fontWeight: '600' as const,
    color: C.ink3,
    marginBottom: 4,
  },
  calendarSubtext: {
    fontSize: 13,
    color: C.ink3,
    textAlign: 'center',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: C.ink2,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.ink1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: C.ink1,
  },
  pickerButton: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.ink1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    fontSize: 16,
    color: C.ink1,
    fontWeight: '400' as const,
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
    color: C.ink3,
    fontStyle: 'italic',
    marginTop: 8,
    backgroundColor: C.surfaceAlt,
    padding: 8,
    borderRadius: 6,
  },
  actionSection: {
    gap: 12,
  },
  approveButton: {
    backgroundColor: C.action,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  approveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  declineButton: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.ink1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: {
    color: C.ink1,
    fontSize: 16,
    fontWeight: '600' as const,
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
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  timePickerTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: C.ink1,
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
    fontWeight: '600' as const,
    color: C.ink3,
    marginBottom: 10,
    textAlign: 'center',
  },
  timePickerScroll: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
  },
  timePickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.surfaceAlt,
  },
  timePickerOptionSelected: {
    backgroundColor: C.surfaceAlt,
  },
  timePickerOptionText: {
    fontSize: 16,
    color: C.ink1,
    textAlign: 'center',
  },
  timePickerOptionTextSelected: {
    color: C.ink1,
    fontWeight: '600' as const,
  },
  timePickerDoneButton: {
    backgroundColor: C.action,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  timePickerDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  helperText: {
    fontSize: 12,
    color: C.ink3,
    marginTop: 6,
    fontStyle: 'italic',
  },
  smartBriefHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  smartBriefCard: {
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  briefSection: {
    gap: 8,
  },
  briefLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: C.ink1,
    marginBottom: 8,
  },
  briefText: {
    fontSize: 14,
    color: C.ink2,
    lineHeight: 20,
  },
  bulletPoint: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  bullet: {
    fontSize: 16,
    color: C.ink3,
    fontWeight: '600' as const,
  },
  bulletText: {
    fontSize: 14,
    color: C.ink2,
    lineHeight: 20,
    flex: 1,
  },
  concernsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  concernChip: {
    backgroundColor: '#F2F2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#6B6B6B',
  },
  concernText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '600' as const,
  },
  durationText: {
    fontSize: 16,
    color: '#3D3D3D',
    fontWeight: '600' as const,
  },
  confidenceBadge: {
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  confidenceText: {
    fontSize: 11,
    color: C.ink1,
    fontWeight: '600' as const,
  },
  loadingBrief: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
    backgroundColor: C.surfaceAlt,
    borderRadius: 12,
  },
  loadingBriefText: {
    fontSize: 14,
    color: C.ink3,
    fontStyle: 'italic',
  },
  documentBadge: {
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  documentBadgeText: {
    fontSize: 11,
    color: C.ink2,
    fontWeight: '600' as const,
  },
  documentsSubtext: {
    fontSize: 13,
    color: C.ink3,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  documentIcon: {
    width: 40,
    height: 40,
    backgroundColor: C.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentIconText: {
    fontSize: 20,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: C.ink1,
    marginBottom: 2,
  },
  documentMeta: {
    fontSize: 12,
    color: C.ink3,
  },
  documentArrow: {
    fontSize: 18,
    color: C.ink2,
    marginLeft: 8,
  },
  noDataCard: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: C.ink3,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // ── Hero (dark gradient) outer layout ─────────────────────────────────────
  heroSection: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 22,
    backgroundColor: C.bg,
  },
  heroGlassCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  heroCardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginVertical: 12,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 18,
    marginBottom: 4,
  },
  gradientSectionLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.40)',
    letterSpacing: 1.8,
    marginBottom: 10,
  },
  // ── Dark glass accordion card ─────────────────────────────────────────────
  lightGlassCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    overflow: 'hidden' as const,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  gradientCard: {
    marginHorizontal: 0,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
  },
  gradientStudentRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  gradientAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 14,
  },
  gradientAvatarText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#ffffff',
  },
  gradientAvatarImg: { width: 52, height: 52, borderRadius: 26 },
  gradientStudentInfo: {
    flex: 1,
  },
  gradientStudentName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#ffffff',
    marginBottom: 3,
  },
  gradientSubject: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.70)',
    fontWeight: '500' as const,
  },
  gradientUrgentBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 8,
    alignSelf: 'flex-start' as const,
  },
  gradientUrgentText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  gradientDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 19,
    marginBottom: 14,
  },
  gradientMetaRow: {
    flexDirection: 'row' as const,
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  gradientMetaChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  gradientMetaText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500' as const,
  },

  // ── AI Brief section wrapper (on dark gradient) ──────────────────────────
  darkBriefWrap: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
  },
  // kept for compat
  briefSection2: {
    backgroundColor: C.surface,
    padding: 16,
    marginBottom: 8,
  },

  // ── AI Generated badge ────────────────────────────────────────────────────
  aiGeneratedBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  aiGeneratedText: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: '600' as const,
  },

  // ── Dark glass accordion cards ────────────────────────────────────────────
  darkCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    overflow: 'hidden' as const,
  },
  darkCardTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: C.ink1,
  },
  darkCardBody: {
    fontSize: 13,
    color: C.ink2,
    lineHeight: 20,
  },
  darkCardMeta: {
    fontSize: 11,
    color: C.ink3,
    fontWeight: '500' as const,
  },
  darkTopicChip: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  darkTopicChipText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600' as const,
  },
  // kept for compat
  glassCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    overflow: 'hidden' as const,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  accordionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  accordionHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    flex: 1,
  },
  accordionHeaderRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  accordionIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: C.ink1,
  },
  accordionMeta: {
    fontSize: 11,
    color: C.ink3,
    fontWeight: '500' as const,
  },
  accordionMetaBold: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  accordionBody: {
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 10,
    gap: 8,
  },

  // ── Integrity scale bar ───────────────────────────────────────────────────
  integrityScaleWrap: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  integrityTrackBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.10)',
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  integrityTrackFill: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  integrityMarker: {
    position: 'absolute' as const,
    top: -1,
    bottom: -1,
    width: 1.5,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  integrityScaleRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginTop: 5,
  },
  integrityScaleLabel: {
    fontSize: 9,
    color: C.ink3,
    fontWeight: '600' as const,
  },
  integrityChipRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginBottom: 6,
  },
  integrityChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  integrityChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },

  // ── Topic chips & flags ───────────────────────────────────────────────────
  chipRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginTop: 8,
  },
  topicChip: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  topicChipText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600' as const,
  },
  flagRow: {
    flexDirection: 'row' as const,
    gap: 6,
    alignItems: 'flex-start' as const,
    marginTop: 4,
  },
  flagIcon: {
    fontSize: 13,
    color: '#D97706',
  },
  flagText: {
    fontSize: 13,
    color: '#D97706',
    flex: 1,
    lineHeight: 18,
  },
});
