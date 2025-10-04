/*
  # Add Tax and Fee Calculation System

  ## Overview
  This migration creates a comprehensive tax and fee calculation system that allows:
  - Automatic tax rate lookup by zip code
  - Manual override of all tax and fee components
  - Automatic OTD price calculation
  - Historical tracking of tax rates used

  ## New Tables
  
  ### `zip_code_tax_rates`
  Stores tax rate data by zip code for automatic calculations
  - `zip_code` (text, primary key) - 5-digit US zip code
  - `state` (text) - State abbreviation
  - `state_name` (text) - Full state name
  - `county` (text, nullable) - County name
  - `city` (text, nullable) - City name
  - `sales_tax_rate` (numeric) - Combined state + local sales tax rate as decimal (e.g., 0.0825 for 8.25%)
  - `registration_base_fee` (numeric) - Average registration fee for the state
  - `doc_fee_average` (numeric) - Average documentation fee charged by dealers
  - `doc_fee_max` (numeric, nullable) - Maximum allowed doc fee by state law (if regulated)
  - `title_fee` (numeric) - State title transfer fee
  - `last_updated` (timestamp) - When this data was last verified
  - `data_source` (text) - Source of the tax rate data

  ## Modified Tables

  ### `deals`
  - Add `buyer_zip_code` (text, nullable) - Buyer's zip code for tax calculation
  - Add `estimated_sales_tax` (numeric, nullable) - Calculated sales tax amount
  - Add `estimated_registration_fee` (numeric, nullable) - Calculated registration fee
  - Add `estimated_doc_fee` (numeric, nullable) - Calculated documentation fee
  - Add `estimated_title_fee` (numeric, nullable) - Calculated title fee
  - Add `estimated_total_fees` (numeric, nullable) - Sum of all fees (excluding sales tax)
  - Add `manual_fees_override` (boolean, default false) - Whether user manually edited fees
  - Add `tax_calculation_date` (timestamp, nullable) - When fees were last calculated
  - Note: `fees_breakdown` JSONB already exists for detailed storage
  - Note: `otd_price` already exists for calculated OTD total

  ### `market_data`
  - Add `sales_price` (numeric, nullable) - Sales price before taxes/fees (for clarity)
  - Rename semantic: `asking_price` remains dealer's listed price
  - Rename semantic: `final_price` remains the final negotiated sales price
  - Add `otd_price` (numeric, nullable) - Out-the-door price including all taxes and fees
  - Add `tax_rate_used` (numeric, nullable) - Sales tax rate used in this deal
  - Add `fees_total` (numeric, nullable) - Total fees (excluding sales tax)

  ## Security
  - Enable RLS on `zip_code_tax_rates`
  - Allow all authenticated users to read tax rates
  - Only service role can insert/update tax rates

  ## Indexes
  - Index on `zip_code_tax_rates.zip_code` for fast lookups
  - Index on `zip_code_tax_rates.state` for state-level fallbacks
*/

-- Create zip_code_tax_rates table
CREATE TABLE IF NOT EXISTS zip_code_tax_rates (
  zip_code text PRIMARY KEY,
  state text NOT NULL,
  state_name text NOT NULL,
  county text,
  city text,
  sales_tax_rate numeric(5,4) NOT NULL DEFAULT 0,
  registration_base_fee numeric(10,2) NOT NULL DEFAULT 0,
  doc_fee_average numeric(10,2) NOT NULL DEFAULT 0,
  doc_fee_max numeric(10,2),
  title_fee numeric(10,2) NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  data_source text DEFAULT 'manual_entry',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on zip_code_tax_rates
ALTER TABLE zip_code_tax_rates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read tax rates
CREATE POLICY "Authenticated users can read tax rates"
  ON zip_code_tax_rates
  FOR SELECT
  TO authenticated
  USING (true);

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_zip_code_tax_rates_state ON zip_code_tax_rates(state);
CREATE INDEX IF NOT EXISTS idx_zip_code_tax_rates_zip ON zip_code_tax_rates(zip_code);

-- Add new columns to deals table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'buyer_zip_code') THEN
    ALTER TABLE deals ADD COLUMN buyer_zip_code text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'estimated_sales_tax') THEN
    ALTER TABLE deals ADD COLUMN estimated_sales_tax numeric(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'estimated_registration_fee') THEN
    ALTER TABLE deals ADD COLUMN estimated_registration_fee numeric(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'estimated_doc_fee') THEN
    ALTER TABLE deals ADD COLUMN estimated_doc_fee numeric(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'estimated_title_fee') THEN
    ALTER TABLE deals ADD COLUMN estimated_title_fee numeric(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'estimated_total_fees') THEN
    ALTER TABLE deals ADD COLUMN estimated_total_fees numeric(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'manual_fees_override') THEN
    ALTER TABLE deals ADD COLUMN manual_fees_override boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'tax_calculation_date') THEN
    ALTER TABLE deals ADD COLUMN tax_calculation_date timestamptz;
  END IF;
