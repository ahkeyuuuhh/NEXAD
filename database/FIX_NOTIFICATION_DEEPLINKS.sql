-- =============================================
-- NEXAD: Notification Deep-Link Fix
--
-- Problem: Tapping a submission-status notification
--   had nowhere to navigate because related_id was
--   never stored in the notifications row.
--
-- Fix:
--   1. Add related_id UUID column to notifications
--   2. Update create_notification() RPC to accept it
--   3. Update submission-status trigger to store
--      attachment_bin_id as related_id
--   4. Update consultation-status trigger to store
--      consultation_request_id as related_id
--   5. Update notify_teacher_new_request trigger
--      to store consultation_request_id as related_id
--
-- HOW TO RUN: Paste entire script in Supabase SQL Editor → Run
-- =============================================

-- ─────────────────────────────────────────────
-- 1. ADD related_id COLUMN (safe to re-run)
-- ─────────────────────────────────────────────
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS related_id UUID DEFAULT NULL;

-- ─────────────────────────────────────────────
-- 2. ADD MISSING ENUM VALUES (safe to re-run)
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
-- 3. UPDATED create_notification() RPC
--    Now accepts p_related_id for bin / request
--    deep-link navigation from the app.
-- ─────────────────────────────────────────────

-- Drop ALL existing overloads so CREATE OR REPLACE has no ambiguity
DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, TEXT, TEXT, UUID, UUID);

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id                 UUID,
  p_title                   TEXT,
  p_message                 TEXT,
  p_type                    TEXT    DEFAULT 'request_submitted',
  p_consultation_request_id UUID    DEFAULT NULL,
  p_related_id              UUID    DEFAULT NULL
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
  BEGIN
    v_type := p_type::notification_type;
  EXCEPTION WHEN invalid_text_representation THEN
    v_type := 'request_submitted';
  END;

  INSERT INTO notifications (
    user_id, title, message, type,
    consultation_request_id, related_id,
    is_read, created_at
  )
  VALUES (
    p_user_id, p_title, p_message, v_type,
    p_consultation_request_id, COALESCE(p_related_id, p_consultation_request_id),
    false, NOW()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, UUID, UUID) TO anon;

-- ─────────────────────────────────────────────
-- 4. UPDATED submission-status trigger
--    Stores attachment_bin_id in related_id
--    so the app can navigate directly to
--    AttachmentBinSubmission when tapped.
--    Also adds consultation_requested status
--    handling.
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
  v_bin          attachment_bins%ROWTYPE;
  v_teacher_name TEXT;
  v_title        TEXT;
  v_message      TEXT;
  v_type         notification_type;
