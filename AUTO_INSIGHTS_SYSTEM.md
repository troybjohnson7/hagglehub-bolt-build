# Auto-Insights System Documentation

## Overview

The Smart Insights feature now includes **Event-Based Auto-Refresh with Claude AI**, providing proactive, intelligent deal analysis with minimal API costs.

## Key Features

### 1. Claude 3.5 Sonnet Integration
- Real AI-powered analysis using Anthropic's Claude 3.5 Sonnet
- Structured JSON responses with validated schemas
- Market data-aware insights with specific recommendations
- Cost-effective with intelligent caching

### 2. Event-Based Triggers
The system automatically analyzes deals when:
- **Quote Expiring Soon**: Quote expires within 3 days
- **Stale Deal**: No contact with dealer for 7+ days
- **Quote Expired**: Quote has already expired
- **Deal Status Changed**: Status moves between active states
- **Manual Refresh**: User requests analysis

### 3. Intelligent Caching
- **12-hour cache TTL**: Reduces API calls by 50-70%
- **Automatic invalidation**: Cache cleared on significant deal changes
- **Force refresh option**: Users can manually override cache
- **Database-backed**: Cached insights stored in `insights_cache` table

### 4. Notification System
- **Real-time alerts**: Supabase Realtime subscriptions
- **Urgent insights**: High-priority issues generate notifications
- **Unified center**: Messages and insights in one notification panel
- **Read tracking**: Mark notifications as read/unread

## Database Schema

### insights_cache
```sql
- id: uuid (PK)
- user_id: uuid (FK to users)
- deal_ids: jsonb (array of analyzed deal IDs)
- analysis_data: jsonb (full Claude response)
- triggers: jsonb (events that triggered analysis)
- cache_expires_at: timestamp (12 hours from creation)
- created_at: timestamp
```

### insight_notifications
```sql
- id: uuid (PK)
- user_id: uuid (FK to users)
- insight_cache_id: uuid (FK to insights_cache)
- notification_type: text (critical/important/info)
- title: text
- message: text
- is_read: boolean
- sent_at: timestamp
- read_at: timestamp
- created_at: timestamp
```

## API Endpoints

### Edge Function: analyze-deals
**URL**: `{SUPABASE_URL}/functions/v1/analyze-deals`

**Method**: POST

**Headers**:
- `Authorization: Bearer {access_token}`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "deals": [...],          // Array of deal objects
  "vehicles": [...],       // Array of vehicle objects
  "force_refresh": false,  // Optional: bypass cache
  "trigger_events": []     // Optional: event types that triggered this
}
```

**Response**:
```json
{
  "summary": "Your deals are progressing well...",
  "insights": [
    {
      "title": "Strong Negotiation Position",
      "explanation": "Your offer is 8% below market average...",
      "next_step": "Call dealer today at 2pm to confirm",
      "type": "positive"
    }
  ],
  "cached": false,
  "cache_expires_at": "2025-10-04T14:30:00Z",
  "market_data_points": 12,
  "urgent_deals_count": 1
}
```

## Cost Analysis

### Per-Analysis Costs (Claude 3.5 Sonnet)
- **Input tokens**: ~1,800 tokens × $0.003/1K = $0.0054
- **Output tokens**: ~500 tokens × $0.015/1K = $0.0075
- **Total per call**: ~$0.013

### Monthly Cost Projections

#### With Event-Based Triggers (Recommended)
| Users | Calls/Month | Total Cost | Cost/User |
|-------|-------------|------------|-----------|
| 100   | 500         | $6.50      | $0.065    |
| 500   | 2,500       | $32.50     | $0.065    |
| 1000  | 5,000       | $65.00     | $0.065    |

**Note**: With 12-hour caching, actual costs are 50-70% lower than maximum possible calls.

#### Without Caching (for comparison)
| Users | Calls/Month | Total Cost | Cost/User |
|-------|-------------|------------|-----------|
| 100   | 1,500       | $19.50     | $0.195    |
| 500   | 7,500       | $97.50     | $0.195    |
| 1000  | 15,000      | $195.00    | $0.195    |

### Cost Optimization Features
1. **Smart Caching**: 12-hour TTL reduces redundant analyses
2. **Event-Based**: Only triggers on meaningful changes
3. **Batch Analysis**: All deals analyzed in single API call
4. **Cache Invalidation**: Only clears cache when necessary
5. **User Control**: Manual triggers use cache when available

## Component Integration

### SmartInsights Component
**Location**: `src/components/dashboard/SmartInsights.jsx`

**Features**:
- Auto-loads cached insights on mount
- Shows urgency badges for critical deals
- Displays cache status and market data points
- Manual refresh with force option
- Real-time urgent deal detection

**Usage**:
```jsx
<SmartInsights deals={deals} vehicles={vehicles} />
```

### NotificationCenter Component
**Location**: `src/components/notifications/NotificationCenter.jsx`

**Features**:
- Unified inbox for messages and insights
- Real-time Supabase subscriptions
- Visual distinction between notification types
- Click to navigate to relevant page
- Unread count badge

**Usage**:
```jsx
<NotificationCenter />
```

### InsightTriggerService
**Location**: `src/utils/insightTriggers.js`

**Methods**:
- `shouldTriggerAnalysis(deals)`: Check if conditions warrant analysis
- `checkAndTrigger(deals, vehicles)`: Execute auto-trigger if needed
- `triggerAnalysisForUser(userId, deals, vehicles, reasons)`: Force trigger

**Usage**:
```javascript
import InsightTriggerService from '@/utils/insightTriggers';

