/*
  # Add Connection Request Constraints
  
  1. Changes
    - Add unique constraint on user_id for connection_requests
    - Add check constraint to prevent self-connections
    - Add function to cleanup old messages
    
  2. Security
    - Additional validation for connections
*/

-- Add unique constraint to prevent multiple requests from same user
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_request'
  ) THEN
    ALTER TABLE connection_requests
    ADD CONSTRAINT unique_user_request UNIQUE (user_id);
  END IF;
END $$;

-- Add check constraint to prevent self-connections
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'no_self_connection'
  ) THEN
    ALTER TABLE active_connections
    ADD CONSTRAINT no_self_connection 
    CHECK (user1_id != user2_id);
  END IF;
END $$;

-- Function to cleanup old messages
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS trigger AS $$
BEGIN
  -- Delete messages older than 30 days
  DELETE FROM messages 
  WHERE created_at < NOW() - INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to cleanup messages periodically
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'cleanup_messages_trigger'
  ) THEN
    CREATE TRIGGER cleanup_messages_trigger
      AFTER INSERT ON messages
      EXECUTE FUNCTION cleanup_old_messages();
  END IF;
END $$;