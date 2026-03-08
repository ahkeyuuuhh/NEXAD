import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { C, S, R, shadow, T } from '../../config/theme';
import { profileService } from '../../services/profileService';
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
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} activeOpacity={1} onPress={close} />
          <View style={sfStyles.sheet}>
            <View style={sfStyles.handle} />
            <View style={sfStyles.sheetHeader}>
              <Text style={sfStyles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={close}><Ionicons name="close" size={20} color={C.ink2} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
              {options.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={[sfStyles.option, value === opt && sfStyles.optionActive]}
                  onPress={() => {
                    if (opt === 'Other') { setShowOther(true); setOtherText(''); }
                    else { onChange(opt); close(); }
                  }}
                >
                  <Text style={[sfStyles.optionText, value === opt && sfStyles.optionTextActive]}>{opt}</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: S.sm + 2,
  },
  btnText: { fontSize: 14, color: C.ink1, flex: 1 },
  btnPlaceholder: { color: C.ink5 },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
    maxHeight: '65%',
  },
  handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: S.sm, marginBottom: S.xs },
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
  otherConfirm: { paddingHorizontal: S.lg, paddingVertical: S.sm, backgroundColor: C.ink1, borderRadius: R.md, justifyContent: 'center' },
  otherConfirmText: { color: '#fff', fontWeight: '700' as const, fontSize: 13 },
});

