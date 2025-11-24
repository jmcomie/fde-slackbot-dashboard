-- Fix concern count constraints to allow bug-only or message-only concerns
-- Original constraint: message_count >= 1
-- New constraint: message_count >= 0 AND (message_count + bug_count) >= 1

ALTER TABLE public.concern
DROP CONSTRAINT IF EXISTS concern_message_count_check;

ALTER TABLE public.concern
ADD CONSTRAINT concern_total_count_check CHECK ((message_count + bug_count) >= 1);

-- Add comment
COMMENT ON CONSTRAINT concern_total_count_check ON public.concern IS 'Ensures at least one message or bug is associated with the concern';
