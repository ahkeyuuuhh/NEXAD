-- =============================================
-- NEXAD: Submission Review System
-- Adds: review_status on uploaded_documents,
--       bin_comments table (private per-student threads),
--       status-change notification trigger
--
-- HOW TO RUN: Paste entire script in Supabase SQL Editor → Run
-- =============================================

-- ─────────────────────────────────────────────
-- 1. ADD review_status TO uploaded_documents
-- ─────────────────────────────────────────────
ALTER TABLE uploaded_documents
  ADD COLUMN IF NOT EXISTS review_status VARCHAR(30)
    NOT NULL DEFAULT 'pending_review'
    CHECK (review_status IN (
      'pending_review',
      'approved',
      'revised',
      'for_consultation'
    ));

-- ─────────────────────────────────────────────
-- 2. ADD NOTIFICATION TYPE ENUM VALUES
-- ─────────────────────────────────────────────
DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'submission_approved';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'submission_revised';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'submission_for_consultation';
EXCEPTION WHEN others THEN NULL; END $$;

-- ─────────────────────────────────────────────
-- 3. BIN COMMENTS TABLE
--    Private 1-on-1 thread per (bin × student).
--    student_id identifies whose thread this is.
--    sender_id is who actually wrote the message.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bin_comments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attachment_bin_id UUID NOT NULL REFERENCES attachment_bins(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL,   -- thread owner  (auth.users)
  sender_id         UUID NOT NULL,   -- message author (auth.users)
  sender_role       VARCHAR(10) NOT NULL CHECK (sender_role IN ('teacher', 'student')),
  message           TEXT NOT NULL,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE bin_comments ENABLE ROW LEVEL SECURITY;

-- Drop any old policies first so re-runs are safe
DROP POLICY IF EXISTS "Students access own bin comments"   ON bin_comments;
DROP POLICY IF EXISTS "Teachers access bin comments"       ON bin_comments;
DROP POLICY IF EXISTS "Students insert own bin comments"   ON bin_comments;
DROP POLICY IF EXISTS "Teachers insert bin comments"       ON bin_comments;

-- Students: full access to threads where they are the named student
CREATE POLICY "Students access own bin comments" ON bin_comments
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students insert own bin comments" ON bin_comments
  FOR INSERT WITH CHECK (
    auth.uid() = student_id
    AND auth.uid() = sender_id
    AND sender_role = 'student'
  );

-- Teachers: full access to ALL threads for their bins
CREATE POLICY "Teachers access bin comments" ON bin_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM attachment_bins ab
      WHERE ab.id = bin_comments.attachment_bin_id
        AND ab.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers insert bin comments" ON bin_comments
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND sender_role = 'teacher'
    AND EXISTS (
      SELECT 1 FROM attachment_bins ab
      WHERE ab.id = bin_comments.attachment_bin_id
        AND ab.teacher_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- 4. RLS: Teacher can UPDATE review_status on submissions
--    (uploaded_documents already has is_deleted update policy;
--     this policy adds the review_status update path)
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Teachers update submission status" ON uploaded_documents;

CREATE POLICY "Teachers update submission status" ON uploaded_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM attachment_bins ab
      WHERE ab.id = uploaded_documents.attachment_bin_id
        AND ab.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM attachment_bins ab
      WHERE ab.id = uploaded_documents.attachment_bin_id
        AND ab.teacher_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- 5. TRIGGER: notify student when teacher changes review_status
-- ─────────────────────────────────────────────
DROP TRIGGER   IF EXISTS trg_notify_submission_status ON uploaded_documents;
DROP FUNCTION  IF EXISTS notify_student_submission_status_changed();

CREATE OR REPLACE FUNCTION notify_student_submission_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bin           attachment_bins%ROWTYPE;
  v_teacher_name  TEXT;
  v_title         TEXT;
  v_message       TEXT;
  v_type          notification_type;
BEGIN
  -- Only fire when review_status actually changes
  IF NEW.review_status = OLD.review_status THEN
    RETURN NEW;
  END IF;
  IF NEW.uploaded_by IS NULL THEN
    RETURN NEW;
  END IF;
  -- Don't notify when resetting back to pending_review
  IF NEW.review_status = 'pending_review' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_bin FROM attachment_bins WHERE id = NEW.attachment_bin_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT first_name || ' ' || last_name INTO v_teacher_name
  FROM teacher_profiles WHERE user_id = v_bin.teacher_id;
  IF v_teacher_name IS NULL THEN v_teacher_name := 'Your teacher'; END IF;

  IF NEW.review_status = 'approved' THEN
    v_type    := 'submission_approved';
    v_title   := 'Submission Approved ✅';
    v_message := v_teacher_name || ' approved your submission for "' || v_bin.title || '".';

  ELSIF NEW.review_status = 'revised' THEN
    v_type    := 'submission_revised';
    v_title   := 'Revision Required ✏️';
    v_message := v_teacher_name || ' has requested a revision for "' || v_bin.title || '". Please re-submit.';

  ELSIF NEW.review_status = 'for_consultation' THEN
    v_type    := 'submission_for_consultation';
    v_title   := 'Consultation Recommended 💬';
    v_message := v_teacher_name || ' recommends a consultation for "' || v_bin.title || '". You can now request one.';

  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
  VALUES (NEW.uploaded_by, v_title, v_message, v_type, false, NOW());

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_submission_status
  AFTER UPDATE OF review_status ON uploaded_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_student_submission_status_changed();

-- ─────────────────────────────────────────────
-- VERIFY:
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'uploaded_documents' AND column_name = 'review_status';
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'bin_comments';
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'uploaded_documents'::regclass;
-- ─────────────────────────────────────────────
