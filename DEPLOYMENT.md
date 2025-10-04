# HaggleHub Deployment Guide

## Prerequisites

- GitHub repository connected to Render
- Render account with static site service
- Custom domain: hagglehub.app
- Supabase project with Edge Functions deployed
- Mailgun configured with DNS records
- OpenAI API key added to Supabase

## Environment Variables Required in Render

Add these environment variables in your Render dashboard under "Environment":

```
VITE_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Render Configuration

The `render.yaml` file is already configured with:

- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `./dist`
- **Node Version**: 18.17.0
- **SPA Routing**: Automatic redirects to index.html
- **Cache Headers**: Optimized for static assets

## Deployment Steps

### 1. Push to GitHub

```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### 2. Create Render Static Site

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Static Site"
3. Connect your GitHub repository
4. Render will auto-detect the `render.yaml` configuration
5. Add environment variables in the "Environment" section
6. Click "Create Static Site"

### 3. Configure Custom Domain

1. In Render dashboard, go to your static site settings
2. Navigate to "Custom Domain" section
3. Add `hagglehub.app` as custom domain
4. Render will provide a CNAME target (e.g., `hagglehub-app.onrender.com`)

### 4. Update DNS in GoDaddy

1. Log in to GoDaddy DNS management
2. Add/Update CNAME record:
   - **Type**: CNAME
   - **Host**: @
   - **Points to**: `your-render-url.onrender.com`
   - **TTL**: 1 Hour

3. For www subdomain (optional):
   - **Type**: CNAME
   - **Host**: www
   - **Points to**: `your-render-url.onrender.com`
   - **TTL**: 1 Hour

### 5. Verify Mailgun Configuration

Ensure these DNS records are set in GoDaddy (from MAILGUN_SETUP.md):

- MX records for email receiving
- TXT records for SPF and DKIM
- CNAME for tracking

### 6. Update Supabase Settings

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to Authentication → URL Configuration
3. Add these URLs:
   - **Site URL**: `https://hagglehub.app`
   - **Redirect URLs**:
     - `https://hagglehub.app/**`
     - `http://localhost:5173/**` (for local development)

### 7. Verify Edge Functions

Ensure all Edge Functions have required environment variables:

- `OPENAI_API_KEY` - For analyze-deals function
- `MAILGUN_DOMAIN` - For send-email function
- `MAILGUN_API_KEY` - For send-email function
- `SUPABASE_URL` - Auto-configured
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-configured

### 8. SSL Certificate

- Render automatically provisions SSL certificates
- Wait 5-10 minutes after DNS propagation
- Verify HTTPS is working at `https://hagglehub.app`

## Post-Deployment Checklist

- [ ] Site loads at hagglehub.app
- [ ] HTTPS is enabled and working
- [ ] User authentication works correctly
- [ ] Deal creation and management functions
- [ ] Email sending works via Mailgun
- [ ] Email receiving works to deals-*@hagglehub.app
- [ ] Smart Insights loads with OpenAI integration
- [ ] All routes work correctly (no 404 errors)
- [ ] Mobile responsive design verified
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)

## Monitoring and Maintenance

### Render Dashboard

- Monitor build logs for errors
- Check bandwidth and performance metrics
- Set up deploy notifications

### Supabase Dashboard

- Monitor database usage and queries
- Check Edge Function logs for errors
- Review authentication metrics

### Mailgun Dashboard

- Monitor email delivery rates
- Check bounce and spam reports
- Review webhook activity

## Troubleshooting

### Build Fails

- Check environment variables are set correctly
- Review build logs in Render dashboard
- Ensure package.json dependencies are correct

### Routes Return 404

- Verify `render.yaml` has correct redirect rules
- Check that `dist` folder contains index.html
- Ensure SPA routing is configured

### Authentication Errors

- Verify Supabase URL configuration
- Check redirect URLs in Supabase Auth settings
- Ensure environment variables match production

### Email Not Working

- Verify Mailgun DNS records are propagated (use DNS checker)
- Check Mailgun logs for delivery issues
- Confirm webhook URLs point to production domain

## Rollback Procedure

If deployment issues occur:

1. In Render dashboard, go to "Deploys" tab
2. Find the last working deployment
3. Click "Redeploy" on that version
4. Monitor logs to ensure successful rollback

## Support

- Render Support: https://render.com/docs
- Supabase Support: https://supabase.com/docs
- Mailgun Support: https://help.mailgun.com
