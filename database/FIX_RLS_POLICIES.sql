-- =============================================
-- FIX: Infinite Recursion in student_profiles and teacher_profiles
-- Run this ENTIRE script in Supabase SQL Editor
-- =============================================

-- Step 1: Drop ALL existing policies that might cause recursion
DROP POLICY IF EXISTS "Students can view their own profile" ON student_profiles;
DROP POLICY IF EXISTS "Students can update their own profile" ON student_profiles;
DROP POLICY IF EXISTS "Authenticated users can insert their student profile" ON student_profiles;
DROP POLICY IF EXISTS "Teachers can view student profiles" ON student_profiles;
DROP POLICY IF EXISTS "Users can view their own student profile" ON student_profiles;
DROP POLICY IF EXISTS "Users can update their own student profile" ON student_profiles;
DROP POLICY IF EXISTS "Users can insert their own student profile" ON student_profiles;
DROP POLICY IF EXISTS "All authenticated users can view student profiles" ON student_profiles;

DROP POLICY IF EXISTS "Teachers can view their own profile" ON teacher_profiles;
DROP POLICY IF EXISTS "Teachers can update their own profile" ON teacher_profiles;
DROP POLICY IF EXISTS "Authenticated users can insert their teacher profile" ON teacher_profiles;
DROP POLICY IF EXISTS "Students can view teacher profiles" ON teacher_profiles;
DROP POLICY IF EXISTS "Users can view their own teacher profile" ON teacher_profiles;
DROP POLICY IF EXISTS "Users can update their own teacher profile" ON teacher_profiles;
DROP POLICY IF EXISTS "Users can insert their own teacher profile" ON teacher_profiles;
DROP POLICY IF EXISTS "All authenticated users can view teacher profiles" ON teacher_profiles;

-- Step 2: Ensure RLS is enabled (but with no policies yet)
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create NEW policies WITHOUT any cross-table references
-- These policies are simple and won't cause infinite recursion

-- STUDENT PROFILES: Simple self-access policies
CREATE POLICY "student_select_own"
  ON student_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "student_insert_own"
  ON student_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "student_update_own"
  ON student_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "student_delete_own"
  ON student_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- TEACHER PROFILES: Simple self-access policies
CREATE POLICY "teacher_select_own"
  ON teacher_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "teacher_insert_own"
  ON teacher_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "teacher_update_own"
  ON teacher_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "teacher_delete_own"
  ON teacher_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Step 4: Add public read access (so students can see teachers and vice versa)
-- These are safe because they don't reference other tables
CREATE POLICY "public_select_students"
  ON student_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "public_select_teachers"
  ON teacher_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Done! The infinite recursion should now be fixed.
