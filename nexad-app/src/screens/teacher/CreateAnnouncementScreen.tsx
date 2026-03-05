import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { classroomService } from '../../services/classroomService';
import { notificationService } from '../../services/notificationService';
import { Ionicons } from '@expo/vector-icons';
import { C, F, S, R, shadow } from '../../config/theme';

export default function CreateAnnouncementScreen({ navigation, route }: any) {
  const {
    classroomId,
    classroomName = 'your classroom',
    editMode = false,
    announcement: existing,
  } = route.params as {
    classroomId: string;
    classroomName?: string;
    editMode?: boolean;
    announcement?: any;
  };
  const { user } = useAuth();

  // â”€â”€ Form state â€“ pre-filled in edit mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [title, setTitle]       = useState(editMode ? existing?.title    || '' : '');
  const [content, setContent]   = useState(editMode ? existing?.content  || '' : '');
  const [isPinned, setIsPinned] = useState(editMode ? existing?.is_pinned ?? false : false);
  const [loading, setLoading]   = useState(false);

  // â”€â”€ Student assignment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [members, setMembers]             = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const existingAssigned: string[] = existing?.assigned_to || [];
  const [assignAll, setAssignAll]         = useState(existingAssigned.length === 0);
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set(existingAssigned));

  useEffect(() => {
    classroomService.getClassroomMembers(classroomId).then((res) => {
      if (res.data) setMembers(res.data);
    }).finally(() => setMembersLoading(false));
  }, []);

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // â”€â”€ Save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handlePost = async () => {
    if (!title.trim())   { Alert.alert('Error', 'Please enter a title'); return; }
    if (!content.trim()) { Alert.alert('Error', 'Please enter content'); return; }
    if (!user?.user_id)  { Alert.alert('Error', 'You must be logged in'); return; }
    if (!assignAll && selectedIds.size === 0) {
      Alert.alert('Error', 'Select at least one student or choose All Students');
      return;
    }

    const assignedTo = assignAll ? null : Array.from(selectedIds);
    setLoading(true);
    try {
      let result: any;
      if (editMode && existing?.id) {
        result = await classroomService.updateAnnouncement(existing.id, {
          title:    title.trim(),
          content:  content.trim(),
          is_pinned: isPinned,
          ...(assignedTo !== null ? { assigned_to: assignedTo } : { assigned_to: null }),
        });
      } else {
        result = await classroomService.createAnnouncement(
          classroomId, user.user_id, title.trim(), content.trim(), isPinned, assignedTo
        );
        if (result.data) {
          const targetIds = assignedTo ?? members.map((m) => m.id).filter(Boolean);
          if (targetIds.length > 0) {
            const teacherName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Your teacher';
            notificationService
              .notifyNewAnnouncement(targetIds, teacherName, classroomName, title.trim(), result.data.id)
              .catch(() => {});
          }
        }
      }

      if (result.data) {
        Alert.alert('Success', editMode ? 'Announcement updated!' : 'Announcement posted!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch {
      Alert.alert('Error', 'Failed to save announcement');
    } finally {
      setLoading(false);
    }
  };

  // â”€â”€ UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={C.ink1} />
          </TouchableOpacity>
          <Text style={styles.title}>{editMode ? 'Edit Announcement' : 'New Announcement'}</Text>
        </View>

        <View style={styles.form}>

          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Quiz on Friday"
              placeholderTextColor={C.ink4}
              maxLength={200}
            />
            <Text style={styles.hint}>{title.length}/200</Text>
          </View>

          {/* Content */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Content *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={content}
              onChangeText={setContent}
              placeholder="Write your announcement here..."
              placeholderTextColor={C.ink4}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={styles.hint}>{content.length}/2000</Text>
          </View>

          {/* Pin toggle */}
          <View style={styles.switchGroup}>
            <View style={styles.switchInfo}>
              <Ionicons name="pin" size={20} color={isPinned ? C.ink1 : C.ink4} />
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>Pin to Top</Text>
                <Text style={styles.switchHint}>Make this announcement stand out</Text>
              </View>
            </View>
            <Switch
              value={isPinned}
              onValueChange={setIsPinned}
              trackColor={{ false: C.borderLight, true: C.ink3 }}
              thumbColor={C.surface}
            />
          </View>

          {/* â”€â”€ Assign To â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <View style={styles.assignCard}>
            <View style={styles.assignCardHeader}>
              <Ionicons name="people-outline" size={17} color={C.ink2} />
              <Text style={styles.assignCardTitle}>Assign To</Text>
            </View>

            {/* All Students */}
            <TouchableOpacity style={styles.radioRow} onPress={() => setAssignAll(true)}>
              <View style={[styles.radio, assignAll && styles.radioActive]}>
                {assignAll && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.radioLabel}>All Students</Text>
              {!membersLoading && (
                <Text style={styles.radioCount}>({members.length})</Text>
              )}
            </TouchableOpacity>

            {/* Specific Students */}
            <TouchableOpacity style={styles.radioRow} onPress={() => setAssignAll(false)}>
              <View style={[styles.radio, !assignAll && styles.radioActive]}>
                {!assignAll && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.radioLabel}>Specific Students</Text>
              {!assignAll && selectedIds.size > 0 && (
                <Text style={styles.radioCount}>({selectedIds.size} selected)</Text>
              )}
            </TouchableOpacity>

            {/* Student checklist (only in specific mode) */}
            {!assignAll && (
              <View style={styles.studentList}>
                {membersLoading ? (
                  <ActivityIndicator size="small" color={C.ink2} style={{ marginVertical: 12 }} />
                ) : members.length === 0 ? (
                  <Text style={styles.noStudents}>No students enrolled yet</Text>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.selectAllBtn}
                      onPress={() =>
                        selectedIds.size === members.length
                          ? setSelectedIds(new Set())
                          : setSelectedIds(new Set(members.map((m) => m.id)))
                      }
                    >
                      <Text style={styles.selectAllText}>
                        {selectedIds.size === members.length ? 'Deselect All' : 'Select All'}
                      </Text>
                    </TouchableOpacity>

                    {members.map((m) => {
                      const sel = selectedIds.has(m.id);
                      return (
                        <TouchableOpacity
                          key={m.id}
                          style={styles.studentRow}
                          onPress={() => toggleStudent(m.id)}
                        >
                          <View style={[styles.checkbox, sel && styles.checkboxSel]}>
                            {sel && <Ionicons name="checkmark" size={12} color="#fff" />}
                          </View>
                          <View style={styles.studentAvatar}>
                            <Text style={styles.studentAvatarLetter}>
                              {(m.first_name?.[0] || '?').toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.studentName}>
                            {m.first_name} {m.last_name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}
              </View>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.postButton, loading && styles.postButtonDisabled]}
            onPress={handlePost}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={C.actionText} />
            ) : (
              <>
                <Ionicons name="megaphone" size={20} color={C.actionText} />
                <Text style={styles.postButtonText}>
                  {editMode ? 'Save Changes' : 'Post Announcement'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'transparent', paddingHorizontal: S.xl,
    paddingTop: S.xxl, paddingBottom: S.xl,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backButton: {
    width: 40, height: 40, borderRadius: R.full,
    backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center',
    marginRight: S.md, ...shadow.soft,
  },
  title: { fontSize: 24, fontWeight: '700' as const, color: C.ink1 },
  form: { padding: S.xl },
  inputGroup: { marginBottom: S.xl2 },
  label: {
    fontSize: 13, fontWeight: '600' as const, color: C.ink2,
    marginBottom: S.sm, textTransform: 'uppercase' as const, letterSpacing: 0.8,
  },
  input: {
    backgroundColor: C.surface, borderRadius: R.lg,
    padding: S.lg, fontSize: 16, color: C.ink1,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderLight,
  },
  textArea: { minHeight: 200, paddingTop: S.lg },
  hint: { fontSize: 12, color: C.ink4, marginTop: S.xs, textAlign: 'right' as const },
  switchGroup: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg,
    marginBottom: S.xl2, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderLight,
  },
  switchInfo: { flexDirection: 'row', alignItems: 'center', gap: S.md, flex: 1 },
  switchTextContainer: { flex: 1 },
  switchLabel: { fontSize: 16, fontWeight: '600' as const, color: C.ink1 },
  switchHint: { fontSize: 12, color: C.ink3, marginTop: 2 },

  // â”€â”€ Assign card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  assignCard: {
    backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg,
    marginBottom: S.xl2, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderLight,
  },
  assignCardHeader: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.md },
  assignCardTitle: { fontSize: 13, fontWeight: '600' as const, color: C.ink2, textTransform: 'uppercase' as const, letterSpacing: 0.8 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: S.sm },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: C.borderLight,
    justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: C.ink1 },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.ink1 },
  radioLabel: { flex: 1, fontSize: 15, color: C.ink1, fontWeight: '500' as const },
  radioCount: { fontSize: 13, color: C.ink3 },

  // Student list
  studentList: {
    marginTop: S.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.borderLight,
    paddingTop: S.md,
  },
  noStudents: { fontSize: 14, color: C.ink4, textAlign: 'center' as const, paddingVertical: S.md },
  selectAllBtn: { marginBottom: S.sm, paddingVertical: 4 },
  selectAllText: { fontSize: 13, color: C.ink2, fontWeight: '600' as const },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: 8 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 2, borderColor: C.borderLight,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxSel: { backgroundColor: C.ink1, borderColor: C.ink1 },
  studentAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.ink2, justifyContent: 'center', alignItems: 'center',
  },
  studentAvatarLetter: { color: '#fff', fontSize: 13, fontWeight: '700' as const },
  studentName: { flex: 1, fontSize: 14, color: C.ink1 },

  // Buttons
  postButton: {
    backgroundColor: C.action, borderRadius: R.lg, paddingVertical: S.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: S.sm, marginTop: S.sm, ...shadow.lift,
  },
  postButtonDisabled: { opacity: 0.6 },
  postButtonText: { color: C.actionText, fontSize: 16, fontWeight: '600' as const },
  cancelButton: { paddingVertical: S.lg, alignItems: 'center', marginTop: S.md },
  cancelButtonText: { color: C.ink3, fontSize: 16, fontWeight: '600' as const },
});
