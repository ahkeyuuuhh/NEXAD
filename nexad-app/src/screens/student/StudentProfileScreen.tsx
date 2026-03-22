import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { profileService, StudentProfile } from '../../services/profileService';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  navigation: any;
  route: any;
}

export default function StudentProfileScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Simple and safe parameter handling
  const userId = route?.params?.userId || user?.user_id;
  const isOwnProfile = route?.params?.isOwnProfile !== false;

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(false);
      
      if (!userId) {
        setError(true);
        setLoading(false);
        return;
      }

      const result = await profileService.getStudentProfile(userId);
      
      if (result && result.data) {
        setProfile(result.data);
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    try {
      navigation.goBack();
    } catch (err) {
      // Fallback navigation
      navigation.navigate('StudentDashboard');
    }
  };

  const handleSettings = () => {
    try {
      if (isOwnProfile) {
        navigation.navigate('AccountSettings');
      }
    } catch (err) {
      // Silent fail
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Image 
          source={require('../../../assets/NEXAD GIF.gif')} 
          style={styles.loadingGif}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load profile</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const firstName = profile.first_name || '';
  const lastName = profile.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Student';
  const initials = fullName.split(' ').map(n => n[0] || '').join('').slice(0, 2).toUpperCase() || 'ST';

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#111111', '#2a2a2a']} style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleGoBack} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{isOwnProfile ? 'My Profile' : 'Student Profile'}</Text>
            <TouchableOpacity style={styles.iconBtn} onPress={handleSettings}>
              {isOwnProfile && <Ionicons name="create-outline" size={22} color="#fff" />}
            </TouchableOpacity>
          </View>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarRing}>
                {profile.profile_photo_url ? (
                  <Image 
                    source={{ uri: profile.profile_photo_url }} 
                    style={styles.avatarImg}
                    onError={() => {}}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.profileName}>{fullName}</Text>
            <View style={styles.profileRoleBadge}>
              <Text style={styles.profileRole}>Student</Text>
            </View>
            {profile.department && (
              <Text style={styles.profileDept}>{profile.department}</Text>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Academic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Information</Text>
          <View style={styles.card}>
            {profile.student_id && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Student ID</Text>
                <Text style={styles.infoValue}>{profile.student_id}</Text>
              </View>
            )}
            {profile.course && (
              <View style={[styles.infoRow, profile.student_id ? styles.infoRowBorder : null]}>
                <Text style={styles.infoLabel}>Course</Text>
                <Text style={styles.infoValue}>{profile.course}</Text>
              </View>
            )}
            {profile.year_level && (
              <View style={[styles.infoRow, (profile.student_id || profile.course) ? styles.infoRowBorder : null]}>
                <Text style={styles.infoLabel}>Year Level</Text>
                <Text style={styles.infoValue}>Year {profile.year_level}</Text>
              </View>
            )}
            {profile.section && (
              <View style={[styles.infoRow, (profile.student_id || profile.course || profile.year_level) ? styles.infoRowBorder : null]}>
                <Text style={styles.infoLabel}>Section</Text>
                <Text style={styles.infoValue}>{profile.section}</Text>
              </View>
            )}
            {!profile.student_id && !profile.course && !profile.year_level && !profile.section && (
              <Text style={styles.emptyText}>No academic information added yet</Text>
            )}
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile.email || 'Not provided'}</Text>
            </View>
            {profile.phone && (
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{profile.phone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Settings Button - Only show for own profile */}
        {isOwnProfile && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.settingsButton} onPress={handleSettings}>
              <Ionicons name="settings-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.settingsButtonText}>Edit Profile & Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'transparent' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'transparent' 
  },
  loadingGif: { 
    width: 200, 
    height: 200 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#000' 
  },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  errorText: { 
    fontSize: 16, 
    color: '#666', 
    marginBottom: 20 
  },
  retryButton: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: { 
    color: '#fff', 
    fontWeight: '600' 
  },

  headerGradient: { 
    paddingBottom: 30 
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  avatarSection: { 
    alignItems: 'center', 
    paddingBottom: 30 
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  avatarImg: { 
    width: '100%', 
    height: '100%' 
  },
  avatarFallback: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: { 
    fontSize: 30, 
    fontWeight: '800', 
    color: '#fff', 
    letterSpacing: 1 
  },
  profileName: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#fff', 
    letterSpacing: -0.3, 
    marginBottom: 8 
  },
  profileRoleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  profileRole: { 
    fontSize: 12, 
    color: '#fff', 
    fontWeight: '600', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  profileDept: { 
    fontSize: 12, 
    color: 'rgba(255,255,255,0.55)', 
    marginTop: 2 
  },

  content: { 
    flex: 1 
  },
  section: { 
    paddingHorizontal: 20, 
    marginBottom: 20 
  },
  sectionTitle: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#666', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5, 
    marginBottom: 8 
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },

  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 12, 
    paddingHorizontal: 16 
  },
  infoRowBorder: { 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(0,0,0,0.1)' 
  },
  infoLabel: { 
    fontSize: 14, 
    color: '#666' 
  },
  infoValue: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#000', 
    textAlign: 'right', 
    flex: 1, 
    marginLeft: 10 
  },
  emptyText: { 
    fontSize: 14, 
    color: '#999', 
    textAlign: 'center', 
    paddingVertical: 8 
  },

  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 25,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  settingsButtonText: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#FFFFFF' 
  },
});