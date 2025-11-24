-- Create bug_events table for manual bug entry via UI
CREATE TABLE IF NOT EXISTS public.bug_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on created_at for efficient ordering
CREATE INDEX idx_bug_events_created_at ON public.bug_events(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.bug_events ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view bug events
CREATE POLICY "Allow read access to bug_events"
    ON public.bug_events
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Policy: Authenticated users can insert bug events
CREATE POLICY "Allow authenticated users to insert bug_events"
    ON public.bug_events
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Only service role can update/delete (for backend processing)
CREATE POLICY "Service role can update bug_events"
    ON public.bug_events
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can delete bug_events"
    ON public.bug_events
    FOR DELETE
    TO service_role
    USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_bug_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bug_events_updated_at
    BEFORE UPDATE ON public.bug_events
    FOR EACH ROW
    EXECUTE FUNCTION update_bug_events_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.bug_events IS 'Stores manually-entered bugs from the web UI that will be processed through the semantic grouping pipeline';
