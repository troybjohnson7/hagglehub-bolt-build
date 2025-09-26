/*
  # Create vehicles table for HaggleHub

  1. New Tables
    - `vehicles`
      - `id` (uuid, primary key)
      - `year` (integer)
      - `make` (text)
      - `model` (text)
      - `trim` (text)
      - `vin` (text)
      - `stock_number` (text)
      - `mileage` (integer)
      - `condition` (text)
      - `exterior_color` (text)
      - `interior_color` (text)
      - `listing_url` (text)
      - `image_url` (text)
      - `created_by` (uuid, foreign key to users)
      - `created_date` (timestamp)

  2. Security
    - Enable RLS on `vehicles` table
    - Add policies for authenticated users to manage their own vehicles
*/

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer,
  make text,
  model text,
  trim text,
  vin text,
  stock_number text,
  mileage integer,
  condition text DEFAULT 'used',
  exterior_color text,
  interior_color text,
  listing_url text,
  image_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_date timestamptz DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own vehicles"
  ON vehicles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create vehicles"
  ON vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own vehicles"
  ON vehicles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own vehicles"
  ON vehicles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);