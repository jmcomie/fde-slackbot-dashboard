-- Enable realtime for bug_events table so UI gets live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.bug_events;

-- Add comment for documentation
COMMENT ON TABLE public.bug_events IS 'Stores manually-entered bugs from the web UI. Realtime enabled for live UI updates.';
