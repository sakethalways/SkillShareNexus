/*
  # Connection System Schema

  1. New Tables
    - `connection_requests`
      - For storing user connection requests and matching preferences
    - `active_connections` 
      - For tracking active connections between users
    - `messages`
      - For storing chat messages between connected users
    
  2. Functions
    - `find_potential_match`: Finds matching connection requests
    - `handle_connection_match`: Handles the connection matching process
    
  3. Security
    - RLS policies for all tables
    - Secure access patterns for messages and connections
*/

-- Create connection_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  location TEXT NOT NULL,
  interests TEXT[] NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('searching', 'connected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create active_connections table if it doesn't exist
CREATE TABLE IF NOT EXISTS active_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_connection UNIQUE (user1_id, user2_id)
);

-- Create messages table if it doesn't exist
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

-- Enable RLS on all tables
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own connection request" ON connection_requests;
DROP POLICY IF EXISTS "Users can create their own connection request" ON connection_requests;
DROP POLICY IF EXISTS "Users can update their own connection request" ON connection_requests;
DROP POLICY IF EXISTS "Users can delete their own connection request" ON connection_requests;
DROP POLICY IF EXISTS "Users can view their connections" ON active_connections;
DROP POLICY IF EXISTS "Users can delete their connections" ON active_connections;
DROP POLICY IF EXISTS "Users can read messages in their connections" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in their connections" ON messages;

-- RLS policies for connection_requests
CREATE POLICY "Users can view their own connection request"
  ON connection_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own connection request"
  ON connection_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connection request"
  ON connection_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connection request"
  ON connection_requests
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS policies for active_connections
CREATE POLICY "Users can view their connections"
  ON active_connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can delete their connections"
  ON active_connections
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- RLS policies for messages
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_connection_requests_user_id ON connection_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_status ON connection_requests(status);
CREATE INDEX IF NOT EXISTS idx_active_connections_users ON active_connections(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_connection ON messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);