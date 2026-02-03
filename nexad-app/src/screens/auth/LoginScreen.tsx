import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';

interface LoginScreenProps {
  navigation: any;
  route: any;
}

export default function LoginScreen({ navigation, route }: LoginScreenProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
  
  // Get the selected role from navigation params
  const selectedRole = route?.params?.role || 'student';

  const handleGoogleSSO = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle(selectedRole);
      if (result?.error) {
        Alert.alert(
          'Google Sign-In Failed',
          result.error + '\n\nPlease make sure:\n• You have a stable internet connection\n• Google OAuth is properly configured in Supabase\n• You are using a valid Google account',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo/Icon Area */}
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoIcon}>📚</Text>
            </View>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>SIGN IN WITH GOOGLE</Text>
            <Text style={styles.subtitle}>
              Securely access the {selectedRole === 'student' ? 'Student' : 'Faculty'} Portal
            </Text>
            <Text style={styles.instruction}>
              Use your institutional Google account to verify your identity
            </Text>
          </View>

          {/* SSO Section - Only Option */}
          <View style={styles.form}>
            <View style={styles.ssoSection}>
              <View style={styles.lockIconContainer}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
              <Text style={styles.ssoTitle}>Single Sign-On (SSO)</Text>
              <Text style={styles.ssoDescription}>
                Click below to authenticate with your Google account. This ensures your email is verified and authentic.
              </Text>
              
              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleSSO}
                disabled={isGoogleLoading}
                activeOpacity={0.8}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator color="#1f2937" />
                ) : (
                  <>
                    <Text style={styles.googleIcon}>G</Text>
                    <Text style={styles.googleButtonText}>Sign in with Google</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <View style={styles.benefitsContainer}>
                <Text style={styles.benefitItem}>✓ Instant verification</Text>
                <Text style={styles.benefitItem}>✓ No password needed</Text>
                <Text style={styles.benefitItem}>✓ Secure authentication</Text>
              </View>
            </View>
          </View>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={isGoogleLoading}
          >
            <Text style={styles.backButtonText}>← Back to Role Selection</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  logoContainer: {
    alignItems: 'flex-end',
    marginBottom: 40,
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
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  instruction: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  form: {
    flex: 1,
  },
  ssoSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  lockIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#2a2a2a',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockIcon: {
    fontSize: 32,
  },
  ssoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  ssoDescription: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
    marginRight: 12,
  },
  googleButtonText: {
    color: '#1f2937',
    fontSize: 17,
    fontWeight: '600',
  },
  benefitsContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  benefitItem: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 24,
  },
  backButtonText: {
    color: '#6b7280',
    fontSize: 14,
  },
});