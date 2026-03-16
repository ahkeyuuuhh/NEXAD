import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { C, F, S, R, shadow } from '../../config/theme';

const { width } = Dimensions.get('window');

interface LoginScreenProps {
  navigation: any;
  route: any;
}

export default function LoginScreen({ navigation, route }: LoginScreenProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [roleErrorMsg, setRoleErrorMsg] = useState('');
  const { signInWithGoogle } = useAuth();
  const selectedRole = route?.params?.role || 'student';

  // Entrance animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const btnScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    Animated.spring(btnScale, { toValue: 1, friction: 5, delay: 300, useNativeDriver: true }).start();
  }, []);

  const handleGoogleSSO = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle(selectedRole);
      if (result?.error) {
        if (result.error.includes('already registered as a')) {
          // Role mismatch — show styled modal instead of generic Alert
          setRoleErrorMsg(result.error);
        } else {
          Alert.alert(
            'Google Sign-In Failed',
            result.error + '\n\nPlease make sure:\n• You have a stable internet connection\n• Google OAuth is properly configured in Supabase\n• You are using a valid Google account',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const isStudent = selectedRole === 'student';
  const portalLabel = isStudent ? 'Student' : 'Faculty';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} disabled={isGoogleLoading}>
          <Ionicons name="arrow-back" size={22} color={C.ink1} />
        </TouchableOpacity>

        {/* Hero illustration */}
        <Animated.View style={[styles.heroArea, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <View style={styles.heroOuter}>
            <View style={styles.heroInner}>
              <Ionicons
                name={isStudent ? 'school' : 'briefcase'}
                size={36}
                color="#FFFFFF"
              />
            </View>
          </View>
        </Animated.View>

        {/* Text */}
        <Animated.View style={[styles.textArea, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Text style={styles.title}>Welcome,{'\n'}{portalLabel}.</Text>
          <Text style={styles.subtitle}>
            Sign in securely with your institutional Google account to access your {portalLabel.toLowerCase()} dashboard.
          </Text>
        </Animated.View>

        {/* CTA section */}
        <View style={styles.ctaArea}>
          {/* Benefits strip */}
          <View style={styles.benefitsCard}>
            {[
              { icon: 'flash-outline', text: 'Instant verification' },
              { icon: 'key-outline', text: 'No password needed' },
              { icon: 'shield-checkmark-outline', text: 'Secure authentication' },
            ].map((item) => (
              <View key={item.text} style={styles.benefitRow}>
                <Ionicons name={item.icon as any} size={16} color={C.ink3} />
                <Text style={styles.benefitText}>{item.text}</Text>
              </View>
            ))}
          </View>

          {/* Google button */}
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSSO}
              disabled={isGoogleLoading}
              activeOpacity={0.85}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <View style={styles.gCircle}>
                    <Text style={styles.gLetter}>G</Text>
                  </View>
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Legal hint */}
          <Text style={styles.legalText}>
            By signing in you agree to our Terms of Service{'\n'}and Privacy Policy.
          </Text>
        </View>

      </SafeAreaView>

      {/* Role Mismatch Modal */}
      <Modal
        visible={!!roleErrorMsg}
        transparent
        animationType="fade"
        presentationStyle="pageSheet"
        onRequestClose={() => setRoleErrorMsg('')}
      >
        <View style={styles.roleModalOverlay}>
          <View style={styles.roleModalCard}>
            <View style={styles.roleModalIconWrap}>
              <Ionicons name="warning" size={32} color="#F59E0B" />
            </View>
            <Text style={styles.roleModalTitle}>Access Restricted</Text>
            <Text style={styles.roleModalBody}>{roleErrorMsg}</Text>
            <Text style={styles.roleModalHint}>
              Please go back and select the correct portal for your account.
            </Text>
            <TouchableOpacity
              style={styles.roleModalBtn}
              onPress={() => { setRoleErrorMsg(''); navigation.goBack(); }}
              activeOpacity={0.85}
            >
              <Text style={styles.roleModalBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 28,
  },

  // ── Back ──────────────────────────────────────────────────────────────────
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: S.sm,
    ...shadow.soft,
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroArea: {
    alignItems: 'center',
    marginTop: 36,
    marginBottom: 32,
  },
  heroOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
    ...shadow.card,
  },
  heroInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.ink1,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.lift,
  },

  // ── Text ──────────────────────────────────────────────────────────────────
  textArea: {
    alignItems: 'center',
    paddingHorizontal: S.sm,
    marginBottom: 32,
  },
  title: {
    fontWeight: '700' as const,
    fontSize: 32,
    color: C.ink1,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: S.md,
  },
  subtitle: {
    fontWeight: '400' as const,
    fontSize: 13,
    color: C.ink3,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },

  // ── CTA area ──────────────────────────────────────────────────────────────
  ctaArea: {
    marginTop: 'auto' as any,
    paddingBottom: S.xl,
    gap: S.xl,
  },
  benefitsCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.xl,
    gap: S.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
    ...shadow.soft,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
  },
  benefitText: {
    fontWeight: '400' as const,
    fontSize: 13,
    color: C.ink2,
  },

  // ── Google button ─────────────────────────────────────────────────────────
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink1,
    height: 58,
    borderRadius: R.xxl,
    gap: S.md,
    ...shadow.card,
  },
  gCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gLetter: {
    fontWeight: '600' as const,
    fontSize: 17,
    color: C.ink1,
  },
  googleBtnText: {
    fontWeight: '600' as const,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // ── Legal ─────────────────────────────────────────────────────────────────
  legalText: {
    fontWeight: '400' as const,
    fontSize: 11,
    color: C.ink4,
    textAlign: 'center',
    lineHeight: 16,
  },

  // ── Role mismatch modal ────────────────────────────────────────────────────
  roleModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  roleModalCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    ...shadow.lift,
  },
  roleModalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245,158,11,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  roleModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  roleModalBody: {
    fontSize: 14,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  roleModalHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  roleModalBtn: {
    backgroundColor: C.ink1,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  roleModalBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});