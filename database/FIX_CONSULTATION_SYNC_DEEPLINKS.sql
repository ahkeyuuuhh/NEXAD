-- =============================================
-- NEXAD: Consultation Sync + Notification Deep Links
--
-- What this does:
--   1. Adds `related_id` to notifications so the app can deep-link
--      directly to the relevant screen when tapping a notification.
--   2. Adds `consultation_requested` to the review_status CHECK so
--      the bin screen shows "Consultation Booked" once the student books.
--   3. Updates the status-change trigger to populate related_id.
--
-- HOW TO RUN: Paste entire script into Supabase SQL Editor and click Run.
-- =============================================

-- ─────────────────────────────────────────────
-- 1. Add related_id to notifications
--    Stores the UUID of the contextual record
--    (e.g. attachment_bin_id for submission events)
-- ─────────────────────────────────────────────
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS related_id UUID;

-- ─────────────────────────────────────────────
-- 2. Add consultation_requested to review_status CHECK
--    Set AFTER the student books the consultation from the bin screen.
--    This breaks the CHECK constraint — we must drop & recreate it.
-- ─────────────────────────────────────────────
ALTER TABLE uploaded_documents
  DROP CONSTRAINT IF EXISTS uploaded_documents_review_status_check;

ALTER TABLE uploaded_documents
  ADD CONSTRAINT uploaded_documents_review_status_check
  CHECK (review_status IN (
    'pending_review',
    'approved',
    'revised',
    'for_consultation',
    'consultation_requested'
  ));

-- ─────────────────────────────────────────────
-- 3. Update trigger to store attachment_bin_id in related_id
--    so the frontend can deep-link directly to the bin.
-- ─────────────────────────────────────────────
DROP TRIGGER  IF EXISTS trg_notify_submission_status ON uploaded_documents;
DROP FUNCTION IF EXISTS notify_student_submission_status_changed();

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
  IF NEW.review_status = OLD.review_status THEN RETURN NEW; END IF;
  IF NEW.uploaded_by IS NULL             THEN RETURN NEW; END IF;
  IF NEW.review_status = 'pending_review' THEN RETURN NEW; END IF;

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

  -- Store the bin's ID so the frontend can navigate directly to it
  INSERT INTO notifications (user_id, title, message, type, is_read, related_id, created_at)
  VALUES (NEW.uploaded_by, v_title, v_message, v_type, false, NEW.attachment_bin_id, NOW());

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_submission_status
  AFTER UPDATE OF review_status ON uploaded_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_student_submission_status_changed();

-- ─────────────────────────────────────────────
-- VERIFY:
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'notifications' AND column_name = 'related_id';
-- SELECT constraint_name FROM information_schema.check_constraints
--   WHERE constraint_name = 'uploaded_documents_review_status_check';
-- ─────────────────────────────────────────────
