import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { classroomService } from '../../services/classroomService';
import { documentService } from '../../services/documentService';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

export default function AttachmentBinSubmissionScreen({ navigation, route }: any) {
  const { binId } = route.params as { binId: string };
  const { user } = useAuth();

  const [bin, setBin] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  useEffect(() => {
    loadBinData();
  }, []);

  const loadBinData = async () => {
    try {
      const binResult = await classroomService.getAttachmentBin(binId);
      if (binResult.data) {
        setBin(binResult.data);
      }

      // Check if student has already submitted
      if (user?.user_id) {
        const submissionResult = await classroomService.getStudentBinSubmission(
          binId,
          user.user_id
        );
        if (submissionResult.data) {
          setSubmission(submissionResult.data);
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
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please choose a file first');
      return;
    }

    if (!user?.user_id) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setUploading(true);
    try {
      // Upload the document first
      const uploadResult = await documentService.uploadDocument(
        selectedFile.uri,
        selectedFile.name,
        user.user_id
      );

      if (uploadResult.error) {
        Alert.alert('Error', uploadResult.error);
        return;
      }

      if (!uploadResult.data) {
        Alert.alert('Error', 'Failed to upload document');
        return;
      }

      // Link the uploaded document to the bin
      const submitResult = await classroomService.submitToAttachmentBin(
        binId,
        uploadResult.data.id
      );

      if (submitResult.error) {
        Alert.alert('Error', submitResult.error);
        return;
      }

      Alert.alert('Success', 'Document submitted successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error submitting document:', error);
      Alert.alert('Error', 'Failed to submit document');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#34C759" />
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FF9500" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          Submit to Bin
        </Text>
      </View>

      {/* Bin Info */}
      <View style={styles.binInfoCard}>
        <View style={styles.binIconContainer}>
          <Ionicons name="folder" size={32} color="#FF9500" />
        </View>
        <Text style={styles.binTitle}>{bin.title}</Text>
        {bin.description && <Text style={styles.binDescription}>{bin.description}</Text>}
        
        <View style={styles.binMetaRow}>
          <View style={styles.binMetaItem}>
            <Ionicons name="person" size={16} color="#666" />
            <Text style={styles.binMetaText}>
              {bin.users?.first_name} {bin.users?.last_name}
            </Text>
          </View>
          {bin.deadline && (
            <View style={[styles.binMetaItem, isDeadlinePassed && styles.deadlinePassed]}>
              <Ionicons
                name="time-outline"
                size={16}
                color={isDeadlinePassed ? '#FF3B30' : '#666'}
              />
              <Text style={[styles.binMetaText, isDeadlinePassed && styles.deadlinePassedText]}>
                {isDeadlinePassed ? 'Deadline passed' : 'Due'}: {new Date(bin.deadline).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Existing Submission */}
      {submission && (
        <View style={styles.submissionCard}>
          <View style={styles.submissionHeader}>
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            <Text style={styles.submissionTitle}>Already Submitted</Text>
          </View>
          <View style={styles.documentInfo}>
            <Ionicons name="document-text" size={20} color="#666" />
            <Text style={styles.documentName}>{submission.file_name}</Text>
          </View>
          <Text style={styles.submissionDate}>
            Submitted on {new Date(submission.uploaded_at).toLocaleDateString()}
          </Text>
          <Text style={styles.submissionHint}>
            You can submit again to replace your previous submission
          </Text>
        </View>
      )}

      {/* Upload Section */}
      {!isDeadlinePassed && (
        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>
            {submission ? 'Replace Submission' : 'Submit Document'}
          </Text>

          {selectedFile ? (
            <View style={styles.selectedFileCard}>
              <View style={styles.fileInfo}>
                <Ionicons name="document-text" size={24} color="#007AFF" />
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName}>{selectedFile.name}</Text>
                  <Text style={styles.fileSize}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedFile(null)}>
                <Ionicons name="close-circle" size={24} color="#999" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.chooseFileButton} onPress={handleChooseFile}>
              <Ionicons name="cloud-upload-outline" size={32} color="#007AFF" />
              <Text style={styles.chooseFileText}>Choose File</Text>
              <Text style={styles.chooseFileHint}>Tap to select a document</Text>
            </TouchableOpacity>
          )}

          <View style={styles.aiNotice}>
            <Ionicons name="sparkles" size={16} color="#007AFF" />
            <Text style={styles.aiNoticeText}>
              Your submission will be analyzed by AI to provide insights to your teacher
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedFile || uploading) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!selectedFile || uploading}
          >
            {uploading ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={styles.submitButtonText}>Submitting...</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Document</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isDeadlinePassed && !submission && (
        <View style={styles.deadlineCard}>
          <Ionicons name="time-outline" size={48} color="#FF3B30" />
          <Text style={styles.deadlineTitle}>Deadline Passed</Text>
          <Text style={styles.deadlineText}>
            Submissions are no longer accepted for this bin
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  binInfoCard: {
    backgroundColor: '#FFF3E0',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  binIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  binTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  binDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  binMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  binMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  binMetaText: {
    fontSize: 12,
    color: '#666',
  },
  deadlinePassed: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deadlinePassedText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  submissionCard: {
    backgroundColor: '#E8F5E9',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
  },
  submissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  submissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  documentName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  submissionDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  submissionHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  uploadSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 40,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  chooseFileButton: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    marginBottom: 16,
  },
  chooseFileText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 12,
  },
  chooseFileHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  selectedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
  },
  aiNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  aiNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#007AFF',
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deadlineCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 40,
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  deadlineTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 8,
  },
  deadlineText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
