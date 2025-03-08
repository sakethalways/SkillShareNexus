/*
  # Enhance connection cleanup mechanism

  1. Changes
    - Add periodic cleanup function
    - Improve timeout detection
    - Add row-level trigger for immediate cleanup
    - Add connection status tracking
*/

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS cleanup_stale_requests_trigger ON connection_requests;
DROP FUNCTION IF EXISTS check_request_timeout();
DROP FUNCTION IF EXISTS cleanup_stale_requests();

-- Add last_activity column to track request freshness
ALTER TABLE connection_requests 
ADD COLUMN IF NOT EXISTS last_activity timestamptz DEFAULT now();

-- Create function to update last_activity
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS trigger AS $$
BEGIN
  NEW.last_activity = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_activity
DROP TRIGGER IF EXISTS update_last_activity_trigger ON connection_requests;
CREATE TRIGGER update_last_activity_trigger
  BEFORE UPDATE ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_last_activity();

-- Enhanced cleanup function with immediate timeout handling
CREATE OR REPLACE FUNCTION cleanup_stale_requests() 
RETURNS void AS $$
DECLARE
  timeout_interval interval := interval '40 seconds';
BEGIN
  -- Delete stale searching requests
  DELETE FROM connection_requests
  WHERE status = 'searching'
  AND (
    -- Remove if older than timeout
    created_at < (NOW() - timeout_interval)
    OR
    -- Remove if no activity for timeout period
    last_activity < (NOW() - timeout_interval)
  );
  
  -- Cleanup orphaned requests
  DELETE FROM connection_requests cr
  WHERE cr.status = 'connected'
  AND NOT EXISTS (
    SELECT 1 
    FROM active_connections ac 
    WHERE ac.user1_id = cr.user_id 
    OR ac.user2_id = cr.user_id
  );
END;
$$ LANGUAGE plpgsql;

-- Create row-level trigger function for immediate checks
CREATE OR REPLACE FUNCTION check_request_timeout()
RETURNS trigger AS $$
BEGIN
  -- Check if this specific request is stale
  IF NEW.status = 'searching' AND 
     (NEW.created_at < (NOW() - interval '40 seconds') OR
      NEW.last_activity < (NOW() - interval '40 seconds'))
  THEN
    -- Delete the stale request
    DELETE FROM connection_requests
    WHERE id = NEW.id;
    RETURN NULL;
  END IF;
  
  -- Run general cleanup
  PERFORM cleanup_stale_requests();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create row-level trigger for immediate timeout checks
CREATE TRIGGER cleanup_stale_requests_trigger
  AFTER INSERT OR UPDATE ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_request_timeout();

-- Create function for periodic cleanup
CREATE OR REPLACE FUNCTION periodic_cleanup()
RETURNS void AS $$
BEGIN
  PERFORM cleanup_stale_requests();
END;
$$ LANGUAGE plpgsql;

-- Run initial cleanup
SELECT cleanup_stale_requests();

-- Ensure indexes exist for optimized cleanup
DROP INDEX IF EXISTS idx_connection_requests_status_created;
DROP INDEX IF EXISTS idx_connection_requests_status_activity;

CREATE INDEX idx_connection_requests_status_created 
ON connection_requests(status, created_at)
WHERE status = 'searching';

CREATE INDEX idx_connection_requests_status_activity
ON connection_requests(status, last_activity)
WHERE status = 'searching';