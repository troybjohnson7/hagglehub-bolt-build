/*
  # Create deals table for HaggleHub

  1. New Tables
    - `deals`
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, foreign key to vehicles)
      - `dealer_id` (uuid, foreign key to dealers)
      - `asking_price` (numeric)
      - `current_offer` (numeric)
      - `target_price` (numeric)
      - `final_price` (numeric)
      - `otd_price` (numeric)
      - `status` (text) - quote_requested, negotiating, final_offer, accepted, declined, expired
      - `priority` (text) - low, medium, high
      - `purchase_type` (text) - cash, finance, lease
      - `negotiation_notes` (text)
      - `quote_expires` (timestamp)
      - `fees_breakdown` (jsonb)
      - `negotiation_duration_days` (integer)
      - `shared_anonymously` (boolean)
      - `last_contact_date` (timestamp)
      - `created_by` (uuid, foreign key to users)
      - `created_date` (timestamp)

  2. Security
    - Enable RLS on `deals` table
    - Add policies for authenticated users to manage their own deals
*/

CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE,
  asking_price numeric(10,2),
  current_offer numeric(10,2),
  target_price numeric(10,2),
  final_price numeric(10,2),
  otd_price numeric(10,2),
  status text DEFAULT 'quote_requested',
  priority text DEFAULT 'medium',
  purchase_type text DEFAULT 'finance',
  negotiation_notes text,
  quote_expires timestamptz,
  fees_breakdown jsonb DEFAULT '{}',
  negotiation_duration_days integer,
  shared_anonymously boolean DEFAULT false,
  last_contact_date timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_date timestamptz DEFAULT now()
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own deals"
  ON deals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create deals"
  ON deals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own deals"
  ON deals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own deals"
  ON deals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);