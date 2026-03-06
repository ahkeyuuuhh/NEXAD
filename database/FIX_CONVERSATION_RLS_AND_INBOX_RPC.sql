-- ============================================================
-- NEXAD: Fix conversation_participants RLS + add inbox RPC
-- Run this ENTIRE file in Supabase SQL Editor
-- ============================================================

-- ─── Step 1: Helper function (SECURITY DEFINER = no RLS, no recursion) ────────
-- Returns the conversation IDs the calling user belongs to.
-- Used by the fixed RLS policy below.
CREATE OR REPLACE FUNCTION public.my_conversation_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conversation_id
    FROM public.conversation_participants
   WHERE user_id = auth.uid();
$$;

-- ─── Step 2: Fix convpart_select policy (no more infinite recursion) ──────────
-- Allows a user to see ALL participant rows in conversations they belong to.
-- (Teacher can see student row, student can see teacher row — needed for names.)
DROP POLICY IF EXISTS "convpart_select" ON public.conversation_participants;
CREATE POLICY "convpart_select" ON public.conversation_participants
  FOR SELECT USING (
    conversation_id IN (SELECT public.my_conversation_ids())
  );

-- Also fix convpart_update — only ever needs to update OWN row (markAsRead)
DROP POLICY IF EXISTS "convpart_update" ON public.conversation_participants;
CREATE POLICY "convpart_update" ON public.conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

-- ─── Step 3: Inbox RPC — single query, always works (SECURITY DEFINER) ────────
-- Returns all conversations for p_user_id with the other participant's profile.
CREATE OR REPLACE FUNCTION public.get_inbox_conversations(p_user_id UUID)
RETURNS TABLE (
  id                      UUID,
  type                    TEXT,
  title                   TEXT,
  consultation_request_id UUID,
  announcement_id         UUID,
  last_message_at         TIMESTAMPTZ,
  last_message_preview    TEXT,
  created_at              TIMESTAMPTZ,
  my_unread_count         INT,
  other_user_id           UUID,
  other_first_name        TEXT,
  other_last_name         TEXT,
  other_role              TEXT,
  other_photo_url         TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.type,
    c.title,
    c.consultation_request_id,
    c.announcement_id,
    c.last_message_at,
    c.last_message_preview,
    c.created_at,
    my_cp.unread_count   AS my_unread_count,
    other_cp.user_id     AS other_user_id,
    p.first_name         AS other_first_name,
    p.last_name          AS other_last_name,
    p.role               AS other_role,
    p.profile_photo_url  AS other_photo_url
  FROM public.conversation_participants my_cp
  JOIN public.conversations c
       ON c.id = my_cp.conversation_id
  LEFT JOIN public.conversation_participants other_cp
       ON other_cp.conversation_id = my_cp.conversation_id
      AND other_cp.user_id != p_user_id
  LEFT JOIN public.profiles p
       ON p.user_id = other_cp.user_id
  WHERE my_cp.user_id = p_user_id
  ORDER BY c.last_message_at DESC NULLS LAST;
$$;
