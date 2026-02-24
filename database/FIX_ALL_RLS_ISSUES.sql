-- =============================================
-- FIX ALL RLS ISSUES: ATTACHMENT BINS & DOCUMENTS
-- Run this ENTIRE script in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. FIX ATTACHMENT_BINS RLS POLICIES
-- =============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Teachers can create attachment bins" ON attachment_bins;
DROP POLICY IF EXISTS "Teachers can view their attachment bins" ON attachment_bins;
DROP POLICY IF EXISTS "Teachers can update their attachment bins" ON attachment_bins;
DROP POLICY IF EXISTS "Teachers can delete their attachment bins" ON attachment_bins;
DROP POLICY IF EXISTS "Students can view bins in their classrooms" ON attachment_bins;

-- Create new policies for attachment_bins
-- Teachers can manage their own attachment bins
CREATE POLICY "Teachers can create attachment bins" 
  ON attachment_bins FOR INSERT 
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view their attachment bins" 
  ON attachment_bins FOR SELECT 
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their attachment bins" 
  ON attachment_bins FOR UPDATE 
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their attachment bins" 
  ON attachment_bins FOR DELETE 
  USING (auth.uid() = teacher_id);

-- Students can view attachment bins in classrooms they're members of
CREATE POLICY "Students can view bins in their classrooms" 
  ON attachment_bins FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM classroom_memberships cm
      WHERE cm.classroom_id = attachment_bins.classroom_id
      AND cm.student_id = auth.uid()
      AND cm.is_active = true
    )
  );

-- =============================================
-- 2. FIX UPLOADED_DOCUMENTS RLS POLICIES
-- =============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can upload documents" ON uploaded_documents;
DROP POLICY IF EXISTS "Students can view their own uploaded documents" ON uploaded_documents;
DROP POLICY IF EXISTS "Teachers can view documents for their consultations" ON uploaded_documents;
DROP POLICY IF EXISTS "Teachers can view documents in their attachment bins" ON uploaded_documents;
DROP POLICY IF EXISTS "Students can view documents for their consultations" ON uploaded_documents;

-- Create new policies for uploaded_documents
-- Allow authenticated users to upload documents
CREATE POLICY "Users can upload documents" 
  ON uploaded_documents FOR INSERT 
  WITH CHECK (auth.uid() = uploaded_by);

-- Students can view their own uploaded documents
CREATE POLICY "Students can view their own uploaded documents" 
  ON uploaded_documents FOR SELECT 
  USING (auth.uid() = uploaded_by);

-- Teachers can view documents uploaded for their consultation requests
CREATE POLICY "Teachers can view documents for their consultations" 
  ON uploaded_documents FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM consultation_requests cr
      WHERE cr.id = uploaded_documents.consultation_request_id
      AND cr.teacher_id = auth.uid()
    )
  );

-- Teachers can view documents uploaded to their attachment bins
CREATE POLICY "Teachers can view documents in their attachment bins" 
  ON uploaded_documents FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM attachment_bins ab
      WHERE ab.id = uploaded_documents.attachment_bin_id
      AND ab.teacher_id = auth.uid()
    )
  );

-- Students can view documents for consultation requests they created
CREATE POLICY "Students can view documents for their consultations" 
  ON uploaded_documents FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM consultation_requests cr
      WHERE cr.id = uploaded_documents.consultation_request_id
      AND cr.student_id = auth.uid()
    )
  );

-- =============================================
-- 3. FIX CLASSROOM INVITE CODES (CASE SENSITIVITY)
-- =============================================

-- Ensure all existing invite codes are uppercase
UPDATE classrooms 
SET invite_code = UPPER(invite_code)
WHERE invite_code IS NOT NULL;

-- Create a function to uppercase invite codes automatically
CREATE OR REPLACE FUNCTION uppercase_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NOT NULL THEN
    NEW.invite_code := UPPER(NEW.invite_code);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS uppercase_invite_code_trigger ON classrooms;

-- Create trigger to auto-uppercase invite codes
CREATE TRIGGER uppercase_invite_code_trigger
  BEFORE INSERT OR UPDATE ON classrooms
  FOR EACH ROW
  EXECUTE FUNCTION uppercase_invite_code();

-- =============================================
-- VERIFICATION QUERIES (Optional - for testing)
-- =============================================

-- Check attachment_bins policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'attachment_bins';

-- Check uploaded_documents policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'uploaded_documents';

-- Done! All RLS issues should now be fixed.
