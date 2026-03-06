-- ============================================================
-- NEXAD Unified Messaging System — Database Schema
-- Run this entire file in Supabase SQL Editor (once)
-- ============================================================

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                    TEXT NOT NULL CHECK (type IN ('CONSULTATION', 'ANNOUNCEMENT_THREAD', 'INQUIRY')),
  title                   TEXT,
  consultation_request_id UUID REFERENCES public.consultation_requests(id) ON DELETE SET NULL,
  announcement_id         UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
  last_message_at         TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview    TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  created_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unread_count    INT DEFAULT 0,
  last_read_at    TIMESTAMPTZ,
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content         TEXT NOT NULL,
  file_url        TEXT,
  file_name       TEXT,
  file_type       TEXT,
  file_size_bytes BIGINT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conv_participants_user      ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv      ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_messages_conv          ON public.conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_messages_created       ON public.conversation_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_consult       ON public.conversations(consultation_request_id);
CREATE INDEX IF NOT EXISTS idx_conversations_announcement  ON public.conversations(announcement_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.conversations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages     ENABLE ROW LEVEL SECURITY;

-- conversations: viewable/updateable if participant
DROP POLICY IF EXISTS "conv_select" ON public.conversations;
CREATE POLICY "conv_select" ON public.conversations
  FOR SELECT USING (
    id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "conv_insert" ON public.conversations;
CREATE POLICY "conv_insert" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "conv_update" ON public.conversations;
CREATE POLICY "conv_update" ON public.conversations
  FOR UPDATE USING (
    id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
  );

-- conversation_participants: view if in same conversation, insert if authenticated
DROP POLICY IF EXISTS "convpart_select" ON public.conversation_participants;
CREATE POLICY "convpart_select" ON public.conversation_participants
  FOR SELECT USING (
    user_id = auth.uid() OR
    conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "convpart_insert" ON public.conversation_participants;
CREATE POLICY "convpart_insert" ON public.conversation_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "convpart_update" ON public.conversation_participants;
CREATE POLICY "convpart_update" ON public.conversation_participants
  FOR UPDATE USING (
    user_id = auth.uid() OR
    conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
  );

-- conversation_messages: view/insert if participant
DROP POLICY IF EXISTS "convmsg_select" ON public.conversation_messages;
CREATE POLICY "convmsg_select" ON public.conversation_messages
  FOR SELECT USING (
    conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "convmsg_insert" ON public.conversation_messages;
CREATE POLICY "convmsg_insert" ON public.conversation_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
  );

-- ─── Realtime ─────────────────────────────────────────────────────────────────

ALTER TABLE public.conversation_messages     REPLICA IDENTITY FULL;
ALTER TABLE public.conversations             REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ─── Trigger: open/reuse INQUIRY thread when consultation is accepted ─────────
-- One conversation per teacher-student pair (not per consultation).

CREATE OR REPLACE FUNCTION public.create_consultation_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id UUID;
BEGIN
  -- Only act when status just changed TO 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    -- Get or create one shared INQUIRY conversation for this teacher-student pair
    SELECT public.get_or_create_inquiry_conversation(NEW.teacher_id, NEW.student_id)
      INTO v_conv_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_create_consultation_conversation ON public.consultation_requests;
CREATE TRIGGER trig_create_consultation_conversation
  AFTER UPDATE ON public.consultation_requests
  FOR EACH ROW EXECUTE FUNCTION public.create_consultation_conversation();

-- ─── Trigger: update last_message_at + unread counts on new message ───────────

CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update conversation metadata
  UPDATE public.conversations
     SET last_message_at      = NEW.created_at,
         last_message_preview = LEFT(NEW.content, 100)
   WHERE id = NEW.conversation_id;

  -- Increment unread for all participants except the sender
  UPDATE public.conversation_participants
     SET unread_count = unread_count + 1
   WHERE conversation_id = NEW.conversation_id
     AND user_id IS DISTINCT FROM NEW.sender_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_update_conversation_on_message ON public.conversation_messages;
CREATE TRIGGER trig_update_conversation_on_message
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();

-- ─── RPC: get or create INQUIRY conversation between two users ────────────────

CREATE OR REPLACE FUNCTION public.get_or_create_inquiry_conversation(
  p_user_a UUID,
  p_user_b UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id UUID;
BEGIN
  SELECT cp1.conversation_id INTO v_conv_id
    FROM public.conversation_participants cp1
    JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    JOIN public.conversations c ON c.id = cp1.conversation_id
   WHERE cp1.user_id = p_user_a
     AND cp2.user_id = p_user_b
     AND c.type = 'INQUIRY'
   LIMIT 1;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (type, created_by)
    VALUES ('INQUIRY', p_user_a)
    RETURNING id INTO v_conv_id;

    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_conv_id, p_user_a), (v_conv_id, p_user_b)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_conv_id;
END;
$$;

-- ─── RPC: get or create ANNOUNCEMENT_THREAD ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_or_create_announcement_thread(
  p_student_id     UUID,
  p_teacher_id     UUID,
  p_announcement_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id UUID;
BEGIN
  SELECT id INTO v_conv_id
    FROM public.conversations
   WHERE announcement_id = p_announcement_id
     AND id IN (
       SELECT conversation_id FROM public.conversation_participants WHERE user_id = p_student_id
     )
   LIMIT 1;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (type, announcement_id, created_by)
    VALUES ('ANNOUNCEMENT_THREAD', p_announcement_id, p_student_id)
    RETURNING id INTO v_conv_id;

    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_conv_id, p_student_id), (v_conv_id, p_teacher_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_conv_id;
END;
$$;

-- ─── Storage bucket for conversation file attachments ─────────────────────────
-- Run this separately in the Supabase dashboard Storage section,
-- or uncomment if your project supports storage RPC:

-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'conversation-files',
--   'conversation-files',
--   false,
--   5242880,  -- 5 MB
--   ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
-- ) ON CONFLICT (id) DO NOTHING;

-- Storage policies (run after creating the bucket):
-- CREATE POLICY "Auth users can upload conv files"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'conversation-files' AND auth.uid() IS NOT NULL);
-- CREATE POLICY "Participants can read conv files"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'conversation-files' AND auth.uid() IS NOT NULL);
