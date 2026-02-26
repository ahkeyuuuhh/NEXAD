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
import { Ionicons } from '@expo/vector-icons';
import type { ConsultationRequest } from '../../types';
import { C, F, T, S, R, shared, shadow } from '../../config/theme';

interface ConsultationWithTeacher extends ConsultationRequest {
  teacherName: string;
}

export default function ConsultationHistoryScreen({ navigation, route }: any) {
  // initialFilter can be passed from notification deep-link (e.g. 'completed')
  const initialFilter = (route?.params?.initialFilter as 'all' | 'completed' | 'cancelled' | 'declined') || 'all';

  const [consultations, setConsultations] = useState<ConsultationWithTeacher[]>([]);
  const [filteredConsultations, setFilteredConsultations] = useState<ConsultationWithTeacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'completed' | 'cancelled' | 'declined'>(initialFilter);
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationWithTeacher | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedConsultationDocuments, setSelectedConsultationDocuments] = useState<any[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  
  const authContext = useAuth();
  const userId = authContext.user?.user_id;

  const loadConsultations = async () => {
    if (!userId) return;

    try {
      // Get all student requests
      const result = await consultationService.getStudentRequests(userId, 1, 100);
      const allConsultations = result.data?.data || [];
      
      // Load teacher names for each consultation
      const consultationsWithNames = await Promise.all(
        allConsultations.map(async (consultation) => {
          try {
            const profileResponse = await profileService.getTeacherProfile(consultation.teacher_id);
            const profile = profileResponse.data;
            return {
              ...consultation,
              teacherName: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Teacher',
            };
          } catch (error) {
            console.error('Error loading teacher profile:', error);
            return {
              ...consultation,
              teacherName: 'Unknown Teacher',
            };
          }
        })
      );

      // Filter to only show completed, cancelled, and declined (history)
      const historyConsultations = consultationsWithNames.filter(
        c => c.status === 'completed' || c.status === 'cancelled' || c.status === 'declined'
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

  const applyFilter = (data: ConsultationWithTeacher[], filter: 'all' | 'completed' | 'cancelled' | 'declined') => {
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

  const getStatusDisplay = (consultation: ConsultationWithTeacher) => {
    if (consultation.status === 'completed') {
      return { text: 'Completed', color: C.ink2, bgColor: C.surfaceAlt };
    }
    if (consultation.status === 'cancelled') {
      return { text: 'Cancelled', color: C.ink3, bgColor: C.surfaceAlt };
    }
    if (consultation.status === 'declined') {
      return { text: 'Declined', color: C.ink4, bgColor: C.surfaceAlt };
    }
    return { text: 'Unknown', color: C.ink3, bgColor: C.surfaceAlt };
  };

  const handleViewConsultation = (consultation: ConsultationWithTeacher) => {
    setSelectedConsultation(consultation);
    setSelectedConsultationDocuments([]);
    setShowDetailModal(true);
    // Fetch documents for this consultation
    setIsLoadingDocuments(true);
    documentService.getConsultationDocuments(consultation.id)
      .then((result) => {
        setSelectedConsultationDocuments(result.data || []);
      })
      .catch(() => setSelectedConsultationDocuments([]))
      .finally(() => setIsLoadingDocuments(false));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.ink2} />
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
          <Ionicons name="chevron-back" size={20} color={C.ink1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consultation History</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
            style={[styles.filterTab, selectedFilter === 'declined' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('declined')}
          >
            <Text style={[styles.filterTabText, selectedFilter === 'declined' && styles.filterTabTextActive]}>
              Declined ({consultations.filter(c => c.status === 'declined').length})
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
        </ScrollView>
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
                  <Text style={styles.teacherName}>{consultation.teacherName}</Text>
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
                <View style={styles.tapToViewRow}>
                  <Text style={styles.tapToViewText}>Tap to view details</Text>
                  <Ionicons name="chevron-forward" size={14} color={C.ink3} />
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="clipboard-outline" size={56} color={C.ink4} />
            <Text style={styles.emptyStateText}>No consultation history</Text>
            <Text style={styles.emptyStateSubtext}>
              {selectedFilter === 'all' 
                ? 'Your past consultations will appear here'
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
                    <Text style={styles.closeButtonText}>
                    <Ionicons name="close" size={18} color={C.ink3} />
                  </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Teacher</Text>
                    <Text style={styles.modalValue}>{selectedConsultation.teacherName}</Text>
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

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Requested On</Text>
                    <Text style={styles.modalValue}>
                      {formatDate(selectedConsultation.submitted_at || '')}
                    </Text>
                  </View>

                  {/* Attached Files */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Attached Files</Text>
                    {isLoadingDocuments ? (
                      <ActivityIndicator size="small" color={C.ink2} style={{ marginTop: 8 }} />
                    ) : selectedConsultationDocuments.length > 0 ? (
                      selectedConsultationDocuments.map((doc, index) => (
                        <View key={doc.id || index} style={styles.docItem}>
                          <Ionicons
                            name={doc.file_name?.endsWith('.pdf') ? 'document-outline' : 'create-outline'}
                            size={20}
                            color={C.ink3}
                            style={styles.docIcon}
                          />
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
                      <Text style={styles.noDocText}>No files attached to this consultation.</Text>
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
  container:        { flex: 1, backgroundColor: C.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:      { ...T.body, color: C.ink4, marginTop: S.md },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: S.lg, paddingVertical: S.md,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    ...shadow.soft,
  },
  headerTitle:   { ...T.h2 },
  placeholder:   { width: 60 },

  filterContainer: {
    backgroundColor: C.surface,
    paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm,
    flexDirection: 'row', gap: S.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderLight,
  },
  filterTab:           { paddingVertical: S.sm, paddingHorizontal: S.md, borderRadius: R.full, backgroundColor: C.surfaceAlt },
  filterTabActive:     { backgroundColor: C.action },
  filterTabText:       { ...T.label, color: C.ink3 },
  filterTabTextActive: { ...T.label, color: C.actionText },

  content: { flex: 1, padding: S.lg },

  consultationCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg, padding: S.lg, marginBottom: S.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderLight,
    ...shadow.soft,
  },
  consultationHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.md,
  },
  teacherName:       { ...T.h3, flex: 1 },
  statusBadge:       { paddingHorizontal: S.sm, paddingVertical: 3, borderRadius: R.full, backgroundColor: C.surfaceAlt },
  statusText:        { ...T.tiny, fontWeight: '600' as const, color: C.ink2 },
  consultationDetails: { gap: S.sm },
  detailRow:         { flexDirection: 'row' },
  detailLabel:       { ...T.small, color: C.ink4, width: 80 },
  detailValue:       { ...T.small, color: C.ink1, flex: 1 },
  tapToViewRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: S.sm, gap: 4 },
  tapToViewText:     { ...T.small, color: C.ink3, fontWeight: '600' as const, textAlign: 'center' },

  emptyState:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyStateIcon:     { marginBottom: S.lg },
  emptyStateText:     { ...T.h3, color: C.ink2, marginBottom: S.sm },
  emptyStateSubtext:  { ...T.small, color: C.ink4, textAlign: 'center', paddingHorizontal: 32 },

  // Modal
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent:  { backgroundColor: C.surface, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, maxHeight: '80%', paddingBottom: S.xl },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: S.xl, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderLight },
  modalTitle:    { ...T.h2 },
  closeButton:   { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  closeButtonText: { fontSize: 18, color: C.ink3 },
  modalBody:     { padding: S.xl },
  modalSection:  { marginBottom: S.xl },
  modalLabel:    { ...T.label, color: C.ink4, marginBottom: S.xs, textTransform: 'uppercase', letterSpacing: 0.6 },
  modalValue:    { ...T.body, color: C.ink1, lineHeight: 24 },
  modalStatusContainer: { flexDirection: 'row' },
  modalStatusBadge:     { paddingHorizontal: S.md, paddingVertical: S.sm, borderRadius: R.full, backgroundColor: C.ink1 },
  modalStatusText:      { ...T.label, color: C.actionText },

  docItem:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt, borderRadius: R.sm, padding: S.sm + 2, marginTop: S.xs, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderLight },
  docIcon:  { marginRight: S.sm },
  docInfo:  { flex: 1 },
  docName:  { ...T.label, color: C.ink1 },
  docMeta:  { ...T.tiny, marginTop: 2 },
  noDocText:{ ...T.small, color: C.ink4, fontStyle: 'italic', marginTop: S.xs },
});
