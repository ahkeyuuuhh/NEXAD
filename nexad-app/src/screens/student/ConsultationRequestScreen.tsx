import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { C, F, T, S, R, shadow } from '../../config/theme';
import { useAuth } from '../../contexts/AuthContext';
import { consultationService } from '../../services/consultationService';
import { notificationService } from '../../services/notificationService';
import { aiService } from '../../services/aiService';
import { profileService } from '../../services/profileService';
import { documentService } from '../../services/documentService';
import { classroomService } from '../../services/classroomService';
import type { ConsultationTopic, UrgencyLevel, TimeSlot, UploadedDocument } from '../../types';

const REASON_PRESETS = [
  'Academic Support',
  'Career Guidance',
  'Research Consultation',
  'Course Content Clarification',
  'Project Assistance',
  'Exam Preparation',
  'Personal Development',
  'Other',
];

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ConsultationRequestScreen({ navigation, route }: any) {
  const { teacher, sourceDocumentId, sourceBinId } = route.params;
  const { user } = useAuth();

  const [helpNeeded, setHelpNeeded] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [reason, setReason] = useState('');
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [hasOfferedHelp, setHasOfferedHelp] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string>('');
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m Nexad, your AI consultation assistant. I can help you refine your request and suggest additional information that might be helpful for your teacher.',
      timestamp: new Date(),
    },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const handlePresetSelect = (preset: string) => {
    setSelectedPreset(preset);
    setShowPresetDropdown(false);
    if (preset !== 'Other' && !reason.includes(preset)) {
      setReason(prev => prev ? `${prev}\n${preset}` : preset);
    }
  };

  // Handle file upload
  const handleFileUpload = async () => {
    try {
      setIsUploadingFile(true);
      const pickResult = await documentService.pickDocument();
      
      if (pickResult.error) {
        if (pickResult.error !== 'Document selection cancelled') {
          Alert.alert('Error', pickResult.error);
        }
        return;
      }

      if (pickResult.data && !pickResult.data.canceled) {
        const file = pickResult.data.assets[0];
        // Store temporarily until consultation is created
        setUploadedDocuments(prev => [...prev, file]);
        Alert.alert('Success', `${file.name} added! It will be uploaded when you submit.`);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to pick document');
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Handle "Done" button press to show AI suggestions
  const handleDoneReason = async () => {
    if (!helpNeeded || !reason) {
      Alert.alert('Missing Information', 'Please enter what you need help with and your reason first.');
      return;
    }

    try {
      setIsAIThinking(true);
      const result = await aiService.askForPreparationAssistance(
        helpNeeded,
        reason,
        selectedPreset
      );

      if (result.needsHelp && result.suggestions.length > 0) {
        const draftMessage = result.isProjectRelated && result.shouldUploadDraft
          ? '\n\n📎 PROJECT DETECTED: I recommend uploading a draft or progress document!'
          : '';
        
        const suggestionsText = `I see you're requesting help with "${helpNeeded}".${draftMessage}\n\n📋 Here are my suggestions:\n${result.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n💡 You can also chat with me for more personalized help!`;
        setAiSuggestions(suggestionsText);
        setShowAiSuggestions(true);
        
        // Also add to chat messages for the modal
        const helpOffer: AIMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `I see you're requesting help with "${helpNeeded}". Would you like some assistance preparing for this consultation?${draftMessage}\n\n📋 I can help you:\n• Prepare materials to bring\n• Suggest questions to ask\n• Review what to expect\n• Improve your request clarity${result.isProjectRelated ? '\n• Recommend uploading drafts' : ''}\n\nAsk me anything!`,
          timestamp: new Date(),
        };
        setAiMessages(prev => [...prev, helpOffer]);
      } else {
        setAiSuggestions('Your request looks good! Feel free to submit or ask me anything in the chat.');
        setShowAiSuggestions(true);
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      Alert.alert('Error', 'Failed to generate AI suggestions');
    } finally {
      setIsAIThinking(false);
    }
  };

  const handleAISubmit = async () => {
    if (!aiInput.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: aiInput.trim(),
      timestamp: new Date(),
    };

    setAiMessages(prev => [...prev, userMessage]);
    setAiInput('');
    setIsAIThinking(true);

    try {
      // Use actual AI service
      const aiResponseText = await aiService.generateAIChatResponse(
        userMessage.content,
        {
          subjectLine: helpNeeded,
          description: reason,
          category: selectedPreset,
        }
      );

      const aiResponse: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponseText,
        timestamp: new Date(),
      };
      
      setAiMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('AI response error:', error);
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I\'m having trouble processing your request. Please try rephrasing your question.',
        timestamp: new Date(),
      };
      setAiMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAIThinking(false);
    }
  };



  const handleSubmitRequest = async () => {
    if (!helpNeeded.trim()) {
      Alert.alert('Required Field', 'Please specify what you need help with');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Required Field', 'Please provide a reason for your consultation');
      return;
    }

    setIsSubmitting(true);

    try {
      const requestData = {
        student_id: user?.user_id,
        teacher_id: teacher.user_id,
        topic: 'academic' as ConsultationTopic, // Default, could be made selectable
        subject_line: helpNeeded,
        description: reason,
        urgency: 'normal' as UrgencyLevel,
        status: 'pending' as const,
        submitted_at: new Date().toISOString(),
      };

      const result = await consultationService.createRequest(requestData);

      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      // Upload documents if any
      if (uploadedDocuments.length > 0 && result.data?.id) {
        let uploadFailures: string[] = [];
        for (const doc of uploadedDocuments) {
          const uploadResult = await documentService.uploadDocument(
            doc,
            result.data.id,
            undefined,
            user?.user_id
          );
          if (uploadResult.error) {
            console.error('Failed to upload document:', uploadResult.error);
            uploadFailures.push(doc.name || 'Unknown file');
          }
        }
        if (uploadFailures.length > 0) {
          Alert.alert(
            'File Upload Failed',
            `The following file(s) could not be uploaded:\n${uploadFailures.join('\n')}\n\nYour consultation request was still submitted, but please try re-attaching the files.`
          );
          setIsSubmitting(false);
          return;
        }
      }

      // Get student name first
      const studentProfile = await profileService.getStudentProfile(user?.user_id!);
      const studentName = studentProfile.data 
        ? `${studentProfile.data.first_name} ${studentProfile.data.last_name}`
        : 'A student';

      // Generate AI Smart Brief for the teacher (pass uploaded file names)
      if (result.data?.id) {
        const docNames = uploadedDocuments.map((d: any) => d.name || d.file_name || 'Unknown file');
        const aiResult = await aiService.generateSmartBrief(
          result.data.id,
          studentName,
          helpNeeded,
          reason,
          'normal',
          'academic',
          docNames
        );

        if (aiResult.error) {
          console.error('AI Smart Brief generation failed:', aiResult.error);
          // Continue anyway - brief is helpful but not critical
        } else {
          console.log('AI Smart Brief generated successfully');
        }
      }

      // NOTE: DB trigger (notify_teacher_new_request) automatically notifies the teacher
      // on INSERT into consultation_requests, so no manual notification call is needed here.
      // We also send a device push directly to ensure the teacher hears a sound immediately.
      notificationService.sendPushToUser(
        teacher.user_id,
        'New Consultation Request',
        `${studentName} sent a consultation request: "${helpNeeded}"`,
        { type: 'request_submitted', consultationRequestId: result.data?.id }
      ).catch(() => {});

      // If triggered from an attachment bin, mark the document as consultation_requested
      // so the bin screen immediately reflects the booking.
      if (sourceDocumentId) {
        await classroomService.updateSubmissionStatus(sourceDocumentId, 'consultation_requested');
      }

      Alert.alert(
        'Request Submitted',
        `Your consultation request has been sent to ${teacher.first_name} ${teacher.last_name}. You'll be notified when they respond.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (sourceBinId) {
                // Go back to the bin screen so the student sees the updated status
                navigation.navigate('AttachmentBinSubmission', { binId: sourceBinId });
              } else {
                navigation.navigate('StudentDashboard');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting request:', error);
      Alert.alert('Error', 'Failed to submit consultation request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Gradient background */}
      <LinearGradient
        colors={['#FFFFFF', '#EDF0F4', '#D8DCE3']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="dark-content" />
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={C.ink1} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Consultation</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} ref={scrollViewRef}>
          {/* Teacher Info Card */}
          <View style={styles.teacherCard}>
            <LinearGradient
              colors={['#202124', '#3C4043']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.teacherCardBanner}
            >
              <View style={styles.teacherAvatar}>
                {teacher.profile_photo_url ? (
                  <Image source={{ uri: teacher.profile_photo_url }} style={styles.teacherAvatarImg} />
                ) : (
                  <Text style={styles.teacherAvatarText}>
                    {teacher.first_name[0]}{teacher.last_name[0]}
                  </Text>
                )}
              </View>
              <View style={styles.teacherInfo}>
                <Text style={styles.teacherName}>
                  {teacher.first_name} {teacher.last_name}
                </Text>
                {teacher.department && (
                  <Text style={styles.teacherDepartment}>{teacher.department}</Text>
                )}
                {teacher.position && (
                  <Text style={styles.teacherPosition}>{teacher.position}</Text>
                )}
              </View>
              <Ionicons name="person" size={22} color="rgba(255,255,255,0.25)" />
            </LinearGradient>
          </View>

          {/* AI Powered Request Form */}
          <View style={styles.formSection}>

            {/* What you need help with */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>What you need help with? *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Understanding calculus concepts"
                value={helpNeeded}
                onChangeText={setHelpNeeded}
                placeholderTextColor={C.ink4}
              />
            </View>

            {/* Reason Preset Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowPresetDropdown(!showPresetDropdown)}
              >
                <Text style={styles.dropdownButtonText}>
                  {selectedPreset || 'Select a category'}
                </Text>
                <Text style={styles.dropdownIcon}>{showPresetDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {showPresetDropdown && (
                <View style={styles.dropdown}>
                  <ScrollView style={styles.dropdownScroll}>
                    {REASON_PRESETS.map((preset, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.dropdownOption}
                        onPress={() => handlePresetSelect(preset)}
                      >
                        <Text style={[
                          styles.dropdownOptionText,
                          selectedPreset === preset && styles.selectedOptionText
                        ]}>
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Reason Details */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Reason *</Text>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={handleDoneReason}
                  disabled={isAIThinking || !helpNeeded || !reason}
                >
                  {isAIThinking ? (
                    <ActivityIndicator size="small" color={C.actionText} />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.xs }}>
                      <Ionicons name="checkmark" size={14} color={C.actionText} />
                      <Text style={styles.doneButtonText}>Done</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter your reason here, then tap 'Done' to get AI suggestions"
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor={C.ink4}
              />
            </View>

            {/* File Upload Section */}
            <View style={styles.uploadSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.xs, marginBottom: S.xs }}>
                <Ionicons name="attach" size={16} color={C.ink2} />
                <Text style={styles.uploadLabel}>Upload Documents (Optional)</Text>
              </View>
              <Text style={styles.uploadHint}>DOCX only, up to 5MB</Text>
              
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleFileUpload}
                disabled={isUploadingFile}
              >
                {isUploadingFile ? (
                  <ActivityIndicator size="small" color={C.action} />
                ) : (
                  <>
                    <Ionicons name="document-outline" size={20} color={C.action} />
                    <Text style={styles.uploadButtonText}>Choose File</Text>
                  </>
                )}
              </TouchableOpacity>

              {uploadedDocuments.length > 0 && (
                <View style={styles.uploadedFilesList}>
                  {uploadedDocuments.map((doc, index) => (
                    <View key={index} style={styles.uploadedFileItem}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.xs, flex: 1 }}>
                        <Ionicons name="checkmark" size={16} color={C.ink1} />
                        <Text style={styles.uploadedFileName}>{doc.name}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setUploadedDocuments(prev => prev.filter((_, i) => i !== index));
                        }}
                      >
                        <Ionicons name="close" size={18} color={C.ink4} style={{ paddingHorizontal: S.sm }} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* AI Assistant Auto-Suggestions */}
            {showAiSuggestions && (
              <View style={styles.aiSuggestionsCard}>
                <View style={styles.aiSuggestionsHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                    <Ionicons name="sparkles-outline" size={18} color={C.ink1} />
                    <Text style={styles.aiSuggestionsTitle}>Nexad AI Suggestions</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowAiSuggestions(false)}
                    style={styles.closeSuggestionsButton}
                  >
                    <Ionicons name="close" size={20} color={C.ink3} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.aiSuggestionsText}>{aiSuggestions}</Text>
                <TouchableOpacity
                  style={styles.chatWithAiButton}
                  onPress={() => setShowAIAssistant(true)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                    <Ionicons name="chatbubbles-outline" size={16} color={C.actionText} />
                    <Text style={styles.chatWithAiButtonText}>Chat with Nexad for More Help</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmitRequest}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={C.actionText} />
              ) : (
                <Text style={styles.submitButtonText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* AI Assistant Modal */}
        <Modal
          visible={showAIAssistant}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAIAssistant(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ask Nexad</Text>
              <TouchableOpacity
                onPress={() => setShowAIAssistant(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={C.ink3} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.chatContainer}>
              {aiMessages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    message.role === 'user' ? styles.userMessage : styles.aiMessage,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.role === 'user' && styles.userMessageText,
                    ]}
                  >
                    {message.content}
                  </Text>
                </View>
              ))}
              {isAIThinking && (
                <View style={[styles.messageBubble, styles.aiMessage]}>
                  <ActivityIndicator size="small" color={C.ink1} />
                  <Text style={styles.thinkingText}>Nexad is thinking...</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.chatInput}
                placeholder="Ask Nexad..."
                value={aiInput}
                onChangeText={setAiInput}
                placeholderTextColor={C.ink4}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, !aiInput.trim() && styles.sendButtonDisabled]}
                onPress={handleAISubmit}
                disabled={!aiInput.trim() || isAIThinking}
              >
                <Ionicons name="arrow-forward" size={22} color={C.actionText} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: R.full,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
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
  },
  teacherCard: {
    marginBottom: S.sm,
    marginHorizontal: S.lg,
    borderRadius: R.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  teacherCardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: S.md,
    paddingVertical: S.lg,
  },
  teacherAvatar: {
    width: 42,
    height: 42,
    borderRadius: R.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: S.md,
  },
  teacherAvatarText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  teacherAvatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 2,
  },
  teacherDepartment: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.7)',
  },
  teacherPosition: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
  },
  formSection: {
    backgroundColor: 'transparent',
    padding: S.lg,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: C.ink1,
    marginBottom: S.xl,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: S.xl,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: C.ink2,
    marginBottom: S.sm,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.65)',
    borderRadius: R.lg,
    paddingHorizontal: S.md,
    paddingVertical: S.md,
    fontSize: 16,
    fontWeight: '400' as const,
    color: C.ink1,
  },
  textArea: {
    minHeight: 100,
    paddingTop: S.md,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
    borderRadius: R.full,
    paddingHorizontal: S.md,
    paddingVertical: S.md,
  },
  dropdownButtonText: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: C.ink1,
  },
  dropdownIcon: {
    fontSize: 12,
    color: C.ink3,
  },
  dropdown: {
    backgroundColor: C.surface,
    borderRadius: R.sm,
    marginTop: S.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
    maxHeight: 200,
    overflow: 'hidden',
    ...shadow.card,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownOption: {
    paddingVertical: S.md,
    paddingHorizontal: S.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.borderLight,
  },
  dropdownOptionText: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: C.ink1,
  },
  selectedOptionText: {
    color: C.action,
    fontWeight: '600' as const,
  },
  aiPromptCard: {
    backgroundColor: C.surfaceAlt,
    borderRadius: R.md,
    padding: S.lg,
    marginBottom: S.xl2,
    alignItems: 'center',
    ...shadow.soft,
  },
  aiPromptTitle: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink3,
    marginBottom: S.lg,
    textAlign: 'center',
  },
  aiCharacterPlaceholder: {
    alignItems: 'center',
    marginBottom: S.lg,
  },
  aiIcon: {
    width: 80,
    height: 80,
    borderRadius: R.full,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S.sm,
  },
  aiIconText: {
    fontSize: 40,
  },
  aiPlaceholderText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink4,
    textAlign: 'center',
  },
  openAIButton: {
    paddingVertical: 10,
    paddingHorizontal: S.xl,
  },
  openAIButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: C.action,
  },
  submitButton: {
    backgroundColor: C.action,
    borderRadius: R.full,
    paddingVertical: S.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: S.sm,
  },
  submitButtonDisabled: {
    backgroundColor: C.ink5,
  },
  submitButtonText: {
    color: C.actionText,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  // AI Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: C.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: C.ink1,
  },
  closeButton: {
    padding: S.sm,
  },
  closeButtonText: {
    fontSize: 24,
    color: C.ink3,
  },
  chatContainer: {
    flex: 1,
    padding: S.lg,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: S.md,
    borderRadius: R.lg,
    marginBottom: S.md,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: C.action,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: C.surfaceAlt,
  },
  messageText: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: C.ink1,
    lineHeight: 22,
  },
  userMessageText: {
    color: C.actionText,
  },
  thinkingText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink3,
    fontStyle: 'italic',
    marginTop: S.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: S.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    backgroundColor: C.surface,
  },
  chatInput: {
    flex: 1,
    backgroundColor: C.surfaceAlt,
    borderRadius: R.full,
    paddingHorizontal: S.lg,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '400' as const,
    color: C.ink1,
    maxHeight: 100,
    marginRight: S.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: R.full,
    backgroundColor: C.action,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: C.ink5,
  },
  sendButtonText: {
    fontSize: 24,
    color: C.actionText,
    fontWeight: '600' as const,
  },
  // Done Button Styles
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S.sm,
  },
  doneButton: {
    backgroundColor: C.action,
    paddingHorizontal: S.lg,
    paddingVertical: 6,
    borderRadius: R.full,
    minWidth: 70,
    alignItems: 'center',
  },
  doneButtonText: {
    color: C.actionText,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  // File Upload Styles
  uploadSection: {
    marginBottom: S.xl,
    padding: S.lg,
    backgroundColor: C.surfaceRaised,
    borderRadius: R.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: C.ink2,
  },
  uploadHint: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: C.ink3,
    marginBottom: S.md,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.action,
    borderRadius: R.full,
    paddingVertical: S.md,
    paddingHorizontal: S.lg,
    borderStyle: 'dashed',
    ...shadow.soft,
  },
  uploadButtonIcon: {
    fontSize: 20,
    marginRight: S.sm,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: C.action,
  },
  uploadedFilesList: {
    marginTop: S.md,
  },
  uploadedFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    padding: S.md,
    borderRadius: R.xs,
    marginBottom: S.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
  },
  uploadedFileName: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink1,
    flex: 1,
  },
  removeFileButton: {
    fontSize: 18,
    color: C.ink4,
    paddingHorizontal: S.sm,
  },
  // AI Suggestions Styles
  aiSuggestionsCard: {
    backgroundColor: C.surfaceRaised,
    borderRadius: R.md,
    padding: S.lg,
    marginBottom: S.xl2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.ink1,
    ...shadow.soft,
  },
  aiSuggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S.md,
  },
  aiSuggestionsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: C.ink1,
  },
  closeSuggestionsButton: {
    padding: S.xs,
  },
  closeSuggestionsText: {
    fontSize: 20,
    color: C.ink3,
  },
  aiSuggestionsText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink2,
    lineHeight: 22,
    marginBottom: S.md,
  },
  chatWithAiButton: {
    backgroundColor: C.action,
    borderRadius: R.sm,
    paddingVertical: 10,
    paddingHorizontal: S.lg,
    alignItems: 'center',
  },
  chatWithAiButtonText: {
    color: C.actionText,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
