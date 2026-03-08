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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
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

      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => { setShowPicker(false); setShowOther(false); }}>
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

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AccountSettingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const role = user?.role;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Shared fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

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
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Required', 'First name and last name are required.');
      return;
    }
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
        <ActivityIndicator size="large" color={C.ink1} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={C.ink1} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account Settings</Text>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.saveBtnText}>Save</Text>
            }
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Personal */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <View style={styles.card}>
              <Field label="First Name" value={firstName} onChangeText={setFirstName} placeholder="First name" />
              <Field label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Last name" />
              <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
              <Field label="Email" value={email} disabled />
            </View>
          </View>

          {/* Student-specific */}
          {role === 'student' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Academic Information</Text>
              <View style={styles.card}>
                <Field label="Student ID" value={studentId} onChangeText={setStudentId} placeholder="e.g. 2021-00001" />
                <SelectField label="Department" value={department} onChange={setDepartment} options={DEPARTMENTS} placeholder="Select department…" />
                <SelectField label="Course / Program" value={course} onChange={setCourse} options={STUDENT_COURSES} placeholder="Select course…" />
                <SelectField label="Year Level" value={yearLevel} onChange={setYearLevel} options={YEAR_LEVELS} placeholder="Select year…" />
              </View>
            </View>
          )}

          {/* Teacher-specific */}
          {role === 'teacher' && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Professional Information</Text>
                <View style={styles.card}>
                  <Field label="Employee ID" value={employeeId} onChangeText={setEmployeeId} placeholder="e.g. EMP-00001" />
                  <SelectField label="Department" value={tDepartment} onChange={setTDepartment} options={DEPARTMENTS} placeholder="Select department…" />
                  <SelectField label="Position / Title" value={position} onChange={setPosition} options={POSITIONS} placeholder="Select position…" />
                  <Field label="Office Location" value={officeLocation} onChangeText={setOfficeLocation} placeholder="e.g. Room 301, Engineering Bldg" />
                  <Field
                    label="Bio"
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Brief description about yourself..."
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Specialties</Text>
                <View style={styles.card}>
                  <TagInput tags={expertiseTags} onChange={setExpertiseTags} />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Consultation Settings</Text>
                <View style={styles.card}>
                  <Field
                    label="Max Consultations per Day"
                    value={maxConsultations}
                    onChangeText={setMaxConsultations}
                    keyboardType="number-pad"
                    placeholder="8"
                  />
                  <Field
                    label="Session Duration (minutes)"
                    value={consultationDuration}
                    onChangeText={setConsultationDuration}
                    keyboardType="number-pad"
                    placeholder="30"
                  />
                  <Field
                    label="Average Response Time (hours)"
                    value={responseTime}
                    onChangeText={setResponseTime}
                    keyboardType="number-pad"
                    placeholder="24"
                  />
                  <View style={{ paddingTop: S.md }}>
                    <ToggleRow
                      label="Accepting Consultations"
                      value={isAccepting}
                      onChange={setIsAccepting}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Office Hours</Text>
                <View style={styles.card}>
                  <OfficeHoursEditor hours={officeHours} onChange={setOfficeHours} />
                </View>
              </View>
            </>
          )}

          {/* Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <View style={styles.card}>
              <ToggleRow label="Email Notifications" value={notifEmail} onChange={setNotifEmail} />
              <ToggleRow label="Push Notifications" value={notifPush} onChange={setNotifPush} />
            </View>
          </View>

          {/* Save button at bottom */}
          <View style={styles.section}>
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
          </View>

          <View style={{ height: S.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },

  safeHeader: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: R.full,
    backgroundColor: C.accentSoft,
  },
  headerTitle: { ...T.h3, color: C.ink1 },
  saveBtn: {
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
    backgroundColor: C.ink1,
    borderRadius: R.full,
    minWidth: 56,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: S.lg },

  section: { paddingHorizontal: S.lg, marginBottom: S.lg },
  sectionTitle: { ...T.cap, marginBottom: S.sm },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    ...shadow.soft,
    borderWidth: 1,
    borderColor: C.borderLight,
  },

  ctaBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink1,
    borderRadius: R.xl,
    paddingVertical: S.lg,
    ...shadow.card,
  },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
