import { supabase } from '../config/supabase';
import { dailyService } from './dailyService';
import type {
  ConsultationRequest,
  ApiResponse,
  PaginatedResponse,
  ConsultationStatus,
  TimeSlot,
} from '../types';

// Virtual Consultation interface
export interface VirtualConsultation {
  id: string;
  room_id: string;
  room_url: string;
  invite_code: string;
  host_id: string;
  host_name: string;
  student_id?: string;
  student_name?: string;
  status: 'active' | 'in_progress' | 'completed' | 'expired' | 'cancelled';
  created_at: string;
  started_at?: string;
  ended_at?: string;
  expires_at: string;
  duration_minutes: number;
  consultation_type: string;
  notes?: string;
}

export const consultationService = {
  // ============================================
  // ORIGINAL CONSULTATION REQUEST FUNCTIONS
  // ============================================

  /**
   * Create a new consultation request
   */
  async createRequest(request: Partial<ConsultationRequest>): Promise<ApiResponse<ConsultationRequest>> {
    try {
      const { data, error } = await supabase
        .from('consultation_requests')
        .insert(request)
        .select('*')
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return { error: error.message || 'Failed to create consultation request' };
    }
  },

  /**
   * Get consultation requests for a student
   */
  async getStudentRequests(
    studentId: string,
    page: number = 1,
    perPage: number = 10
  ): Promise<ApiResponse<PaginatedResponse<ConsultationRequest>>> {
    try {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      const { data, error, count } = await supabase
        .from('consultation_requests')
        .select('*', { count: 'exact' })
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        data: {
          data: data || [],
          total: count || 0,
          page,
          per_page: perPage,
          total_pages: Math.ceil((count || 0) / perPage),
        },
      };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch student requests' };
    }
  },

  /**
   * Get consultation requests for a teacher
   */
  async getTeacherRequests(
    teacherId: string,
    status?: ConsultationStatus,
    page: number = 1,
    perPage: number = 10
  ): Promise<ApiResponse<PaginatedResponse<ConsultationRequest>>> {
    try {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      let query = supabase
        .from('consultation_requests')
        .select('*', { count: 'exact' })
        .eq('teacher_id', teacherId);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        data: {
          data: data || [],
          total: count || 0,
          page,
          per_page: perPage,
          total_pages: Math.ceil((count || 0) / perPage),
        },
      };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch teacher requests' };
    }
  },

  /**
   * Update consultation request status
   */
  async updateStatus(
    requestId: string,
    status: ConsultationStatus,
    additionalData?: Partial<ConsultationRequest>
  ): Promise<ApiResponse<ConsultationRequest>> {
    try {
      const updateData: any = { status, ...additionalData };

      // Set appropriate timestamp based on status
      if (status === 'accepted') {
        updateData.teacher_reviewed_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('consultation_requests')
        .update(updateData)
        .eq('id', requestId)
        .select('*')
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return { error: error.message || 'Failed to update request status' };
    }
  },

  /**
   * Get single consultation request
   */
  async getRequest(requestId: string): Promise<ApiResponse<ConsultationRequest>> {
    try {
      const { data, error } = await supabase
        .from('consultation_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch consultation request' };
    }
  },

  /**
   * Schedule consultation
   */
  async scheduleConsultation(
    requestId: string,
    startTime: string,
    endTime: string,
    classroomNumber?: string
  ): Promise<ApiResponse<ConsultationRequest>> {
    try {
      const updateData: any = {
        scheduled_start_time: startTime,
        scheduled_end_time: endTime,
        status: 'accepted',
        teacher_reviewed_at: new Date().toISOString(),
      };

      if (classroomNumber) {
        updateData.classroom_number = classroomNumber;
      }

      const { data, error } = await supabase
        .from('consultation_requests')
        .update(updateData)
        .eq('id', requestId)
        .select('*')
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return { error: error.message || 'Failed to schedule consultation' };
    }
  },

  /**
   * Get approved consultations for a teacher
   */
  async getApprovedConsultations(teacherId: string): Promise<ConsultationRequest[]> {
    try {
      const { data, error } = await supabase
        .from('consultation_requests')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('status', 'accepted')
        .order('scheduled_start_time', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('Error fetching approved consultations:', error);
      return [];
    }
  },

  /**
   * Get all consultations for a teacher (including completed, cancelled, etc.)
   */
  async getAllTeacherConsultations(teacherId: string): Promise<ConsultationRequest[]> {
    try {
      const { data, error } = await supabase
        .from('consultation_requests')
        .select('*')
        .eq('teacher_id', teacherId)
        .in('status', ['accepted', 'completed', 'cancelled'])
        .order('scheduled_start_time', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('Error fetching teacher consultations:', error);
      return [];
    }
  },

  /**
   * Get the most recent consultation request from a student to a specific teacher
   */
  async getStudentConsultationForTeacher(
    studentId: string,
    teacherId: string
  ): Promise<ApiResponse<ConsultationRequest | null>> {
    try {
      const { data, error } = await supabase
        .from('consultation_requests')
        .select('*')
        .eq('student_id', studentId)
        .eq('teacher_id', teacherId)
        .in('status', ['pending', 'ai_processing', 'awaiting_teacher', 'accepted'])
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return { data: data ?? null };
    } catch (error: any) {
      return { error: error.message || 'Failed to fetch consultation request' };
    }
  },

  /**
   * Check and mark missed consultations
   */
  async checkAndMarkMissedConsultations(teacherId: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('consultation_requests')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('status', 'accepted')
        .lt('scheduled_end_time', now);

      if (error) throw error;

      if (data && data.length > 0) {
        const updates = data.map(consultation =>
          this.updateStatus(consultation.id, 'cancelled', {})
        );
        await Promise.all(updates);
      }
    } catch (error: any) {
      console.error('Error checking for missed consultations:', error);
    }
  },

  // ============================================
  // VIRTUAL CONSULTATION FUNCTIONS (NEW)
  // ============================================

  /**
   * Create a new virtual consultation room
   */
  async createConsultation(
    hostId: string,
    hostName: string
  ): Promise<ApiResponse<VirtualConsultation>> {
    try {
      console.log('Creating consultation for:', hostName);

      const roomResult = await dailyService.createRoom({
        expiresInHours: 24,
        maxParticipants: 2,
        enableChat: true,
        enableScreenshare: false,
      });

      if (roomResult.error || !roomResult.data) {
        throw new Error(roomResult.error || 'Failed to create video room');
      }

      const room = roomResult.data;

      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_invite_code');

      if (codeError) {
        console.error('Error generating invite code:', codeError);
        throw new Error('Failed to generate invite code');
      }

      const inviteCode = codeData as string;

      const { data: consultation, error: dbError } = await supabase
        .from('virtual_consultations')
        .insert({
          room_id: room.name,
          room_url: room.url,
          invite_code: inviteCode,
          host_id: hostId,
          host_name: hostName,
          status: 'active',
        })
        .select()
        .single();

      if (dbError) {
        console.error('Error creating consultation record:', dbError);
        await dailyService.deleteRoom(room.name);
        throw new Error('Failed to create consultation record');
      }

      console.log('Consultation created successfully:', consultation.id);
      return { data: consultation };
    } catch (error: any) {
      console.error('Error in createConsultation:', error);
      return { error: error.message || 'Failed to create consultation' };
    }
  },

  /**
   * Join a consultation using invite code
   */
  async joinConsultation(
    inviteCode: string,
    studentId: string,
    studentName: string
  ): Promise<ApiResponse<{ roomUrl: string; hostName: string; consultationId: string }>> {
    try {
      console.log('Joining consultation with code:', inviteCode);

      const { data, error } = await supabase
        .rpc('join_consultation_by_code', {
          p_invite_code: inviteCode.toUpperCase(),
          p_student_id: studentId,
          p_student_name: studentName,
        })
        .single();

      if (error) {
        console.error('Error joining consultation:', error);
        throw new Error(error.message || 'Invalid or expired invite code');
      }

      const result = data as any;
      console.log('Successfully joined consultation');
      return {
        data: {
          roomUrl: result.room_url,
          hostName: result.host_name,
          consultationId: result.consultation_id,
        },
      };
    } catch (error: any) {
      console.error('Error in joinConsultation:', error);
      return { error: error.message || 'Failed to join consultation' };
    }
  },

  /**
   * End a consultation
   */
  async endConsultation(consultationId: string): Promise<ApiResponse<boolean>> {
    try {
      console.log('Ending consultation:', consultationId);

      const { data: consultation, error: fetchError } = await supabase
        .from('virtual_consultations')
        .select('*')
        .eq('id', consultationId)
        .single();

      if (fetchError || !consultation) {
        throw new Error('Consultation not found');
      }

      const startedAt = consultation.started_at ? new Date(consultation.started_at) : new Date(consultation.created_at);
      const endedAt = new Date();
      const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);

      const { error: updateError } = await supabase
        .from('virtual_consultations')
        .update({
          status: 'completed',
          ended_at: endedAt.toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq('id', consultationId);

      if (updateError) {
        throw new Error('Failed to update consultation status');
      }

      await dailyService.deleteRoom(consultation.room_id);

      console.log('Consultation ended successfully');
      return { data: true };
    } catch (error: any) {
      console.error('Error ending consultation:', error);
      return { error: error.message || 'Failed to end consultation' };
    }
  },

  /**
   * Get active consultations for a user
   */
  async getActiveConsultations(userId: string): Promise<ApiResponse<VirtualConsultation[]>> {
    try {
      const { data, error } = await supabase
        .from('virtual_consultations')
        .select('*')
        .or(`host_id.eq.${userId},student_id.eq.${userId}`)
        .in('status', ['active', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return { data: data || [] };
    } catch (error: any) {
      console.error('Error getting active consultations:', error);
      return { error: error.message || 'Failed to get consultations' };
    }
  },

  /**
   * Get consultation history for a user
   */
  async getConsultationHistory(
    userId: string,
    limit: number = 20
  ): Promise<ApiResponse<VirtualConsultation[]>> {
    try {
      const { data, error } = await supabase
        .from('virtual_consultations')
        .select('*')
        .or(`host_id.eq.${userId},student_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(error.message);
      }

      return { data: data || [] };
    } catch (error: any) {
      console.error('Error getting consultation history:', error);
      return { error: error.message || 'Failed to get consultation history' };
    }
  },

  /**
   * Cancel a consultation
   */
  async cancelConsultation(consultationId: string): Promise<ApiResponse<boolean>> {
    try {
      const { data: consultation, error: fetchError } = await supabase
        .from('virtual_consultations')
        .select('room_id')
        .eq('id', consultationId)
        .single();

      if (fetchError || !consultation) {
        throw new Error('Consultation not found');
      }

      const { error: updateError } = await supabase
        .from('virtual_consultations')
        .update({ status: 'cancelled' })
        .eq('id', consultationId);

      if (updateError) {
        throw new Error('Failed to cancel consultation');
      }

      await dailyService.deleteRoom(consultation.room_id);

      return { data: true };
    } catch (error: any) {
      console.error('Error cancelling consultation:', error);
      return { error: error.message || 'Failed to cancel consultation' };
    }
  },
};
