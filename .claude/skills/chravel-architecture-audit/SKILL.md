---
name: chravel-architecture-audit
description: Chravel-specific architecture audit covering feature modules, Supabase integration layers, component hierarchy, state management, and routing structure. Use when evaluating ChravelApp structure, planning major features, or assessing technical debt. Triggers on "audit chravel architecture", "how is chravel structured", "tech debt review".
---

# Chravel Architecture Audit

Audit ChravelApp's architecture for boundary violations, layering issues, and structural debt.

## Chravel Architecture Reference

### Feature Modules (`src/features/`)
- `broadcasts/` — Broadcast announcements
- `calendar/` — Calendar and scheduling
- `chat/` — Messaging and channels
- `smart-import/` — AI-powered data import

Each feature module should contain `components/` and `hooks/` subdirectories.

### Component Hierarchy (`src/components/`)
- `ai/` — AI concierge, Gemini integration
- `consumer/` — Consumer trip workflows
- `app/` — App shell, routing, layout
- `mobile/` — Mobile-specific components
- `native/` — Native wrapper components
- `media/` — Media uploads, galleries
- `invite/` — Invite and join flows
- `dashboard/` — Dashboard views
- `events/` — Event detail views
- `enterprise/` — Enterprise/pro features

### Data Layer
- `src/integrations/supabase/` — Supabase client, types, queries
- `src/integrations/revenuecat/` — RevenueCat payments
- `src/types/` — Domain type definitions
- `src/lib/` — Utility functions, adapters
- `src/lib/geminiLive/` — Gemini Live API integration

### State Management
- TanStack Query for server state
- Zustand for client state
- Supabase Realtime for live updates

## Audit Dimensions

### 1. Feature Module Integrity
- Do features own their components, hooks, and types?
- Are there cross-feature imports that should go through shared modules?
- Are `src/components/` entries properly organized or becoming a dumping ground?

### 2. Data Access Patterns
- Are Supabase queries going through proper service layers or called directly in components?
- Is TanStack Query used consistently for server state?
- Are there competing data sources for the same entity?

### 3. Page / Component Separation
- Do pages (`src/pages/`) contain business logic they shouldn't?
- Are Mobile* pages duplicating desktop pages instead of sharing components?
- Is routing clean or tangled with auth/feature gates?

### 4. Type Architecture
- Are domain types in `src/types/` or scattered?
- Are Supabase-generated types used directly or mapped to domain types?
- Is `any` spreading?

### 5. Critical Path Architecture
- Trip loading: Is the auth → trip → render chain clean?
- Chat: Is realtime subscription management correct?
- Payments: Is RevenueCat integration properly layered?
- AI Concierge: Is Gemini integration properly isolated?

## Output

### Assessment
- Overall: Clean / Drifting / Tangled / Critical
- Strongest modules
- Weakest modules
- Top 5 structural issues with severity and recommended fixes
