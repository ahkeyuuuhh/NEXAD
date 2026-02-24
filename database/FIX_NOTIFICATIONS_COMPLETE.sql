-- =============================================
-- FIX NOTIFICATIONS: COMPLETE RLS POLICY FIX
-- Run this ENTIRE script in your Supabase SQL Editor
-- This ensures all notification flows work correctly
-- =============================================

-- ─────────────────────────────────────────────
-- 1. DROP ALL EXISTING NOTIFICATION POLICIES
--    (clean slate to avoid "already exists" errors)
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users mark own notifications as read" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated users to create notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON notifications;

-- ─────────────────────────────────────────────
-- 2. RE-CREATE ALL NOTIFICATION POLICIES
-- ─────────────────────────────────────────────

-- READ: Users can only see their own notifications
CREATE POLICY "Users view own notifications" ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- UPDATE: Users can mark their own notifications as read
CREATE POLICY "Users mark own notifications as read" ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- DELETE: Users can delete their own notifications
CREATE POLICY "Users delete own notifications" ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- INSERT: Any authenticated user can create a notification for ANY user_id.
-- This is REQUIRED so that:
--   • A student can notify a teacher about a new consultation request
--   • A teacher can notify a student about approval / decline / cancel / complete
--   • Either party can notify the other about new messages
CREATE POLICY "Allow authenticated users to create notifications" ON notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────
-- 3. ENSURE NOTIFICATIONS TABLE EXISTS & RLS IS ON
-- ─────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 4. ENSURE PUSH_TOKENS TABLE RLS ALLOWS READS
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Users manage own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can read all push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Allow read push tokens for notifications" ON push_tokens;
DROP POLICY IF EXISTS "Service can read push tokens" ON push_tokens;

-- Each user manages their own tokens
CREATE POLICY "Users manage own push tokens"
  ON push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Any authenticated user can READ push tokens so they can send
-- push notifications to other users (teacher reads student's token, etc.)
CREATE POLICY "Allow read push tokens for notifications"
  ON push_tokens
  FOR SELECT
  USING (auth.role() = 'authenticated');

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 5. QUICK VERIFICATION
-- ─────────────────────────────────────────────
-- Run these SELECT statements to confirm policies were created:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'notifications';
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'push_tokens';
