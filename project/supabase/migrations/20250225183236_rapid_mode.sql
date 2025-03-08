/*
  # Fix Profile Policies

  1. Changes
    - Add INSERT policy for authenticated users
    - Modify SELECT policies to be more permissive
    - Add DELETE policy for users to manage their own profiles

  2. Security
    - Maintains RLS protection while allowing necessary operations
    - Ensures users can create and manage their profiles
    - Preserves public access to tutor profiles
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public can read tutor profiles" ON profiles;

-- Allow authenticated users to create their own profile
CREATE POLICY "Users can create their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to read their own profile and public tutor profiles
CREATE POLICY "Users can read profiles"
  ON profiles
  FOR SELECT
  USING (
    auth.uid() = id 
    OR role = 'tutor'
    OR auth.role() = 'service_role'
  );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to delete their own profile
CREATE POLICY "Users can delete own profile"
  ON profiles
  FOR DELETE
  USING (auth.uid() = id);