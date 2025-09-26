# Mailgun Setup for HaggleHub

## 🌐 DNS Records for GoDaddy

Add these DNS records in your GoDaddy domain management:

### **MX Records (Required for receiving emails)**
```
Type: MX
Host: @
Points to: mxa.mailgun.org
Priority: 10
TTL: 1 Hour

Type: MX  
Host: @
Points to: mxb.mailgun.org
Priority: 10
TTL: 1 Hour
```

### **TXT Records (Required for authentication)**
```
Type: TXT
Host: @
Value: v=spf1 include:mailgun.org ~all
TTL: 1 Hour

Type: TXT
Host: krs._domainkey
Value: [Get this from your Mailgun dashboard under Domain Settings]
TTL: 1 Hour

Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@hagglehub.app
TTL: 1 Hour
```

### **CNAME Record (For tracking)**
```
Type: CNAME
Host: email
Points to: mailgun.org
TTL: 1 Hour
```

## 🔗 Webhook Configuration

In your Mailgun dashboard, set up these webhooks:

### **Setting Up Webhooks in Mailgun Dashboard:**

1. **Go to Mailgun Dashboard** → Select your `hagglehub.app` domain
2. **Navigate to Webhooks** (usually under "Sending" or "Settings")
3. **Add webhooks for these events:**

#### **For Email Status Tracking:**
- **Event**: `delivered` → **URL**: `https://[your-supabase-project].supabase.co/functions/v1/email-status`
- **Event**: `opened` → **URL**: `https://[your-supabase-project].supabase.co/functions/v1/email-status`
- **Event**: `clicked` → **URL**: `https://[your-supabase-project].supabase.co/functions/v1/email-status`
- **Event**: `bounced` → **URL**: `https://[your-supabase-project].supabase.co/functions/v1/email-status`
- **Event**: `dropped` → **URL**: `https://[your-supabase-project].supabase.co/functions/v1/email-status`

#### **For Inbound Email Processing:**
- Look for **"Routes"** or **"Receiving"** section in Mailgun
- Create a route that forwards emails to: `https://[your-supabase-project].supabase.co/functions/v1/receive-email`
- Pattern: `match_recipient("deals-.*@hagglehub.app")`
- Action: `forward("https://[your-supabase-project].supabase.co/functions/v1/receive-email")`

## 🧪 Testing

1. **Send Test Email**: Use the Messages page to send an email to a dealer
2. **Receive Test**: Send an email to `deals-admin123@hagglehub.app` 
3. **Check Logs**: Monitor Supabase Edge Function logs for any errors

## 📧 User Email Format

Users will get emails like: `deals-{user_identifier}@hagglehub.app`
- Example: `deals-abc123@hagglehub.app`
- All emails to this address will be automatically processed and assigned to deals

## 🔐 Security Notes

- All emails are processed through secure Edge Functions
- User identifiers are anonymized 
- No personal email addresses are exposed to dealers
- All communication is logged and tracked