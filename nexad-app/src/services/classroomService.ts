import { supabase } from '../config/supabase';
import type { Classroom, ApiResponse, ClassroomMembership } from '../types';

export const classroomService = {
  /**
   * Create a new classroom
   */
  async createClassroom(
    teacherId: string,
    name: string,
    description?: string
  ): Promise<ApiResponse<Classroom>> {
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .insert({
          teacher_id: teacherId,
          name,
          description,
        })
        .select(`
          *,
          teacher:users!teacher_id(*)
        `)
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return { error: error.message || 'Failed to create classroom' };
    }
  },

  /**
   * Get teacher's classrooms
   */
  async getTeacherClassrooms(teacherId: string): Promise<ApiResponse<Classroom[]>> {
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select(`
          *,
          teacher:users!teacher_id(*)
        `)
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch teacher classrooms' };
    }
  },

  /**
   * Get student's joined classrooms
   */
  async getStudentClassrooms(studentId: string): Promise<ApiResponse<Classroom[]>> {
    try {
      const { data, error } = await supabase
        .from('classroom_memberships')
        .select(`
          classroom:classrooms(
            *,
            teacher:users!teacher_id(*)
          )
        `)
        .eq('student_id', studentId)
        .eq('is_active', true);

      if (error) throw error;

      const classrooms = data?.map((m: any) => m.classroom) || [];
      return { data: classrooms };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch student classrooms' };
    }
  },

  /**
   * Join classroom with invite code
   */
  async joinClassroom(
    studentId: string,
    inviteCode: string
  ): Promise<ApiResponse<ClassroomMembership>> {
    try {
      // First, find the classroom
      const { data: classroom, error: classroomError } = await supabase
        .from('classrooms')
        .select('id')
        .eq('invite_code', inviteCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (classroomError || !classroom) {
        return { error: 'Invalid invite code' };
      }

      // Check if already a member
      const { data: existingMembership } = await supabase
        .from('classroom_memberships')
        .select('id')
        .eq('classroom_id', classroom.id)
        .eq('student_id', studentId)
        .single();

      if (existingMembership) {
        return { error: 'Already a member of this classroom' };
      }

      // Join classroom
      const { data, error } = await supabase
        .from('classroom_memberships')
        .insert({
          classroom_id: classroom.id,
          student_id: studentId,
        })
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return { error: error.message || 'Failed to join classroom' };
    }
  },

  /**
   * Get classroom by ID
   */
  async getClassroom(classroomId: string): Promise<ApiResponse<Classroom>> {
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select(`
          *,
          teacher:users!teacher_id(*)
        `)
        .eq('id', classroomId)
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch classroom' };
    }
  },

  /**
   * Get classroom members count
   */
  async getMemberCount(classroomId: string): Promise<ApiResponse<number>> {
    try {
      const { count, error } = await supabase
        .from('classroom_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('classroom_id', classroomId)
        .eq('is_active', true);

      if (error) throw error;

      return { data: count || 0 };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch member count' };
    }
  },
};
