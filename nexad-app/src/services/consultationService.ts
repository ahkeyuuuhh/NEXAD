/**
 * Virtual Consultation Service
 * Handles consultation creation, joining, and management
 */

import { supabase } from '../config/supabase';
import { dailyService } from './dailyService';
import { ApiResponse } from '../types';

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

class ConsultationService {
  /**
   * Create a new virtual consultation room
   */
  async createConsultation(
    hostId: string,
    hostName: string
  ): Promise<ApiResponse<VirtualConsultation>> {
    try {
      console.log('Creating consultation for:', hostName);

      // Step 1: Create Daily.co room
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

      // Step 2: Generate invite code using database function
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_invite_code');

      if (codeError) {
        console.error('Error generating invite code:', codeError);
        throw new Error('Failed to generate invite code');
      }

      const inviteCode = codeData as string;

      // Step 3: Create consultation record in database
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
        // Clean up Daily.co room
        await dailyService.deleteRoom(room.name);
        throw new Error('Failed to create consultation record');
      }

      console.log('Consultation created successfully:', consultation.id);
      return { data: consultation };
    } catch (error: any) {
      console.error('Error in createConsultation:', error);
      return { error: error.message || 'Failed to create consultation' };
    }
  }

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

      // Call database function to join consultation
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

      console.log('Successfully joined consultation');
      return {
        data: {
          roomUrl: data.room_url,
          hostName: data.host_name,
          consultationId: data.consultation_id,
        },
      };
    } catch (error: any) {
      console.error('Error in joinConsultation:', error);
      return { error: error.message || 'Failed to join consultation' };
    }
  }

  /**
   * End a consultation
   */
  async endConsultation(consultationId: string): Promise<ApiResponse<boolean>> {
    try {
      console.log('Ending consultation:', consultationId);

      // Get consultation details
      const { data: consultation, error: fetchError } = await supabase
        .from('virtual_consultations')
        .select('*')
        .eq('id', consultationId)
        .single();

      if (fetchError || !consultation) {
        throw new Error('Consultation not found');
      }

      // Calculate duration
      const startedAt = consultation.started_at ? new Date(consultation.started_at) : new Date(consultation.created_at);
      const endedAt = new Date();
      const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);

      // Update consultation status
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

      // Delete Daily.co room
      await dailyService.deleteRoom(consultation.room_id);

      console.log('Consultation ended successfully');
      return { data: true };
    } catch (error: any) {
      console.error('Error ending consultation:', error);
      return { error: error.message || 'Failed to end consultation' };
    }
  }

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
  }

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
  }

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

      // Update status
      const { error: updateError } = await supabase
        .from('virtual_consultations')
        .update({ status: 'cancelled' })
        .eq('id', consultationId);

      if (updateError) {
        throw new Error('Failed to cancel consultation');
      }

      // Delete Daily.co room
      await dailyService.deleteRoom(consultation.room_id);

      return { data: true };
    } catch (error: any) {
      console.error('Error cancelling consultation:', error);
      return { error: error.message || 'Failed to cancel consultation' };
    }
  }
}

export const consultationService = new ConsultationService();
