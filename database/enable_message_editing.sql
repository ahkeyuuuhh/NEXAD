-- Enable message editing: Add UPDATE RLS policy + columns for conversation_messages
-- Run this in Supabase SQL Editor to allow users to edit their own messages.

-- 1. Add columns to track edits (safe to run multiple times)
ALTER TABLE public.conversation_messages
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- 2. Allow updating only your own messages (drop first if already exists)
DROP POLICY IF EXISTS convmsg_update ON public.conversation_messages;

CREATE POLICY convmsg_update ON public.conversation_messages
  FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());
