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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { profileService, TeacherProfile } from '../../services/profileService';
import { supabase } from '../../config/supabase';
import { C, F, T, S, R, shadow } from '../../config/theme';
import { useRecommendedTeachers } from '../../hooks/useRecommendedTeachers';

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
  const [studentProfile, setStudentProfile] = useState<any>(null);

  const { user } = useAuth();
  
  // Get recommended teachers based on student's department
  const { 
    recommendedTeachers, 
    isLoading: isLoadingRecommendations,
    error: recommendationsError,
    refresh: refreshRecommendations 
  } = useRecommendedTeachers(studentProfile?.department);

  useEffect(() => {
    loadStudentProfile();
    loadTeachers();
  }, []);

  const loadStudentProfile = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setStudentProfile(data);
      }
    } catch (error) {
      console.error('Error loading student profile:', error);
    }
  };

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
    navigation.navigate('TeacherProfile', { userId: teacher.user_id, isOwnProfile: false });
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
        {/* Recommended Teachers Section - ALWAYS SHOW if we have any teachers */}
        {!searchQuery && !isLoadingRecommendations && recommendedTeachers.length > 0 && (
          <View style={styles.recommendedSection}>
            <View style={styles.recommendedHeader}>
              <View style={styles.recommendedTitleContainer}>
                <View style={styles.starIconContainer}>
                  <Ionicons name="star" size={18} color="#1F2937" />
                </View>
                <Text style={styles.recommendedTitle}>
                  {studentProfile?.department ? 'Recommended for You' : 'Featured Teachers'}
                </Text>
              </View>
              {studentProfile?.department ? (
                <Text style={styles.recommendedSubtitle}>
                  📚 Based on {studentProfile.department}
                </Text>
              ) : (
                <Text style={styles.recommendedSubtitle}>
                  Top teachers in your institution
                </Text>
              )}
            </View>
            
            {isLoadingRecommendations ? (
              <View style={styles.recommendedLoadingContainer}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.recommendedLoadingText}>Finding the best matches...</Text>
              </View>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recommendedCarousel}
              >
                {recommendedTeachers.map((teacher) => (
                  <TouchableOpacity
                    key={teacher.user_id}
                    style={styles.recommendedCard}
                    onPress={() => handleSelectTeacher(teacher)}
                  >
                    <View style={styles.recommendedAvatar}>
                      {teacher.profile_photo_url ? (
                        <Image 
                          source={{ uri: teacher.profile_photo_url }} 
                          style={styles.recommendedAvatarImg} 
                        />
                      ) : (
                        <Text style={styles.recommendedAvatarText}>
                          {teacher.first_name[0]}{teacher.last_name[0]}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.recommendedName} numberOfLines={1}>
                      {teacher.first_name} {teacher.last_name}
                    </Text>
                    {teacher.position && (
                      <Text style={styles.recommendedPosition} numberOfLines={1}>
                        {teacher.position}
                      </Text>
                    )}
                    {teacher.expertise_tags && teacher.expertise_tags.length > 0 && (
                      <View style={styles.recommendedSkillsContainer}>
                        {teacher.expertise_tags.slice(0, 3).map((skill, idx) => (
                          <View key={idx} style={styles.recommendedSkillBadge}>
                            <Text style={styles.recommendedSkillText} numberOfLines={1}>
                              {skill.length > 20 ? skill.substring(0, 20) + '...' : skill}
                            </Text>
                          </View>
                        ))}
                        {teacher.expertise_tags.length > 3 && (
                          <Text style={styles.moreSkillsText}>
                            +{teacher.expertise_tags.length - 3} more
                          </Text>
                        )}
                      </View>
                    )}
                    <View style={styles.matchBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#1F2937" />
                      <Text style={styles.matchBadgeText}>Match</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        <Text style={styles.listTitle}>
          {searchQuery ? 'Search Results' : 'All Teachers'}
        </Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Image 
              source={require('../../../assets/NEXAD GIF.gif')} 
              style={styles.loadingGif}
              resizeMode="contain"
            />
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
                {teacher.profile_photo_url ? (
                  <Image source={{ uri: teacher.profile_photo_url }} style={styles.teacherAvatarImg} />
                ) : (
                  <Text style={styles.teacherAvatarText}>
                    {teacher.first_name[0]}{teacher.last_name[0]}
                  </Text>
                )}
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
    backgroundColor: 'transparent', // Same as dashboard
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
    backgroundColor: 'rgba(32, 33, 36, 0.08)', // Dark translucent like shortcut buttons
    borderRadius: R.xl,
    paddingHorizontal: S.md,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(32, 33, 36, 0.15)',
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
  loadingGif: { width: 200, height: 200 },
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
  teacherAvatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
  // Recommended Teachers Styles
  recommendedSection: {
    marginBottom: S.xl,
    paddingTop: S.xs,
  },
  recommendedHeader: {
    marginBottom: S.md + 2,
    paddingHorizontal: 2,
  },
  recommendedTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  starIconContainer: {
    width: 28,
    height: 28,
    borderRadius: R.full,
    backgroundColor: 'rgba(31, 41, 55, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  recommendedTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: C.ink1,
    letterSpacing: -0.3,
  },
  recommendedSubtitle: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: C.ink3,
    letterSpacing: -0.1,
  },
  recommendedLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: S.xl + S.md,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: R.lg,
  },
  recommendedLoadingText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: C.ink3,
    marginLeft: S.sm,
  },
  recommendedCarousel: {
    paddingRight: S.lg,
    paddingVertical: 4,
  },
  recommendedCard: {
    width: 160,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: R.lg + 2,
    padding: S.md + 2,
    marginRight: S.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  recommendedAvatar: {
    width: 64,
    height: 64,
    borderRadius: R.full,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S.sm + 2,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  recommendedAvatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'transparent',
  },
  recommendedAvatarText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#6B7280',
    letterSpacing: 0.5,
    backgroundColor: '#F3F4F6',
    width: 64,
    height: 64,
    borderRadius: 32,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 64,
  },
  recommendedName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: C.ink1,
    textAlign: 'center',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  recommendedPosition: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: C.ink3,
    textAlign: 'center',
    marginBottom: S.sm + 2,
  },
  recommendedSkillsContainer: {
    flexDirection: 'column',
    gap: 5,
    marginBottom: S.sm + 2,
    minHeight: 44,
  },
  recommendedSkillBadge: {
    backgroundColor: 'rgba(107, 114, 128, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: R.sm + 2,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.2)',
  },
  recommendedSkillText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#4B5563',
    letterSpacing: -0.1,
  },
  moreSkillsText: {
    fontSize: 9,
    fontWeight: '500' as const,
    color: C.ink4,
    textAlign: 'center',
    marginTop: 2,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.08)',
    paddingHorizontal: S.sm + 2,
    paddingVertical: 6,
    borderRadius: R.full,
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: 'rgba(31, 41, 55, 0.15)',
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#1F2937',
    marginLeft: 4,
    letterSpacing: 0.3,
  },
});
