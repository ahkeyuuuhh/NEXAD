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
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { classroomService } from '../../services/classroomService';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { C, F, T, S, R, shadow } from '../../config/theme';

export default function CreateAttachmentBinScreen({ navigation, route }: any) {
  const {
    classroomId,
    editMode = false,
    bin: existing,
  } = route.params as {
    classroomId: string;
    editMode?: boolean;
    bin?: any;
  };
  const { user } = useAuth();

  const [title, setTitle]             = useState(editMode ? existing?.title       || '' : '');
  const [description, setDescription] = useState(editMode ? existing?.description || '' : '');
  const [deadline, setDeadline]       = useState<Date | null>(
    editMode && existing?.deadline ? new Date(existing.deadline) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading]               = useState(false);

  const [members, setMembers]               = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const existingAssigned: string[] = existing?.assigned_to || [];
  const [assignAll, setAssignAll]           = useState(existingAssigned.length === 0);
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set(existingAssigned));

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

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDeadline(selectedDate);
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Error', 'Please enter a title'); return; }
    if (!user?.user_id) { Alert.alert('Error', 'You must be logged in'); return; }
    if (!assignAll && selectedIds.size === 0) {
      Alert.alert('Error', 'Select at least one student or choose All Students');
      return;
    }

    const assignedTo = assignAll ? null : Array.from(selectedIds);
    setLoading(true);
    try {
      let result: any;
      if (editMode && existing?.id) {
        result = await classroomService.updateAttachmentBin(existing.id, {
          title:       title.trim(),
          description: description.trim() || null,
          deadline:    deadline ? deadline.toISOString() : null,
          ...(assignedTo !== null ? { assigned_to: assignedTo } : { assigned_to: null }),
        });
      } else {
        result = await classroomService.createAttachmentBin(
          classroomId,
          user.user_id,
          title.trim(),
          description.trim() || null,
          deadline ? deadline.toISOString() : null,
          assignedTo
        );
      }

      if (result.data) {
        Alert.alert('Success', editMode ? 'Bin updated!' : 'Bin created!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch {
      Alert.alert('Error', 'Failed to save bin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={C.ink2} />
        </TouchableOpacity>
        <Text style={styles.title}>{editMode ? 'Edit Bin' : 'Create Attachment Bin'}</Text>
      </View>

      <View style={styles.form}>
        {!editMode && (
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={C.ink2} />
            <Text style={styles.infoText}>
              Attachment bins help you collect and organize documents from students. All submissions will be analyzed by AI.
            </Text>
          </View>
        )}

        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Project Proposal Drafts"
            placeholderTextColor={C.ink4}
            maxLength={200}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add instructions or requirements..."
            placeholderTextColor={C.ink4}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.hint}>{description.length}/1000</Text>
        </View>

        {/* Deadline */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Deadline (Optional)</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={20} color={C.ink3} />
            <Text style={styles.dateButtonText}>
              {deadline
                ? deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Set deadline'}
            </Text>
            {deadline && (
              <TouchableOpacity onPress={() => setDeadline(null)} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={C.ink4} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={deadline || new Date()}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        <View style={styles.assignCard}>
          <View style={styles.assignCardHeader}>
            <Ionicons name="people-outline" size={17} color={C.ink2} />
            <Text style={styles.assignCardTitle}>Assign To</Text>
          </View>

          {/* All students */}
          <TouchableOpacity style={styles.radioRow} onPress={() => setAssignAll(true)}>
            <View style={[styles.radio, assignAll && styles.radioActive]}>
              {assignAll && <View style={styles.radioDot} />}
            </View>
            <Text style={styles.radioLabel}>All Students</Text>
            {!membersLoading && <Text style={styles.radioCount}>({members.length})</Text>}
          </TouchableOpacity>

          {/* Specific students */}
          <TouchableOpacity style={styles.radioRow} onPress={() => setAssignAll(false)}>
            <View style={[styles.radio, !assignAll && styles.radioActive]}>
              {!assignAll && <View style={styles.radioDot} />}
            </View>
            <Text style={styles.radioLabel}>Specific Students</Text>
            {!assignAll && selectedIds.size > 0 && (
              <Text style={styles.radioCount}>({selectedIds.size} selected)</Text>
            )}
          </TouchableOpacity>

          {/* Student checklist */}
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

        {/* Save button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={C.actionText} />
          ) : (
            <>
              <Ionicons name={editMode ? 'save-outline' : 'folder-open'} size={20} color={C.actionText} />
              <Text style={styles.createButtonText}>{editMode ? 'Save Changes' : 'Create Bin'}</Text>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    marginRight: 16, ...shadow.soft,
  },
  title: { fontSize: 24, fontWeight: '600' as const, color: C.ink1 },
  form: { padding: 20 },
  infoCard: {
    flexDirection: 'row', backgroundColor: C.surfaceAlt,
    borderRadius: 12, padding: 16, marginBottom: 24, gap: 12,
  },
  infoText: { flex: 1, fontSize: 14, color: C.ink2, lineHeight: 20 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '600' as const, color: C.ink1, marginBottom: 8 },
  input: {
    backgroundColor: C.surface, borderRadius: 12, padding: 16,
    fontSize: 16, color: C.ink1, borderWidth: 1, borderColor: C.border,
  },
  textArea: { minHeight: 100, paddingTop: 16 },
  hint: { fontSize: 12, color: C.ink4, marginTop: 4, textAlign: 'right' as const },
  dateButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface,
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border, gap: 12,
  },
  dateButtonText: { flex: 1, fontSize: 16, color: C.ink1 },
  clearButton: { padding: 4 },

  assignCard: {
    backgroundColor: C.surface, borderRadius: 12, padding: 16,
    marginBottom: 24, borderWidth: 1, borderColor: C.border,
  },
  assignCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  assignCardTitle: { fontSize: 16, fontWeight: '600' as const, color: C.ink1 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: C.ink1 },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.ink1 },
  radioLabel: { flex: 1, fontSize: 15, color: C.ink1, fontWeight: '500' as const },
  radioCount: { fontSize: 13, color: C.ink3 },

  studentList: {
    marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, paddingTop: 12,
  },
  noStudents: { fontSize: 14, color: C.ink4, textAlign: 'center' as const, paddingVertical: 12 },
  selectAllBtn: { marginBottom: 8, paddingVertical: 4 },
  selectAllText: { fontSize: 13, color: C.ink2, fontWeight: '600' as const },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 2, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxSel: { backgroundColor: C.ink1, borderColor: C.ink1 },
  studentAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.ink2, justifyContent: 'center', alignItems: 'center',
  },
  studentAvatarLetter: { color: '#fff', fontSize: 13, fontWeight: '700' as const },
  studentName: { flex: 1, fontSize: 14, color: C.ink1 },

  createButton: {
    backgroundColor: C.action, borderRadius: 12, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8,
  },
  createButtonDisabled: { opacity: 0.6 },
  createButtonText: { color: C.actionText, fontSize: 16, fontWeight: '600' as const },
  cancelButton: { paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  cancelButtonText: { color: C.ink2, fontSize: 16, fontWeight: '600' as const },
});