BEGIN
  -- Only fire when review_status actually changes
  IF NEW.review_status = OLD.review_status THEN RETURN NEW; END IF;
  IF NEW.uploaded_by IS NULL               THEN RETURN NEW; END IF;
  -- Resetting to pending_review needs no notification
  IF NEW.review_status = 'pending_review'  THEN RETURN NEW; END IF;

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
    v_message := v_teacher_name || ' recommends a consultation for "' || v_bin.title || '". Tap here to request one.';

  -- consultation_requested is set by the app (student side) — no separate notification needed
  ELSE
    RETURN NEW;
  END IF;

  -- KEY FIX: store attachment_bin_id as related_id so the app can
  -- deep-link directly to AttachmentBinSubmission on tap.
  INSERT INTO notifications (
    user_id, title, message, type,
    related_id, is_read, created_at
  )
  VALUES (
    NEW.uploaded_by, v_title, v_message, v_type,
    NEW.attachment_bin_id,   -- ← deep-link target
    false, NOW()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_submission_status
  AFTER UPDATE OF review_status ON uploaded_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_student_submission_status_changed();

-- ─────────────────────────────────────────────
-- 5. UPDATED consultation status-change trigger
--    Stores consultation_request id as related_id
--    so student can deep-link to ConsultationHistory.
-- ─────────────────────────────────────────────
DROP TRIGGER  IF EXISTS trg_notify_student_status_change ON consultation_requests;
DROP FUNCTION IF EXISTS notify_student_status_change();

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
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT first_name || ' ' || last_name INTO v_teacher_name
    FROM teacher_profiles WHERE user_id = NEW.teacher_id;
  IF v_teacher_name IS NULL THEN v_teacher_name := 'Your teacher'; END IF;

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

  -- Store consultation_request id as related_id so the app can
  -- deep-link to ConsultationHistory (student) on tap.
  INSERT INTO notifications (
    user_id, title, message, type,
    consultation_request_id, related_id,
    is_read, created_at
  )
  VALUES (
    NEW.student_id, v_title, v_message, v_type,
    NEW.id, NEW.id,          -- ← deep-link for both fields
    false, NOW()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_student_status_change
  AFTER UPDATE ON consultation_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_student_status_change();

-- ─────────────────────────────────────────────
-- 6. UPDATED new-request trigger (teacher side)
--    Stores consultation_request id as related_id
--    so teacher deep-links to RequestManagement.
-- ─────────────────────────────────────────────
DROP TRIGGER  IF EXISTS trg_notify_teacher_new_request ON consultation_requests;
DROP FUNCTION IF EXISTS notify_teacher_new_request();

CREATE OR REPLACE FUNCTION notify_teacher_new_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_name TEXT;
BEGIN
  SELECT first_name || ' ' || last_name INTO v_student_name
    FROM student_profiles WHERE user_id = NEW.student_id;
  IF v_student_name IS NULL THEN v_student_name := 'A student'; END IF;

  INSERT INTO notifications (
    user_id, title, message, type,
    consultation_request_id, related_id,
    is_read, created_at
  )
  VALUES (
    NEW.teacher_id,
    'New Consultation Request 📝',
    v_student_name || ' has requested a consultation about "' || NEW.subject_line || '".',
    'request_submitted',
    NEW.id, NEW.id,          -- ← deep-link for both fields
    false, NOW()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_teacher_new_request
  AFTER INSERT ON consultation_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_teacher_new_request();

-- ─────────────────────────────────────────────
-- 7. BACKFILL related_id FOR EXISTING NOTIFICATIONS
--
--    Run AFTER the triggers above are installed.
--    (a) Consultation notifications: related_id = consultation_request_id
--        (FK already stored; just copy it across)
--    (b) Submission notifications: match uploaded_documents row by user_id
--        and the review_status that corresponds to the notification type,
--        using a time-proximity join (trigger fires immediately on UPDATE).
-- ─────────────────────────────────────────────

-- (a) Consultation notifications — safe exact FK match
UPDATE notifications
SET    related_id = consultation_request_id
WHERE  related_id IS NULL
  AND  consultation_request_id IS NOT NULL;

-- (b) Submission notifications — match by user, status, and closest time
--     Uses DISTINCT ON to pick the single closest document per notification.
UPDATE notifications n
SET    related_id = closest.attachment_bin_id
FROM (
  SELECT DISTINCT ON (n2.id)
         n2.id          AS notif_id,
         ud.attachment_bin_id
  FROM   notifications n2
  JOIN   uploaded_documents ud
         ON  ud.uploaded_by = n2.user_id
         AND (
               (n2.type = 'submission_revised'          AND ud.review_status = 'revised')
            OR (n2.type = 'submission_approved'         AND ud.review_status = 'approved')
            OR (n2.type = 'submission_for_consultation' AND ud.review_status = 'for_consultation')
         )
         -- Trigger fires within the same DB transaction, so the timestamps
         -- should match within a few seconds at most.
         AND ABS(EXTRACT(EPOCH FROM (n2.created_at - ud.updated_at))) < 30
  WHERE  n2.related_id IS NULL
    AND  n2.type IN ('submission_revised','submission_approved','submission_for_consultation')
  ORDER  BY n2.id, ABS(EXTRACT(EPOCH FROM (n2.created_at - ud.updated_at)))
) closest
WHERE n.id = closest.notif_id;

-- ─────────────────────────────────────────────
-- VERIFY:
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'notifications' AND column_name = 'related_id';
-- SELECT tgname FROM pg_trigger
--   WHERE tgrelid IN (
--     'uploaded_documents'::regclass,
--     'consultation_requests'::regclass
--   );
-- Check backfill results:
-- SELECT type, related_id IS NOT NULL AS has_related_id, count(*)
-- FROM notifications GROUP BY type, has_related_id ORDER BY type;
-- ─────────────────────────────────────────────
