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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { consultationService } from '../../services/consultationService';
import { notificationService } from '../../services/notificationService';
import { aiService } from '../../services/aiService';
import { profileService } from '../../services/profileService';
import { documentService } from '../../services/documentService';
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
  const { teacher } = route.params;
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

      Alert.alert(
        'Request Submitted',
        `Your consultation request has been sent to ${teacher.first_name} ${teacher.last_name}. You'll be notified when they respond.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('StudentDashboard'),
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
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Consultation</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} ref={scrollViewRef}>
          {/* Teacher Info */}
          <View style={styles.teacherCard}>
            <View style={styles.teacherAvatar}>
              <Text style={styles.teacherAvatarText}>
                {teacher.first_name[0]}{teacher.last_name[0]}
              </Text>
            </View>
            <View style={styles.teacherInfo}>
              <Text style={styles.teacherName}>
                {teacher.first_name} {teacher.last_name}
              </Text>
              {teacher.department && (
                <Text style={styles.teacherDepartment}>{teacher.department}</Text>
              )}
            </View>
          </View>

          {/* AI Powered Request Form */}
          <View style={styles.formSection}>
            <Text style={styles.formTitle}>AI Powered Request Form</Text>

            {/* What you need help with */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>What you need help with? *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Understanding calculus concepts"
                value={helpNeeded}
                onChangeText={setHelpNeeded}
                placeholderTextColor="#9ca3af"
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
                    <ActivityIndicator size="small" color="#2563eb" />
                  ) : (
                    <Text style={styles.doneButtonText}>✓ Done</Text>
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
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* File Upload Section */}
            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>📎 Upload Documents (Optional)</Text>
              <Text style={styles.uploadHint}>PDF or DOCX, up to 5MB</Text>
              
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleFileUpload}
                disabled={isUploadingFile}
              >
                {isUploadingFile ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <>
                    <Text style={styles.uploadButtonIcon}>📄</Text>
                    <Text style={styles.uploadButtonText}>Choose File</Text>
                  </>
                )}
              </TouchableOpacity>

              {uploadedDocuments.length > 0 && (
                <View style={styles.uploadedFilesList}>
                  {uploadedDocuments.map((doc, index) => (
                    <View key={index} style={styles.uploadedFileItem}>
                      <Text style={styles.uploadedFileName}>✓ {doc.name}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setUploadedDocuments(prev => prev.filter((_, i) => i !== index));
                        }}
                      >
                        <Text style={styles.removeFileButton}>✕</Text>
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
                  <Text style={styles.aiSuggestionsTitle}>🤖 Nexad AI Suggestions</Text>
                  <TouchableOpacity
                    onPress={() => setShowAiSuggestions(false)}
                    style={styles.closeSuggestionsButton}
                  >
                    <Text style={styles.closeSuggestionsText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.aiSuggestionsText}>{aiSuggestions}</Text>
                <TouchableOpacity
                  style={styles.chatWithAiButton}
                  onPress={() => setShowAIAssistant(true)}
                >
                  <Text style={styles.chatWithAiButtonText}>💬 Chat with Nexad for More Help</Text>
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
                <ActivityIndicator color="#fff" />
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
                <Text style={styles.closeButtonText}>✕</Text>
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
                  <ActivityIndicator size="small" color="#2563eb" />
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
                placeholderTextColor="#9ca3af"
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, !aiInput.trim() && styles.sendButtonDisabled]}
                onPress={handleAISubmit}
                disabled={!aiInput.trim() || isAIThinking}
              >
                <Text style={styles.sendButtonText}>→</Text>
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
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
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
  teacherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  teacherAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  teacherAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  teacherDepartment: {
    fontSize: 14,
    color: '#6b7280',
  },
  formSection: {
    backgroundColor: '#fff',
    padding: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#1f2937',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#6b7280',
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#1f2937',
  },
  selectedOptionText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  aiPromptCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  aiPromptTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  aiCharacterPlaceholder: {
    alignItems: 'center',
    marginBottom: 16,
  },
  aiIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  aiIconText: {
    fontSize: 40,
  },
  aiPlaceholderText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  openAIButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  openAIButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#fca5a5',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // AI Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6b7280',
  },
  chatContainer: {
    flex: 1,
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
  },
  messageText: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  thinkingText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f2937',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  sendButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
  },
  // Done Button Styles
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  doneButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // File Upload Styles
  uploadSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderStyle: 'dashed',
  },
  uploadButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  uploadedFilesList: {
    marginTop: 12,
  },
  uploadedFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  uploadedFileName: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  removeFileButton: {
    fontSize: 18,
    color: '#ef4444',
    paddingHorizontal: 8,
  },
  // AI Suggestions Styles
  aiSuggestionsCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  aiSuggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiSuggestionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
  },
  closeSuggestionsButton: {
    padding: 4,
  },
  closeSuggestionsText: {
    fontSize: 20,
    color: '#6b7280',
  },
  aiSuggestionsText: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 22,
    marginBottom: 12,
  },
  chatWithAiButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  chatWithAiButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
