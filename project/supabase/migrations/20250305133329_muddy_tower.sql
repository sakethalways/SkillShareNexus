/*
  # Database Optimization Fixes
  
  1. Changes
    - Remove duplicate policies
    - Optimize RLS policies for better performance
    - Fix auth function calls in policies
  
  2. Policy Changes
    - Update RLS policies to use subselects for auth functions
    - Consolidate multiple permissive policies
*/

-- Drop existing policies to recreate them optimized
DO $$ 
BEGIN
  -- Profiles policies
  DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can read profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

  -- Videos policies
  DROP POLICY IF EXISTS "Enrolled users and tutors can view videos" ON videos;
  DROP POLICY IF EXISTS "Tutors can create their own videos" ON videos;
  DROP POLICY IF EXISTS "Tutors can update their own videos" ON videos;
  DROP POLICY IF EXISTS "Tutors can delete their own videos" ON videos;

  -- Video ratings policies
  DROP POLICY IF EXISTS "Users can read video ratings" ON video_ratings;
  DROP POLICY IF EXISTS "Users can create their own ratings" ON video_ratings;
  DROP POLICY IF EXISTS "Users can update their own ratings" ON video_ratings;
  DROP POLICY IF EXISTS "Users can delete their own ratings" ON video_ratings;
  DROP POLICY IF EXISTS "Users can rate enrolled videos" ON video_ratings;
  DROP POLICY IF EXISTS "Tutors can read ratings for their videos" ON video_ratings;
  DROP POLICY IF EXISTS "Users can read their own ratings" ON video_ratings;
END $$;

-- Recreate policies with optimized auth function calls
-- Profiles
CREATE POLICY "Users can manage own profile"
ON profiles
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Public can view tutor profiles"
ON profiles
FOR SELECT
USING (role = 'tutor' OR (SELECT auth.uid()) = id);

-- Videos
CREATE POLICY "Videos access policy"
ON videos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM enrollments 
    WHERE video_id = id 
    AND user_id = (SELECT auth.uid())
  ) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = (SELECT auth.uid()) 
    AND role = 'tutor'
  )
);

CREATE POLICY "Tutors can manage own videos"
ON videos
USING ((SELECT auth.uid()) = tutor_id)
WITH CHECK ((SELECT auth.uid()) = tutor_id);

-- Video ratings
CREATE POLICY "Video ratings access policy"
ON video_ratings
FOR SELECT
USING (
  (SELECT auth.uid()) = user_id OR
  EXISTS (
    SELECT 1 FROM videos 
    WHERE id = video_id 
    AND tutor_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can manage own ratings"
ON video_ratings
USING ((SELECT auth.uid()) = user_id)
WITH CHECK (
  (SELECT auth.uid()) = user_id AND
  EXISTS (
    SELECT 1 FROM enrollments
    WHERE user_id = (SELECT auth.uid())
    AND video_id = video_ratings.video_id
  )
);