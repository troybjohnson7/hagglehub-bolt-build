/*
  # Create dealers table for HaggleHub

  1. New Tables
    - `dealers`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `contact_email` (text)
      - `phone` (text)
      - `address` (text)
      - `website` (text)
      - `sales_rep_name` (text)
      - `rating` (numeric)
      - `notes` (text)
      - `created_by` (uuid, foreign key to users)
      - `created_date` (timestamp)

  2. Security
    - Enable RLS on `dealers` table
    - Add policies for authenticated users to manage their own dealers
*/

CREATE TABLE IF NOT EXISTS dealers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_email text,
  phone text,
  address text,
  website text,
  sales_rep_name text,
  rating numeric(2,1),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_date timestamptz DEFAULT now()
);

ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own dealers"
  ON dealers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create dealers"
  ON dealers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own dealers"
  ON dealers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own dealers"
  ON dealers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);