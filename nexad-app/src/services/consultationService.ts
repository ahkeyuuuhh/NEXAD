import { supabase } from '../config/supabase';
import type {
  ConsultationRequest,
  ApiResponse,
  PaginatedResponse,
  ConsultationStatus,
  TimeSlot,
} from '../types';

export const consultationService = {
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
    endTime: string
  ): Promise<ApiResponse<ConsultationRequest>> {
    try {
      const { data, error } = await supabase
        .from('consultation_requests')
        .update({
          scheduled_start_time: startTime,
          scheduled_end_time: endTime,
          status: 'accepted',
          teacher_reviewed_at: new Date().toISOString(),
        })
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
   * Check and mark missed consultations
   * This should be called periodically to mark consultations as missed
   * if they weren't completed or cancelled after their end time
   */
  async checkAndMarkMissedConsultations(teacherId: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Find accepted consultations that have passed their end time
      const { data, error } = await supabase
        .from('consultation_requests')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('status', 'accepted')
        .lt('scheduled_end_time', now);

      if (error) throw error;

      // Mark each as cancelled with a note that it was missed
      if (data && data.length > 0) {
        const updates = data.map(consultation =>
          this.updateStatus(consultation.id, 'cancelled', {
            // You might want to add a note field to track that this was auto-cancelled
          })
        );
        await Promise.all(updates);
      }
    } catch (error: any) {
      console.error('Error checking for missed consultations:', error);
    }
  },
};

