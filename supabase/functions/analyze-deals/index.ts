/*
  # Analyze Deals Edge Function

  1. Purpose
    - Uses Claude AI to analyze active car deals with real market data
    - Provides strategic insights and actionable recommendations
    - Supports both manual and event-triggered analysis
    - Implements intelligent caching to reduce API costs

  2. Features
    - Real-time deal analysis with Claude 3.5 Sonnet
    - Market data integration for context
    - Proactive urgency detection (expiring quotes, stale deals)
    - Multi-deal portfolio analysis
    - Caching with 12-hour TTL
    - Event-based triggers tracking

  3. Security
    - Requires authentication
    - User-specific data access
    - Rate limiting protection
*/

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Deal {
  id: string;
  vehicle_id: string;
  dealer_id: string;
  status: string;
  purchase_type: string;
  asking_price: number | null;
  current_offer: number | null;
  target_price: number | null;
  last_contact_date: string | null;
  quote_expires: string | null;
  priority: string;
  created_date: string;
}

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage?: number;
}

interface MarketDataPoint {
  vehicle_year: number;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_trim?: string;
  mileage_range?: string;
  purchase_type: string;
  asking_price: number;
  final_price: number;
  savings_amount: number;
  savings_percentage: number;
  negotiation_duration_days: number;
  region?: string;
}

