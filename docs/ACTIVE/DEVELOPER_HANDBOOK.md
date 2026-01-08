# Chravel Developer Handbook

> This document is governed by the No Regressions Policy.
> See: `ARCHITECTURE_DECISIONS.md` → Mobile Platform Strategy

---

## Project Overview

**Chravel** is a comprehensive travel coordination platform that combines group chat, AI concierge, task management, payments, and itinerary planning into a unified experience. Built with React/TypeScript and powered by Google Gemini AI.

---

## Architecture Overview

### Platform Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CHRAVEL PLATFORM                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐    ┌─────────────────────────────────┐  │
│   │  React Web   │    │     iOS / Android App Shell      │  │
│   │     App      │    │          (Capacitor)             │  │
│   │  (This Repo) │    │     (Planned / In Progress)      │  │
│   └──────┬───────┘    └─────────────────────────────────┘  │
│          │                         │                         │
│          └─────────────────────────┼─────────────────────────┘
│                                    │
│                              ▼                              │
│                    ┌─────────────────┐                      │
│                    │    Supabase     │                      │
│                    │    Backend      │                      │
│                    │  (PostgreSQL +  │                      │
│                    │   Edge Funcs)   │                      │
│                    └─────────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### What This Repository Contains

This repository (`MeechYourGoals/Chravel`) contains:

- **React Web Application** - The primary web experience
- **PWA Support** - Service worker for offline capability
- **Supabase Edge Functions** - Backend logic
- **Supabase Migrations** - Database schema

### What This Repository Does NOT Contain

- **A separate mobile UI codebase** - Mobile ships from the same React app
- **Guaranteed native projects** - iOS/Android projects may be added/updated via Capacitor workflow as needed

### Frontend Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tooling |
| Tailwind CSS | Styling |
| Radix UI | Accessible components |
| React Query | Server state management |
| React Router | Navigation |
| Zustand | Client state management |

### Backend Stack

| Technology | Purpose |
|------------|---------|
| Supabase | Database, Auth, Real-time |
| PostgreSQL | Primary database |
| Edge Functions | Serverless Deno functions |
| Google Gemini AI | AI concierge (via Lovable Gateway) |
| Google Maps API | Places, Geocoding, Grounding |

---

## Core Features & Implementation

### 1. AI Concierge System

**Purpose:** Context-aware travel assistant with full trip intelligence

**Key Files:**
- `supabase/functions/lovable-concierge/index.ts` - Main AI endpoint
- `supabase/functions/place-grounding/index.ts` - Google Maps grounding
- `src/services/universalConciergeService.ts` - Frontend integration

**Capabilities:**
- Payment Intelligence: "Who do I owe money to?"
- Poll Awareness: "Where did everyone decide on dinner?"
- Task Management: "What tasks am I responsible for?"
- Calendar Mastery: "What time is dinner?"
- Chat Intelligence: "What did I miss in the chat?"
- Enterprise Mode: Automatic detection for large groups

**Data Sources:**
- Trip participants, basecamp location, preferences
- Payment history, poll results, task assignments
- Calendar events, chat history, spending patterns
- Google Maps grounding for location-based responses

### 2. Unified Messaging System

**Purpose:** Single chat interface for all communication

**Key Files:**
- `src/components/TripChat.tsx` - Primary component
- `src/services/unifiedMessagingService.ts` - Service layer

**Features:**
- Real-time messaging via Supabase subscriptions
- Broadcast messages for announcements
- Payment requests and receipts
- AI Concierge integration with Maps widgets
- Message reactions and replies

### 3. Task Management System

**Purpose:** Collaborative task tracking and assignment

**Key Files:**
- `src/hooks/useTripTasks.ts` - Consolidated hook
- `src/components/todo/` - Component directory

**Features:**
- Task creation, assignment, and status tracking
- Category-based organization
- Due date management
- Bulk operations

### 4. Payment & Expense Tracking

**Purpose:** Group expense management and splitting

**Key Files:**
- `src/components/payments/` - Component directory
- `src/services/paymentService.ts`
- `src/services/paymentBalanceService.ts`

**Features:**
- Receipt scanning and AI parsing
- Automatic expense splitting
- Payment method management
- Balance tracking and settlements

### 5. Google Maps Integration

**Purpose:** Location services and venue discovery

**Key Files:**
- `src/services/googleMapsService.ts`
- `supabase/functions/google-maps-proxy/index.ts`

**Features:**
- Basecamp location selection
- Google Places Text Search
- Interactive Maps widgets
- Geocoding and reverse geocoding

**API Endpoints:**
- `autocomplete` - Place suggestions
- `text-search` - Natural language venue search
- `geocode` - Address to coordinates
- `place-details` - Detailed venue information

### 6. Poll & Decision Making

**Purpose:** Group decision coordination

