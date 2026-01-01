# Chravel Architecture Decisions

> **Purpose:** Authoritative record of key architectural decisions for the Chravel platform
> **Audience:** All developers, contractors, AI assistants, and stakeholders
> **Last Updated:** December 2025

---

## Mobile Platform Strategy

### Canonical Decision

**Capacitor is the supported mobile packaging strategy for Chravel (iOS + Android).**

| Component | Status | Location |
|-----------|--------|----------|
| React Web App | **Active** | This repository (`/src`) |
| PWA Support | **Active** | Service worker at `/public/sw.js` |
| Supabase Backend | **Shared** | Same database for web + mobile |
| Mobile Apps | **Planned / In Progress** | Packaged from this repo via Capacitor |
| Capacitor | **Planned / In Progress** | Config + native projects to be (re)introduced here |

### Background

Chravel’s product strategy prioritizes a **single codebase** where web and mobile ship from the same React application. Capacitor provides a native shell and a maintained JS↔native bridge so we can add native capabilities (push, haptics, deep links, etc.) without rewriting the UI layer.

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CHRAVEL PLATFORM                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐    ┌─────────────────────────────────┐  │
│   │  React Web   │    │     iOS / Android App Shell      │  │
│   │     App      │    │          (Capacitor)             │  │
│   │  (Active)    │    │     (Planned / In Progress)      │  │
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

---

## No Regressions Policy (Authoritative)

This repository has an explicit mobile packaging strategy.

### Prohibited Regressions

The following are **not allowed** in this repository without an approved RFC:

- Introducing additional mobile frameworks / parallel mobile codebases that diverge from the React app
- Documentation that implies the mobile app is built from a separate UI codebase
- CI/CD workflows that depend on non-standard mobile toolchains unrelated to Capacitor + native IDE builds

If any of the above appear, it is considered a **documentation or architectural regression**, not a stylistic difference.

### Documentation Contract

All documentation in this repo must:

- Reflect the **current production reality**, not historical decisions
- Treat Capacitor as the **source of truth for mobile packaging**
- Treat unsupported approaches as **not used**, not “still supported”
- Be safe for:
  - New hires
  - Contractors
  - Investor diligence
  - Production incident response

Docs are not historical artifacts — they are **operational contracts**.

### Enforcement Rule

Any PR that:
- Introduces a diverging mobile strategy, or
- Adds ambiguity around the mobile packaging approach

**must be blocked** until corrected.

If behavior and documentation diverge, **the code wins** — and the docs must be updated immediately.

### How to Change This Policy

This policy can only be changed via:
1. A written architectural RFC
2. Explicit approval by the core maintainers
3. A repo-wide documentation update in the same PR

Silent reversals are not allowed.

---

## Backend Architecture

### Supabase as Primary Backend

Chravel uses Supabase as the primary backend service. This decision is documented in `docs/ADRs/002-supabase-over-firebase.md`.

**Key Components:**
- **PostgreSQL Database**: Core data storage with RLS policies
- **Supabase Auth**: User authentication and session management
- **Edge Functions**: Serverless Deno functions for API logic
- **Real-time Subscriptions**: WebSocket-based live updates
- **Storage**: File storage for media assets

### Edge Functions

Critical Edge Functions deployed to Supabase:

| Function | Purpose |
|----------|---------|
| `create-trip` | Create new trips with proper permissions |
| `join-trip` | Handle trip join requests |
| `approve-join-request` | Process admin approvals |
| `lovable-concierge` | AI concierge with Google Maps grounding |
| `google-maps-proxy` | Secure proxy for Google Maps API |
| `unified-messaging` | Message management and real-time sync |

---

## Deployment Architecture

### Web Deployment

**Primary**: Vercel (vercel.json configuration)
**Secondary**: Render (render.yaml configuration)

Both deployments use the same build process:
```bash
npm install && npm run build
```

Output: Static files in `/dist` directory served via CDN.

### Mobile Deployment (Future)

When mobile store builds are created:
- iOS builds go through Xcode/App Store Connect
- Android builds go through Gradle/Google Play Console
- Both connect to the same Supabase backend

**Important**: This repository (`MeechYourGoals/Chravel`) contains the web app only. No mobile build steps exist here.

---

## API Keys & External Services

### Required Services

| Service | Purpose | Required For |
|---------|---------|--------------|
| Supabase | Database, Auth, Functions | All features |
| Google Maps | Maps, Places, Geocoding | Location features |
| Google Gemini | AI responses | AI Concierge |

### Environment Variables

See `.env.production.example` for the complete list of required environment variables.

---

## Historical Context (Archived)

### Prior Mobile Notes

Older Capacitor notes may exist under `docs/archive/capacitor/`. Treat archived docs as non-authoritative unless explicitly referenced by current guides.

**These documents are NOT operational:**
- `001-capacitor-over-react-native.md`
- `ANDROID_CAPACITOR_GUIDE.md`
- `ANDROID_DEPLOY_QUICKSTART.md`
- `CAPACITOR_IOS_READINESS_ASSESSMENT.md`
- `CAPACITOR_NATIVE_GUIDE.md`
- `IOS_DEPLOY_QUICKSTART.md`
- `MOBILE_NAVIGATION.md`
- `MOBILE_READINESS.md`
- `TESTFLIGHT_DEPLOY.md`

**Do not follow these documents for current development.**

---

## Related Documents

- `docs/ADRs/002-supabase-over-firebase.md` - Supabase decision ADR
- `docs/ARCHITECTURE.md` - Technical architecture details
- `DEVELOPER_HANDBOOK.md` - Development setup and guidelines
- `DEPLOYMENT_GUIDE.md` - Deployment procedures
- `CONTRIBUTING.md` - Contribution guidelines

---

**Document Version:** 1.0
**Last Review:** December 2025
