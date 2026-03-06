-- Create storage bucket for conversation file attachments
-- Run this in your Supabase SQL Editor

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conversation-files',
  'conversation-files',
  true,
  5242880,  -- 5 MB limit
  ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
DROP POLICY IF EXISTS "Auth users can upload conv files" ON storage.objects;
CREATE POLICY "Auth users can upload conv files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'conversation-files');

-- Allow authenticated users to read files
DROP POLICY IF EXISTS "Auth users can read conv files" ON storage.objects;
CREATE POLICY "Auth users can read conv files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'conversation-files');

-- Allow owners to delete their uploads
DROP POLICY IF EXISTS "Auth users can delete conv files" ON storage.objects;
CREATE POLICY "Auth users can delete conv files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'conversation-files' AND auth.uid()::text = (storage.foldername(name))[1]);