**Key Files:**
- `src/components/polls/` - Component directory

**Features:**
- Multiple choice polls
- Real-time voting
- Result visualization
- AI awareness of poll results

### 7. Calendar & Itinerary

**Purpose:** Trip scheduling and event management

**Key Files:**
- `src/components/calendar/` - Component directory

**Features:**
- Event creation and management
- Time zone handling
- Basecamp location integration
- AI-powered schedule queries

---

## Development Setup

### Prerequisites

```bash
# Node.js 18+ (use nvm)
nvm install 18
nvm use 18

# Verify installation
node --version  # Should be v18.x or higher

# Install dependencies
npm install

# Install Supabase CLI (for Edge Functions)
npm install -g supabase
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key

# Lovable AI Gateway
LOVABLE_API_KEY=your_lovable_api_key
```

See `ENVIRONMENT_SETUP_GUIDE.md` for detailed API key setup.

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Run type checking
npm run typecheck

# Run all checks
npm run validate

# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Start Supabase locally
supabase start

# Preview production build
npm run preview
```

---

## Project Structure

```
Chravel/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Page components
│   ├── services/       # API and business logic
│   ├── integrations/   # External service integrations
│   ├── types/          # TypeScript type definitions
│   └── lib/            # Utility functions
├── supabase/
│   ├── functions/      # Edge Functions
│   └── migrations/     # Database migrations
├── public/             # Static assets
├── docs/               # Documentation
│   ├── ADRs/           # Architecture Decision Records
│   ├── archive/        # Archived documentation
│   │   └── capacitor/  # Deprecated Capacitor docs
│   └── ios/            # iOS-specific documentation
└── e2e/                # End-to-end tests
```

---

## AI Tools Usage Guide

This section helps AI coding assistants (Claude Code, Cursor, Codex, Jules, etc.) navigate the codebase efficiently.

### Active Code Directories

These are the primary directories AI tools should focus on for code changes:

| Directory | Purpose | When to Edit |
|-----------|---------|--------------|
| `src/` | Main React application | Most feature work, bug fixes |
| `src/components/` | Reusable UI components | Component changes, new UI |
| `src/services/` | Business logic & API calls | Service layer changes |
| `src/hooks/` | Custom React hooks | Hook additions/modifications |
| `src/pages/` | Page-level components | Route/page changes |
| `api/` | API endpoints | Backend API changes |
| `supabase/functions/` | Edge Functions | Serverless function changes |
| `supabase/migrations/` | Database schema | Schema migrations |
| `e2e/` | End-to-end tests | Test additions |

### Reference-Only Directories (Not for Active Editing)

These directories are **ignored by AI tools** (via `.aiignore`/`.cursorignore`) because they contain reference material, artifacts, or assets that don't require code changes:

| Directory | Contents | Why Ignored |
|-----------|----------|-------------|
| `SWIFT_SCREENS/` | Swift reference code | Historical reference only |
| `SWIFT_SCREENS_CORRECTED/` | Swift reference code | Historical reference only |
| `jules-scratch/` | AI scratch work | Temporary exploration |
| `appstore/` | App Store assets | Screenshots, metadata, legal |
| `ios-release/` | Release artifacts | CI/CD outputs |
| `docs/_archive/` | Archived documentation | Outdated/superseded docs |
| `test-results/` | Test output artifacts | Auto-generated |

### Key Entry Points

When starting work on the codebase, these files provide the best orientation:

1. **`CLAUDE.md`** (root) — Coding standards for all AI tools
2. **`docs/ACTIVE/DEVELOPER_HANDBOOK.md`** (this file) — Architecture & features
3. **`src/App.tsx`** — Main application entry
4. **`src/integrations/supabase/client.ts`** — Supabase singleton
5. **`supabase/functions/lovable-concierge/index.ts`** — AI Concierge endpoint

### Commands AI Tools Should Know

```bash
npm run dev          # Start local dev server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
npm run build        # Production build
npm run validate     # All checks (lint + typecheck + build)
npm run test         # Unit tests
npm run test:e2e     # E2E tests
```

### What NOT to Do

- **Don't** edit files in ignored directories unless explicitly asked
- **Don't** move code between `src/`, `api/`, `supabase/`, `ios/`, or `migrations/`
- **Don't** delete or reorganize the directory structure
- **Don't** create new documentation files without explicit request
- **Always** run `npm run validate` before committing changes

---

## Database Schema

### Core Tables

```sql
-- Trip management
trips (id, title, location, start_date, end_date, basecamp, participants)
trip_members (trip_id, user_id, role, permissions)

-- Messaging
trip_chat_messages (id, trip_id, content, author_name, created_at, privacy_mode)
trip_broadcasts (id, trip_id, content, author_name, created_at)

-- Tasks
trip_tasks (id, trip_id, title, description, assigned_to, status, due_date)

