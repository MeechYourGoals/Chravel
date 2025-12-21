# Chravel Architecture Decisions

> **Purpose:** Authoritative record of key architectural decisions for the Chravel platform
> **Audience:** All developers, contractors, AI assistants, and stakeholders
> **Last Updated:** December 2025

---

## Mobile Platform Strategy

### Canonical Decision

**Flutter is the sole supported native mobile strategy for Chravel.**

| Component | Status | Location |
|-----------|--------|----------|
| React Web App | **Active** | This repository (`/src`) |
| PWA Support | **Active** | Service worker at `/public/sw.js` |
| Supabase Backend | **Shared** | Same database for web + future mobile |
| Flutter Mobile App | **Planned** | Separate repository (TBD) |
| Capacitor | **Removed** | Archived in `docs/archive/capacitor/` |

### Background

Chravel initially explored Capacitor to wrap the React web app for iOS and Android. After evaluation, this approach was deprecated in favor of Flutter for the following reasons:

1. **Performance**: WebView-based rendering couldn't match native performance for complex UI interactions
2. **Platform parity**: Achieving consistent behavior across iOS/Android required significant workarounds
3. **Native access**: Advanced native features required custom plugin development
4. **Bundle size**: Shipping a full web app inside a native wrapper increased app size

See `docs/ADRs/002-flutter-over-capacitor.md` for the full decision record.

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CHRAVEL PLATFORM                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│   │  React Web   │    │   Flutter    │    │   Flutter    │  │
│   │     App      │    │  iOS App     │    │ Android App  │  │
│   │  (Active)    │    │  (Planned)   │    │  (Planned)   │  │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│          │                   │                   │          │
│          └───────────────────┼───────────────────┘          │
│                              │                              │
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

This repository has undergone a **deliberate platform decision**.

### Prohibited Regressions

The following are **not allowed** in this repository without an approved RFC:

- Re-introducing Capacitor, Cordova, or hybrid wrapper assumptions
- Adding deployment steps that depend on `npx cap`, `capacitor.config.*`, or Capacitor plugins
- Documentation that implies:
  - "Web → wrapped → App Store" as the mobile path
  - Capacitor as a fallback or interim solution
- CI/CD workflows that assume a Capacitor-based iOS or Android build
- Instructions that mix Flutter-native and Capacitor concepts

If any of the above appear, it is considered a **documentation or architectural regression**, not a stylistic difference.

### Documentation Contract

All documentation in this repo must:

- Reflect the **current production reality**, not historical decisions
- Treat Flutter as the **source of truth for mobile**
- Treat outdated approaches as **removed**, not "still supported"
- Be safe for:
  - New hires
  - Contractors
  - Investor diligence
  - Production incident response

Docs are not historical artifacts — they are **operational contracts**.

### Enforcement Rule

Any PR that:
- Reintroduces deprecated mobile strategies, or
- Adds ambiguity around Flutter vs Capacitor

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

When the Flutter mobile app is created:
- It will exist in a **separate repository**
- It will connect to the **same Supabase backend**
- iOS builds will go through Xcode/App Store Connect
- Android builds will go through Gradle/Google Play Console

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

### Capacitor (Deprecated)

Capacitor documentation has been moved to `docs/archive/capacitor/` for historical reference only.

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

- `docs/ADRs/002-flutter-over-capacitor.md` - Flutter decision ADR
- `docs/ADRs/002-supabase-over-firebase.md` - Supabase decision ADR
- `docs/ARCHITECTURE.md` - Technical architecture details
- `DEVELOPER_HANDBOOK.md` - Development setup and guidelines
- `DEPLOYMENT_GUIDE.md` - Deployment procedures
- `CONTRIBUTING.md` - Contribution guidelines

---

**Document Version:** 1.0
**Last Review:** December 2025
