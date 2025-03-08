/*
  # Update Video Stats and Security Schema

  1. Changes
    - Add columns for video statistics tracking
    - Add performance indexes
    - Add triggers for automatic stat updates
    - Update security policies with existence checks

  2. New Columns
    - students_count: Track enrolled students
    - rating_count: Track number of ratings
    - rating_average: Track average rating

  3. Security
    - Add RLS policies with existence checks
    - Add constraints for data integrity
*/

-- Add new columns to videos table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'students_count') THEN
    ALTER TABLE videos ADD COLUMN students_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'rating_count') THEN
    ALTER TABLE videos ADD COLUMN rating_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'rating_average') THEN
    ALTER TABLE videos ADD COLUMN rating_average numeric(3,2) DEFAULT 0.00;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enrollments_user_video ON enrollments(user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_video ON bookmarks(user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_video_ratings_user_video ON video_ratings(user_id, video_id);

-- Function to update video stats on enrollment changes
CREATE OR REPLACE FUNCTION update_video_enrollment_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE videos 
    SET students_count = (
      SELECT COUNT(DISTINCT user_id) 
      FROM enrollments 
      WHERE video_id = NEW.video_id
    )
    WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE videos 
    SET students_count = (
      SELECT COUNT(DISTINCT user_id) 
      FROM enrollments 
      WHERE video_id = OLD.video_id
    )
    WHERE id = OLD.video_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update video rating stats
CREATE OR REPLACE FUNCTION update_video_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE videos 
  SET 
    rating_count = (
      SELECT COUNT(*) 
      FROM video_ratings 
      WHERE video_id = COALESCE(NEW.video_id, OLD.video_id)
    ),
    rating_average = (
      SELECT COALESCE(AVG(rating)::numeric(3,2), 0.00) 
      FROM video_ratings 
      WHERE video_id = COALESCE(NEW.video_id, OLD.video_id)
    )
  WHERE id = COALESCE(NEW.video_id, OLD.video_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_enrollment_stats ON enrollments;
DROP TRIGGER IF EXISTS update_rating_stats ON video_ratings;

-- Create new triggers
CREATE TRIGGER update_enrollment_stats
AFTER INSERT OR DELETE ON enrollments
FOR EACH ROW
EXECUTE FUNCTION update_video_enrollment_stats();

CREATE TRIGGER update_rating_stats
AFTER INSERT OR UPDATE OR DELETE ON video_ratings
FOR EACH ROW
EXECUTE FUNCTION update_video_rating_stats();

-- Add constraints to ensure data integrity
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_user_video_enrollment'
  ) THEN
    ALTER TABLE enrollments
    ADD CONSTRAINT unique_user_video_enrollment UNIQUE (user_id, video_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_user_video_bookmark'
  ) THEN
    ALTER TABLE bookmarks
    ADD CONSTRAINT unique_user_video_bookmark UNIQUE (user_id, video_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_user_video_rating'
  ) THEN
    ALTER TABLE video_ratings
    ADD CONSTRAINT unique_user_video_rating UNIQUE (user_id, video_id);
  END IF;
END $$;

-- Update existing video stats
UPDATE videos v
SET 
  students_count = (
    SELECT COUNT(DISTINCT user_id) 
    FROM enrollments 
    WHERE video_id = v.id
  ),
  rating_count = (
    SELECT COUNT(*) 
    FROM video_ratings 
    WHERE video_id = v.id
  ),
  rating_average = (
    SELECT COALESCE(AVG(rating)::numeric(3,2), 0.00) 
    FROM video_ratings 
    WHERE video_id = v.id
  );

-- Enable RLS on tables if not already enabled
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_ratings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read their own enrollments" ON enrollments;
  DROP POLICY IF EXISTS "Users can create their own enrollments" ON enrollments;
  DROP POLICY IF EXISTS "Users can delete their own enrollments" ON enrollments;
  
  DROP POLICY IF EXISTS "Users can read their own bookmarks" ON bookmarks;
  DROP POLICY IF EXISTS "Users can create their own bookmarks" ON bookmarks;
  DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON bookmarks;
  
  DROP POLICY IF EXISTS "Users can read video ratings" ON video_ratings;
  DROP POLICY IF EXISTS "Users can create their own ratings" ON video_ratings;
  DROP POLICY IF EXISTS "Users can update their own ratings" ON video_ratings;
  DROP POLICY IF EXISTS "Users can delete their own ratings" ON video_ratings;
END $$;

-- Create new policies
CREATE POLICY "Users can read their own enrollments"
ON enrollments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own enrollments"
ON enrollments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own enrollments"
ON enrollments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can read their own bookmarks"
ON bookmarks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
ON bookmarks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
ON bookmarks FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can read video ratings"
ON video_ratings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create their own ratings"
ON video_ratings FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM enrollments
    WHERE user_id = auth.uid()
    AND video_id = video_ratings.video_id
  )
);

CREATE POLICY "Users can update their own ratings"
ON video_ratings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
ON video_ratings FOR DELETE
TO authenticated
USING (auth.uid() = user_id);