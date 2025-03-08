/*
  # Student Phase Updates

  1. New Tables
    - `video_ratings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `video_id` (uuid, references videos)
      - `rating` (integer, 1-5)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes
    - Add `rating_count` and `rating_average` to videos table
    - Add `watch_count` to videos table
    - Add `last_watched` to enrollments table

  3. Security
    - Enable RLS on new tables
    - Update policies for video access
*/

-- Add new columns to videos table
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS rating_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_average decimal(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS watch_count integer DEFAULT 0;

-- Add last_watched to enrollments
ALTER TABLE enrollments 
ADD COLUMN IF NOT EXISTS last_watched timestamptz;

-- Create video_ratings table
CREATE TABLE IF NOT EXISTS video_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Enable RLS
ALTER TABLE video_ratings ENABLE ROW LEVEL SECURITY;

-- Video ratings policies
CREATE POLICY "Users can rate enrolled videos"
ON video_ratings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM enrollments 
    WHERE enrollments.user_id = auth.uid() 
    AND enrollments.video_id = video_ratings.video_id
  )
);

CREATE POLICY "Users can read their own ratings"
ON video_ratings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Tutors can read ratings for their videos"
ON video_ratings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM videos 
    WHERE videos.id = video_ratings.video_id 
    AND videos.tutor_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own ratings"
ON video_ratings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
ON video_ratings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Update video access policy
DROP POLICY IF EXISTS "Everyone can view videos" ON videos;
CREATE POLICY "Enrolled users and tutors can view videos"
ON videos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments 
    WHERE enrollments.video_id = videos.id 
    AND enrollments.user_id = auth.uid()
  ) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'tutor'
  )
);

-- Function to update video ratings
CREATE OR REPLACE FUNCTION update_video_ratings()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE videos
    SET 
      rating_count = (
        SELECT COUNT(*) 
        FROM video_ratings 
        WHERE video_id = NEW.video_id
      ),
      rating_average = (
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM video_ratings 
        WHERE video_id = NEW.video_id
      )
    WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE videos
    SET 
      rating_count = (
        SELECT COUNT(*) 
        FROM video_ratings 
        WHERE video_id = OLD.video_id
      ),
      rating_average = (
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM video_ratings 
        WHERE video_id = OLD.video_id
      )
    WHERE id = OLD.video_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for video ratings
CREATE TRIGGER update_video_ratings_trigger
AFTER INSERT OR UPDATE OR DELETE ON video_ratings
FOR EACH ROW
EXECUTE FUNCTION update_video_ratings();

-- Function to update video watch count
CREATE OR REPLACE FUNCTION update_video_watch_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_watched IS NOT NULL AND (OLD.last_watched IS NULL OR NEW.last_watched > OLD.last_watched) THEN
    UPDATE videos
    SET watch_count = watch_count + 1
    WHERE id = NEW.video_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for video watch count
CREATE TRIGGER update_video_watch_count_trigger
BEFORE UPDATE ON enrollments
FOR EACH ROW
EXECUTE FUNCTION update_video_watch_count();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update timestamps trigger for video_ratings
CREATE TRIGGER set_video_ratings_updated_at
BEFORE UPDATE ON video_ratings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();