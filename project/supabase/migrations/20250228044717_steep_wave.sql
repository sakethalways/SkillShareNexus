/*
  # Fix avatar storage policies
  
  1. Changes
    - Drop existing policies for avatar storage
    - Create new policies with correct folder structure
  
  2. Security
    - Allow users to upload avatars to their own folder
    - Allow public to read all avatars
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;

-- Create new policies with correct folder structure
-- Allow users to upload avatars to their own folder
CREATE POLICY "Users can upload avatars to their folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update avatars in their own folder
CREATE POLICY "Users can update avatars in their folder"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete avatars in their own folder
CREATE POLICY "Users can delete avatars in their folder"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public to read all avatars
CREATE POLICY "Public can read all avatars"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');