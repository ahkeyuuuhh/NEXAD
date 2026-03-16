-- Add missing created_by column to classrooms table
-- Run this in Supabase SQL Editor

-- Add the created_by column if it doesn't exist
ALTER TABLE classrooms 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Update existing records to set created_by = teacher_id where created_by is null
UPDATE classrooms 
SET created_by = teacher_id 
WHERE created_by IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_classrooms_created_by ON classrooms(created_by);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'classrooms' 
AND column_name IN ('created_by', 'teacher_id');