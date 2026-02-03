-- NEXAD Database Schema
-- AI-Enhanced Consultation System
-- Supabase PostgreSQL Database

-- =============================================
-- ENABLE REQUIRED EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ENUMS
-- =============================================

-- User role types
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');

-- Consultation request status
CREATE TYPE consultation_status AS ENUM (
  'pending',           -- Initial submission
  'ai_processing',     -- AI analyzing documents
  'awaiting_teacher',  -- Ready for teacher review
  'accepted',          -- Teacher accepted
  'declined',          -- Teacher declined
  'completed',         -- Consultation finished
  'cancelled'          -- Cancelled by student
);

-- Consultation topic categories
CREATE TYPE consultation_topic AS ENUM (
  'academic',
  'career',
  'personal',
  'administrative',
  'research',
  'mental_health'
);

-- Urgency levels
CREATE TYPE urgency_level AS ENUM ('normal', 'urgent');

-- Notification types
CREATE TYPE notification_type AS ENUM (
  'request_submitted',
  'request_accepted',
  'request_declined',
  'consultation_reminder',
  'new_message',
  'classroom_announcement',
  'attachment_bin_created',
  'document_uploaded',
  'ai_brief_ready'
);

-- Message types
CREATE TYPE message_type AS ENUM (
  'consultation_chat',
  'announcement_reply',
  'teacher_inquiry'
);

-- =============================================
-- CORE TABLES
-- =============================================

-- Users Table (Students, Teachers, Admins)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  department VARCHAR(100),
  profile_photo_url TEXT,
  
  -- Teacher-specific fields
  expertise_tags TEXT[], -- ['Research', 'Career', 'Mental Health']
  office_hours TEXT,
  bio TEXT,
  average_response_time_hours INTEGER DEFAULT 0,
  
  -- Student-specific fields
  student_id VARCHAR(50),
  year_level INTEGER,
  
  -- Preferences
  notification_preferences JSONB DEFAULT '{"email": true, "push": true}',
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Consultation Requests Table
CREATE TABLE consultation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Participants
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Request details
  topic consultation_topic NOT NULL,
  subject_line VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  urgency urgency_level DEFAULT 'normal',
  status consultation_status DEFAULT 'pending',
  
  -- AI-generated fields
  ai_extracted_keywords TEXT[],
  ai_clarification_questions TEXT[],
  ai_suggested_documents TEXT[],
  
  -- Scheduling
  preferred_time_slots JSONB, -- [{"start": "2026-02-10T14:00:00Z", "end": "2026-02-10T15:00:00Z"}]
  scheduled_start_time TIMESTAMP WITH TIME ZONE,
  scheduled_end_time TIMESTAMP WITH TIME ZONE,
  
  -- Status tracking
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ai_processed_at TIMESTAMP WITH TIME ZONE,
  teacher_reviewed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Teacher response
  teacher_notes TEXT,
  decline_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Smart Briefs Table
CREATE TABLE ai_smart_briefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_request_id UUID UNIQUE REFERENCES consultation_requests(id) ON DELETE CASCADE,
  
  -- AI Analysis Results
  summary TEXT NOT NULL,
  key_points TEXT[] NOT NULL,
  student_concerns TEXT[] NOT NULL,
  document_summaries JSONB, -- [{"file_name": "thesis.pdf", "summary": "...", "page_references": [1,3,5]}]
  consultation_history_pattern TEXT,
  suggested_prep_materials TEXT[],
  estimated_consultation_duration_minutes INTEGER,
  
  -- Processing metadata
  ai_model_version VARCHAR(50) DEFAULT 'gpt-3.5-turbo',
  processing_time_seconds INTEGER,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  
  -- Timestamps
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Uploaded Documents Table
CREATE TABLE uploaded_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_request_id UUID REFERENCES consultation_requests(id) ON DELETE CASCADE,
  attachment_bin_id UUID REFERENCES attachment_bins(id) ON DELETE CASCADE,
  
  -- File details
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(10) NOT NULL, -- 'pdf', 'docx'
  file_size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL, -- Supabase storage path
  
  -- AI extraction
  extracted_text TEXT,
  text_extraction_success BOOLEAN DEFAULT false,
  extraction_error TEXT,
  
  -- Metadata
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- Classrooms Table
CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Classroom details
  name VARCHAR(200) NOT NULL,
  description TEXT,
  invite_code VARCHAR(6) UNIQUE NOT NULL, -- 6-digit alphanumeric code
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 100,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classroom Memberships Table
CREATE TABLE classroom_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Metadata
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(classroom_id, student_id)
);

