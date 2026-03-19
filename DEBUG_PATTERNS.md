# Debug Patterns — Security

Known security anti-patterns discovered during audits. Reference this before introducing similar code.

---

## 1. Capability Token Default Secret Fallback

**Symptom:** Any unauthenticated user can forge tool execution tokens.
**Risk:** CRITICAL — arbitrary trip data access and mutation via AI tool calls.
**Root Cause:** `const secret = env.get('KEY') || 'default_for_tests'` pattern makes tokens signable with a known value when env is missing.
**How to Confirm:** Check if `SUPABASE_JWT_SECRET` is set in the edge function environment. If not, tokens signed with `'default_secret_for_tests'` would be accepted.
**Smallest Safe Fix:** Throw on missing secret instead of falling back. The env is always set in Supabase hosted environments.
**Required Tests:** Unit test that `verifyCapabilityToken` throws when secret is missing.
**Regression Surfaces:** Any edge function using capability tokens.
**Fixed in:** `supabase/functions/_shared/security/capabilityTokens.ts` (March 2026 audit)

---

## 2. CORS Wildcard Subdomain Matching

**Symptom:** Cross-origin requests succeed from unauthorized domains (e.g., attacker-controlled *.vercel.app site).
**Risk:** HIGH — edge functions callable from any project on allowed hosting platforms.
**Root Cause:** `.vercel.app` suffix matcher allows `evil-site.vercel.app` to pass CORS validation.
**How to Confirm:** Deploy a test page to a random *.vercel.app URL and attempt `fetch()` to a Chravel edge function.
**Smallest Safe Fix:** Replace suffix matchers with exact production origins. Use `ADDITIONAL_ALLOWED_ORIGINS` env var for preview deployments.
**Required Tests:** Unit test that `isOriginAllowed('https://random.vercel.app')` returns false.
**Regression Surfaces:** Vercel preview deployments, Lovable preview deployments — configure ADDITIONAL_ALLOWED_ORIGINS.
**Fixed in:** `supabase/functions/_shared/cors.ts` (March 2026 audit)

---

## 3. React Spread Props Silently Override Earlier Handlers

**Symptom:** Event handlers appear wired but silently never fire. Clicks or touches do nothing despite correct-looking code.
**Risk:** MEDIUM — broken interactivity with no error or warning.
**Root Cause:** When JSX spreads an object of event handlers (`{...handlers}`) and THEN sets explicit props with the same names (e.g., `onTouchStart`, `onMouseLeave`), the explicit props override the spread. The overridden handlers silently disappear.
**How to Confirm:** Check if the same element has both `{...handlerObject}` and explicit event props with overlapping keys. The later props win.
**Smallest Safe Fix:** Merge conflicting handlers into combined callbacks that call both. Never rely on spread + explicit prop coexistence for the same event name.
**Regression Surfaces:** Any component combining `useLongPress` handlers with custom touch/mouse handlers on the same element.
**Fixed in:** `src/features/chat/components/MessageBubble.tsx` (March 2026 — merged longPress + swipe-to-reply handlers)

---

## 4. Radix PopoverTrigger Intercepts Child Button Clicks on Mobile

**Symptom:** On mobile, clicking a button wrapped in `<PopoverTrigger asChild>` opens the popover but doesn't fire the button's onClick handler (or vice versa).
**Risk:** LOW — broken mobile interactivity for tooltip/popover-wrapped buttons.
**Root Cause:** Radix UI's `PopoverTrigger` with `asChild` composes event handlers with the child. On mobile, the popover toggle behavior can conflict with the child's onClick, especially when the click target needs to perform a data mutation.
**Smallest Safe Fix:** For buttons that must always fire onClick, don't wrap in PopoverTrigger. Use the `title` attribute or a separate tooltip mechanism for mobile.
**Fixed in:** `src/features/chat/components/MessageReactionBar.tsx` (March 2026 — removed PopoverTrigger on mobile, use title instead)

---

