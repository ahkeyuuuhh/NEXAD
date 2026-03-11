-- ============================================================
-- Add is_archived column to conversation_participants
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Index for fast archive queries
CREATE INDEX IF NOT EXISTS idx_conv_participants_archived
  ON public.conversation_participants(user_id, is_archived);
