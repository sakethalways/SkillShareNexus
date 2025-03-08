/*
  # Add indexes and constraints for connection-related tables

  1. Changes
    - Add indexes to optimize connection and message queries
    - Add cascade delete for messages when connection is deleted
    - Add trigger for connection request status updates

  2. Security
    - No security changes (policies already exist)
*/

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_connection_requests_status ON connection_requests(status);
CREATE INDEX IF NOT EXISTS idx_connection_requests_user_id ON connection_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_active_connections_users ON active_connections(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_connection ON messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Add cascade delete for messages
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_connection_id_fkey,
ADD CONSTRAINT messages_connection_id_fkey
  FOREIGN KEY (connection_id)
  REFERENCES active_connections(id)
  ON DELETE CASCADE;

-- Function to handle connection request status updates
CREATE OR REPLACE FUNCTION handle_connection_match()
RETURNS trigger AS $$
BEGIN
  -- If status changed to 'connected', check for matching request
  IF NEW.status = 'connected' AND OLD.status = 'searching' THEN
    -- Find another searching user with matching interests
    WITH potential_match AS (
      SELECT cr.user_id
      FROM connection_requests cr
      WHERE cr.status = 'searching'
        AND cr.user_id != NEW.user_id
        AND EXISTS (
          SELECT 1
          FROM unnest(cr.interests) i1
          WHERE i1 = ANY(NEW.interests)
        )
      LIMIT 1
    )
    INSERT INTO active_connections (user1_id, user2_id)
    SELECT NEW.user_id, pm.user_id
    FROM potential_match pm;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update connection_requests updated_at
CREATE OR REPLACE FUNCTION update_connection_requests_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;