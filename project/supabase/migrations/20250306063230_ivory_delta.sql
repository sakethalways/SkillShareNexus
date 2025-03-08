/*
  # Add Connection System Tables

  1. New Tables
    - `connection_requests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `nickname` (text)
      - `location` (text)
      - `interests` (text[])
      - `status` (text) - 'searching' or 'connected'
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `active_connections`
      - `id` (uuid, primary key) 
      - `user1_id` (uuid, references profiles)
      - `user2_id` (uuid, references profiles)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Connection Requests table
CREATE TABLE IF NOT EXISTS connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nickname text NOT NULL,
  location text NOT NULL,
  interests text[] NOT NULL,
  status text NOT NULL CHECK (status IN ('searching', 'connected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;

-- Policies for connection_requests
CREATE POLICY "Users can create their own connection request"
  ON connection_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own connection request"
  ON connection_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

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

-- Active Connections table
CREATE TABLE IF NOT EXISTS active_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user1_id),
  UNIQUE (user2_id)
);

ALTER TABLE active_connections ENABLE ROW LEVEL SECURITY;

-- Policies for active_connections
CREATE POLICY "Users can view their own connections"
  ON active_connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (user1_id, user2_id));

CREATE POLICY "Users can create connections they are part of"
  ON active_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (user1_id, user2_id));

CREATE POLICY "Users can delete connections they are part of"
  ON active_connections
  FOR DELETE
  TO authenticated
  USING (auth.uid() IN (user1_id, user2_id));

-- Update trigger for connection_requests
CREATE OR REPLACE FUNCTION update_connection_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_connection_requests_updated_at
  BEFORE UPDATE ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_connection_requests_updated_at();

-- Update trigger for active_connections
CREATE OR REPLACE FUNCTION update_active_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_active_connections_updated_at
  BEFORE UPDATE ON active_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_active_connections_updated_at();