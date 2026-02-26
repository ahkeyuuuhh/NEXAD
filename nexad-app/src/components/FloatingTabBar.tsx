/**
 * FloatingTabBar — persistent floating bottom navigation bar.
 *
 * Design: White pill, subtle shadow, labeled icons.
 * Active = green accent pill with white icon + label.
 * Inactive = neutral icon, no label.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S, shadow } from '../config/theme';

export interface TabItem {
  key: string;
  label: string;
  icon: string;       // Ionicons name — inactive (outline variant)
  activeIcon: string; // Ionicons name — active (filled variant)
  badge?: number;     // optional notification count
}

interface FloatingTabBarProps {
  tabs: TabItem[];
  activeKey: string;
  onPress: (key: string) => void;
}

export function FloatingTabBar({ tabs, activeKey, onPress }: FloatingTabBarProps) {
  return (
    <View style={styles.outerWrap} pointerEvents="box-none">
      <View style={styles.bar}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onPress(tab.key)}
              activeOpacity={0.75}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={(isActive ? tab.activeIcon : tab.icon) as any}
                  size={20}
                  color={isActive ? '#FFFFFF' : C.ink4}
                />
                {!!tab.badge && tab.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {tab.badge > 99 ? '99+' : String(tab.badge)}
                    </Text>
                  </View>
                )}
              </View>
              {isActive && (
                <Text style={styles.tabLabel}>{tab.label}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const BOTTOM_INSET = Platform.OS === 'ios' ? 28 : 16;
const BAR_HEIGHT   = 64;

const styles = StyleSheet.create({
  outerWrap: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: BOTTOM_INSET,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 32,
    height: BAR_HEIGHT,
    paddingHorizontal: S.sm + 2,
    gap: S.xs,
    ...shadow.float,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: R.full,
    gap: 7,
    paddingHorizontal: S.xs,
  },
  tabActive: {
    backgroundColor: C.accent,
    flex: 0,
    paddingHorizontal: S.lg,
  },
  iconWrap: {
    position: 'relative',
    width: 22, height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  badge: {
    position: 'absolute',
    top: -4, right: -6,
    minWidth: 16, height: 16,
    borderRadius: 8,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: C.surface,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
});

export default FloatingTabBar;
