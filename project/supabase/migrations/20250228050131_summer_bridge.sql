/*
  # Fix profile update issues
  
  1. Changes
    - Ensure avatar_url column is properly defined as text
    - Add default value for updated_at column
  
  2. Notes
    - This ensures profile updates work correctly
*/

-- Make sure updated_at has a default value
ALTER TABLE profiles 
ALTER COLUMN updated_at SET DEFAULT now();

-- Add trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_profiles_updated_at'
  ) THEN
    CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;