import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { C, S, R, shadow, T } from '../../config/theme';
import { profileService, TeacherProfile, StudentProfile } from '../../services/profileService';
import { useAuth } from '../../contexts/AuthContext';

// ── Option lists ─────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  'College of Engineering',
  'College of Computer Studies',
  'College of Information Technology and Computing',
  'College of Computer Engineering',
  'College of Arts and Sciences',
  'College of Business Administration',
  'College of Business Administration and Accountancy',
  'College of Accountancy',
  'College of Education',
  'College of Nursing',
  'College of Nursing and Health Sciences',
  'College of Pharmacy',
  'College of Dentistry',
  'College of Medicine',
  'College of Architecture',
  'College of Architecture and Fine Arts',
  'College of Law',
  'College of Criminal Justice Education',
  'College of Psychology',
  'College of Communication',
  'College of Social Work and Community Development',
  'College of Hospitality and Tourism Management',
  'College of Agriculture',
  'College of Mathematics and Natural Sciences',
  'Other',
];

const STUDENT_COURSES = [
  // Computing
  'BS Computer Science',
  'BS Information Technology',
  'BS Information Systems',
  'BS Computer Engineering',
  'BS Data Science',
  // Engineering
  'BS Civil Engineering',
  'BS Electrical Engineering',
  'BS Electronics Engineering',
  'BS Mechanical Engineering',
  'BS Chemical Engineering',
  'BS Industrial Engineering',
  'BS Environmental Engineering',
  // Business
  'BS Accountancy',
  'BS Management Accounting',
  'BS Business Administration (Marketing)',
  'BS Business Administration (Human Resource Management)',
  'BS Business Administration (Operations Management)',
  'BS Business Administration (Financial Management)',
  // Health
  'BS Nursing',
  'BS Pharmacy',
  'BS Nutrition and Dietetics',
  'BS Medical Technology',
  'BS Radiologic Technology',
  'BS Physical Therapy',
  // Education
  'BS Education (Elementary)',
  'BS Education (Secondary - Math)',
  'BS Education (Secondary - English)',
  'BS Education (Secondary - Science)',
  // Other BS
  'BS Architecture',
  'BS Criminology',
  'BS Psychology',
  'BS Tourism Management',
  'BS Hotel and Restaurant Management',
  'BS Social Work',
  'BS Biology',
  'BS Mathematics',
  'BS Statistics',
  'BS Environmental Science',
  // AB
  'AB Political Science',
  'AB Economics',
  'AB Psychology',
  'AB English',
  'AB Communication',
  'AB Philosophy',
  'AB Sociology',
  'Other',
];

const YEAR_LEVELS = ['1', '2', '3', '4', '5'];

const POSITIONS = [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Instructor',
  'Lecturer',
  'Department Chair',
  'Dean',
  'Other',
];

const SPECIALTIES_OPTIONS = [
  // Computing & Software
  'Data Structures & Algorithms',
  'Web Development (Frontend)',
  'Web Development (Backend)',
  'Full-Stack Development',
  'Mobile Development (Android)',
  'Mobile Development (iOS)',
  'React Native / Cross-Platform',
  'Software Engineering',
  'Software Testing & QA',
  'Object-Oriented Programming',
  'Functional Programming',
  'DevOps / CI-CD',
  // AI & Data
  'Machine Learning / AI',
  'Deep Learning & Neural Networks',
  'Natural Language Processing',
  'Computer Vision',
  'Data Science',
  'Data Analytics & Visualization',
  // Systems & Infrastructure
  'Database Systems',
  'Database Administration',
  'Computer Networks',
  'Network Security',
  'Operating Systems',
  'Embedded Systems',
  'IoT (Internet of Things)',
  'Cloud Computing (AWS)',
  'Cloud Computing (Azure / GCP)',
  'Cybersecurity',
  'Ethical Hacking & Penetration Testing',
  'Blockchain Technology',
  // Mathematics & Science
  'Discrete Mathematics',
  'Linear Algebra',
  'Calculus',
  'Statistics & Probability',
  'Numerical Methods',
  'Physics',
  'Chemistry',
  'Biology',
  // Engineering
  'Electronics & Circuit Analysis',
  'Signals & Systems',
  'Control Systems',
  'Thermodynamics',
  'Fluid Mechanics',
  'Structural Analysis',
  // Other
  'English Composition',
  'Technical Writing',
  'Project Management',
  'UI/UX Design',
  'Game Development',
];

