import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { classroomService } from '../../services/classroomService';
import { documentService } from '../../services/documentService';
import { Ionicons } from '@expo/vector-icons';
import { C, F, T, S, R, shared, shadow } from '../../config/theme';

// Status config — monochromatic: only shade and icon differ, never hue color
const STATUS_CONFIG: Record<string, { label: string; icon: string; bg: string; fg: string }> = {
  pending_review:         { label: 'Pending Review',       icon: 'time-outline',          bg: C.surfaceAlt, fg: C.ink3 },
  approved:               { label: 'Approved',             icon: 'checkmark-circle',      bg: C.ink1,       fg: C.actionText },
  revised:                { label: 'Revision Needed',      icon: 'pencil',                bg: C.ink2,       fg: C.actionText },
  for_consultation:       { label: 'Consult Suggested',    icon: 'chatbubbles-outline',   bg: C.ink3,       fg: C.actionText },
  consultation_requested: { label: 'Consult Requested',    icon: 'calendar-outline',      bg: C.ink2,       fg: C.actionText },
};

// Status notice messages — shown below the locked card
const STATUS_NOTICE: Record<string, string> = {
  approved:               'Submission finalised — no further action needed.',
  revised:                'Waiting for student to re-submit.',
  for_consultation:       'Consultation suggested — waiting for student to book.',
  consultation_requested: 'Student has booked — approve via the Consultations screen.',
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.pending_review;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon as any} size={10} color={s.fg} />
      <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

