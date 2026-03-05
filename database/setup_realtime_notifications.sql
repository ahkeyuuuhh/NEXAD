-- ============================================================
-- NEXAD: Enable Realtime on the notifications table
-- Run this ONCE in Supabase SQL Editor.
-- ============================================================

-- 1. Allow Supabase Realtime to stream full row data for UPDATE/DELETE
--    (INSERT events don't strictly need this, but it ensures UPDATE
--    events deliver the new IS_READ=true state correctly too.)
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 2. Add the notifications table to the realtime publication
--    (only if it isn't already there — safe to re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
