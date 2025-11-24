-- Fix concern_group.grouping_method constraint to include missing values
-- The original constraint was missing 'new_concern' and 'low_similarity' values
-- that are used by the Python backend grouping logic

-- Drop the existing constraint
ALTER TABLE concern_group DROP CONSTRAINT concern_group_grouping_method_check;

-- Recreate with all 8 valid grouping method values
ALTER TABLE concern_group ADD CONSTRAINT concern_group_grouping_method_check
CHECK (grouping_method IN (
  'new_concern',         -- Used when creating a new concern (no similar matches found)
  'thread_match',        -- Matched via same Slack thread_ts
  'cosine_high_conf',    -- High confidence similarity match (>=0.80)
  'cosine_medium_conf',  -- Medium confidence similarity match (>=0.65, <0.80)
  'low_similarity',      -- Low similarity but still tracked (<0.65)
  'exact_duplicate',     -- Exact text match via hash
  'manual',              -- Manually grouped by user
  'initial'              -- Initial/seed concern
));

-- Update comment to reflect all valid values
COMMENT ON COLUMN concern_group.grouping_method IS 'How this message was grouped: new_concern (new), thread_match (same thread), cosine similarity (high/medium/low), exact duplicate, manual, or initial';
