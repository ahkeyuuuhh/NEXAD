-- =============================================================================
-- FIX: Teacher DELETE / UPDATE permissions for announcements & attachment_bins
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────

-- Allow teachers to DELETE their own announcements
DROP POLICY IF EXISTS "Teachers can delete their announcements" ON announcements;
CREATE POLICY "Teachers can delete their announcements"
  ON announcements FOR DELETE
  USING (teacher_id = auth.uid());

-- Allow teachers to UPDATE their own announcements
DROP POLICY IF EXISTS "Teachers can update their announcements" ON announcements;
CREATE POLICY "Teachers can update their announcements"
  ON announcements FOR UPDATE
  USING (teacher_id = auth.uid());

-- ── ATTACHMENT BINS ───────────────────────────────────────────────────────────

-- Allow teachers to DELETE their own attachment bins
DROP POLICY IF EXISTS "Teachers can delete their bins" ON attachment_bins;
CREATE POLICY "Teachers can delete their bins"
  ON attachment_bins FOR DELETE
  USING (teacher_id = auth.uid());

-- Allow teachers to UPDATE their own attachment bins
DROP POLICY IF EXISTS "Teachers can update their bins" ON attachment_bins;
CREATE POLICY "Teachers can update their bins"
  ON attachment_bins FOR UPDATE
  USING (teacher_id = auth.uid());
