-- Migration: Add classroom_number column to consultation_requests table
-- This field stores the classroom/room number where the consultation will be held
-- Run this in your Supabase SQL Editor

ALTER TABLE consultation_requests 
ADD COLUMN IF NOT EXISTS classroom_number VARCHAR(50);

-- Add comment to the column
COMMENT ON COLUMN consultation_requests.classroom_number IS 'The classroom or room number where the consultation will be held';
