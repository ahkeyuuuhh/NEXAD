-- =============================================
-- NEXAD: BULLETPROOF NOTIFICATION SYSTEM v3
-- Run this ENTIRE script in Supabase SQL Editor.
-- This replaces all previous notification SQL fixes.
-- =============================================

-- ─────────────────────────────────────────────
-- 1. CLEAN UP EXISTING POLICIES & TRIGGERS
-- ─────────────────────────────────────────────
DROP TRIGGER  IF EXISTS trg_notify_teacher_new_request    ON consultation_requests;
DROP TRIGGER  IF EXISTS trg_notify_student_status_change  ON consultation_requests;
DROP FUNCTION IF EXISTS notify_teacher_new_request();
DROP FUNCTION IF EXISTS notify_student_status_change();
DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, TEXT, TEXT, UUID);

-- ─────────────────────────────────────────────
-- 2. ADD MISSING ENUM VALUES (safe to re-run)
-- ─────────────────────────────────────────────
DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'consultation_completed';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'consultation_cancelled';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_announcement';
EXCEPTION WHEN others THEN NULL; END $$;

DROP POLICY IF EXISTS "Users view own notifications"                          ON notifications;
DROP POLICY IF EXISTS "Users mark own notifications as read"                  ON notifications;
DROP POLICY IF EXISTS "Users delete own notifications"                        ON notifications;
DROP POLICY IF EXISTS "Allow authenticated users to create notifications"     ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications"          ON notifications;
DROP POLICY IF EXISTS "Users can create notifications"                        ON notifications;

DROP POLICY IF EXISTS "Users manage own push tokens"              ON push_tokens;
DROP POLICY IF EXISTS "Allow read push tokens for notifications"  ON push_tokens;
DROP POLICY IF EXISTS "Service can read push tokens"             ON push_tokens;

-- ─────────────────────────────────────────────
-- 3. NOTIFICATIONS TABLE: RLS POLICIES
-- ─────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users mark own notifications as read" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Allow INSERT for any authenticated user.
-- The SECURITY DEFINER RPC (section 3) is the primary path; this is a fallback.
CREATE POLICY "Allow authenticated users to create notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────
-- 4. PUSH_TOKENS: RLS POLICIES
-- ─────────────────────────────────────────────
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push tokens" ON push_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Any authenticated user must be able to READ push tokens
-- so they can send push notifications to others.
CREATE POLICY "Allow read push tokens for notifications" ON push_tokens
  FOR SELECT USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────
-- 5. SECURITY DEFINER RPC: create_notification
--    Uses correct column: consultation_request_id
--    Type safely cast to notification_type enum.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id                 UUID,
  p_title                   TEXT,
  p_message                 TEXT,
  p_type                    TEXT    DEFAULT 'request_submitted',
  p_consultation_request_id UUID    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id   UUID;
  v_type notification_type;
BEGIN
  -- Cast text to enum safely; fall back to 'request_submitted'
  BEGIN
    v_type := p_type::notification_type;
  EXCEPTION WHEN invalid_text_representation THEN
    v_type := 'request_submitted';
  END;

  INSERT INTO notifications (
    user_id, title, message, type,
    consultation_request_id, is_read, created_at
  )
  VALUES (
    p_user_id, p_title, p_message, v_type,
    p_consultation_request_id, false, NOW()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO anon;

-- ─────────────────────────────────────────────
-- 6. TRIGGER: notify teacher on new request
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_teacher_new_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_name TEXT;
BEGIN
  SELECT first_name || ' ' || last_name
  INTO v_student_name
  FROM student_profiles
  WHERE user_id = NEW.student_id;

  IF v_student_name IS NULL THEN
    v_student_name := 'A student';
  END IF;

  INSERT INTO notifications (
    user_id, title, message, type,
    consultation_request_id, is_read, created_at
  )
  VALUES (
    NEW.teacher_id,
    'New Consultation Request 📝',
    v_student_name || ' has requested a consultation about "' || NEW.subject_line || '".',
    'request_submitted',
    NEW.id,
    false,
    NOW()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_teacher_new_request
  AFTER INSERT ON consultation_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_teacher_new_request();

-- ─────────────────────────────────────────────
-- 7. TRIGGER: notify student on status change
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_student_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_name TEXT;
  v_title        TEXT;
  v_message      TEXT;
  v_type         notification_type;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT first_name || ' ' || last_name
  INTO v_teacher_name
  FROM teacher_profiles
  WHERE user_id = NEW.teacher_id;

  IF v_teacher_name IS NULL THEN
    v_teacher_name := 'Your teacher';
  END IF;

  IF NEW.status = 'accepted' THEN
    v_title   := 'Consultation Approved! 🎉';
    v_message := v_teacher_name || ' approved your consultation about "' || NEW.subject_line || '".';
    IF NEW.scheduled_start_time IS NOT NULL THEN
      v_message := v_message || ' Scheduled: '
        || to_char(NEW.scheduled_start_time AT TIME ZONE 'UTC', 'Mon DD YYYY HH12:MI AM') || '.';
    END IF;
    IF NEW.classroom_number IS NOT NULL THEN
      v_message := v_message || ' Room: ' || NEW.classroom_number || '.';
    END IF;
    v_type := 'request_accepted';

  ELSIF NEW.status = 'declined' THEN
    v_title   := 'Request Declined';
    v_message := v_teacher_name || ' declined your request about "' || NEW.subject_line || '". You can submit a new request.';
    v_type    := 'request_declined';

  ELSIF NEW.status = 'completed' THEN
    v_title   := 'Consultation Completed ✅';
    v_message := 'Your consultation about "' || NEW.subject_line || '" has been marked as completed.';
    v_type    := 'consultation_completed';

  ELSIF NEW.status = 'cancelled' THEN
    v_title   := 'Consultation Cancelled ❌';
    v_message := 'Your consultation about "' || NEW.subject_line || '" has been cancelled.';
    v_type    := 'consultation_cancelled';

  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO notifications (
    user_id, title, message, type,
    consultation_request_id, is_read, created_at
  )
  VALUES (
    NEW.student_id, v_title, v_message, v_type,
    NEW.id, false, NOW()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_student_status_change
  AFTER UPDATE ON consultation_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_student_status_change();

-- ─────────────────────────────────────────────
-- VERIFY — run these after the script completes:
-- ─────────────────────────────────────────────
-- SELECT proname FROM pg_proc
--   WHERE proname IN ('create_notification','notify_teacher_new_request','notify_student_status_change');
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'consultation_requests'::regclass;
-- SELECT policyname, cmd FROM pg_policies WHERE tablename IN ('notifications','push_tokens') ORDER BY tablename;
-- SELECT unnest(enum_range(NULL::notification_type));
