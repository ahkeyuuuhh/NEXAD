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
  Linking,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { consultationService } from '../../services/consultationService';
import { profileService } from '../../services/profileService';
import { documentService } from '../../services/documentService';
import type { ConsultationRequest } from '../../types';
import { C, F, T, S, R, shadow } from '../../config/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  
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
      return { text: 'Done', color: '#fff', bgColor: C.ink2 };
    }
    if (consultation.status === 'cancelled') {
      return { text: 'Cancelled', color: C.ink3, bgColor: C.surfaceAlt };
    }
    return { text: 'Unknown', color: C.ink3, bgColor: C.surfaceAlt };
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

  const handleOpenDoc = async (doc: any) => {
    try {
      const urlResult = await documentService.getDocumentUrl(doc.storage_path);
      if (urlResult.data) {
        await Linking.openURL(urlResult.data);
      } else {
        Alert.alert('Error', 'Could not get file URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open file');
    }
  };

  const handleDeleteFromHistory = (consultationId: string) => {
    Alert.alert('Delete', 'Remove this consultation from history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setConsultations(prev => {
            const updated = prev.filter(c => c.id !== consultationId);
            applyFilter(updated, selectedFilter);
            return updated;
          });
        },
      },
    ]);
  };

  const handleLongPress = (id: string) => {
    setIsSelectMode(true);
    setSelectedIds(new Set([id]));
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCancelSelect = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      `Delete ${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''}?`,
      'These consultations will be removed from your history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const ids = new Set(selectedIds);
            setConsultations(prev => {
              const updated = prev.filter(c => !ids.has(c.id));
              applyFilter(updated, selectedFilter);
              return updated;
            });
            setIsSelectMode(false);
            setSelectedIds(new Set());
          },
        },
      ]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredConsultations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredConsultations.map(c => c.id)));
    }
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
          onPress={isSelectMode ? handleCancelSelect : () => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name={isSelectMode ? 'close' : 'chevron-back'} size={22} color={C.ink1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isSelectMode ? `${selectedIds.size} selected` : 'Consultation History'}
        </Text>
        {isSelectMode ? (
          <TouchableOpacity onPress={handleSelectAll} style={styles.backButton}>
            <Text style={{ fontSize: 13, fontWeight: '600' as const, color: C.ink2 }}>
              {selectedIds.size === filteredConsultations.length ? 'Deselect all' : 'Select all'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
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
            const isSelected = selectedIds.has(consultation.id);
            const cardContent = (
              <>
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
              </>
            );

            if (isSelectMode) {
              return (
                <TouchableOpacity
                  key={consultation.id}
                  style={[styles.consultationCard, isSelected && styles.cardSelected]}
                  onPress={() => handleToggleSelect(consultation.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.selectCheckbox, isSelected && styles.selectCheckboxActive]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>{cardContent}</View>
                </TouchableOpacity>
              );
            }

            return (
              <Swipeable
                key={consultation.id}
                renderRightActions={() => (
                  <TouchableOpacity
                    style={styles.swipeDeleteAction}
                    onPress={() => handleDeleteFromHistory(consultation.id)}
                  >
                    <Ionicons name="trash-outline" size={22} color="#fff" />
                  </TouchableOpacity>
                )}
              >
                <TouchableOpacity
                  style={styles.consultationCard}
                  onLongPress={() => handleLongPress(consultation.id)}
                  delayLongPress={350}
                  onPress={() => handleViewConsultation(consultation)}
                >
                  {cardContent}
                  <Text style={styles.tapToViewText}>Tap to view details <Ionicons name="chevron-forward" size={14} color={C.ink3} /></Text>
                </TouchableOpacity>
              </Swipeable>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="clipboard-outline" size={48} color={C.ink5} />
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

      {/* Multi-select delete bar */}
      {isSelectMode && (
        <View style={styles.selectActionBar}>
          <TouchableOpacity
            style={styles.selectDeleteBtn}
            onPress={handleDeleteSelected}
            disabled={selectedIds.size === 0}
          >
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.selectDeleteBtnText}>
              Delete ({selectedIds.size})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Detail Modal */}}
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
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  {/* Student */}
                  <View style={styles.modalInfoCard}>
                    <View style={styles.modalInfoRow}>
                      <Ionicons name="person-outline" size={16} color={C.ink3} style={styles.modalInfoIcon} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Student</Text>
                        <Text style={styles.modalValue}>{selectedConsultation.studentName}</Text>
                      </View>
                    </View>

                    <View style={styles.modalInfoDivider} />

                    <View style={styles.modalInfoRow}>
                      <Ionicons name="reader-outline" size={16} color={C.ink3} style={styles.modalInfoIcon} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Subject</Text>
                        <Text style={styles.modalValue}>{selectedConsultation.subject_line}</Text>
                      </View>
                    </View>

                    {selectedConsultation.description && (
                      <>
                        <View style={styles.modalInfoDivider} />
                        <View style={styles.modalInfoRow}>
                          <Ionicons name="document-text-outline" size={16} color={C.ink3} style={styles.modalInfoIcon} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.modalLabel}>Description</Text>
                            <Text style={styles.modalValue}>{selectedConsultation.description}</Text>
                          </View>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Date & Time */}
                  <View style={styles.modalInfoCard}>
                    <View style={styles.modalInfoRow}>
                      <Ionicons name="calendar-outline" size={16} color={C.ink3} style={styles.modalInfoIcon} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Date</Text>
                        <Text style={styles.modalValue}>
                          {formatDate(selectedConsultation.scheduled_start_time || selectedConsultation.submitted_at || '')}
                        </Text>
                      </View>
                    </View>

                    {selectedConsultation.scheduled_start_time && (
                      <>
                        <View style={styles.modalInfoDivider} />
                        <View style={styles.modalInfoRow}>
                          <Ionicons name="time-outline" size={16} color={C.ink3} style={styles.modalInfoIcon} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.modalLabel}>Time</Text>
                            <Text style={styles.modalValue}>
                              {formatTime(selectedConsultation.scheduled_start_time)} — {formatTime(selectedConsultation.scheduled_end_time || '')}
                            </Text>
                          </View>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Status */}
                  <View style={styles.modalInfoCard}>
                    <View style={styles.modalInfoRow}>
                      <Ionicons name="checkmark-circle-outline" size={16} color={C.ink3} style={styles.modalInfoIcon} />
                      <View style={{ flex: 1 }}>
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
                    </View>

                    {selectedConsultation.completed_at && (
                      <>
                        <View style={styles.modalInfoDivider} />
                        <View style={styles.modalInfoRow}>
                          <Ionicons name="flag-outline" size={16} color={C.ink3} style={styles.modalInfoIcon} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.modalLabel}>Completed At</Text>
                            <Text style={styles.modalValue}>
                              {formatDate(selectedConsultation.completed_at)} at {formatTime(selectedConsultation.completed_at)}
                            </Text>
                          </View>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Student Files */}
                  <View style={styles.modalSection}>
                    <View style={styles.modalFilesHeader}>
                      <Ionicons name="attach-outline" size={16} color={C.ink3} />
                      <Text style={[styles.modalLabel, { marginBottom: 0, marginLeft: 6 }]}>Student Files</Text>
                    </View>
                    {isLoadingDocuments ? (
                      <ActivityIndicator size="small" color={C.ink2} style={{ marginTop: 8 }} />
                    ) : selectedConsultationDocuments.length > 0 ? (
                      selectedConsultationDocuments.map((doc, index) => (
                        <TouchableOpacity
                          key={doc.id || index}
                          style={styles.docItem}
                          onPress={() => handleOpenDoc(doc)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={doc.file_name?.toLowerCase().endsWith('.pdf') ? 'document-outline' : 'document-text-outline'}
                            size={18}
                            color={C.ink2}
                            style={styles.docIcon}
                          />
                          <View style={styles.docInfo}>
                            <Text style={styles.docName} numberOfLines={1}>{doc.file_name || 'Document'}</Text>
                            <Text style={styles.docMeta}>
                              {doc.file_size_bytes
                                ? `${(doc.file_size_bytes / 1024 / 1024).toFixed(2)} MB`
                                : 'Unknown size'} · Tap to open
                            </Text>
                          </View>
                          <Ionicons name="open-outline" size={16} color={C.ink4} />
                        </TouchableOpacity>
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
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: C.ink3,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: C.ink2,
    fontSize: 16,
    fontWeight: '400' as const,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: C.ink1,
  },
  placeholder: {
    width: 60,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
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
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: C.action,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: C.ink3,
  },
  filterTabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  consultationCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    marginHorizontal: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
    ...shadow.card,
  },
  consultationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: C.ink1,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  consultationDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
  },
  detailLabel: {
    fontSize: 13,
    color: C.ink3,
    fontWeight: '400' as const,
    width: 68,
  },
  detailValue: {
    fontSize: 13,
    color: C.ink1,
    flex: 1,
  },
  tapToViewText: {
    marginTop: 8,
    fontSize: 13,
    color: C.ink2,
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
    color: C.ink1,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: C.ink3,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.surface,
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
    backgroundColor: '#1C1C1C',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: C.ink3,
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: C.ink3,
    marginBottom: 6,
  },
  modalValue: {
    fontSize: 16,
    color: C.ink1,
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
    fontWeight: '600' as const,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  docIcon: {
    marginRight: 10,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: C.ink1,
  },
  docMeta: {
    fontSize: 12,
    color: C.ink3,
    marginTop: 2,
  },
  noDocText: {
    fontSize: 14,
    color: C.ink4,
    fontStyle: 'italic',
    marginTop: 4,
  },
  swipeDeleteAction: {
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 4,
  },
  modalInfoCard: {
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderLight,
    marginBottom: 12,
    overflow: 'hidden',
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
  },
  modalInfoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  modalInfoDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.borderLight,
    marginHorizontal: 14,
  },
  modalFilesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  selectCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    alignSelf: 'center',
    flexShrink: 0,
  },
  selectCheckboxActive: {
    backgroundColor: C.action,
    borderColor: C.action,
  },
  selectActionBar: {
    backgroundColor: C.surface,
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    paddingBottom: S.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    ...shadow.float,
  },
  selectDeleteBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: R.lg,
    gap: S.sm,
  },
  selectDeleteBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
