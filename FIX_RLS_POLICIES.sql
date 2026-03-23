-- Fix RLS Policies for Contacts Table
-- This will allow anonymous users to insert contacts

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admin can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admin can delete contacts" ON public.contacts;

-- Recreate policies with correct permissions

-- Allow ANYONE (including anonymous/unauthenticated users) to insert contacts
CREATE POLICY "Anyone can insert contacts"
    ON public.contacts
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Only authenticated admin can view contacts
CREATE POLICY "Admin can view contacts"
    ON public.contacts
    FOR SELECT
    TO authenticated
    USING (
        auth.jwt() ->> 'email' = 'nexad.support@gmail.com'
    );

-- Only authenticated admin can update contacts
CREATE POLICY "Admin can update contacts"
    ON public.contacts
    FOR UPDATE
    TO authenticated
    USING (
        auth.jwt() ->> 'email' = 'nexad.support@gmail.com'
    )
    WITH CHECK (
        auth.jwt() ->> 'email' = 'nexad.support@gmail.com'
    );

-- Only authenticated admin can delete contacts
CREATE POLICY "Admin can delete contacts"
    ON public.contacts
    FOR DELETE
    TO authenticated
    USING (
        auth.jwt() ->> 'email' = 'nexad.support@gmail.com'
    );

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'contacts';
