/*
  # Create users table for HaggleHub

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `full_name` (text)
      - `email_identifier` (text, unique) - for deals-xxx@hagglehub.app emails
      - `subscription_tier` (text) - free, haggler, negotiator, closer_annual
      - `has_completed_onboarding` (boolean)
      - `fallback_deal_id` (uuid) - for uncategorized messages
      - `created_date` (timestamp)

  2. Security
    - Enable RLS on `users` table
    - Add policy for authenticated users to read/update their own data
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  email_identifier text UNIQUE,
  subscription_tier text DEFAULT 'free',
  has_completed_onboarding boolean DEFAULT false,
  fallback_deal_id uuid,
  created_date timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);