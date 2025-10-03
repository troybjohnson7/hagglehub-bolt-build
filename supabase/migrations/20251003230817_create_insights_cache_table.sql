/*
  # Create insights cache and notification tables

  1. New Tables
    - `insights_cache`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `deal_ids` (jsonb array of deal IDs included in analysis)
      - `analysis_data` (jsonb containing the full insights response)
      - `triggers` (jsonb array of events that triggered this analysis)
      - `cache_expires_at` (timestamp when cache becomes stale)
      - `created_at` (timestamp)
    
    - `insight_notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `insight_cache_id` (uuid, foreign key to insights_cache)
      - `notification_type` (text: urgency level - critical, important, info)
      - `title` (text)
      - `message` (text)
      - `is_read` (boolean)
      - `sent_at` (timestamp)
      - `read_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own insights and notifications
*/

-- Create insights_cache table
CREATE TABLE IF NOT EXISTS insights_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_ids jsonb DEFAULT '[]'::jsonb,
  analysis_data jsonb,
  triggers jsonb DEFAULT '[]'::jsonb,
  cache_expires_at timestamptz DEFAULT (now() + interval '12 hours'),
  created_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_insights_cache_user_id ON insights_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_cache_expires ON insights_cache(cache_expires_at);

-- Enable RLS
ALTER TABLE insights_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for insights_cache
CREATE POLICY "Users can read own insights cache"
  ON insights_cache
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights cache"
  ON insights_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insights cache"
  ON insights_cache
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights cache"
  ON insights_cache
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create insight_notifications table
CREATE TABLE IF NOT EXISTS insight_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  insight_cache_id uuid REFERENCES insights_cache(id) ON DELETE CASCADE,
  notification_type text DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  sent_at timestamptz DEFAULT now(),
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON insight_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON insight_notifications(user_id, is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE insight_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for insight_notifications
CREATE POLICY "Users can read own notifications"
  ON insight_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON insight_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to clean up expired cache entries (run periodically)
CREATE OR REPLACE FUNCTION clean_expired_insights_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM insights_cache
  WHERE cache_expires_at < now() - interval '7 days';
END;
$$;