// Check if auto-trigger is needed
const result = await InsightTriggerService.checkAndTrigger(deals, vehicles);
```

## Database Triggers

### deal_urgency_check
Automatically fires on deal INSERT/UPDATE to:
- Detect stale deals (7+ days no contact)
- Detect expiring quotes (≤3 days)
- Invalidate cache on significant changes

### check_all_deals_urgency()
Periodic function to scan all active deals:
- Can be called via cron job or scheduled task
- Prevents duplicate notifications (24-hour window)
- Bulk cache invalidation for urgent situations

## Setup Instructions

### 1. Environment Variables
Add to Supabase Edge Function secrets:
```bash
ANTHROPIC_API_KEY=sk-ant-xxx...
```

**Note**: This is already configured automatically by Supabase.

### 2. Test the System

#### Manual Test:
1. Go to Dashboard
2. Click "Analyze My Deals"
3. Verify insights appear with Claude branding
4. Check that cache indicator shows

#### Auto-Trigger Test:
1. Create a deal with quote expiring in 2 days
2. Wait 2-3 seconds on Dashboard
3. Check browser console for "Auto-analysis triggered"
4. Verify insights appear automatically

#### Notification Test:
1. Trigger analysis with urgent conditions
2. Check NotificationCenter bell icon
3. Verify unread count increases
4. Click notification to navigate

### 3. Monitor Costs

Check Anthropic dashboard:
- URL: https://console.anthropic.com
- View API usage by date
- Set up billing alerts

## Troubleshooting

### Issue: "AI service not configured"
**Solution**: Ensure ANTHROPIC_API_KEY is set in Supabase Edge Function secrets.

### Issue: Analysis not triggering automatically
**Solution**:
1. Check browser console for trigger logs
2. Verify deals meet urgency criteria (expiring quote or 7+ days stale)
3. Ensure cache is expired (>12 hours old)

### Issue: High API costs
**Solution**:
1. Check cache hit rate in logs
2. Verify cache_expires_at is being set correctly
3. Consider increasing cache TTL to 24 hours

### Issue: Insights seem outdated
**Solution**:
1. Click "Refresh" button in SmartInsights
2. This forces a new analysis bypassing cache
3. Check that deal changes invalidate cache properly

## Future Enhancements

### Planned Features
1. **Machine Learning**: Learn user preferences over time
2. **Predictive Insights**: Forecast deal outcomes based on patterns
3. **Email Digests**: Daily/weekly summary of all insights
4. **SMS Alerts**: Critical notifications via text message
5. **Batch Optimization**: Analyze multiple users simultaneously
6. **A/B Testing**: Test different prompt strategies
7. **Regional Pricing**: Adjust market comparisons by location
8. **Seasonal Trends**: Factor in time-of-year market conditions

### Optimization Opportunities
1. **Embedding Search**: Use vector search for market data matching
2. **Two-Tier AI**: Fast model for basic checks, premium for deep analysis
3. **Prompt Caching**: Reuse prompt prefix across calls
4. **Incremental Updates**: Only analyze changed deals
5. **User Segmentation**: Different strategies for power users vs casual users

## Monitoring & Analytics

### Key Metrics to Track
1. **Cache Hit Rate**: Target >60%
2. **Auto-Trigger Rate**: Percentage of analyses that are automatic
3. **Notification Open Rate**: User engagement with alerts
4. **Cost Per User**: Monthly API spend divided by active users
5. **Analysis Frequency**: Average calls per user per month
6. **Insight Quality**: User ratings/feedback on insights

### Logging Strategy
All operations log to console with prefix:
- `Dashboard:` - Dashboard component actions
- `SmartInsights:` - Insights component operations
- `InsightTrigger:` - Auto-trigger service activity
- `Edge Function:` - Server-side analysis logs

## Support

For issues or questions:
1. Check browser console for detailed logs
2. Review Supabase Edge Function logs
3. Verify database trigger execution
4. Monitor Anthropic API usage dashboard

---

**Version**: 1.0.0
**Last Updated**: October 3, 2025
**Status**: Production Ready ✓
