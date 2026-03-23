-- FINAL FIX: Allow anonymous users to insert contacts
-- This fixes the "new row violates row-level security policy" error

-- First, make sure RLS is enabled
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admin can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admin can delete contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admin can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Enable insert for anon" ON public.contacts;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.contacts;

-- Create INSERT policy for anonymous users (this is the key!)
CREATE POLICY "Enable insert for anon"
    ON public.contacts
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Create INSERT policy for authenticated users
CREATE POLICY "Enable insert for authenticated"
    ON public.contacts
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create SELECT policy for admin only
CREATE POLICY "Admin can view contacts"
    ON public.contacts
    FOR SELECT
    TO authenticated
    USING (
        (SELECT auth.jwt() ->> 'email') = 'nexad.support@gmail.com'
    );

-- Create UPDATE policy for admin only
CREATE POLICY "Admin can update contacts"
    ON public.contacts
    FOR UPDATE
    TO authenticated
    USING (
        (SELECT auth.jwt() ->> 'email') = 'nexad.support@gmail.com'
    )
    WITH CHECK (
        (SELECT auth.jwt() ->> 'email') = 'nexad.support@gmail.com'
    );

-- Create DELETE policy for admin only
CREATE POLICY "Admin can delete contacts"
    ON public.contacts
    FOR DELETE
    TO authenticated
    USING (
        (SELECT auth.jwt() ->> 'email') = 'nexad.support@gmail.com'
    );

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'contacts'
ORDER BY cmd, policyname;
