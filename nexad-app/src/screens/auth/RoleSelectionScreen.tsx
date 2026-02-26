import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, F, S, R, shadow } from '../../config/theme';

const { width } = Dimensions.get('window');

interface RoleSelectionScreenProps {
  navigation: any;
}

export default function RoleSelectionScreen({ navigation }: RoleSelectionScreenProps) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const cardScale1 = useRef(new Animated.Value(0.92)).current;
  const cardScale2 = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.stagger(120, [
      Animated.spring(cardScale1, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.spring(cardScale2, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleRoleSelect = (role: 'student' | 'teacher') => {
    navigation.navigate('Login', { role });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.ink1} />
        </TouchableOpacity>

        {/* Header */}
        <Animated.View style={[styles.headerArea, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Text style={styles.brandMark}>NEXAD</Text>
          <Text style={styles.title}>Choose Your{'\n'}Portal</Text>
          <Text style={styles.subtitle}>
            Select how you'd like to sign in to continue.
          </Text>
        </Animated.View>

        {/* Role cards */}
        <View style={styles.cardsArea}>
          {/* Student card */}
          <Animated.View style={{ transform: [{ scale: cardScale1 }] }}>
            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => handleRoleSelect('student')}
              activeOpacity={0.85}
            >
              <View style={styles.roleIconCircle}>
                <Ionicons name="school-outline" size={28} color={C.ink1} />
              </View>
              <View style={styles.roleTextBlock}>
                <Text style={styles.roleTitle}>Student Portal</Text>
                <Text style={styles.roleDesc}>
                  Request consultations, track schedules, and access classroom resources.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.ink4} />
            </TouchableOpacity>
          </Animated.View>

          {/* Faculty card */}
          <Animated.View style={{ transform: [{ scale: cardScale2 }] }}>
            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => handleRoleSelect('teacher')}
              activeOpacity={0.85}
            >
              <View style={[styles.roleIconCircle, styles.roleIconDark]}>
                <Ionicons name="briefcase-outline" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.roleTextBlock}>
                <Text style={styles.roleTitle}>Faculty Portal</Text>
                <Text style={styles.roleDesc}>
                  Manage requests, review submissions, and organize your classroom.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.ink4} />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Footer hint */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={14} color={C.ink4} />
          <Text style={styles.footerText}>
            Your data is secured with end-to-end encryption
          </Text>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
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

  // ── Header ────────────────────────────────────────────────────────────────
  headerArea: {
    marginTop: 32,
    marginBottom: 40,
  },
  brandMark: {
    fontWeight: '700' as const,
    fontSize: 16,
    color: C.ink4,
    letterSpacing: 2,
    marginBottom: S.md,
  },
  title: {
    fontWeight: '700' as const,
    fontSize: 36,
    color: C.ink1,
    lineHeight: 44,
    marginBottom: S.md,
  },
  subtitle: {
    fontWeight: '400' as const,
    fontSize: 14,
    color: C.ink3,
    lineHeight: 21,
    maxWidth: 260,
  },

  // ── Role cards ────────────────────────────────────────────────────────────
  cardsArea: {
    gap: S.lg,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: S.xl2,
    gap: S.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
    ...shadow.card,
  },
  roleIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconDark: {
    backgroundColor: C.ink1,
  },
  roleTextBlock: {
    flex: 1,
    gap: 4,
  },
  roleTitle: {
    fontWeight: '600' as const,
    fontSize: 17,
    color: C.ink1,
    letterSpacing: -0.1,
  },
  roleDesc: {
    fontWeight: '400' as const,
    fontSize: 12,
    color: C.ink3,
    lineHeight: 17,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 'auto' as any,
    paddingBottom: S.lg,
  },
  footerText: {
    fontWeight: '400' as const,
    fontSize: 12,
    color: C.ink4,
  },
});
