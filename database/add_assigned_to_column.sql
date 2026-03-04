-- =============================================================================
-- ADD: assigned_to columns for student targeting on announcements & bins
-- NULL = assigned to ALL enrolled students (default)
-- UUID array = assigned to specific students only
-- Run AFTER FIX_ANNOUN_BIN_DELETE_RLS.sql
-- =============================================================================

ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS assigned_to uuid[] DEFAULT NULL;

ALTER TABLE attachment_bins
  ADD COLUMN IF NOT EXISTS assigned_to uuid[] DEFAULT NULL;
