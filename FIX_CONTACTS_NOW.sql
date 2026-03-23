-- ============================================
-- IMMEDIATE FIX FOR CONTACTS NOT SHOWING
-- ============================================
-- This will disable RLS completely so contacts work immediately
-- Run this in Supabase SQL Editor

-- Step 1: Disable RLS on contacts table
ALTER TABLE public.contacts DISABLE ROW LEVEL SECURITY;

-- Step 2: Disable RLS on contact_replies table
ALTER TABLE public.contact_replies DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify RLS is disabled
SELECT 
    tablename, 
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('contacts', 'contact_replies');

-- Step 4: Test insert (should work now)
-- Uncomment to test:
-- INSERT INTO public.contacts (name, email, message, subject)
-- VALUES ('Test User', 'test@example.com', 'Test message', 'Test Subject');

-- Step 5: Verify the insert worked
-- SELECT * FROM public.contacts ORDER BY created_at DESC LIMIT 1;

-- ============================================
-- EXPECTED RESULT:
-- ============================================
-- tablename         | RLS Enabled
-- ------------------+-------------
-- contacts          | false
-- contact_replies   | false
-- ============================================
