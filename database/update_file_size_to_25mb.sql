-- Migration: Update file upload limits to 25MB (March 13, 2026)
-- This migration updates the maximum file size for attachment bins from 10MB to 25MB

-- Update existing attachment_bins table default value
ALTER TABLE attachment_bins ALTER COLUMN max_file_size_mb SET DEFAULT 25;

-- Note: Existing records with max_file_size_mb=10 will keep their current value
-- To update all existing bins to use 25MB, run:
-- UPDATE attachment_bins SET max_file_size_mb = 25 WHERE max_file_size_mb = 10;
