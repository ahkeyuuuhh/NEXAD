-- ============================================================
-- Enable Message Deletion Policies
-- Run this in Supabase SQL Editor
-- ============================================================

-- Allow users to delete their own messages
DROP POLICY IF EXISTS "convmsg_delete" ON public.conversation_messages;
CREATE POLICY "convmsg_delete" ON public.conversation_messages
  FOR DELETE USING (
    sender_id = auth.uid()
  );

-- Allow users to delete conversations they are part of
DROP POLICY IF EXISTS "conv_delete" ON public.conversations;
CREATE POLICY "conv_delete" ON public.conversations
  FOR DELETE USING (
    id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
  );

-- Allow users to delete their participant records
DROP POLICY IF EXISTS "convpart_delete" ON public.conversation_participants;
CREATE POLICY "convpart_delete" ON public.conversation_participants
  FOR DELETE USING (
    user_id = auth.uid()
  );
