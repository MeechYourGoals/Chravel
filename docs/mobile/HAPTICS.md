# Haptics (Native-only)

Chravel uses the Capacitor Haptics plugin for **native iOS/Android haptic feedback**. Haptics are **hard-gated** behind native detection and **never run on web**.

## Wrapper API

Use `src/native/haptics.ts`:

- `light()` — small, frequent interactions (e.g., message send)
- `medium()` — “commit” interactions (e.g., poll vote submit)
- `heavy()` — rare, high-importance interactions
- `success()` — successful completion (e.g., poll finalized, task complete, payment marked paid)
- `warning()` — cautionary feedback
- `error()` — error states (wired to destructive toasts)

## UX Mapping (Current)

- **Message send**: `light()`
- **Poll vote submit**: `medium()`
- **Poll lock/finalize**: `success()`
- **Task complete**: `success()`
- **Payment marked paid**: `success()`
- **Error states**: `error()` (triggered for destructive `useToast()` toasts)

