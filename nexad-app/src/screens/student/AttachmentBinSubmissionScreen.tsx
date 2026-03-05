import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { classroomService } from '../../services/classroomService';
import { documentService } from '../../services/documentService';
import { consultationService } from '../../services/consultationService';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { C, F, T, S, R, shadow } from '../../config/theme';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending_review:          { label: 'Pending Review',         color: C.ink3,  bg: C.surfaceAlt, icon: 'time-outline' },
  approved:                { label: 'Approved',               color: C.actionText,  bg: C.ink2,      icon: 'checkmark-circle' },
  revised:                 { label: 'Revision Required',      color: C.ink2,  bg: C.surfaceAlt, icon: 'pencil' },
  for_consultation:        { label: 'Consultation Needed',    color: C.ink2,  bg: C.surfaceAlt, icon: 'chatbubbles' },
  consultation_requested:  { label: 'Consultation Requested', color: C.ink1,  bg: C.surfaceAlt, icon: 'calendar-outline' },
};

export default function AttachmentBinSubmissionScreen({ navigation, route }: any) {
  const { binId } = route.params as { binId: string };
  const { user } = useAuth();

  const [bin, setBin] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [consultationRequest, setConsultationRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadBinData();
    }, [binId])
  );

  const loadBinData = async () => {
    try {
      const binResult = await classroomService.getAttachmentBin(binId);
      if (binResult.data) setBin(binResult.data);

      if (user?.user_id) {
        const submissionResult = await classroomService.getStudentBinSubmission(binId, user.user_id);
        if (submissionResult.data) {
          setSubmission(submissionResult.data);
          // Load the linked consultation when one has been booked
          const status = submissionResult.data?.review_status;
          if (
            (status === 'consultation_requested' || status === 'for_consultation') &&
            binResult.data?.teacher_id
          ) {
            const consultResult = await consultationService.getStudentConsultationForTeacher(
              user.user_id,
              binResult.data.teacher_id
            );
            if (consultResult.data) setConsultationRequest(consultResult.data);
          }
        }
      }
    } catch (error) {
      console.error('Error loading bin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChooseFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !user?.user_id) return;
    setUploading(true);
    try {
      const uploadResult = await documentService.uploadDocument(
        selectedFile,
        undefined,
        binId,
        user.user_id
      );
      if (uploadResult.error) { Alert.alert('Error', uploadResult.error); return; }
      if (!uploadResult.data) { Alert.alert('Error', 'Failed to upload document'); return; }

      Alert.alert('Success', 'Document submitted successfully!', [
        { text: 'OK', onPress: () => { setSelectedFile(null); loadBinData(); } },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit document');
    } finally {
      setUploading(false);
    }
  };

  const openComments = () => {
    navigation.navigate('BinComments', {
      binId,
      studentId: user?.user_id,
      binTitle: bin?.title || 'Bin',
      studentName: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
      role: 'student',
    });
  };

  const requestConsultation = () => {
    if (!bin?.teacher_id) {
      Alert.alert('Error', 'Teacher info not available.');
      return;
    }
    navigation.navigate('ConsultationRequest', {
      teacher: {
        user_id: bin.teacher_id,
        first_name: bin.users?.first_name || 'Teacher',
        last_name: bin.users?.last_name || '',
      },
      // Pass context so the screen can update the bin status after booking
      sourceDocumentId: submission?.id || null,
      sourceBinId: binId,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.ink2} />
      </View>
    );
  }

  if (!bin) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Attachment bin not found</Text>
      </View>
    );
  }

  const isDeadlinePassed = bin.deadline && new Date(bin.deadline) < new Date();
  const reviewStatus = submission?.review_status || null;
  const statusCfg = reviewStatus ? STATUS_CONFIG[reviewStatus] : null;

  // Student may re-submit only if: no prior submission, or status is 'revised'
  const canSubmit =
    !isDeadlinePassed &&
    (reviewStatus === null || reviewStatus === 'revised');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={C.ink2} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>Submit to Bin</Text>
      </View>

      {/* Bin Info */}
      <View style={styles.binInfoCard}>
        <View style={styles.binIconContainer}>
          <Ionicons name="folder" size={32} color={C.ink2} />
        </View>
        <Text style={styles.binTitle}>{bin.title}</Text>
        {bin.description && <Text style={styles.binDescription}>{bin.description}</Text>}
        <View style={styles.binMetaRow}>
          <View style={styles.binMetaItem}>
            <Ionicons name="person" size={16} color={C.ink3} />
            <Text style={styles.binMetaText}>
              {bin.users?.first_name} {bin.users?.last_name}
            </Text>
          </View>
          {bin.deadline && (
            <View style={[styles.binMetaItem, isDeadlinePassed && styles.deadlinePassed]}>
              <Ionicons name="time-outline" size={16} color={isDeadlinePassed ? C.red : C.ink3} />
              <Text style={[styles.binMetaText, isDeadlinePassed && styles.deadlinePassedText]}>
                {isDeadlinePassed ? 'Deadline passed' : 'Due'}: {new Date(bin.deadline).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Current Submission Status */}
      {submission && statusCfg && (
        <View style={[styles.statusCard, { backgroundColor: statusCfg.bg }]}>
          <View style={styles.statusHeader}>
            <Ionicons name={statusCfg.icon as any} size={24} color={statusCfg.color} />
            <Text style={[styles.statusTitle, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
          <View style={styles.documentInfo}>
            <Ionicons name="document-text" size={18} color={C.ink3} />
            <Text style={styles.documentName} numberOfLines={1}>{submission.file_name}</Text>
          </View>
          <Text style={styles.submissionDate}>
            Submitted {new Date(submission.uploaded_at).toLocaleDateString()}
          </Text>

          {reviewStatus === 'approved' && (
            <Text style={styles.statusHint}>Your submission has been finalized.</Text>
          )}
          {reviewStatus === 'revised' && (
            <Text style={styles.statusHint}>Please re-submit a corrected version below.</Text>
          )}
          {reviewStatus === 'for_consultation' && (
            <>
              {consultationRequest ? (
                // Already booked — show same booked/approved UI as consultation_requested
                consultationRequest.status === 'accepted' ? (
                  <View style={styles.approvedConsultBox}>
                    <View style={styles.approvedConsultHeader}>
                      <Ionicons name="checkmark-circle" size={20} color={C.ink2} />
                      <Text style={styles.approvedConsultTitle}>Consultation Approved!</Text>
                    </View>
                    {consultationRequest.scheduled_start_time ? (
                      <>
                        <View style={styles.consultDetailRow}>
                          <Ionicons name="calendar" size={16} color={C.ink3} />
                          <Text style={styles.consultDetailText}>
                            {new Date(consultationRequest.scheduled_start_time).toLocaleDateString(
                              undefined,
                              { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
                            )}
                          </Text>
                        </View>
                        <View style={styles.consultDetailRow}>
                          <Ionicons name="time-outline" size={16} color={C.ink3} />
                          <Text style={styles.consultDetailText}>
                            {new Date(consultationRequest.scheduled_start_time).toLocaleTimeString(
                              undefined,
                              { hour: '2-digit', minute: '2-digit' }
                            )}
                          </Text>
                        </View>
                        {consultationRequest.classroom_number ? (
                          <View style={styles.consultDetailRow}>
                            <Ionicons name="location-outline" size={16} color={C.ink3} />
                            <Text style={styles.consultDetailText}>
                              Room {consultationRequest.classroom_number}
                            </Text>
                          </View>
                        ) : null}
                      </>
                    ) : (
                      <Text style={styles.statusHint}>Schedule details will be provided soon.</Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.bookedBox}>
                    <Ionicons name="checkmark-done-circle-outline" size={20} color={C.ink2} />
                    <Text style={styles.bookedText}>
                      Consultation already booked. Awaiting teacher's response.
                    </Text>
                  </View>
                )
              ) : (
                // No consultation booked yet — show request button
                <>
                  <Text style={styles.statusHint}>
                    Your teacher recommends a consultation. Request one below.
                  </Text>
                  <TouchableOpacity style={styles.consultButton} onPress={requestConsultation}>
                    <Ionicons name="calendar-outline" size={18} color={C.actionText} />
                    <Text style={styles.consultButtonText}>Request Consultation</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
          {reviewStatus === 'consultation_requested' && (
            <>
              {consultationRequest?.status === 'accepted' ? (
                // Teacher has approved — show scheduled details
                <View style={styles.approvedConsultBox}>
                  <View style={styles.approvedConsultHeader}>
                    <Ionicons name="checkmark-circle" size={20} color={C.ink2} />
                    <Text style={styles.approvedConsultTitle}>Consultation Approved!</Text>
                  </View>
                  {consultationRequest.scheduled_start_time ? (
                    <>
                      <View style={styles.consultDetailRow}>
                        <Ionicons name="calendar" size={16} color={C.ink3} />
                        <Text style={styles.consultDetailText}>
                          {new Date(consultationRequest.scheduled_start_time).toLocaleDateString(
                            undefined,
                            { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
                          )}
                        </Text>
                      </View>
                      <View style={styles.consultDetailRow}>
                        <Ionicons name="time-outline" size={16} color={C.ink3} />
                        <Text style={styles.consultDetailText}>
                          {new Date(consultationRequest.scheduled_start_time).toLocaleTimeString(
                            undefined,
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                          {consultationRequest.scheduled_end_time
                            ? ` – ${new Date(consultationRequest.scheduled_end_time).toLocaleTimeString(
                                undefined,
                                { hour: '2-digit', minute: '2-digit' }
                              )}`
                            : ''}
                        </Text>
                      </View>
                      {consultationRequest.classroom_number ? (
                        <View style={styles.consultDetailRow}>
                          <Ionicons name="location-outline" size={16} color={C.ink3} />
                          <Text style={styles.consultDetailText}>
                            Room {consultationRequest.classroom_number}
                          </Text>
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <Text style={styles.statusHint}>Schedule details will be provided soon.</Text>
                  )}
                </View>
              ) : (
                // Still pending / AI processing
                <View style={styles.bookedBox}>
                  <Ionicons name="checkmark-done-circle-outline" size={20} color={C.ink2} />
                  <Text style={styles.bookedText}>
                    Consultation already booked. Awaiting teacher's response.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Private Comments Button (always visible after first submission) */}
      {submission && (
        <TouchableOpacity style={styles.commentsCard} onPress={openComments}>
          <Ionicons name="chatbox-ellipses-outline" size={20} color={C.ink2} />
          <Text style={styles.commentsCardText}>Private Comments with Teacher</Text>
          <Ionicons name="chevron-forward" size={18} color={C.ink2} />
        </TouchableOpacity>
      )}

      {/* Upload Section */}
      {canSubmit && (
        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>
            {submission ? 'Re-submit Document' : 'Submit Document'}
          </Text>

          {selectedFile ? (
            <View style={styles.selectedFileCard}>
              <View style={styles.fileInfo}>
                <Ionicons name="document-text" size={24} color={C.ink2} />
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName}>{selectedFile.name}</Text>
                  <Text style={styles.fileSize}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedFile(null)}>
                <Ionicons name="close-circle" size={24} color={C.ink4} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.chooseFileButton} onPress={handleChooseFile}>
              <Ionicons name="cloud-upload-outline" size={32} color={C.ink2} />
              <Text style={styles.chooseFileText}>Choose File</Text>
              <Text style={styles.chooseFileHint}>Tap to select a document</Text>
            </TouchableOpacity>
          )}

          <View style={styles.aiNotice}>
            <Ionicons name="sparkles" size={16} color={C.ink2} />
            <Text style={styles.aiNoticeText}>
              Your submission will be analyzed by AI to provide insights to your teacher
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (!selectedFile || uploading) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!selectedFile || uploading}
          >
            {uploading ? (
              <><ActivityIndicator color={C.actionText} />
                <Text style={styles.submitButtonText}>Submitting...</Text>
              </>
            ) : (
              <><Ionicons name="cloud-upload" size={20} color={C.actionText} />
                <Text style={styles.submitButtonText}>Submit Document</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Deadline passed, no submission */}
      {isDeadlinePassed && !submission && (
        <View style={styles.deadlineCard}>
          <Ionicons name="time-outline" size={48} color={C.red} />
          <Text style={styles.deadlineTitle}>Deadline Passed</Text>
          <Text style={styles.deadlineText}>Submissions are no longer accepted</Text>
        </View>
      )}

      {/* Approved — no more actions needed */}
      {reviewStatus === 'approved' && (
        <View style={styles.approvedCard}>
          <Ionicons name="checkmark-circle" size={48} color={C.ink2} />
          <Text style={styles.approvedTitle}>Submission Approved</Text>
          <Text style={styles.approvedText}>No further action needed.</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  errorText: { fontSize: 16, color: C.ink4 },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    marginRight: 16, ...shadow.soft,
  },
  title: { fontSize: 24, fontWeight: '600' as const, color: C.ink1, flex: 1 },
  binInfoCard: {
    backgroundColor: C.surfaceAlt, margin: 16, padding: 20, borderRadius: 12, alignItems: 'center',
  },
  binIconContainer: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: C.surface,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  binTitle: { fontSize: 20, fontWeight: '600' as const, color: C.ink1, textAlign: 'center', marginBottom: 8 },
  binDescription: { fontSize: 14, color: C.ink3, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  binMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  binMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  binMetaText: { fontSize: 12, color: C.ink3 },
  deadlinePassed: { backgroundColor: C.redBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  deadlinePassedText: { color: C.red, fontWeight: '600' as const },
  // Status card
  statusCard: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  statusTitle: { fontSize: 17, fontWeight: '600' as const },
  documentInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  documentName: { fontSize: 13, color: C.ink1, flex: 1 },
  submissionDate: { fontSize: 12, color: C.ink4, marginBottom: 8 },
  statusHint: { fontSize: 13, color: C.ink3, fontStyle: 'italic', marginBottom: 10 },
  consultButton: {
    backgroundColor: C.action, borderRadius: 10, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  consultButtonText: { color: C.actionText, fontWeight: '600' as const, fontSize: 15 },
  // Already-booked banner
  bookedBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: C.surfaceAlt, borderRadius: 8, padding: 12, marginTop: 4,
  },
  bookedText: { flex: 1, fontSize: 13, color: C.ink1, fontStyle: 'italic' },
  // Approved consultation detail box
  approvedConsultBox: {
    backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 12, marginTop: 4,
    borderLeftWidth: 4, borderLeftColor: C.ink2,
  },
  approvedConsultHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8,
  },
  approvedConsultTitle: { fontSize: 14, fontWeight: '600' as const, color: C.ink2 },
  consultDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  consultDetailText: { fontSize: 13, color: C.ink1 },
  // Comments card
  commentsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surface, marginHorizontal: 16, marginBottom: 12,
    padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
  },
  commentsCardText: { flex: 1, fontSize: 14, fontWeight: '600' as const, color: C.ink2 },
  // Upload section
  uploadSection: { backgroundColor: C.surface, marginHorizontal: 16, marginBottom: 16, padding: 20, borderRadius: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600' as const, color: C.ink1, marginBottom: 16 },
  chooseFileButton: {
    borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', borderRadius: 12,
    padding: 32, alignItems: 'center', backgroundColor: C.surfaceAlt, marginBottom: 16,
  },
  chooseFileText: { fontSize: 16, fontWeight: '600' as const, color: C.ink2, marginTop: 12 },
  chooseFileHint: { fontSize: 12, color: C.ink3, marginTop: 4 },
  selectedFileCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.bg, padding: 16, borderRadius: 12, marginBottom: 16,
  },
  fileInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  fileDetails: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600' as const, color: C.ink1, marginBottom: 4 },
  fileSize: { fontSize: 12, color: C.ink3 },
  aiNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: C.surfaceAlt, padding: 12, borderRadius: 8, marginBottom: 16,
  },
  aiNoticeText: { flex: 1, fontSize: 12, color: C.ink2, lineHeight: 16 },
  submitButton: {
    backgroundColor: C.action, borderRadius: 12, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: C.actionText, fontSize: 16, fontWeight: '600' as const },
  // Deadline
  deadlineCard: {
    backgroundColor: C.surface, marginHorizontal: 16, marginBottom: 16,
    padding: 40, borderRadius: 12, alignItems: 'center',
  },
  deadlineTitle: { fontSize: 20, fontWeight: '600' as const, color: C.ink4, marginTop: 16, marginBottom: 8 },
  deadlineText: { fontSize: 14, color: C.ink3, textAlign: 'center' },
  // Approved
  approvedCard: {
    backgroundColor: C.surfaceAlt, marginHorizontal: 16, marginBottom: 16,
    padding: 40, borderRadius: 12, alignItems: 'center',
  },
  approvedTitle: { fontSize: 20, fontWeight: '600' as const, color: C.ink2, marginTop: 16, marginBottom: 8 },
  approvedText: { fontSize: 14, color: C.ink3, textAlign: 'center' },
});
