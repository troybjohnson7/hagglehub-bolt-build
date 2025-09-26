/*
  # Create messages table for HaggleHub

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `deal_id` (uuid, foreign key to deals)
      - `dealer_id` (uuid, foreign key to dealers)
      - `content` (text, required)
      - `direction` (text) - inbound, outbound
      - `channel` (text) - email, app, phone
      - `is_read` (boolean)
      - `contains_offer` (boolean)
      - `extracted_price` (numeric)
      - `mailgun_id` (text) - for tracking email status
      - `email_status` (text) - sent, delivered, opened, clicked, failed
      - `delivered_at` (timestamp)
      - `opened_at` (timestamp)
      - `clicked_at` (timestamp)
      - `failed_at` (timestamp)
      - `created_by` (uuid, foreign key to users)
      - `created_date` (timestamp)

  2. Security
    - Enable RLS on `messages` table
    - Add policies for authenticated users to manage their own messages
*/

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE,
  content text NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',
  channel text DEFAULT 'app',
  is_read boolean DEFAULT true,
  contains_offer boolean DEFAULT false,
  extracted_price numeric(10,2),
  mailgun_id text,
  email_status text DEFAULT 'sent',
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  failed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_date timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own messages"
  ON messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);