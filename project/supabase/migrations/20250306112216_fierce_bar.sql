/*
  # Update connection policies and constraints

  1. Changes
    - Add constraint to prevent multiple active connection requests per user
    - Add constraint to prevent users from having multiple active connections
    - Update connection request policies to enforce these rules
    - Add check for previous connections before allowing new requests

  2. Security
    - Updated policies to enforce connection limits
    - Added validation for connection history
*/

-- Function to check if a user has had a recent connection
CREATE OR REPLACE FUNCTION check_recent_connections(user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if user has disconnected from a connection within the last 24 hours
  RETURN EXISTS (
    SELECT 1 
    FROM active_connections_history
    WHERE (user1_id = user_id OR user2_id = user_id)
    AND ended_at > NOW() - INTERVAL '24 hours'
  );
END;
$$ LANGUAGE plpgsql;

-- Create table to track connection history
CREATE TABLE IF NOT EXISTS active_connections_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_connection_history CHECK (user1_id <> user2_id)
);

-- Add indexes for connection history queries
CREATE INDEX IF NOT EXISTS idx_connections_history_user1 ON active_connections_history(user1_id);
CREATE INDEX IF NOT EXISTS idx_connections_history_user2 ON active_connections_history(user2_id);
CREATE INDEX IF NOT EXISTS idx_connections_history_ended_at ON active_connections_history(ended_at);

-- Function to handle connection endings
CREATE OR REPLACE FUNCTION log_connection_end()
RETURNS trigger AS $$
BEGIN
  INSERT INTO active_connections_history (user1_id, user2_id, started_at, ended_at)
  VALUES (OLD.user1_id, OLD.user2_id, OLD.created_at, now());
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to log ended connections
DROP TRIGGER IF EXISTS connection_end_trigger ON active_connections;
CREATE TRIGGER connection_end_trigger
  AFTER DELETE ON active_connections
  FOR EACH ROW
  EXECUTE FUNCTION log_connection_end();

-- Update connection request policies
DO $$
BEGIN
    -- Safely drop the policy if it exists
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'connection_requests' 
        AND policyname = 'Users can create their own connection request'
    ) THEN
        DROP POLICY "Users can create their own connection request" ON connection_requests;
    END IF;
END $$;

CREATE POLICY "Users can create their own connection request"
  ON connection_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uid() = user_id
    AND NOT check_recent_connections(uid())
    AND NOT EXISTS (
      SELECT 1 FROM connection_requests
      WHERE user_id = uid() AND status = 'searching'
    )
    AND NOT EXISTS (
      SELECT 1 FROM active_connections
      WHERE user1_id = uid() OR user2_id = uid()
    )
  );

-- Update active connections policies
DO $$
BEGIN
    -- Safely drop the policy if it exists
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'active_connections' 
        AND policyname = 'Users can create connections they are part of'
    ) THEN
        DROP POLICY "Users can create connections they are part of" ON active_connections;
    END IF;
END $$;

CREATE POLICY "Users can create connections they are part of"
  ON active_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (uid() = user1_id OR uid() = user2_id)
    AND NOT EXISTS (
      SELECT 1 FROM active_connections
      WHERE user1_id IN (user1_id, user2_id)
      OR user2_id IN (user1_id, user2_id)
    )
  );

-- Add RLS to connection history
ALTER TABLE active_connections_history ENABLE ROW LEVEL SECURITY;

-- Add policies for connection history
CREATE POLICY "Users can view their connection history"
  ON active_connections_history
  FOR SELECT
  TO authenticated
  USING (uid() = user1_id OR uid() = user2_id);

-- Update the connection match handler to check for existing connections
CREATE OR REPLACE FUNCTION handle_connection_match()
RETURNS trigger AS $$
BEGIN
  -- If status changed to 'connected' and no active connection exists
  IF NEW.status = 'connected' 
     AND OLD.status = 'searching'
     AND NOT EXISTS (
       SELECT 1 FROM active_connections
       WHERE user1_id = NEW.user_id OR user2_id = NEW.user_id
     )
  THEN
    -- Find another searching user with matching interests
    WITH potential_match AS (
      SELECT cr.user_id
      FROM connection_requests cr
      WHERE cr.status = 'searching'
        AND cr.user_id != NEW.user_id
        AND NOT EXISTS (
          SELECT 1 FROM active_connections
          WHERE user1_id = cr.user_id OR user2_id = cr.user_id
        )
        AND NOT check_recent_connections(cr.user_id)
        AND EXISTS (
          SELECT 1
          FROM unnest(cr.interests) i1
          WHERE i1 = ANY(NEW.interests)
        )
      ORDER BY cr.created_at ASC
      LIMIT 1
    )
    INSERT INTO active_connections (user1_id, user2_id)
    SELECT NEW.user_id, pm.user_id
    FROM potential_match pm;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;