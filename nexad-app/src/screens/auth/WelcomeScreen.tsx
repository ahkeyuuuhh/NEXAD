import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, F, S, R, shadow } from '../../config/theme';

const { width, height } = Dimensions.get('window');
const SLIDER_WIDTH = width - 64;
const BUTTON_SIZE = 56;
const SLIDE_THRESHOLD = SLIDER_WIDTH - BUTTON_SIZE - 12;

interface WelcomeScreenProps {
  navigation: any;
}

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const slideX = useRef(new Animated.Value(0)).current;
  const [isSliding, setIsSliding] = useState(false);

  // Entrance animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const orbitRotation = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const dotScale1 = useRef(new Animated.Value(0)).current;
  const dotScale2 = useRef(new Animated.Value(0)).current;
  const dotScale3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animation
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    ]).start();

    // Floating dots pop in
    Animated.stagger(150, [
      Animated.spring(dotScale1, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.spring(dotScale2, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.spring(dotScale3, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();

    // Continuous subtle orbit rotation
    Animated.loop(
      Animated.timing(orbitRotation, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();

    // Gentle pulse on hero circle
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.04, duration: 2500, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => setIsSliding(true),
      onPanResponderMove: (_, gs) => {
        const newX = Math.max(0, Math.min(gs.dx, SLIDE_THRESHOLD));
        slideX.setValue(newX);
      },
      onPanResponderRelease: (_, gs) => {
        setIsSliding(false);
        if (gs.dx >= SLIDE_THRESHOLD * 0.75) {
          Animated.timing(slideX, {
            toValue: SLIDE_THRESHOLD,
            duration: 180,
            useNativeDriver: true,
          }).start(() => navigation.replace('RoleSelection'));
        } else {
          Animated.spring(slideX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 6,
          }).start();
        }
      },
    })
  ).current;

  // Slider text opacity fades as thumb travels
  const sliderTextOpacity = slideX.interpolate({
    inputRange: [0, SLIDE_THRESHOLD * 0.5],
    outputRange: [0.55, 0],
    extrapolate: 'clamp',
  });

  const orbitSpin = orbitRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

        {/* ═══ Hero graphic area ═══ */}
        <Animated.View
          style={[
            styles.heroArea,
            { opacity: fadeIn, transform: [{ translateY: slideUp }] },
          ]}
        >
          {/* Outer orbit ring (rotates) */}
          <Animated.View style={[styles.orbitRing, { transform: [{ rotate: orbitSpin }] }]}>
            {/* Orbiting dots */}
            <Animated.View style={[styles.orbitDot, styles.orbitDotA, { transform: [{ scale: dotScale1 }] }]} />
            <Animated.View style={[styles.orbitDot, styles.orbitDotB, { transform: [{ scale: dotScale2 }] }]} />
            <Animated.View style={[styles.orbitDot, styles.orbitDotC, { transform: [{ scale: dotScale3 }] }]} />
          </Animated.View>

          {/* Central circle with pulsing scale */}
          <Animated.View style={[styles.heroCircle, { transform: [{ scale: pulseScale }] }]}>
            <Text style={styles.heroLetter}>N</Text>
          </Animated.View>

          {/* Static decorative rings */}
          <View style={styles.ringMid} />
          <View style={styles.ringOuter} />
        </Animated.View>

        {/* ═══ Text block ═══ */}
        <Animated.View
          style={[
            styles.textArea,
            { opacity: fadeIn, transform: [{ translateY: slideUp }] },
          ]}
        >
          <Text style={styles.brandName}>NEXAD</Text>
          <Text style={styles.tagline}>
            Your AI-Enhanced{'\n'}Consultation System
          </Text>
          <Text style={styles.subtitle}>
            Seamless student-faculty communication,{'\n'}powered by intelligent scheduling.
          </Text>
        </Animated.View>

        {/* ═══ Bottom area: Slide to start ═══ */}
        <View style={styles.bottomArea}>
          {/* Feature pills row */}
          <View style={styles.pillRow}>
            {['AI-Powered', 'Real-time', 'Secure'].map((text) => (
              <View key={text} style={styles.pill}>
                <Text style={styles.pillText}>{text}</Text>
              </View>
            ))}
          </View>

          {/* Slider */}
          <View style={styles.sliderWrap}>
            <View style={styles.sliderTrack}>
              <Animated.View
                style={[
                  styles.sliderThumb,
                  { transform: [{ translateX: slideX }] },
                ]}
                {...panResponder.panHandlers}
              >
                <Text style={styles.thumbArrow}>→</Text>
              </Animated.View>
              <Animated.Text style={[styles.sliderLabel, { opacity: sliderTextOpacity }]}>
                Slide to Get Started
              </Animated.Text>
            </View>
          </View>
        </View>

      </SafeAreaView>
    </View>
  );
}

// ─── Layout constants ──────────────────────────────────────────────────────────
const HERO_SIZE = Math.min(width * 0.55, 240);
const CIRCLE_SIZE = HERO_SIZE * 0.42;
const RING_MID = HERO_SIZE * 0.72;
const RING_OUTER = HERO_SIZE;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },

  // ── Hero graphic ──────────────────────────────────────────────────────────
  heroArea: {
    alignItems: 'center',
    justifyContent: 'center',
    height: HERO_SIZE + 40,
    marginTop: height * 0.06,
  },
  heroCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: C.ink1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    ...shadow.lift,
  },
  heroLetter: {
    fontWeight: '700' as const,
    fontSize: CIRCLE_SIZE * 0.48,
    color: '#FFFFFF',
    marginTop: 2,
  },
  // Static concentric rings
  ringMid: {
    position: 'absolute',
    width: RING_MID,
    height: RING_MID,
    borderRadius: RING_MID / 2,
    borderWidth: 1,
    borderColor: C.border,
  },
  ringOuter: {
    position: 'absolute',
    width: RING_OUTER,
    height: RING_OUTER,
    borderRadius: RING_OUTER / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
  },
  // Orbiting dot container — rotates continuously
  orbitRing: {
    position: 'absolute',
    width: RING_OUTER,
    height: RING_OUTER,
  },
  orbitDot: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbitDotA: {
    width: 14,
    height: 14,
    backgroundColor: C.ink1,
    top: -7,
    left: RING_OUTER / 2 - 7,
  },
  orbitDotB: {
    width: 10,
    height: 10,
    backgroundColor: C.ink3,
    bottom: RING_OUTER * 0.12,
    right: -2,
  },
  orbitDotC: {
    width: 8,
    height: 8,
    backgroundColor: C.ink4,
    bottom: RING_OUTER * 0.15,
    left: 4,
  },

  // ── Text block ────────────────────────────────────────────────────────────
  textArea: {
    alignItems: 'center',
    paddingHorizontal: S.sm,
  },
  brandName: {
    fontWeight: '700' as const,
    fontSize: 52,
    color: C.ink1,
    letterSpacing: 4,
    marginBottom: S.md,
  },
  tagline: {
    fontWeight: '600' as const,
    fontSize: 18,
    color: C.ink2,
    textAlign: 'center',
    lineHeight: 26,
    letterSpacing: -0.2,
    marginBottom: S.sm,
  },
  subtitle: {
    fontWeight: '400' as const,
    fontSize: 13,
    color: C.ink4,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },

  // ── Bottom ────────────────────────────────────────────────────────────────
  bottomArea: {
    paddingBottom: S.lg,
    gap: S.xl,
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: S.sm,
  },
  pill: {
    paddingHorizontal: S.md + 2,
    paddingVertical: S.xs + 2,
    borderRadius: R.full,
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    ...shadow.soft,
  },
  pillText: {
    fontWeight: '600' as const,
    fontSize: 11,
    color: C.ink3,
    letterSpacing: 0.4,
  },

  // ── Slider ────────────────────────────────────────────────────────────────
  sliderWrap: {
    alignItems: 'center',
  },
  sliderTrack: {
    width: SLIDER_WIDTH,
    height: 64,
    backgroundColor: C.ink1,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...shadow.card,
  },
  sliderThumb: {
    position: 'absolute',
    left: 6,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE - 8,
    backgroundColor: C.surface,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.lift,
  },
  thumbArrow: {
    fontWeight: '600' as const,
    fontSize: 22,
    color: C.ink1,
  },
  sliderLabel: {
    fontWeight: '400' as const,
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.8,
  },
});
