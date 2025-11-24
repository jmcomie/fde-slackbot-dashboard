-- Add computed columns for thread context
-- These columns are extracted from the raw_payload JSONB for easier querying

-- Add parent_user_id (only present on thread replies, not on parent messages)
ALTER TABLE slack_events
  ADD COLUMN parent_user_id TEXT
  GENERATED ALWAYS AS (raw_payload->'event'->>'parent_user_id') STORED;

-- Add reply_count (only present on parent messages)
ALTER TABLE slack_events
  ADD COLUMN reply_count INTEGER
  GENERATED ALWAYS AS (
    CASE
      WHEN raw_payload->'event'->>'reply_count' IS NOT NULL
      THEN (raw_payload->'event'->>'reply_count')::INTEGER
      ELSE NULL
    END
  ) STORED;

-- Add is_parent boolean to identify parent messages in threads
ALTER TABLE slack_events
  ADD COLUMN is_parent BOOLEAN
  GENERATED ALWAYS AS (
    CASE
      WHEN thread_ts IS NOT NULL AND thread_ts = message_ts THEN true
      ELSE false
    END
  ) STORED;

-- Create indexes for efficient queries
CREATE INDEX idx_slack_events_parent_user_id
  ON slack_events(parent_user_id)
  WHERE parent_user_id IS NOT NULL;

CREATE INDEX idx_slack_events_is_parent
  ON slack_events(is_parent, thread_ts)
  WHERE is_parent = true;

-- Create index for fetching messages by channel and time range
CREATE INDEX idx_slack_events_channel_time
  ON slack_events(channel_id, message_ts DESC);

-- Comment on columns for documentation
COMMENT ON COLUMN slack_events.parent_user_id IS 'User ID of the thread starter (only present on thread replies)';
COMMENT ON COLUMN slack_events.reply_count IS 'Number of replies in the thread (only present on parent messages)';
COMMENT ON COLUMN slack_events.is_parent IS 'True if this message is the parent of a thread (ts == thread_ts)';
