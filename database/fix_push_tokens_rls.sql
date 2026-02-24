-- Fix push_tokens RLS policies
-- Problem: sendPushToUser() reads tokens for OTHER users, which is blocked
--          by default row-level security.
-- Solution:
--   INSERT/UPDATE: users can only manage their own token (secure)
--   SELECT: any authenticated user can read tokens
--           (tokens are non-sensitive push endpoint identifiers)

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can insert own push token"     ON push_tokens;
DROP POLICY IF EXISTS "Users can update own push token"     ON push_tokens;
DROP POLICY IF EXISTS "Users can view own push token"       ON push_tokens;
DROP POLICY IF EXISTS "Authenticated users can read tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can manage own token"          ON push_tokens;

-- Allow a user to INSERT their own token
CREATE POLICY "Users can insert own push token"
  ON push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow a user to UPDATE their own token
CREATE POLICY "Users can update own push token"
  ON push_tokens FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Allow any authenticated user to READ any push token
-- (Required so one user can send a push notification to another user's device)
CREATE POLICY "Authenticated users can read tokens"
  ON push_tokens FOR SELECT
  TO authenticated
  USING (true);

-- Verify
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'push_tokens';
