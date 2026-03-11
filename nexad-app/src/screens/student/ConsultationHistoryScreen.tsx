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
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { consultationService } from '../../services/consultationService';
import { profileService } from '../../services/profileService';
import { documentService } from '../../services/documentService';
import { Ionicons } from '@expo/vector-icons';
import type { ConsultationRequest } from '../../types';
import { C, F, T, S, R, shared, shadow } from '../../config/theme';
import FileViewerModal, { isImageFile } from '../../components/FileViewerModal';

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDocuments, setExpandedDocuments] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [fileViewer, setFileViewer] = useState<{ visible: boolean; url: string; name: string; isImage: boolean }>({
    visible: false, url: '', name: '', isImage: false,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  
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
      return { text: 'Completed', color: '#166534', bgColor: '#DCFCE7' };
    }
    if (consultation.status === 'cancelled') {
      return { text: 'Cancelled', color: '#92400E', bgColor: '#FEF3C7' };
    }
    if (consultation.status === 'declined') {
      return { text: 'Declined', color: '#991B1B', bgColor: '#FEE2E2' };
    }
    return { text: 'Unknown', color: C.ink3, bgColor: C.surfaceAlt };
  };

  const handleToggleExpand = (consultationId: string) => {
    if (expandedId === consultationId) {
      setExpandedId(null);
    } else {
      setExpandedId(consultationId);
      setExpandedDocuments([]);
      setIsLoadingDocs(true);
      documentService.getConsultationDocuments(consultationId)
        .then((r) => setExpandedDocuments(r.data || []))
        .catch(() => setExpandedDocuments([]))
        .finally(() => setIsLoadingDocs(false));
    }
  };

  const handleOpenDoc = async (doc: any) => {
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
          <TouchableOpacity onPress={handleSelectAll} style={styles.headerTextBtn}>
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
            const isSelected = selectedIds.has(consultation.id);
            const isExpanded = expandedId === consultation.id;

            if (isSelectMode) {
              return (
                <TouchableOpacity
                  key={consultation.id}
                  style={[styles.consultationCard, isSelected && styles.cardSelected]}
                  onPress={() => handleToggleSelect(consultation.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.selectRow}>
                    <View style={[styles.selectCheckbox, isSelected && styles.selectCheckboxActive]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.cardTopRow}>
                        <Text style={styles.teacherText}>{consultation.teacherName}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
                          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                        </View>
                      </View>
                      <Text style={styles.cardSubject} numberOfLines={1}>{consultation.subject_line}</Text>
                      <Text style={styles.cardDate}>
                        {formatDate(consultation.scheduled_start_time || consultation.submitted_at || '')}
                      </Text>
                    </View>
                  </View>
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
                  onPress={() => handleToggleExpand(consultation.id)}
                  activeOpacity={0.88}
                >
                  {/* Header row - always visible */}
                  <View style={styles.cardTopRow}>
                    <Text style={styles.teacherText}>{consultation.teacherName}</Text>
                    <View style={styles.cardTopRight}>
                      <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
                        <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16} color={C.ink4} style={{ marginLeft: 6 }}
                      />
                    </View>
                  </View>
                  <Text style={styles.cardSubject} numberOfLines={isExpanded ? undefined : 1}>
                    {consultation.subject_line}
                  </Text>
                  <Text style={styles.cardDate}>
                    {formatDate(consultation.scheduled_start_time || consultation.submitted_at || '')}
                  </Text>

                  {/* Expandable details */}
                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      <View style={styles.expandDivider} />

                      {consultation.description ? (
                        <View style={styles.expandRow}>
                          <Ionicons name="document-text-outline" size={14} color={C.ink3} />
                          <View style={styles.expandContent}>
                            <Text style={styles.expandLabel}>Description</Text>
                            <Text style={styles.expandValue}>{consultation.description}</Text>
                          </View>
                        </View>
                      ) : null}

                      {consultation.scheduled_start_time ? (
                        <View style={styles.expandRow}>
                          <Ionicons name="time-outline" size={14} color={C.ink3} />
                          <View style={styles.expandContent}>
                            <Text style={styles.expandLabel}>Time</Text>
                            <Text style={styles.expandValue}>
                              {formatTime(consultation.scheduled_start_time)}
                              {consultation.scheduled_end_time ? ` — ${formatTime(consultation.scheduled_end_time)}` : ''}
                            </Text>
                          </View>
                        </View>
                      ) : null}

                      {consultation.completed_at ? (
                        <View style={styles.expandRow}>
                          <Ionicons name="flag-outline" size={14} color={C.ink3} />
                          <View style={styles.expandContent}>
                            <Text style={styles.expandLabel}>Completed</Text>
                            <Text style={styles.expandValue}>
                              {formatDate(consultation.completed_at)} at {formatTime(consultation.completed_at)}
                            </Text>
                          </View>
                        </View>
                      ) : null}

                      <View style={styles.expandRow}>
                        <Ionicons name="attach-outline" size={14} color={C.ink3} />
                        <View style={styles.expandContent}>
                          <Text style={styles.expandLabel}>Attached Files</Text>
                          {isLoadingDocs ? (
                            <ActivityIndicator size="small" color={C.ink3} style={{ marginTop: 4 }} />
                          ) : expandedDocuments.length > 0 ? (
                            expandedDocuments.map((doc, idx) => (
                              <TouchableOpacity
                                key={doc.id || idx}
                                style={styles.docItem}
                                onPress={() => handleOpenDoc(doc)}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="document-outline" size={16} color={C.ink2} style={styles.docIcon} />
                                <View style={styles.docInfo}>
                                  <Text style={styles.docName} numberOfLines={1}>{doc.file_name || 'Document'}</Text>
                                  <Text style={styles.docMeta}>
                                    {doc.file_size_bytes
                                      ? `${(doc.file_size_bytes / 1024 / 1024).toFixed(2)} MB`
                                      : 'Unknown size'} · Tap to open
                                  </Text>
                                </View>
                                <Ionicons name="open-outline" size={14} color={C.ink4} />
                              </TouchableOpacity>
                            ))
                          ) : (
                            <Text style={styles.noDocText}>No files attached</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              </Swipeable>
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
  container:        { flex: 1, backgroundColor: 'transparent' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:      { ...T.body, color: C.ink4, marginTop: S.md },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: S.lg, paddingVertical: S.md,
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    ...shadow.soft,
  },
  headerTextBtn: { paddingHorizontal: S.sm, paddingVertical: S.sm },
  headerTitle:   { ...T.h2 },
  placeholder:   { width: 60 },

  filterContainer: {
    backgroundColor: 'transparent',
    paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  filterTab:           { paddingVertical: S.sm, paddingHorizontal: S.md, borderRadius: R.full, backgroundColor: C.surfaceAlt, marginRight: S.sm },
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
  cardSelected: {
    backgroundColor: C.surfaceAlt,
    borderColor: C.ink3,
  },
  selectCheckbox: {
    width: 22, height: 22, borderRadius: R.full,
    borderWidth: 2, borderColor: C.ink4,
    marginRight: S.sm, marginTop: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  selectCheckboxActive: {
    backgroundColor: C.action, borderColor: C.action,
  },
  swipeDeleteAction: {
    backgroundColor: '#DC2626',
    justifyContent: 'center', alignItems: 'center',
    width: 72, marginBottom: S.md, borderRadius: R.lg,
  },
  selectActionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.surface, padding: S.lg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
  },
  selectDeleteBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: S.sm, borderRadius: R.full, paddingVertical: 14,
  },
  selectDeleteBtnText: {
    color: '#fff', fontSize: 15, fontWeight: '600' as const,
  },
  cardTopRow:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  cardTopRight:  { flexDirection: 'row', alignItems: 'center', marginLeft: S.sm, flexShrink: 0 },
  teacherText:   { ...T.h3, flex: 1 },
  cardSubject:   { ...T.body, color: C.ink2, marginBottom: 2 },
  cardDate:      { ...T.tiny, color: C.ink4 },
  selectRow:     { flexDirection: 'row', alignItems: 'flex-start' },
  expandedSection: { marginTop: S.md },
  expandDivider:   { height: StyleSheet.hairlineWidth, backgroundColor: C.borderLight, marginBottom: S.md },
  expandRow:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: S.md },
  expandContent:   { flex: 1, marginLeft: 8 },
  expandLabel:     { fontSize: 10, fontWeight: '600' as const, color: C.ink4, marginBottom: 2, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  expandValue:     { ...T.body, color: C.ink1 },

  emptyState:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyStateIcon:     { marginBottom: S.lg },
  emptyStateText:     { ...T.h3, color: C.ink2, marginBottom: S.sm },
  emptyStateSubtext:  { ...T.small, color: C.ink4, textAlign: 'center', paddingHorizontal: 32 },

  docItem:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt, borderRadius: R.sm, padding: S.sm + 2, marginTop: S.xs, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderLight },
  docIcon:  { marginRight: S.sm },
  docInfo:  { flex: 1 },
  docName:  { ...T.label, color: C.ink1 },
  docMeta:  { ...T.tiny, marginTop: 2 },
  noDocText:{ ...T.small, color: C.ink4, fontStyle: 'italic', marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  statusText:  { fontSize: 12, fontWeight: '600' as const },
});
