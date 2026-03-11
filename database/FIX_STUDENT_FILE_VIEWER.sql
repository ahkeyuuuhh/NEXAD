-- =============================================================================
-- FIX: Student can view their own uploaded documents (classroom bin submissions)
-- Run this ENTIRE script in Supabase SQL Editor
-- =============================================================================

-- ── 1. TABLE RLS: uploaded_documents ─────────────────────────────────────────
-- The original schema.sql never created SELECT policies for uploaded_documents,
-- so students cannot read their own submission rows at all.

-- INSERT: Students can upload their own documents
DROP POLICY IF EXISTS "Users can upload documents" ON uploaded_documents;
CREATE POLICY "Users can upload documents"
  ON uploaded_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- SELECT: Students can read their own rows
DROP POLICY IF EXISTS "Students can view their own uploaded documents" ON uploaded_documents;
CREATE POLICY "Students can view their own uploaded documents"
  ON uploaded_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- SELECT: Teachers can read documents submitted to bins they own
DROP POLICY IF EXISTS "Teachers can view documents in their attachment bins" ON uploaded_documents;
CREATE POLICY "Teachers can view documents in their attachment bins"
  ON uploaded_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM attachment_bins ab
      WHERE ab.id = uploaded_documents.attachment_bin_id
        AND ab.teacher_id = auth.uid()
    )
  );

-- SELECT: Teachers can read documents uploaded for their consultation requests
DROP POLICY IF EXISTS "Teachers can view documents for their consultations" ON uploaded_documents;
CREATE POLICY "Teachers can view documents for their consultations"
  ON uploaded_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consultation_requests cr
      WHERE cr.id = uploaded_documents.consultation_request_id
        AND cr.teacher_id = auth.uid()
    )
  );

-- SELECT: Students can read documents for consultation requests they created
DROP POLICY IF EXISTS "Students can view documents for their consultations" ON uploaded_documents;
CREATE POLICY "Students can view documents for their consultations"
  ON uploaded_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM consultation_requests cr
      WHERE cr.id = uploaded_documents.consultation_request_id
        AND cr.student_id = auth.uid()
    )
  );

-- UPDATE: Teachers can update review_status on documents in their bins
DROP POLICY IF EXISTS "Teachers can review bin submissions" ON uploaded_documents;
CREATE POLICY "Teachers can review bin submissions"
  ON uploaded_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM attachment_bins ab
      WHERE ab.id = uploaded_documents.attachment_bin_id
        AND ab.teacher_id = auth.uid()
    )
  );

-- ── 2. STORAGE POLICIES: consultation-documents bucket ───────────────────────
-- Ensure students can generate signed URLs for their own files.
-- File paths are stored as:  {uploadedBy_uuid}/{timestamp}_{random}.{ext}
-- so (storage.foldername(name))[1] will equal the uploader's user ID.

-- INSERT: Users can upload to their own folder
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
CREATE POLICY "Users can upload their own files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'consultation-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT: Users can generate signed URLs for files in their own folder
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
CREATE POLICY "Users can view their own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'consultation-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT: Teachers can view storage objects for their bin submissions
DROP POLICY IF EXISTS "Teachers can view bin submission files" ON storage.objects;
CREATE POLICY "Teachers can view bin submission files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'consultation-documents' AND
    EXISTS (
      SELECT 1
      FROM uploaded_documents ud
      JOIN attachment_bins ab ON ab.id = ud.attachment_bin_id
      WHERE ud.storage_path = name
        AND ab.teacher_id = auth.uid()
    )
  );

-- SELECT: Teachers can view storage objects for their consultation documents
DROP POLICY IF EXISTS "Teachers can view consultation files" ON storage.objects;
CREATE POLICY "Teachers can view consultation files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'consultation-documents' AND
    EXISTS (
      SELECT 1 FROM consultation_requests cr
      WHERE cr.teacher_id = auth.uid()
    )
  );

-- UPDATE / DELETE: Users can manage their own files
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
CREATE POLICY "Users can update their own files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'consultation-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'consultation-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
