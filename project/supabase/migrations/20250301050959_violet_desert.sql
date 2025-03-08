/*
  # Add videos table and update profiles
  
  1. New Tables
    - `videos`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `description` (text)
      - `url` (text, not null)
      - `thumbnail_url` (text)
      - `category` (text)
      - `tutor_id` (uuid, foreign key to profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Changes to Existing Tables
    - Add `subject` column to profiles table
  
  3. Security
    - Enable RLS on videos table
    - Add policies for video management
*/

-- Add subject column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subject'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subject text;
  END IF;
END $$;

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  url text NOT NULL,
  thumbnail_url text,
  category text,
  tutor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on videos table
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_videos_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_videos_updated_at
BEFORE UPDATE ON videos
FOR EACH ROW
EXECUTE FUNCTION update_videos_updated_at_column();

-- Create policies for videos table
-- Tutors can create their own videos
CREATE POLICY "Tutors can create their own videos"
  ON videos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = tutor_id);

-- Tutors can update their own videos
CREATE POLICY "Tutors can update their own videos"
  ON videos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = tutor_id)
  WITH CHECK (auth.uid() = tutor_id);

-- Tutors can delete their own videos
CREATE POLICY "Tutors can delete their own videos"
  ON videos
  FOR DELETE
  TO authenticated
  USING (auth.uid() = tutor_id);

-- Everyone can view videos
CREATE POLICY "Everyone can view videos"
  ON videos
  FOR SELECT
  TO public
  USING (true);

-- Create storage bucket for videos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for video storage
-- Allow authenticated users to upload videos to their own folder
CREATE POLICY "Users can upload videos to their folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'videos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update videos in their own folder
CREATE POLICY "Users can update videos in their folder"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'videos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete videos in their own folder
CREATE POLICY "Users can delete videos in their folder"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'videos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public to read all videos
CREATE POLICY "Public can read all videos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'videos');