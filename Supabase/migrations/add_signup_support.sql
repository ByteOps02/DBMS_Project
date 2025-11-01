/*
  # Add Signup Support

  1. Policy Updates
    - Add policy to allow new users to insert their own host record during signup
    - Ensure secure signup process with proper RLS

  2. Security
    - Users can only insert their own host record (matching auth.uid())
    - Users can only read their own host record initially
    - Admins retain full access to all host records

  Important Notes:
    - This migration adds INSERT policy for hosts table to support self-registration
    - New users will be assigned 'host' role by default
    - Admin users can change roles later through the admin panel
*/

-- Drop existing restrictive policies if they conflict
DROP POLICY IF EXISTS "Allow all access to admins" ON hosts;

-- Allow users to insert their own host record during signup
CREATE POLICY "Allow users to insert their own host record"
  ON hosts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_id);

-- Allow users to read their own host record
CREATE POLICY "Allow users to read their own host record"
  ON hosts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_id);

-- Allow admins to do everything with hosts
CREATE POLICY "Allow admins full access to hosts"
  ON hosts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.auth_id = auth.uid()
      AND hosts.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hosts
      WHERE hosts.auth_id = auth.uid()
      AND hosts.role = 'admin'
    )
  );

-- Create index on auth_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_hosts_auth_id ON hosts(auth_id);
