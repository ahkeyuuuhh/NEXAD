-- Fix all foreign key references to auth.users(id)
-- This script:
-- 1. Removes invalid data that would violate foreign key constraints
-- 2. Drops old foreign key constraints
-- 3. Adds new foreign key constraints referencing auth.users(id)

-- =============================================
-- STEP 1: CLEAN UP INVALID DATA
-- =============================================

-- Remove consultation_requests with non-existent student_id
DELETE FROM consultation_requests
WHERE student_id NOT IN (SELECT id FROM auth.users);

-- Remove consultation_requests with non-existent teacher_id
DELETE FROM consultation_requests
WHERE teacher_id NOT IN (SELECT id FROM auth.users);

-- =============================================
-- STEP 2: DROP OLD CONSTRAINTS
-- =============================================

ALTER TABLE consultation_requests 
  DROP CONSTRAINT IF EXISTS consultation_requests_student_id_fkey;

ALTER TABLE consultation_requests 
  DROP CONSTRAINT IF EXISTS consultation_requests_teacher_id_fkey;

-- =============================================
-- STEP 3: ADD NEW CONSTRAINTS
-- =============================================

ALTER TABLE consultation_requests 
  ADD CONSTRAINT consultation_requests_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE consultation_requests 
  ADD CONSTRAINT consultation_requests_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- =============================================
-- UPLOADED DOCUMENTS TABLE
-- =============================================

-- Clean up invalid data
UPDATE uploaded_documents
SET uploaded_by = NULL
WHERE uploaded_by IS NOT NULL 
  AND uploaded_by NOT IN (SELECT id FROM auth.users);

ALTER TABLE uploaded_documents 
  DROP CONSTRAINT IF EXISTS uploaded_documents_uploaded_by_fkey;


-- Clean up invalid data
DELETE FROM messages
WHERE sender_id NOT IN (SELECT id FROM auth.users);

DELETE FROM messages
WHERE recipient_id NOT IN (SELECT id FROM auth.users);

ALTER TABLE uploaded_documents 
  ADD CONSTRAINT uploaded_documents_uploaded_by_fkey 
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- =============================================
-- MESSAGES TABLE
-- =============================================
ALTER TABLE messages 
  DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

ALTER TABLE messages 
  DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;

ALTER TABLE messages 
  ADD CONSTRAINT messages_sender_id_fkey 
  FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Clean up invalid data
DELETE FROM notifications
WHERE user_id NOT IN (SELECT id FROM auth.users);


ALTER TABLE messages 
  ADD CONSTRAINT messages_recipient_id_fkey 
  FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- Clean up invalid data
DELETE FROM classrooms
WHERE teacher_id NOT IN (SELECT id FROM auth.users);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
ALTER TABLE notifications 
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE notifications 
  ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- =============================================
-- CLASSROOMS TABLE
-- =============================================

-- Clean up invalid data
DELETE FROM classroom_memberships
WHERE student_id NOT IN (SELECT id FROM auth.users);

ALTER TABLE classrooms 
  DROP CONSTRAINT IF EXISTS classrooms_teacher_id_fkey;

ALTER TABLE classrooms 
  ADD CONSTRAINT classrooms_teacher_id_fkey 

-- Clean up invalid data
DELETE FROM announcements
WHERE teacher_id NOT IN (SELECT id FROM auth.users);

  FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- =============================================
-- CLASSROOM MEMBERSHIPS TABLE
-- =============================================
ALTER TABLE classroom_memberships 
  DROP CONSTRAINT IF EXISTS classroom_memberships_student_id_fkey;

ALTER TABLE classroom_memberships 
  ADD CONSTRAINT classroom_memberships_student_id_fkey 

-- Clean up invalid data
DELETE FROM attachment_bins
WHERE teacher_id NOT IN (SELECT id FROM auth.users);

  FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- =============================================
-- ANNOUNCEMENTS TABLE
-- =============================================

-- Clean up invalid data
DELETE FROM push_tokens
WHERE user_id NOT IN (SELECT id FROM auth.users);

ALTER TABLE push_tokens 
  DROP CONSTRAINT IF EXISTS push_tokens_user_id_fkey;

ALTER TABLE push_tokens 
  ADD CONSTRAINT push_tokens_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- =============================================
-- DONE! All foreign keys now reference auth.users(id)
-- =============================================DE;

-- =============================================
-- ATTACHMENT BINS TABLE
-- =============================================
ALTER TABLE attachment_bins 
  DROP CONSTRAINT IF EXISTS attachment_bins_teacher_id_fkey;

ALTER TABLE attachment_bins 
  ADD CONSTRAINT attachment_bins_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- =============================================
-- PUSH TOKENS TABLE
-- =============================================
ALTER TABLE push_tokens 
  DROP CONSTRAINT IF EXISTS push_tokens_user_id_fkey;

ALTER TABLE push_tokens 
  ADD CONSTRAINT push_tokens_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
