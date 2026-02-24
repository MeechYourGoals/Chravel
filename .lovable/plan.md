

# AI Privacy Audit and Privacy Policy Update

## Step 1: Data Flow Inventory -- What User Data Reaches Gemini

### All Gemini touchpoints in the codebase

| Edge Function | Gemini Model | Data Sent to Gemini | Identifiers Sent | Responses Stored? |
|---|---|---|---|---|
| `lovable-concierge` | gemini-3-flash-preview (streaming + non-streaming) | User text prompt, chat history (last 6-10 messages), trip context (members' names, calendar events, tasks, payments, polls, places/addresses, broadcasts, file names/URLs, link URLs, user preferences), image attachments (base64) | None directly; user_id used only for DB lookups, never in the Gemini request payload | Yes -- `ai_queries` table (trip_id, user_id, query_text, response_text, source_count, created_at) and `concierge_usage` table |
| `gemini-voice-session` | gemini-2.0-flash-exp (Live/bidirectional audio) | System prompt with full trip context (same as above), real-time audio stream from user's microphone | None -- ephemeral token auth; no user IDs in Gemini request | Audio is not stored by Chravel; responses are transient (WebSocket). Query/response text persisted to `ai_queries` only when `execute-concierge-tool` writes results |
| `execute-concierge-tool` | N/A (calls `functionExecutor`, not Gemini directly) | Tool arguments (place queries, addresses, etc.) routed to Google Maps APIs | None sent to Gemini | Tool results returned to client; no separate DB storage |
| `ai-answer` | gemini-3-flash-preview | User query, last 6 chat history messages, trip context (messages, calendar, places) | None | Yes -- `ai_queries` table |
| `ai-search` | gemini-3-flash-preview | User search query, full trip data blob (messages, events, files, places, receipts) | None | Yes -- `ai_queries` table (query_text only, no response_text) |
| `ai-features` | gemini-3-flash-preview | Review URLs, venue names/addresses, place IDs; task text for priority classification | None | No |
| `enhanced-ai-parser` / `file-ai-parser` | gemini-3-flash-preview | File content (PDFs as base64, document text, images) for parsing/extraction | None | Parsed results stored in trip files/events, not the raw AI exchange |
| `scrape-agenda` / `scrape-schedule` / `scrape-lineup` | gemini-3-flash-preview | Scraped webpage content (HTML/markdown) for structured extraction | None | Extracted sessions stored in calendar events |
| `generate-embeddings` / `ai-ingest` | text-embedding-004 | Text chunks from trip data for vector embeddings | None | Embeddings stored in `trip_document_chunks` |
| `document-processor` | gemini-3-flash-preview | Document content for processing | None | Processed results stored |
| `_shared/gemini.ts` (unified client) | Various | Routes all chat/embedding requests; applies PII redaction via `redactPII()` before sending | API key only (via `x-goog-api-key` header or query param); no user identifiers | N/A (pass-through) |

### Summary: What user data is sent to Gemini

1. **User-authored text**: Chat prompts, search queries, dictated voice input
2. **Trip context data**: Member names and roles, calendar events (titles, times, locations, descriptions), task content, payment descriptions and amounts, poll questions/options, broadcast messages, saved places and addresses (including basecamps), file names and URLs, shared links
3. **User preferences** (paid users only): Dietary restrictions, vibe preferences, budget level, travel style
4. **File content**: PDFs (base64-encoded), images (base64-encoded), document text -- when users upload files for parsing or attach images to concierge queries
5. **Audio streams**: Real-time microphone audio during Gemini Live voice sessions (ephemeral, not stored by Chravel)
6. **Scraped web content**: HTML/markdown from URLs users submit for agenda/schedule extraction

### What is NOT sent to Gemini

- User email addresses (never included in prompts)
- User IDs / UUIDs (used only for local DB queries, stripped before Gemini calls)
- Device IDs, IP addresses, session tokens, cookies
- Passwords or authentication tokens
- Payment card numbers or financial account details
- The `redactPII()` function in `aiUtils.ts` actively strips emails and phone numbers from text before sending

### Where responses are stored

| Table | Columns | Retention | Purpose |
|---|---|---|---|
| `ai_queries` | trip_id, user_id, query_text, response_text, source_count, created_at | Indefinite (until user deletes or account deletion) | Chat history hydration, concierge search, usage analytics |
| `concierge_usage` | user_id, context_type, context_id, query_count, created_at | Indefinite | Usage metering and subscription enforcement |

Users can now delete their own `ai_queries` rows (DELETE and UPDATE RLS policies added in the recent migration).

### How Google processes data sent via Gemini API

Per Google's Gemini API Terms of Service (for API key-based access via AI Studio):
- Google does NOT use customer API data to train its foundation models
- Data is processed to provide the service and may be temporarily cached for performance
- Google's data processing terms apply (not the consumer Gemini Apps Privacy Notice, which covers the free consumer chatbot)
- Server-side logging by Google is subject to their Cloud Data Processing Addendum
- Ephemeral tokens for Live API have configurable expiry (currently 30 minutes max)

**TODO (Legal review needed)**: Confirm whether the project uses Google AI Studio API terms or Google Cloud / Vertex AI terms. The current implementation uses `generativelanguage.googleapis.com` with API key auth, which falls under Google AI Studio / Gemini API terms.

---

## Step 2: Current Privacy Policy Gaps

### What the current policy already covers
- Section 1: Introduction with commitment to data protection
- Section 2: Data collection (account info, profile, trip info, messages/photos, payments, device info, location, cookies)
- Section 3: How data is used -- includes "Personalize your experience with AI-powered features" (one line)
- Section 4: Sharing with third parties (trip members, service providers, legal, business transfers)
- Section 5: Data security
- Section 6: Rights and choices (access, correction, deletion, export, opt-out)
- Section 7: Retention (30-day deletion after account close)
- Section 8: Children's privacy
- Section 9: International transfers
- Section 10: Changes to policy
- Section 11: Contact

### What is MISSING for AI/Gemini
- No mention of Google, Gemini, or any specific AI provider
- No description of what data categories are sent to AI services
- No explanation of how AI responses are stored or for how long
- No disclosure that real-time audio is processed by a third-party AI service
- No mention of file/document content being sent to AI for parsing
- No link to Google's data processing terms
- No specific AI data deletion controls (the generic "Deletion" right exists but does not reference AI interaction data)
- No disclosure about embeddings generation and storage
- The single mention of AI ("Personalize your experience with AI-powered features") is insufficient for App Store compliance

---

## Step 3: Draft "AI Features and Data Usage" Section

The following HTML section will be inserted as a new Section 3A (after current Section 3 "How We Use Your Information"):

```html
<section class="mb-8">
  <h2 class="text-2xl font-semibold mb-4">3A. AI Features and Data Usage</h2>

  <h3 class="text-xl font-medium mb-3">AI-Powered Features</h3>
  <p class="text-foreground/90 mb-4">
    Chravel uses artificial intelligence to power several features in the app, including the
    AI Concierge (text and voice), smart search, document and receipt parsing, trip planning
    suggestions, and agenda extraction. These features are powered by Google's Gemini AI
    models, accessed through Google's Generative Language API.
  </p>

  <h3 class="text-xl font-medium mb-3">Data Sent to AI Services</h3>
  <p class="text-foreground/90 mb-4">
    When you use AI-powered features, the following categories of data may be sent to
    Google's Gemini API for processing:
  </p>
  <ul class="list-disc pl-6 mb-4 space-y-2 text-foreground/90">
    <li>
      <strong>User-provided content:</strong> Text prompts, search queries, and voice
      input you provide to the AI Concierge.
    </li>
    <li>
      <strong>Trip context:</strong> Information from your trip, including calendar events,
      task lists, group messages, polls, saved places, shared links, and payment summaries.
      This context helps the AI provide relevant, trip-specific responses.
    </li>
    <li>
      <strong>Uploaded files:</strong> Documents, images, and receipts you submit for
      AI-powered parsing or attach to concierge conversations.
    </li>
    <li>
      <strong>Voice audio:</strong> When using the voice concierge feature, real-time audio
      from your microphone is streamed directly to Google's Gemini Live API for
      speech-to-text and response generation.
    </li>
    <li>
      <strong>User preferences:</strong> If you are a paid subscriber, your saved
      preferences (such as dietary restrictions, travel style, and budget level) may be
      included to personalize AI recommendations.
    </li>
  </ul>
  <p class="text-foreground/90 mb-4">
    We do not send your email address, password, user ID, device identifiers, IP address,
    or payment card information to AI services. We apply automated redaction to remove
    email addresses and phone numbers from text before it is sent to AI models.
  </p>

  <h3 class="text-xl font-medium mb-3">Purpose of AI Processing</h3>
  <p class="text-foreground/90 mb-4">
    Data is sent to AI services solely to provide the requested functionality, including:
    generating conversational responses, answering questions about your trip, searching
    trip data, parsing documents and receipts, extracting event schedules from web pages,
    and providing personalized travel recommendations.
  </p>

  <h3 class="text-xl font-medium mb-3">Third-Party AI Provider</h3>
  <p class="text-foreground/90 mb-4">
    AI features are powered by Google's Gemini models, accessed via the Google Generative
    Language API. Data shared with Google is processed in accordance with
    <a href="https://ai.google.dev/gemini-api/terms" class="text-primary hover:underline"
      target="_blank" rel="noopener noreferrer">
      Google's Gemini API Terms of Service
    </a> and
    <a href="https://policies.google.com/privacy" class="text-primary hover:underline"
      target="_blank" rel="noopener noreferrer">
      Google's Privacy Policy</a>.
    Under Google's API terms, data submitted through the API is not used by Google to
    train its foundation models for other customers.
  </p>

  <h3 class="text-xl font-medium mb-3">Storage of AI Interactions</h3>
  <p class="text-foreground/90 mb-4">
    We store your AI concierge queries and the AI-generated responses in our database to
    provide chat history, enable search across past conversations, and track usage for
    subscription metering. This data is associated with your user account and the relevant
    trip. Voice audio is processed in real time and is not stored on our servers.
  </p>
  <p class="text-foreground/90 mb-4">
    Stored AI interaction data is retained for as long as your account is active or until
    you delete it. We may use aggregated, de-identified AI usage data (such as query
    counts and response times) for service improvement and analytics. We do not perform
    human review of individual AI conversations except when required for abuse
    investigation, legal compliance, or at your request for customer support.
  </p>

  <h3 class="text-xl font-medium mb-3">User Choices and Controls</h3>
  <ul class="list-disc pl-6 mb-4 space-y-2 text-foreground/90">
    <li>
      <strong>Delete individual messages:</strong> You can delete specific AI concierge
      messages and responses from within the chat interface at any time.
    </li>
    <li>
      <strong>Delete all AI data:</strong> When you delete your account, all stored AI
      queries and responses are permanently removed within 30 days.
    </li>
    <li>
      <strong>Export your data:</strong> You can request a copy of your AI interaction
      history through the data export feature in your account settings.
    </li>
    <li>
      <strong>Limit AI context:</strong> AI features use trip data you have already shared
      with your trip group. You can control what information the AI accesses by managing
      your trip content.
    </li>
  </ul>
  <p class="text-foreground/90">
    AI features are an integral part of the Chravel experience. While you can choose not to
    use the AI Concierge or voice features, some AI processing (such as document parsing
    and smart search) is part of core functionality and cannot be individually disabled.
  </p>
</section>
```

---

## Step 4: Apple App Store Privacy Details Table

| Data Category | Specific Data | Collected via AI? | Purpose (Apple) | Linked to User? | Used for Tracking? |
|---|---|---|---|---|---|
| User Content | Text prompts to AI Concierge | Yes | App Functionality | Yes | No |
| User Content | Voice audio (real-time, not stored) | Yes | App Functionality | Yes | No |
| User Content | Uploaded files/images sent to AI | Yes | App Functionality | Yes | No |
| User Content | Trip messages, calendar events, tasks, polls (used as AI context) | Yes | App Functionality | Yes | No |
| Identifiers | User ID (internal UUID) | Yes (stored in ai_queries, not sent to Google) | App Functionality, Analytics | Yes | No |
| Usage Data | AI query counts, context types | Yes | App Functionality, Analytics | Yes | No |
| Diagnostics | AI response times, error logs | Yes (server-side edge function logs) | App Functionality | No | No |
| Location | Trip basecamp coordinates, saved place addresses | Yes (sent as AI context) | App Functionality | Yes | No |
| Contacts | Trip member names and roles | Yes (sent as AI context) | App Functionality | Yes | No |

**TODO notes for legal/compliance review:**
- Confirm whether trip member names appearing in AI context constitutes "Contacts" collection under Apple's definition, or falls under "User Content"
- Confirm the correct Google terms link -- the project uses API key auth (`generativelanguage.googleapis.com`), which is AI Studio, not Vertex AI. The applicable terms page should be verified as current
- Review whether "aggregated analytics" usage of AI query data requires "Analytics" purpose disclosure or if "App Functionality" suffices
- Verify whether Supabase edge function logs (which contain console.error output with potential error details) constitute "Diagnostics" that need disclosure
- Confirm data retention period for `ai_queries` and whether a specific maximum should be stated (currently: "until user deletes or account deletion")

---

## Step 5: Implementation -- Code Changes

### File: `src/pages/PrivacyPolicy.tsx`

Insert the new "3A. AI Features and Data Usage" section between the current Section 3 ("How We Use Your Information", ends at line 69) and Section 4 ("Information Sharing and Disclosure", starts at line 71).

Also update the existing Section 3 bullet point from:
```
"Personalize your experience with AI-powered features"
```
to:
```
"Personalize your experience with AI-powered features (see Section 3A below for details)"
```

And update Section 4 (Information Sharing and Disclosure) to add a new bullet for AI providers:
```html
<li>
  <strong>With AI Service Providers:</strong> Certain data is shared with Google's Gemini
  AI services to power AI features as described in Section 3A. Google processes this data
  under its API terms and does not use it to train models for other customers.
</li>
```

No other files need to change. The privacy policy is a single self-contained page component.

### Summary of changes

| File | Change |
|---|---|
| `src/pages/PrivacyPolicy.tsx` | Insert new Section 3A (AI Features and Data Usage), update Section 3 cross-reference, add AI provider bullet to Section 4 |

### Assumptions and TODOs for human/legal review

- **TODO**: Confirm the Google terms URL (`https://ai.google.dev/gemini-api/terms`) is the correct and current link for the Gemini API Terms of Service
- **TODO**: Verify whether "data submitted through the API is not used by Google to train its foundation models" is accurate under the current terms (this was true as of the Gemini API paid tier terms; free-tier terms may differ)
- **TODO**: Decide whether to add a specific data retention period (e.g., "12 months") for AI query data instead of "until deleted"
- **TODO**: Legal review of whether the Lovable gateway fallback (which proxies to Google models via a third-party intermediary) requires separate disclosure
- **TODO**: Confirm the App Store privacy labels with the App Store Connect submission team before publishing
- **TODO**: Review whether CCPA/GDPR-specific language is needed for the AI section (the current policy does not have jurisdiction-specific sections)

