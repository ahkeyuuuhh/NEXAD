-- =============================================
-- NEXAD: Add consultation_requested to review_status
--
-- Problem: The DB CHECK constraint on uploaded_documents.review_status
--   does not include 'consultation_requested', so the app's call to
--   update the status after booking silently fails — leaving the
--   submission stuck on 'for_consultation' forever.
--
-- Fix: Drop the old constraint and recreate it with the missing value.
--
-- HOW TO RUN: Paste entire script in Supabase SQL Editor → Run
-- =============================================

-- Drop the auto-generated constraint (name may vary — try both common names)
ALTER TABLE uploaded_documents
  DROP CONSTRAINT IF EXISTS uploaded_documents_review_status_check;

-- Also try the explicit name if it was created with one
ALTER TABLE uploaded_documents
  DROP CONSTRAINT IF EXISTS review_status_check;

-- Recreate with all valid values including consultation_requested
ALTER TABLE uploaded_documents
  ADD CONSTRAINT uploaded_documents_review_status_check
  CHECK (review_status IN (
    'pending_review',
    'approved',
    'revised',
    'for_consultation',
    'consultation_requested'
  ));

-- VERIFY:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'uploaded_documents'::regclass
--   AND contype = 'c';
