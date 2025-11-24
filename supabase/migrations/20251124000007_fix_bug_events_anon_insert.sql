-- Fix bug_events INSERT policy to allow anonymous users
-- Matches the pattern used in slack_events table for consistency

-- Drop existing authenticated-only policy
DROP POLICY IF EXISTS "Allow authenticated users to insert bug_events" ON public.bug_events;

-- Replace with anon + authenticated policy
CREATE POLICY "Allow insert access to bug_events"
    ON public.bug_events
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Update comment
COMMENT ON POLICY "Allow insert access to bug_events" ON public.bug_events IS
    'Allows both anonymous and authenticated users to insert bugs for demo/testing purposes.';
