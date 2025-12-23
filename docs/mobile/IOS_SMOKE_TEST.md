## iOS Smoke Test (Capacitor)

**Purpose:** the minimum steps to verify web + iOS wrapper work without regressions.

---

## Web (dev)

```bash
npm install
npm run dev
```

- Open the dev URL printed by Vite (default `http://localhost:8080`).

---

## Web (production build)

```bash
npm run lint
npm run typecheck
npm run build
npm run preview
```

---

## iOS (Capacitor)

### 1) One-time init (creates `ios/` if missing)

```bash
IOS_APP_NAME="Chravel" IOS_BUNDLE_ID="com.chravel.app" npm run cap:init
```

**TODO(mobile):** replace the bundle ID with your real Apple bundle ID before App Store work.

### 2) Sync latest web build into iOS bundle

```bash
npm run cap:sync
```

### 3) Open Xcode

```bash
npm run ios:open
```

In Xcode:
- Select a simulator or a connected device
- Press **Run**

### 4) Optional: run via CLI (macOS only)

```bash
npm run ios:run
```

---

## Deep link sanity (router/base path)

Chravel uses:
- `BrowserRouter` (SPA routing)
- Vite `base: '/'` (see `vite.config.ts`)

Quick checks:
- Visit `/join/<token>` in web production preview: should render correctly.
- In iOS wrapper, navigate into deep routes (e.g. open a trip, then reload) — should not blank screen.

