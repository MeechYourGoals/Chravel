# ThoughtBot Engagement — Access & Onboarding Guide

> **Purpose:** Everything ThoughtBot needs before Week 1 kicks off
> **Last Updated:** 2026-03-05
> **Owner:** Chravel Engineering

---

## 1. GitHub / Source Repository

### What to provide
- [ ] Invite ThoughtBot engineer(s) as **Collaborators** with **Write** access to the `ChravelApp` repo
- [ ] Ensure `main` branch protection is enabled:
  - Required PR reviews (at least 1 approval)
  - No direct pushes to `main`
  - Status checks must pass before merge (`lint:check`, `typecheck`, `build`, `test`)

### Repo details
| Item | Value |
|------|-------|
| Repo | `MeechYourGoals/Chravel` (private) |
| Default branch | `main` |
| CI pipeline | `.github/workflows/ci.yml` — runs lint, typecheck, test, build on every PR |
| Node version | `>=20.0.0` |
| Package manager | npm |
| Build tool | Vite 5.4.21 |

### How they run locally
```bash
npm install
npm run dev          # Dev server on localhost:8080
npm run lint         # ESLint with auto-fix
npm run typecheck    # TypeScript check (strict: false)
npm run build        # Production build
npm run test         # Unit tests (Vitest)
```

### Post-engagement cleanup
- [ ] Remove collaborator access
- [ ] Rotate any deploy keys

---

## 2. Apple Developer / App Store Connect

### What to provide
- [ ] Create a **dedicated Apple ID** for ThoughtBot (e.g., `vendor-thoughtbot@chravel.app`)
- [ ] Enable **2FA** on that account with a device you (Meech) control
- [ ] Add the Apple ID to your App Store Connect team
- [ ] Assign role: **App Manager** (preferred) or **Developer** — only grant **Admin** if they explicitly need provisioning profile management

### What they need to know
| Item | Value |
|------|-------|
| Bundle ID | `com.chravel.app` (configurable via `IOS_BUNDLE_ID` env var) |
| App Name | `Chravel` (configurable via `IOS_APP_NAME` env var) |
| Capacitor version | 8.0.0 |
| Build output dir | `dist` (Vite → Capacitor) |
| iOS workflow | `.github/workflows/ios-release.yml` |

### Capacitor config highlights
- Web directory: `dist`
- Status bar overlays WebView (for notch/safe-area support)
- Keyboard resize mode: `body`
- Splash screen: auto-hide enabled
- Externalized native-only deps: `@sentry/capacitor`, `@sentry/react`, `posthog-js`

### Do NOT share
- Your personal Apple ID password — ever
- Account Owner credentials

### Post-engagement cleanup
- [ ] Revoke the vendor Apple ID
- [ ] Rotate certificates and provisioning profiles if they had Admin access

---

## 3. Vercel

### What to provide
- [ ] Add ThoughtBot engineer(s) as **Member** on the specific Chravel project (not org-wide admin)
- [ ] Create a **staging/preview** environment for their Capacitor build work
- [ ] Share the current Vercel project configuration (already documented below)

### Vercel project configuration
| Item | Value |
|------|-------|
| Framework | Vite |
| Build command | `vite build` |
| Install command | `npm install --no-audit --no-fund` |
| Output directory | `dist` |
| Node version | 20 |

### Key Vercel features in use
- **Security headers**: HSTS, CSP report-uri, Permissions-Policy
- **Cache strategy**: HTML = no-store, SW = no-store, static assets = 1yr immutable
- **Redirects**: `www.chravel.app` → `chravel.app` (301), `chravelapp.com` → `/demo`
- **Rewrites**: `.well-known/apple-app-site-association`, `.well-known/assetlinks.json`, `/join/:code`, `/trip/:tripId/preview`
- **Code splitting**: react-vendor, ui-vendor, supabase, utils, charts, pdf

### Do NOT share
- Billing-level or org-admin access

