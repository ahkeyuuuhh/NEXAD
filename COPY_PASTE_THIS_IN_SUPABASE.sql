-- ============================================
-- COPY THIS ENTIRE FILE AND PASTE IN SUPABASE
-- ============================================

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "Teachers can view their consultations" ON virtual_consultations;
DROP POLICY IF EXISTS "Teachers can create consultations" ON virtual_consultations;
DROP POLICY IF EXISTS "Teachers can update their consultations" ON virtual_consultations;
DROP POLICY IF EXISTS "Students can update joined consultations" ON virtual_consultations;
DROP POLICY IF EXISTS "Users can view their consultations" ON virtual_consultations;
DROP POLICY IF EXISTS "Authenticated users can create consultations" ON virtual_consultations;
DROP POLICY IF EXISTS "Hosts can update their consultations" ON virtual_consultations;

-- Step 2: Create PERMISSIVE policies (no teacher check)
CREATE POLICY "Users can view their consultations"
  ON virtual_consultations FOR SELECT
  USING (auth.uid() = host_id OR auth.uid() = student_id);

CREATE POLICY "Authenticated users can create consultations"
  ON virtual_consultations FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their consultations"
  ON virtual_consultations FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Students can update joined consultations"
  ON virtual_consultations FOR UPDATE
  USING (auth.uid() = student_id);

-- Step 3: Verify
SELECT '✅ RLS policies fixed!' as status;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'virtual_consultations';
