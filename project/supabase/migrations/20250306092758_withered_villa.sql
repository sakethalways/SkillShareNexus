/*
  # Add matching logic and messages table

  1. New Tables
    - `messages`: Stores chat messages between connected users
  
  2. New Functions
    - `find_potential_match`: Finds potential matches based on location and interests
    - `handle_connection_match`: Processes new connection requests and attempts matching

  3. Security
    - Enable RLS on messages table
    - Add policies for message access control
*/

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES active_connections(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Function to find potential matches
CREATE OR REPLACE FUNCTION find_potential_match(request_id UUID)
RETURNS UUID AS $$
DECLARE
  matching_request_id UUID;
  current_request RECORD;
BEGIN
  -- Get the current request details
  SELECT * INTO current_request 
  FROM connection_requests 
  WHERE id = request_id;

  -- Find potential match based on:
  -- 1. Status is 'searching'
  -- 2. Different user than current request
  -- 3. Same location (case insensitive)
  -- 4. Has at least one matching interest
  SELECT cr.id INTO matching_request_id
  FROM connection_requests cr
  WHERE cr.status = 'searching'
    AND cr.user_id != current_request.user_id
    AND LOWER(cr.location) = LOWER(current_request.location)
    AND cr.interests && current_request.interests
    AND NOT EXISTS (
      -- Ensure users haven't been connected before
      SELECT 1 FROM active_connections ac
      WHERE (ac.user1_id = cr.user_id AND ac.user2_id = current_request.user_id)
         OR (ac.user1_id = current_request.user_id AND ac.user2_id = cr.user_id)
    )
  ORDER BY 
    -- Prioritize requests with more matching interests
    ARRAY_LENGTH(ARRAY(
      SELECT UNNEST(cr.interests) 
      INTERSECT 
      SELECT UNNEST(current_request.interests)
    ), 1) DESC,
    cr.created_at ASC
  LIMIT 1;

  RETURN matching_request_id;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new connection matches
CREATE OR REPLACE FUNCTION handle_connection_match() 
RETURNS TRIGGER AS $$
DECLARE
  matching_request_id UUID;
BEGIN
  -- Only process new 'searching' requests
  IF NEW.status = 'searching' THEN
    -- Find a potential match
    matching_request_id := find_potential_match(NEW.id);
    
    -- If match found, create connection
    IF matching_request_id IS NOT NULL THEN
      -- Create active connection
      INSERT INTO active_connections (user1_id, user2_id)
      SELECT 
        LEAST(NEW.user_id, (SELECT user_id FROM connection_requests WHERE id = matching_request_id)),
        GREATEST(NEW.user_id, (SELECT user_id FROM connection_requests WHERE id = matching_request_id));
      
      -- Update both requests to 'connected'
      UPDATE connection_requests
      SET status = 'connected'
      WHERE id IN (NEW.id, matching_request_id);

      -- Notify both users
      PERFORM pg_notify(
        'connection_updates',
        json_build_object(
          'type', 'new_connection',
          'request_id', NEW.id,
          'matching_request_id', matching_request_id
        )::text
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new connection requests
DROP TRIGGER IF EXISTS connection_request_trigger ON connection_requests;
CREATE TRIGGER connection_request_trigger
  AFTER INSERT OR UPDATE OF status
  ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_connection_match();

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for messages
CREATE POLICY "Users can read messages in their connections"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM active_connections ac
      WHERE messages.connection_id = ac.id
      AND (ac.user1_id = auth.uid() OR ac.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their connections"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM active_connections ac
      WHERE messages.connection_id = ac.id
      AND (ac.user1_id = auth.uid() OR ac.user2_id = auth.uid())
    )
  );

-- Add updated_at trigger for messages
CREATE TRIGGER set_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();