## 3. Client-Side Super Admin Bypass (Misleading Dead Code)

**Symptom:** Code appears to grant admin access based on client-side email comparison, but RLS actually blocks the operation.
**Risk:** MEDIUM — creates false confidence that client-side checks enforce access control. A future refactor might trust this pattern.
**Root Cause:** `SUPER_ADMIN_EMAILS.includes(user.email)` check was used to skip membership validation, but the underlying Supabase query still enforces RLS.
**How to Confirm:** Trace the data flow — the Supabase client uses the anon key, so all queries respect RLS policies. The `is_super_admin()` SQL function (only allows `ccamechi@gmail.com`) is the actual enforcement.
**Smallest Safe Fix:** Remove client-side admin bypass code. Let RLS be the single source of truth.
**Required Tests:** Verify admin users can still access their data via RLS. Verify non-admin cannot bypass membership.
**Regression Surfaces:** Trip creation limits (super admin still bypasses trip count limit via client-side check — this is intentional for the founder).
**Fixed in:** `src/services/calendarService.ts`, `src/services/tripService.ts` (March 2026 audit)

---

## 4. CronGuard Fail-Open on Missing Secret

**Symptom:** Cron-only edge functions (event-reminders, payment-reminders, send-scheduled-broadcasts, delete-stale-locations) are publicly callable without authentication.
**Risk:** HIGH — unauthenticated users can trigger cron jobs, causing spam notifications, data mutations, or cost amplification.
**Root Cause:** `verifyCronAuth()` returned `authorized: true` when `CRON_SECRET` env var was not set, as a "graceful degradation" during rollout.
**How to Confirm:** Call any cron-protected edge function without headers. If it returns 200, the guard is failing open.
**Smallest Safe Fix:** Return `authorized: false` with 503 when `CRON_SECRET` is missing. Never fail-open for auth guards.
**Required Tests:** Verify that requests without valid cron secret or service role key are denied (401/503).
**Regression Surfaces:** All cron-invoked edge functions. Ensure `CRON_SECRET` is set in all environments.
**Fixed in:** `supabase/functions/_shared/cronGuard.ts` (March 2026 audit)

---

## General Anti-Patterns to Avoid

- **Never use `|| 'default'` for security-sensitive env vars** — fail loudly instead
- **Never use wildcard subdomain matching in CORS** — allows any tenant on shared platforms
- **Never rely on client-side email checks for authorization** — RLS is the enforcement layer
- **Never return raw error messages to clients** — log server-side, return generic messages
- **Never inject unsanitized user content into AI prompts** — use boundary markers and strip tags
- **Never fail-open on missing auth secrets** — deny with 503, not allow with a warning log
# Debug Patterns

> Canonical memory for recurring bugs, root causes, regression risks, and proven fixes.
> Read relevant entries before debugging. Refine existing entries over creating duplicates.

---

