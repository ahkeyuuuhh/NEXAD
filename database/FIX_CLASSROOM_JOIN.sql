-- =============================================
-- FIX: Create join_classroom_by_code RPC Function
-- =============================================
-- The app calls supabase.rpc('join_classroom_by_code', { invite_code_input })
-- but this function was missing from the database.
--
-- This function uses SECURITY DEFINER so it can:
--   1. Look up a classroom by invite code BEFORE the student is a member
--      (normally blocked by RLS on the classrooms table)
--   2. Insert a new membership row on behalf of the authenticated user
--
-- HOW TO RUN:
--   Paste this entire script into the Supabase SQL Editor and click "Run".
-- =============================================

CREATE OR REPLACE FUNCTION public.join_classroom_by_code(invite_code_input TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_classroom        classrooms%ROWTYPE;
  v_existing_member  classroom_memberships%ROWTYPE;
  v_membership       classroom_memberships%ROWTYPE;
  v_student_id       UUID;
BEGIN
  -- Get the authenticated user's ID
  v_student_id := auth.uid();

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Find classroom by invite code (case-insensitive)
  SELECT * INTO v_classroom
  FROM classrooms
  WHERE UPPER(invite_code) = UPPER(invite_code_input)
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code. Please check the code and try again.';
  END IF;

  -- 2. Check if the student is already a member
  SELECT * INTO v_existing_member
  FROM classroom_memberships
  WHERE classroom_id = v_classroom.id
    AND student_id = v_student_id
  LIMIT 1;

  IF FOUND THEN
    -- If they were previously deactivated, reactivate them
    IF NOT v_existing_member.is_active THEN
      UPDATE classroom_memberships
      SET is_active = true, joined_at = NOW()
      WHERE id = v_existing_member.id
      RETURNING * INTO v_membership;

      RETURN json_build_object(
        'id',           v_membership.id,
        'classroom_id', v_membership.classroom_id,
        'student_id',   v_membership.student_id,
        'joined_at',    v_membership.joined_at,
        'is_active',    v_membership.is_active,
        'classroom',    json_build_object(
          'id',          v_classroom.id,
          'name',        v_classroom.name,
          'description', v_classroom.description,
          'invite_code', v_classroom.invite_code,
          'teacher_id',  v_classroom.teacher_id
        )
      );
    ELSE
      RAISE EXCEPTION 'Already a member of this classroom.';
    END IF;
  END IF;

  -- 3. Check max members (if limit set)
  IF v_classroom.max_members IS NOT NULL THEN
    DECLARE
      v_member_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO v_member_count
      FROM classroom_memberships
      WHERE classroom_id = v_classroom.id AND is_active = true;

      IF v_member_count >= v_classroom.max_members THEN
        RAISE EXCEPTION 'This classroom is full.';
      END IF;
    END;
  END IF;

  -- 4. Insert the new membership
  INSERT INTO classroom_memberships (classroom_id, student_id, is_active)
  VALUES (v_classroom.id, v_student_id, true)
  RETURNING * INTO v_membership;

  -- 5. Return membership + classroom info
  RETURN json_build_object(
    'id',           v_membership.id,
    'classroom_id', v_membership.classroom_id,
    'student_id',   v_membership.student_id,
    'joined_at',    v_membership.joined_at,
    'is_active',    v_membership.is_active,
    'classroom',    json_build_object(
      'id',          v_classroom.id,
      'name',        v_classroom.name,
      'description', v_classroom.description,
      'invite_code', v_classroom.invite_code,
      'teacher_id',  v_classroom.teacher_id
    )
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.join_classroom_by_code(TEXT) TO authenticated;

-- Revoke from anon (safety measure)
REVOKE EXECUTE ON FUNCTION public.join_classroom_by_code(TEXT) FROM anon;
