# Supabase Local Development Setup

## ✅ Setup Status: COMPLETE

The Chravel project is configured for **remote Supabase development**. Local Supabase stack (Docker-based) is optional for development.

## Current Configuration

### Remote Instance (Production)
- **Project URL:** `https://jmjiyekmxwsxkfnqwyaa.supabase.co`
- **Project ID:** `jmjiyekmxwsxkfnqwyaa`
- **Status:** ✅ Active and configured
- **Supabase CLI:** ✅ Installed as dev dependency (v2.53.6)

### Database Schema
- **Migrations:** 76 SQL migration files in `/supabase/migrations/`
- **Tables:** All production tables configured with Row Level Security (RLS)
- **Triggers:** Automated triggers for updated_at timestamps
- **Functions:** PostgreSQL functions for complex queries

### Edge Functions (43 total)
Located in `/supabase/functions/`:

**AI & Concierge (7 functions):**
- `ai-features` - AI feature orchestration
- `ai-search` - Contextual AI search
- `ai-answer` - AI Q&A responses
- `ai-ingest` - Document ingestion
- `lovable-concierge` - Gemini-powered concierge
- `gemini-chat` - Gemini chat integration
- `openai-chat` - OpenAI chat integration

**Location & Maps (4 functions):**
- `google-maps-proxy` - Secure Google Maps API proxy
- `place-grounding` - Location verification
- `venue-enricher` - Venue data enrichment
- `update-location` - Real-time location updates

**Payment & Subscription (3 functions):**
- `create-checkout` - Stripe checkout sessions
- `check-subscription` - Subscription validation
- `customer-portal` - Stripe customer portal

**Organization Management (3 functions):**
- `invite-organization-member` - Team invitations
- `accept-organization-invite` - Invitation acceptance
- `link-trip-to-organization` - Trip-org linking

**Messaging & Communication (7 functions):**
- `broadcasts-create` - Priority broadcasts
- `broadcasts-fetch` - Broadcast retrieval
- `broadcasts-react` - Broadcast reactions
- `message-parser` - Message parsing
- `message-scheduler` - Scheduled messages
- `push-notifications` - FCM push notifications
- `daily-digest` - Daily summary emails

**Content & Media (4 functions):**
- `image-upload` - Image processing & upload
- `file-upload` - File handling
- `upload-campaign-image` - Campaign assets
- `receipt-parser` - OCR receipt parsing

**Trip Management (6 functions):**
- `create-trip` - Trip creation
- `join-trip` - Trip joining
- `approve-join-request` - Join request approval
- `calendar-sync` - Calendar integration
- `event-reminders` - Event notifications
- `payment-reminders` - Payment notifications

**Utilities & Search (9 functions):**
- `health` - Health check endpoint
- `search` - Full-text search
- `populate-search-index` - Search indexing
- `seed-demo-data` - Demo data generation
- `seed-mock-messages` - Mock message data
- `enhanced-ai-parser` - Advanced parsing
- `file-ai-parser` - AI file parsing
- `delete-stale-locations` - Cleanup job

### Shared Utilities
Located in `/supabase/functions/_shared/`:
- `contextBuilder.ts` - AI context building
- `cors.ts` - CORS configuration
- `errorHandling.ts` - Error management
- `security.ts` - Security utilities
- `securityHeaders.ts` - Security headers
- `validation.ts` - Input validation schemas

## Accessing Supabase Studio

### Remote Instance (Current Setup)
1. Visit: https://app.supabase.com
2. Login with your credentials
3. Select project: `jmjiyekmxwsxkfnqwyaa`

**Available Features:**
- Table Editor - View/edit data
- SQL Editor - Run queries
- Database → Functions - Manage PostgreSQL functions
- Database → Triggers - Manage triggers
- Authentication - User management
- Storage - File management
- Edge Functions - Deploy/monitor functions
- Logs - View function logs and errors
- API Docs - Auto-generated API documentation

### Local Instance (Optional - Requires Docker)
If you need to run Supabase locally:

```bash
# Prerequisites
# - Docker Desktop installed and running
# - macOS, Windows, or Linux

# Start local Supabase stack
npx supabase start

# Access local Studio
open http://localhost:54323

# Stop local stack
npx supabase stop
```

