## Background / Foreground Lifecycle (Capacitor iOS)

This project runs as a web app (Vite/React) and as a native shell via Capacitor (iOS/Android). On iOS, the WebView can be suspended while backgrounded, so we do **minimal lifecycle handling** to keep user-facing state correct when the app returns to foreground.

### Goals

- **Refresh critical data on resume** (foreground).
- **Maintain the app icon badge** for “unread” (minimal source-of-truth).
- **Guarantee notification-tap routing** works from background *and* cold start.

### Implementation

#### 1) Native lifecycle event hub

File: `src/native/lifecycle.ts`

- Listens to Capacitor `App` lifecycle:
  - `appStateChange` (primary: `isActive`)
  - `resume`
  - `pause`
- Exposes simple subscriptions:
  - `onNativeResume(handler)`
  - `onNativeBackground(handler)`
- Captures notification-tap navigation early and stores it in `sessionStorage` under:
  - `chravel:pending_push_route`

#### 2) Early initialization (cold start safe)

File: `src/main.tsx`

We call `initNativeLifecycle()` **before** rendering React. This ensures that if the app is launched from a push notification tap, the tap is captured immediately and queued until React Router is ready.

#### 3) Router bridge (flush queued navigation + resume refresh)

File: `src/App.tsx`

Inside `<Router>`, we mount a tiny bridge component that:

- Calls `attachNavigator(navigate)` to allow `src/native/lifecycle.ts` to route.
- On resume:
  - **Invalidates active React Query queries** (`refetchType: 'active'`) to refresh critical UI.
  - **Syncs the badge count** by querying unread rows in `notifications`.

### Badge counts (minimal)

We currently set the iOS app icon badge via Capacitor **Local Notifications**:

- `setNativeBadgeCount(count)` → `LocalNotifications.setBadgeCount({ count })`

Minimal badge source-of-truth today:

- Count of unread rows in `public.notifications` (`is_read = false`) for the current user.

If/when you introduce a dedicated “unread messages” aggregate (across trips/threads), update the badge sync logic in `NativeLifecycleBridge` (`src/App.tsx`) to use that instead.

### Push tap routing (background + cold start)

When a user taps a push notification:

1. `src/native/lifecycle.ts` receives `pushNotificationActionPerformed`
2. It parses the Chravel payload (see `src/native/push.ts`)
3. Builds a route (see `src/native/pushRouting.ts`)
4. Stores the route in `sessionStorage`
5. Once React Router is available, `attachNavigator()` flushes the route via `navigate(...)`

### Notes / pitfalls

- **Do not rely on `document.visibilityState` for native**: iOS WebView suspension doesn’t always mirror browser semantics.
- **Keep resume work lightweight**: invalidate “active” queries; avoid full-cache refetches.
- **Always guard native calls**: `Capacitor.isNativePlatform()` + `Capacitor.isPluginAvailable(...)`.

