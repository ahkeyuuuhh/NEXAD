-- Migration: Fix notifications RLS policies to allow INSERT
-- Currently notifications cannot be created because there's no INSERT policy
-- Run this in your Supabase SQL Editor

-- Add policy to allow inserting notifications for any authenticated user
-- This allows the app to create notifications for consultation requests, approvals, etc.
CREATE POLICY "Allow authenticated users to create notifications" ON notifications
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Alternative: Allow service role to insert notifications
-- If you prefer more control, you can create a database function that inserts notifications
-- and grant execute permission to authenticated users

COMMENT ON POLICY "Allow authenticated users to create notifications" ON notifications IS 
  'Allows authenticated users to create notifications for other users (e.g., teacher gets notified when student requests consultation)';