-- Payments
trip_payments (id, trip_id, amount, description, participants, payment_method)
trip_receipts (id, trip_id, amount, description, participants, receipt_image)

-- Polls
trip_polls (id, trip_id, question, options, results, created_at)

-- Events
trip_events (id, trip_id, title, start_date, end_date, location, address)
```

See `docs/DATABASE_SCHEMA.md` for complete schema documentation.

---

## API Endpoints

### Supabase Edge Functions

| Endpoint | Purpose |
|----------|---------|
| `/functions/lovable-concierge` | AI Concierge with Google Maps grounding |
| `/functions/place-grounding` | Place-specific AI responses |
| `/functions/google-maps-proxy` | Google Maps API proxy |
| `/functions/unified-messaging` | Message management |
| `/functions/ai-search` | Trip data search |
| `/functions/receipt-parser` | Receipt AI parsing |

### External APIs

| API | Purpose |
|-----|---------|
| Google Gemini | AI responses via Lovable Gateway |
| Google Maps | Places, Geocoding, Grounding |
| Supabase | Database, Auth, Real-time subscriptions |

---

## Implementation Notes

### AI Concierge Context

The AI Concierge has access to ALL trip data:
- Payment history and balances
- Poll results and group decisions
- Task assignments and status
- Calendar events with addresses
- Chat history for summarization
- Basecamp location for local recommendations

### Google Maps Grounding

- Only triggers for location-based queries
- Uses trip basecamp coordinates for accuracy
- Returns interactive Maps widgets
- Provides verified source citations
- Cost-optimized with smart detection

### Real-time Subscriptions

- Chat messages via Supabase channels
- Task updates and assignments
- Payment notifications
- Poll result updates

### PWA Capabilities

- Service worker for offline support
- Add to home screen
- Push notifications (when backend configured)
- Responsive design for all screen sizes

---

## Mobile Strategy

### Current State

**This repository is web-first today.** Mobile apps are packaged from this same codebase using Capacitor (iOS first, Android next).

| Platform | Status | Technology | Repository |
|----------|--------|------------|------------|
| Web | **Active** | React/TypeScript | This repo |
| PWA | **Active** | Service Worker | This repo |
| iOS | **Planned / In Progress** | Capacitor | This repo |
| Android | **Planned / In Progress** | Capacitor | This repo |

### Why Capacitor?

Capacitor allows Chravel to ship a functioning website and a store-distributed iOS/Android app from the same React codebase, while selectively adding native capabilities (push, haptics, deep links, etc.) via a maintained JS↔native bridge.

### What This Means for Web Development

- Continue web-first development in this repository
- PWA remains valuable for mobile web users
- Mobile-specific capabilities are added via shared platform services and (when configured) Capacitor plugins

See `ARCHITECTURE_DECISIONS.md` for the full platform strategy.

---

## Production Readiness

### Web Version

| Area | Status | Notes |
|------|--------|-------|
| Core Features | ✅ Ready | All features functional |
| Authentication | ✅ Ready | Supabase Auth |
| Real-time | ✅ Ready | Supabase subscriptions |
| AI Concierge | ✅ Ready | Google Maps grounding |
| Payments | ✅ Ready | Split calculations |
| PWA | ✅ Ready | Service worker active |
| Performance | ✅ Ready | Code splitting enabled |
| Security | ✅ Ready | CSP headers, RLS policies |

### Deployment

- **Vercel**: Primary deployment platform
- **Render**: Secondary/backup option
- **Supabase**: Edge Functions and database

See `DEPLOYMENT_GUIDE.md` for deployment procedures.

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Build errors | Check TypeScript types, run `npm run typecheck` |
| API errors | Verify environment variables are set |
| Auth issues | Check Supabase connection and RLS policies |
| Map issues | Verify Google Maps API key and quota |

### Debug Tools

- **React DevTools**: Component inspection
- **Supabase Dashboard**: Database and auth debugging
- **Network Tab**: API call inspection
- **Console**: Error logging

---

## Support & Resources

### Internal Documentation

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | AI coding standards |
| `DEPLOYMENT_GUIDE.md` | Deployment procedures |
| `ARCHITECTURE_DECISIONS.md` | Platform strategy |
| `CONTRIBUTING.md` | Contribution guidelines |
| `ENVIRONMENT_SETUP_GUIDE.md` | API key setup |

### External Resources

| Resource | Link |
|----------|------|
| Supabase Docs | https://supabase.com/docs |
| React Docs | https://react.dev |
| TypeScript Docs | https://typescriptlang.org/docs |
| Tailwind CSS Docs | https://tailwindcss.com/docs |
| Vite Docs | https://vitejs.dev |
| Google Maps Docs | https://developers.google.com/maps |

---

**Last Updated:** December 2025
**Version:** 2.0.0
