# AI Concierge Troubleshooting Guide

This guide helps you diagnose and fix common issues with the AI Concierge system.

## Quick Diagnostic

Run the diagnostic script to automatically check your configuration:

```bash
npx tsx scripts/diagnose-ai-concierge.ts
```

This will check:
- Environment variables
- Supabase connection
- Edge function deployment
- Database tables
- API key configuration

## Common Issues and Solutions

### 1. "I'm having trouble connecting right now"

**Symptoms:**
- AI Concierge always shows "I'm having trouble connecting right now"
- No specific error message

**Causes and Solutions:**

#### Missing LOVABLE_API_KEY

**How to check:**
- Look in browser console for: `❌ LOVABLE_API_KEY not configured`
- Diagnostic script shows: `LOVABLE_API_KEY is not configured`

**Solution:**
1. Get your Lovable API key from https://lovable.dev
2. Add it to Supabase:
   - Go to Supabase Dashboard
   - Navigate to Edge Functions > Secrets
   - Add new secret: `LOVABLE_API_KEY` = your API key
3. Redeploy the edge function:
   ```bash
   supabase functions deploy lovable-concierge
   ```

#### Invalid or Expired API Key

**How to check:**
- Error message: "Authentication Failed"
- Response includes: `error: 'invalid_api_key'`

**Solution:**
1. Verify your Lovable API key at https://lovable.dev
2. Update the key in Supabase Dashboard > Edge Functions > Secrets
3. Redeploy the edge function

#### Edge Function Not Deployed

**How to check:**
- Error message includes: "Function not found"
- Diagnostic script shows: `lovable-concierge edge function is not deployed`

**Solution:**
```bash
# Deploy the edge function
supabase functions deploy lovable-concierge

# Verify deployment
supabase functions list
```

### 2. "Configuration Error" Messages

**Symptoms:**
- Detailed error messages about missing configuration
- Diagnostic information displayed

**Solution:**
The error message will include specific steps to fix the issue. Follow the instructions in the error message.

### 3. Network/Connectivity Errors

**Symptoms:**
- "Network Error" or "Unable to connect to Lovable AI Gateway"
- Intermittent failures

**Possible Causes:**
1. **Internet connectivity issues**
   - Check your internet connection
   - Try accessing the app from a different network

2. **Lovable API service down**
   - Check Lovable status at https://status.lovable.dev (if available)
   - Wait a few minutes and try again

3. **Firewall or proxy blocking**
   - Check if your firewall is blocking `ai.gateway.lovable.dev`
   - Whitelist the domain if necessary

### 4. Context/Data Loading Issues

**Symptoms:**
- "Context Error" or "Failed to load trip context"
- AI responses lack trip-specific information

**Possible Causes:**

#### Missing Database Tables

**Solution:**
```bash
# Apply all migrations
supabase db push

# Verify tables exist
supabase db diff
```

#### Database Connection Issues

**Solution:**
1. Check Supabase project status in dashboard
2. Verify RLS policies allow data access
3. Check that user is authenticated

### 5. Rate Limiting Issues

**Symptoms:**
- "Rate limit reached" message
- Error after multiple quick requests

**For Free Users:**
- You have 10 queries per day
- Limit resets at midnight
- Upgrade to Pro for unlimited access

**For Pro Users:**
- If you see rate limits, there may be an API quota issue
- Check Lovable account credits
- Contact support if issue persists

### 6. Empty or Generic Responses

**Symptoms:**
- AI responds but without trip-specific context
- Recommendations don't match trip details

**Possible Causes:**

#### Trip Data Not Loading

**Solution:**
1. Check that trip has data (messages, events, tasks, etc.)
2. Verify RLS policies allow reading trip data
3. Check browser console for errors

#### Context Aggregation Failing

**Solution:**
1. Check the `TripContextBuilder` logs in Supabase edge function logs
2. Verify all context tables exist and are accessible
3. Run diagnostic script to identify missing tables

## Debugging Steps

### 1. Check Browser Console

Open browser DevTools (F12) and look for:
- `❌` error messages
- Failed API calls
- Network errors

### 2. Check Supabase Edge Function Logs

```bash
# View recent logs
supabase functions logs lovable-concierge

# Follow logs in real-time
supabase functions logs lovable-concierge --follow
```

Look for:
- API key errors
- Network failures
- Database errors
- Context building errors

### 3. Test Edge Function Directly

