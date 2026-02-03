-- Storage Policies for consultation-documents bucket

-- Policy 1: Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'consultation-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow users to view their own uploaded files
CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    
  bucket_id = 'consultation-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Allow teachers to view files in consultations assigned to them
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

-- Policy 4: Allow users to update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'consultation-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 5: Allow users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'consultation-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
