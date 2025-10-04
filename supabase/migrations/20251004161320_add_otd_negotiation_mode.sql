/*
  # Add Out-The-Door Negotiation Mode System

  ## Overview
  This migration adds the ability for users to toggle between negotiating in
  "Sales Price" terms versus "Out-The-Door (OTD)" terms. The system will
  automatically convert between modes and handle all calculations.

  ## Changes to `deals` table
  
  ### New Columns
  - `negotiation_mode` (text) - Either 'sales_price' or 'otd' mode
  - `otd_asking_price` (numeric) - Dealer's asking price in OTD terms
  - `otd_current_offer` (numeric) - User's current offer in OTD terms
  - `otd_target_price` (numeric) - User's target price in OTD terms
  
  ## Purpose
  When dealers quote "Out-The-Door" prices (total including taxes/fees), users
  can now toggle to OTD mode and the system will:
  - Store both sales price and OTD representations
  - Automatically convert between modes
  - Calculate the appropriate values based on taxes/fees
  - Provide clear context about which mode is active
  
  ## Default Behavior
  - All existing deals default to 'sales_price' mode (backward compatible)
  - New deals default to 'sales_price' mode
  - Users can toggle to 'otd' mode at any time
  
  ## Security
  - No new RLS policies needed (inherits from deals table policies)
*/

-- Add negotiation mode tracking columns to deals table
DO $$
BEGIN
  -- Add negotiation mode field (sales_price or otd)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deals' AND column_name = 'negotiation_mode'
  ) THEN
    ALTER TABLE deals ADD COLUMN negotiation_mode text DEFAULT 'sales_price';
  END IF;

  -- Add OTD price fields for when user negotiates in OTD terms
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deals' AND column_name = 'otd_asking_price'
  ) THEN
    ALTER TABLE deals ADD COLUMN otd_asking_price numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deals' AND column_name = 'otd_current_offer'
  ) THEN
    ALTER TABLE deals ADD COLUMN otd_current_offer numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deals' AND column_name = 'otd_target_price'
  ) THEN
    ALTER TABLE deals ADD COLUMN otd_target_price numeric(10,2);
  END IF;
END $$;

-- Add check constraint to ensure negotiation_mode has valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'deals_negotiation_mode_check'
  ) THEN
    ALTER TABLE deals 
    ADD CONSTRAINT deals_negotiation_mode_check 
    CHECK (negotiation_mode IN ('sales_price', 'otd'));
  END IF;
END $$;

-- Create helper function to calculate OTD from sales price
CREATE OR REPLACE FUNCTION calculate_otd_from_sales_price(
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

-- Create helper function to calculate sales price from OTD
CREATE OR REPLACE FUNCTION calculate_sales_price_from_otd(
  p_otd_price numeric,
  p_sales_tax numeric,
  p_registration_fee numeric,
  p_doc_fee numeric,
  p_title_fee numeric
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN COALESCE(p_otd_price, 0) - 
         COALESCE(p_sales_tax, 0) - 
         COALESCE(p_registration_fee, 0) - 
         COALESCE(p_doc_fee, 0) - 
         COALESCE(p_title_fee, 0);
END;
$$;

-- Backfill: Calculate OTD prices for existing deals that have fees calculated
UPDATE deals
SET 
  otd_asking_price = calculate_otd_from_sales_price(
    asking_price, 
    estimated_sales_tax, 
    estimated_registration_fee, 
    estimated_doc_fee, 
    estimated_title_fee
  ),
  otd_current_offer = calculate_otd_from_sales_price(
    current_offer, 
    estimated_sales_tax, 
    estimated_registration_fee, 
    estimated_doc_fee, 
    estimated_title_fee
  ),
  otd_target_price = calculate_otd_from_sales_price(
    target_price, 
    estimated_sales_tax, 
    estimated_registration_fee, 
    estimated_doc_fee, 
    estimated_title_fee
  )
WHERE 
  estimated_sales_tax IS NOT NULL 
  AND (otd_asking_price IS NULL OR otd_current_offer IS NULL OR otd_target_price IS NULL);