```bash
# Test with curl
curl -X POST 'https://your-project.supabase.co/functions/v1/lovable-concierge' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Hello",
    "isDemoMode": true
  }'
```

Check the response for error details.

### 4. Verify Database Access

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('trips', 'trip_members', 'trip_chat_messages', 'trip_events', 'concierge_usage');

-- Check RLS policies
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'concierge_usage';
```

## Configuration Checklist

Use this checklist to verify your setup:

- [ ] Supabase project created and configured
- [ ] Environment variables set (SUPABASE_URL, SUPABASE_ANON_KEY)
- [ ] Database migrations applied
- [ ] All required tables exist
- [ ] Edge function deployed
- [ ] LOVABLE_API_KEY configured in Supabase secrets
- [ ] Lovable API key is valid and active
- [ ] RLS policies allow data access
- [ ] Network can reach ai.gateway.lovable.dev

## Getting Help

If you're still experiencing issues:

1. **Run the diagnostic script:**
   ```bash
   npx tsx scripts/diagnose-ai-concierge.ts
   ```

2. **Check the documentation:**
   - [AI_CONCIERGE_SETUP.md](./AI_CONCIERGE_SETUP.md) - Setup guide
   - [AI_CONCIERGE_ADVANCED.md](./AI_CONCIERGE_ADVANCED.md) - Advanced features

3. **Gather diagnostic information:**
   - Browser console errors
   - Edge function logs
   - Diagnostic script output
   - Error messages from the UI

4. **Contact support:**
   - Include all diagnostic information
   - Describe what you were trying to do
   - Share any error messages

## API Key Setup Guide

### Getting Your Lovable API Key

1. Go to https://lovable.dev
2. Sign up or log in
3. Navigate to API Settings or Dashboard
4. Generate a new API key
5. Copy the key (you won't be able to see it again)

### Adding the Key to Supabase

1. Open Supabase Dashboard
2. Select your project
3. Go to **Edge Functions** in the sidebar
4. Click on **Secrets** tab
5. Click **Add Secret**
6. Enter:
   - Name: `LOVABLE_API_KEY`
   - Value: your API key from Lovable
7. Click **Save**
8. Redeploy your edge function:
   ```bash
   supabase functions deploy lovable-concierge
   ```

### Verifying the Configuration

After adding the key:

1. Wait 1-2 minutes for the deployment to complete
2. Test the AI Concierge in your app
3. You should now see proper responses instead of errors
4. Check the browser console - errors should be gone

## Performance Optimization

If the AI Concierge is slow:

1. **Check context size:**
   - Large trips with lots of data can slow down context building
   - Consider implementing pagination for very large datasets

2. **Enable caching:**
   - The system uses a 5-minute cache by default
   - Verify cache is working by checking repeated queries

3. **Optimize database queries:**
   - Ensure indexes exist on frequently queried columns
   - Check query performance in Supabase dashboard

4. **Monitor API response times:**
   - Check Lovable API latency
   - Consider upgrading to a faster plan if needed

## Security Best Practices

1. **Never commit API keys to git**
   - Use `.env` files (gitignored)
   - Store keys in Supabase secrets

2. **Rotate keys periodically**
   - Generate new API keys every few months
   - Update them in Supabase secrets

3. **Monitor usage**
   - Check Lovable dashboard for unusual activity
   - Set up alerts for high usage

4. **Implement rate limiting**
   - Free tier: 10 queries/day (already implemented)
   - Adjust limits based on your needs

## Monitoring and Alerts

Set up monitoring to catch issues early:

1. **Supabase Logs:**
   - Monitor edge function logs regularly
   - Set up log alerts for errors

2. **Usage Tracking:**
   - Monitor `concierge_usage` table
   - Track query volumes and patterns

3. **Error Rates:**
   - Track error responses
   - Alert on high error rates

4. **Performance Metrics:**
   - Monitor response times
   - Track cache hit rates

## Next Steps

After fixing issues:

1. **Test thoroughly:**
   - Try various queries
   - Test with different trip types
   - Verify context awareness

2. **Monitor performance:**
   - Check response times
   - Verify cache is working
   - Monitor API usage

3. **Gather feedback:**
   - Get user feedback on AI responses
   - Iterate on prompts and context

4. **Plan for scale:**
   - Monitor usage growth
   - Plan capacity upgrades
   - Consider cost optimization