### Post-engagement cleanup
- [ ] Remove member access
- [ ] Audit environment variables (remove any they added)

---

## 4. Supabase

### What to provide
- [ ] Add ThoughtBot as a **Member** seat on the Chravel Supabase project
- [ ] Share the **anon key** (public key — safe to share)
- [ ] Share auth redirect URL configuration
- [ ] Provide RLS policy overview (see below)
- [ ] Deliver all secrets via **1Password vault** (or Bitwarden)

### Supabase project details
| Item | Value |
|------|-------|
| Project ID | `jmjiyekmxwsxkfnqwyaa` |
| Project URL | `https://jmjiyekmxwsxkfnqwyaa.supabase.co` |
| PostgreSQL version | 14.1 |
| Client library | `@supabase/supabase-js` v2.53.0 |
| Auth provider | Supabase Auth (email/password + Google OAuth) |
| Realtime | Enabled (postgres_changes) |

### Schema overview
- **80+ public tables** — full TypeScript types in `src/integrations/supabase/types.ts`
- **150+ migration files** in `supabase/migrations/`
- **889+ RLS policies** across all tables
- **40+ database functions** (PL/pgSQL, all `SECURITY DEFINER`)
- **11 storage buckets** (avatars, trip-photos, trip-media, attachments, etc.)
- **77 edge functions** in `supabase/functions/`

### Key tables they'll likely touch
- `trips`, `trip_members`, `trip_stops`
- `channels`, `messages`, `broadcasts`
- `events`, `event_rsvps`
- `payments`, `payment_splits`
- Auth tables via `auth.users`

### What they need for App Store Connect work specifically
- Auth redirect URL configuration (for deep linking from native app)
- Understanding of the Capacitor ↔ Supabase auth flow
- Storage bucket policies (for native file uploads)

### Do NOT share
- `service_role` key (server-side admin key)
- Database connection strings in plaintext
- Any key via Slack, email, or other unencrypted channels

### Post-engagement cleanup
- [ ] Rotate the anon key
- [ ] Remove their member seat
- [ ] Audit any RLS policy changes they made

---

## 5. Environment Variables (via 1Password Vault)

### Create a shared vault named `Chravel-ThoughtBot` containing:

#### Required (frontend — safe to share)
| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key |
| `VITE_APP_URL` | `https://chravel.app` |
| `VITE_VAPID_PUBLIC_KEY` | Web push notification public key |

#### Required (Capacitor/mobile — they need these for App Store work)
| Variable | Description |
|----------|-------------|
| `IOS_BUNDLE_ID` | `com.chravel.app` |
| `IOS_APP_NAME` | `Chravel` |
| `ANDROID_PACKAGE_NAME` | `com.chravel.app` |

#### Conditionally needed (only if their scope includes these features)
| Variable | Description | Share? |
|----------|-------------|--------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe public key | Only if payments in scope |
| `GEMINI_API_KEY` | Gemini AI key | Only if AI features in scope |
| `RESEND_API_KEY` | Email service | Only if email features in scope |
| `VITE_SENTRY_DSN` | Error tracking | Recommended for debugging |

#### NEVER share directly
| Variable | Reason |
|----------|--------|
| `STRIPE_SECRET_KEY` | Server-side only, high privilege |
| `STRIPE_WEBHOOK_SECRET` | Server-side only |
| `VAPID_PRIVATE_KEY` | Server-side only, stored in Supabase secrets |
| Supabase `service_role` key | Full database bypass |
| Database connection string | Direct DB access |

### Post-engagement cleanup
- [ ] Delete the shared vault
- [ ] Rotate ALL shared credentials

---

## 6. Architecture Context for ThoughtBot

