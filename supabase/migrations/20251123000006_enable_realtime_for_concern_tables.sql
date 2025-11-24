-- Enable realtime updates for concern grouping tables
-- This allows the frontend to receive live updates when concerns are created/updated by the Python backend

-- Add concern table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE concern;

-- Add concern_group table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE concern_group;

-- Add helpful comment
COMMENT ON TABLE concern IS 'Concern grouping table with realtime updates enabled for live dashboard updates';
COMMENT ON TABLE concern_group IS 'Polymorphic join table mapping messages to concerns, with realtime updates enabled';

-- Verify the publication was updated (for debugging)
-- You can run this query to confirm:
-- SELECT schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime'
-- ORDER BY tablename;
