-- Create slack_events table to store raw Slack webhook payloads
-- This table serves as an immutable audit trail of all Slack events received

CREATE TABLE IF NOT EXISTS slack_events (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Deduplication: Slack's unique event identifier
  event_id TEXT UNIQUE NOT NULL,

  -- Event metadata from Slack webhook wrapper
  event_type TEXT,              -- e.g., "message", "app_mention", etc.
  team_id TEXT,                 -- Slack workspace ID
  api_app_id TEXT,              -- Slack app ID

  -- Message-specific fields (extracted from event payload)
  channel_id TEXT,              -- Channel where event occurred
  user_id TEXT,                 -- User who triggered the event
  message_text TEXT,            -- Message content (for message events)
  message_ts TEXT,              -- Slack message timestamp (unique per channel)
  thread_ts TEXT,               -- Thread timestamp (null if not in thread)

  -- Raw payload for debugging and reprocessing
  raw_payload JSONB NOT NULL,   -- Full Slack webhook JSON payload

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_slack_events_event_id ON slack_events(event_id);
CREATE INDEX IF NOT EXISTS idx_slack_events_thread_ts ON slack_events(thread_ts) WHERE thread_ts IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_slack_events_created_at ON slack_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slack_events_channel_id ON slack_events(channel_id);
CREATE INDEX IF NOT EXISTS idx_slack_events_user_id ON slack_events(user_id);

-- Add comment to table for documentation
COMMENT ON TABLE slack_events IS 'Stores all Slack Events API webhook payloads with extracted fields for querying. The raw_payload column preserves the complete event data for future processing.';

-- Add comments to key columns
COMMENT ON COLUMN slack_events.event_id IS 'Unique identifier from Slack for this specific event (globally unique across all workspaces)';
COMMENT ON COLUMN slack_events.raw_payload IS 'Complete JSON payload from Slack webhook - use for debugging or reprocessing events';
COMMENT ON COLUMN slack_events.thread_ts IS 'Thread timestamp - if present, indicates message is part of a thread';

-- Enable Row Level Security
ALTER TABLE slack_events ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read slack events (needed for dashboard)
CREATE POLICY "slack_events_select_policy"
  ON slack_events
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies = only service role can modify data
