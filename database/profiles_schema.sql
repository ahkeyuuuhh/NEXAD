-- NEXAD Additional Profiles Schema
-- Separate tables for Student and Teacher specific data
-- Run this in Supabase SQL Editor

-- =============================================
-- STUDENT PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Info
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  student_id VARCHAR(50),
  phone VARCHAR(20),
  profile_photo_url TEXT,
  
  -- Academic Info
  department VARCHAR(100),
  year_level INTEGER CHECK (year_level BETWEEN 1 AND 6),
  course VARCHAR(200),
  section VARCHAR(50),
  
  -- Preferences
  notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- =============================================
-- TEACHER PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS teacher_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Info
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  employee_id VARCHAR(50),
  phone VARCHAR(20),
  profile_photo_url TEXT,
  
  -- Professional Info
  department VARCHAR(100),
  position VARCHAR(100), -- Professor, Instructor, etc.
  expertise_tags TEXT[], -- ['Research', 'Career', 'Mental Health']
  office_location VARCHAR(200),
  office_hours JSONB, -- [{"day": "Monday", "start": "09:00", "end": "12:00"}]
  bio TEXT,
  
  -- Consultation Settings
  max_consultations_per_day INTEGER DEFAULT 8,
  consultation_duration_minutes INTEGER DEFAULT 30,
  average_response_time_hours INTEGER DEFAULT 24,
  is_accepting_consultations BOOLEAN DEFAULT true,
  
  -- Preferences
  notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_student_profiles_user ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_email ON student_profiles(email);
CREATE INDEX IF NOT EXISTS idx_student_profiles_department ON student_profiles(department);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user ON teacher_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_email ON teacher_profiles(email);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_department ON teacher_profiles(department);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;

-- Student Profiles Policies
CREATE POLICY "Students can view their own profile"
  ON student_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students can update their own profile"
  ON student_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their student profile"
  ON student_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can view student profiles"
  ON student_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teacher_profiles WHERE user_id = auth.uid()
    )
  );

-- Teacher Profiles Policies
CREATE POLICY "Teachers can view their own profile"
  ON teacher_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers can update their own profile"
  ON teacher_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their teacher profile"
  ON teacher_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can view teacher profiles"
  ON teacher_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_student_profiles_updated_at ON student_profiles;
CREATE TRIGGER update_student_profiles_updated_at
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teacher_profiles_updated_at ON teacher_profiles;
CREATE TRIGGER update_teacher_profiles_updated_at
  BEFORE UPDATE ON teacher_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- CONSULTATION REQUESTS (Updated for new profiles)
-- =============================================

-- If you need to update consultation_requests to reference new tables:
-- ALTER TABLE consultation_requests 
--   ADD COLUMN student_profile_id UUID REFERENCES student_profiles(id),
--   ADD COLUMN teacher_profile_id UUID REFERENCES teacher_profiles(id);

