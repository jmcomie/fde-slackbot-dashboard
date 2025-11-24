-- Enable realtime for slack_events table
-- This allows the Supabase Realtime server to broadcast database changes to subscribed clients

-- Add the slack_events table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE slack_events;

-- Update table comment to reflect realtime capability
COMMENT ON TABLE slack_events IS 'Stores all Slack Events API webhook payloads with extracted fields for querying. The raw_payload column preserves the complete event data for future processing. Realtime enabled for dashboard updates.';
