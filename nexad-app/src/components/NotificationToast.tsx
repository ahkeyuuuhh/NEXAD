/**
 * NotificationToast
 *
 * Global in-app notification banner that slides in from the top of the screen
 * when a new notification arrives via the realtime hook.
 *
 * Usage:
 *   - Import and render <NotificationToast /> once in App.tsx (inside SafeAreaProvider).
 *   - Call `triggerToast(title, message)` from anywhere (e.g. the realtime hook).
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface ToastData {
  title: string;
  message: string;
}

// ─── Module-level imperative API ─────────────────────────────────────────────
let _trigger: ((title: string, message: string) => void) | null = null;

/** Call this from anywhere (hooks, services) to pop the toast. */
export function triggerToast(title: string, message: string) {
  if (_trigger) _trigger(title, message);
}
// ─────────────────────────────────────────────────────────────────────────────

export default function NotificationToast() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastData | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 280, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,    duration: 250, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [translateY, opacity]);

  const show = useCallback((title: string, message: string) => {
    // Cancel any running hide timer so rapid notifications replace each other
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    setToast({ title, message });

    // Reset and animate in
    translateY.setValue(-120);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 22,
        stiffness: 220,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss after 3.5 s
    hideTimer.current = setTimeout(dismiss, 3500);
  }, [translateY, opacity, dismiss]);

  useEffect(() => {
    _trigger = show;
    return () => {
      if (_trigger === show) _trigger = null;
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [show]);

  if (!toast) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + 10, transform: [{ translateY }], opacity },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity style={styles.card} onPress={dismiss} activeOpacity={0.88}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="notifications" size={18} color="#FFFFFF" />
        </View>

        {/* Text */}
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>{toast.title}</Text>
          <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
        </View>

        {/* Dismiss X */}
        <Ionicons name="close" size={15} color="rgba(255,255,255,0.45)" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#3A3A3C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
    marginRight: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.68)',
    lineHeight: 16,
  },
});
