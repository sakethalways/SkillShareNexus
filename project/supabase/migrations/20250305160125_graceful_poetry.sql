/*
  # Add watch time tracking

  1. Changes
    - Add watch_time column to enrollments table to track seconds spent watching videos
    - Add last_position column to track video playback position
    - Add triggers to update watch time automatically

  2. Security
    - No changes to RLS policies needed
*/

-- Add columns for tracking watch time
ALTER TABLE enrollments 
ADD COLUMN IF NOT EXISTS watch_time integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_position integer DEFAULT 0;

-- Create function to update watch time
CREATE OR REPLACE FUNCTION update_watch_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate time difference and update total watch time
  IF NEW.last_position > OLD.last_position THEN
    NEW.watch_time = OLD.watch_time + (NEW.last_position - OLD.last_position);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update watch time when position changes
DO $$ BEGIN
  CREATE TRIGGER update_watch_time_trigger
  BEFORE UPDATE OF last_position ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_watch_time();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;