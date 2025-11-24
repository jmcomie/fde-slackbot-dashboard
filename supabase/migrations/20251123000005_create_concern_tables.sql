-- Create concern and concern_group tables for semantic message grouping
-- These tables enable grouping messages that relate to the same issue across threads and channels

-- =====================================================================
-- CONCERN TABLE
-- =====================================================================
-- Represents a conceptual issue or topic (like a GitHub issue)
-- Each concern is displayed as one item on the dashboard
CREATE TABLE IF NOT EXISTS concern (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification metadata
  category TEXT NOT NULL CHECK (category IN ('bug_report', 'feature_request', 'support_question', 'general_question')),

  -- Semantic grouping data
  -- Stores the centroid (average) embedding of all messages in this concern
  -- 384-dimensional vector from all-MiniLM-L6-v2 model, stored as JSON array
  centroid_embedding JSONB NOT NULL,

  -- Concern metadata
  title TEXT NOT NULL,  -- Auto-generated from first/representative message
  summary TEXT,  -- Optional: aggregated summary of all messages
  message_count INTEGER DEFAULT 1 CHECK (message_count >= 1),

  -- Status tracking
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT CHECK (priority IS NULL OR priority IN ('high', 'medium', 'low')),

  -- Temporal tracking
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Grouping method tracking (for debugging/analytics)
  grouping_method TEXT NOT NULL CHECK (grouping_method IN (
    'new_concern',
    'thread_match',
    'cosine_high_conf',
    'cosine_medium_conf',
    'low_similarity',
    'exact_duplicate',
    'manual'
  )),

  -- Standard timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_concern_category ON concern(category);
CREATE INDEX idx_concern_status ON concern(status);
CREATE INDEX idx_concern_last_updated ON concern(last_updated DESC);
CREATE INDEX idx_concern_first_seen ON concern(first_seen DESC);
CREATE INDEX idx_concern_category_status ON concern(category, status);

-- Add comments for documentation
COMMENT ON TABLE concern IS 'Represents conceptual issues/topics grouping related messages across threads and channels. Each concern is one dashboard item.';
COMMENT ON COLUMN concern.centroid_embedding IS '384-dimensional embedding vector (centroid of all message embeddings) stored as JSON array for semantic similarity matching';
COMMENT ON COLUMN concern.title IS 'Auto-generated title from first or most representative message (max 100 chars)';
COMMENT ON COLUMN concern.grouping_method IS 'Method used to create this concern: thread_match, cosine similarity, exact duplicate, etc.';
COMMENT ON COLUMN concern.message_count IS 'Number of messages grouped into this concern (updated incrementally)';


-- =====================================================================
-- CONCERN_GROUP TABLE
-- =====================================================================
-- Polymorphic join table mapping messages to concerns
-- Supports multiple foreign table types (slack_event, email, jira_comment, etc.)
CREATE TABLE IF NOT EXISTS concern_group (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to concern
  concern_id UUID NOT NULL REFERENCES concern(id) ON DELETE CASCADE,

  -- Polymorphic foreign key pattern
  foreign_table TEXT NOT NULL,  -- e.g., 'slack_event', 'email', 'jira_comment'
  foreign_identifier TEXT NOT NULL,  -- UUID or ID from the foreign table (stored as text for flexibility)

  -- Grouping metadata
  similarity_score FLOAT CHECK (similarity_score IS NULL OR (similarity_score >= 0.0 AND similarity_score <= 1.0)),
  grouping_method TEXT NOT NULL CHECK (grouping_method IN (
    'thread_match',
    'cosine_high_conf',
    'cosine_medium_conf',
    'exact_duplicate',
    'manual',
    'initial'
  )),
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),

  -- Temporal tracking
  grouped_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  -- Ensure each message only belongs to one concern
  UNIQUE(foreign_table, foreign_identifier)
);

-- Indexes for efficient queries
CREATE INDEX idx_concern_group_concern_id ON concern_group(concern_id);
CREATE INDEX idx_concern_group_foreign ON concern_group(foreign_table, foreign_identifier);
CREATE INDEX idx_concern_group_method ON concern_group(grouping_method);
CREATE INDEX idx_concern_group_confidence ON concern_group(confidence);

-- Add comments for documentation
COMMENT ON TABLE concern_group IS 'Polymorphic join table mapping messages from various sources to concerns. One message can only belong to one concern.';
COMMENT ON COLUMN concern_group.foreign_table IS 'Name of the source table (e.g., slack_event, email). Enables extensibility to other data sources.';
COMMENT ON COLUMN concern_group.foreign_identifier IS 'ID/UUID of the record in the foreign table, stored as text for flexibility across different ID types';
COMMENT ON COLUMN concern_group.similarity_score IS 'Cosine similarity score (0.0-1.0) if grouped via embedding similarity. NULL for thread matches or exact duplicates.';
COMMENT ON COLUMN concern_group.grouping_method IS 'How this message was grouped: thread_match (same thread_ts), cosine similarity, exact duplicate, or manual';
COMMENT ON COLUMN concern_group.confidence IS 'Confidence level of the grouping decision: high (>0.88), medium (0.75-0.88), low (<0.75)';


-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
-- Enable RLS for both tables
ALTER TABLE concern ENABLE ROW LEVEL SECURITY;
ALTER TABLE concern_group ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read concerns (needed for dashboard)
CREATE POLICY "concern_select_policy"
  ON concern
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "concern_group_select_policy"
  ON concern_group
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only service role can INSERT/UPDATE/DELETE concerns
-- (Regular users don't create concerns directly - they're created by backend logic)


-- =====================================================================
-- HELPER FUNCTION: Update concern last_updated timestamp
-- =====================================================================
-- Automatically update last_updated when concern is modified
CREATE OR REPLACE FUNCTION update_concern_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_concern_last_updated
  BEFORE UPDATE ON concern
  FOR EACH ROW
  EXECUTE FUNCTION update_concern_last_updated();


-- =====================================================================
-- SAMPLE DATA (for testing)
-- =====================================================================
-- Uncomment to insert sample concerns for development

-- INSERT INTO concern (
--   category,
--   centroid_embedding,
--   title,
--   message_count,
--   grouping_method
-- ) VALUES (
--   'bug_report',
--   '[]'::jsonb, -- Empty embedding for testing
--   'Login button not working on mobile',
--   1,
--   'new_concern'
-- );