export default function TeacherBinReviewScreen({ navigation, route }: any) {
  const { binId } = route.params as { binId: string };

  const [bin, setBin] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [binId])
  );

  const loadData = async () => {
    const [binResult, subResult] = await Promise.all([
      classroomService.getAttachmentBin(binId),
      classroomService.getAttachmentBinSubmissions(binId),
    ]);
    if (binResult.data) setBin(binResult.data);
    if (subResult.data) setSubmissions(subResult.data);
    setLoading(false);
    setRefreshing(false);
  };

  const handleSetStatus = async (
    documentId: string,
    status: 'approved' | 'revised' | 'for_consultation'
  ) => {
    setUpdatingId(documentId);
    const result = await classroomService.updateSubmissionStatus(documentId, status);
    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      // Update local state immediately
      setSubmissions((prev) =>
        prev.map((s) => (s.id === documentId ? { ...s, review_status: status } : s))
      );
    }
    setUpdatingId(null);
  };

  const handleViewFile = async (submission: any) => {
    try {
      const result = await documentService.getDocumentUrl(submission.storage_path);
      if (result.error || !result.data) {
        Alert.alert('Error', result.error || 'Failed to get file link');
        return;
      }
      const supported = await Linking.canOpenURL(result.data);
      if (supported) {
        await Linking.openURL(result.data);
      } else {
        Alert.alert('Error', 'Cannot open this file type on your device.');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to open file');
    }
  };

  const openComments = (submission: any) => {
    navigation.navigate('BinComments', {
      binId,
      studentId: submission.uploaded_by,
      binTitle: bin?.title || 'Bin',
      studentName: `${submission.student?.first_name} ${submission.student?.last_name}`,
      role: 'teacher',
    });
  };

  const confirmStatus = (
    submission: any,
    status: 'approved' | 'revised' | 'for_consultation',
    label: string
  ) => {
    Alert.alert(
      `Mark as ${label}?`,
      `This will update the status for ${submission.student?.first_name} ${submission.student?.last_name}'s submission and notify them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => handleSetStatus(submission.id, status) },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.ink1} />
      </View>
    );
  }

  const pending   = submissions.filter((s) => s.review_status === 'pending_review').length;
  const approved  = submissions.filter((s) => s.review_status === 'approved').length;
  const revised   = submissions.filter((s) => s.review_status === 'revised').length;
  const forConsult= submissions.filter(
    (s) => s.review_status === 'for_consultation' || s.review_status === 'consultation_requested'
  ).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.ink1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {bin?.title || 'Bin Review'}
        </Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={C.ink1} />}
      >
        {/* Bin info strip */}
        <View style={styles.binStrip}>
          {bin?.deadline && (
            <View style={styles.binMeta}>
              <Ionicons name="time-outline" size={13} color={C.ink3} />
              <Text style={styles.binMetaText}>
                Due {new Date(bin.deadline).toLocaleDateString()}
              </Text>
            </View>
          )}
          {bin?.description ? (
            <Text style={styles.binDesc}>{bin.description}</Text>
          ) : null}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total',    val: submissions.length },
            { label: 'Pending',  val: pending },
            { label: 'Approved', val: approved },
            { label: 'Revised',  val: revised },
            { label: 'Consult',  val: forConsult },
          ].map((item, idx) => (
            <View key={item.label} style={[styles.statBox, idx > 0 && styles.statBoxBorder]}>
              <Text style={styles.statNum}>{item.val}</Text>
              <Text style={styles.statLbl}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Submissions */}
        {submissions.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="document-outline" size={48} color={C.ink5} />
            <Text style={styles.emptyText}>No submissions yet</Text>
          </View>
        ) : (
          submissions.map((sub) => (
            <View key={sub.id} style={styles.card}>
              {/* Student + file info */}
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarLetter}>
                    {sub.student?.first_name?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.studentName}>
                    {sub.student?.first_name} {sub.student?.last_name}
                  </Text>
                  <TouchableOpacity style={styles.fileRow} onPress={() => handleViewFile(sub)}>
                    <Ionicons name="document-text-outline" size={13} color={C.ink3} />
                    <Text style={styles.fileName} numberOfLines={1}>{sub.file_name}</Text>
                    <Ionicons name="open-outline" size={12} color={C.ink4} />
                  </TouchableOpacity>
                  <Text style={styles.submittedDate}>
                    Submitted {new Date(sub.uploaded_at).toLocaleDateString()}
                  </Text>
                </View>
                <StatusBadge status={sub.review_status} />
              </View>

              {/* 
                ── Action area ────────────────────────────────────────────
                PENDING  → show 3 action buttons (Approve / Revise / Consult)
                LOCKED   → replace buttons with a single static status label
                         so the UI clearly reflects that no change is possible
              */}
              {sub.review_status === 'pending_review' ? (
                // ── Actionable state: 3 buttons ──────────────────────────
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    disabled={updatingId === sub.id}
                    onPress={() => confirmStatus(sub, 'approved', 'Approved')}
                  >
                    <Ionicons name="checkmark-circle-outline" size={15} color={C.ink2} />
                    <Text style={styles.actionBtnText}>Approve</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    disabled={updatingId === sub.id}
                    onPress={() => confirmStatus(sub, 'revised', 'Revision Needed')}
                  >
                    <Ionicons name="pencil-outline" size={15} color={C.ink2} />
                    <Text style={styles.actionBtnText}>Revise</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    disabled={updatingId === sub.id}
                    onPress={() => confirmStatus(sub, 'for_consultation', 'For Consultation')}
                  >
                    <Ionicons name="chatbubbles-outline" size={15} color={C.ink2} />
                    <Text style={styles.actionBtnText}>Consult</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {updatingId === sub.id && (
                <ActivityIndicator size="small" color={C.ink1} style={{ marginTop: 8 }} />
              )}

              {/* Comment thread button */}
              <View style={styles.divider} />
              <TouchableOpacity style={styles.commentsBtn} onPress={() => openComments(sub)}>
                <Ionicons name="chatbox-ellipses-outline" size={15} color={C.ink3} />
                <Text style={styles.commentsBtnText}>Private Comments</Text>
                <Ionicons name="chevron-forward" size={14} color={C.ink4} />
              </TouchableOpacity>

              {/* ── Immutable full-width settled footer bar ─────────────────
                   Spans card edge-to-edge (negative margins cancel card padding).
                   Not clickable — communicates finality & removes decision burden. */}
              {sub.review_status !== 'pending_review' && (() => {
                const cfg = STATUS_CONFIG[sub.review_status] || STATUS_CONFIG.pending_review;
                const notice = STATUS_NOTICE[sub.review_status];
                return (
                  <View style={[styles.settledBar, { backgroundColor: cfg.bg }]}>
                    <View style={styles.settledBarLeft}>
                      <Ionicons name={cfg.icon as any} size={15} color={cfg.fg} />
                      <Text style={[styles.settledBarStatus, { color: cfg.fg }]}>{cfg.label}</Text>
                    </View>
                    {notice && (
                      <Text style={[styles.settledBarNotice, { color: cfg.fg }]} numberOfLines={2}>
                        {notice}
                      </Text>
                    )}
                  </View>
                );
              })()}
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface,
    paddingHorizontal: S.lg, paddingTop: 56, paddingBottom: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  backBtn:     { marginRight: S.md, padding: S.xs },
  headerTitle: { ...T.h2, flex: 1 },

  // ── Info strip (deadline / description) ─────────────────────────────────
  binStrip: {
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: S.lg, paddingVertical: S.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderLight,
    gap: 2,
  },
  binMeta:     { flexDirection: 'row', alignItems: 'center', gap: S.xs },
  binMetaText: { ...T.small, color: C.ink3 },
  binDesc:     { ...T.small, color: C.ink3, lineHeight: 18 },

  // ── Stats row ────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    marginHorizontal: S.lg, marginTop: S.md,
    borderRadius: R.lg, padding: S.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderLight,
    ...shadow.soft,
  },
  statBox:       { flex: 1, alignItems: 'center', paddingVertical: S.xs },
  statBoxBorder: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: C.borderLight },
  statNum:       { ...T.h2, fontSize: 20 },
  statLbl:       { ...T.tiny, marginTop: 2 },

  // ── Empty ────────────────────────────────────────────────────────────────
  empty:     { alignItems: 'center', paddingVertical: 56 },
  emptyText: { ...T.body, color: C.ink4, marginTop: S.md },

  // ── Submission card ───────────────────────────────────────────────────────
  card: {
    backgroundColor: C.surface,
    marginHorizontal: S.lg, marginTop: S.md,
    borderRadius: R.lg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderLight,
    padding: S.xl2,
    overflow: 'hidden' as const,
    ...shadow.card,
  },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: S.md },
  avatar:       { width: 40, height: 40, borderRadius: 20, backgroundColor: C.ink1, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: C.actionText, fontSize: 16, fontWeight: '600' as const },
  cardInfo:     { flex: 1 },
  studentName:  { ...T.h3, marginBottom: 4 },
  fileRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  fileName:     { ...T.small, color: C.ink3, flex: 1, textDecorationLine: 'underline' as const },
  submittedDate:{ ...T.tiny },

  // Status badge (top-right of card)
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: R.full, alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 10, fontWeight: '600' as const, letterSpacing: 0.2 },

  // ── Action buttons (pending_review only) ────────────────────────────────
  actions: { flexDirection: 'row', gap: S.sm, marginTop: S.md },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 14,
    borderRadius: R.md,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.surfaceAlt,
  },
  actionBtnText: { ...T.label, color: C.ink2 },

  // ── Locked full-width status footer bar ────────────────────────────────
  settledBar: {
    // Negative margins pull the bar to the card edges, cancelling padding
    marginHorizontal: -S.xl2,
    marginBottom: -S.xl2,
    marginTop: S.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S.xl2,
    paddingVertical: 14,
    gap: S.sm,
  },
  settledBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settledBarStatus: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.2 },
  settledBarNotice: { flex: 1, fontSize: 11, opacity: 0.80, lineHeight: 16 },

  // ── Divider + Comments ───────────────────────────────────────────────────
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.borderLight, marginTop: S.md, marginBottom: S.xs },
  commentsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm,
    paddingVertical: S.sm,
  },
  commentsBtnText: { flex: 1, ...T.small, color: C.ink3 },
});
