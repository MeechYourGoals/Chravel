# Capacitor Wrap Readiness Report

**Date:** 2026-01-31
**Target:** iOS App Store submission via Capacitor 8

---

## Current State

| Item | Status |
|------|--------|
| Capacitor 8 installed | ✅ |
| `capacitor.config.ts` exists | ✅ |
| `webDir: 'dist'` configured | ✅ |
| `npm run build` produces static output | ✅ |
| StatusBar plugin configured | ✅ |
| Keyboard resize configured | ✅ |
| SplashScreen configured | ✅ |
| `viewport-fit=cover` in index.html | ✅ |
| Safe-area CSS insets used | ✅ |
| PWA meta tags present | ✅ |

---

## Build + Sync Commands

```bash
# 1. Build the web app
npm run build

# 2. Sync with iOS project
npx cap sync ios

# 3. Open in Xcode
npx cap open ios

# Or, all-in-one:
npm run ios:run
```

---

## iOS Permission Strings Required

Based on features detected in the codebase:

| Permission | Info.plist Key | Reason |
|------------|---------------|--------|
| Camera | `NSCameraUsageDescription` | Photo/video upload in media tab |
| Photo Library | `NSPhotoLibraryUsageDescription` | Upload trip photos/media |
| Microphone | `NSMicrophoneUsageDescription` | Voice messages in chat (if applicable) |
| Push Notifications | (Entitlement) | Trip updates, chat messages, alerts |
| Location (When In Use) | `NSLocationWhenInUseUsageDescription` | Places tab, map features |

**Suggested permission strings:**

```xml
<key>NSCameraUsageDescription</key>
<string>Chravel needs camera access to take photos for your trip.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Chravel needs photo library access to share photos with your trip group.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Chravel needs microphone access for voice messages.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Chravel uses your location to show nearby places on the map.</string>
```

---

## Native Plugins Required

Already in `package.json`:

| Plugin | Purpose | Status |
|--------|---------|--------|
| `@capacitor/app` | App lifecycle, deep links | ✅ Installed |
| `@capacitor/filesystem` | File operations | ✅ Installed |
| `@capacitor/haptics` | Haptic feedback | ✅ Installed |
| `@capacitor/keyboard` | Keyboard management | ✅ Installed |
| `@capacitor/local-notifications` | Local notifications | ✅ Installed |
| `@capacitor/push-notifications` | Push notifications | ✅ Installed |
| `@capacitor/share` | Native share sheet | ✅ Installed |
| `@capacitor/splash-screen` | Splash screen | ✅ Installed |
| `@capacitor/status-bar` | Status bar styling | ✅ Installed |
| `@revenuecat/purchases-capacitor` | IAP subscriptions | ✅ Installed |

**Potentially needed (not yet installed):**

| Plugin | Purpose | Why |
|--------|---------|-----|
| `@capacitor/browser` | In-app browser | For `window.open` calls (Stripe checkout, external links) |
| `@capacitor/camera` | Native camera | Better than web-based file picker on iOS |

---

## Blockers to Resolve Before Submission

### 1. `window.location.href` for Navigation (ISSUE-0002)

Multiple components use `window.location.href = '/path'` instead of React Router.
In Capacitor, this causes a full page reload in the webview, losing all state.

**Files affected:**
- `src/components/ArchivedTripsSection.tsx`
- `src/components/AIConciergeChat.tsx`
- `src/components/TripCard.tsx`
- `src/components/CreateTripModal.tsx`
- `src/components/SmartTripDiscovery.tsx`
- `src/components/payments/PaymentsTab.tsx`
- `src/hooks/useAuth.tsx` (OAuth redirect — this one is OK)

**Fix:** Replace with `useNavigate()` from React Router.

### 2. `window.open` in Webview (ISSUE-0003)

`window.open('url', '_blank')` is blocked or unreliable in WKWebView.

**Files affected:**
- `src/billing/providers/stripe.ts`
- `src/hooks/useInviteLink.ts`
- `src/features/chat/components/MessageRenderer.tsx`
- `src/components/FilesTab.tsx`
- `src/components/MediaSubTabs.tsx`
- `src/components/SetBasecampSquare.tsx`

**Fix:** Use `@capacitor/browser` plugin with platform detection.

### 3. CSP Doesn't Include Capacitor Scheme (ISSUE-0007)

The Content-Security-Policy in `index.html` doesn't allow `capacitor://` or `ionic://` origins.
Capacitor serves the app from these schemes on iOS.

**Fix:** Add `capacitor: ionic:` to `default-src` and `script-src` in the CSP meta tag.

### 4. SPA Routing in Webview (ISSUE-0008)

BrowserRouter works in Capacitor, but deep links and cold-start to `/trip/:id` require
the Capacitor server to return `index.html` for all routes. This is the default behavior
with `webDir: 'dist'` but should be verified.

---

## Configuration Cleanup

### Remove Deprecated `bundledWebRuntime` (ISSUE-0010)

```diff
// capacitor.config.ts
  webDir: 'dist',
- bundledWebRuntime: false,
```

This property was removed in Capacitor 6+.

### Remove Duplicate Meta Tag (ISSUE-0009)

`index.html` has `<meta name="apple-mobile-web-app-capable" content="yes" />` twice (lines 31 and 55).

---

## Verdict

**Wrapping is feasible.** The Capacitor infrastructure is already in place with plugins installed.
After resolving the 3 Blockers and 2 Major issues listed above, the app can be built, synced, and submitted to the App Store.

Estimated effort for remaining fixes: incremental changes across ~10 files.
