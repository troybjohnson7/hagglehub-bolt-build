/*
  # Analyze Deals Edge Function

  1. Purpose
    - Uses OpenAI GPT to analyze active car deals with real market data
    - Provides strategic insights and actionable recommendations
    - Supports both manual and event-triggered analysis
    - Implements intelligent caching to reduce API costs

  2. Features
    - Real-time deal analysis with GPT-4o
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
  otd_price: number | null;
  target_price: number | null;
  estimated_sales_tax: number | null;
  estimated_registration_fee: number | null;
  estimated_doc_fee: number | null;
  estimated_title_fee: number | null;
  estimated_total_fees: number | null;
  manual_fees_override: boolean | null;
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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured. Please add your OpenAI API key to enable insights.' }),
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
        otd_price: deal.otd_price,
        estimated_taxes_and_fees: {
          sales_tax: deal.estimated_sales_tax || null,
          registration_fee: deal.estimated_registration_fee || null,
          doc_fee: deal.estimated_doc_fee || null,
          title_fee: deal.estimated_title_fee || null,
          total_fees: deal.estimated_total_fees || null,
          manual_override: deal.manual_fees_override || false
        },
        days_since_last_contact: daysSinceLastContact,
        days_until_quote_expires: daysUntilExpiry,
        is_stale: daysSinceLastContact !== null && daysSinceLastContact >= 7,
        is_expiring_soon: daysUntilExpiry !== null && daysUntilExpiry <= 3 && daysUntilExpiry >= 0,
        has_expired: daysUntilExpiry !== null && daysUntilExpiry < 0,
        pricing_note: deal.otd_price && deal.asking_price ?
          `OTD ($${deal.otd_price}) = Sales Price ($${deal.asking_price}) + Taxes/Fees (~$${deal.otd_price - deal.asking_price})` :
          null
      };
    });

    // Detect urgent situations
    const urgentDeals = dealsForAnalysis.filter(d => 
      d.is_expiring_soon || d.is_stale || d.has_expired
    );

    // Build comprehensive prompt for GPT
    const prompt = `You are "The HaggleHub Coach", an expert AI car negotiation assistant with deep knowledge of automotive market trends and negotiation psychology.

You have access to real market data from ${relevantMarketData.length} completed deals in the HaggleHub community for similar vehicles.

**CRITICAL CONTEXT:**
${urgentDeals.length > 0 ? `\n⚠️ URGENT: ${urgentDeals.length} deal(s) need immediate attention!\n` : ''}
${trigger_events && trigger_events.length > 0 ? `Triggered by: ${trigger_events.join(', ')}\n` : ''}

**CRITICAL PRICING DEFINITIONS:**

HaggleHub tracks SALES PRICES (the price of the vehicle before taxes and fees):
- **asking_price**: The dealer's listed SALES price (before taxes/fees)
- **current_offer**: The buyer's current offer for the SALES PRICE (before taxes/fees)
- **target_price**: The buyer's goal SALES PRICE (before taxes/fees)
- **otd_price**: Out-The-Door price - the TOTAL amount including sales price + taxes + fees

**HOW TO ANALYZE CORRECTLY:**
1. When comparing prices to market data, ALWAYS use SALES PRICES (asking_price, current_offer, target_price)
2. Market data "final_price" field represents the negotiated SALES PRICE, not OTD
3. NEVER compare a sales price to an OTD price - they are different things
4. Taxes and fees vary by location (typically $2,000-$5,000) but are NOT part of the negotiation
5. Focus your advice on negotiating the sales price down from asking_price toward target_price
6. The buyer negotiates the sales price; taxes/fees are calculated automatically

**WHY THIS MATTERS:**
If you compare a $50,000 sales price to a $53,000 OTD price, you'll give wrong advice. The $53,000 includes ~$3,000 in taxes/fees, so the actual sales price is $50,000 - they're equal, not different!

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

Respond ONLY with valid JSON in this exact format:
{
  "summary": "string",
  "insights": [
    {
      "title": "string",
      "explanation": "string",
      "next_step": "string",
      "type": "positive" | "negative" | "neutral"
    }
  ]
}`;

    console.log('Calling OpenAI API...');

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'system',
          content: 'You are a helpful car negotiation coach. Always respond with valid JSON only.'
        }, {
          role: 'user',
          content: prompt
        }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit reached',
            details: 'OpenAI API rate limit exceeded. Please wait a moment and try again, or check your OpenAI account billing at https://platform.openai.com/account/billing'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`OpenAI API failed: ${response.status}`);
    }

    const openaiResponse = await response.json();
    const analysisResult = JSON.parse(openaiResponse.choices[0].message.content);

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