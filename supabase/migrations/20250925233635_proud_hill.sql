/*
  # Add email tracking fields to messages table

  1. New Columns
    - `mailgun_id` (text) - Mailgun message ID for tracking
    - `email_status` (text) - Status: sent, delivered, opened, clicked, failed
    - `delivered_at` (timestamptz) - When email was delivered
    - `opened_at` (timestamptz) - When email was opened
    - `clicked_at` (timestamptz) - When email links were clicked
    - `failed_at` (timestamptz) - When email failed to deliver

  2. Indexes
    - Add index on mailgun_id for webhook lookups
    - Add index on email_status for filtering
*/

-- Add email tracking columns to messages table
DO $$
BEGIN
  -- Add mailgun_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'mailgun_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN mailgun_id text;
  END IF;

  -- Add email_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'email_status'
  ) THEN
    ALTER TABLE messages ADD COLUMN email_status text DEFAULT 'sent';
  END IF;

  -- Add delivered_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN delivered_at timestamptz;
  END IF;

  -- Add opened_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'opened_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN opened_at timestamptz;
  END IF;

  -- Add clicked_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'clicked_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN clicked_at timestamptz;
  END IF;

  -- Add failed_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'failed_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN failed_at timestamptz;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_mailgun_id ON messages(mailgun_id);
CREATE INDEX IF NOT EXISTS idx_messages_email_status ON messages(email_status);
CREATE INDEX IF NOT EXISTS idx_messages_delivered_at ON messages(delivered_at);

-- Add email_identifier to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'email_identifier'
  ) THEN
    ALTER TABLE users ADD COLUMN email_identifier text UNIQUE;
  END IF;
END $$;

-- Create index on email_identifier
CREATE INDEX IF NOT EXISTS idx_users_email_identifier ON users(email_identifier);