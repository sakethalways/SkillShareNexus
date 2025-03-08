/*
  # Fix connection timeout cleanup

  1. Changes
    - Improve cleanup function to be more aggressive
    - Add immediate cleanup check
    - Add additional trigger for periodic cleanup
    - Optimize cleanup performance
*/

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS cleanup_stale_requests_trigger ON connection_requests;
DROP FUNCTION IF EXISTS check_request_timeout();
DROP FUNCTION IF EXISTS cleanup_stale_requests();

-- Enhanced cleanup function with more aggressive timeout handling
CREATE OR REPLACE FUNCTION cleanup_stale_requests() 
RETURNS void AS $$
BEGIN
  -- Delete connection requests that are older than 40 seconds and still searching
  DELETE FROM connection_requests
  WHERE status = 'searching'
  AND created_at < (NOW() - INTERVAL '40 seconds');
  
  -- Also cleanup any orphaned requests (no active connection but status is 'connected')
  DELETE FROM connection_requests
  WHERE status = 'connected'
  AND NOT EXISTS (
    SELECT 1 
    FROM active_connections ac 
    WHERE ac.user1_id = connection_requests.user_id 
    OR ac.user2_id = connection_requests.user_id
  );
END;
$$ LANGUAGE plpgsql;

-- Create a more robust trigger function
CREATE OR REPLACE FUNCTION check_request_timeout()
RETURNS trigger AS $$
BEGIN
  -- Immediately run cleanup
  PERFORM cleanup_stale_requests();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check timeouts after each insert AND update
CREATE TRIGGER cleanup_stale_requests_trigger
  AFTER INSERT OR UPDATE OF status ON connection_requests
  FOR EACH STATEMENT
  EXECUTE FUNCTION check_request_timeout();

-- Run initial cleanup
SELECT cleanup_stale_requests();

-- Ensure index exists for optimized cleanup
DROP INDEX IF EXISTS idx_connection_requests_status;
DROP INDEX IF EXISTS idx_connection_requests_status_created;

CREATE INDEX idx_connection_requests_status 
ON connection_requests(status);

CREATE INDEX idx_connection_requests_status_created 
ON connection_requests(status, created_at)
WHERE status = 'searching';