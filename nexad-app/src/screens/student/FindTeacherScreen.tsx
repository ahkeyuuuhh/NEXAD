import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { profileService, TeacherProfile } from '../../services/profileService';
import { supabase } from '../../config/supabase';
import { C, F, T, S, R, shadow } from '../../config/theme';

interface Teacher {
  user_id: string;
  first_name: string;
  last_name: string;
  department?: string;
  profile_photo_url?: string;
  office_hours?: any;
  position?: string;
  expertise_tags?: string[];
  office_location?: string;
}

export default function FindTeacherScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAuth();

  useEffect(() => {
    loadTeachers();
  }, []);

  useEffect(() => {
    filterTeachers();
  }, [searchQuery, teachers]);

  const loadTeachers = async () => {
    try {
      setIsLoading(true);
      console.log('Loading teachers from database...');
      
      // Get all teacher profiles - use * to select all columns
      const { data, error } = await supabase
        .from('teacher_profiles')
        .select('*')
        .order('last_name', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Teachers loaded:', data?.length || 0);
      setTeachers(data || []);
    } catch (error: any) {
      console.error('Error loading teachers:', error);
      const errorMessage = error?.message || error?.error_description || 'Failed to load teachers';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTeachers = () => {
    let filtered = [...teachers];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        `${t.first_name} ${t.last_name}`.toLowerCase().includes(query) ||
        t.department?.toLowerCase().includes(query) ||
        t.position?.toLowerCase().includes(query) ||
        t.expertise_tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredTeachers(filtered);
  };

  const handleSelectTeacher = (teacher: Teacher) => {
    navigation.navigate('ConsultationRequest', { teacher });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#FFFFFF', '#EDF0F4', '#D0D5DC']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.2, y: 1 }}
      />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={C.ink1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find a Teacher</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={18} color={C.ink3} style={{ marginRight: S.sm }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Find your professor's name"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={C.ink4}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={C.ink4} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Teachers List */}
      <ScrollView style={styles.teachersList}>
        <Text style={styles.listTitle}>Available Teachers</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={C.action} />
          </View>
        ) : filteredTeachers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="person-outline" size={56} color={C.ink5} />
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No teachers found matching your search' : 'No teacher profiles found'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery ? 'Try a different name or keyword' : 'Teacher accounts need to sign in first to create their profiles'}
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={loadTeachers}
            >
              <Ionicons name="refresh-outline" size={16} color={C.actionText} style={{ marginRight: 6 }} />
              <Text style={styles.retryButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredTeachers.map((teacher) => (
            <TouchableOpacity
              key={teacher.user_id}
              style={styles.teacherCard}
              onPress={() => handleSelectTeacher(teacher)}
            >
              <View style={styles.teacherAvatar}>
                <Text style={styles.teacherAvatarText}>
                  {teacher.first_name[0]}{teacher.last_name[0]}
                </Text>
              </View>
              <View style={styles.teacherInfo}>
                <Text style={styles.teacherName}>
                  {teacher.first_name} {teacher.last_name}
                </Text>
                {teacher.department && (
                  <Text style={styles.teacherDepartment}>{teacher.department}</Text>
                )}
                {teacher.position && (
                  <Text style={styles.teacherPosition}>{teacher.position}</Text>
                )}
                {teacher.expertise_tags && teacher.expertise_tags.length > 0 && (
                  <Text style={styles.teacherExpertise}>
                    {teacher.expertise_tags.slice(0, 3).join(', ')}
                  </Text>
                )}
                {teacher.office_location && (
                  <Text style={styles.teacherOfficeLocation}>📍 {teacher.office_location}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.ink4} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: R.full,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: C.ink1,
  },
  placeholder: {
    width: 36,
  },
  searchSection: {
    backgroundColor: 'transparent',
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: R.xl,
    paddingHorizontal: S.md,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  searchInput: {
    flex: 1,
    paddingVertical: S.md,
    fontSize: 14,
    fontWeight: '400' as const,
    color: C.ink1,
    backgroundColor: 'transparent',
  },
  teachersList: {
    flex: 1,
    padding: S.lg,
    backgroundColor: 'transparent',
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: C.ink1,
    marginBottom: S.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: S.xl,
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: C.ink1,
    textAlign: 'center',
    marginTop: S.lg,
    marginBottom: S.sm,
  },
  emptyStateSubtext: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: C.ink3,
    textAlign: 'center',
    marginBottom: S.xl,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.action,
    paddingHorizontal: S.xl,
    paddingVertical: S.md,
    borderRadius: R.full,
  },
  retryButtonText: {
    color: C.actionText,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  teacherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
    paddingVertical: S.sm + 4,
    paddingHorizontal: S.md,
    borderRadius: R.lg,
    marginBottom: S.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  teacherAvatar: {
    width: 38,
    height: 38,
    borderRadius: R.full,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: S.sm + 2,
  },
  teacherAvatarText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: C.ink3,
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: C.ink1,
    marginBottom: 1,
  },
  teacherDepartment: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: C.ink3,
    marginBottom: 1,
  },
  teacherPosition: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: C.ink4,
    marginBottom: 1,
  },
  teacherExpertise: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: C.ink4,
    marginBottom: 1,
  },
  teacherOfficeLocation: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: C.ink4,
  },
});
