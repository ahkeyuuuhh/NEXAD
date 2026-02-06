import { supabase } from '../config/supabase';
import type { ApiResponse } from '../types';

// Student Profile Type
export interface StudentProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  student_id?: string;
  phone?: string;
  profile_photo_url?: string;
  department?: string;
  year_level?: number;
  course?: string;
  section?: string;
  notification_preferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_active: boolean;
}

// Teacher Profile Type
export interface TeacherProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  employee_id?: string;
  phone?: string;
  profile_photo_url?: string;
  department?: string;
  position?: string;
  expertise_tags?: string[];
  office_location?: string;
  office_hours?: { day: string; start: string; end: string }[];
  bio?: string;
  max_consultations_per_day: number;
  consultation_duration_minutes: number;
  average_response_time_hours: number;
  is_accepting_consultations: boolean;
  notification_preferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_active: boolean;
}

export const profileService = {
  // =============================================
  // STUDENT PROFILE METHODS
  // =============================================

  /**
   * Create a new student profile (or return existing one)
   */
  async createStudentProfile(
    userId: string,
    data: Partial<StudentProfile>
  ): Promise<ApiResponse<StudentProfile>> {
    try {
      // First check if profile already exists
      const { data: existingProfile } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingProfile) {
        console.log('Student profile already exists, returning existing');
        return { data: existingProfile };
      }

      // Create new profile
      const { data: profile, error } = await supabase
        .from('student_profiles')
        .insert({
          user_id: userId,
          email: data.email || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          student_id: data.student_id,
          phone: data.phone,
          profile_photo_url: data.profile_photo_url,
          department: data.department,
          year_level: data.year_level,
          course: data.course,
          section: data.section,
          notification_preferences: data.notification_preferences || { email: true, push: true, sms: false },
        })
        .select()
        .single();

      if (error) {
        // If duplicate key error, try to fetch the existing profile
        if (error.code === '23505') {
          console.log('Duplicate key - fetching existing profile');
          const { data: retryProfile } = await supabase
            .from('student_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
          if (retryProfile) {
            return { data: retryProfile };
          }
        }
        throw error;
      }
      return { data: profile };
    } catch (error: any) {
      console.error('Error creating student profile:', error);
      return { error: error.message || 'Failed to create student profile' };
    }
  },

  /**
   * Get student profile by user ID
   */
  async getStudentProfile(userId: string): Promise<ApiResponse<StudentProfile>> {
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return { error: 'Profile not found' };
      }
      return { data };
    } catch (error: any) {
      console.error('Error fetching student profile:', error);
      return { error: error.message || 'Failed to fetch student profile' };
    }
  },

  /**
   * Update student profile
   */
  async updateStudentProfile(
    userId: string,
    updates: Partial<StudentProfile>
  ): Promise<ApiResponse<StudentProfile>> {
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error: any) {
      console.error('Error updating student profile:', error);
      return { error: error.message || 'Failed to update student profile' };
    }
  },

  /**
   * Update student last login
   */
  async updateStudentLastLogin(userId: string): Promise<void> {
    try {
      await supabase
        .from('student_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  },

  // =============================================
  // TEACHER PROFILE METHODS
  // =============================================

  /**
   * Create a new teacher profile (or return existing one)
   */
  async createTeacherProfile(
    userId: string,
    data: Partial<TeacherProfile>
  ): Promise<ApiResponse<TeacherProfile>> {
    try {
      // First check if profile already exists
      const { data: existingProfile } = await supabase
        .from('teacher_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingProfile) {
        console.log('Teacher profile already exists, returning existing');
        return { data: existingProfile };
      }

      // Create new profile
      const { data: profile, error } = await supabase
        .from('teacher_profiles')
        .insert({
          user_id: userId,
          email: data.email || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          employee_id: data.employee_id,
          phone: data.phone,
          profile_photo_url: data.profile_photo_url,
          department: data.department,
          position: data.position,
          expertise_tags: data.expertise_tags || [],
          office_location: data.office_location,
          office_hours: data.office_hours || [],
          bio: data.bio,
          max_consultations_per_day: data.max_consultations_per_day || 8,
          consultation_duration_minutes: data.consultation_duration_minutes || 30,
          average_response_time_hours: data.average_response_time_hours || 24,
          is_accepting_consultations: data.is_accepting_consultations ?? true,
          notification_preferences: data.notification_preferences || { email: true, push: true, sms: false },
        })
        .select()
        .single();

      if (error) {
        // If duplicate key error, try to fetch the existing profile
        if (error.code === '23505') {
          console.log('Duplicate key - fetching existing teacher profile');
          const { data: retryProfile } = await supabase
            .from('teacher_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
          if (retryProfile) {
            return { data: retryProfile };
          }
        }
        throw error;
      }
      return { data: profile };
    } catch (error: any) {
      console.error('Error creating teacher profile:', error);
      return { error: error.message || 'Failed to create teacher profile' };
    }
  },

  /**
   * Get teacher profile by user ID
   */
  async getTeacherProfile(userId: string): Promise<ApiResponse<TeacherProfile>> {
    try {
      const { data, error } = await supabase
        .from('teacher_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return { error: 'Profile not found' };
      }
      return { data };
    } catch (error: any) {
      console.error('Error fetching teacher profile:', error);
      return { error: error.message || 'Failed to fetch teacher profile' };
    }
  },

  /**
   * Get all teachers (for student to select from)
   */
  async getAllTeachers(): Promise<ApiResponse<TeacherProfile[]>> {
    try {
      const { data, error } = await supabase
        .from('teacher_profiles')
        .select('*')
        .eq('is_active', true)
        .eq('is_accepting_consultations', true)
        .order('last_name', { ascending: true });

      if (error) throw error;
      return { data: data || [] };
    } catch (error: any) {
      console.error('Error fetching teachers:', error);
      return { error: error.message || 'Failed to fetch teachers' };
    }
  },

  /**
   * Get teachers by department
   */
  async getTeachersByDepartment(department: string): Promise<ApiResponse<TeacherProfile[]>> {
    try {
      const { data, error } = await supabase
        .from('teacher_profiles')
        .select('*')
        .eq('department', department)
        .eq('is_active', true)
        .eq('is_accepting_consultations', true)
        .order('last_name', { ascending: true });

      if (error) throw error;
      return { data: data || [] };
    } catch (error: any) {
      console.error('Error fetching teachers by department:', error);
      return { error: error.message || 'Failed to fetch teachers' };
    }
  },

  /**
   * Update teacher profile
   */
  async updateTeacherProfile(
    userId: string,
    updates: Partial<TeacherProfile>
  ): Promise<ApiResponse<TeacherProfile>> {
    try {
      const { data, error } = await supabase
        .from('teacher_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error: any) {
      console.error('Error updating teacher profile:', error);
      return { error: error.message || 'Failed to update teacher profile' };
    }
  },

  /**
   * Update teacher last login
   */
  async updateTeacherLastLogin(userId: string): Promise<void> {
    try {
      await supabase
        .from('teacher_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  },

  // =============================================
  // SHARED METHODS
  // =============================================

  /**
   * Check if user has a profile and determine role
   */
  async getUserRole(userId: string): Promise<ApiResponse<{ role: 'student' | 'teacher' | null; profile: StudentProfile | TeacherProfile | null }>> {
    try {
      // Check student profile first (use maybeSingle to avoid error on no rows)
      const { data: studentProfile, error: studentError } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Only throw if it's a real error, not just "no rows"
      if (studentError && studentError.code !== 'PGRST116') {
        console.error('Error checking student profile:', studentError);
      }

      if (studentProfile) {
        return { data: { role: 'student', profile: studentProfile } };
      }

      // Check teacher profile
      const { data: teacherProfile, error: teacherError } = await supabase
        .from('teacher_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Only throw if it's a real error, not just "no rows"
      if (teacherError && teacherError.code !== 'PGRST116') {
        console.error('Error checking teacher profile:', teacherError);
      }

      if (teacherProfile) {
        return { data: { role: 'teacher', profile: teacherProfile } };
      }

      // No profile found
      return { data: { role: null, profile: null } };
    } catch (error: any) {
      console.error('Error getting user role:', error);
      return { error: error.message || 'Failed to get user role' };
    }
  },

  /**
   * Delete user profile (for account deletion)
   */
  async deleteProfile(userId: string, role: 'student' | 'teacher'): Promise<ApiResponse<null>> {
    try {
      const table = role === 'student' ? 'student_profiles' : 'teacher_profiles';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      return { data: null };
    } catch (error: any) {
      console.error('Error deleting profile:', error);
      return { error: error.message || 'Failed to delete profile' };
    }
  },
};
