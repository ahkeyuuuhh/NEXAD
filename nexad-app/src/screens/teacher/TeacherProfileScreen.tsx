import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { C, S, R, shadow, T } from '../../config/theme';
import { profileService, TeacherProfile } from '../../services/profileService';
import { useAuth } from '../../contexts/AuthContext';

export default function TeacherProfileScreen({ navigation, route }: any) {
  const { userId, isOwnProfile } = route.params || {};
  const { user } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const targetUserId = isOwnProfile ? user?.user_id : userId;

  const loadProfile = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);
    const result = await profileService.getTeacherProfile(targetUserId);
    if (result.data) setProfile(result.data);
    setLoading(false);
  }, [targetUserId]);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const fullName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : '';

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const dayLabel: Record<string, string> = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
    thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={C.ink1} />
      </View>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.errorWrap}>
          <Ionicons name="person-circle-outline" size={60} color={C.ink4} />
          <Text style={styles.errorText}>Profile not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Dark header */}
      <LinearGradient colors={['#111111', '#2a2a2a']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isOwnProfile ? 'My Profile' : 'Teacher Profile'}
            </Text>
            {isOwnProfile ? (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => navigation.navigate('AccountSettings')}
              >
                <Ionicons name="create-outline" size={22} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View style={styles.iconBtn} />
            )}
          </View>

          {/* Avatar + name */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarRing}>
              {profile.profile_photo_url ? (
                <Image
                  source={{ uri: profile.profile_photo_url }}
                  style={styles.avatarImg}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
            </View>
            <Text style={styles.profileName}>{fullName}</Text>
            {!!profile.position && (
              <Text style={styles.profilePosition}>{profile.position}</Text>
            )}
            {!!profile.department && (
              <Text style={styles.profileDept}>{profile.department}</Text>
            )}

            {/* Accepting badge */}
            <View style={[
              styles.acceptBadge,
              { backgroundColor: profile.is_accepting_consultations ? 'rgba(255,255,255,0.18)' : 'rgba(220,38,38,0.4)' }
            ]}>
              <Ionicons
                name={profile.is_accepting_consultations ? 'checkmark-circle-outline' : 'close-circle-outline'}
                size={13}
                color={profile.is_accepting_consultations ? '#d4f0bf' : '#FCA5A5'}
              />
              <Text style={[
                styles.acceptBadgeText,
                { color: profile.is_accepting_consultations ? '#d4f0bf' : '#FCA5A5' }
              ]}>
                {profile.is_accepting_consultations ? 'Accepting Consultations' : 'Not Accepting Now'}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{profile.max_consultations_per_day}</Text>
            <Text style={styles.statLabel}>Max/day</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{profile.consultation_duration_minutes}m</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{profile.average_response_time_hours}h</Text>
            <Text style={styles.statLabel}>Response</Text>
          </View>
        </View>

        {/* Bio */}
        {!!profile.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.card}>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          </View>
        )}

        {/* Specialties / Expertise */}
        {(profile.expertise_tags?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specialties</Text>
            <View style={styles.card}>
              <View style={styles.tagsWrap}>
                {profile.expertise_tags!.map((tag, i) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Office info */}
        {(!!profile.office_location || (profile.office_hours?.length ?? 0) > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Office</Text>
            <View style={styles.card}>
              {!!profile.office_location && (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color={C.ink3} style={styles.infoIcon} />
                  <Text style={styles.infoText}>{profile.office_location}</Text>
                </View>
              )}
              {(profile.office_hours?.length ?? 0) > 0 && (
                <View style={{ marginTop: profile.office_location ? S.md : 0 }}>
                  <Text style={styles.subLabel}>Office Hours</Text>
                  {profile.office_hours!.map((oh, i) => (
                    <View key={i} style={styles.officeHourRow}>
                      <Text style={styles.ohDay}>{dayLabel[oh.day.toLowerCase()] ?? oh.day}</Text>
                      <Text style={styles.ohTime}>{oh.start} – {oh.end}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Contact */}
        {!!profile.phone && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <View style={styles.card}>
              <View style={[styles.infoRow, { justifyContent: 'space-between' }]}>
                <Text style={styles.infoItemLabel}>Phone</Text>
                <Text style={styles.infoText}>{profile.phone}</Text>
              </View>
              <View style={[styles.infoRow, { justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.borderLight, marginTop: 0 }]}>
                <Text style={styles.infoItemLabel}>Email</Text>
                <Text style={styles.infoText}>{profile.email}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Request Consultation button (student viewing a teacher) */}
        {!isOwnProfile && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.ctaBtn,
                !profile.is_accepting_consultations && styles.ctaBtnDisabled
              ]}
              onPress={() => {
                if (!profile.is_accepting_consultations) {
                  Alert.alert('Not Available', 'This teacher is not accepting consultations at the moment.');
                  return;
                }
                navigation.navigate('ConsultationRequest', { teacher: profile });
              }}
              disabled={!profile.is_accepting_consultations}
            >
              <Ionicons name="calendar-outline" size={18} color={profile.is_accepting_consultations ? '#fff' : C.ink4} style={{ marginRight: S.sm }} />
              <Text style={[styles.ctaBtnText, !profile.is_accepting_consultations && { color: C.ink4 }]}>
                Request Consultation
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Edit settings button (own profile) */}
        {isOwnProfile && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('AccountSettings')}
            >
              <Ionicons name="settings-outline" size={18} color={C.ink1} style={{ marginRight: S.sm }} />
              <Text style={styles.editBtnText}>Edit Profile & Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: S.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: S.xl },
  errorText: { ...T.h3, color: C.ink3, marginTop: S.lg, marginBottom: S.xl },
  backBtn: {
    paddingHorizontal: S.xl,
    paddingVertical: S.md,
    backgroundColor: C.ink1,
    borderRadius: R.full,
  },
  backBtnText: { ...T.label, color: '#fff' },

  // Header
  header: { paddingBottom: S.xl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: R.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: { ...T.h3, color: '#fff' },

  avatarSection: { alignItems: 'center', paddingBottom: S.lg },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
    marginBottom: S.md,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  profileName: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  profilePosition: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  profileDept: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  acceptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: S.sm,
    paddingHorizontal: S.md,
    paddingVertical: 4,
    borderRadius: R.full,
  },
  acceptBadgeText: { fontSize: 11, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: S.lg },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: S.lg,
    backgroundColor: 'rgba(32, 33, 36, 0.03)', // Even lighter translucent background
    borderRadius: R.lg,
    borderTopLeftRadius: R.xl, // Top border radius
    borderTopRightRadius: R.xl, // Top border radius
    ...shadow.card,
    marginBottom: S.lg,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: S.lg },
  statDivider: { width: 1, backgroundColor: C.border, marginVertical: S.md },
  statVal: { fontSize: 20, fontWeight: '700', color: C.ink1 },
  statLabel: { ...T.small, marginTop: 2 },

  // Sections
  section: { paddingHorizontal: S.lg, marginBottom: S.lg },
  sectionTitle: { ...T.cap, marginBottom: S.sm },
  card: {
    backgroundColor: 'rgba(32, 33, 36, 0.03)', // Even lighter translucent background
    borderRadius: R.lg,
    borderTopLeftRadius: R.xl, // Top border radius
    borderTopRightRadius: R.xl, // Top border radius
    padding: S.lg,
    ...shadow.soft,
    borderWidth: 1,
    borderColor: C.borderLight,
  },

  bioText: { ...T.body },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  tag: {
    backgroundColor: C.accentLight,
    borderRadius: R.full,
    paddingHorizontal: S.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.border,
  },
  tagText: { fontSize: 12, fontWeight: '600', color: C.ink2 },

  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: S.sm },
  infoIcon: { marginRight: S.sm },
  infoItemLabel: { ...T.small, color: C.ink3, minWidth: 56 },
  infoText: { ...T.body, flex: 1, textAlign: 'right' as const },
  subLabel: { ...T.label, color: C.ink3, marginBottom: S.sm },
  officeHourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  ohDay: { fontSize: 13, fontWeight: '600', color: C.ink2, width: 48 },
  ohTime: { ...T.body, color: C.ink3 },

  // CTA
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink1,
    borderRadius: R.xl,
    paddingVertical: S.lg,
    ...shadow.card,
  },
  ctaBtnDisabled: { backgroundColor: C.surfaceAlt },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
    borderRadius: R.xl,
    paddingVertical: S.lg,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  editBtnText: { fontSize: 15, fontWeight: '600', color: C.ink1 },
});
