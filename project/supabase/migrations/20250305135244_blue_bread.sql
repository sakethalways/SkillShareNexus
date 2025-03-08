/*
  # Fix video access policies

  1. Changes
    - Update video access policy to allow all authenticated users to view videos
    - Keep tutor management policies intact
    - Ensure proper RLS is maintained

  2. Security
    - Videos are publicly readable by all authenticated users
    - Only tutors can manage their own videos
*/

-- Drop existing video policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Videos access policy" ON videos;
  DROP POLICY IF EXISTS "Tutors can manage own videos" ON videos;
END $$;

-- Recreate video policies with proper access
CREATE POLICY "Public can view all videos"
ON videos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Tutors can manage own videos"
ON videos
USING ((SELECT auth.uid()) = tutor_id)
WITH CHECK ((SELECT auth.uid()) = tutor_id);