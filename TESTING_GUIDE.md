# Smart Insights Testing Guide

## Setup Complete ✅

Your Smart Insights system is ready for testing! Here's what I've prepared:

### Current Status
- **Database Tables**: All required tables exist (insights_cache, insight_notifications, market_data, deals, vehicles)
- **Edge Function**: analyze-deals is ACTIVE and deployed
- **Market Data**: 6 sample Toyota Tundra deals added (2018-2020 models)
- **Test Deal**: Your existing 2019 Toyota Tundra deal updated with:
  - Quote expires in 2 days (triggers urgency)
  - Last contact was 1 day ago
  - Asking price: $49,965
  - Current offer: $51,000 (interesting - you're offering MORE than asking!)
  - Target price: $46,163.38

### ⚠️ CRITICAL: OpenAI API Key Required

Before testing, you MUST add your OpenAI API key to Supabase:

**How to Add OpenAI API Key:**

Since you're working with an AI-assisted environment, you'll need to:

1. **Get your OpenAI API Key:**
   - Go to https://platform.openai.com/api-keys
   - Create a new secret key (or use existing one)
   - Copy the key (starts with `sk-proj-...`)

2. **Add to Supabase:**
   - Open your Supabase project dashboard: https://supabase.com/dashboard
   - Go to Project Settings → Edge Functions
   - Click "Manage secrets"
   - Add a new secret:
     - Key: `OPENAI_API_KEY`
     - Value: Your OpenAI API key
   - Save

**Without this key, the insights feature will show an error message.**

---

## Testing Steps (Do These in Order)

### Test 1: Manual Insights Trigger

**What to do:**
1. Open your app and navigate to the Dashboard
2. Look for the "Smart Insights" card (lime green background)
3. You should see an orange urgency banner saying "1 deal needs attention"
4. Click the "Analyze My Deals" button
5. Wait 3-5 seconds for the analysis

**What to expect:**
- Loading spinner appears
- After a few seconds, insights appear with:
  - A summary paragraph at the top
  - 2-4 collapsible insight cards
  - Each card shows an icon (trending up, down, or hourglass)
  - "Next Step" actions for each insight
  - A "Cached" badge and "market data points: 6" indicator
  - GPT-4o branding

**If it fails:**
- Check browser console (F12 → Console tab) for errors
- Most common issue: OpenAI API key not configured
- Error will say: "AI service not configured"

---

### Test 2: Verify Cache System

**What to do:**
1. After Test 1 completes successfully, immediately click "Analyze My Deals" again
2. Notice how fast it loads (should be instant)

**What to expect:**
- Results appear in under 1 second (cached)
- "Cached" badge is visible
- Same insights as before
- No OpenAI API call made (saves money!)

**What to check:**
- Browser console should show: "Returning cached insights"
- Cache expires in 12 hours from first analysis

---

### Test 3: Force Refresh (Bypass Cache)

**What to do:**
1. Click the small "Refresh" button in the top-right of the Smart Insights card
2. Wait for new analysis

**What to expect:**
- Full analysis runs again (3-5 seconds)
- Insights might be slightly different (GPT is creative)
- "Cached" badge disappears initially, then returns
- New cache created with 12-hour expiration

---

### Test 4: Auto-Trigger on Page Load

**What to do:**
1. Close the browser tab completely
2. Open the app again and go to Dashboard
3. Wait 2-3 seconds after the page loads

**What to expect:**
- Smart Insights card loads first (empty)
- After 2-3 seconds, insights automatically appear WITHOUT clicking the button
- Browser console shows: "Auto-analysis triggered successfully"
- This happens because your deal has a quote expiring in 2 days (urgent condition)

**Note:** Auto-trigger only runs if:
- No valid cache exists (>12 hours old), AND
- At least one deal has an urgent condition:
  - Quote expires within 3 days
  - No contact for 7+ days
  - Quote already expired

---

### Test 5: Notifications System

**What to do:**
1. After auto-trigger or manual trigger completes
2. Look at the top navigation bar for a bell icon
3. Check if there's a badge with a number

**What to expect:**
- If your insights contain urgent items, a notification is created
- Bell icon shows unread count (e.g., "1")
- Click the bell to open notification panel
- You'll see insight notifications with lightbulb or warning icons
- Click a notification to mark it as read and navigate

**To test real-time updates:**
1. Open app in two browser tabs
2. In Tab 1, trigger a new analysis with urgent conditions
3. Tab 2 should automatically show the notification badge update

---

### Test 6: Market Data Integration

**What to check:**
1. After running analysis, look at the insights
2. The explanations should mention specific market data:
   - "Based on 6 similar deals..."
   - "Your offer is X% above/below market average..."
   - Percentages and dollar amounts from real data

**What this proves:**
- The AI is using your market_data table
- Insights are data-driven, not generic advice
- Matches are based on vehicle make/model/year (±2 years)

---

### Test 7: Mobile Responsiveness

**What to do:**
1. Open browser DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M or Cmd+Shift+M)
3. Select "iPhone 12 Pro" or similar mobile device
4. Navigate through Dashboard

