# API Documentation

## Overview

Chravel uses Supabase Edge Functions (Deno) for serverless API endpoints. This document provides:
- API endpoint reference
- Request/response schemas
- Authentication requirements
- Rate limiting and quotas

## Generating API Documentation

### TypeDoc Setup

TypeDoc generates API documentation from JSDoc comments in edge functions.

**Installation:**
```bash
npm install --save-dev typedoc typedoc-plugin-markdown
```

**Configuration:** Create `typedoc.json`:
```json
{
  "entryPoints": ["supabase/functions/**/*.ts"],
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown"],
  "exclude": ["**/_shared/**"],
  "excludePrivate": true,
  "excludeProtected": true,
  "readme": "docs/API_DOCUMENTATION.md"
}
```

**Generate docs:**
```bash
npm run docs:generate
```

Add to `package.json`:
```json
{
  "scripts": {
    "docs:generate": "typedoc",
    "docs:serve": "npx serve docs/api"
  }
}
```

## Edge Functions Reference

### Authentication Endpoints

#### `lovable-concierge`
**Purpose:** AI-powered travel concierge using Lovable/Gemini API

**Endpoint:** `POST /functions/v1/lovable-concierge`

**Request:**
```typescript
{
  message: string;              // User query (1-2000 chars)
  tripId?: string;              // Optional trip context
  tripContext?: TripContext;    // Pre-loaded trip data
  chatHistory?: ChatMessage[]; // Conversation history
  isDemoMode?: boolean;         // Skip auth for demos
  config?: {
    model?: string;             // 'gemini-pro' | 'gpt-4'
    temperature?: number;       // 0-1
    maxTokens?: number;         // 100-4000
    systemPrompt?: string;      // Custom system prompt
  }
}
```

**Response:**
```typescript
{
  response: string;             // AI response text
  sources?: string[];           // Citations/references
  suggestions?: string[];       // Follow-up suggestions
  metadata?: {
    model: string;
    tokensUsed: number;
    latency: number;
  }
}
```

**Authentication:** Requires `Authorization: Bearer <supabase_token>`

**Rate Limits:** 100 requests/hour per user

---

#### `gemini-chat`
**Purpose:** Direct Gemini API chat endpoint

**Endpoint:** `POST /functions/v1/gemini-chat`

**Request:**
```typescript
{
  message: string;
  chatHistory?: ChatMessage[];
  imageBase64?: string;         // Optional image input
  analysisType?: 'chat' | 'sentiment' | 'review' | 'audio' | 'image';
  config?: ModelConfig;
}
```

**Response:**
```typescript
{
  response: string;
  metadata: {
    model: string;
    tokensUsed: number;
  }
}
```

---

### Trip Management

#### `create-trip`
**Purpose:** Create a new trip with initial setup

**Endpoint:** `POST /functions/v1/create-trip`

**Request:**
```typescript
{
  name: string;
  description?: string;
  startDate?: string;           // ISO 8601
  endDate?: string;            // ISO 8601
  destination?: {
    name: string;
    lat?: number;
    lng?: number;
  };
  privacy: 'public' | 'private' | 'invite-only';
  initialMembers?: string[];   // User IDs
}
```

**Response:**
```typescript
{
  trip: Trip;
  channels: Channel[];          // Default channels created
  success: boolean;
}
```

---

#### `join-trip`
**Purpose:** Join a trip via invite code or link

**Endpoint:** `POST /functions/v1/join-trip`

**Request:**
```typescript
{
  tripId: string;
  inviteCode?: string;         // Required for invite-only trips
  role?: string;               // Requested role
}
```

**Response:**
```typescript
{
  success: boolean;
  trip: Trip;
  membership: TripMembership;
}
```

---

### Messaging & Chat

#### `message-parser`
**Purpose:** Parse natural language messages for actions (tasks, polls, etc.)

**Endpoint:** `POST /functions/v1/message-parser`

**Request:**
```typescript
{
  message: string;
  tripId: string;
  userId: string;
  channelId?: string;
}
```