**Note:** The current workspace environment doesn't support Docker, so local development uses the remote instance.

## Development Workflow

### 1. Making Database Changes

**Create Migration:**
```bash
npx supabase migration new <migration_name>
```

**Apply Migration to Remote:**
```bash
npx supabase db push
```

**Pull Remote Schema:**
```bash
npx supabase db pull
```

### 2. Deploying Edge Functions

**Deploy Single Function:**
```bash
npx supabase functions deploy <function_name>
```

**Deploy All Functions:**
```bash
npx supabase functions deploy
```

**Set Function Secrets:**
```bash
npx supabase secrets set OPENAI_API_KEY=sk-xxx
npx supabase secrets set STRIPE_SECRET_KEY=sk_xxx
npx supabase secrets set FCM_SERVER_KEY=xxx
```

**View Function Logs:**
```bash
npx supabase functions logs <function_name>
```

### 3. Generating TypeScript Types

**Update Type Definitions:**
```bash
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

**Automatically Generated Types:**
- All database tables
- All views
- All functions
- All enums
- Relationships

### 4. Testing Functions Locally

**Serve Functions Locally:**
```bash
npx supabase functions serve
```

**Invoke Function:**
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/<function_name>' \
  --header 'Authorization: Bearer SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"key":"value"}'
```

## Environment Variables

### Required for Edge Functions (Server-Side)

Set these in Supabase Dashboard → Project Settings → Edge Functions:

```bash
# Automatically provided by Supabase
SUPABASE_URL=https://jmjiyekmxwsxkfnqwyaa.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# AI Services
OPENAI_API_KEY=sk-proj-xxx
LOVABLE_API_KEY=xxx

# Google Services
GOOGLE_MAPS_API_KEY=AIzaSy...

# Payments
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email
RESEND_API_KEY=re_xxx

# Push Notifications
FCM_SERVER_KEY=AAAAxxx

# Chat
STREAM_API_SECRET=xxx
```

### Frontend Environment Variables

Located in `.env.production` (not in repo):

```bash
VITE_SUPABASE_URL=https://jmjiyekmxwsxkfnqwyaa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
VITE_STREAM_API_KEY=xxx
```

## Troubleshooting

### Function Deployment Issues

**Check function logs:**
```bash
npx supabase functions logs <function_name> --follow
```

**Test function locally:**
```bash
npx supabase functions serve <function_name>
```

### Database Migration Issues

**Reset local database:**
```bash
npx supabase db reset
```

**Check migration status:**
```bash
npx supabase migration list
```

### Connection Issues

**Check project status:**
```bash
npx supabase status
```

**Link to correct project:**
```bash
npx supabase link --project-ref jmjiyekmxwsxkfnqwyaa
```

## Key Files & Directories

```
/workspace/
├── supabase/
│   ├── config.toml              # Supabase configuration
│   ├── migrations/              # 76 SQL migration files
│   └── functions/               # 43 Edge Functions + shared utilities
├── src/
│   └── integrations/
│       └── supabase/
│           ├── client.ts        # Supabase client config
│           └── types.ts         # Auto-generated types (2800+ lines)
└── .env.production.example      # Environment variable template
```

## Resources

- **Supabase Dashboard:** https://app.supabase.com/project/jmjiyekmxwsxkfnqwyaa
- **Supabase Docs:** https://supabase.com/docs
- **Edge Functions Docs:** https://supabase.com/docs/guides/functions
- **CLI Reference:** https://supabase.com/docs/reference/cli

## Next Steps for Development Agency

1. **Get Supabase Access:**
   - Request admin access to project `jmjiyekmxwsxkfnqwyaa`
   - Install Supabase CLI: `npm install supabase --save-dev` (already done)

2. **Set Up Environment:**
   - Copy `.env.production.example` to `.env.production`
   - Request all API keys from client (see AGENCY_HANDOFF.md)

3. **Deploy Changes:**
   - Make schema changes via migrations
   - Deploy functions with `npx supabase functions deploy`
   - Test thoroughly in staging environment

4. **Monitor Production:**
   - Watch function logs in Supabase Dashboard
   - Set up error alerts
   - Monitor database performance

---

**Setup Completed:** 2025-10-26  
**Supabase CLI Version:** 2.53.6  
**Project Status:** Production-ready, remote instance active
