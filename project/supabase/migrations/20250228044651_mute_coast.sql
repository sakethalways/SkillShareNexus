/*
  # Add updated_at column to profiles table
  
  1. Changes
    - Add updated_at column to profiles table
    - Set default value to now()
  
  2. Notes
    - This fixes the error related to missing updated_at column
*/

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;