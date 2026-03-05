import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { C, F, T, S, R, shadow } from '../../config/theme';

interface SignUpScreenProps {
  navigation: any;
  route: any;
}

export default function SignUpScreen({ navigation, route }: SignUpScreenProps) {
  const role = route.params?.role as 'student' | 'teacher';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  
  // Student specific
  const [studentId, setStudentId] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  
  // Teacher specific
  const [officeHours, setOfficeHours] = useState('');
  const [bio, setBio] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();

  // Entrance animation
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const validateForm = () => {
    if (!email.trim() || !password.trim() || !firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (role === 'student' && !studentId.trim()) {
      Alert.alert('Error', 'Student ID is required');
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    const userData: any = {
      email,
      role,
      first_name: firstName,
      last_name: lastName,
      department: department || null,
      phone: phone || null,
    };

    if (role === 'student') {
      userData.student_id = studentId;
      userData.year_level = yearLevel ? parseInt(yearLevel) : null;
    } else if (role === 'teacher') {
      userData.office_hours = officeHours || null;
      userData.bio = bio || null;
      userData.expertise_tags = [];
    }

    const result = await signUp(email, password, userData);
    setIsLoading(false);

    if (result.error) {
      Alert.alert('Sign Up Failed', result.error);
    } else {
      Alert.alert(
        'Success!',
        'Your account has been created successfully.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : ('height' as any)}
      >
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={C.ink1} />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
            {/* Header */}
            <Text style={styles.brandMark}>NEXAD</Text>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Sign up as {role === 'student' ? 'Student' : 'Faculty'}
            </Text>

            {/* Form Card */}
            <View style={styles.formCard}>
              {/* Basic Information */}
              <Text style={styles.sectionTitle}>Basic Information</Text>
              
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="John"
                placeholderTextColor={C.ink4}
                value={firstName}
                onChangeText={setFirstName}
                editable={!isLoading}
              />

              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Doe"
                placeholderTextColor={C.ink4}
                value={lastName}
                onChangeText={setLastName}
                editable={!isLoading}
              />

              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="your.email@university.edu"
                placeholderTextColor={C.ink4}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoading}
              />

              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor={C.ink4}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading}
              />

              <Text style={styles.label}>Confirm Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter password"
                placeholderTextColor={C.ink4}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!isLoading}
              />

              {/* Additional Information */}
              <Text style={styles.sectionTitle}>Additional Information</Text>

              <Text style={styles.label}>Department</Text>
              <TextInput
                style={styles.input}
                placeholder="Computer Science"
                placeholderTextColor={C.ink4}
                value={department}
                onChangeText={setDepartment}
                editable={!isLoading}
              />

              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="+63 912 345 6789"
                placeholderTextColor={C.ink4}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!isLoading}
              />

              {/* Student Specific Fields */}
              {role === 'student' && (
                <>
                  <Text style={styles.sectionTitle}>Student Information</Text>
                  
                  <Text style={styles.label}>Student ID *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="CS-2024-001"
                    placeholderTextColor={C.ink4}
                    value={studentId}
                    onChangeText={setStudentId}
                    editable={!isLoading}
                  />

                  <Text style={styles.label}>Year Level</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1, 2, 3, or 4"
                    placeholderTextColor={C.ink4}
                    value={yearLevel}
                    onChangeText={setYearLevel}
                    keyboardType="number-pad"
                    maxLength={1}
                    editable={!isLoading}
                  />
                </>
              )}

              {/* Teacher Specific Fields */}
              {role === 'teacher' && (
                <>
                  <Text style={styles.sectionTitle}>Faculty Information</Text>
                  
                  <Text style={styles.label}>Office Hours</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Mon-Wed 2-4 PM"
                    placeholderTextColor={C.ink4}
                    value={officeHours}
                    onChangeText={setOfficeHours}
                    editable={!isLoading}
                  />

                  <Text style={styles.label}>Bio</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Brief description about yourself"
                    placeholderTextColor={C.ink4}
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    numberOfLines={4}
                    editable={!isLoading}
                  />
                </>
              )}
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                disabled={isLoading}
              >
                <Text style={styles.link}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center',
    marginLeft: S.xl, marginTop: S.md,
    ...shadow.soft,
  },
  scrollContent: {
    paddingHorizontal: S.xl2,
    paddingTop: S.lg,
    paddingBottom: 40,
  },
  brandMark: {
    fontWeight: '700' as const, fontSize: 16, color: C.ink4,
    letterSpacing: 2, marginBottom: S.sm,
  },
  title: {
    fontWeight: '700' as const, fontSize: 32, color: C.ink1,
    letterSpacing: 0.5, marginBottom: S.xs,
  },
  subtitle: {
    fontWeight: '400' as const, fontSize: 15, color: C.ink3,
    marginBottom: S.xl2,
  },
  formCard: {
    backgroundColor: C.surface, borderRadius: R.xl, padding: S.xl2,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderLight,
    ...shadow.card,
  },
  sectionTitle: {
    fontWeight: '600' as const, fontSize: 14, color: C.ink2,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginTop: S.xl, marginBottom: S.lg,
  },
  label: {
    fontWeight: '600' as const, fontSize: 13, color: C.ink2,
    marginBottom: S.sm, letterSpacing: 0.2,
  },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderLight,
    borderRadius: R.md, paddingHorizontal: S.lg, paddingVertical: S.md,
    fontWeight: '400' as const, fontSize: 15, color: C.ink1,
    marginBottom: S.lg,
  },
  textArea: {
    height: 100, textAlignVertical: 'top', paddingTop: S.md,
  },
  button: {
    backgroundColor: C.action, borderRadius: R.lg,
    paddingVertical: 16, alignItems: 'center',
    marginTop: S.xl2, ...shadow.lift,
  },
  buttonDisabled: { backgroundColor: C.ink5 },
  buttonText: {
    fontWeight: '600' as const, fontSize: 16, color: C.actionText,
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row', justifyContent: 'center',
    marginTop: S.xl2, marginBottom: S.xxl,
  },
  footerText: { fontWeight: '400' as const, fontSize: 14, color: C.ink3 },
  link: { fontWeight: '600' as const, fontSize: 14, color: C.ink1 },
});