**What to expect:**
- Smart Insights card shrinks nicely
- Text is readable (smaller but clear)
- Urgency banner displays properly
- Buttons are touch-friendly
- Accordions work smoothly
- All icons scale appropriately

---

### Test 8: Error Handling

**Scenario A: No Active Deals**
1. Change your deal status to "purchased" in the database
2. Refresh Dashboard
3. Smart Insights card should disappear completely

**Scenario B: No OpenAI Key**
1. Remove OPENAI_API_KEY from Supabase secrets (temporarily)
2. Try to analyze deals
3. Should show error: "AI insights are not configured yet"

**Scenario C: Network Failure**
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Try to analyze
4. Should show friendly error message

---

## Verification Checklist

Use this checklist to confirm everything works:

- [ ] Database tables exist (insights_cache, insight_notifications, market_data)
- [ ] Edge Function is deployed and active
- [ ] OpenAI API key is configured in Supabase
- [ ] Market data has 6 Toyota Tundra entries
- [ ] Deal has urgency conditions (quote expiring in 2 days)
- [ ] Manual analysis trigger works
- [ ] Insights display with summary and cards
- [ ] Cache system works (instant second load)
- [ ] Force refresh bypasses cache
- [ ] Auto-trigger fires on page load after 2-3 seconds
- [ ] Urgency banner appears when deals need attention
- [ ] Notifications show in bell icon
- [ ] Market data is referenced in insights
- [ ] Mobile view looks good
- [ ] Error handling works gracefully

---

## Troubleshooting Common Issues

### "AI service not configured"
**Cause:** OpenAI API key not set in Supabase
**Fix:** Add OPENAI_API_KEY to Supabase Edge Function secrets

### "No active deals to analyze"
**Cause:** All deals have status like "purchased" or "withdrawn"
**Fix:** Ensure at least one deal has status: quote_requested, negotiating, or final_offer

### Analysis never completes (stuck loading)
**Cause:** OpenAI API timeout or invalid key
**Fix:**
1. Check Supabase Edge Function logs for errors
2. Verify API key is valid on OpenAI dashboard
3. Check you have credits/billing set up on OpenAI

### Auto-trigger doesn't fire
**Cause:** Cache is still valid OR no urgent conditions
**Fix:**
1. Wait for cache to expire (12 hours)
2. Or clear cache manually in database
3. Ensure deal has urgent condition (quote expires <3 days or no contact for 7+ days)

### Insights seem generic/not data-driven
**Cause:** No matching market data for your vehicle
**Fix:** Add more market_data entries for the vehicle make/model/year

---

## Performance Metrics

**Expected performance:**
- First analysis: 3-5 seconds
- Cached analysis: <1 second
- Auto-trigger delay: 2-3 seconds after page load
- Market data matching: Within ±2 years of vehicle year

**OpenAI API costs:**
- Per analysis: ~$0.01 (1 cent)
- With caching: 50-70% cost reduction
- Monthly (100 users): ~$5-$10

---

## Next Steps After Testing

Once testing is complete:

1. **Add More Market Data**
   - As users complete deals, their data gets added to market_data
   - More data = better insights for everyone

2. **Monitor Costs**
   - Check OpenAI usage at https://platform.openai.com/usage
   - Set up billing alerts if needed

3. **Collect User Feedback**
   - Are insights helpful?
   - Are recommendations actionable?
   - Do users click "Analyze My Deals" regularly?

4. **Optimize Cache TTL**
   - If costs are high, increase from 12 to 24 hours
   - If insights seem stale, decrease to 6 hours

5. **A/B Test Prompts**
   - Try different prompt styles
   - Measure which generates better user engagement

---

## Questions or Issues?

If something doesn't work as expected:
1. Check browser console for JavaScript errors
2. Check Supabase Edge Function logs for server errors
3. Verify all database tables have proper RLS policies
4. Confirm OpenAI API key has sufficient credits

Good luck with testing! Your Smart Insights system is a powerful feature that will really help car buyers negotiate better deals.
