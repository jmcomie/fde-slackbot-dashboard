-- Add bug_count column to track bugs separately from slack messages
ALTER TABLE public.concern
ADD COLUMN bug_count INTEGER DEFAULT 0 CHECK (bug_count >= 0);

-- Add index for efficient queries filtering by bug_count
CREATE INDEX idx_concern_bug_count ON public.concern(bug_count);

-- Add comment for documentation
COMMENT ON COLUMN public.concern.bug_count IS 'Number of manually-entered bugs grouped into this concern (tracked separately from message_count)';
