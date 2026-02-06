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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { profileService, TeacherProfile } from '../../services/profileService';
import { supabase } from '../../config/supabase';

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

const DEPARTMENTS = [
  'All Departments',
  'Computer Science',
  'Engineering',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Business',
  'Psychology',
  'English',
  'History',
];

export default function FindTeacherScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    loadTeachers();
  }, []);

  useEffect(() => {
    filterTeachers();
  }, [searchQuery, selectedDepartment, teachers]);

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

    // Filter by department
    if (selectedDepartment !== 'All Departments') {
      filtered = filtered.filter(t => t.department === selectedDepartment);
    }

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find a Teacher</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Find your professor's name"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>

        {/* Department Dropdown */}
        <TouchableOpacity
          style={styles.departmentButton}
          onPress={() => setShowDepartmentDropdown(!showDepartmentDropdown)}
        >
          <Text style={styles.departmentButtonText}>
            {selectedDepartment === 'All Departments' ? 'Select a Department' : selectedDepartment}
          </Text>
          <Text style={styles.dropdownIcon}>{showDepartmentDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showDepartmentDropdown && (
          <View style={styles.departmentDropdown}>
            <ScrollView style={styles.dropdownScroll}>
              {DEPARTMENTS.map((dept, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.departmentOption}
                  onPress={() => {
                    setSelectedDepartment(dept);
                    setShowDepartmentDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.departmentOptionText,
                    selectedDepartment === dept && styles.selectedDepartmentText
                  ]}>
                    {dept}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Teachers List */}
      <ScrollView style={styles.teachersList}>
        <Text style={styles.listTitle}>Available Teachers</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : filteredTeachers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>👨‍🏫</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || selectedDepartment !== 'All Departments'
                ? 'No teachers found matching your criteria'
                : 'No teacher profiles found'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery || selectedDepartment !== 'All Departments'
                ? 'Try adjusting your search filters'
                : 'Teacher accounts need to sign in first to create their profiles'}
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={loadTeachers}
            >
              <Text style={styles.retryButtonText}>🔄 Refresh</Text>
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
              <Text style={styles.selectIcon}>→</Text>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#2563eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  placeholder: {
    width: 40,
  },
  searchSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  departmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  departmentButtonText: {
    fontSize: 16,
    color: '#1f2937',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#6b7280',
  },
  departmentDropdown: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  departmentOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  departmentOptionText: {
    fontSize: 16,
    color: '#1f2937',
  },
  selectedDepartmentText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  teachersList: {
    flex: 1,
    padding: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
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
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  teacherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  teacherAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  teacherAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  teacherDepartment: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  teacherPosition: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 2,
  },
  teacherExpertise: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  teacherOfficeLocation: {
    fontSize: 12,
    color: '#9ca3af',
  },
  selectIcon: {
    fontSize: 20,
    color: '#2563eb',
  },
});
