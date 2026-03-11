---
name: chravel-repo-map
description: Navigate the Chravel codebase. Find where features live, understand module boundaries, and locate the right files for any change. Use when unfamiliar with where something lives or when starting work on a new area. Triggers on "where is", "find the code for", "repo map", "codebase overview", "what file handles".
user-invocable: false
---

# Chravel Repo Map

Quick reference for navigating the ChravelApp codebase.

## Directory Structure

```
src/
├── components/          # UI components by domain
│   ├── ai/             # AI Concierge, Gemini UI
│   ├── app/            # App shell, routing, layout
│   ├── consumer/       # Consumer trip workflows
│   ├── dashboard/      # Dashboard views
│   ├── enterprise/     # Enterprise/pro features
│   ├── events/         # Event components
│   ├── gamification/   # Gamification elements
│   ├── home/           # Home/landing components
│   ├── invite/         # Invite and join flows
│   ├── landing/        # Marketing/landing pages
│   ├── loading/        # Loading states and skeletons
│   ├── media/          # Media upload, galleries
│   ├── mobile/         # Mobile-specific components
│   ├── native/         # Native wrapper components
│   └── notifications/  # Notification components
├── features/           # Feature modules (self-contained)
│   ├── broadcasts/     # Broadcast announcements
│   ├── calendar/       # Calendar and scheduling
│   ├── chat/           # Messaging and channels
│   └── smart-import/   # AI-powered data import
├── hooks/              # Shared custom hooks
├── integrations/       # External service clients
│   ├── supabase/       # Supabase client, types, helpers
│   └── revenuecat/     # RevenueCat subscription management
├── lib/                # Utilities and adapters
│   ├── adapters/       # Service adapters
│   └── geminiLive/     # Gemini Live client
├── pages/              # Route page components
└── types/              # Domain type definitions
```

## Key Files

| File | Purpose |
|---|---|
| `src/integrations/supabase/client.ts` | Supabase singleton |
| `src/hooks/useAuth.tsx` | Auth state management |
| `src/types/index.ts` | Core type exports |
| `src/lib/geminiLive/` | Gemini Live voice client |
| `src/hooks/useAIConciergePreferences.ts` | AI concierge settings |
| `src/hooks/useBalanceSummary.ts` | Payment balance calculation |
| `src/hooks/useArtifactIngest.ts` | Smart Import ingestion |

## Page ↔ Mobile Pairs

| Desktop Page | Mobile Page |
|---|---|
| `TripDetail.tsx` | `MobileTripDetail.tsx` |
| `ProTripDetail.tsx` | `MobileProTripDetail.tsx` |
| `EventDetail.tsx` | `MobileEventDetail.tsx` |

## Finding Things

- **Trip-related:** Start in `src/pages/` for routes, `src/components/consumer/` for UI
- **AI features:** `src/components/ai/`, `src/lib/geminiLive/`, `src/features/smart-import/`
- **Chat:** `src/features/chat/`
- **Calendar:** `src/features/calendar/`
- **Payments:** Search for `payment`, `balance`, `revenuecat` in `src/hooks/` and `src/types/`
- **Auth:** `src/hooks/useAuth.tsx`, Supabase auth integration
- **Types:** `src/types/` has domain types; `src/integrations/supabase/` has generated DB types
