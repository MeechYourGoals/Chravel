

# Fix: AI Concierge Infinite Re-render Loop

## Root Cause

The Zustand store selector on line 174 of `AIConciergeChat.tsx` calls `s.getSession(tripId)`, which internally calls `createEmptySession(tripId)` when no session exists yet. This returns a **new object on every call**. Zustand compares selector results with `Object.is` -- a new object every time means the component re-renders endlessly, causing the "Maximum update depth exceeded" crash.

## Fix (2 changes, surgical)

### Change 1: `src/components/AIConciergeChat.tsx` (line 174)

Replace the selector that calls `getSession` (which creates new objects) with a direct property lookup that returns `undefined` (a stable primitive) when no session exists. Use a module-level constant as the fallback.

**Before:**
```ts
const storeSession = useConciergeSessionStore(s => s.getSession(tripId));
```

**After:**
```ts
const storeSessionRaw = useConciergeSessionStore(s => s.sessions[tripId]);
const storeSession = storeSessionRaw ?? EMPTY_SESSION;
```

Where `EMPTY_SESSION` is a **module-level constant** (defined once, never recreated):
```ts
const EMPTY_SESSION: ConciergeSession = {
  tripId: '',
  messages: [],
  voiceState: 'idle',
  lastError: null,
  lastErrorAt: null,
  lastSuccessAt: null,
  historyLoadedFromServer: false,
};
```

**Why this works**: When no session exists, the selector returns `undefined` (same reference every time) so Zustand does not trigger a re-render. The fallback is a stable constant.

### Change 2: Add the import for `ConciergeSession` type

Add `ConciergeSession` to the existing import from `@/store/conciergeSessionStore` so the constant can be properly typed.

## Files Changed

| File | Change | Risk |
|------|--------|------|
| `src/components/AIConciergeChat.tsx` | Add `EMPTY_SESSION` constant; change Zustand selector from `getSession()` to direct `sessions[tripId]` lookup | None -- pure selector change, no logic change |

## What is NOT changed

- `useWebSpeechVoice.ts` (dictation hook) -- no changes needed, works correctly
- `VoiceButton.tsx` -- no changes needed
- `ChatMessages.tsx` -- no changes needed
- `AiChatInput.tsx` -- no changes needed
- `ConciergeSearchModal` -- no changes needed
- Edge functions -- no changes needed
- Store itself (`conciergeSessionStore.ts`) -- `getSession` method is kept for non-React callers; just not used in the selector

## Verification

After the fix:
- Concierge tab loads without crash
- Text input + send works
- Dictation mic button works (tap to listen, tap to stop, transcript populates input)
- Search button opens command palette
- Image upload button opens file picker
- Chat history loads from server
- Map cards and grounding sources render in responses
- No console errors or warnings about maximum update depth