// ── helpers ──────────────────────────────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  disabled,
  keyboardType,
  multiline,
  numberOfLines,
}: {
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  disabled?: boolean;
  keyboardType?: any;
  multiline?: boolean;
  numberOfLines?: number;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[
          fieldStyles.input,
          disabled && fieldStyles.inputDisabled,
          multiline && { height: (numberOfLines || 3) * 22, textAlignVertical: 'top', paddingTop: S.md },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ''}
        placeholderTextColor={C.ink5}
        editable={!disabled}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: S.lg },
  label: { ...T.label, marginBottom: S.xs, color: C.ink3 },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    paddingVertical: S.sm + 2,
    fontSize: 14,
    color: C.ink1,
    ...shadow.soft,
  },
  inputDisabled: {
    backgroundColor: C.surfaceAlt,
    color: C.ink4,
  },
});

// ── SelectField ───────────────────────────────────────────────────────────────
function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [otherText, setOtherText] = useState('');

  const close = () => { setOpen(false); setShowOther(false); };

  return (
    <View style={sfStyles.wrap}>
      <Text style={sfStyles.label}>{label}</Text>
      <TouchableOpacity
        style={sfStyles.btn}
        onPress={() => { setOpen(true); setShowOther(false); setOtherText(''); }}
      >
        <Text style={[sfStyles.btnText, !value && sfStyles.btnPlaceholder]}>
          {value || placeholder || 'Select…'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={C.ink4} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={sfStyles.overlay} activeOpacity={1} onPress={close} />
          <View style={sfStyles.sheet}>
            <View style={sfStyles.handle} />
            <View style={sfStyles.sheetHeader}>
              <Text style={sfStyles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={close}>
                <Ionicons name="close" size={20} color={C.ink2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={sfStyles.optionsList} keyboardShouldPersistTaps="handled">
              {options.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={[sfStyles.option, value === opt && sfStyles.optionActive]}
                  onPress={() => {
                    if (opt === 'Other') {
                      setShowOther(true);
                      setOtherText('');
                    } else {
                      onChange(opt);
                      close();
                    }
                  }}
                >
                  <Text style={[sfStyles.optionText, value === opt && sfStyles.optionTextActive]}>
                    {opt}
                  </Text>
                  {value === opt && <Ionicons name="checkmark" size={16} color={C.ink1} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            {showOther && (
              <View style={sfStyles.otherWrap}>
                <TextInput
                  style={sfStyles.otherInput}
                  value={otherText}
                  onChangeText={setOtherText}
                  placeholder={`Type custom ${label.toLowerCase()}…`}
                  placeholderTextColor={C.ink5}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => { if (otherText.trim()) { onChange(otherText.trim()); close(); } }}
                />
                <TouchableOpacity
                  style={[sfStyles.otherConfirm, !otherText.trim() && { opacity: 0.4 }]}
                  onPress={() => { if (otherText.trim()) { onChange(otherText.trim()); close(); } }}
                >
                  <Text style={sfStyles.otherConfirmText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const sfStyles = StyleSheet.create({
  wrap: { marginBottom: S.lg },
  label: { ...T.label, marginBottom: S.xs, color: C.ink3 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    paddingVertical: S.sm + 2,
    ...shadow.soft,
  },
  btnText: { fontSize: 14, color: C.ink1, flex: 1 },
  btnPlaceholder: { color: C.ink5 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    maxHeight: '65%',
    ...shadow.float,
  },
  handle: {
    width: 36, height: 4, backgroundColor: C.border,
    borderRadius: 2, alignSelf: 'center',
    marginTop: S.sm, marginBottom: S.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  sheetTitle: { ...T.h3, color: C.ink1 },
  optionsList: { maxHeight: 320 },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S.lg,
    paddingVertical: S.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  optionActive: { backgroundColor: C.accentSoft },
  optionText: { fontSize: 14, color: C.ink2 },
  optionTextActive: { color: C.ink1, fontWeight: '600' as const },
  otherWrap: {
    flexDirection: 'row',
    gap: S.sm,
    padding: S.lg,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  otherInput: {
    flex: 1,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    fontSize: 14,
    color: C.ink1,
  },
  otherConfirm: {
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
    backgroundColor: C.ink1,
    borderRadius: R.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otherConfirmText: { color: '#fff', fontWeight: '700' as const, fontSize: 13 },
});

// ── Specialties tag input ─────────────────────────────────────────────────────
function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [otherText, setOtherText] = useState('');

  const toggleTag = (spec: string) => {
    if (tags.includes(spec)) {
      onChange(tags.filter(t => t !== spec));
    } else {
      onChange([...tags, spec]);
    }
  };

  const addCustom = () => {
    const trimmed = otherText.trim();
    if (!trimmed || tags.includes(trimmed)) { setOtherText(''); return; }
    onChange([...tags, trimmed]);
    setOtherText('');
    setShowOther(false);
  };

  return (
    <View style={tagStyles.wrap}>
      <Text style={tagStyles.label}>Specialties / Expertise</Text>
      {tags.length > 0 && (
        <View style={tagStyles.tagsRow}>
          {tags.map((tag, i) => (
            <View key={i} style={tagStyles.tag}>
              <Text style={tagStyles.tagText}>{tag}</Text>
              <TouchableOpacity
                onPress={() => onChange(tags.filter((_, idx) => idx !== i))}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close" size={13} color={C.ink3} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <TouchableOpacity style={tagStyles.browseBtn} onPress={() => { setShowPicker(true); setShowOther(false); }}>
        <Ionicons name="add-circle-outline" size={16} color={C.ink2} style={{ marginRight: 6 }} />
        <Text style={tagStyles.browseBtnText}>Select Specialty</Text>
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowPicker(false); setShowOther(false); }}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
            activeOpacity={1}
            onPress={() => { setShowPicker(false); setShowOther(false); }}
          />
          <View style={tagStyles.sheet}>
            <View style={tagStyles.handle} />
            <View style={tagStyles.sheetHeader}>
              <Text style={tagStyles.sheetTitle}>Select Specialties</Text>
              <TouchableOpacity onPress={() => { setShowPicker(false); setShowOther(false); }}>
                <Ionicons name="close" size={20} color={C.ink2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
              {SPECIALTIES_OPTIONS.map((spec, i) => {
                const selected = tags.includes(spec);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[tagStyles.specOption, selected && tagStyles.specOptionActive]}
                    onPress={() => toggleTag(spec)}
                  >
                    <Text style={[tagStyles.specText, selected && tagStyles.specTextActive]}>{spec}</Text>
                    {selected && <Ionicons name="checkmark-circle" size={18} color={C.ink1} />}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[tagStyles.specOption, showOther && tagStyles.specOptionActive]}
                onPress={() => { setShowOther(!showOther); setOtherText(''); }}
              >
                <Text style={tagStyles.specText}>Other (type custom)</Text>
                <Ionicons name="create-outline" size={18} color={C.ink3} />
              </TouchableOpacity>
            </ScrollView>
            {showOther && (
              <View style={tagStyles.otherRow}>
                <TextInput
                  style={tagStyles.otherInput}
                  value={otherText}
                  onChangeText={setOtherText}
                  placeholder="Type custom specialty…"
                  placeholderTextColor={C.ink5}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={addCustom}
                />
                <TouchableOpacity
                  style={[tagStyles.otherConfirm, !otherText.trim() && { opacity: 0.4 }]}
                  onPress={addCustom}
                >
                  <Text style={tagStyles.otherConfirmText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={{ padding: S.lg, borderTopWidth: 1, borderTopColor: C.borderLight }}>
              <TouchableOpacity
                style={{ backgroundColor: C.ink1, borderRadius: R.xl, paddingVertical: S.md, alignItems: 'center' }}
                onPress={() => { setShowPicker(false); setShowOther(false); }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' as const, fontSize: 14 }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const tagStyles = StyleSheet.create({
  wrap: { marginBottom: 0 },
  label: { ...T.label, marginBottom: S.sm, color: C.ink3 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.sm },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.accentLight,
    borderRadius: R.full,
    paddingHorizontal: S.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.border,
  },
  tagText: { fontSize: 12, fontWeight: '600' as const, color: C.ink2 },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    backgroundColor: C.bg,
    alignSelf: 'flex-start',
  },
  browseBtnText: { fontSize: 13, fontWeight: '600' as const, color: C.ink2 },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    maxHeight: '72%',
    ...shadow.float,
  },
  handle: {
    width: 36, height: 4, backgroundColor: C.border,
    borderRadius: 2, alignSelf: 'center',
    marginTop: S.sm, marginBottom: S.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  sheetTitle: { ...T.h3, color: C.ink1 },
  specOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S.lg,
    paddingVertical: S.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  specOptionActive: { backgroundColor: C.accentSoft },
  specText: { fontSize: 14, color: C.ink2, flex: 1 },
  specTextActive: { color: C.ink1, fontWeight: '600' as const },
  otherRow: {
    flexDirection: 'row',
    gap: S.sm,
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  otherInput: {
    flex: 1,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    fontSize: 14,
    color: C.ink1,
  },
  otherConfirm: {
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
    backgroundColor: C.ink1,
    borderRadius: R.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otherConfirmText: { color: '#fff', fontWeight: '700' as const, fontSize: 13 },
});

// ── Office Hours row ──────────────────────────────────────────────────────────
function OfficeHoursEditor({
  hours,
  onChange,
}: {
  hours: { day: string; start: string; end: string }[];
  onChange: (h: { day: string; start: string; end: string }[]) => void;
}) {
  const addSlot = () => {
    onChange([...hours, { day: 'Monday', start: '09:00', end: '17:00' }]);
  };

  const removeSlot = (i: number) => {
    onChange(hours.filter((_, idx) => idx !== i));
  };

  const updateSlot = (i: number, field: 'day' | 'start' | 'end', val: string) => {
    const updated = hours.map((h, idx) => idx === i ? { ...h, [field]: val } : h);
    onChange(updated);
  };

  return (
    <View style={ohStyles.wrap}>
      <Text style={ohStyles.label}>Office Hours</Text>
      {hours.map((h, i) => (
        <View key={i} style={ohStyles.slot}>
          <TextInput
            style={[ohStyles.fieldSm, { flex: 2 }]}
            value={h.day}
            onChangeText={v => updateSlot(i, 'day', v)}
            placeholder="Day"
            placeholderTextColor={C.ink5}
          />
          <TextInput
            style={[ohStyles.fieldSm, { flex: 1.5 }]}
            value={h.start}
            onChangeText={v => updateSlot(i, 'start', v)}
            placeholder="09:00"
            placeholderTextColor={C.ink5}
          />
          <Text style={ohStyles.dash}>–</Text>
          <TextInput
            style={[ohStyles.fieldSm, { flex: 1.5 }]}
            value={h.end}
            onChangeText={v => updateSlot(i, 'end', v)}
            placeholder="17:00"
            placeholderTextColor={C.ink5}
          />
          <TouchableOpacity onPress={() => removeSlot(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={16} color={C.red} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={ohStyles.addBtn} onPress={addSlot}>
        <Ionicons name="add-circle-outline" size={16} color={C.ink2} style={{ marginRight: 4 }} />
        <Text style={ohStyles.addBtnText}>Add Time Slot</Text>
      </TouchableOpacity>
    </View>
  );
}

const ohStyles = StyleSheet.create({
  wrap: { marginBottom: S.lg },
  label: { ...T.label, marginBottom: S.sm, color: C.ink3 },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    marginBottom: S.sm,
  },
  fieldSm: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.sm,
    paddingHorizontal: S.sm,
    paddingVertical: 6,
    fontSize: 13,
    color: C.ink1,
  },
  dash: { color: C.ink3, fontSize: 14 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S.sm,
  },
  addBtnText: { ...T.label, color: C.ink2 },
});

// ── Toggle row ────────────────────────────────────────────────────────────────
function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={toggleStyle.row}>
      <Text style={toggleStyle.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.border, true: C.ink2 }}
        thumbColor={value ? C.ink1 : '#f4f3f4'}
      />
    </View>
  );
}

const toggleStyle = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: S.md,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  label: { ...T.body, color: C.ink1 },
});

// ── Horizontal Select Row (flat row style for form groups) ──────────────────
function HSelectRow({
  label, value, onChange, options, placeholder, last,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string; last?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [otherText, setOtherText] = useState('');
  const close = () => { setOpen(false); setShowOther(false); };

  return (
    <>
      <TouchableOpacity
        style={[hsStyles.row, last && hsStyles.lastRow]}
        onPress={() => { setOpen(true); setShowOther(false); setOtherText(''); }}
      >
        <Text style={hsStyles.label}>{label}</Text>
        <View style={hsStyles.valueWrap}>
          <Text style={[hsStyles.value, !value && hsStyles.placeholder]} numberOfLines={1}>
            {value || placeholder || 'Select…'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={C.ink4} />
        </View>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} activeOpacity={1} onPress={close} />
          <View style={hsStyles.sheet}>
            <View style={hsStyles.handle} />
            <View style={hsStyles.sheetHeader}>
              <Text style={hsStyles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={close}><Ionicons name="close" size={20} color={C.ink2} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
              {options.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={[hsStyles.option, value === opt && hsStyles.optionActive]}
                  onPress={() => {
                    if (opt === 'Other') { setShowOther(true); setOtherText(''); }
                    else { onChange(opt); close(); }
                  }}
                >
                  <Text style={[hsStyles.optionText, value === opt && hsStyles.optionTextActive]}>{opt}</Text>
                  {value === opt && <Ionicons name="checkmark" size={16} color={C.ink1} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            {showOther && (
              <View style={hsStyles.otherWrap}>
                <TextInput
                  style={hsStyles.otherInput}
                  value={otherText}
                  onChangeText={setOtherText}
                  placeholder={`Type custom ${label.toLowerCase()}…`}
                  placeholderTextColor={C.ink5}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => { if (otherText.trim()) { onChange(otherText.trim()); close(); } }}
                />
                <TouchableOpacity
                  style={[hsStyles.otherConfirm, !otherText.trim() && { opacity: 0.4 }]}
                  onPress={() => { if (otherText.trim()) { onChange(otherText.trim()); close(); } }}
                >
                  <Text style={hsStyles.otherConfirmText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const hsStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: S.lg, minHeight: 54,
    backgroundColor: 'transparent', // Completely transparent
    borderBottomWidth: 1, borderBottomColor: 'rgba(0, 0, 0, 0.04)', // Very subtle divider
  },
  lastRow: { borderBottomWidth: 0 },
  label: { fontSize: 14, color: C.ink3, fontWeight: '500' as const },
  valueWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'flex-end' },
  value: { fontSize: 14, color: C.ink1, textAlign: 'right' as const },
  placeholder: { color: C.ink5 },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
    maxHeight: '65%', ...shadow.float,
  },
  handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center' as const, marginTop: S.sm, marginBottom: S.xs },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: S.lg, paddingVertical: S.md,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  sheetTitle: { ...T.h3, color: C.ink1 },
  option: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: S.lg, paddingVertical: S.md + 2,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  optionActive: { backgroundColor: C.accentSoft },
  optionText: { fontSize: 14, color: C.ink2 },
  optionTextActive: { color: C.ink1, fontWeight: '600' as const },
  otherWrap: { flexDirection: 'row', gap: S.sm, padding: S.lg, borderTopWidth: 1, borderTopColor: C.borderLight },
  otherInput: {
    flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: S.sm, fontSize: 14, color: C.ink1,
  },
  otherConfirm: {
    paddingHorizontal: S.lg, paddingVertical: S.sm, backgroundColor: C.ink1,
    borderRadius: R.md, justifyContent: 'center', alignItems: 'center',
  },
  otherConfirmText: { color: '#fff', fontWeight: '700' as const, fontSize: 13 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AccountSettingsScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const role = user?.role;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Shared fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');

  // Student fields
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [course, setCourse] = useState('');
  // Teacher fields
  const [employeeId, setEmployeeId] = useState('');
  const [tDepartment, setTDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [expertiseTags, setExpertiseTags] = useState<string[]>([]);
  const [officeLocation, setOfficeLocation] = useState('');
  const [officeHours, setOfficeHours] = useState<{ day: string; start: string; end: string }[]>([]);
  const [bio, setBio] = useState('');
  const [maxConsultations, setMaxConsultations] = useState('8');
  const [consultationDuration, setConsultationDuration] = useState('30');
  const [responseTime, setResponseTime] = useState('24');
  const [isAccepting, setIsAccepting] = useState(true);

  // Notification prefs
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user?.user_id) return;
    setLoading(true);
    try {
      if (role === 'teacher') {
        const result = await profileService.getTeacherProfile(user.user_id);
        if (result.data) {
          const p = result.data as TeacherProfile;
          setFirstName(p.first_name || '');
          setLastName(p.last_name || '');
          setPhone(p.phone || '');
          setEmail(p.email || '');
          setProfilePhotoUrl(p.profile_photo_url || '');
          setEmployeeId(p.employee_id || '');
          setTDepartment(p.department || '');
          setPosition(p.position || '');
          setExpertiseTags(p.expertise_tags || []);
          setOfficeLocation(p.office_location || '');
          setOfficeHours(p.office_hours || []);
          setBio(p.bio || '');
          setMaxConsultations(String(p.max_consultations_per_day ?? 8));
          setConsultationDuration(String(p.consultation_duration_minutes ?? 30));
          setResponseTime(String(p.average_response_time_hours ?? 24));
          setIsAccepting(p.is_accepting_consultations ?? true);
          setNotifEmail(p.notification_preferences?.email ?? true);
          setNotifPush(p.notification_preferences?.push ?? true);
        }
      } else {
        const result = await profileService.getStudentProfile(user.user_id);
        if (result.data) {
          const p = result.data as StudentProfile;
          setFirstName(p.first_name || '');
          setLastName(p.last_name || '');
          setPhone(p.phone || '');
          setEmail(p.email || '');
          setProfilePhotoUrl(p.profile_photo_url || '');
          setStudentId(p.student_id || '');
          setDepartment(p.department || '');
          setYearLevel(p.year_level ? String(p.year_level) : '');
          setCourse(p.course || '');
          setNotifEmail(p.notification_preferences?.email ?? true);
          setNotifPush(p.notification_preferences?.push ?? true);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user?.user_id, role]);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const handleSave = async () => {
    // Names are not editable, so no validation needed for them
    if (!user?.user_id) return;

    setSaving(true);
    try {
      if (role === 'teacher') {
        const result = await profileService.updateTeacherProfile(user.user_id, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || undefined,
          department: tDepartment.trim() || undefined,
          position: position.trim() || undefined,
          expertise_tags: expertiseTags,
          office_location: officeLocation.trim() || undefined,
          office_hours: officeHours,
          bio: bio.trim() || undefined,
          max_consultations_per_day: parseInt(maxConsultations) || 8,
          consultation_duration_minutes: parseInt(consultationDuration) || 30,
          average_response_time_hours: parseInt(responseTime) || 24,
          is_accepting_consultations: isAccepting,
          notification_preferences: { email: notifEmail, push: notifPush, sms: false },
        });
        if (result.error) {
          Alert.alert('Error', result.error);
          return;
        }
      } else {
        const result = await profileService.updateStudentProfile(user.user_id, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || undefined,
          student_id: studentId.trim() || undefined,
          department: department.trim() || undefined,
          year_level: yearLevel ? parseInt(yearLevel) : undefined,
          course: course.trim() || undefined,
          notification_preferences: { email: notifEmail, push: notifPush, sms: false },
        });
        if (result.error) {
          Alert.alert('Error', result.error);
          return;
        }
      }
      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <Image 
          source={require('../../../assets/NEXAD GIF.gif')} 
          style={styles.loadingGif}
          resizeMode="contain"
        />
      </View>
    );
  }

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={22} color={C.ink1} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Profile overview card ── */}
          <View style={styles.profileCard}>
            <LinearGradient
              colors={['#111111', '#2a2a2a']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                {profilePhotoUrl ? (
                  <Image source={{ uri: profilePhotoUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitialsText}>
                    {([firstName[0], lastName[0]].filter(Boolean).join('') || '?').toUpperCase()}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.profileCardInfo}>
              <Text style={styles.profileCardName}>
                {[firstName, lastName].filter(Boolean).join(' ') || 'Your Name'}
              </Text>
              <Text style={styles.profileCardSub}>{email}</Text>
              <View style={styles.profileCardRole}>
                <Text style={styles.profileCardRoleText}>{role === 'teacher' ? 'Teacher' : 'Student'}</Text>
              </View>
            </View>
          </View>

          {/* ── Personal Information ── */}
          <Text style={styles.groupLabel}>PERSONAL INFORMATION</Text>
          <View style={styles.formGroup}>
            <View style={styles.formRow}>
              <Text style={styles.rowLabel}>First name</Text>
              <Text style={styles.rowValue}>{firstName || 'Not set'}</Text>
            </View>
            <View style={styles.formRow}>
              <Text style={styles.rowLabel}>Last name</Text>
              <Text style={styles.rowValue}>{lastName || 'Not set'}</Text>
            </View>
            <View style={styles.formRow}>
              <Text style={styles.rowLabel}>Phone number</Text>
              <TextInput
                style={styles.rowInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                placeholderTextColor={C.ink5}
                keyboardType="phone-pad"
              />
            </View>
            <View style={[styles.formRow, styles.lastRow]}>
              <Text style={styles.rowLabel}>Email</Text>
              <Text style={styles.rowValueDisabled} numberOfLines={1}>{email}</Text>
            </View>
          </View>

          {/* ── Student Academic ── */}
          {role === 'student' && (
            <>
              <Text style={styles.groupLabel}>ACADEMIC INFORMATION</Text>
              <View style={styles.formGroup}>
                <View style={styles.formRow}>
                  <Text style={styles.rowLabel}>Student ID</Text>
                  <TextInput
                    style={styles.rowInput}
                    value={studentId}
                    onChangeText={setStudentId}
                    placeholder="e.g. 2021-00001"
                    placeholderTextColor={C.ink5}
                  />
                </View>
                <HSelectRow label="Department" value={department} onChange={setDepartment} options={DEPARTMENTS} placeholder="Select…" />
                <HSelectRow label="Course" value={course} onChange={setCourse} options={STUDENT_COURSES} placeholder="Select…" />
                <HSelectRow label="Year Level" value={yearLevel} onChange={setYearLevel} options={YEAR_LEVELS} placeholder="Select…" last />
              </View>
            </>
          )}

          {/* ── Teacher Professional ── */}
          {role === 'teacher' && (
            <>
              <Text style={styles.groupLabel}>PROFESSIONAL INFORMATION</Text>
              <View style={styles.formGroup}>
                <View style={styles.formRow}>
                  <Text style={styles.rowLabel}>Employee ID</Text>
                  <TextInput
                    style={styles.rowInput}
                    value={employeeId}
                    onChangeText={setEmployeeId}
                    placeholder="e.g. EMP-00001"
                    placeholderTextColor={C.ink5}
                  />
                </View>
                <HSelectRow label="Department" value={tDepartment} onChange={setTDepartment} options={DEPARTMENTS} placeholder="Select…" />
                <HSelectRow label="Position" value={position} onChange={setPosition} options={POSITIONS} placeholder="Select…" />
                <View style={styles.formRow}>
                  <Text style={styles.rowLabel}>Office</Text>
                  <TextInput
                    style={styles.rowInput}
                    value={officeLocation}
                    onChangeText={setOfficeLocation}
                    placeholder="Room / Building"
                    placeholderTextColor={C.ink5}
                  />
                </View>
                <View style={[styles.formRow, styles.lastRow, { minHeight: 80, alignItems: 'flex-start', paddingTop: S.md }]}>
                  <Text style={[styles.rowLabel, { marginTop: 2 }]}>Bio</Text>
                  <TextInput
                    style={[styles.rowInput, { textAlign: 'left', minHeight: 60, paddingTop: 0 }]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="About yourself…"
                    placeholderTextColor={C.ink5}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              <Text style={styles.groupLabel}>SPECIALTIES</Text>
              <View style={[styles.formGroup, styles.paddedGroup]}>
                <TagInput tags={expertiseTags} onChange={setExpertiseTags} />
              </View>

              <Text style={styles.groupLabel}>CONSULTATION SETTINGS</Text>
              <View style={styles.formGroup}>
                <View style={styles.formRow}>
                  <Text style={styles.rowLabel}>Max / day</Text>
                  <TextInput style={styles.rowInput} value={maxConsultations} onChangeText={setMaxConsultations} keyboardType="number-pad" placeholder="8" placeholderTextColor={C.ink5} />
                </View>
                <View style={styles.formRow}>
                  <Text style={styles.rowLabel}>Duration (min)</Text>
                  <TextInput style={styles.rowInput} value={consultationDuration} onChangeText={setConsultationDuration} keyboardType="number-pad" placeholder="30" placeholderTextColor={C.ink5} />
                </View>
                <View style={styles.formRow}>
                  <Text style={styles.rowLabel}>Response time (h)</Text>
                  <TextInput style={styles.rowInput} value={responseTime} onChangeText={setResponseTime} keyboardType="number-pad" placeholder="24" placeholderTextColor={C.ink5} />
                </View>
                <View style={[styles.menuRow, styles.lastRow]}>
                  <Text style={[styles.menuLabel, { flex: 1 }]}>Accepting Consultations</Text>
                  <Switch value={isAccepting} onValueChange={setIsAccepting} trackColor={{ false: C.border, true: '#202124' }} thumbColor="#fff" />
                </View>
              </View>

              <Text style={styles.groupLabel}>OFFICE HOURS</Text>
              <View style={[styles.formGroup, styles.paddedGroup]}>
                <OfficeHoursEditor hours={officeHours} onChange={setOfficeHours} />
              </View>
            </>
          )}

          {/* ── Notifications ── */}
          <Text style={styles.groupLabel}>NOTIFICATIONS</Text>
          <View style={styles.formGroup}>
            <View style={styles.menuRow}>
              <Ionicons name="notifications-outline" size={20} color={C.ink2} style={styles.menuIcon} />
              <Text style={[styles.menuLabel, { flex: 1 }]}>Push Notifications</Text>
              <Switch value={notifPush} onValueChange={setNotifPush} trackColor={{ false: C.border, true: '#202124' }} thumbColor="#fff" />
            </View>
            <View style={[styles.menuRow, styles.lastRow]}>
              <Ionicons name="mail-outline" size={20} color={C.ink2} style={styles.menuIcon} />
              <Text style={[styles.menuLabel, { flex: 1 }]}>Email Notifications</Text>
              <Switch value={notifEmail} onValueChange={setNotifEmail} trackColor={{ false: C.border, true: '#202124' }} thumbColor="#fff" />
            </View>
          </View>

          {/* ── Action Buttons ── */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={[styles.ctaBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.ctaBtnText}>Save Changes</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#FFFFFF" style={{ marginRight: S.sm }} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteAccountBtn}
              onPress={() => Alert.alert('Delete Account', 'To delete your account, please contact support.')}
            >
              <Text style={styles.deleteAccountText}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 48 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' }, // Same as dashboard
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  loadingGif: { width: 200, height: 200 },

  safeHeader: { backgroundColor: 'transparent', borderBottomWidth: 0 }, // Remove white background
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: S.lg, paddingVertical: S.md,
  },
  iconBtn: {
    width: 36, height: 36, justifyContent: 'center', alignItems: 'center',
    borderRadius: R.full, backgroundColor: C.accentSoft,
  },
  headerTitle: { ...T.h3, color: C.ink1 },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: S.xl },

  // Profile overview card
  profileCard: {
    flexDirection: 'row', // Horizontal alignment
    alignItems: 'center', 
    paddingVertical: S.lg,
    paddingHorizontal: S.lg,
    marginHorizontal: S.lg, 
    marginBottom: S.xl,
    backgroundColor: 'transparent', // Will use LinearGradient
    borderRadius: R.xl,
    borderWidth: 1, 
    borderColor: C.borderLight, 
    ...shadow.soft,
    overflow: 'hidden',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: S.md, // Add margin for horizontal layout
  },
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30, // Smaller for horizontal layout
    backgroundColor: C.ink1, justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 60, 
    height: 60, 
    borderRadius: 30,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarInitialsText: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: 1 }, // Smaller for horizontal layout
  profileCardInfo: { flex: 1 }, // New style for horizontal layout
  profileCardName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 3 }, // White text for gradient
  profileCardSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: S.sm }, // White with opacity
  profileCardRole: {
    backgroundColor: 'rgba(255,255,255,0.2)', // Translucent white for gradient
    paddingHorizontal: S.md,
    paddingVertical: 4,
    borderRadius: R.full,
    alignSelf: 'flex-start', // For horizontal layout
  },
  profileCardRoleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Section group labels
  groupLabel: { ...T.cap, marginHorizontal: S.lg + 4, marginBottom: S.sm, marginTop: 2 },

  // Form group container (very light translucent card - almost invisible)
  formGroup: {
    marginHorizontal: S.lg, marginBottom: S.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.25)', // Even lighter translucent white
    borderRadius: R.lg,
    borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', // Even more subtle border
    overflow: 'hidden',
  },
  paddedGroup: { padding: S.lg },

  // Horizontal form rows (label left, input right) - completely flat
  formRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: S.lg, minHeight: 54,
    backgroundColor: 'transparent', // Completely transparent
    borderBottomWidth: 1, borderBottomColor: 'rgba(0, 0, 0, 0.04)', // Very subtle divider
  },
  lastRow: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 14, color: C.ink2, fontWeight: '600' as const, flexShrink: 0, marginRight: S.sm }, // Darker and bolder
  rowInput: { flex: 1, textAlign: 'right' as const, fontSize: 14, color: C.ink1, paddingVertical: S.md, backgroundColor: 'transparent' }, // Transparent background
  rowValue: { flex: 1, textAlign: 'right' as const, fontSize: 14, color: C.ink1, paddingVertical: S.md, backgroundColor: 'transparent' }, // Non-editable value
  rowValueDisabled: { flex: 1, textAlign: 'right' as const, fontSize: 14, color: C.ink3, backgroundColor: 'transparent' }, // Transparent background

  // Menu rows (icon + label + switch) - completely flat
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: S.lg, minHeight: 54,
    backgroundColor: 'transparent', // Completely transparent
    borderBottomWidth: 1, borderBottomColor: 'rgba(0, 0, 0, 0.04)', // Very subtle divider
  },
  menuIcon: { marginRight: S.md },
  menuLabel: { ...T.body, color: C.ink1 },

  // Bottom action area
  actionsSection: { marginHorizontal: S.lg, marginTop: S.sm, gap: S.md },
  ctaBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.ink1, borderRadius: R.xl,
    paddingVertical: S.lg, ...shadow.card,
  },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: R.xl, paddingVertical: S.lg,
    borderWidth: 1.5, borderColor: '#808080', backgroundColor: '#808080', // Grey background
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' }, // White text
  deleteAccountBtn: { alignItems: 'center', paddingVertical: S.md },
  deleteAccountText: { fontSize: 15, fontWeight: '600', color: '#DC2626', textDecorationLine: 'none' as const }, // Red text, no underline
});
