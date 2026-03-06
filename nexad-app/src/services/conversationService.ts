import { supabase } from '../config/supabase';
import type { ApiResponse, Conversation, ConversationMessage } from '../types';
import { notificationService } from './notificationService';

/**
 * Look up profiles for a list of user IDs.
 * Checks student_profiles first, then teacher_profiles.
 * Returns a map of user_id → { first_name, last_name, profile_photo_url, role }
 */
async function fetchProfileMap(userIds: string[]): Promise<Record<string, any>> {
  if (userIds.length === 0) return {};
  const map: Record<string, any> = {};

  const [stuRes, tchRes] = await Promise.all([
    supabase
      .from('student_profiles')
      .select('user_id, first_name, last_name, profile_photo_url')
      .in('user_id', userIds),
    supabase
      .from('teacher_profiles')
      .select('user_id, first_name, last_name, profile_photo_url')
      .in('user_id', userIds),
  ]);

  (stuRes.data || []).forEach((p: any) => { map[p.user_id] = { ...p, role: 'student' }; });
  (tchRes.data || []).forEach((p: any) => { map[p.user_id] = { ...p, role: 'teacher' }; });

  return map;
}

export const conversationService = {
  /**
   * Get all conversations for the current user (inbox), sorted by latest message.
   */
  async getConversations(userId: string): Promise<ApiResponse<Conversation[]>> {
    try {
      // Step 1: Get my participant rows
      const { data: myParts, error: e1 } = await supabase
        .from('conversation_participants')
        .select('conversation_id, unread_count')
        .eq('user_id', userId);
      if (e1) throw e1;
      if (!myParts || myParts.length === 0) return { data: [] };

      const convIds = myParts.map((p: any) => p.conversation_id);
      const unreadMap: Record<string, number> = {};
      myParts.forEach((p: any) => { unreadMap[p.conversation_id] = p.unread_count || 0; });

      // Step 2: Get conversations
      const { data: convs, error: e2 } = await supabase
        .from('conversations')
        .select('id, type, title, consultation_request_id, announcement_id, last_message_at, last_message_preview, created_at')
        .in('id', convIds)
        .order('last_message_at', { ascending: false });
      if (e2) throw e2;

      // Step 3: Get other participants (RLS now allows this via my_conversation_ids helper)
      const { data: otherParts } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', convIds)
        .neq('user_id', userId);

      // Step 4: Fetch profiles from student + teacher tables
      const otherIds = [...new Set((otherParts || []).map((p: any) => p.user_id))];
      const profileMap = await fetchProfileMap(otherIds);

      const otherUserMap: Record<string, any> = {};
      (otherParts || []).forEach((p: any) => {
        if (!otherUserMap[p.conversation_id]) {
          otherUserMap[p.conversation_id] = profileMap[p.user_id];
        }
      });

      const conversations: Conversation[] = (convs || []).map((conv: any) => ({
        id: conv.id,
        type: conv.type,
        title: conv.title,
        consultation_request_id: conv.consultation_request_id,
        announcement_id: conv.announcement_id,
        last_message_at: conv.last_message_at,
        last_message_preview: conv.last_message_preview,
        created_at: conv.created_at,
        my_unread_count: unreadMap[conv.id] || 0,
        other_user: otherUserMap[conv.id] || undefined,
      }));

      return { data: conversations };
    } catch (error: any) {
      console.error('[Conv] getConversations:', error.message);
      return { error: error.message || 'Failed to load conversations' };
    }
  },

  /**
   * Get messages in a conversation (oldest first, paginated).
   */
  async getMessages(
    conversationId: string,
    page: number = 1,
    perPage: number = 60
  ): Promise<ApiResponse<ConversationMessage[]>> {
    try {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .range(from, to);

      if (error) throw error;
      if (!data || data.length === 0) return { data: [] };

      // Fetch sender profiles from student_profiles / teacher_profiles
      const senderIds = [...new Set(data.map((m: any) => m.sender_id).filter(Boolean))];
      const senderMap = await fetchProfileMap(senderIds);

      const messages = data.map((m: any) => ({ ...m, sender: senderMap[m.sender_id] || null }));
      return { data: messages as ConversationMessage[] };
    } catch (error: any) {
      console.error('[Conv] getMessages:', error.message);
      return { error: error.message || 'Failed to load messages' };
    }
  },

  /**
   * Send a text (or file) message in a conversation.
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    fileData?: { url: string; name: string; type: string; size: number }
  ): Promise<ApiResponse<ConversationMessage>> {
    try {
      const payload: any = { conversation_id: conversationId, sender_id: senderId, content };
      if (fileData) {
        payload.file_url       = fileData.url;
        payload.file_name      = fileData.name;
        payload.file_type      = fileData.type;
        payload.file_size_bytes = fileData.size;
      }

      const { data, error } = await supabase
        .from('conversation_messages')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;

      // Fetch sender profile from student/teacher tables
      const senderProfileMap = await fetchProfileMap([senderId]);
      const senderProfile = senderProfileMap[senderId] || null;

      // Notify other participants (fire-and-forget)
      this.notifyOthers(conversationId, senderId, content).catch(() => {});

      return { data: { ...data, sender: senderProfile || null } as ConversationMessage };
    } catch (error: any) {
      console.error('[Conv] sendMessage:', error.message);
      return { error: error.message || 'Failed to send message' };
    }
  },

  /**
   * Mark a conversation as read for a specific user (reset unread_count).
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await supabase
      .from('conversation_participants')
      .update({ unread_count: 0, last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  },

  /**
   * Get total unread message count across all conversations for a user.
   */
  async getTotalUnread(userId: string): Promise<number> {
    try {
      const { data } = await supabase
        .from('conversation_participants')
        .select('unread_count')
        .eq('user_id', userId);
      return (data || []).reduce((sum: number, r: any) => sum + (r.unread_count || 0), 0);
    } catch {
      return 0;
    }
  },

  /**
   * Get or create an INQUIRY conversation between two users.
   * Returns the conversation ID.
   */
  async getOrCreateInquiry(userA: string, userB: string): Promise<ApiResponse<string>> {
    try {
      const { data, error } = await supabase.rpc('get_or_create_inquiry_conversation', {
        p_user_a: userA,
        p_user_b: userB,
      });
      if (error) throw error;
      return { data: data as string };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  /**
   * Get or create an ANNOUNCEMENT_THREAD for a student replying to an announcement.
   * Returns the conversation ID.
   */
  async getOrCreateAnnouncementThread(
    studentId: string,
    teacherId: string,
    announcementId: string
  ): Promise<ApiResponse<string>> {
    try {
      const { data, error } = await supabase.rpc('get_or_create_announcement_thread', {
        p_student_id:      studentId,
        p_teacher_id:      teacherId,
        p_announcement_id: announcementId,
      });
      if (error) throw error;
      return { data: data as string };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  /**
   * Find the conversation linked to a specific consultation request.
   */
  async getByConsultationId(consultationId: string): Promise<ApiResponse<string>> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('consultation_request_id', consultationId)
        .single();
      if (error) throw error;
      return { data: data.id };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  /**
   * Send in-app notifications to all participants in a conversation except the sender.
   */
  async notifyOthers(conversationId: string, senderId: string, content: string): Promise<void> {
    try {
      // Get other participants in this conversation
      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', senderId);
      const otherUserIds = (parts || []).map((p: any) => p.user_id);

      if (otherUserIds.length === 0) return;

      const senderProfileMap = await fetchProfileMap([senderId]);
      const senderProfile = senderProfileMap[senderId];
      const senderName = senderProfile
        ? `${senderProfile.first_name} ${senderProfile.last_name}`
        : 'Someone';

      const preview = content.length > 60 ? content.substring(0, 60) + '...' : content;
      const notifTitle = `New message from ${senderName}`;

      for (const uid of otherUserIds) {
        notificationService
          .createNotification(uid, notifTitle, preview, 'new_message')
          .catch(() => {});
        notificationService
          .sendPushToUser(uid, notifTitle, preview, { type: 'new_message', conversationId })
          .catch(() => {});
      }
    } catch (error) {
      console.error('[Conv] notifyOthers:', error);
    }
  },
};