**Response:**
```typescript
{
  intent: 'task' | 'poll' | 'expense' | 'place' | 'message';
  entities: {
    task?: TaskEntity;
    poll?: PollEntity;
    expense?: ExpenseEntity;
    place?: PlaceEntity;
  };
  confidence: number;          // 0-1
}
```

---

#### `send-trip-notification`
**Purpose:** Send push/email notifications for trip events

**Endpoint:** `POST /functions/v1/send-trip-notification`

**Request:**
```typescript
{
  tripId: string;
  type: 'message' | 'task' | 'expense' | 'event' | 'broadcast';
  title: string;
  body: string;
  userIds?: string[];          // Specific users, or all if omitted
  priority?: 'low' | 'normal' | 'high';
  data?: Record<string, any>;  // Deep link data
}
```

**Response:**
```typescript
{
  sent: number;                // Count of notifications sent
  failed: number;
  errors?: string[];
}
```

---

### Media & Files

#### `image-upload`
**Purpose:** Upload and process images with compression

**Endpoint:** `POST /functions/v1/image-upload`

**Request:** `multipart/form-data`
- `file`: Image file (max 10MB)
- `tripId`: string
- `metadata`: JSON string with `{ caption, location, tags }`

**Response:**
```typescript
{
  url: string;                 // Public URL
  thumbnailUrl: string;
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
  }
}
```

---

#### `file-upload`
**Purpose:** Upload documents (PDFs, receipts, etc.)

**Endpoint:** `POST /functions/v1/file-upload`

**Request:** `multipart/form-data`
- `file`: File (max 25MB)
- `tripId`: string
- `type`: 'receipt' | 'document' | 'other'

**Response:**
```typescript
{
  url: string;
  metadata: {
    name: string;
    size: number;
    mimeType: string;
  }
}
```

---

### Payments & Expenses

#### `receipt-parser`
**Purpose:** OCR and parse receipt images

**Endpoint:** `POST /functions/v1/receipt-parser`

**Request:**
```typescript
{
  imageUrl: string;            // Supabase Storage URL
  tripId: string;
}
```

**Response:**
```typescript
{
  merchant: string;
  total: number;
  currency: string;
  date: string;
  items: Array<{
    name: string;
    price: number;
    quantity?: number;
  }>;
  tax?: number;
  tip?: number;
}
```

---

#### `create-checkout`
**Purpose:** Create Stripe checkout session for payments

**Endpoint:** `POST /functions/v1/create-checkout`

**Request:**
```typescript
{
  tripId: string;
  amount: number;              // In cents
  currency: string;            // 'usd', 'eur', etc.
  description: string;
  successUrl: string;
  cancelUrl: string;
}
```

**Response:**
```typescript
{
  sessionId: string;
  url: string;                // Stripe checkout URL
}
```

---

### Search & AI

#### `search`
**Purpose:** Full-text search across trips, messages, media

**Endpoint:** `POST /functions/v1/search`

**Request:**
```typescript
{
  query: string;
  tripId?: string;            // Scope to trip
  types?: ('trip' | 'message' | 'media' | 'task')[];
  limit?: number;             // Default 20
  offset?: number;
}
```

**Response:**
```typescript
{
  results: Array<{
    type: string;
    id: string;
    title: string;
    snippet: string;
    score: number;
    metadata: Record<string, any>;
  }>;
  total: number;
}
```

---

#### `ai-search`
**Purpose:** Semantic search using embeddings

**Endpoint:** `POST /functions/v1/ai-search`

**Request:**
```typescript
{
  query: string;
  tripId: string;
  limit?: number;
}
```

**Response:** Same as `search` endpoint

---

### Google Maps Integration

#### `google-maps-proxy`
**Purpose:** Proxy Google Maps API requests (rate limiting, caching)

**Endpoint:** `POST /functions/v1/google-maps-proxy`

**Request:**
```typescript
{
  service: 'places' | 'directions' | 'geocoding' | 'distance-matrix';
  params: Record<string, any>; // Service-specific params
}
```