// ── Specialties tag input ─────────────────────────────────────────────────────
function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (t: string[]) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [otherText, setOtherText] = useState('');

  const toggleTag = (spec: string) => {
    if (tags.includes(spec)) { onChange(tags.filter(t => t !== spec)); }
    else { onChange([...tags, spec]); }
  };

  const addCustom = () => {
    const trimmed = otherText.trim();
    if (!trimmed || tags.includes(trimmed)) { setOtherText(''); return; }
    onChange([...tags, trimmed]);
    setOtherText('');
    setShowOther(false);
  };

  return (
    <View>
      <View style={styles.tagsRow}>
        {tags.map((tag, i) => (
          <View key={i} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
            <TouchableOpacity
              onPress={() => onChange(tags.filter((_, idx) => idx !== i))}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="close" size={13} color={C.ink3} />
            </TouchableOpacity>
          </View>
        ))}
        {tags.length === 0 && (
          <Text style={styles.tagsEmpty}>Tap below to add specialties</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.browseBtn}
        onPress={() => { setShowPicker(true); setShowOther(false); }}
      >
        <Ionicons name="add-circle-outline" size={16} color={C.ink2} style={{ marginRight: 6 }} />
        <Text style={styles.browseBtnText}>Select Specialty</Text>
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => { setShowPicker(false); setShowOther(false); }}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
            activeOpacity={1}
            onPress={() => { setShowPicker(false); setShowOther(false); }}
          />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Specialties</Text>
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
                    style={[styles.pickerOption, selected && styles.pickerOptionActive]}
                    onPress={() => toggleTag(spec)}
                  >
                    <Text style={[styles.pickerOptionText, selected && styles.pickerOptionTextActive]}>{spec}</Text>
                    {selected && <Ionicons name="checkmark-circle" size={18} color={C.ink1} />}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.pickerOption, showOther && styles.pickerOptionActive]}
                onPress={() => { setShowOther(!showOther); setOtherText(''); }}
              >
                <Text style={styles.pickerOptionText}>Other (type custom)</Text>
                <Ionicons name="create-outline" size={18} color={C.ink3} />
              </TouchableOpacity>
            </ScrollView>
            {showOther && (
              <View style={styles.pickerOtherRow}>
                <TextInput
                  style={styles.pickerOtherInput}
                  value={otherText}
                  onChangeText={setOtherText}
                  placeholder="Type custom specialty…"
                  placeholderTextColor={C.ink5}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={addCustom}
                />
                <TouchableOpacity
                  style={[styles.pickerOtherConfirm, !otherText.trim() && { opacity: 0.4 }]}
                  onPress={addCustom}
                >
                  <Text style={styles.pickerOtherConfirmText}>Add</Text>
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

export default function TeacherSetupScreen({ navigation }: any) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [expertiseTags, setExpertiseTags] = useState<string[]>([]);
  const [officeLocation, setOfficeLocation] = useState('');
  const [bio, setBio] = useState('');

  const handleComplete = async () => {
    if (!user?.user_id) return;

    if (!department.trim()) {
      Alert.alert('Required', 'Please enter your department.');
      return;
    }
    if (!position.trim()) {
      Alert.alert('Required', 'Please enter your position/title.');
      return;
    }
    if (expertiseTags.length === 0) {
      Alert.alert('Required', 'Please add at least one specialty so students can find you.');
      return;
    }

    setSaving(true);
    try {
      const result = await profileService.updateTeacherProfile(user.user_id, {
        department: department.trim(),
        position: position.trim(),
        expertise_tags: expertiseTags,
        office_location: officeLocation.trim() || undefined,
        bio: bio.trim() || undefined,
      });

      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      // Navigate to the main teacher dashboard
      navigation.reset({ index: 0, routes: [{ name: 'TeacherDashboard' }] });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigation.reset({ index: 0, routes: [{ name: 'TeacherDashboard' }] });
  };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#111111', '#2a2a2a']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-add-outline" size={28} color="#fff" />
            </View>
            <Text style={styles.welcomeTitle}>Welcome, {user?.first_name}!</Text>
            <Text style={styles.welcomeSubtitle}>
              Set up your teacher profile so students can find you and request consultations.
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Step indicator */}
          <View style={styles.stepsRow}>
            {['Department', 'Specialties', 'Details'].map((s, i) => (
              <View key={i} style={styles.stepItem}>
                <View style={styles.stepDot}>
                  <Text style={styles.stepDotNum}>{i + 1}</Text>
                </View>
                <Text style={styles.stepLabel}>{s}</Text>
              </View>
            ))}
          </View>

          {/* Department + Position */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Department & Position</Text>
            <View style={styles.card}>
              <SelectField
                label="Department *"
                value={department}
                onChange={setDepartment}
                options={DEPARTMENTS}
                placeholder="Select department…"
              />
              <SelectField
                label="Position / Title *"
                value={position}
                onChange={setPosition}
                options={POSITIONS}
                placeholder="Select position…"
              />
            </View>
          </View>

          {/* Specialties */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Specialties *</Text>
            <Text style={styles.sectionHint}>
              Students will use these to find the right teacher for their needs
            </Text>
            <View style={styles.card}>
              <TagInput tags={expertiseTags} onChange={setExpertiseTags} />
            </View>
          </View>

          {/* Optional details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Optional Details</Text>
            <View style={styles.card}>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Office Location</Text>
                <TextInput
                  style={styles.input}
                  value={officeLocation}
                  onChangeText={setOfficeLocation}
                  placeholder="e.g. Room 301, Engineering Building"
                  placeholderTextColor={C.ink5}
                />
              </View>
              <View style={[styles.fieldWrap, { marginBottom: 0 }]}>
                <Text style={styles.fieldLabel}>Short Bio</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Brief description about yourself, your research, or teaching style..."
                  placeholderTextColor={C.ink5}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.ctaBtn, saving && { opacity: 0.7 }]}
              onPress={handleComplete}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <Text style={styles.ctaBtnText}>Complete Setup</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: S.sm }} />
                  </>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipBtnText}>Skip for now</Text>
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

  header: { paddingBottom: S.xl },
  headerContent: { alignItems: 'center', paddingHorizontal: S.xl, paddingTop: S.lg, paddingBottom: S.md },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: S.lg,
  },
  welcomeTitle: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: S.sm },
  welcomeSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 21 },

  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: S.xl,
    paddingVertical: S.lg,
    paddingHorizontal: S.lg,
  },
  stepItem: { alignItems: 'center', gap: S.xs },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.ink1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotNum: { fontSize: 12, fontWeight: '700', color: '#fff' },
  stepLabel: { ...T.small, color: C.ink3 },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: 0 },

  section: { paddingHorizontal: S.lg, marginBottom: S.lg },
  sectionTitle: { ...T.h3, marginBottom: S.xs },
  sectionHint: { ...T.small, color: C.ink4, marginBottom: S.sm },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    ...shadow.soft,
    borderWidth: 1,
    borderColor: C.borderLight,
  },

  fieldWrap: { marginBottom: S.lg },
  fieldLabel: { ...T.label, color: C.ink3, marginBottom: S.xs },
  input: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    paddingVertical: S.sm + 2,
    fontSize: 14,
    color: C.ink1,
  },
  textarea: { height: 88, textAlignVertical: 'top', paddingTop: S.md },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.sm, minHeight: 32 },
  tagsEmpty: { ...T.small, color: C.ink4, fontStyle: 'italic' },
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
  tagText: { fontSize: 12, fontWeight: '600', color: C.ink2 },
  tagInputRow: { flexDirection: 'row', gap: S.sm },
  tagInput: {
    flex: 1,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    paddingVertical: S.sm + 2,
    fontSize: 14,
    color: C.ink1,
  },
  tagAddBtn: {
    width: 40,
    height: 40,
    backgroundColor: C.ink1,
    borderRadius: R.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Browse / picker modal
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
    marginTop: S.xs,
  },
  browseBtnText: { fontSize: 13, fontWeight: '600' as const, color: C.ink2 },
  pickerSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    maxHeight: '70%',
  },
  pickerHandle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: S.sm, marginBottom: S.xs },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: S.lg, paddingVertical: S.md,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  pickerTitle: { ...T.h3, color: C.ink1 },
  pickerOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: S.lg, paddingVertical: S.md + 2,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  pickerOptionActive: { backgroundColor: C.accentSoft },
  pickerOptionText: { fontSize: 14, color: C.ink2, flex: 1 },
  pickerOptionTextActive: { color: C.ink1, fontWeight: '600' as const },
  pickerOtherRow: {
    flexDirection: 'row', gap: S.sm,
    paddingHorizontal: S.lg, paddingVertical: S.sm,
    borderTopWidth: 1, borderTopColor: C.borderLight,
  },
  pickerOtherInput: {
    flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: S.sm, fontSize: 14, color: C.ink1,
  },
  pickerOtherConfirm: { paddingHorizontal: S.lg, paddingVertical: S.sm, backgroundColor: C.ink1, borderRadius: R.md, justifyContent: 'center', alignItems: 'center' },
  pickerOtherConfirmText: { color: '#fff', fontWeight: '700' as const, fontSize: 13 },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink1,
    borderRadius: R.xl,
    paddingVertical: S.lg,
    ...shadow.card,
    marginBottom: S.md,
  },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  skipBtn: { alignItems: 'center', paddingVertical: S.sm },
  skipBtnText: { ...T.body, color: C.ink4 },
});
