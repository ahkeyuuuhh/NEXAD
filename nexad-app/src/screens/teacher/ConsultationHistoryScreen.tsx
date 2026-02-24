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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { consultationService } from '../../services/consultationService';
import { profileService } from '../../services/profileService';
import { documentService } from '../../services/documentService';
import type { ConsultationRequest } from '../../types';

interface ConsultationWithStudent extends ConsultationRequest {
  studentName: string;
}

export default function ConsultationHistoryScreen({ navigation }: any) {
  const [consultations, setConsultations] = useState<ConsultationWithStudent[]>([]);
  const [filteredConsultations, setFilteredConsultations] = useState<ConsultationWithStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationWithStudent | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedConsultationDocuments, setSelectedConsultationDocuments] = useState<any[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  
  const authContext = useAuth();
  const userId = authContext.user?.user_id;

  const loadConsultations = async () => {
    if (!userId) return;

    try {
      // Get all consultations (completed and cancelled)
      const allConsultations = await consultationService.getAllTeacherConsultations(userId);
      
      // Load student names for each consultation
      const consultationsWithNames = await Promise.all(
        allConsultations.map(async (consultation) => {
          try {
            const profileResponse = await profileService.getStudentProfile(consultation.student_id);
            const profile = profileResponse.data;
            return {
              ...consultation,
              studentName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Student',
            };
          } catch (error) {
            console.error('Error loading student profile:', error);
            return {
              ...consultation,
              studentName: 'Unknown Student',
            };
          }
        })
      );

      // Filter to only show completed and cancelled (history)
      const historyConsultations = consultationsWithNames.filter(
        c => c.status === 'completed' || c.status === 'cancelled'
      );

      // Sort by date, most recent first
      historyConsultations.sort((a, b) => {
        const dateA = new Date(a.scheduled_start_time || a.submitted_at || 0);
        const dateB = new Date(b.scheduled_start_time || b.submitted_at || 0);
        return dateB.getTime() - dateA.getTime();
      });

      setConsultations(historyConsultations);
      applyFilter(historyConsultations, selectedFilter);
      
    } catch (error) {
      console.error('Error loading consultations:', error);
      Alert.alert('Error', 'Failed to load consultation history');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const applyFilter = (data: ConsultationWithStudent[], filter: 'all' | 'completed' | 'cancelled') => {
    if (filter === 'all') {
      setFilteredConsultations(data);
    } else {
      setFilteredConsultations(data.filter(c => c.status === filter));
    }
  };

  useEffect(() => {
    loadConsultations();
  }, [userId]);

  useEffect(() => {
    applyFilter(consultations, selectedFilter);
  }, [selectedFilter]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadConsultations();
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
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getStatusDisplay = (consultation: ConsultationWithStudent) => {
    if (consultation.status === 'completed') {
      return { text: 'Done', color: '#10b981', bgColor: '#dcfce7' };
    }
    if (consultation.status === 'cancelled') {
      return { text: 'Cancelled', color: '#ef4444', bgColor: '#fee2e2' };
    }
    return { text: 'Unknown', color: '#6b7280', bgColor: '#f3f4f6' };
  };

  const handleViewConsultation = (consultation: ConsultationWithStudent) => {
    setSelectedConsultation(consultation);
    setSelectedConsultationDocuments([]);
    setShowDetailModal(true);
    setIsLoadingDocuments(true);
    documentService.getConsultationDocuments(consultation.id)
      .then((result) => setSelectedConsultationDocuments(result.data || []))
      .catch(() => setSelectedConsultationDocuments([]))
      .finally(() => setIsLoadingDocuments(false));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading history...</Text>
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
        <Text style={styles.headerTitle}>Consultation History</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, selectedFilter === 'all' && styles.filterTabActive]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.filterTabText, selectedFilter === 'all' && styles.filterTabTextActive]}>
            All ({consultations.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, selectedFilter === 'completed' && styles.filterTabActive]}
          onPress={() => setSelectedFilter('completed')}
        >
          <Text style={[styles.filterTabText, selectedFilter === 'completed' && styles.filterTabTextActive]}>
            Completed ({consultations.filter(c => c.status === 'completed').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, selectedFilter === 'cancelled' && styles.filterTabActive]}
          onPress={() => setSelectedFilter('cancelled')}
        >
          <Text style={[styles.filterTabText, selectedFilter === 'cancelled' && styles.filterTabTextActive]}>
            Cancelled ({consultations.filter(c => c.status === 'cancelled').length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {filteredConsultations.length > 0 ? (
          filteredConsultations.map((consultation) => {
            const status = getStatusDisplay(consultation);
            return (
              <TouchableOpacity
                key={consultation.id}
                style={styles.consultationCard}
                onPress={() => handleViewConsultation(consultation)}
              >
                <View style={styles.consultationHeader}>
                  <Text style={styles.studentName}>{consultation.studentName}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                  </View>
                </View>
                
                <View style={styles.consultationDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date:</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(consultation.scheduled_start_time || consultation.submitted_at || '')}
                    </Text>
                  </View>
                  
                  {consultation.scheduled_start_time && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Time:</Text>
                      <Text style={styles.detailValue}>
                        {formatTime(consultation.scheduled_start_time)} - {formatTime(consultation.scheduled_end_time || '')}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Subject:</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>{consultation.subject_line}</Text>
                  </View>
                </View>
                <Text style={styles.tapToViewText}>Tap to view details →</Text>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📋</Text>
            <Text style={styles.emptyStateText}>No consultation history</Text>
            <Text style={styles.emptyStateSubtext}>
              {selectedFilter === 'all' 
                ? 'Your completed and cancelled consultations will appear here'
                : `No ${selectedFilter} consultations yet`
              }
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedConsultation && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Consultation Details</Text>
                  <TouchableOpacity
                    onPress={() => setShowDetailModal(false)}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Student</Text>
                    <Text style={styles.modalValue}>{selectedConsultation.studentName}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Subject</Text>
                    <Text style={styles.modalValue}>{selectedConsultation.subject_line}</Text>
                  </View>

                  {selectedConsultation.description && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Description</Text>
                      <Text style={styles.modalValue}>{selectedConsultation.description}</Text>
                    </View>
                  )}

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Date & Time</Text>
                    <Text style={styles.modalValue}>
                      {formatDate(selectedConsultation.scheduled_start_time || selectedConsultation.submitted_at || '')}
                    </Text>
                    {selectedConsultation.scheduled_start_time && (
                      <Text style={styles.modalValue}>
                        {formatTime(selectedConsultation.scheduled_start_time)} - {formatTime(selectedConsultation.scheduled_end_time || '')}
                      </Text>
                    )}
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Status</Text>
                    <View style={styles.modalStatusContainer}>
                      {(() => {
                        const status = getStatusDisplay(selectedConsultation);
                        return (
                          <View style={[styles.modalStatusBadge, { backgroundColor: status.bgColor }]}>
                            <Text style={[styles.modalStatusText, { color: status.color }]}>{status.text}</Text>
                          </View>
                        );
                      })()}
                    </View>
                  </View>

                  {selectedConsultation.completed_at && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Completed At</Text>
                      <Text style={styles.modalValue}>
                        {formatDate(selectedConsultation.completed_at)} at {formatTime(selectedConsultation.completed_at)}
                      </Text>
                    </View>
                  )}

                  {/* Student attached files */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Student Files</Text>
                    {isLoadingDocuments ? (
                      <ActivityIndicator size="small" color="#3b82f6" style={{ marginTop: 8 }} />
                    ) : selectedConsultationDocuments.length > 0 ? (
                      selectedConsultationDocuments.map((doc, index) => (
                        <View key={doc.id || index} style={styles.docItem}>
                          <Text style={styles.docIcon}>
                            {doc.file_name?.endsWith('.pdf') ? '📄' : '📝'}
                          </Text>
                          <View style={styles.docInfo}>
                            <Text style={styles.docName} numberOfLines={1}>{doc.file_name || 'Document'}</Text>
                            <Text style={styles.docMeta}>
                              {doc.file_size_bytes
                                ? `${(doc.file_size_bytes / 1024 / 1024).toFixed(2)} MB`
                                : 'Unknown size'}
                            </Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noDocText}>No files were attached.</Text>
                    )}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
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
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
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
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  tapToViewText: {
    marginTop: 8,
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6b7280',
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
  },
  modalValue: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
  },
  modalStatusContainer: {
    flexDirection: 'row',
  },
  modalStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  modalStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  docIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  docMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  noDocText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