**Response:** Varies by service

**Rate Limits:** 1000 requests/day per trip

---

#### `place-grounding`
**Purpose:** Validate and enrich place data from user input

**Endpoint:** `POST /functions/v1/place-grounding`

**Request:**
```typescript
{
  query: string;              // "Starbucks near Times Square"
  location?: { lat: number; lng: number };
  tripId?: string;
}
```

**Response:**
```typescript
{
  place: {
    placeId: string;
    name: string;
    address: string;
    location: { lat: number; lng: number };
    types: string[];
    rating?: number;
  };
  confidence: number;
}
```

---

### Broadcasts (Enterprise)

#### `broadcasts-create`
**Purpose:** Create a broadcast message

**Endpoint:** `POST /functions/v1/broadcasts-create`

**Request:**
```typescript
{
  tripId: string;
  organizationId?: string;
  title: string;
  message: string;
  recipients: {
    type: 'all' | 'role' | 'user';
    ids?: string[];
  };
  scheduledFor?: string;      // ISO 8601 timestamp
  priority: 'low' | 'normal' | 'high' | 'urgent';
}
```

**Response:**
```typescript
{
  broadcast: Broadcast;
  sent: number;
}
```

---

#### `broadcasts-fetch`
**Purpose:** Get broadcasts for a trip/organization

**Endpoint:** `GET /functions/v1/broadcasts-fetch?tripId=xxx&organizationId=xxx`

**Query Params:**
- `tripId`: string (optional)
- `organizationId`: string (optional)
- `limit`: number (default 50)
- `offset`: number

**Response:**
```typescript
{
  broadcasts: Broadcast[];
  total: number;
}
```

---

### Health & Monitoring

#### `health`
**Purpose:** Health check endpoint

**Endpoint:** `GET /functions/v1/health`

**Response:**
```typescript
{
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  services: {
    database: 'ok' | 'error';
    storage: 'ok' | 'error';
    ai: 'ok' | 'error';
  };
}
```

---

## Authentication

All endpoints (except `health`) require authentication:

```typescript
headers: {
  'Authorization': `Bearer ${supabaseAccessToken}`,
  'Content-Type': 'application/json'
}
```

**Getting a token:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

## Error Responses

All endpoints return errors in this format:

```typescript
{
  error: {
    code: string;              // 'INVALID_INPUT' | 'UNAUTHORIZED' | 'RATE_LIMIT' | etc.
    message: string;
    details?: any;
  }
}
```

**HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `429`: Rate Limit Exceeded
- `500`: Internal Server Error

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `lovable-concierge` | 100 | Per hour |
| `gemini-chat` | 200 | Per hour |
| `google-maps-proxy` | 1000 | Per day (per trip) |
| `search` | 500 | Per hour |
| `image-upload` | 50 | Per hour |
| All others | 1000 | Per hour |

## OpenAPI/Swagger Spec

To generate OpenAPI spec from TypeDoc:

```bash
npm install --save-dev typedoc-openapi
```

Add to `typedoc.json`:
```json
{
  "plugin": ["typedoc-plugin-markdown", "typedoc-openapi"],
  "openApi": {
    "file": "docs/api/openapi.json"
  }
}
```

View interactive docs:
```bash
npx swagger-ui-serve docs/api/openapi.json
```

## Testing

**Local testing:**
```bash
# Start Supabase locally
supabase start

# Invoke function locally
supabase functions invoke lovable-concierge --body '{"message":"test"}'
```

**Production testing:**
```bash
curl -X POST https://<project>.supabase.co/functions/v1/lovable-concierge \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

## Versioning

API versioning is handled via Supabase project URLs:
- Production: `https://<project>.supabase.co/functions/v1/`
- Staging: `https://<project>-staging.supabase.co/functions/v1/`

Breaking changes require:
1. New function endpoint (e.g., `v2/lovable-concierge`)
2. Deprecation notice on old endpoint (6 months)
3. Migration guide in docs

---

**Last Updated:** 2025-01-31  
**Maintained By:** Engineering Team
