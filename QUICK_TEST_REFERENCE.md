# Quick Test Reference Card

## 🚀 Before You Start

**YOU MUST ADD OPENAI API KEY FIRST!**

1. Get key: https://platform.openai.com/api-keys
2. Go to Supabase Dashboard → Edge Functions → Manage Secrets
3. Add: `OPENAI_API_KEY` = `sk-proj-your-key-here`
4. Save

**Without this, nothing will work!**

---

## ✅ Quick Tests (5 Minutes)

### Test #1: Click the Button (30 seconds)
1. Open Dashboard
2. Look for green "Smart Insights" card
3. Click "Analyze My Deals"
4. Wait 3-5 seconds
5. ✅ See insights appear

**Expected:** Summary + 2-4 insight cards with market data

---

### Test #2: Verify Cache (10 seconds)
1. Click "Analyze My Deals" again immediately
2. ✅ Should load in <1 second (cached)

**Expected:** "Cached" badge visible

---

### Test #3: Force Refresh (30 seconds)
1. Click small "Refresh" button (top-right of card)
2. Wait 3-5 seconds
3. ✅ New analysis runs

**Expected:** Fresh insights, new cache created

---

### Test #4: Auto-Trigger (1 minute)
1. Close browser tab
2. Reopen app → Dashboard
3. Wait 2-3 seconds
4. ✅ Insights appear automatically

**Expected:** Console shows "Auto-analysis triggered"

---

### Test #5: Check Notifications (30 seconds)
1. After analysis completes
2. Look at bell icon (top nav)
3. ✅ Should have a badge with number
4. Click bell to see notifications

**Expected:** Insight notifications appear

---

## 🎯 What You're Testing

| Feature | What It Does | How to Test |
|---------|--------------|-------------|
| **Manual Trigger** | User clicks to get insights | Click "Analyze My Deals" button |
| **Cache System** | Saves money by reusing results | Click analyze twice in a row |
| **Auto-Trigger** | Automatically analyzes urgent deals | Reload page, wait 2-3 seconds |
| **Market Data** | Uses real deal data for context | Check insights mention "6 similar deals" |
| **Notifications** | Alerts for urgent insights | Check bell icon for badge |
| **Urgency Detection** | Flags deals needing attention | Orange banner says "1 deal needs attention" |

---

## 🔍 What to Look For

**✅ Good Signs:**
- Analysis completes in 3-5 seconds
- Insights reference specific data (percentages, dollar amounts)
- Cache makes second load instant
- Auto-trigger works without clicking
- Notifications appear for urgent items
- Mobile view looks clean

**❌ Red Flags:**
- Error: "AI service not configured" = Missing OpenAI key
- Stuck loading forever = API timeout or bad key
- Generic insights = No market data matching
- No auto-trigger = No urgent conditions or cache still valid
- Insights card missing = No active deals

---

## 📊 Your Test Data

**Deal:** 2019 Toyota Tundra
- Asking: $49,965
- Your offer: $51,000 (you're offering MORE - interesting!)
- Target: $46,163
- Quote expires: 2 days (URGENT)
- Last contact: 1 day ago

**Market Data:** 6 similar Tundra deals (2018-2020)
- Average savings: 6.2%
- Price range: $39,500 - $48,900

**Expected Insight:** AI should notice you're offering above asking price and suggest revising your strategy based on market data showing 6-6.8% average savings.

---

## 🆘 Quick Fixes

| Problem | Fix |
|---------|-----|
| "AI service not configured" | Add OpenAI key to Supabase |
| "No active deals" | Ensure deal status is negotiating/quote_requested/final_offer |
| Nothing happens when clicking | Check browser console (F12) for errors |
| Auto-trigger doesn't work | Deal needs urgent condition OR cache expired |
| No market data in insights | Add more market_data entries |

---

## 📈 Success Criteria

You'll know it's working when:
1. ✅ Insights load in 3-5 seconds
2. ✅ Summary mentions your 2019 Tundra specifically
3. ✅ At least 2 insights with "Next Step" actions
4. ✅ Market data referenced ("Based on 6 deals...")
5. ✅ Cache badge appears on second load
6. ✅ Auto-trigger fires on page reload
7. ✅ Urgency banner shows "1 deal needs attention"
8. ✅ Notification appears in bell icon

---

## 💰 Cost Check

- Each analysis: ~$0.01 (1 penny)
- With cache: 50-70% savings
- Test 10 times: ~$0.03-0.05 total

**Monitor at:** https://platform.openai.com/usage

---

## 🎓 What This Demonstrates

Your Smart Insights system shows off:
- **AI Integration**: Real GPT-4o analysis
- **Intelligent Caching**: Cost-effective design
- **Event-Driven Architecture**: Auto-triggers on urgency
- **Data-Driven Insights**: Uses real market data
- **Real-Time Features**: Supabase subscriptions
- **Professional UX**: Loading states, error handling
- **Mobile-First Design**: Responsive across devices

This is production-ready, enterprise-level functionality!

---

**Total Testing Time:** 5-10 minutes
**Recommended Order:** Tests 1 → 2 → 3 → 4 → 5

Ready? Open your app and start with Test #1!
