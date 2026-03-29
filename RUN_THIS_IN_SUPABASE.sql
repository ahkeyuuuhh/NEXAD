-- ============================================
-- 🚨 RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
-- ============================================
-- Copy everything below and paste into Supabase SQL Editor, then click RUN

-- Step 1: Ensure table exists
CREATE TABLE IF NOT EXISTS virtual_consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id TEXT UNIQUE NOT NULL,
  room_url TEXT NOT NULL,
  invite_code VARCHAR(6) UNIQUE NOT NULL,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_name TEXT NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  student_name TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  duration_minutes INTEGER DEFAULT 0,
  consultation_type VARCHAR(50) DEFAULT 'video',
  notes TEXT
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_virtual_consultations_host ON virtual_consultations(host_id);
CREATE INDEX IF NOT EXISTS idx_virtual_consultations_student ON virtual_consultations(student_id);
CREATE INDEX IF NOT EXISTS idx_virtual_consultations_invite_code ON virtual_consultations(invite_code);
CREATE INDEX IF NOT EXISTS idx_virtual_consultations_status ON virtual_consultations(status);
CREATE INDEX IF NOT EXISTS idx_virtual_consultations_created_at ON virtual_consultations(created_at DESC);

-- Step 3: Enable RLS
ALTER TABLE virtual_consultations ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL existing policies
DROP POLICY IF EXISTS "Teachers can view their consultations" ON virtual_consultations;
DROP POLICY IF EXISTS "Teachers can create consultations" ON virtual_consultations;
DROP POLICY IF EXISTS "Teachers can update their consultations" ON virtual_consultations;
DROP POLICY IF EXISTS "Students can update joined consultations" ON virtual_consultations;
DROP POLICY IF EXISTS "Users can view their consultations" ON virtual_consultations;
DROP POLICY IF EXISTS "Authenticated users can create consultations" ON virtual_consultations;
DROP POLICY IF EXISTS "Hosts can update their consultations" ON virtual_consultations;

-- Step 5: Create NEW PERMISSIVE policies
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

-- Step 6: Create functions
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM virtual_consultations WHERE invite_code = result) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION join_consultation_by_code(
  p_invite_code TEXT,
  p_student_id UUID,
  p_student_name TEXT
)
RETURNS TABLE (room_url TEXT, host_name TEXT, consultation_id UUID) AS $$
DECLARE
  v_consultation virtual_consultations%ROWTYPE;
BEGIN
  SELECT * INTO v_consultation
  FROM virtual_consultations
  WHERE invite_code = UPPER(p_invite_code)
    AND status = 'active'
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;
  
  UPDATE virtual_consultations
  SET 
    student_id = p_student_id,
    student_name = p_student_name,
    status = 'in_progress',
    started_at = COALESCE(started_at, NOW())
  WHERE id = v_consultation.id;
  
  RETURN QUERY
  SELECT v_consultation.room_url, v_consultation.host_name, v_consultation.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ✅ VERIFICATION (Check results below)
-- ============================================

SELECT '✅ Table exists' as status, COUNT(*) as count 
FROM information_schema.tables 
WHERE table_name = 'virtual_consultations';

SELECT '✅ RLS enabled' as status, relrowsecurity as enabled 
FROM pg_class WHERE relname = 'virtual_consultations';

SELECT '✅ Policies created' as status, COUNT(*) as policy_count 
FROM pg_policies WHERE tablename = 'virtual_consultations';

SELECT '✅ Test code generation' as status, generate_invite_code() as sample_code;

SELECT '🎉 VIRTUAL CONSULTATION SYSTEM IS READY!' as final_status;
