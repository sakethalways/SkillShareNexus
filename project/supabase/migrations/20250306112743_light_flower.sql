/*
  # Add connection timeout cleanup

  1. Changes
    - Add function to cleanup stale connection requests
    - Add trigger to automatically cleanup old requests
    - Set timeout to 40 seconds for connection requests

  2. Security
    - Maintains existing RLS policies
    - Only affects searching connection requests
*/

-- Function to cleanup old connection requests
CREATE OR REPLACE FUNCTION cleanup_stale_requests() 
RETURNS void AS $$
BEGIN
  -- Delete connection requests that are older than 40 seconds and still searching
  DELETE FROM connection_requests
  WHERE status = 'searching'
  AND created_at < NOW() - INTERVAL '40 seconds';
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to periodically cleanup stale requests
CREATE OR REPLACE FUNCTION check_request_timeout()
RETURNS trigger AS $$
BEGIN
  -- Run cleanup for stale requests
  PERFORM cleanup_stale_requests();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check timeouts after each insert
DROP TRIGGER IF EXISTS cleanup_stale_requests_trigger ON connection_requests;
CREATE TRIGGER cleanup_stale_requests_trigger
  AFTER INSERT ON connection_requests
  FOR EACH STATEMENT
  EXECUTE FUNCTION check_request_timeout();

-- Add an index to optimize the cleanup query
CREATE INDEX IF NOT EXISTS idx_connection_requests_status_created 
ON connection_requests(status, created_at)
WHERE status = 'searching';