-- Announcements Table
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Content
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_pinned BOOLEAN DEFAULT false
);

-- Attachment Bins Table (for pre-consultation document collection)
CREATE TABLE attachment_bins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Bin details
  title VARCHAR(200) NOT NULL,
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  
  -- File restrictions
  allowed_file_types VARCHAR(50)[] DEFAULT ARRAY['pdf', 'docx'],
  max_file_size_mb INTEGER DEFAULT 10,
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  require_ai_analysis BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages Table (Unified messaging system)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Participants
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Message context
  message_type message_type NOT NULL,
  consultation_request_id UUID REFERENCES consultation_requests(id) ON DELETE CASCADE,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL,
  attached_file_ids UUID[], -- References to uploaded_documents
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification details
  type notification_type NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  
  -- Related entities
  consultation_request_id UUID REFERENCES consultation_requests(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  
  -- Action URL (deep link)
  action_url TEXT,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Push Notification Tokens Table (for Expo Push Notifications)
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_name VARCHAR(100),
  device_os VARCHAR(20), -- 'ios', 'android'
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Consultation History Archive Table
CREATE TABLE consultation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_request_id UUID NOT NULL REFERENCES consultation_requests(id) ON DELETE CASCADE,
  
  -- Archive data
  teacher_final_notes TEXT,
  shared_resources JSONB, -- [{"name": "resource.pdf", "url": "..."}]
  student_feedback_rating INTEGER CHECK (student_feedback_rating BETWEEN 1 AND 5),
  student_feedback_text TEXT,
  
  -- Metadata
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);

-- Consultation Requests
CREATE INDEX idx_consultation_student ON consultation_requests(student_id);
CREATE INDEX idx_consultation_teacher ON consultation_requests(teacher_id);
CREATE INDEX idx_consultation_status ON consultation_requests(status);
CREATE INDEX idx_consultation_scheduled_time ON consultation_requests(scheduled_start_time);

-- Documents
CREATE INDEX idx_documents_consultation ON uploaded_documents(consultation_request_id);
CREATE INDEX idx_documents_attachment_bin ON uploaded_documents(attachment_bin_id);

-- Classrooms
CREATE INDEX idx_classroom_teacher ON classrooms(teacher_id);
CREATE INDEX idx_classroom_invite_code ON classrooms(invite_code);

-- Memberships
CREATE INDEX idx_membership_classroom ON classroom_memberships(classroom_id);
CREATE INDEX idx_membership_student ON classroom_memberships(student_id);

-- Messages
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_consultation ON messages(consultation_request_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_smart_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachment_bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_history ENABLE ROW LEVEL SECURITY;

-- Users: Can view own profile and teacher profiles
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view teacher profiles" ON users
  FOR SELECT USING (role = 'teacher' AND is_active = true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Consultation Requests: Students see own, teachers see assigned to them
CREATE POLICY "Students view own consultation requests" ON consultation_requests
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Teachers view assigned consultation requests" ON consultation_requests
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Students create consultation requests" ON consultation_requests
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers update assigned requests" ON consultation_requests
  FOR UPDATE USING (auth.uid() = teacher_id);

-- AI Smart Briefs: Only teachers can view their briefs
CREATE POLICY "Teachers view AI briefs for their consultations" ON ai_smart_briefs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM consultation_requests cr
      WHERE cr.id = ai_smart_briefs.consultation_request_id
      AND cr.teacher_id = auth.uid()
    )
  );

-- Messages: Users can view messages they sent or received
CREATE POLICY "Users view own messages" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users mark messages as read" ON messages
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Notifications: Users can only view their own notifications
CREATE POLICY "Users view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users mark own notifications as read" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Classrooms: Teachers manage, students view joined classrooms
CREATE POLICY "Teachers manage own classrooms" ON classrooms
  FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "Students view classrooms they joined" ON classrooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classroom_memberships cm
      WHERE cm.classroom_id = classrooms.id
      AND cm.student_id = auth.uid()
    )
  );

-- Classroom Memberships: Students manage own memberships
CREATE POLICY "Students view own memberships" ON classroom_memberships
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students join classrooms" ON classroom_memberships
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Announcements: Teachers create, members view
CREATE POLICY "Teachers create announcements" ON announcements
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Classroom members view announcements" ON announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classroom_memberships cm
      WHERE cm.classroom_id = announcements.classroom_id
      AND cm.student_id = auth.uid()
    )
    OR auth.uid() = teacher_id
  );

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consultation_requests_updated_at BEFORE UPDATE ON consultation_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_smart_briefs_updated_at BEFORE UPDATE ON ai_smart_briefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON classrooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate random 6-digit invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude ambiguous chars
  result VARCHAR(6) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate invite code on classroom creation
