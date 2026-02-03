import React, { useState } from 'react';
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
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : ('height' as any)}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Sign up as {role === 'student' ? 'Student' : 'Teacher'}
          </Text>
        </View>

        <View style={styles.form}>
          {/* Basic Information */}
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="John"
            value={firstName}
            onChangeText={setFirstName}
            editable={!isLoading}
          />

          <Text style={styles.label}>Last Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Doe"
            value={lastName}
            onChangeText={setLastName}
            editable={!isLoading}
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="your.email@university.edu"
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
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />

          <Text style={styles.label}>Confirm Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter password"
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
            value={department}
            onChangeText={setDepartment}
            editable={!isLoading}
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="+63 912 345 6789"
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
                value={studentId}
                onChangeText={setStudentId}
                editable={!isLoading}
              />

              <Text style={styles.label}>Year Level</Text>
              <TextInput
                style={styles.input}
                placeholder="1, 2, 3, or 4"
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
              <Text style={styles.sectionTitle}>Teacher Information</Text>
              
              <Text style={styles.label}>Office Hours</Text>
              <TextInput
                style={styles.input}
                placeholder="Mon-Wed 2-4 PM"
                value={officeHours}
                onChangeText={setOfficeHours}
                editable={!isLoading}
              />

              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Brief description about yourself"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                editable={!isLoading}
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              disabled={isLoading}
            >
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  link: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
});
