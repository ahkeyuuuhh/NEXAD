-- ============================================
-- VIRTUAL CONSULTATIONS SYSTEM - FIXED VERSION
-- ============================================

-- Create virtual_consultations table
CREATE TABLE IF NOT EXISTS virtual_consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Room details
  room_id TEXT UNIQUE NOT NULL,
  room_url TEXT NOT NULL,
  invite_code VARCHAR(6) UNIQUE NOT NULL,
  
  -- Participants
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_name TEXT NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_virtual_consultations_host ON virtual_consultations(host_id);
CREATE INDEX IF NOT EXISTS idx_virtual_consultations_student ON virtual_consultations(student_id);
CREATE INDEX IF NOT EXISTS idx_virtual_consultations_invite_code ON virtual_consultations(invite_code);
CREATE INDEX IF NOT EXISTS idx_virtual_consultations_status ON virtual_consultations(status);
CREATE INDEX IF NOT EXISTS idx_virtual_consultations_created_at ON virtual_consultations(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE virtual_consultations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can view their consultations" ON virtual_consultations;
DROP POLICY IF EXISTS "Teachers can create consultations" ON virtual_consultations;
DROP POLICY IF EXISTS "Teachers can update their consultations" ON virtual_consultations;
DROP POLICY IF EXISTS "Students can update joined consultations" ON virtual_consultations;

-- Teachers and students can view their consultations
CREATE POLICY "Teachers can view their consultations"
  ON virtual_consultations FOR SELECT
  USING (
    auth.uid() = host_id OR
    auth.uid() = student_id
  );

-- Teachers can create consultations
CREATE POLICY "Teachers can create consultations"
  ON virtual_consultations FOR INSERT
  WITH CHECK (
    auth.uid() = host_id AND
    EXISTS (
      SELECT 1 FROM teacher_profiles WHERE user_id = auth.uid()
    )
  );

-- Teachers can update their own consultations
CREATE POLICY "Teachers can update their consultations"
  ON virtual_consultations FOR UPDATE
  USING (auth.uid() = host_id);

-- Students can update consultations they join
CREATE POLICY "Students can update joined consultations"
  ON virtual_consultations FOR UPDATE
  USING (auth.uid() = student_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS generate_invite_code();
DROP FUNCTION IF EXISTS expire_old_consultations();
DROP FUNCTION IF EXISTS join_consultation_by_code(TEXT, UUID, TEXT);

-- Function to generate unique 6-character invite code
CREATE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed confusing chars
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM virtual_consultations WHERE invite_code = result) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to expire old consultations
CREATE FUNCTION expire_old_consultations()
RETURNS void AS $$
BEGIN
  UPDATE virtual_consultations
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to join consultation by invite code
CREATE FUNCTION join_consultation_by_code(
  p_invite_code TEXT,
  p_student_id UUID,
  p_student_name TEXT
)
RETURNS TABLE (
  room_url TEXT,
  host_name TEXT,
  consultation_id UUID
) AS $$
DECLARE
  v_consultation virtual_consultations%ROWTYPE;
BEGIN
  -- Find active consultation with invite code
  SELECT * INTO v_consultation
  FROM virtual_consultations
  WHERE invite_code = UPPER(p_invite_code)
    AND status = 'active'
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;
  
  -- Update consultation with student info
  UPDATE virtual_consultations
  SET 
    student_id = p_student_id,
    student_name = p_student_name,
    status = 'in_progress',
    started_at = COALESCE(started_at, NOW())
  WHERE id = v_consultation.id;
  
  -- Return room details
  RETURN QUERY
  SELECT 
    v_consultation.room_url,
    v_consultation.host_name,
    v_consultation.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'virtual_consultations'
ORDER BY ordinal_position;

-- Test invite code generation
SELECT generate_invite_code() as sample_code;
