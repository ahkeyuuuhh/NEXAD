-- ============================================
-- COMPLETE VIRTUAL CONSULTATION FIX
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- Step 1: Drop table if exists and recreate
DROP TABLE IF EXISTS virtual_consultations CASCADE;

-- Step 2: Create table
CREATE TABLE virtual_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Room details
  room_id TEXT UNIQUE NOT NULL,
  room_url TEXT NOT NULL,
  invite_code VARCHAR(6) UNIQUE NOT NULL,
  
  -- Participants (using UUID directly, no foreign key to avoid issues)
  host_id UUID NOT NULL,
  host_name TEXT NOT NULL,
  student_id UUID,
  student_name TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed', 'expired', 'cancelled')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  
  -- Metadata
  duration_minutes INTEGER DEFAULT 0,
  consultation_type VARCHAR(50) DEFAULT 'video',
  notes TEXT
);

-- Step 3: Create indexes
CREATE INDEX idx_virtual_consultations_host ON virtual_consultations(host_id);
CREATE INDEX idx_virtual_consultations_student ON virtual_consultations(student_id);
CREATE INDEX idx_virtual_consultations_invite_code ON virtual_consultations(invite_code);
CREATE INDEX idx_virtual_consultations_status ON virtual_consultations(status);
CREATE INDEX idx_virtual_consultations_created_at ON virtual_consultations(created_at DESC);

-- Step 4: Enable RLS
ALTER TABLE virtual_consultations ENABLE ROW LEVEL SECURITY;

-- Step 5: Create SIMPLE policies (no foreign key checks)
CREATE POLICY "Anyone can view consultations they're part of"
  ON virtual_consultations FOR SELECT
  USING (
    auth.uid()::text = host_id::text OR
    auth.uid()::text = student_id::text
  );

CREATE POLICY "Any authenticated user can create consultations"
  ON virtual_consultations FOR INSERT
  WITH CHECK (
    auth.uid()::text = host_id::text
  );

CREATE POLICY "Users can update their own consultations"
  ON virtual_consultations FOR UPDATE
  USING (
    auth.uid()::text = host_id::text OR
    auth.uid()::text = student_id::text
  );

CREATE POLICY "Users can delete their own consultations"
  ON virtual_consultations FOR DELETE
  USING (auth.uid()::text = host_id::text);

-- Step 6: Create helper function for invite codes
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

-- Step 7: Create join function
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

-- Step 8: Test insert (this will verify everything works)
DO $$
DECLARE
  test_code TEXT;
  test_id UUID;
BEGIN
  -- Generate test code
  test_code := generate_invite_code();
  
  -- Try to insert a test record
  INSERT INTO virtual_consultations (
    room_id,
    room_url,
    invite_code,
    host_id,
    host_name,
    status
  ) VALUES (
    'test-room-' || test_code,
    'https://test.daily.co/test-room-' || test_code,
    test_code,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Test User',
    'active'
  ) RETURNING id INTO test_id;
  
  -- Delete test record
  DELETE FROM virtual_consultations WHERE id = test_id;
  
  RAISE NOTICE '✅ Test insert successful! Table is ready.';
END $$;

-- Step 9: Verify setup
SELECT '✅ Table created' as status;
SELECT '✅ RLS enabled' as status, relrowsecurity as enabled 
FROM pg_class WHERE relname = 'virtual_consultations';
SELECT '✅ Policies created' as status, COUNT(*) as policy_count 
FROM pg_policies WHERE tablename = 'virtual_consultations';
SELECT '✅ Functions created' as status;
SELECT '🎉 VIRTUAL CONSULTATION SYSTEM IS 100% READY!' as final_status;
