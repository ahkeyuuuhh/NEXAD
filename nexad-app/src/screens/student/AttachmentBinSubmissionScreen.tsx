import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { classroomService } from '../../services/classroomService';
import { documentService } from '../../services/documentService';
import { consultationService } from '../../services/consultationService';
import { notificationService } from '../../services/notificationService';
import { cloudmersiveService } from '../../services/cloudmersiveService';
import { Ionicons } from '@expo/vector-icons';
import { C, F, T, S, R, shadow } from '../../config/theme';
import FileViewerModal, { isImageFile as isImageFileHelper } from '../../components/FileViewerModal';

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
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showAnalyzePrompt, setShowAnalyzePrompt] = useState(false);
  // Plagiarism check states
  const [showPlagiarismModal, setShowPlagiarismModal] = useState(false);
  const [plagiarismResults, setPlagiarismResults] = useState<Array<{
    fileName: string;
    originalityScore: number | null;
    isHighRisk: boolean;
    error?: string;
  }>>([]);
  const [checkingPlagiarism, setCheckingPlagiarism] = useState(false);
  const [fileViewer, setFileViewer] = useState<{ visible: boolean; url: string; name: string; isImage: boolean }>({
    visible: false, url: '', name: '', isImage: false,
  });

  const isImageFile = (name?: string, mimeType?: string) => {
    const lowerName = (name || '').toLowerCase();
    const lowerMime = (mimeType || '').toLowerCase();
    return /\.(jpg|jpeg|png|gif|bmp|tiff|webp)$/i.test(lowerName) || lowerMime.includes('image');
  };

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
    setShowAttachMenu(prev => !prev);
  };

  const pickDocumentAttachment = async () => {
    try {
      setIsUploadingFile(true);
      setShowAttachMenu(false);
      const result = await documentService.pickDocument();
      if (result.error) {
        if (result.error !== 'Document selection cancelled') {
          Alert.alert('Error', result.error);
        }
        return;
      }

      if (result.data && !result.data.canceled) {
        const pickedFile = result.data.assets[0];
        setSelectedFile(pickedFile);
        setShowAnalyzePrompt(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const pickImageAttachment = async () => {
    try {
      setIsUploadingFile(true);
      setShowAttachMenu(false);
      const imageResult = await documentService.pickImage();
      if (imageResult.error) {
        if (imageResult.error !== 'Image selection cancelled') {
          Alert.alert('Error', imageResult.error);
        }
        return;
      }

      if (imageResult.data) {
        setSelectedFile(imageResult.data);
        setShowAnalyzePrompt(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !user?.user_id) return;
    await proceedWithSubmission();
  };

  const performPlagiarismCheck = async (fileToCheck?: any) => {
    const activeFile = fileToCheck || selectedFile;
    if (!activeFile) return;

    setShowPlagiarismModal(true);
    setCheckingPlagiarism(true);
    setPlagiarismResults([]);

    try {
      if (isImageFile(activeFile.name, activeFile.mimeType)) {
        setPlagiarismResults([{
          fileName: activeFile.name,
          originalityScore: null,
          isHighRisk: false,
          error: 'Images are not included in academic integrity analysis.',
        }]);
        setCheckingPlagiarism(false);
        return;
      }

      // Extract text from the document
      const extractResult = await cloudmersiveService.extractTextFromFile(
        activeFile.uri,
        activeFile.name,
        activeFile.mimeType
      );

      if (extractResult.error) {
        setPlagiarismResults([{
          fileName: activeFile.name,
          originalityScore: null,
          isHighRisk: false,
          error: extractResult.error,
        }]);
        setCheckingPlagiarism(false);
        return;
      }

      // Check plagiarism on the extracted text
      if (extractResult.data) {
        const checkResult = await cloudmersiveService.checkPlagiarism(extractResult.data);

        if (checkResult.error) {
          setPlagiarismResults([{
            fileName: activeFile.name,
            originalityScore: null,
            isHighRisk: false,
            error: checkResult.error,
          }]);
          setCheckingPlagiarism(false);
          return;
        }

        setPlagiarismResults([{
          fileName: activeFile.name,
          originalityScore: checkResult.data!.originalityScore,
          isHighRisk: checkResult.data!.isHighRisk,
        }]);
      } else {
        setPlagiarismResults([{
          fileName: activeFile.name,
          originalityScore: null,
          isHighRisk: false,
          error: 'No text could be extracted from this file.',
        }]);
      }
    } catch (error) {
      console.error('Plagiarism check error:', error);
      setPlagiarismResults([{
        fileName: activeFile.name,
        originalityScore: null,
        isHighRisk: false,
        error: 'An unexpected error occurred during the check.',
      }]);
    } finally {
      setCheckingPlagiarism(false);
    }
  };

  const proceedWithSubmission = async () => {
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
      // Notify the teacher about the new submission
      if (bin?.teacher_id) {
        notificationService.createNotification(
          bin.teacher_id,
          'New File Submission',
          `${user.first_name} ${user.last_name} submitted a file to "${bin.title || 'Attachment Bin'}"`,
          'classroom_announcement',
          undefined,
          binId
        ).catch(() => {});
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit document');
    } finally {
      setUploading(false);
      setShowPlagiarismModal(false);
    }
  };

  const handleViewSubmission = async () => {
    if (!submission?.storage_path) {
      Alert.alert('Error', 'No file attached to this submission.');
      return;
    }
    try {
      const result = await documentService.getDocumentUrl(submission.storage_path);
      if (result.error || !result.data) {
        Alert.alert('Error', result.error || 'Failed to get file link');
        return;
      }
      setFileViewer({
        visible: true,
        url: result.data,
        name: submission.file_name || 'File',
        isImage: isImageFileHelper(submission.file_name, submission.file_type),
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to open file');
    }
  };

  const openComments = () => {
    navigation.navigate('BinComments', {
      binId,
      studentId: user?.user_id,
      binTitle: bin?.title || 'Bin',
      studentName: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
      role: 'student',
      teacherId: bin?.teacher_id,
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
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={C.ink2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{bin.title}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Assignment Header Card */}
        <View style={styles.assignmentCard}>
          <View style={styles.assignmentHeader}>
            <View style={styles.assignmentIconWrap}>
              <Ionicons name="clipboard" size={24} color="#1967D2" />
            </View>
            <View style={styles.assignmentInfo}>
              <Text style={styles.assignmentTitle}>{bin.title}</Text>
              <Text style={styles.assignmentTeacher}>
                {bin.users?.first_name} {bin.users?.last_name}
              </Text>
            </View>
            {bin.deadline && (
              <View style={[styles.dueBadge, isDeadlinePassed && styles.dueBadgeOverdue]}>
                <Text style={[styles.dueText, isDeadlinePassed && styles.dueTextOverdue]}>
                  {isDeadlinePassed ? 'Overdue' : 'Due'} {new Date(bin.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            )}
          </View>
          
          {bin.description && (
            <Text style={styles.assignmentDescription}>{bin.description}</Text>
          )}
        </View>

        {/* Your Work Section */}
        <View style={styles.workSection}>
          <Text style={styles.sectionTitle}>Your work</Text>
          
          {submission ? (
            <View style={styles.submissionCard}>
              <View style={styles.submissionHeader}>
                <View style={styles.submissionIconWrap}>
                  <Ionicons name="document-text" size={20} color="#5F6368" />
                </View>
                <View style={styles.submissionInfo}>
                  <Text style={styles.submissionFileName}>{submission.file_name}</Text>
                  <Text style={styles.submissionDate}>
                    Submitted {new Date(submission.uploaded_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleViewSubmission}
                  style={styles.viewButton}
                >
                  <Ionicons name="eye-outline" size={18} color="#1967D2" />
                </TouchableOpacity>
              </View>
              
              {statusCfg && (
                <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                  <Ionicons name={statusCfg.icon as any} size={16} color={statusCfg.color} />
                  <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                </View>
              )}

              {/* Status-specific content */}
              {reviewStatus === 'revised' && (
                <Text style={styles.statusHint}>Your teacher has requested revisions. Please resubmit below.</Text>
              )}
              
              {reviewStatus === 'for_consultation' && (
                <>
                  {consultationRequest &&
                   ['pending', 'ai_processing', 'awaiting_teacher'].includes(consultationRequest.status) ? (
                    <View style={styles.consultationBooked}>
                      <Ionicons name="checkmark-circle" size={16} color="#137333" />
                      <Text style={styles.consultationBookedText}>
                        Consultation requested. Awaiting teacher response.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.statusHint}>
                        Your teacher recommends scheduling a consultation.
                      </Text>
                      <TouchableOpacity style={styles.consultationButton} onPress={requestConsultation}>
                        <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.consultationButtonText}>Request consultation</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}

              {reviewStatus === 'consultation_requested' && consultationRequest?.status === 'accepted' && (
                <View style={styles.consultationApproved}>
                  <View style={styles.consultationApprovedHeader}>
                    <Ionicons name="checkmark-circle" size={16} color="#137333" />
                    <Text style={styles.consultationApprovedTitle}>Consultation scheduled</Text>
                  </View>
                  {consultationRequest.scheduled_start_time && (
                    <Text style={styles.consultationDetails}>
                      {new Date(consultationRequest.scheduled_start_time).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })} at {new Date(consultationRequest.scheduled_start_time).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit' 
                      })}
                      {consultationRequest.classroom_number && ` • Room ${consultationRequest.classroom_number}`}
                    </Text>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noSubmissionCard}>
              <Ionicons name="document-outline" size={48} color="#DADCE0" />
              <Text style={styles.noSubmissionTitle}>No submission</Text>
              <Text style={styles.noSubmissionText}>
                {isDeadlinePassed ? 'The deadline has passed' : 'Attach your work and turn it in'}
              </Text>
            </View>
          )}

          {/* Upload Section */}
          {canSubmit && (
            <View style={styles.uploadSection}>
              {selectedFile ? (
                <View style={styles.selectedFileCard}>
                  <View style={styles.selectedFileHeader}>
                    <Ionicons name="document-text" size={20} color="#5F6368" />
                    <View style={styles.selectedFileInfo}>
                      <Text style={styles.selectedFileName}>{selectedFile.name}</Text>
                      <Text style={styles.selectedFileSize}>
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedFile(null)} style={styles.removeFileButton}>
                      <Ionicons name="close" size={20} color="#5F6368" />
                    </TouchableOpacity>
                  </View>
                  
                  {!isImageFile(selectedFile.name, selectedFile.mimeType) && (
                    <TouchableOpacity
                      style={styles.analyzeButton}
                      onPress={() => performPlagiarismCheck(selectedFile)}
                    >
                      <Ionicons name="shield-checkmark-outline" size={16} color="#1967D2" />
                      <Text style={styles.analyzeButtonText}>Check academic integrity</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <TouchableOpacity style={styles.addFileButton} onPress={handleChooseFile}>
                  <Ionicons name="add" size={24} color="#1967D2" />
                  <Text style={styles.addFileText}>Add or create</Text>
                </TouchableOpacity>
              )}

              {showAttachMenu && (
                <View style={styles.attachMenu}>
                  <TouchableOpacity style={styles.attachOption} onPress={pickDocumentAttachment}>
                    <Ionicons name="document-text-outline" size={20} color="#5F6368" />
                    <Text style={styles.attachOptionText}>Upload file</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.attachOption} onPress={pickImageAttachment}>
                    <Ionicons name="camera-outline" size={20} color="#5F6368" />
                    <Text style={styles.attachOptionText}>Use camera</Text>
                  </TouchableOpacity>
                </View>
              )}

              {selectedFile && (
                <TouchableOpacity
                  style={[styles.turnInButton, uploading && styles.turnInButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.turnInButtonText}>
                        {submission ? 'Resubmit' : 'Turn in'}
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Private Comments */}
          {submission && (
            <TouchableOpacity style={styles.commentsButton} onPress={openComments}>
              <Ionicons name="chatbubble-outline" size={20} color="#5F6368" />
              <Text style={styles.commentsButtonText}>Private comments</Text>
              <Ionicons name="chevron-forward" size={16} color="#5F6368" />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Plagiarism Check Modal */}
      <Modal
        visible={showPlagiarismModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowPlagiarismModal(false)}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowPlagiarismModal(false)} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={C.ink2} />
          </TouchableOpacity>
          <Text style={styles.title}>Academic Integrity Check</Text>
        </View>
        <ScrollView style={styles.plagiarismContainer}>
          {checkingPlagiarism ? (
            <View style={styles.checkingContainer}>
              <ActivityIndicator size="large" color={C.ink2} />
              <Text style={styles.checkingText}>Analyzing document...</Text>
              <Text style={styles.checkingSubtext}>This may take a moment</Text>
            </View>
          ) : (
            <>
              {plagiarismResults.map((result, index) => (
                <View key={index} style={styles.plagiarismCard}>
                  <View style={styles.plagiarismHeader}>
                    <Ionicons name="shield-checkmark" size={20} color={C.ink2} />
                    <Text style={styles.plagiarismFileName}>{result.fileName}</Text>
                  </View>

                  {result.error ? (
                    <View style={styles.plagiarismErrorContainer}>
                      <Ionicons name="alert-circle" size={20} color={C.red} />
                      <Text style={styles.plagiarismErrorText}>{result.error}</Text>
                    </View>
                  ) : result.originalityScore !== null ? (
                    <>
                      <View style={styles.scoreContainer}>
                        <Text style={styles.scoreLabel}>Originality Score</Text>
                        <View
                          style={[
                            styles.scoreCircle,
                            result.originalityScore >= 70 ? styles.scoreCircleGood : styles.scoreCircleRisk,
                          ]}
                        >
                          <Text
                            style={[
                              styles.scoreValue,
                              result.originalityScore >= 70 ? styles.scoreGood : styles.scoreRisk,
                            ]}
                          >
                            {result.originalityScore}%
                          </Text>
                        </View>
                      </View>

                      {result.isHighRisk ? (
                        <View style={styles.warningBox}>
                          <Ionicons name="warning" size={18} color="#92400E" />
                          <Text style={styles.warningText}>
                            This document has a low originality score. Please review your sources and citations.
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.successBox}>
                          <Ionicons name="checkmark-circle" size={18} color="#065F46" />
                          <Text style={styles.successText}>
                            This document appears to have acceptable originality.
                          </Text>
                        </View>
                      )}
                    </>
                  ) : null}
                </View>
              ))}

              <View style={styles.plagiarismActions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setShowPlagiarismModal(false)}
                >
                  <Text style={styles.secondaryButtonText}>Go Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={proceedWithSubmission}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color={C.actionText} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Submit Anyway</Text>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.disclaimerText}>
                The results shown here will also be visible to your teacher.
              </Text>
            </>
          )}
        </ScrollView>
      </Modal>

      <FileViewerModal
        visible={fileViewer.visible}
        url={fileViewer.url}
        fileName={fileViewer.name}
        isImage={fileViewer.isImage}
        onClose={() => setFileViewer(v => ({ ...v, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  errorText: { fontSize: 16, color: C.ink4 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#202124',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: { width: 40 },

  // Content
  content: { flex: 1 },

  // Assignment Card
  assignmentCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DADCE0',
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  assignmentIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F0FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  assignmentInfo: { flex: 1 },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#202124',
    marginBottom: 4,
  },
  assignmentTeacher: {
    fontSize: 14,
    color: '#5F6368',
  },
  assignmentDescription: {
    fontSize: 14,
    color: '#202124',
    lineHeight: 20,
    marginTop: 8,
  },
  dueBadge: {
    backgroundColor: '#F1F3F4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dueBadgeOverdue: {
    backgroundColor: '#FCE8E6',
  },
  dueText: {
    fontSize: 12,
    color: '#5F6368',
    fontWeight: '500',
  },
  dueTextOverdue: {
    color: '#D93025',
  },

  // Work Section
  workSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DADCE0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#202124',
    marginBottom: 16,
  },

  // Submission Card
  submissionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  submissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  submissionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  submissionInfo: { flex: 1 },
  submissionFileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#202124',
  },
  submissionDate: {
    fontSize: 12,
    color: '#5F6368',
    marginTop: 2,
  },
  viewButton: {
    padding: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusHint: {
    fontSize: 13,
    color: '#5F6368',
    marginBottom: 8,
  },

  // Consultation elements
  consultationBooked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
  },
  consultationBookedText: {
    fontSize: 12,
    color: '#137333',
  },
  consultationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1967D2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  consultationButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  consultationApproved: {
    backgroundColor: '#E6F4EA',
    padding: 8,
    borderRadius: 4,
  },
  consultationApprovedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  consultationApprovedTitle: {
    fontSize: 13,
    color: '#137333',
    fontWeight: '500',
  },
  consultationDetails: {
    fontSize: 12,
    color: '#137333',
  },

  // No Submission Card
  noSubmissionCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noSubmissionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#5F6368',
    marginTop: 12,
    marginBottom: 4,
  },
  noSubmissionText: {
    fontSize: 14,
    color: '#9AA0A6',
    textAlign: 'center',
  },

  // Upload Section
  uploadSection: {
    marginTop: 16,
  },
  selectedFileCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  selectedFileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedFileInfo: { flex: 1, marginLeft: 12 },
  selectedFileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#202124',
  },
  selectedFileSize: {
    fontSize: 12,
    color: '#5F6368',
    marginTop: 2,
  },
  removeFileButton: {
    padding: 4,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#E8F0FE',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  analyzeButtonText: {
    fontSize: 12,
    color: '#1967D2',
    fontWeight: '500',
  },

  // Add File Button
  addFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  addFileText: {
    fontSize: 14,
    color: '#1967D2',
    fontWeight: '500',
  },

  // Attach Menu
  attachMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DADCE0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  attachOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  attachOptionText: {
    fontSize: 14,
    color: '#202124',
  },

  // Turn In Button
  turnInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1967D2',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  turnInButtonDisabled: {
    opacity: 0.5,
  },
  turnInButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },

  // Comments Button
  commentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginTop: 16,
  },
  commentsButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#202124',
  },

  // Legacy styles for compatibility
  title: { fontSize: 24, fontWeight: '600' as const, color: C.ink1, flex: 1 },

  // Modal styles (keeping existing plagiarism modal styles)
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface,
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  plagiarismContainer: {
    flex: 1,
    padding: S.lg,
    backgroundColor: 'transparent',
  },
  checkingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: S.xl2 * 2,
  },
  checkingText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: C.ink1,
    marginTop: S.lg,
  },
  checkingSubtext: {
    fontSize: 14,
    color: C.ink3,
    marginTop: S.xs,
  },
  plagiarismCard: {
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S.lg,
    marginBottom: S.md,
    borderWidth: 1,
    borderColor: C.border,
    ...shadow.soft,
  },
  plagiarismHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: S.md,
    gap: S.sm,
  },
  plagiarismFileName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: C.ink1,
    flex: 1,
  },
  plagiarismErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    padding: S.md,
    backgroundColor: '#FEE2E2',
    borderRadius: R.sm,
  },
  plagiarismErrorText: {
    fontSize: 13,
    color: C.red,
    flex: 1,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: S.md,
    paddingVertical: S.md,
    backgroundColor: C.surfaceAlt,
    borderRadius: R.sm,
  },
  scoreLabel: {
    fontSize: 14,
    color: C.ink2,
    fontWeight: '500' as const,
    marginBottom: S.sm,
    textAlign: 'center',
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: R.full,
    borderWidth: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: C.surface,
  },
  scoreCircleGood: {
    borderColor: '#10B981',
  },
  scoreCircleRisk: {
    borderColor: C.red,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  scoreGood: {
    color: C.ink1,
  },
  scoreRisk: {
    color: C.red,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    padding: S.md,
    backgroundColor: '#FEF3C7',
    borderRadius: R.sm,
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    padding: S.md,
    backgroundColor: '#D1FAE5',
    borderRadius: R.sm,
  },
  successText: {
    fontSize: 13,
    color: '#065F46',
    flex: 1,
  },
  plagiarismActions: {
    flexDirection: 'row',
    gap: S.md,
    marginTop: S.lg,
    marginBottom: S.md,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: C.action,
    borderRadius: R.full,
    paddingVertical: S.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: C.actionText,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.full,
    paddingVertical: S.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: C.ink2,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  disclaimerText: {
    fontSize: 12,
    color: C.ink4,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: S.sm,
  },
});