### Tech stack summary
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript 5.9 |
| State | TanStack Query 5 + Zustand 5 |
| Styling | Tailwind CSS 3.4 + Shadcn/ui (Radix) |
| Build | Vite 5.4 |
| Backend | Supabase (Postgres, RLS, Edge Functions, Realtime) |
| Auth | Supabase Auth |
| Native shell | Capacitor 8.0 |
| Payments | Stripe + RevenueCat |
| Maps | Google Maps / Places API |
| AI | Google Gemini + Lovable AI (fallback) |
| Email | Resend |
| Push | Web Push (VAPID) + native push |
| PWA | Workbox service worker |
| CI/CD | GitHub Actions → Vercel (web) + App Store (iOS) |

### File structure they should know
```
src/
├── features/          # Domain logic (broadcasts, calendar, chat, etc.)
│   ├── */components/
│   └── */hooks/
├── components/        # Shared UI components
├── integrations/
│   └── supabase/
│       ├── client.ts  # Supabase singleton
│       └── types.ts   # Generated DB types (80+ tables)
├── lib/               # Utility functions
├── types/             # Shared type definitions
└── pages/             # Route pages

supabase/
├── config.toml        # Project config (77 functions registered)
├── functions/         # 77 Edge Functions
│   └── _shared/       # Shared utilities (cors, security, validation)
└── migrations/        # 150+ migration files

public/
├── manifest.json      # PWA manifest
└── sw.js              # Service worker (Workbox)
```

### Key files for Capacitor/App Store work
- `capacitor.config.ts` — Native app configuration
- `vercel.json` — Deep link rewrites (`.well-known/apple-app-site-association`)
- `public/manifest.json` — PWA manifest
- `.github/workflows/ios-release.yml` — iOS release pipeline
- `index.html` — CSP headers, Apple meta tags, viewport-fit=cover

### Performance-sensitive paths (do not regress)
- View Trip loading
- Chat / messaging
- Calendar rendering
- Invite flow (join via link)

---

## 7. Pre-Engagement Checklist

### You (Meech) do BEFORE Day 1:

#### GitHub
- [ ] Invite ThoughtBot engineer(s) as Collaborators (Write access)
- [ ] Verify `main` branch protection rules (required reviews, status checks)
- [ ] Confirm CI pipeline passes on current `main`

#### Apple Developer
- [ ] Create dedicated Apple ID: `vendor-thoughtbot@chravel.app`
- [ ] Enable 2FA on that Apple ID (use your device)
- [ ] Add to App Store Connect team as **App Manager**
- [ ] Note the Team ID and provide it to ThoughtBot

#### Vercel
- [ ] Add ThoughtBot engineer as **Member** on Chravel project
- [ ] Create staging/preview environment for Capacitor builds
- [ ] Document any custom env vars they'll need access to

#### Supabase
- [ ] Add ThoughtBot as **Member** on project `jmjiyekmxwsxkfnqwyaa`
- [ ] Verify auth redirect URLs include Capacitor deep link schemes
- [ ] Export current RLS policy summary for their review

#### Secrets Delivery
- [ ] Create 1Password shared vault: `Chravel-ThoughtBot`
- [ ] Add all required env vars (see Section 5)
- [ ] Share vault access with ThoughtBot's designated engineer(s)
- [ ] **NEVER** send secrets via Slack, email, or any unencrypted channel

#### Documentation
- [ ] Share this onboarding document
- [ ] Have `CLAUDE.md` (engineering manifesto) available in the repo
- [ ] Ensure `.env.example` and `.env.production.example` are up to date

---

## 8. Post-Engagement Security Cleanup

| Item | Action | Done? |
|------|--------|-------|
| GitHub collaborator access | Remove collaborator, rotate deploy keys | [ ] |
| Apple ID (`vendor-thoughtbot@chravel.app`) | Revoke account, rotate certs if Admin was granted | [ ] |
| Vercel project access | Remove member, audit env vars | [ ] |
| Supabase member seat | Remove member, rotate anon key | [ ] |
| 1Password vault | Delete `Chravel-ThoughtBot` vault | [ ] |
| All shared credentials | Rotate everything that was shared | [ ] |
| Code review | Audit all merged PRs from engagement period | [ ] |
