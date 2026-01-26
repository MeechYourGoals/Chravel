## CAPACITOR SHIP PLAN (iOS) — Chravel

**Goal:** ship the existing React + PWA codebase to the iOS App Store via Capacitor **with minimal regressions**.

**Non-goals (v1):**
- Rewriting UI in another framework
- Breaking PWA/offline/service worker behavior on the web

---

## 1) Repo audit (current stack)

- **Framework**: React 18 (`react`, `react-dom`)
- **Build tool**: Vite 5 (`vite`, `@vitejs/plugin-react-swc`)
- **Routing**: React Router v6 (`react-router-dom`) using `BrowserRouter` (see `src/App.tsx`)
- **PWA / Service Worker**:
  - Service worker registered **only in PROD** (see `src/main.tsx`)
  - Registration logic in `src/utils/serviceWorkerRegistration.ts`
  - SW script at `public/sw.js`
- **Backend**: Supabase (`@supabase/supabase-js`)
  - Client: `src/integrations/supabase/client.ts`
  - Uses `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` with defaults

---

## 2) Capacitor presence + exact install steps

### Current state (this repo)
- Capacitor is now included in `package.json`:
  - `@capacitor/core`
  - `@capacitor/ios`
  - `@capacitor/cli`
- Config file is present: `capacitor.config.ts`
- iOS native project folder (`ios/`) may or may not exist yet (created by `npx cap add ios`).

### Install / init (repeatable, non-interactive)

1) **Install deps**

```bash
npm install
```

2) **Initialize + add iOS**

```bash
IOS_APP_NAME="Chravel" IOS_BUNDLE_ID="com.chravel.app" npm run cap:init
```

Notes:
- `cap:init` will build the web assets if `dist/` is missing.
- It will create `ios/` if missing.
- It will run `npx cap sync ios`.

3) **Open Xcode**

```bash
npm run ios:open
```

---

## 3) Environment variables (web + iOS)

### Pattern (Vite)
- The web app reads config via `import.meta.env.*`.
- **Only variables prefixed with `VITE_` are available to client code.**
- For iOS builds, the web bundle is built **ahead of time** and then synced into `ios/`.
  - That means **iOS receives env vars at build-time** (during `vite build`), not at runtime.

### Where env vars live today
- Example template: `.env.production.example`
- Common client vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_GOOGLE_MAPS_API_KEY`
  - `VITE_STRIPE_PUBLISHABLE_KEY`
  - `VITE_VAPID_PUBLIC_KEY` (web push)
  - Feature flags: `VITE_ENABLE_*`

### How iOS builds should receive env vars
**Recommended v1 approach (fastest / simplest):**
- Create a real `.env.production` (not committed).
- Run:

```bash
npm run build
npx cap sync ios
```

**Important:** `VITE_*` values are not secrets; they will be embedded into the web bundle. Keep secrets server-side (Edge Functions, etc.).

### TODOs (missing values)
- TODO(mobile): confirm `IOS_BUNDLE_ID` and `IOS_APP_NAME` (used by `cap:init` and `capacitor.config.ts`)
- TODO(mobile): decide how to manage **multiple environments** (staging vs prod) for TestFlight/App Store:
  - Option A: separate `.env.staging` + `vite build --mode staging`
  - Option B: separate git branches for release builds

---

## 4) Plugin plan (prefer official Capacitor plugins)

Chravel already has “platform abstraction” modules (`src/platform/*`) and services (`src/services/*`) that are good seams for native capability upgrades.

### Recommended v1 plugins (official)
- **App lifecycle + deep linking**
  - `@capacitor/app`
- **Haptics**
  - `@capacitor/haptics`
- **Keyboard + safe-area polish**
  - `@capacitor/keyboard`
  - `@capacitor/status-bar`
  - `@capacitor/splash-screen`
- **Push notifications (APNs)**
  - `@capacitor/push-notifications`
- **Device + network**
  - `@capacitor/device`
  - `@capacitor/network`
- **Share sheet**
  - `@capacitor/share`
- **Camera + photo library (if needed for receipts/media)**
  - `@capacitor/camera`
- **Storage**
  - `@capacitor/preferences` (simple key/value)
  - `@capacitor/filesystem` (files)
- **Open external URLs**
  - `@capacitor/browser`

### Not official (flagged for later decision)
- **Sign in with Apple**
  - No official Capacitor plugin. Evaluate a community plugin *only if/when required by App Review*.
  - TODO(mobile-auth): decide approach for Apple Sign-In:
    - native plugin + Supabase OAuth flow, or
    - web-only OAuth (may be insufficient for App Review depending on other providers offered)

---

## 5) Apple Developer Portal checklist (must-have)

### App identity
- [ ] **Bundle ID** created (matches `IOS_BUNDLE_ID`)
- [ ] App created in **App Store Connect**
- [ ] Team selected, signing configured in Xcode

### Capabilities (enable as needed)
- [ ] **Push Notifications** (if using APNs)
- [ ] **Associated Domains** (Universal Links; also helpful for auth/deep links)
- [ ] **Sign in with Apple** (if required)
- [ ] Background Modes (only if you truly need them)

### Push notifications (APNs)
- [ ] APNs key created (Auth Key, `.p8`)
- [ ] App Store Connect + server configured to send pushes
- [ ] Decide provider (FCM, OneSignal, custom)
  - TODO(push): confirm push provider + token registration backend table/API

### Privacy + App Review
- [ ] App Privacy details filled out in App Store Connect
- [ ] Add **usage descriptions** (Info.plist) for any permissions you request:
  - Camera, Photos, Location, Microphone, etc.
- [ ] Apple “privacy manifest” requirements (Xcode will prompt depending on SDKs)

---

## 6) iOS build + release testing steps (minimum)

### Local dev sanity
- [ ] `npm run lint && npm run typecheck && npm run build`
- [ ] `npm run cap:sync` (build + sync)
- [ ] `npm run ios:open` and build/run on simulator + a real device

### Core “no regression” flows (must pass on iOS)
- [ ] Auth: sign in/out, session persistence (Supabase)
- [ ] Trips: create trip, open trip, basecamp persistence
- [ ] Chat: load messages, send message, realtime updates
- [ ] Media: upload + view (especially video playback on iOS)
- [ ] Offline: airplane-mode read UX, reconnect recovery

### PWA guardrails (must not regress on web)
- [ ] Service worker still registers in production builds
- [ ] Deep links like `/join/:token` still load correctly (Vite `base: '/'` is required)

---

## 7) “Ship plan” milestones (suggested)

### Milestone A — Wrapper boots reliably
- [ ] Capacitor config checked in (`capacitor.config.ts`)
- [ ] `ios/` generated, builds in Xcode
- [ ] App loads `/dist` and routing works

### Milestone B — Native polish
- [ ] Status bar + safe areas
- [ ] Splash screen + icons
- [ ] Keyboard behavior validated on chat

### Milestone C — Native value (App Review credibility)
- [ ] Push notifications (or a clear “coming soon” path + meaningful native polish)
- [ ] Haptics on key actions
- [ ] Deep links / universal links working for invites

---

## 8) Known iOS/Capacitor watch-outs (don’t skip)

- **Service workers inside a native WebView** can behave differently than Safari/PWA.
  - We are **not disabling** the service worker in v1 to avoid breaking the PWA.
  - If caching issues occur inside the native shell, add a **native-only guard** later (keep web behavior unchanged).
- **Web push vs APNs**:
  - The existing Web Push model (VAPID) is not the same as native APNs.
  - Native push requires APNs + plugin + backend device-token storage.

