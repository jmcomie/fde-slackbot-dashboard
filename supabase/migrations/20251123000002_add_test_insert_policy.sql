-- Add INSERT policy for test/demo purposes
-- WARNING: This allows anonymous users to insert data - only use in development/demo environments

CREATE POLICY "slack_events_insert_policy"
  ON slack_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Add comment explaining this is for testing
COMMENT ON POLICY "slack_events_insert_policy" ON slack_events IS
  'Allows insertion of test messages for demo purposes. Should be restricted or removed in production.';
