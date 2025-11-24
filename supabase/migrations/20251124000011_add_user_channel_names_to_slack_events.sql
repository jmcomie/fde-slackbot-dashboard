-- Add human-readable name columns to slack_events table
-- These are resolved from Slack API when processing webhook events

ALTER TABLE public.slack_events
ADD COLUMN user_name TEXT,
ADD COLUMN channel_name TEXT;

-- Add indexes for filtering/searching by names
CREATE INDEX idx_slack_events_user_name ON public.slack_events(user_name) WHERE user_name IS NOT NULL;
CREATE INDEX idx_slack_events_channel_name ON public.slack_events(channel_name) WHERE user_name IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.slack_events.user_name IS 'Human-readable username resolved from Slack API (e.g., "John Doe"). Falls back to user_id if resolution fails.';
COMMENT ON COLUMN public.slack_events.channel_name IS 'Human-readable channel name resolved from Slack API (e.g., "support"). Falls back to channel_id if resolution fails.';
