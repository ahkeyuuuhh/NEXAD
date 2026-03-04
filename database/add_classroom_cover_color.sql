-- Add cover_color column to classrooms table
-- Run this in your Supabase SQL editor

ALTER TABLE classrooms
  ADD COLUMN IF NOT EXISTS cover_color TEXT DEFAULT NULL;

-- Optional: Set a default for existing classrooms so they still look good
UPDATE classrooms SET cover_color = '#1967D2' WHERE cover_color IS NULL;
