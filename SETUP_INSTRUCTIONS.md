# Setup Instructions for Basecamp and Concierge Features

## Overview
This document provides step-by-step instructions to set up the Concierge chat and Basecamp location features.

## 🗺️ **Part 1: Google Maps API Configuration (CRITICAL for Basecamp)**

The "Could not find address" error you're seeing is because the Google Maps API key is missing.

### ✅ **Step 1: Create Google Cloud Project and Enable APIs**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - **Maps Embed API**
   - **Geocoding API** 
   - **Distance Matrix API**
   - **Places API**

### ✅ **Step 2: Create API Key**
1. Go to APIs & Services → Credentials
2. Click "Create Credentials" → "API Key"
3. Copy the generated API key
4. **Important**: Restrict the API key to your domain for security

### ✅ **Step 3: Add GOOGLE_MAPS_API_KEY to Supabase Secrets**
1. Go to your Supabase dashboard
2. Navigate to **Project Settings** → **Environment Variables**
3. Click **Add Variable**
4. Name: `GOOGLE_MAPS_API_KEY`
5. Value: Your Google Maps API key
6. Click **Save**

### ✅ **Step 4: Re-deploy Edge Function**
- In your Supabase dashboard, go to **Edge Functions**
- Find `google-maps-proxy` function and click **Deploy**
- Wait for deployment to complete

### ✅ **Step 5: Test Basecamp Setup**
1. Go to Places tab in your trip
2. Try setting a basecamp (e.g., "SoFi Stadium, Los Angeles")
3. It should geocode successfully without "Could not find address" error
4. Map should center on your basecamp location
5. All searches should now show distance from basecamp

## 🤖 **Part 2: OpenAI API Configuration (for Concierge Chat)**

### ✅ **Step 1: Add OPENAI_API_KEY to Supabase Secrets**
1. **Get your OpenAI API Key:**
   - Go to [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a new API key if you don't have one
   - Copy the key (starts with `sk-...`)

2. **Add to Supabase Secrets:**
   - Go to your Supabase dashboard
   - Navigate to **Project Settings** → **Environment Variables**
   - Click **Add Variable**
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key
   - Click **Save**

### ✅ **Step 2: Re-deploy Edge Functions**
- In your Supabase dashboard, go to **Edge Functions**
- Find `openai-chat` function and click **Deploy**
- Wait for deployment to complete

### ✅ **Step 3: Test the Setup**
1. Open your trip page
2. Navigate to the Chat tab
3. Try asking: "Where should I eat tonight?"
4. You should receive real AI responses, not fallback messages

## 🎯 **Expected Behavior After Full Setup**

### Basecamp Integration:
- ✅ Set any address as your trip's basecamp (e.g., "SoFi Stadium")
- ✅ All map searches automatically center around basecamp
- ✅ Distance calculations from basecamp to any location
- ✅ "Search near basecamp" functionality in maps
- ✅ When searching for "restaurants", results show distance from SoFi Stadium

### Concierge Chat:
- ✅ Natural language questions about your trip
- ✅ Location-aware recommendations using basecamp context
- ✅ Real-time AI responses powered by OpenAI (no "Limited Mode")
- ✅ Trip-specific information queries

### UI/UX Improvements Already Applied:
- ✅ Removed all "OpenAI" branding from user interface
- ✅ Changed to just "Concierge" 
- ✅ Updated example queries to be more natural
- ✅ Removed debug commands from examples
- ✅ Improved error messages to be user-friendly

## 🔧 **Troubleshooting**

### Basecamp Issues:
- **"Could not find address" error**: Google Maps API key missing or APIs not enabled
- **Map not loading**: Check browser console for API key errors
- **Distance calculations failing**: Ensure Distance Matrix API is enabled

### Concierge Issues:
- **"Limited Mode" or "Service Unavailable"**: OpenAI API key missing or invalid
- **No responses**: Check Supabase Edge Function logs
- **Slow responses**: Normal for first request after deployment

### Checking Logs:
- Go to Supabase Dashboard → Edge Functions → [function-name] → Logs
- Check both `google-maps-proxy` and `openai-chat` function logs

## 💰 **Cost Information**

### Google Maps APIs:
- Most APIs have free monthly quotas
- Typical usage: $5-20/month for active trip planning
- Set spending limits in Google Cloud Console

### OpenAI APIs:
- Charges per token used
- Typical trip questions: $0.01-0.05 per interaction
- Set usage limits in OpenAI dashboard

## 🔒 **Security Notes**

- Restrict Google Maps API key to your domain
- Monitor API usage in respective consoles
- Set spending limits to prevent unexpected charges
- Keep API keys secure and never commit to version control

---

**Priority Order:**
1. Set up Google Maps API first (fixes basecamp errors)
2. Set up OpenAI API second (enables real concierge responses)
3. Test both features together for full integration

Once both are configured, users can set "SoFi Stadium" as basecamp and search for "restaurants" to see results sorted by distance from SoFi Stadium, with the AI concierge providing contextual recommendations.