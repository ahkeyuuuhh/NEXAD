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
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { classroomService } from '../../services/classroomService';
import { documentService } from '../../services/documentService';
import { Ionicons } from '@expo/vector-icons';
import { C, F, T, S, R, shared, shadow } from '../../config/theme';

const STATUS_CONFIG: Record<string, { label: string; icon: string; bg: string; fg: string }> = {
  pending_review:         { label: 'Pending Review',    icon: 'time-outline',        bg: C.surfaceAlt, fg: C.ink3 },
  approved:               { label: 'Approved',          icon: 'checkmark-circle',    bg: C.ink1,       fg: C.actionText },
  revised:                { label: 'Revision Needed',   icon: 'pencil',              bg: C.ink2,       fg: C.actionText },
  for_consultation:       { label: 'Consult Suggested', icon: 'chatbubbles-outline', bg: C.ink3,       fg: C.actionText },
  consultation_requested: { label: 'Consult Requested', icon: 'calendar-outline',    bg: C.ink2,       fg: C.actionText },
};

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

  const [bin,         setBin]         = useState<any>(null);
  const [members,     setMembers]     = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [updatingId,  setUpdatingId]  = useState<string | null>(null);
  const [activeTab,   setActiveTab]   = useState<'details' | 'students'>('details');
  const [expandedId,  setExpandedId]  = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => { loadData(); }, [binId])
  );

  const loadData = async () => {
    const binRes = await classroomService.getAttachmentBin(binId);
    const binData = binRes.data;
    if (binData) setBin(binData);

    const classroomId = binData?.classroom_id;
    if (!classroomId) { setLoading(false); setRefreshing(false); return; }

    const [membersRes, subsRes] = await Promise.all([
      classroomService.getClassroomMembers(classroomId),
      classroomService.getAttachmentBinSubmissions(binId),
    ]);

    const allMembers  = membersRes.data || [];
    const assignedTo: string[] | null = binData?.assigned_to ?? null;
    const filtered = assignedTo && assignedTo.length > 0
      ? allMembers.filter((m: any) => assignedTo.includes(m.id))
      : allMembers;

    setMembers(filtered);
    if (subsRes.data) setSubmissions(subsRes.data);
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleSetStatus = async (
    documentId: string,
    status: 'approved' | 'revised'
  ) => {
    setUpdatingId(documentId);
    const result = await classroomService.updateSubmissionStatus(documentId, status);
    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      setSubmissions(prev =>
        prev.map(s => s.id === documentId ? { ...s, review_status: status } : s)
      );
    }
    setUpdatingId(null);
  };

  const confirmStatus = (
    submission: any,
    status: 'approved' | 'revised',
    label: string
  ) => {
    Alert.alert(
      `Mark as ${label}?`,
      `This will update the status for ${submission.student?.first_name} ${submission.student?.last_name}'s submission.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => handleSetStatus(submission.id, status) },
      ]
    );
  };

  const handleViewFile = async (submission: any) => {
    try {
      const result = await documentService.getDocumentUrl(submission.storage_path);
      if (result.error || !result.data) { Alert.alert('Error', result.error || 'Failed to get file link'); return; }
      const supported = await Linking.canOpenURL(result.data);
      if (supported) await Linking.openURL(result.data);
      else Alert.alert('Error', 'Cannot open this file type on your device.');
    } catch { Alert.alert('Error', 'Failed to open file'); }
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

  // Keep only the newest submission per student (submissions are already sorted desc by uploaded_at)
  const subMap: Record<string, any> = {};
  submissions.forEach(s => {
    if (!subMap[s.uploaded_by]) subMap[s.uploaded_by] = s;
  });

  const submittedMembers = members.filter(m => subMap[m.id]);
  const missingMembers   = members.filter(m => !subMap[m.id]);

  const latestSubs = Object.values(subMap);
  const statPending  = latestSubs.filter(s => s.review_status === 'pending_review').length;
  const statApproved = latestSubs.filter(s => s.review_status === 'approved').length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.ink1} />
      </View>
    );
  }

  const renderDetailsTab = () => (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.ink1} />}
    >
      <View style={styles.detailCard}>
        <Text style={styles.detailTitle}>{bin?.title || 'Assignment'}</Text>
        {bin?.description
          ? <Text style={styles.detailDesc}>{bin.description}</Text>
          : <Text style={styles.detailDescEmpty}>No description provided.</Text>
        }
        {bin?.deadline && (
          <View style={styles.detailDeadlineRow}>
            <Ionicons name="time-outline" size={14} color={C.ink3} />
            <Text style={styles.detailDeadlineText}>
              Due {new Date(bin.deadline).toLocaleDateString('en-US', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
              })}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsHeading}>Summary</Text>
        <View style={styles.statsRow}>
          {[
            { label: 'Assigned',  val: members.length },
            { label: 'Submitted', val: submittedMembers.length },
            { label: 'Missing',   val: missingMembers.length },
            { label: 'Pending',   val: statPending },
            { label: 'Approved',  val: statApproved },
          ].map((item, idx) => (
            <View key={item.label} style={[styles.statBox, idx > 0 && styles.statBoxBorder]}>
              <Text style={styles.statNum}>{item.val}</Text>
              <Text style={styles.statLbl}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderStudentCard = (member: any) => {
    const sub = subMap[member.id];
    const isExpanded = expandedId === member.id;

    if (sub) {
      return (
        <View key={member.id} style={styles.studentCard}>
          <TouchableOpacity
            style={styles.studentCardTop}
            onPress={() => setExpandedId(isExpanded ? null : member.id)}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              {member.profile_photo_url ? (
                <Image source={{ uri: member.profile_photo_url }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarLetter}>{member.first_name?.[0]?.toUpperCase() || '?'}</Text>
              )}
            </View>
            <View style={styles.studentCardInfo}>
              <Text style={styles.studentName}>{member.first_name} {member.last_name}</Text>
              <Text style={styles.studentSubInfo}>
                Submitted {new Date(sub.uploaded_at).toLocaleDateString()}
              </Text>
            </View>
            <StatusBadge status={sub.review_status} />
            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={C.ink4} style={{ marginLeft: S.xs }} />
          </TouchableOpacity>

          {isExpanded && (
            <View style={styles.expandedArea}>
              <TouchableOpacity style={styles.fileRow} onPress={() => handleViewFile(sub)}>
                <Ionicons name="document-text-outline" size={14} color={C.ink3} />
                <Text style={styles.fileName} numberOfLines={1}>{sub.file_name}</Text>
                <Ionicons name="open-outline" size={13} color={C.ink4} />
              </TouchableOpacity>

              {sub.review_status === 'pending_review' ? (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionBtn} disabled={updatingId === sub.id}
                    onPress={() => confirmStatus(sub, 'approved', 'Approved')}>
                    <Ionicons name="checkmark-circle-outline" size={15} color={C.ink2} />
                    <Text style={styles.actionBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} disabled={updatingId === sub.id}
                    onPress={() => confirmStatus(sub, 'revised', 'Revision Needed')}>
                    <Ionicons name="pencil-outline" size={15} color={C.ink2} />
                    <Text style={styles.actionBtnText}>Revise</Text>
                  </TouchableOpacity>

                </View>
              ) : (() => {
                const cfg = STATUS_CONFIG[sub.review_status] || STATUS_CONFIG.pending_review;
                const notice = STATUS_NOTICE[sub.review_status];
                return (
                  <View style={[styles.settledBar, { backgroundColor: cfg.bg }]}>
                    <View style={styles.settledBarLeft}>
                      <Ionicons name={cfg.icon as any} size={15} color={cfg.fg} />
                      <Text style={[styles.settledBarStatus, { color: cfg.fg }]}>{cfg.label}</Text>
                    </View>
                    {notice && <Text style={[styles.settledBarNotice, { color: cfg.fg }]} numberOfLines={2}>{notice}</Text>}
                  </View>
                );
              })()}

              {updatingId === sub.id && <ActivityIndicator size="small" color={C.ink1} style={{ marginTop: 8 }} />}
              <View style={styles.divider} />
              <TouchableOpacity style={styles.commentsBtn} onPress={() => openComments(sub)}>
                <Ionicons name="chatbox-ellipses-outline" size={15} color={C.ink3} />
                <Text style={styles.commentsBtnText}>Private Comments</Text>
                <Ionicons name="chevron-forward" size={14} color={C.ink4} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    } else {
      return (
        <View key={member.id} style={[styles.studentCard, styles.missingCard]}>
          <View style={styles.studentCardTop}>
            <View style={[styles.avatar, styles.missingAvatar]}>
              {member.profile_photo_url ? (
                <Image source={{ uri: member.profile_photo_url }} style={styles.avatarImg} />
              ) : (
                <Text style={[styles.avatarLetter, styles.missingAvatarLetter]}>{member.first_name?.[0]?.toUpperCase() || '?'}</Text>
              )}
            </View>
            <View style={styles.studentCardInfo}>
              <Text style={[styles.studentName, styles.missingText]}>{member.first_name} {member.last_name}</Text>
              <Text style={[styles.studentSubInfo, styles.missingText]}>No submission yet</Text>
            </View>
            <View style={styles.missingBadge}>
              <Text style={styles.missingBadgeText}>Missing</Text>
            </View>
          </View>
        </View>
      );
    }
  };

  const renderStudentsTab = () => (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.ink1} />}
    >
      {members.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={48} color={C.ink5} />
          <Text style={styles.emptyText}>No students assigned</Text>
        </View>
      ) : (
        <>
          {submittedMembers.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>Submitted ({submittedMembers.length})</Text>
              </View>
              {submittedMembers.map(m => renderStudentCard(m))}
            </>
          )}
          {missingMembers.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>Missing ({missingMembers.length})</Text>
              </View>
              {missingMembers.map(m => renderStudentCard(m))}
            </>
          )}
        </>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.ink1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{bin?.title || 'Bin Review'}</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'details' && styles.tabActive]}
          onPress={() => setActiveTab('details')}
        >
          <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>Details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'students' && styles.tabActive]}
          onPress={() => setActiveTab('students')}
        >
          <Text style={[styles.tabText, activeTab === 'students' && styles.tabTextActive]}>
            Students ({submittedMembers.length}/{members.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'details' ? renderDetailsTab() : renderStudentsTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: S.lg, paddingTop: 56, paddingBottom: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backBtn:     { marginRight: S.md, padding: S.xs },
  headerTitle: { ...T.h2, flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  tab:           { flex: 1, paddingVertical: S.md + 2, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:     { borderBottomColor: C.ink1 },
  tabText:       { ...T.label, color: C.ink4 },
  tabTextActive: { ...T.label, color: C.ink1 },
  detailCard: {
    backgroundColor: C.surface, marginHorizontal: S.lg, marginTop: S.lg,
    borderRadius: R.lg, padding: S.xl,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderLight, ...shadow.card,
  },
  detailTitle:        { ...T.h2, marginBottom: S.sm },
  detailDesc:         { ...T.body, color: C.ink2, lineHeight: 22, marginBottom: S.sm },
  detailDescEmpty:    { ...T.body, color: C.ink4, fontStyle: 'italic', marginBottom: S.sm },
  detailDeadlineRow:  { flexDirection: 'row', alignItems: 'center', gap: S.xs, marginTop: S.xs },
  detailDeadlineText: { ...T.small, color: C.ink3 },
  statsCard: {
    backgroundColor: C.surface, marginHorizontal: S.lg, marginTop: S.md,
    borderRadius: R.lg, padding: S.xl,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderLight, ...shadow.card,
  },
  statsHeading:  { ...T.label, color: C.ink3, marginBottom: S.md, textTransform: 'uppercase', letterSpacing: 0.8 },
  statsRow:      { flexDirection: 'row' },
  statBox:       { flex: 1, alignItems: 'center', paddingVertical: S.xs },
  statBoxBorder: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: C.borderLight },
  statNum:       { ...T.h2, fontSize: 20 },
  statLbl:       { ...T.tiny, marginTop: 2 },
  sectionHeader:     { paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.xs },
  sectionHeaderText: { ...T.label, color: C.ink3, textTransform: 'uppercase', letterSpacing: 0.8 },
  studentCard: {
    backgroundColor: C.surface, marginHorizontal: S.lg, marginTop: S.sm,
    borderRadius: R.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderLight,
    overflow: 'hidden' as const, ...shadow.soft,
  },
  missingCard:         { opacity: 0.6 },
  studentCardTop:      { flexDirection: 'row', alignItems: 'center', padding: S.lg, gap: S.md },
  studentCardInfo:     { flex: 1 },
  studentName:         { ...T.h3, marginBottom: 2 },
  studentSubInfo:      { ...T.tiny, color: C.ink3 },
  missingText:         { color: C.ink4 },
  expandedArea: {
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.borderLight,
    paddingHorizontal: S.lg, paddingBottom: S.md, paddingTop: S.sm,
  },
  fileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: S.sm, backgroundColor: C.surfaceAlt,
    borderRadius: R.md, paddingHorizontal: S.md, marginBottom: S.sm,
  },
  fileName: { ...T.small, color: C.ink3, flex: 1, textDecorationLine: 'underline' as const },
  actions:   { flexDirection: 'row', gap: S.sm, marginBottom: S.sm },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 12, borderRadius: R.md,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surfaceAlt,
  },
  actionBtnText: { ...T.label, color: C.ink2 },
  settledBar:       { flexDirection: 'row', alignItems: 'center', borderRadius: R.md, padding: S.md, gap: S.sm, marginBottom: S.sm },
  settledBarLeft:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settledBarStatus: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.2 },
  settledBarNotice: { flex: 1, fontSize: 11, opacity: 0.80, lineHeight: 16 },
  divider:         { height: StyleSheet.hairlineWidth, backgroundColor: C.borderLight, marginVertical: S.xs },
  commentsBtn:     { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: S.sm },
  commentsBtnText: { flex: 1, ...T.small, color: C.ink3 },
  avatar:              { width: 40, height: 40, borderRadius: 20, backgroundColor: C.ink1, justifyContent: 'center', alignItems: 'center' },
  avatarLetter:        { color: C.actionText, fontSize: 16, fontWeight: '600' as const },
  avatarImg:           { width: 40, height: 40, borderRadius: 20 },
  missingAvatar:       { backgroundColor: C.ink4 },
  missingAvatarLetter: { color: C.surface },
  missingBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.full, borderWidth: 1, borderColor: C.borderLight },
  missingBadgeText: { ...T.tiny, color: C.ink4 },
  badge:     { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: R.full, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '600' as const, letterSpacing: 0.2 },
  empty:     { alignItems: 'center', paddingVertical: 56 },
  emptyText: { ...T.body, color: C.ink4, marginTop: S.md },
});
