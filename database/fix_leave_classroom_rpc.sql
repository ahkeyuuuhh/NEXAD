-- Fix: create a SECURITY DEFINER RPC for leaving a classroom.
-- A plain DELETE from the client is silently blocked by RLS when the
-- student_id in the row does not match auth.uid() exactly, causing the
-- classroom to re-appear on refresh.  Running as SECURITY DEFINER means
-- the function executes as the DB owner, bypassing all RLS checks.
--
-- Run this once in your Supabase SQL editor.

CREATE OR REPLACE FUNCTION leave_classroom(p_classroom_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM classroom_memberships
  WHERE classroom_id = p_classroom_id
    AND student_id   = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION leave_classroom(UUID) TO authenticated;