CREATE OR REPLACE FUNCTION set_classroom_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM classrooms WHERE invite_code = NEW.invite_code) LOOP
      NEW.invite_code := generate_invite_code();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER classroom_invite_code_trigger BEFORE INSERT ON classrooms
  FOR EACH ROW EXECUTE FUNCTION set_classroom_invite_code();

-- =============================================
-- VIEWS FOR ANALYTICS
-- =============================================

-- View: Consultation Request Summary by Department
CREATE VIEW consultation_requests_by_department AS
SELECT 
  u.department,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN cr.status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN cr.urgency = 'urgent' THEN 1 END) as urgent_requests,
  AVG(EXTRACT(EPOCH FROM (cr.teacher_reviewed_at - cr.submitted_at))/3600) as avg_response_time_hours
FROM consultation_requests cr
JOIN users u ON cr.teacher_id = u.id
WHERE u.role = 'teacher'
GROUP BY u.department;

-- View: Popular Consultation Topics
CREATE VIEW popular_consultation_topics AS
SELECT 
  topic,
  COUNT(*) as request_count,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
  ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - submitted_at))/86400), 2) as avg_days_to_complete
FROM consultation_requests
GROUP BY topic
ORDER BY request_count DESC;

-- View: Teacher Performance Metrics
CREATE VIEW teacher_performance_metrics AS
SELECT 
  u.id as teacher_id,
  u.first_name || ' ' || u.last_name as teacher_name,
  u.department,
  COUNT(cr.id) as total_requests,
  COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as completed_consultations,
  COUNT(CASE WHEN cr.status = 'declined' THEN 1 END) as declined_requests,
  ROUND(
    AVG(CASE 
      WHEN cr.status = 'completed' 
      THEN EXTRACT(EPOCH FROM (cr.teacher_reviewed_at - cr.submitted_at))/3600 
    END), 2
  ) as avg_response_time_hours,
  ROUND(
    COUNT(CASE WHEN cr.status = 'completed' THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(cr.id), 0) * 100, 2
  ) as completion_rate_percent
FROM users u
LEFT JOIN consultation_requests cr ON u.id = cr.teacher_id
WHERE u.role = 'teacher'
GROUP BY u.id, u.first_name, u.last_name, u.department;

-- =============================================
-- SEED DATA FOR DEMO
-- =============================================

-- Insert Demo Admin
INSERT INTO users (email, password_hash, role, first_name, last_name, department) VALUES
('admin@university.edu', crypt('admin123', gen_salt('bf')), 'admin', 'System', 'Administrator', 'IT Services');

-- Insert Demo Teachers
INSERT INTO users (email, password_hash, role, first_name, last_name, department, expertise_tags, office_hours, bio) VALUES
('prof.santos@university.edu', crypt('teacher123', gen_salt('bf')), 'teacher', 'Maria', 'Santos', 'Computer Science', 
  ARRAY['Research', 'Career', 'Academic'], 'Mon-Wed 2-4 PM', 'Assistant Professor specializing in AI and Machine Learning'),
('dr.chen@university.edu', crypt('teacher123', gen_salt('bf')), 'teacher', 'David', 'Chen', 'Mathematics', 
  ARRAY['Academic', 'Research'], 'Tue-Thu 10-12 PM', 'Associate Professor in Applied Mathematics'),
('prof.williams@university.edu', crypt('teacher123', gen_salt('bf')), 'teacher', 'Sarah', 'Williams', 'Psychology', 
  ARRAY['Mental Health', 'Personal', 'Career'], 'Mon-Fri 1-3 PM', 'Clinical Psychologist and Career Counselor');

-- Insert Demo Students
INSERT INTO users (email, password_hash, role, first_name, last_name, department, student_id, year_level) VALUES
('john.doe@student.edu', crypt('student123', gen_salt('bf')), 'student', 'John', 'Doe', 'Computer Science', 'CS-2024-001', 3),
('jane.smith@student.edu', crypt('student123', gen_salt('bf')), 'student', 'Jane', 'Smith', 'Computer Science', 'CS-2024-002', 2),
('mike.johnson@student.edu', crypt('student123', gen_salt('bf')), 'student', 'Mike', 'Johnson', 'Mathematics', 'MATH-2024-003', 4);

-- Note: In production, use proper password hashing on the application layer
-- The above uses PostgreSQL's crypt function for demonstration

COMMENT ON DATABASE postgres IS 'NEXAD - AI-Enhanced Consultation System Database';
