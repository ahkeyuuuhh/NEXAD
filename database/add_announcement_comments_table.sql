-- Add announcement_comments table for announcement comment functionality
-- This table stores comments on classroom announcements

CREATE TABLE IF NOT EXISTS announcement_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('teacher', 'student')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE announcement_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view announcement comments" ON announcement_comments;
DROP POLICY IF EXISTS "Users can create announcement comments" ON announcement_comments;
DROP POLICY IF EXISTS "Users can delete own announcement comments" ON announcement_comments;

-- RLS Policies
-- Users can view comments on announcements in classrooms they are members of
CREATE POLICY "Users can view announcement comments" ON announcement_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN classrooms c ON a.classroom_id = c.id
      LEFT JOIN classroom_memberships cm ON c.id = cm.classroom_id
      WHERE a.id = announcement_comments.announcement_id
      AND (
        c.teacher_id = auth.uid() OR  -- Teacher of the classroom
        cm.student_id = auth.uid()    -- Student member of the classroom
      )
    )
  );

-- Users can create comments on announcements in classrooms they are members of
CREATE POLICY "Users can create announcement comments" ON announcement_comments
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM announcements a
      JOIN classrooms c ON a.classroom_id = c.id
      LEFT JOIN classroom_memberships cm ON c.id = cm.classroom_id
      WHERE a.id = announcement_comments.announcement_id
      AND (
        c.teacher_id = auth.uid() OR  -- Teacher of the classroom
        cm.student_id = auth.uid()    -- Student member of the classroom
      )
    )
  );

-- Users can delete their own comments
CREATE POLICY "Users can delete own announcement comments" ON announcement_comments
  FOR DELETE USING (auth.uid() = sender_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcement_comments_announcement_id ON announcement_comments(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_comments_sender_id ON announcement_comments(sender_id);
CREATE INDEX IF NOT EXISTS idx_announcement_comments_created_at ON announcement_comments(created_at);

-- Add updated_at trigger
CREATE TRIGGER update_announcement_comments_updated_at 
  BEFORE UPDATE ON announcement_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();