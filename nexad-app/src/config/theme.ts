/**
 * NEXAD Design System — Pure Monochrome Edition
 *
 * Philosophy: Strictly black / grey / white surfaces. Zero colour anywhere
 * except destructive red. Primary CTA buttons use a bold near-black fill
 * (#111111) on white — maximum contrast. Status badges use greyscale fills.
 * Typography is system sans-serif (Roboto / SF Pro), Semi-Bold headers,
 * Regular body. Generous spacing for a spacious, professional feel.
 */

import { StyleSheet, Platform } from 'react-native';

// ─── Palette — 100 % greyscale ────────────────────────────────────────────────
export const C = {
  // Surfaces
  bg:           '#F4F4F4',   // Page background — light grey
  surface:      '#FFFFFF',   // Card / panel — pure white
  surfaceAlt:   '#EBEBEB',   // Secondary strip / zebra
  surfaceRaised:'#F9F9F9',   // Slightly lifted secondary cards
  border:       '#D9D9D9',   // Standard border
  borderLight:  '#E8E8E8',   // Hairline / dividers

  // Ink — true neutrals
  ink1:  '#111111',   // Near-black headings  (18:1 contrast on bg)
  ink2:  '#3D3D3D',   // Body text            (10:1)
  ink3:  '#737373',   // Secondary/metadata   (4.6:1 AA)
  ink4:  '#A3A3A3',   // Placeholder, hints
  ink5:  '#D4D4D4',   // Disabled

  // Accent — strict greyscale (no colour)
  accent:       '#111111',   // Dark for tabs, borders
  accentDark:   '#000000',
  accentMid:    '#555555',
  accentLight:  '#E0E0E0',   // Light grey tint for badges
  accentSoft:   '#F2F2F2',   // Very light grey bg
  accentText:   '#FFFFFF',   // Text on dark fills

  // Compat aliases — kept so other screens compile unchanged
  warm:         '#737373',
  warmLight:    '#F2F2F2',
  warmText:     '#FFFFFF',
  info:         '#3D3D3D',
  infoBg:       '#F4F4F4',

  // Actions — solid black CTA button  (acts as "gradient" contrast button)
  action:        '#111111',
  actionText:    '#FFFFFF',
  actionBorder:  '#111111',
  actionSubtle:  '#F2F2F2',

  // Status fills — greyscale
  statusActive:    '#111111',  // Accepted / scheduled
  statusActiveTxt: '#FFFFFF',
  statusMid:       '#555555',  // In-progress
  statusMidTxt:    '#FFFFFF',
  statusSoft:      '#EBEBEB',  // Pending
  statusSoftTxt:   '#3D3D3D',

  // Glass / overlay
  glass:           'rgba(255,255,255,0.92)',
  glassBorder:     'rgba(0,0,0,0.06)',
  scrim:           'rgba(0,0,0,0.42)',

  // Semantic — destructive (only colour allowed)
  red:    '#DC2626',
  redBg:  '#FEF2F2',

  // Orange accent — warm complement to the blue/dark palette
  orange:      '#F97316',   // Primary orange (CTA highlights, FAB, active accents)
  orangeDark:  '#EA6A00',   // Darker shade for pressed states
  orangeLight: '#FFF0E6',   // Very light tint for badges / pills
  orangeText:  '#FFFFFF',   // Text on orange fills
};

// ─── Font Families ────────────────────────────────────────────────────────────
// Kept for backward-compat — still loaded in App.tsx, but design system now
// relies on system sans-serif via fontWeight (no fontFamily set).
export const F = {
  milker:     'Milker',
  garetHeavy: 'Garet-Heavy',
  garetBook:  'Garet-Book',
};

