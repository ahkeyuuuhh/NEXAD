-- =============================================
-- NEXAD: Fix Profile Display Issues
-- HOW TO RUN: Paste entire script into Supabase SQL Editor and click Run.
-- This script ensures profile pictures and names display correctly in classroom People tabs.
-- =============================================

-- ─────────────────────────────────────────────
-- 1. ENSURE PROFILE_PHOTO_URL COLUMNS EXIST
-- ─────────────────────────────────────────────
DO $$ 
BEGIN
    -- Add profile_photo_url to student_profiles if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_profiles' 
        AND column_name = 'profile_photo_url'
    ) THEN
        ALTER TABLE student_profiles ADD COLUMN profile_photo_url TEXT;
    END IF;

    -- Add profile_photo_url to teacher_profiles if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'teacher_profiles' 
        AND column_name = 'profile_photo_url'
    ) THEN
        ALTER TABLE teacher_profiles ADD COLUMN profile_photo_url TEXT;
    END IF;
END $$;

-- ─────────────────────────────────────────────
-- 2. UPDATE EXISTING RPC FUNCTION FOR BETTER PROFILE FETCHING
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_classroom_members(p_classroom_id UUID)
RETURNS TABLE (
  membership_id        UUID,
  student_user_id      UUID,
  joined_at            TIMESTAMPTZ,
  first_name           TEXT,
  last_name            TEXT,
  email                TEXT,
  profile_photo_url    TEXT,
  student_id_number    TEXT,
  department           TEXT,
  course               TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.id                                 AS membership_id,
    cm.student_id                         AS student_user_id,
    cm.joined_at,
    COALESCE(sp.first_name, 'Student')    AS first_name,
    COALESCE(sp.last_name,  '')           AS last_name,
    COALESCE(sp.email,      '')           AS email,
    sp.profile_photo_url,
    sp.student_id                         AS student_id_number,
    sp.department,
    sp.course
  FROM classroom_memberships cm
  LEFT JOIN student_profiles sp ON sp.user_id = cm.student_id
  WHERE cm.classroom_id = p_classroom_id
    AND cm.is_active = true
  ORDER BY cm.joined_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_classroom_members(UUID) TO authenticated;

-- ─────────────────────────────────────────────
-- 3. CREATE HELPER FUNCTION TO GET TEACHER PROFILE
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_teacher_profile(p_teacher_id UUID)
RETURNS TABLE (
  user_id              UUID,
  first_name           TEXT,
  last_name            TEXT,
  email                TEXT,
  profile_photo_url    TEXT,
  department           TEXT,
  teacher_position     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tp.user_id,
    COALESCE(tp.first_name, 'Teacher')    AS first_name,
    COALESCE(tp.last_name,  '')           AS last_name,
    COALESCE(tp.email,      '')           AS email,
    tp.profile_photo_url,
    tp.department,
    tp.position                           AS teacher_position
  FROM teacher_profiles tp
  WHERE tp.user_id = p_teacher_id;
  
  -- If no teacher profile found, try student_profiles (in case teacher is also a student)
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      sp.user_id,
      COALESCE(sp.first_name, 'Teacher')  AS first_name,
      COALESCE(sp.last_name,  '')         AS last_name,
      COALESCE(sp.email,      '')         AS email,
      sp.profile_photo_url,
      sp.department,
      NULL::TEXT                          AS teacher_position
    FROM student_profiles sp
    WHERE sp.user_id = p_teacher_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_profile(UUID) TO authenticated;

-- ─────────────────────────────────────────────
-- 4. ENSURE ALL EXISTING TEACHERS HAVE PROFILES
-- ─────────────────────────────────────────────
INSERT INTO teacher_profiles (
  user_id,
  email,
  first_name,
  last_name,
  max_consultations_per_day,
  consultation_duration_minutes,
  average_response_time_hours,
  is_accepting_consultations,
  notification_preferences
)
SELECT DISTINCT
  c.teacher_id,
  '',
  'Teacher',
  '',
  8,
  30,
  24,
  true,
  '{"email": true, "push": true, "sms": false}'::jsonb
FROM classrooms c
WHERE c.teacher_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM teacher_profiles tp 
    WHERE tp.user_id = c.teacher_id
  )
ON CONFLICT (user_id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 5. UPDATE RLS POLICIES FOR PROFILE ACCESS
-- ─────────────────────────────────────────────

-- Allow authenticated users to read teacher profiles (for classroom member display)
DROP POLICY IF EXISTS "Teacher profiles readable by authenticated users" ON teacher_profiles;
CREATE POLICY "Teacher profiles readable by authenticated users" ON teacher_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to read student profiles (for classroom member display)
DROP POLICY IF EXISTS "Student profiles readable by authenticated users" ON student_profiles;
CREATE POLICY "Student profiles readable by authenticated users" ON student_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────
-- 6. VERIFICATION QUERIES (uncomment to test)
-- ─────────────────────────────────────────────

-- Test the RPC functions:
-- SELECT * FROM get_classroom_members('your-classroom-id-here');
-- SELECT * FROM get_teacher_profile('your-teacher-id-here');

-- Check if all teachers have profiles:
-- SELECT 
--   c.id as classroom_id,
--   c.name as classroom_name,
--   c.teacher_id,
--   tp.first_name,
--   tp.last_name
-- FROM classrooms c
-- LEFT JOIN teacher_profiles tp ON tp.user_id = c.teacher_id
-- WHERE c.is_active = true;

COMMIT;