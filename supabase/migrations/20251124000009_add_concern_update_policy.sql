-- Add UPDATE policy for concern table
-- Allows frontend users to update concern status and priority
-- Fixes 406 error when trying to update concern status from the UI

CREATE POLICY "concern_update_policy"
  ON concern
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY concern_update_policy ON concern IS
  'Allows all users to update concern records (status, priority, etc.). Frontend needs this to change ticket status.';
