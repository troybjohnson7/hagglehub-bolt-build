import { supabase } from '@/api/entities';

/**
 * Event-based trigger system for automatic insights refresh
 * Triggers analysis when important events occur
 */

export class InsightTriggerService {
  static async shouldTriggerAnalysis(deals) {
    const activeDeals = deals.filter(deal =>
      ['quote_requested', 'negotiating', 'final_offer'].includes(deal.status)
    );

    if (activeDeals.length === 0) {
      return { shouldTrigger: false, reasons: [] };
    }

    const reasons = [];
    const now = Date.now();

    for (const deal of activeDeals) {
      // Check for expiring quotes (within 3 days)
      if (deal.quote_expires) {
        const daysUntilExpiry = Math.floor(
          (new Date(deal.quote_expires).getTime() - now) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry <= 3 && daysUntilExpiry >= 0) {
          reasons.push({
            type: 'quote_expiring',
            dealId: deal.id,
            message: `Quote expires in ${daysUntilExpiry} days`,
            priority: 'high'
          });
        }
      }

      // Check for stale negotiations (no contact in 7+ days)
      if (deal.last_contact_date) {
        const daysSinceContact = Math.floor(
          (now - new Date(deal.last_contact_date).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceContact >= 7) {
          reasons.push({
            type: 'stale_deal',
            dealId: deal.id,
            message: `No contact for ${daysSinceContact} days`,
            priority: 'medium'
          });
        }
      }

      // Check for expired quotes
      if (deal.quote_expires) {
        const daysUntilExpiry = Math.floor(
          (new Date(deal.quote_expires).getTime() - now) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry < 0) {
          reasons.push({
            type: 'quote_expired',
            dealId: deal.id,
            message: `Quote expired ${Math.abs(daysUntilExpiry)} days ago`,
            priority: 'high'
          });
        }
      }
    }

    return {
      shouldTrigger: reasons.length > 0,
      reasons,
      urgencyLevel: reasons.some(r => r.priority === 'high') ? 'high' : 'medium'
    };
  }

  static async triggerAnalysisForUser(userId, deals, vehicles, triggerReasons) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session for auto-analysis');
        return null;
      }

      console.log('Auto-triggering analysis for user:', userId);
      console.log('Trigger reasons:', triggerReasons);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-deals`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deals,
            vehicles,
            force_refresh: false,
            trigger_events: triggerReasons.map(r => r.type)
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Auto-analysis complete:', result);

      return result;
    } catch (error) {
      console.error('Failed to trigger auto-analysis:', error);
      return null;
    }
  }

  static async checkAndTrigger(deals, vehicles) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check if cache is still valid
      const { data: cachedInsight } = await supabase
        .from('insights_cache')
        .select('*')
        .eq('user_id', user.id)
        .gte('cache_expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // If we have valid cache, don't trigger
      if (cachedInsight) {
        console.log('Valid cache exists, skipping auto-trigger');
        return null;
      }

      // Check if we should trigger based on deal conditions
      const { shouldTrigger, reasons, urgencyLevel } = await this.shouldTriggerAnalysis(deals);

      if (!shouldTrigger) {
        console.log('No urgent conditions, skipping auto-trigger');
        return null;
      }

      console.log(`Auto-triggering analysis due to ${reasons.length} urgent condition(s)`);

      return await this.triggerAnalysisForUser(user.id, deals, vehicles, reasons);
    } catch (error) {
      console.error('Error in checkAndTrigger:', error);
      return null;
    }
  }

  static async monitorDealChanges(deals, vehicles) {
    // This method can be called periodically or on data changes
    // to check if analysis should be triggered
    return await this.checkAndTrigger(deals, vehicles);
  }
}

export default InsightTriggerService;
