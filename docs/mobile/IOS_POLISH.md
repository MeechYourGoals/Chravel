# iOS Native Shell UX Polish (Capacitor)

This doc is a **checklist + reference** for the iOS “native shell polish” pass (safe areas, keyboard, status bar, splash/icon, overscroll).

## Scope

- **Safe areas**: headers/footers respect notch + home indicator.
- **Keyboard**: chat composer is never covered; scroll-to-bottom is smooth.
- **Status bar**: matches app theme (dark/light).
- **Splash + app icon**: document where final assets go (placeholders ok).
- **Overscroll**: disable iOS WebView “rubber band” / bounce weirdness if present.

## What changed (where to look)

- **Capacitor config**: `capacitor.config.ts`
  - Keyboard set to resize the body (`resize: "body"`)
  - StatusBar overlays webview (`overlaysWebView: true`)
- **Native shell runtime wiring**: `src/native/nativeShell.ts`
  - Theme-aware status bar styling
  - Global keyboard events → CSS variable `--keyboard-height` + app-wide `chravel:keyboard` event
- **Chat keyboard scroll polish**: `src/components/mobile/MobileTripChat.tsx`
  - On keyboard show: scroll the in-pane message scroller to bottom
- **iOS WebView overscroll**: `ios/App/App/AppDelegate.swift`
  - Disable WebView bounce
  - Force dark background behind the web content (avoid white flash)

## Screenshot checklist (before/after)

> Put screenshots in a PR comment or attach in a ticket. Placeholders are fine.

### Safe areas (notch + home indicator)

- **Trip detail (top header)**:
  - Before: header overlaps notch/Dynamic Island
  - After: header background extends under status bar; content starts below safe area
- **Chat composer (bottom)**:
  - Before: composer touches / overlaps home indicator
  - After: composer has bottom padding (home indicator safe area)
- **Bottom nav (if enabled)**:
  - Before: nav overlaps home indicator
  - After: nav clears home indicator with safe padding

### Keyboard (chat)

- **Open keyboard in chat** (tap message box):
  - Before: keyboard covers composer OR last message is hidden
  - After: composer stays visible; message list scrolls to bottom smoothly
- **Rotate while keyboard open** (optional, but great to verify):
  - After: no layout jump; composer remains visible

### Status bar

- **Dark theme**:
  - After: status bar text/icons are **light** (readable on dark background)
- **Light theme** (if/when supported by toggling `.light` on `<html>`):
  - After: status bar text/icons are **dark**

### Overscroll / bounce

- **Scroll past top/bottom** on a long list:
  - Before: rubber-band bounce shows odd background / “white flash”
  - After: bounce is disabled; background stays consistent

### Splash + icon sanity

- **Cold start**:
  - Before/After: no broken placeholder images; splash feels consistent
- **Home screen icon**:
  - Verify icon is present and not blurry

## Where final iOS assets go

### App Icon

- Xcode asset catalog:
  - `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
  - Update `Contents.json` + PNGs via Xcode or automation.

### Splash Screen

- Xcode asset catalog:
  - `ios/App/App/Assets.xcassets/Splash.imageset/`
- Storyboard:
  - `ios/App/App/Base.lproj/LaunchScreen.storyboard`

### Automation helpers (optional)

- App Store / marketing assets live under:
  - `appstore/metadata/` and `appstore/legal/`
- Icon/screenshot scripts:
  - `appstore/scripts/generate-icons.sh`
  - `appstore/scripts/capture-screenshots.sh`

## Manual test plan (quick)

- **Safe areas**: iPhone 15 Pro (Dynamic Island) + iPhone SE (no notch)
- **Keyboard**: chat composer open/close, send message, scroll to bottom, rotate device
- **Status bar**: verify readability on dark UI; toggle `.light` (if available) and verify inverse
- **Overscroll**: scroll lists at extremes; confirm no bounce/white flash

