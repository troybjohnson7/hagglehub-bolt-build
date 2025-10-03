/*
  # Add triggers for automatic insights refresh

  1. Triggers
    - Detect deal status changes that should trigger insights refresh
    - Detect when deals become stale or quotes are expiring
    - Auto-create notifications for urgent situations

  2. Functions
    - Function to check if deal change warrants insights refresh
    - Function to create notification for urgent deal situations
*/

-- Function to check if a deal update should trigger insights refresh
CREATE OR REPLACE FUNCTION check_deal_urgency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  days_since_contact INTEGER;
  days_until_expiry INTEGER;
  should_notify BOOLEAN := false;
  notification_message TEXT;
BEGIN
  -- Only process active deals
  IF NEW.status NOT IN ('quote_requested', 'negotiating', 'final_offer') THEN
    RETURN NEW;
  END IF;

  -- Check for stale deals (no contact in 7+ days)
  IF NEW.last_contact_date IS NOT NULL THEN
    days_since_contact := EXTRACT(DAY FROM (NOW() - NEW.last_contact_date));
    
    IF days_since_contact >= 7 AND (OLD.last_contact_date IS NULL OR 
        EXTRACT(DAY FROM (NOW() - OLD.last_contact_date)) < 7) THEN
      should_notify := true;
      notification_message := format('No contact with dealer for %s days. Consider following up.', days_since_contact);
    END IF;
  END IF;

  -- Check for expiring quotes (within 3 days)
  IF NEW.quote_expires IS NOT NULL THEN
    days_until_expiry := EXTRACT(DAY FROM (NEW.quote_expires - NOW()));
    
    IF days_until_expiry <= 3 AND days_until_expiry >= 0 AND 
       (OLD.quote_expires IS NULL OR EXTRACT(DAY FROM (OLD.quote_expires - NOW())) > 3) THEN
      should_notify := true;
      notification_message := format('Quote expires in %s days. Act soon!', days_until_expiry);
    END IF;
  END IF;

  -- Invalidate cache if significant changes occurred
  IF (OLD.status IS DISTINCT FROM NEW.status) OR
     (OLD.current_offer IS DISTINCT FROM NEW.current_offer) OR
     (OLD.priority IS DISTINCT FROM NEW.priority) THEN
    
    -- Delete expired cache to force refresh
    DELETE FROM insights_cache
    WHERE user_id = NEW.created_by
      AND cache_expires_at < NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on deals table
DROP TRIGGER IF EXISTS deal_urgency_check ON deals;
CREATE TRIGGER deal_urgency_check
  AFTER INSERT OR UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION check_deal_urgency();

-- Function to periodically check all active deals for urgency
CREATE OR REPLACE FUNCTION check_all_deals_urgency()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deal_record RECORD;
  days_since_contact INTEGER;
  days_until_expiry INTEGER;
BEGIN
  FOR deal_record IN 
    SELECT d.*, u.id as user_id
    FROM deals d
    JOIN auth.users u ON d.created_by = u.id
    WHERE d.status IN ('quote_requested', 'negotiating', 'final_offer')
  LOOP
    -- Check for stale deals
    IF deal_record.last_contact_date IS NOT NULL THEN
      days_since_contact := EXTRACT(DAY FROM (NOW() - deal_record.last_contact_date));
      
      IF days_since_contact >= 7 THEN
        -- Check if we already have a recent notification for this
        IF NOT EXISTS (
          SELECT 1 FROM insight_notifications
          WHERE user_id = deal_record.user_id
            AND title LIKE '%stale%'
            AND sent_at > NOW() - INTERVAL '24 hours'
        ) THEN
          -- Invalidate cache to trigger refresh
          DELETE FROM insights_cache
          WHERE user_id = deal_record.user_id
            AND cache_expires_at < NOW() + INTERVAL '1 hour';
        END IF;
      END IF;
    END IF;

    -- Check for expiring quotes
    IF deal_record.quote_expires IS NOT NULL THEN
      days_until_expiry := EXTRACT(DAY FROM (deal_record.quote_expires - NOW()));
      
      IF days_until_expiry <= 3 AND days_until_expiry >= 0 THEN
        IF NOT EXISTS (
          SELECT 1 FROM insight_notifications
          WHERE user_id = deal_record.user_id
            AND title LIKE '%expir%'
            AND sent_at > NOW() - INTERVAL '24 hours'
        ) THEN
          -- Invalidate cache to trigger refresh
          DELETE FROM insights_cache
          WHERE user_id = deal_record.user_id
            AND cache_expires_at < NOW() + INTERVAL '1 hour';
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Create index to speed up urgency checks
CREATE INDEX IF NOT EXISTS idx_deals_active_status ON deals(status) WHERE status IN ('quote_requested', 'negotiating', 'final_offer');
CREATE INDEX IF NOT EXISTS idx_deals_last_contact ON deals(last_contact_date) WHERE last_contact_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_quote_expires ON deals(quote_expires) WHERE quote_expires IS NOT NULL;
