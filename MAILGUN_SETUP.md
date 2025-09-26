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

### **Inbound Email Webhook**
- **URL**: `https://[your-supabase-project].supabase.co/functions/v1/receive-email`
- **Events**: All inbound messages
- **Method**: POST

### **Email Status Webhook**  
- **URL**: `https://[your-supabase-project].supabase.co/functions/v1/email-status`
- **Events**: delivered, opened, clicked, bounced, dropped
- **Method**: POST

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