/*
  # Add watch time tracking to enrollments

  1. Changes
    - Add watch_time column to enrollments table to track minutes spent watching videos
    - Set default value to 0
    - Add trigger to update watch time when progress is updated

  2. Security
    - No changes to RLS policies needed
*/

-- Add watch_time column
ALTER TABLE enrollments 
ADD COLUMN IF NOT EXISTS watch_time integer DEFAULT 0;

-- Create function to update watch time
CREATE OR REPLACE FUNCTION update_watch_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Update watch_time based on progress
  -- Assuming progress is a percentage (0-100) and videos are typically 30 minutes long
  NEW.watch_time = GREATEST(NEW.watch_time, ROUND((NEW.progress::float / 100) * 30));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update watch time when progress changes
DO $$ BEGIN
  CREATE TRIGGER update_watch_time_trigger
  BEFORE UPDATE OF progress ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_watch_time();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;