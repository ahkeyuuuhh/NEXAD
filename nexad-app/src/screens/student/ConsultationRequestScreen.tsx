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
import type { ConsultationTopic, UrgencyLevel, TimeSlot } from '../../types';

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

    // Simulate AI response (replace with actual AI service call)
    setTimeout(() => {
      const aiResponse: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateAIResponse(userMessage.content, helpNeeded, reason),
        timestamp: new Date(),
      };
      setAiMessages(prev => [...prev, aiResponse]);
      setIsAIThinking(false);
    }, 1500);
  };

  const generateAIResponse = (userQuery: string, topic: string, details: string): string => {
    // Simple rule-based responses (replace with actual AI integration)
    const lowerQuery = userQuery.toLowerCase();

    if (lowerQuery.includes('how') || lowerQuery.includes('what')) {
      return `Based on your request about "${topic}", I suggest including:\n\n1. Specific topics or chapters you need help with\n2. Your current understanding level\n3. Any specific questions or problems you're facing\n4. Your preferred meeting time\n\nWould you like help adding any of these details?`;
    } else if (lowerQuery.includes('time') || lowerQuery.includes('when')) {
      return `For scheduling, consider:\n- Your teacher's office hours\n- Your availability this week\n- Whether this is urgent or can wait\n\nWould you like to add preferred time slots to your request?`;
    } else if (lowerQuery.includes('urgent')) {
      return `I notice this might be urgent. I recommend:\n1. Marking it as urgent when submitting\n2. Being specific about deadlines\n3. Providing all relevant context upfront\n\nShould I help you structure an urgent request?`;
    } else {
      return `I can help you improve your consultation request. Consider:\n- Being specific about your needs\n- Mentioning any materials to review beforehand\n- Suggesting preferred times\n\nWhat aspect would you like to clarify?`;
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
              <Text style={styles.inputLabel}>Reason *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter your reason here"
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* AI Assistant Prompt */}
            <View style={styles.aiPromptCard}>
              <Text style={styles.aiPromptTitle}>You may ask for assistance with Nexad</Text>
              <View style={styles.aiCharacterPlaceholder}>
                <View style={styles.aiIcon}>
                  <Text style={styles.aiIconText}>🤖</Text>
                </View>
                <Text style={styles.aiPlaceholderText}>
                  AI Assistant ready to help
                </Text>
              </View>
              <TouchableOpacity
                style={styles.openAIButton}
                onPress={() => setShowAIAssistant(true)}
              >
                <Text style={styles.openAIButtonText}>Chat with Nexad AI →</Text>
              </TouchableOpacity>
            </View>

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
});