// ─── Typography ───────────────────────────────────────────────────────────────
// System sans-serif: Roboto (Android) / SF Pro (iOS).
// Semi-Bold (600) for headers and labels; Regular (400) for body and meta.
export const T = {
  display: { fontSize: 28, fontWeight: '700' as const, color: C.ink1, letterSpacing: 0.3 },
  h1:      { fontSize: 22, fontWeight: '600' as const, color: C.ink1, letterSpacing: -0.3 },
  h2:      { fontSize: 18, fontWeight: '600' as const, color: C.ink1, letterSpacing: -0.2 },
  h3:      { fontSize: 15, fontWeight: '600' as const, color: C.ink1 },
  body:    { fontSize: 14, fontWeight: '400' as const, color: C.ink2, lineHeight: 22 },
  small:   { fontSize: 12, fontWeight: '400' as const, color: C.ink3, lineHeight: 18 },
  tiny:    { fontSize: 11, fontWeight: '400' as const, color: C.ink4 },
  label:   { fontSize: 12, fontWeight: '600' as const, color: C.ink2, letterSpacing: 0.3 },
  meta:    { fontSize: 11, fontWeight: '400' as const, color: C.ink4, letterSpacing: 0.3 },
  cap:     { fontSize: 11, fontWeight: '600' as const, color: C.ink3, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  mono:    { fontSize: 12, fontWeight: '400' as const, color: C.ink3, fontVariant: ['tabular-nums'] as any },
};

// ─── Spacing (generous for a "breathing" layout) ─────────────────────────────
export const S = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xl2:  28,
  xxl:  36,
};

// ─── Radii ────────────────────────────────────────────────────────────────────
export const R = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  full: 999,
};

// ─── Shadows (subtle, neutral) ────────────────────────────────────────────────
export const shadow = {
  none: {},
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  lift: {
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  float: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -2 },
    elevation: 16,
  },
};

// ─── Shared component styles ──────────────────────────────────────────────────
export const shared = StyleSheet.create({
  // Wrappers
  screen:  { flex: 1, backgroundColor: C.bg },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row:     { flexDirection: 'row', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    paddingHorizontal: S.xl,
    paddingTop: 56,
    paddingBottom: S.md,
  },
  headerTitle: { ...T.h2, flex: 1 },
  backBtn:     { marginRight: S.md, padding: S.xs },

  // Cards
  card: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.borderLight,
    padding: S.xl,
    marginHorizontal: S.lg,
    marginTop: S.md,
    ...shadow.card,
  },

  // Chips / badges
  chip: {
    paddingHorizontal: S.sm + 2,
    paddingVertical: 4,
    borderRadius: R.full,
    alignSelf: 'flex-start' as const,
  },
  chipText: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.3 },

  // Buttons
  btnFilled: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: S.sm,
    backgroundColor: C.action,
    paddingVertical: 14,
    paddingHorizontal: S.xl,
    borderRadius: R.lg,
  },
  btnFilledText: { ...T.label, color: C.actionText },
  btnOutline: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: S.sm,
    borderWidth: 1.5,
    borderColor: C.actionBorder,
    paddingVertical: 14,
    paddingHorizontal: S.xl,
    borderRadius: R.lg,
    backgroundColor: C.surface,
  },
  btnOutlineText: { ...T.label, color: C.action },
  btnGhost: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: S.sm,
    backgroundColor: C.actionSubtle,
    paddingVertical: 14,
    paddingHorizontal: S.xl,
    borderRadius: R.lg,
  },
  btnGhostText: { ...T.label, color: C.ink2 },

  // Notice / info strip
  notice: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: S.sm,
    padding: S.lg,
    borderRadius: R.lg,
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: C.accentLight,
  },
  noticeText: { ...T.small, flex: 1 },

  // Section heading
  sectionLabel: {
    ...T.label,
    marginHorizontal: S.xl,
    marginTop: S.xl,
    marginBottom: S.sm,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    color: C.ink4,
  },

  // Empty state
  empty: { alignItems: 'center' as const, paddingVertical: 56 },
  emptyText: { ...T.body, color: C.ink4, marginTop: S.md },

  // Divider
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.borderLight, marginVertical: S.sm },

  // Tab pills
  tabBar: {
    flexDirection: 'row' as const,
    gap: S.sm,
    paddingHorizontal: S.xl,
    paddingVertical: S.md,
  },
  tabPill: {
    paddingHorizontal: S.md + 2,
    paddingVertical: S.xs + 3,
    borderRadius: R.full,
    backgroundColor: C.surfaceAlt,
  },
  tabPillActive: { backgroundColor: C.action },
  tabPillText:       { ...T.label, color: C.ink3 },
  tabPillTextActive: { ...T.label, color: C.actionText },

  // Avatar circle
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  avatarText: { fontSize: 17, fontWeight: '600' as const, color: C.ink1 },

  // Notification badge
  badge: {
    position: 'absolute' as const,
    top: -4, right: -4,
    minWidth: 18, height: 18,
    borderRadius: 9,
    backgroundColor: C.red,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' as const },
});
