import { supabase } from '../config/supabase';
import type { Message, ApiResponse, PaginatedResponse, MessageType } from '../types';

export interface MessageWithSender extends Omit<Message, 'sender' | 'recipient'> {
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
  recipient?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
}

export const messageService = {
  /**
   * Send a new message
   */
  async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    messageType: MessageType = 'consultation_chat',
    consultationRequestId?: string,
    announcementId?: string
  ): Promise<ApiResponse<Message>> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: senderId,
          recipient_id: recipientId,
          content,
          message_type: messageType,
          consultation_request_id: consultationRequestId,
          announcement_id: announcementId,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error: any) {
      console.error('Error sending message:', error);
      return { error: error.message || 'Failed to send message' };
    }
  },

  /**
   * Get messages for a user (inbox)
   */
  async getInboxMessages(
    userId: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<ApiResponse<PaginatedResponse<MessageWithSender>>> {
    try {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      const { data, error, count } = await supabase
        .from('messages')
        .select(`
          *,
          sender:student_profiles!sender_id(id, first_name, last_name, profile_photo_url),
          recipient:student_profiles!recipient_id(id, first_name, last_name, profile_photo_url)
        `, { count: 'exact' })
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        // Fallback to simple query without joins if profiles don't match
        const { data: simpleData, error: simpleError, count: simpleCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact' })
          .eq('recipient_id', userId)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (simpleError) throw simpleError;

        return {
          data: {
            data: simpleData || [],
            total: simpleCount || 0,
            page,
            per_page: perPage,
            total_pages: Math.ceil((simpleCount || 0) / perPage),
          },
        };
      }

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
      console.error('Error fetching inbox messages:', error);
      return { error: error.message || 'Failed to fetch messages' };
    }
  },

  /**
   * Get unread messages for a user (limit 5 for dashboard)
   */
  async getUnreadMessages(
    userId: string,
    limit: number = 5
  ): Promise<ApiResponse<MessageWithSender[]>> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('recipient_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data: data || [] };
    } catch (error: any) {
      console.error('Error fetching unread messages:', error);
      return { error: error.message || 'Failed to fetch unread messages' };
    }
  },

  /**
   * Get unread message count
   */
  async getUnreadCount(userId: string): Promise<ApiResponse<number>> {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return { data: count || 0 };
    } catch (error: any) {
      console.error('Error fetching unread count:', error);
      return { error: error.message || 'Failed to fetch unread count' };
    }
  },

  /**
   * Get messages for a specific consultation
   */
  async getConsultationMessages(
    consultationRequestId: string,
    page: number = 1,
    perPage: number = 50
  ): Promise<ApiResponse<PaginatedResponse<Message>>> {
    try {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      const { data, error, count } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('consultation_request_id', consultationRequestId)
        .order('created_at', { ascending: true })
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
      console.error('Error fetching consultation messages:', error);
      return { error: error.message || 'Failed to fetch messages' };
    }
  },

  /**
   * Mark a message as read
   */
  async markAsRead(messageId: string): Promise<ApiResponse<Message>> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error: any) {
      console.error('Error marking message as read:', error);
      return { error: error.message || 'Failed to mark message as read' };
    }
  },

  /**
   * Mark all messages as read for a user
   */
  async markAllAsRead(userId: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return { data: null };
    } catch (error: any) {
      console.error('Error marking all messages as read:', error);
      return { error: error.message || 'Failed to mark messages as read' };
    }
  },

  /**
   * Get sent messages
   */
  async getSentMessages(
    userId: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<ApiResponse<PaginatedResponse<Message>>> {
    try {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      const { data, error, count } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('sender_id', userId)
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
      console.error('Error fetching sent messages:', error);
      return { error: error.message || 'Failed to fetch sent messages' };
    }
  },

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, userId: string): Promise<ApiResponse<null>> {
    try {
      // Only allow deleting own sent messages
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', userId);

      if (error) throw error;
      return { data: null };
    } catch (error: any) {
      console.error('Error deleting message:', error);
      return { error: error.message || 'Failed to delete message' };
    }
  },

  /**
   * Subscribe to new messages (realtime)
   */
  subscribeToMessages(
    userId: string,
    onNewMessage: (message: Message) => void
  ) {
    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          onNewMessage(payload.new as Message);
        }
      )
      .subscribe();

    return subscription;
  },
};
