import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { C, S, R, shadow, T } from '../../config/theme';
import { profileService, StudentProfile } from '../../services/profileService';
import { useAuth } from '../../contexts/AuthContext';

export default function StudentProfileScreen({ navigation }: any) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user?.user_id) return;
    setLoading(true);
    const result = await profileService.getStudentProfile(user.user_id);
    if (result.data) setProfile(result.data);
    setLoading(false);
  }, [user?.user_id]);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const fullName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : '';

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

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
            <Text style={styles.headerTitle}>My Profile</Text>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('AccountSettings')}
            >
              <Ionicons name="create-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Avatar + name */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarRing}>
              {profile.profile_photo_url ? (
                <Image source={{ uri: profile.profile_photo_url }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
            </View>
            <Text style={styles.profileName}>{fullName}</Text>
            <Text style={styles.profileRole}>Student</Text>
            {!!profile.department && (
              <Text style={styles.profileDept}>{profile.department}</Text>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Academic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Information</Text>
          <View style={styles.card}>
            {!!profile.student_id && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Student ID</Text>
                <Text style={styles.infoValue}>{profile.student_id}</Text>
              </View>
            )}
            {!!profile.course && (
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <Text style={styles.infoLabel}>Course</Text>
                <Text style={styles.infoValue}>{profile.course}</Text>
              </View>
            )}
            {!!profile.year_level && (
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <Text style={styles.infoLabel}>Year Level</Text>
                <Text style={styles.infoValue}>Year {profile.year_level}</Text>
              </View>
            )}
            {!!profile.section && (
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <Text style={styles.infoLabel}>Section</Text>
                <Text style={styles.infoValue}>{profile.section}</Text>
              </View>
            )}
            {!profile.student_id && !profile.course && !profile.year_level && !profile.section && (
              <Text style={styles.emptyHint}>No academic information added yet</Text>
            )}
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile.email}</Text>
            </View>
            {!!profile.phone && (
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{profile.phone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Edit Settings */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('AccountSettings')}
          >
            <Ionicons name="settings-outline" size={18} color={C.ink1} style={{ marginRight: S.sm }} />
            <Text style={styles.editBtnText}>Edit Profile & Settings</Text>
          </TouchableOpacity>
        </View>

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

  avatarSection: { alignItems: 'center', paddingBottom: S.xl },
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
  profileRole: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  profileDept: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: S.lg },

  section: { paddingHorizontal: S.lg, marginBottom: S.lg },
  sectionTitle: { ...T.cap, marginBottom: S.sm },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    overflow: 'hidden',
    ...shadow.soft,
    borderWidth: 1,
    borderColor: C.borderLight,
  },

  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: S.md, paddingHorizontal: S.lg },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: C.borderLight },
  infoIcon: { marginRight: S.md, marginTop: 2 },
  infoLabel: { ...T.small, color: C.ink3 },
  infoValue: { ...T.body, fontWeight: '500' as const, color: C.ink1, textAlign: 'right' as const, flex: 1, marginLeft: S.sm },
  emptyHint: { ...T.body, color: C.ink4, textAlign: 'center', paddingVertical: S.sm },

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