END $$;

-- Add new columns to market_data table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_data' AND column_name = 'sales_price') THEN
    ALTER TABLE market_data ADD COLUMN sales_price numeric(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_data' AND column_name = 'otd_price') THEN
    ALTER TABLE market_data ADD COLUMN otd_price numeric(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_data' AND column_name = 'tax_rate_used') THEN
    ALTER TABLE market_data ADD COLUMN tax_rate_used numeric(5,4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_data' AND column_name = 'fees_total') THEN
    ALTER TABLE market_data ADD COLUMN fees_total numeric(10,2);
  END IF;
END $$;

-- Backfill market_data: Copy final_price to sales_price if sales_price is null
UPDATE market_data 
SET sales_price = final_price 
WHERE sales_price IS NULL AND final_price IS NOT NULL;

-- Insert sample tax rates for major states (users can add their specific zip codes)
-- These are representative rates as of 2024 - actual rates vary by locality

-- California sample rates
INSERT INTO zip_code_tax_rates (zip_code, state, state_name, county, city, sales_tax_rate, registration_base_fee, doc_fee_average, doc_fee_max, title_fee, data_source)
VALUES 
  ('90001', 'CA', 'California', 'Los Angeles', 'Los Angeles', 0.0950, 65, 85, 85, 15, 'DMV data 2024'),
  ('94102', 'CA', 'California', 'San Francisco', 'San Francisco', 0.0863, 65, 85, 85, 15, 'DMV data 2024'),
  ('92101', 'CA', 'California', 'San Diego', 'San Diego', 0.0775, 65, 85, 85, 15, 'DMV data 2024')
ON CONFLICT (zip_code) DO NOTHING;

-- Texas sample rates
INSERT INTO zip_code_tax_rates (zip_code, state, state_name, county, city, sales_tax_rate, registration_base_fee, doc_fee_average, doc_fee_max, title_fee, data_source)
VALUES 
  ('75201', 'TX', 'Texas', 'Dallas', 'Dallas', 0.0825, 51, 150, 150, 33, 'DMV data 2024'),
  ('77001', 'TX', 'Texas', 'Harris', 'Houston', 0.0825, 51, 150, 150, 33, 'DMV data 2024'),
  ('78701', 'TX', 'Texas', 'Travis', 'Austin', 0.0825, 51, 150, 150, 33, 'DMV data 2024')
ON CONFLICT (zip_code) DO NOTHING;

-- Florida sample rates
INSERT INTO zip_code_tax_rates (zip_code, state, state_name, county, city, sales_tax_rate, registration_base_fee, doc_fee_average, doc_fee_max, title_fee, data_source)
VALUES 
  ('33101', 'FL', 'Florida', 'Miami-Dade', 'Miami', 0.0700, 225, 899, 899, 75, 'DMV data 2024'),
  ('32801', 'FL', 'Florida', 'Orange', 'Orlando', 0.0650, 225, 899, 899, 75, 'DMV data 2024'),
  ('33602', 'FL', 'Florida', 'Hillsborough', 'Tampa', 0.0750, 225, 899, 899, 75, 'DMV data 2024')
ON CONFLICT (zip_code) DO NOTHING;

-- New York sample rates
INSERT INTO zip_code_tax_rates (zip_code, state, state_name, county, city, sales_tax_rate, registration_base_fee, doc_fee_average, doc_fee_max, title_fee, data_source)
VALUES 
  ('10001', 'NY', 'New York', 'New York', 'New York City', 0.0850, 32, 75, 175, 50, 'DMV data 2024'),
  ('14201', 'NY', 'New York', 'Erie', 'Buffalo', 0.0850, 32, 75, 175, 50, 'DMV data 2024')
ON CONFLICT (zip_code) DO NOTHING;

-- Create a function to calculate OTD price
CREATE OR REPLACE FUNCTION calculate_otd_price(
  p_sales_price numeric,
  p_sales_tax numeric,
  p_registration_fee numeric,
  p_doc_fee numeric,
  p_title_fee numeric
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN COALESCE(p_sales_price, 0) + 
         COALESCE(p_sales_tax, 0) + 
         COALESCE(p_registration_fee, 0) + 
         COALESCE(p_doc_fee, 0) + 
         COALESCE(p_title_fee, 0);
END;
$$;