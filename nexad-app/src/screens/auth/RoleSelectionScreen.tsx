import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface RoleSelectionScreenProps {
  navigation: any;
}

export default function RoleSelectionScreen({ navigation }: RoleSelectionScreenProps) {
  const handleRoleSelect = (role: 'student' | 'teacher') => {
    // Navigate to Login screen with the selected role
    navigation.navigate('Login', { role });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Icon Area */}
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoIcon}>📚</Text>
          </View>
        </View>

        {/* Header Text */}
        <View style={styles.header}>
          <Text style={styles.title}>IDENTIFY YOUR</Text>
          <Text style={styles.titleBold}>ACCOUNT</Text>
          <Text style={styles.subtitle}>Please select your role to continue to login</Text>
        </View>

        {/* Role Buttons */}
        <View style={styles.roleContainer}>
          {/* Student Portal Button */}
          <TouchableOpacity
            style={styles.roleButton}
            onPress={() => handleRoleSelect('student')}
            activeOpacity={0.8}
          >
            <Text style={styles.roleButtonText}>Student Portal</Text>
          </TouchableOpacity>

          {/* Faculty Portal Button */}
          <TouchableOpacity
            style={[styles.roleButton, styles.facultyButton]}
            onPress={() => handleRoleSelect('teacher')}
            activeOpacity={0.8}
          >
            <Text style={styles.roleButtonText}>Faculty Portal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  logoContainer: {
    alignItems: 'flex-end',
    marginBottom: 60,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 24,
  },
  header: {
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 2,
  },
  titleBold: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 3,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 22,
  },
  roleContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  roleButton: {
    backgroundColor: '#4a4a4a',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#5a5a5a',
  },
  facultyButton: {
    backgroundColor: '#3a3a3a',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 1,
  },
});