## Trip Not Found flash during auth hydration
- **Status:** confirmed
- **Subsystem:** trip loading / auth
- **Bug class:** async/timing
- **Symptom:** User navigates to a valid trip URL and briefly sees "Trip Not Found" before the real trip data loads
- **User-facing impact:** Confusing error flash; users may navigate away thinking the trip doesn't exist
- **Trigger conditions:** Page load on an auth-gated trip route when auth session hasn't resolved yet
- **Known non-causes:** Trip actually deleted, RLS policy misconfigured (check these but they're usually not the issue)
- **Likely root cause:** Data fetch fires before auth state resolves, gets rejected/empty result, UI treats it as "not found"
- **Root cause chain:**
  - Immediate cause: Not Found component renders
  - Proximate cause: Trip query returns null/error before auth token is available
  - Underlying cause: No guard ensuring auth hydration completes before trip data fetch executes
- **How to reproduce:**
  1. Log in as a user with trip access
  2. Hard-refresh or navigate directly to `/trip/<valid-trip-id>`
  3. Observe brief flash of error/not-found state before trip loads
- **How to confirm:** Add logging to auth state and trip query — confirm query fires before auth session is established
- **Smallest safe fix:** Gate trip data fetch on auth session being resolved (not just present — fully hydrated)
- **Regression risks:** Introducing a loading delay on all trip pages; breaking unauthenticated/demo trip views
- **Related files:** Trip loading hooks, auth provider, trip page components
- **Evidence:** Documented as zero-tolerance path in CLAUDE.md. Referenced in CLAUDE.md § UI Safety: "No flashing error states during auth hydration"
- **Provenance:** CLAUDE.md § Security Gate; historical regression reports
- **Confidence:** high

## Demo mode data contamination
- **Status:** confirmed
- **Subsystem:** demo mode / data layer
- **Bug class:** schema/data
- **Symptom:** Authenticated user data appears in demo mode, or demo mock data gets modified/deleted
- **User-facing impact:** Demo experience breaks; real user data exposed in wrong context
- **Trigger conditions:** Code path that doesn't properly branch between demo and authenticated data sources
- **Known non-causes:** Supabase RLS issues (demo mode uses local mock data, not Supabase)
- **Likely root cause:** Shared data fetching path doesn't check demo mode flag, or mutation handler modifies mock data source
- **Root cause chain:**
  - Immediate cause: Wrong data appears in UI
  - Proximate cause: Data hook returns real data in demo context or vice versa
  - Underlying cause: Demo/auth data paths not fully isolated at the hook layer
- **How to reproduce:**
  1. Enter demo mode
  2. Verify only mock data appears
  3. Check that mutations don't persist to mock data source
- **How to confirm:** Trace data source selection in hooks — verify demo flag is checked before any fetch/mutation
- **Smallest safe fix:** Ensure data hooks branch on demo mode at the earliest possible point
- **Regression risks:** Breaking demo mode entirely; blocking authenticated features behind demo check
- **Related files:** Data hooks, demo mode provider, mock data files
- **Evidence:** AGENTS.md § 0.7: "Demo mode is sacred. Mock data is NEVER modified."
- **Provenance:** AGENTS.md § 0 Non-Negotiables
- **Confidence:** high

## Chat read receipt write amplification (N×M upserts)
- **Status:** fixed
- **Subsystem:** chat / read receipts
- **Bug class:** performance / write amplification
- **Symptom:** Every new message triggers marking ALL visible messages as read for every user — N users × M messages upserts per INSERT
- **User-facing impact:** DB write latency, potential 429 rate limits at scale, wasted bandwidth
- **Trigger conditions:** Any new message arriving via realtime subscription
- **Likely root cause:** useEffect dependency on `liveMessages` array (changes on every INSERT) triggering `markMessagesAsRead` for ALL messages, not just new ones
- **Root cause chain:**
  - Immediate: Supabase upsert storm on message_read_receipts
  - Proximate: useEffect fires on every liveMessages reference change
  - Underlying: No tracking of already-marked message IDs
- **Smallest safe fix:** Track marked IDs in a ref, debounce 1s, only mark new unread messages
- **Regression risks:** Delayed read receipts (1s debounce); stale read state if ref not reset on trip change
- **Related files:** `src/features/chat/components/TripChat.tsx`
- **Fixed in:** March 2026 chat reliability audit
- **Confidence:** high

## Chat reaction refetch storm on every message
- **Status:** fixed
- **Subsystem:** chat / reactions
- **Bug class:** performance / N+1
- **Symptom:** Full reaction fetch for ALL loaded messages fires on every new message arrival
- **Trigger conditions:** `useEffect` with `[liveMessages.length]` dependency
- **Smallest safe fix:** Fetch reactions once on initial load, rely on realtime subscription for incremental updates
- **Related files:** `src/features/chat/components/TripChat.tsx`
- **Fixed in:** March 2026 chat reliability audit
- **Confidence:** high

## Voice tool call fails silently due to unimplemented declaration
- **Status:** confirmed (latent)
- **Subsystem:** AI concierge / voice tools
- **Bug class:** declaration/implementation mismatch
- **Symptom:** Voice concierge says it completed an action but nothing happens in the trip. No error shown to user.
- **User-facing impact:** Lost trust — user thinks AI did something but no data was created/changed
- **Trigger conditions:** Model selects a tool from `voiceToolDeclarations.ts` that has no matching `case` in `functionExecutor.ts`
- **Known affected tools:** getWeatherForecast, convertCurrency, browseWebsite, makeReservation, settleExpense, generateTripImage, setTripHeaderImage, getDeepLink, explainPermission, verify_artifact, createBroadcast, createNotification
- **Likely root cause:** Voice tool declarations were expanded from a roadmap document without corresponding backend implementation
- **Smallest safe fix:** Remove unimplemented tools from `voiceToolDeclarations.ts`, or implement them in `functionExecutor.ts`
- **Regression risks:** Removing tools may cause model to verbally refuse requests it previously "handled" (but silently failed)
- **Related files:** `supabase/functions/_shared/voiceToolDeclarations.ts`, `supabase/functions/_shared/functionExecutor.ts`
- **Provenance:** March 2026 AI Concierge architecture & prompt audit
- **Confidence:** high

## Action Plan JSON mandate ignored by model
- **Status:** confirmed (design issue)
- **Subsystem:** AI concierge / prompt design
- **Bug class:** prompt compliance
- **Symptom:** System prompt mandates a JSON `plan_version: 1.0` block at the start of every response, but model frequently skips it for simple queries
- **User-facing impact:** Inconsistent response format; wasted tokens when model does comply; no functional benefit since the plan is not machine-parsed
- **Trigger conditions:** Any simple query where the model decides the JSON plan adds no value
- **Likely root cause:** Instruction conflicts — "be concise" vs "always output a JSON plan first"
- **Smallest safe fix:** Remove the Action Plan mandate from the system prompt entirely, or make it conditional for multi-action requests
- **Related files:** `supabase/functions/_shared/promptBuilder.ts` (lines 29-50)
- **Provenance:** March 2026 AI Concierge architecture & prompt audit
- **Confidence:** high

## Preference injection on irrelevant queries wastes tokens
- **Status:** confirmed (inefficiency)
- **Subsystem:** AI concierge / context injection
- **Bug class:** performance / token bloat
- **Symptom:** Dietary preferences, vibe preferences, budget preferences injected into every trip-related query, even "what time is our reservation?"
- **User-facing impact:** Slower time-to-first-token from larger prompt; no quality benefit for non-recommendation queries
- **Trigger conditions:** Any trip-related query for a paid user with preferences set
- **Likely root cause:** Preference injection in `promptBuilder.ts` is always-on when `tripContext.userPreferences` exists, with no query-type filter
- **Smallest safe fix:** Only inject preferences when query matches recommendation/food/activity/venue patterns
- **Related files:** `supabase/functions/_shared/promptBuilder.ts` (lines 101-117), `supabase/functions/_shared/contextBuilder.ts` (resolveUserPreferences)
- **Provenance:** March 2026 AI Concierge architecture & prompt audit
- **Confidence:** high

## Chat messages lost during websocket reconnect
- **Status:** fixed
- **Subsystem:** chat / realtime
- **Bug class:** eventual consistency / data loss
- **Symptom:** Messages sent by others during a websocket drop are never displayed
- **Trigger conditions:** Mobile background/foreground, poor connectivity, Supabase channel error/timeout
- **Smallest safe fix:** Track last known server timestamp; on channel SUBSCRIBED (after reconnect) and on visibilitychange, fetch messages since that timestamp and merge with dedupe
- **Regression risks:** Duplicate messages if dedupe fails; unnecessary fetches if called too frequently
- **Related files:** `src/features/chat/hooks/useTripChat.ts`
- **Fixed in:** March 2026 chat reliability audit
- **Confidence:** high
