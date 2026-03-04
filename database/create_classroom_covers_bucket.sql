-- Create storage bucket for classroom cover photos
-- Run this in your Supabase SQL editor

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'classroom-covers',
  'classroom-covers',
  true,
  5242880,  -- 5 MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own covers
CREATE POLICY "Teachers can upload classroom covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'classroom-covers');

-- Allow public read access
CREATE POLICY "Public can view classroom covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'classroom-covers');

-- Allow owners to update/delete
CREATE POLICY "Teachers can update classroom covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'classroom-covers');

CREATE POLICY "Teachers can delete classroom covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'classroom-covers');
