-- =============================================
-- NEXAD: Classroom Members + Notification Triggers
-- HOW TO RUN: Paste entire script into Supabase SQL Editor and click Run.
-- =============================================

-- ─────────────────────────────────────────────
-- 1. ADD MISSING ENUM VALUES
-- ─────────────────────────────────────────────
DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'student_joined_classroom';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'classroom_announcement';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_announcement';
EXCEPTION WHEN others THEN NULL; END $$;

-- ─────────────────────────────────────────────
-- 2. RPC: get_classroom_members
--    Teachers use this to list enrolled students.
--    SECURITY DEFINER so it can join classroom_memberships
--    (auth.users FK) with student_profiles.
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
    cm.id                   AS membership_id,
    cm.student_id           AS student_user_id,
    cm.joined_at,
    COALESCE(sp.first_name, 'Unknown')    AS first_name,
    COALESCE(sp.last_name,  'Student')    AS last_name,
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
-- 3. TRIGGER: notify teacher when student joins
-- ─────────────────────────────────────────────
DROP TRIGGER  IF EXISTS trg_notify_teacher_student_joined ON classroom_memberships;
DROP FUNCTION IF EXISTS notify_teacher_student_joined();

CREATE OR REPLACE FUNCTION notify_teacher_student_joined()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_name  TEXT;
  v_classroom     classrooms%ROWTYPE;
BEGIN
  -- Get the joining student's name
  SELECT first_name || ' ' || last_name
  INTO v_student_name
  FROM student_profiles
  WHERE user_id = NEW.student_id;

  IF v_student_name IS NULL THEN
    v_student_name := 'A student';
  END IF;

  -- Get classroom info (teacher_id, name)
  SELECT * INTO v_classroom
  FROM classrooms
  WHERE id = NEW.classroom_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Insert notification for the teacher
  INSERT INTO notifications (
    user_id, title, message, type, is_read, created_at
  )
  VALUES (
    v_classroom.teacher_id,
    'New Student Joined 🎓',
    v_student_name || ' joined your classroom "' || v_classroom.name || '".',
    'student_joined_classroom',
    false,
    NOW()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_teacher_student_joined
  AFTER INSERT ON classroom_memberships
  FOR EACH ROW
  EXECUTE FUNCTION notify_teacher_student_joined();

-- ─────────────────────────────────────────────
-- 4. TRIGGER: notify all students when teacher posts announcement
-- ─────────────────────────────────────────────
DROP TRIGGER  IF EXISTS trg_notify_students_new_announcement ON announcements;
DROP FUNCTION IF EXISTS notify_students_new_announcement();

CREATE OR REPLACE FUNCTION notify_students_new_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_name  TEXT;
  v_classroom     classrooms%ROWTYPE;
  v_student       RECORD;
BEGIN
  -- Get the teacher's name
  SELECT first_name || ' ' || last_name
  INTO v_teacher_name
  FROM teacher_profiles
  WHERE user_id = NEW.teacher_id;

  IF v_teacher_name IS NULL THEN
    v_teacher_name := 'Your teacher';
  END IF;

  -- Get classroom info
  SELECT * INTO v_classroom
  FROM classrooms
  WHERE id = NEW.classroom_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Notify each active member of the classroom
  FOR v_student IN
    SELECT student_id
    FROM classroom_memberships
    WHERE classroom_id = NEW.classroom_id
      AND is_active = true
  LOOP
    INSERT INTO notifications (
      user_id, title, message, type, is_read, created_at
    )
    VALUES (
      v_student.student_id,
      'New Announcement 📢',
      v_teacher_name || ' posted "' || NEW.title || '" in ' || v_classroom.name || '.',
      'classroom_announcement',
      false,
      NOW()
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_students_new_announcement
  AFTER INSERT ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION notify_students_new_announcement();

-- ─────────────────────────────────────────────
-- 5. RLS: ensure teachers can see their classroom memberships
--    WITHOUT causing infinite recursion.
--
--    The recursion happens because:
--      classrooms SELECT policy → queries classroom_memberships
--      classroom_memberships SELECT policy → queries classrooms
--    → infinite loop.
--
--    Fix: use a SECURITY DEFINER helper that bypasses RLS on classrooms
--    when checking teacher ownership, breaking the cycle.
-- ─────────────────────────────────────────────
ALTER TABLE classroom_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view own memberships"          ON classroom_memberships;
DROP POLICY IF EXISTS "Students join classrooms"               ON classroom_memberships;
DROP POLICY IF EXISTS "Teachers view classroom memberships"    ON classroom_memberships;

-- Helper: bypasses classrooms RLS to check teacher ownership
CREATE OR REPLACE FUNCTION public.rls_is_teacher_of_classroom(p_classroom_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM classrooms
    WHERE id = p_classroom_id AND teacher_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.rls_is_teacher_of_classroom(UUID) TO authenticated;

-- Students see their own memberships
CREATE POLICY "Students view own memberships" ON classroom_memberships
  FOR SELECT USING (auth.uid() = student_id);

-- Students can insert their own memberships (also handled by SECURITY DEFINER RPC)
CREATE POLICY "Students join classrooms" ON classroom_memberships
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Teachers can see memberships for classrooms they own
-- Uses SECURITY DEFINER helper to avoid recursive RLS lookup
CREATE POLICY "Teachers view classroom memberships" ON classroom_memberships
  FOR SELECT USING (rls_is_teacher_of_classroom(classroom_id));

-- ─────────────────────────────────────────────
-- VERIFY (run after the script):
-- SELECT proname FROM pg_proc WHERE proname IN (
--   'get_classroom_members',
--   'notify_teacher_student_joined',
--   'notify_students_new_announcement'
-- );
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'classroom_memberships'::regclass;
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'announcements'::regclass;
-- ─────────────────────────────────────────────
