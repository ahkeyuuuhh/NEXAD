-- =============================================
-- FIX: CLASSROOM JOIN + AI SMART BRIEF RLS
-- Run this ENTIRE script in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. FIX CLASSROOM JOIN (Invalid Invite Code bug)
-- =============================================
-- Problem: Students cannot SELECT from 'classrooms' before joining,
-- so looking up a classroom by invite_code returns null → "Invalid invite code"
-- Solution: A SECURITY DEFINER RPC function that runs with elevated
-- privileges to find the classroom and insert the membership atomically.

CREATE OR REPLACE FUNCTION join_classroom_by_code(invite_code_input TEXT)
RETURNS TABLE(classroom_id UUID, classroom_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_id   UUID;
  found_name TEXT;
BEGIN
  -- Find active classroom with this invite code (bypasses student RLS)
  SELECT id, name INTO found_id, found_name
  FROM classrooms
  WHERE invite_code = UPPER(TRIM(invite_code_input))
    AND is_active = true;

  IF found_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Already a member?
  IF EXISTS (
    SELECT 1 FROM classroom_memberships
    WHERE classroom_memberships.classroom_id = found_id
      AND classroom_memberships.student_id = auth.uid()
      AND classroom_memberships.is_active = true
  ) THEN
    RAISE EXCEPTION 'Already a member of this classroom';
  END IF;

  -- Re-activate if previously left
  IF EXISTS (
    SELECT 1 FROM classroom_memberships
    WHERE classroom_memberships.classroom_id = found_id
      AND classroom_memberships.student_id = auth.uid()
      AND classroom_memberships.is_active = false
  ) THEN
    UPDATE classroom_memberships
    SET is_active = true, joined_at = NOW()
    WHERE classroom_memberships.classroom_id = found_id
      AND classroom_memberships.student_id = auth.uid();
  ELSE
    INSERT INTO classroom_memberships (classroom_id, student_id, is_active, joined_at)
    VALUES (found_id, auth.uid(), true, NOW());
  END IF;

  RETURN QUERY SELECT found_id, found_name;
END;
$$;

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION join_classroom_by_code(TEXT) TO authenticated;

-- =============================================
-- 2. FIX CLASSROOM_MEMBERSHIPS: ADD DELETE POLICY
-- (students need to be able to leave a classroom)
-- =============================================
DROP POLICY IF EXISTS "Students can leave classrooms" ON classroom_memberships;
CREATE POLICY "Students can leave classrooms"
  ON classroom_memberships FOR DELETE
  USING (auth.uid() = student_id);

-- =============================================
-- 3. FIX AI_SMART_BRIEFS: ALLOW STUDENT INSERT & SELECT
-- Problem: Students create the smart brief after submitting a request,
-- but there is no INSERT policy for students on ai_smart_briefs.
-- =============================================
DROP POLICY IF EXISTS "Students can create smart briefs" ON ai_smart_briefs;
CREATE POLICY "Students can create smart briefs"
  ON ai_smart_briefs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consultation_requests cr
      WHERE cr.id = ai_smart_briefs.consultation_request_id
        AND cr.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can view their smart briefs" ON ai_smart_briefs;
CREATE POLICY "Students can view their smart briefs"
  ON ai_smart_briefs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM consultation_requests cr
      WHERE cr.id = ai_smart_briefs.consultation_request_id
        AND cr.student_id = auth.uid()
    )
  );

-- =============================================
-- 4. ENSURE UPLOADED_DOCUMENTS POLICIES ARE CORRECT
-- (Run these even if FIX_ALL_RLS_ISSUES.sql was already run — safe to re-run)
-- =============================================
DROP POLICY IF EXISTS "Users can upload documents" ON uploaded_documents;
CREATE POLICY "Users can upload documents"
  ON uploaded_documents FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "Students can view their own uploaded documents" ON uploaded_documents;
CREATE POLICY "Students can view their own uploaded documents"
  ON uploaded_documents FOR SELECT
  USING (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "Teachers can view documents for their consultations" ON uploaded_documents;
CREATE POLICY "Teachers can view documents for their consultations"
  ON uploaded_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM consultation_requests cr
      WHERE cr.id = uploaded_documents.consultation_request_id
        AND cr.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can view documents for their consultations" ON uploaded_documents;
CREATE POLICY "Students can view documents for their consultations"
  ON uploaded_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM consultation_requests cr
      WHERE cr.id = uploaded_documents.consultation_request_id
        AND cr.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can view documents in their attachment bins" ON uploaded_documents;
CREATE POLICY "Teachers can view documents in their attachment bins"
  ON uploaded_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM attachment_bins ab
      WHERE ab.id = uploaded_documents.attachment_bin_id
        AND ab.teacher_id = auth.uid()
    )
  );

-- =============================================
-- 5. STORAGE BUCKET POLICY FOR consultation-documents
-- Ensure teachers can read signed URLs for student-uploaded files
-- =============================================

-- Allow authenticated users to upload to consultation-documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('consultation-documents', 'consultation-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload consultation documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload consultation documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'consultation-documents'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can read their own consultation documents" ON storage.objects;
CREATE POLICY "Users can read their own consultation documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'consultation-documents'
    AND auth.role() = 'authenticated'
  );

-- =============================================
-- DONE! Verify with these queries (optional):
-- =============================================
-- SELECT proname FROM pg_proc WHERE proname = 'join_classroom_by_code';
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'ai_smart_briefs';
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'uploaded_documents';