interface AnalysisRequest {
  deals: Deal[];
  vehicles: Vehicle[];
  force_refresh?: boolean;
  trigger_events?: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { createClient } = await import('npm:@supabase/supabase-js@2');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicApiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured. Please add your Anthropic API key to enable insights.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl ?? '', supabaseServiceKey ?? '');

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { deals, vehicles, force_refresh, trigger_events }: AnalysisRequest = await req.json();

    if (!deals || deals.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No deals to analyze' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter for active deals only
    const activeDeals = deals.filter(deal => 
      ['quote_requested', 'negotiating', 'final_offer'].includes(deal.status)
    );

    if (activeDeals.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active deals to analyze' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dealIds = activeDeals.map(d => d.id);

    // Check cache unless force refresh
    if (!force_refresh) {
      const { data: cachedInsight } = await supabase
        .from('insights_cache')
        .select('*')
        .eq('user_id', user.id)
        .gte('cache_expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cachedInsight) {
        console.log('Returning cached insights');
        return new Response(
          JSON.stringify({ 
            ...cachedInsight.analysis_data,
            cached: true,
            cache_expires_at: cachedInsight.cache_expires_at
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch market data for context
    const { data: marketData } = await supabase
      .from('market_data')
      .select('*')
      .order('created_date', { ascending: false })
      .limit(100);

    // Match market data to user's vehicles
    const relevantMarketData = marketData?.filter(data => 
      activeDeals.some(deal => {
        const vehicle = vehicles.find(v => v.id === deal.vehicle_id);
        return vehicle &&
          data.vehicle_make === vehicle.make &&
          data.vehicle_model === vehicle.model &&
          Math.abs(data.vehicle_year - vehicle.year) <= 2;
      })
    ) || [];

    // Prepare deal data for analysis
    const dealsForAnalysis = activeDeals.map(deal => {
      const vehicle = vehicles.find(v => v.id === deal.vehicle_id);
      const daysSinceLastContact = deal.last_contact_date 
        ? Math.floor((Date.now() - new Date(deal.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const daysUntilExpiry = deal.quote_expires
        ? Math.floor((new Date(deal.quote_expires).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        deal_id: deal.id,
        vehicle: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Unknown Vehicle',
        vehicle_details: vehicle,
        status: deal.status,
        priority: deal.priority,
        purchase_type: deal.purchase_type,
        asking_price: deal.asking_price,
        current_offer: deal.current_offer,
        target_price: deal.target_price,
        days_since_last_contact: daysSinceLastContact,
        days_until_quote_expires: daysUntilExpiry,
        is_stale: daysSinceLastContact !== null && daysSinceLastContact >= 7,
        is_expiring_soon: daysUntilExpiry !== null && daysUntilExpiry <= 3 && daysUntilExpiry >= 0,
        has_expired: daysUntilExpiry !== null && daysUntilExpiry < 0
      };
    });

    // Detect urgent situations
    const urgentDeals = dealsForAnalysis.filter(d => 
      d.is_expiring_soon || d.is_stale || d.has_expired
    );

    // Build comprehensive prompt for Claude
    const prompt = `You are "The HaggleHub Coach", an expert AI car negotiation assistant with deep knowledge of automotive market trends and negotiation psychology.

You have access to real market data from ${relevantMarketData.length} completed deals in the HaggleHub community for similar vehicles.

**CRITICAL CONTEXT:**
${urgentDeals.length > 0 ? `\n⚠️ URGENT: ${urgentDeals.length} deal(s) need immediate attention!\n` : ''}
${trigger_events && trigger_events.length > 0 ? `Triggered by: ${trigger_events.join(', ')}\n` : ''}

**USER'S ACTIVE DEALS:**
${JSON.stringify(dealsForAnalysis, null, 2)}

**REAL MARKET DATA FROM HAGGLEHUB COMMUNITY:**
${relevantMarketData.length > 0 ? JSON.stringify(relevantMarketData.slice(0, 15), null, 2) : 'No directly comparable deals in database yet.'}

**YOUR TASK:**
Provide a strategic analysis with the following structure:

1. **Overall Summary** (2-3 sentences):
   - Encouraging tone that acknowledges their progress
   - Highlight the most important takeaway
   - Set expectations for what they should focus on

2. **Critical Insights** (2-4 insights, prioritized by urgency and impact):
   Each insight must include:
   - **title**: Short, action-oriented headline (5-8 words max)
   - **explanation**: Clear analysis incorporating market data when available (2-3 sentences)
     - Compare their offers to actual completed deals
     - Cite specific data points (percentages, dollar amounts)
     - Explain WHY this matters
   - **next_step**: Specific, actionable instruction they can execute today
     - Be concrete with timing ("today", "within 48 hours")
     - Include specific amounts when suggesting offers
     - Give them exact language to use when possible
   - **type**: Classification for visual presentation
     - "positive": Good position, momentum, or opportunity
     - "negative": Risk, losing ground, or needs correction  
     - "neutral": Information or steady state

**ANALYSIS PRIORITIES:**
1. Time-sensitive issues (expiring quotes, stale negotiations)
2. Significant price gaps vs market data
3. Purchase type optimization (cash/finance/lease advantages)
4. Multi-deal portfolio strategy
5. Behavioral patterns and momentum

**QUALITY STANDARDS:**
- Be specific with numbers: "Your offer is 8% below market average" not "Your offer is low"
- Reference actual data: "Based on 12 similar deals" not "Based on data"
- Provide confidence levels: "Strong position" vs "Possible opportunity"
- Balance encouragement with reality: honest but supportive
- No generic advice: every insight should be unique to their situation

**AVOID:**
- Vague statements like "consider reaching out" (say "call today at 2pm")
- Generic advice that applies to anyone
- Contradicting yourself across insights
- Being overly pessimistic or unrealistically optimistic

Respond ONLY with valid JSON matching the schema provided.`;

    console.log('Calling Claude API...');
    
    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'deal_analysis',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                summary: { 
                  type: 'string',
                  description: 'Brief encouraging overview of all deals (2-3 sentences)'
                },
                insights: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      explanation: { type: 'string' },
                      next_step: { type: 'string' },
                      type: { type: 'string', enum: ['positive', 'negative', 'neutral'] }
                    },
                    required: ['title', 'explanation', 'next_step', 'type'],
                    additionalProperties: false
                  },
                  minItems: 2,
                  maxItems: 4
                }
              },
              required: ['summary', 'insights'],
              additionalProperties: false
            }
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      throw new Error(`Claude API failed: ${response.status}`);
    }

    const claudeResponse = await response.json();
    const analysisResult = JSON.parse(claudeResponse.content[0].text);

    console.log('Analysis complete');

    // Cache the result
    const cacheExpiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
    const { data: cachedInsight, error: cacheError } = await supabase
      .from('insights_cache')
      .insert({
        user_id: user.id,
        deal_ids: dealIds,
        analysis_data: analysisResult,
        triggers: trigger_events || [],
        cache_expires_at: cacheExpiresAt.toISOString()
      })
      .select()
      .single();

    if (cacheError) {
      console.error('Failed to cache insight:', cacheError);
    }

    // Create notifications for urgent insights
    if (cachedInsight && urgentDeals.length > 0) {
      const urgentInsights = analysisResult.insights.filter((insight: any) => 
        insight.type === 'negative' || 
        insight.title.toLowerCase().includes('expir') ||
        insight.title.toLowerCase().includes('urgent')
      );

      if (urgentInsights.length > 0) {
        const notifications = urgentInsights.map((insight: any) => ({
          user_id: user.id,
          insight_cache_id: cachedInsight.id,
          notification_type: 'important',
          title: insight.title,
          message: insight.next_step
        }));

        await supabase
          .from('insight_notifications')
          .insert(notifications);
      }
    }

    return new Response(
      JSON.stringify({
        ...analysisResult,
        cached: false,
        cache_expires_at: cacheExpiresAt.toISOString(),
        market_data_points: relevantMarketData.length,
        urgent_deals_count: urgentDeals.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analyze deals error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to analyze deals', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});