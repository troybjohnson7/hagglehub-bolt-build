/*
  # Create market_data table for HaggleHub

  1. New Tables
    - `market_data`
      - `id` (uuid, primary key)
      - `vehicle_year` (integer)
      - `vehicle_make` (text)
      - `vehicle_model` (text)
      - `vehicle_trim` (text)
      - `mileage_range` (text) - 0-10k, 10k-30k, etc.
      - `purchase_type` (text) - cash, finance, lease
      - `asking_price` (numeric)
      - `final_price` (numeric)
      - `savings_amount` (numeric)
      - `savings_percentage` (numeric)
      - `negotiation_duration_days` (integer)
      - `region` (text)
      - `deal_outcome` (text) - deal_won, deal_lost
      - `created_date` (timestamp)

  2. Security
    - Enable RLS on `market_data` table
    - Add policy for all authenticated users to read market data
    - Only allow inserts (no updates/deletes to preserve data integrity)
*/

CREATE TABLE IF NOT EXISTS market_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_year integer,
  vehicle_make text,
  vehicle_model text,
  vehicle_trim text,
  mileage_range text,
  purchase_type text,
  asking_price numeric(10,2),
  final_price numeric(10,2),
  savings_amount numeric(10,2),
  savings_percentage numeric(5,2),
  negotiation_duration_days integer,
  region text DEFAULT 'other',
  deal_outcome text,
  created_date timestamptz DEFAULT now()
);

ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can read market data"
  ON market_data
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert market data"
  ON market_data
  FOR INSERT
  TO authenticated
  WITH CHECK (true);