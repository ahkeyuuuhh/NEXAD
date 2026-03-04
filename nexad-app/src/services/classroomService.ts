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
    description?: string,
    coverColor?: string
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
          ...(coverColor ? { cover_color: coverColor } : {}),
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
    isPinned: boolean = false,
    assignedTo: string[] | null = null
  ): Promise<ApiResponse<any>> {
    try {
      const payload: any = {
        classroom_id: classroomId,
        teacher_id: teacherId,
        title,
        content,
        is_pinned: isPinned,
      };
      if (assignedTo) payload.assigned_to = assignedTo;
      const { data, error } = await supabase
        .from('announcements')
        .insert(payload)
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
    deadline: string | null,
    assignedTo: string[] | null = null
  ): Promise<ApiResponse<any>> {
    try {
      const payload: any = {
        classroom_id: classroomId,
        teacher_id: teacherId,
        title,
        description,
        deadline,
        is_active: true,
        require_ai_analysis: true,
      };
      if (assignedTo) payload.assigned_to = assignedTo;
      const { data, error } = await supabase
        .from('attachment_bins')
        .insert(payload)
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
   * Get classroom members with profile details.
   * Uses two direct queries (no RPC) to be resilient against RLS edge cases:
   *   1. Fetch membership rows from classroom_memberships (teacher RLS policy allows this)
   *   2. Batch-fetch student_profiles by user_id (teacher RLS policy allows this)
   */
  async getClassroomMembers(classroomId: string): Promise<ApiResponse<any[]>> {
    try {
      // Step 1: Get all active memberships for this classroom
      const { data: memberships, error: membershipError } = await supabase
        .from('classroom_memberships')
        .select('id, student_id, joined_at')
        .eq('classroom_id', classroomId)
        .eq('is_active', true)
        .order('joined_at', { ascending: false });

      if (membershipError) throw membershipError;
      if (!memberships || memberships.length === 0) return { data: [] };

      // Step 2: Fetch student profiles for those student_ids
      const studentIds = memberships.map((m: any) => m.student_id);
      const { data: profiles, error: profileError } = await supabase
        .from('student_profiles')
        .select('user_id, first_name, last_name, email, profile_photo_url, student_id, department, course')
        .in('user_id', studentIds);

      // profileError is non-fatal — we can still show partial data
      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, p])
      );

      const members = memberships.map((m: any) => {
        const profile = profileMap.get(m.student_id);
        return {
          id: m.student_id,
          first_name: profile?.first_name || 'Unknown',
          last_name: profile?.last_name || 'Student',
          email: profile?.email || '',
          profile_photo_url: profile?.profile_photo_url || null,
          student_id: profile?.student_id || null,
          department: profile?.department || null,
          course: profile?.course || null,
          joined_at: m.joined_at,
        };
      });

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
   * Get attachment bin details.
   * teacher_id references auth.users (not a public table), so PostgREST cannot
   * join it directly. Instead we fetch the bin first, then look up the teacher
   * name from teacher_profiles using teacher_id = user_id.
   */
  async getAttachmentBin(binId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('attachment_bins')
        .select('*')
        .eq('id', binId)
        .single();

      if (error) throw error;
      if (!data) return { data: null };

      // Fetch teacher name (teacher_id → teacher_profiles.user_id)
      if (data.teacher_id) {
        const { data: teacherProfile } = await supabase
          .from('teacher_profiles')
          .select('first_name, last_name')
          .eq('user_id', data.teacher_id)
          .maybeSingle();
        // Assign as `users` so the existing UI (bin.users?.first_name) keeps working
        data.users = teacherProfile || null;
      }

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
   * Get all submissions for an attachment bin (Teacher view).
   * uploaded_by references auth.users so we do a two-step fetch.
   */
  async getAttachmentBinSubmissions(binId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data: docs, error } = await supabase
        .from('uploaded_documents')
        .select('*')
        .eq('attachment_bin_id', binId)
        .eq('is_deleted', false)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      if (!docs || docs.length === 0) return { data: [] };

      // Batch-fetch student profiles for each uploader
      const studentIds = [...new Set(docs.map((d: any) => d.uploaded_by).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('student_profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', studentIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const submissions = docs.map((doc: any) => {
        const profile = profileMap.get(doc.uploaded_by);
        return {
          ...doc,
          student: {
            first_name: profile?.first_name || 'Unknown',
            last_name: profile?.last_name || 'Student',
            email: profile?.email || '',
          },
        };
      });

      return { data: submissions };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch submissions' };
    }
  },

  /**
   * Update the review status of a submission (Teacher only)
   */
  async updateSubmissionStatus(
    documentId: string,
    status: 'approved' | 'revised' | 'for_consultation' | 'pending_review' | 'consultation_requested'
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('uploaded_documents')
        .update({ review_status: status })
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error: any) {
      return { error: error.message || 'Failed to update submission status' };
    }
  },

  /**
   * Get private comment thread for a bin × student pair
   */
  async getBinComments(binId: string, studentId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('bin_comments')
        .select('*')
        .eq('attachment_bin_id', binId)
        .eq('student_id', studentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { data: data || [] };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch comments' };
    }
  },

  /**
   * Add a comment to a bin × student thread
   */
  async addBinComment(
    binId: string,
    studentId: string,
    senderId: string,
    senderRole: 'teacher' | 'student',
    message: string
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('bin_comments')
        .insert({
          attachment_bin_id: binId,
          student_id: studentId,
          sender_id: senderId,
          sender_role: senderRole,
          message: message.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error: any) {
      return { error: error.message || 'Failed to add comment' };
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

  /** Delete an announcement */
  async deleteAnnouncement(announcementId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', announcementId);
      if (error) throw error;
      return { data: undefined };
    } catch (error: any) {
      return { error: error.message || 'Failed to delete announcement' };
    }
  },

  /** Update an announcement */
  async updateAnnouncement(
    announcementId: string,
    updates: { title?: string; content?: string; is_pinned?: boolean; assigned_to?: string[] | null }
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .update(updates)
        .eq('id', announcementId)
        .select()
        .single();
      if (error) throw error;
      return { data };
    } catch (error: any) {
      return { error: error.message || 'Failed to update announcement' };
    }
  },

  /** Delete an attachment bin (and its documents via cascade) */
  async deleteAttachmentBin(binId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.from('attachment_bins').delete().eq('id', binId);
      if (error) throw error;
      return { data: undefined };
    } catch (error: any) {
      return { error: error.message || 'Failed to delete bin' };
    }
  },

  /** Update an attachment bin's details */
  async updateAttachmentBin(
    binId: string,
    updates: { title?: string; description?: string | null; deadline?: string | null; assigned_to?: string[] | null }
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('attachment_bins')
        .update(updates)
        .eq('id', binId)
        .select()
        .single();
      if (error) throw error;
      return { data };
    } catch (error: any) {
      return { error: error.message || 'Failed to update attachment bin' };
    }
  },

  /**
   * Remove (unenroll) a student from a classroom — Teacher action.
   * Reuses the same membership delete as leaveClassroom.
   */
  async removeStudentFromClassroom(
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
      return { error: error.message || 'Failed to remove student' };
    }
  },

  /**
   * Get all submissions by a specific student across all bins in a classroom.
   */
  async getStudentSubmissionsForClassroom(
    classroomId: string,
    studentId: string
  ): Promise<ApiResponse<any[]>> {
    try {
      // 1. Get all bin IDs for this classroom
      const { data: bins, error: binsError } = await supabase
        .from('attachment_bins')
        .select('id, title, deadline')
        .eq('classroom_id', classroomId);

      if (binsError) throw binsError;
      if (!bins || bins.length === 0) return { data: [] };

      const binIds = bins.map((b: any) => b.id);
      const binMap = new Map(bins.map((b: any) => [b.id, b]));

      // 2. Get all docs uploaded by this student in those bins
      const { data: docs, error: docsError } = await supabase
        .from('uploaded_documents')
        .select('*')
        .in('attachment_bin_id', binIds)
        .eq('uploaded_by', studentId)
        .eq('is_deleted', false)
        .order('uploaded_at', { ascending: false });

      if (docsError) throw docsError;

      const submissions = (docs || []).map((doc: any) => ({
        ...doc,
        bin: binMap.get(doc.attachment_bin_id) || null,
      }));

      return { data: submissions };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch student submissions' };
    }
  },
};
