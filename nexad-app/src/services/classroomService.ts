import { supabase } from '../config/supabase';
import type { Classroom, ApiResponse, ClassroomMembership } from '../types';

/**
 * Generate a unique 6-digit alphanumeric invite code (always uppercase)
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars (0, O, I, 1)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code.toUpperCase(); // Ensure uppercase
}

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
      // Generate unique invite code
      let inviteCode = generateInviteCode();
      let isUnique = false;
      
      // Ensure invite code is unique
      while (!isUnique) {
        const { data: existing } = await supabase
          .from('classrooms')
          .select('id')
          .eq('invite_code', inviteCode)
          .single();
        
        if (!existing) {
          isUnique = true;
        } else {
          inviteCode = generateInviteCode();
        }
      }

      const { data, error } = await supabase
        .from('classrooms')
        .insert({
          teacher_id: teacherId,
          name,
          description,
          invite_code: inviteCode,
        })
        .select('*')
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
        .select('*')
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
        .select('classroom:classrooms(*)')
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
   * Uses a SECURITY DEFINER RPC function to bypass RLS so students can
   * look up a classroom by invite code before they are members.
   */
  async joinClassroom(
    studentId: string,
    inviteCode: string
  ): Promise<ApiResponse<ClassroomMembership>> {
    try {
      const { data, error } = await supabase.rpc('join_classroom_by_code', {
        invite_code_input: inviteCode.toUpperCase().trim(),
      });

      if (error) {
        // Map server-side exceptions to user-friendly messages
        if (error.message?.includes('Invalid invite code')) {
          return { error: 'Invalid invite code. Please check and try again.' };
        }
        if (error.message?.includes('Already a member')) {
          return { error: 'You are already a member of this classroom.' };
        }
        return { error: error.message || 'Failed to join classroom' };
      }

      // RPC returns the first row: { classroom_id, classroom_name }
      return { data: (data?.[0] ?? data) as any };
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
        .select('*')
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

  /**
   * Create announcement in classroom
   */
  async createAnnouncement(
    classroomId: string,
    teacherId: string,
    title: string,
    content: string,
    isPinned: boolean = false
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          classroom_id: classroomId,
          teacher_id: teacherId,
          title,
          content,
          is_pinned: isPinned,
        })
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error: any) {
      return { error: error.message || 'Failed to create announcement' };
    }
  },

  /**
   * Get announcements for a classroom
   */
  async getClassroomAnnouncements(classroomId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [] };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch announcements' };
    }
  },

  /**
   * Create attachment bin
   */
  async createAttachmentBin(
    classroomId: string,
    teacherId: string,
    title: string,
    description: string | null,
    deadline: string | null
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('attachment_bins')
        .insert({
          classroom_id: classroomId,
          teacher_id: teacherId,
          title,
          description,
          deadline,
          is_active: true,
          require_ai_analysis: true,
        })
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error: any) {
      return { error: error.message || 'Failed to create attachment bin' };
    }
  },

  /**
   * Get attachment bins for a classroom
   */
  async getClassroomAttachmentBins(classroomId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('attachment_bins')
        .select(`
          *,
          uploaded_documents(count)
        `)
        .eq('classroom_id', classroomId)
        .eq('is_active', true)
        .order('created_at', { ascending: false});

      if (error) throw error;

      const bins = data?.map((bin: any) => ({
        ...bin,
        submission_count: bin.uploaded_documents?.[0]?.count || 0,
      })) || [];

      return { data: bins };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch attachment bins' };
    }
  },

  /**
   * Get classroom members with user details
   */
  async getClassroomMembers(classroomId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('classroom_memberships')
        .select(`
          *,
          users:student_id(id, first_name, last_name, email, profile_photo_url)
        `)
        .eq('classroom_id', classroomId)
        .eq('is_active', true)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      const members = data?.map((membership: any) => ({
        ...membership.users,
        joined_at: membership.joined_at,
      })) || [];

      return { data: members };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch members' };
    }
  },

  /**
   * Delete classroom (Teacher only)
   */
  async deleteClassroom(classroomId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('classrooms')
        .delete()
        .eq('id', classroomId);

      if (error) throw error;
      return { data: undefined };
    } catch (error: any) {
      return { error: error.message || 'Failed to delete classroom' };
    }
  },

  /**
   * Leave classroom (Student only)
   */
  async leaveClassroom(
    classroomId: string,
    studentId: string
  ): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('classroom_memberships')
        .delete()
        .eq('classroom_id', classroomId)
        .eq('student_id', studentId);

      if (error) throw error;
      return { data: undefined };
    } catch (error: any) {
      return { error: error.message || 'Failed to leave classroom' };
    }
  },

  /**
   * Get attachment bin details
   */
  async getAttachmentBin(binId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('attachment_bins')
        .select(`
          *,
          classrooms(name),
          users:teacher_id(first_name, last_name)
        `)
        .eq('id', binId)
        .single();

      if (error) throw error;
      return { data };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch attachment bin' };
    }
  },

  /**
   * Submit document to attachment bin
   * Links an existing uploaded_document to an attachment_bin
   */
  async submitToAttachmentBin(
    binId: string,
    documentId: string
  ): Promise<ApiResponse<any>> {
    try {
      // Update the document to link it to the bin
      const { data, error } = await supabase
        .from('uploaded_documents')
        .update({
          attachment_bin_id: binId,
          uploaded_at: new Date().toISOString(),
        })
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error: any) {
      return { error: error.message || 'Failed to submit to attachment bin' };
    }
  },

  /**
   * Get all submissions for an attachment bin (Teacher view)
   */
  async getAttachmentBinSubmissions(binId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('uploaded_documents')
        .select(`
          *,
          users:uploaded_by(first_name, last_name, email)
        `)
        .eq('attachment_bin_id', binId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return { data: data || [] };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch submissions' };
    }
  },

  /**
   * Check if student has already submitted to a bin
   */
  async getStudentBinSubmission(
    binId: string,
    studentId: string
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('uploaded_documents')
        .select('*')
        .eq('attachment_bin_id', binId)
        .eq('uploaded_by', studentId)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return { data };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch submission' };
    }
  },
};
