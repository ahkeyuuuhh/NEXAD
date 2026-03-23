-- ============================================
-- NEXAD Real-time Contact System
-- ============================================
-- This creates a complete contact management system with:
-- 1. Contacts table for storing messages
-- 2. Real-time subscriptions for live updates
-- 3. Email notifications to admin
-- 4. Reply functionality
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CREATE CONTACTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    subject TEXT,
    status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived')),
    user_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    admin_notes TEXT
);

-- ============================================
-- 2. CREATE REPLIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.contact_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    admin_email TEXT NOT NULL,
    reply_message TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    email_sent BOOLEAN DEFAULT FALSE,
    email_error TEXT
);

-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON public.contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_contact_replies_contact_id ON public.contact_replies(contact_id);

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_replies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admin can view all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admin can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admin can delete contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admin can insert replies" ON public.contact_replies;
DROP POLICY IF EXISTS "Admin can view replies" ON public.contact_replies;

-- Allow anyone to submit contact forms (insert)
CREATE POLICY "Anyone can insert contacts"
    ON public.contacts
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Only admin can view contacts
CREATE POLICY "Admin can view all contacts"
    ON public.contacts
    FOR SELECT
    TO authenticated
    USING (
        auth.jwt() ->> 'email' = 'nexad.support@gmail.com'
    );

-- Only admin can update contacts
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

-- Only admin can delete contacts
CREATE POLICY "Admin can delete contacts"
    ON public.contacts
    FOR DELETE
    TO authenticated
    USING (
        auth.jwt() ->> 'email' = 'nexad.support@gmail.com'
    );

-- Only admin can insert replies
CREATE POLICY "Admin can insert replies"
    ON public.contact_replies
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.jwt() ->> 'email' = 'nexad.support@gmail.com'
    );

-- Only admin can view replies
CREATE POLICY "Admin can view replies"
    ON public.contact_replies
    FOR SELECT
    TO authenticated
    USING (
        auth.jwt() ->> 'email' = 'nexad.support@gmail.com'
    );

-- ============================================
-- 5. CREATE FUNCTION TO UPDATE TIMESTAMP
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. CREATE TRIGGER FOR AUTO-UPDATE TIMESTAMP
-- ============================================

DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. CREATE FUNCTION TO SEND EMAIL NOTIFICATION
-- ============================================
-- Note: This requires Supabase Edge Functions or external service
-- For now, we'll create a placeholder that logs the notification

CREATE OR REPLACE FUNCTION notify_admin_new_contact()
RETURNS TRIGGER AS $$
BEGIN
    -- This will be handled by the application layer
    -- We just mark that a notification should be sent
    RAISE NOTICE 'New contact received from: % <%>', NEW.name, NEW.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. CREATE TRIGGER FOR NEW CONTACT NOTIFICATION
-- ============================================

DROP TRIGGER IF EXISTS trigger_notify_admin_new_contact ON public.contacts;

CREATE TRIGGER trigger_notify_admin_new_contact
    AFTER INSERT ON public.contacts
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_new_contact();

-- ============================================
-- 9. CREATE FUNCTION TO GET CONTACT STATISTICS
-- ============================================

CREATE OR REPLACE FUNCTION get_contact_statistics()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_contacts', COUNT(*),
        'unread_contacts', COUNT(*) FILTER (WHERE status = 'unread'),
        'read_contacts', COUNT(*) FILTER (WHERE status = 'read'),
        'replied_contacts', COUNT(*) FILTER (WHERE status = 'replied'),
        'archived_contacts', COUNT(*) FILTER (WHERE status = 'archived'),
        'today_contacts', COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE),
        'this_week_contacts', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
        'this_month_contacts', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')
    ) INTO result
    FROM public.contacts;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_contact_statistics() TO authenticated;

-- ============================================
-- 10. CREATE FUNCTION TO MARK CONTACT AS READ
-- ============================================

CREATE OR REPLACE FUNCTION mark_contact_as_read(contact_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.contacts
    SET 
        status = 'read',
        read_at = NOW()
    WHERE id = contact_id
    AND status = 'unread';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION mark_contact_as_read(UUID) TO authenticated;

-- ============================================
-- 11. ENABLE REALTIME FOR CONTACTS TABLE
-- ============================================

-- Enable realtime for the contacts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_replies;

-- ============================================
-- 12. CREATE VIEW FOR CONTACT SUMMARY
-- ============================================

CREATE OR REPLACE VIEW contact_summary AS
SELECT 
    c.id,
    c.name,
    c.email,
    c.subject,
    c.status,
    c.created_at,
    c.read_at,
    c.replied_at,
    COUNT(r.id) as reply_count,
    MAX(r.sent_at) as last_reply_at
FROM public.contacts c
LEFT JOIN public.contact_replies r ON c.id = r.contact_id
GROUP BY c.id, c.name, c.email, c.subject, c.status, c.created_at, c.read_at, c.replied_at
ORDER BY c.created_at DESC;

-- Grant select permission on view
GRANT SELECT ON contact_summary TO authenticated;

-- ============================================
-- SETUP COMPLETE
-- ============================================

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '✅ Contact system setup complete!';
    RAISE NOTICE '📊 Tables created: contacts, contact_replies';
    RAISE NOTICE '🔒 RLS policies enabled';
    RAISE NOTICE '⚡ Realtime enabled';
    RAISE NOTICE '📧 Admin email: nexad.support@gmail.com';
END $$;
