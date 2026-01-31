# ISSUE-0004: 100vh CSS Units Broken on Mobile Safari

**Severity:** Major
**Area:** PWA / Mobile
**Status:** Open

## Description

`100vh` on mobile Safari includes the area behind the URL bar, causing elements to extend off-screen. When the keyboard opens, `100vh` doesn't account for keyboard height.

## Affected Files

- `src/index.css:96,103` — `min-height: 100vh` on `#root` / `.app-container`
- `src/index.css:435` — `height: calc(100vh - var(--keyboard-height, 0px))`
- `src/index.css:872` — `height: calc(100vh - 320px)`
- Various component classes using `100vh` in Tailwind

## Fix Plan

Replace `100vh` with `100dvh` (dynamic viewport height) with fallback:

```css
min-height: 100vh; /* fallback */
min-height: 100dvh;
```

## Verification

- Open on iPhone Safari → content fits within visible viewport
- Open keyboard → content adjusts correctly
