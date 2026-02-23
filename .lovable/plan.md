

# Concierge: Mic Restoration, Search Implementation, and Layout Fixes

## Root Cause Report: Mic Button Missing

**Cause: Feature flag `VITE_VOICE_LIVE_ENABLED` defaults to `false`**

- File: `src/config/voiceFeatureFlags.ts` line 31
- The flag defaults to `'false'` and is not set in `.env`
- In `AIConciergeChat.tsx` line 1273-1275, mic-related props are gated:
  ```
  voiceState={VOICE_LIVE_ENABLED ? effectiveVoiceState : 'idle'}
  isVoiceEligible={VOICE_LIVE_ENABLED && voiceSupported && !circuitBreakerOpen}
  onVoiceToggle={VOICE_LIVE_ENABLED ? handleVoiceToggle : undefined}
  ```
- In `AiChatInput.tsx` line 159: `{onVoiceToggle && (<VoiceButton .../>)}` -- when `onVoiceToggle` is `undefined`, VoiceButton is never rendered
- The search icon in the header (line 1097-1099) is purely decorative -- it's a static icon inside a `div`, with no click handler

**Hypotheses tested:**
- CSS hidden/opacity: No -- component isn't mounted at all
- Route mismatch: No -- AIConciergeChat renders fine
- Provider missing: No -- useGeminiLive is imported and initialized
- Feature flag: YES -- `VOICE_LIVE_ENABLED` is `false`, blocking all voice UI

---

## Implementation Plan

### 1. Enable Voice Feature Flag

Add `VITE_VOICE_LIVE_ENABLED=true` to the project's `.env` file. This single change restores the mic button, since all voice wiring (useGeminiLive, VoiceButton, audio capture, playback, barge-in) is already fully implemented.

**File:** `.env` -- add `VITE_VOICE_LIVE_ENABLED=true`

### 2. Header Layout Redesign

Current header (line 1095-1107) is a flat row with decorative search icon, query allowance text, "AI Concierge" title, and lock emoji privacy label.

**New layout:**
```
[Search btn]  [query allowance]  AI Concierge  Private Convo  [Mic btn]
```

Changes to `AIConciergeChat.tsx` header section:
- Replace the static search icon `div` with a clickable button that opens a search modal
- Remove the lock emoji from "Private Convo"
- Add a secondary mic button in the header (top-right) for quick access, keeping the existing bottom-left mic in `AiChatInput` as-is
- Style Search and Mic header buttons with the same emerald-to-cyan gradient (`from-emerald-600 to-cyan-600`) to match Send button

### 3. Search Button: Concierge Command Palette

Create a new `ConciergeSearchModal` component that opens on Search button click.

**Phase 1 (this PR):**
- Search within concierge chat history (local `messages` state)
- Debounced text input (300ms)
- Results grouped: "Concierge Messages" section
- Each result shows a snippet, clicking scrolls to that message
- Stubbed "Search across trip" toggle (disabled, wired but not functional)

**Phase 2 (future):**
- Wire the toggle to call `useUniversalSearch` (already exists at `src/hooks/useUniversalSearch.ts`)
- Groups: Places, Calendar, Tasks, Polls, Payments, Media
- Action buttons per result: Open, Pin, Share to chat, Create task

**New files:**
- `src/components/ai/ConciergeSearchModal.tsx` -- modal component with search input, local message filtering, result list

**Modified files:**
- `src/components/AIConciergeChat.tsx` -- add state for search modal open/close, pass `messages` to modal, wire search button click

### 4. Button Styling Consistency

Ensure Search, Upload (ImagePlus), Send, and Mic all share the same bluish-green/teal style:

| Button | Current | New |
|--------|---------|-----|
| Search (header) | Static decorative icon | `bg-gradient-to-r from-emerald-600 to-cyan-600` clickable button |
| Mic (header) | N/A | Same gradient, `size-9` |
| Mic (bottom) | Already correct gradient | No change |
| Upload (bottom) | `bg-white/5 border-white/10` | `bg-gradient-to-r from-emerald-600 to-cyan-600` |
| Send (bottom) | Already correct gradient | No change |

**Files modified:**
- `src/features/chat/components/AiChatInput.tsx` -- update ImagePlus button className

### 5. Remove Lock Emoji from "Private Convo"

In `AIConciergeChat.tsx` line 1104-1106, change from:
```
🔒 Private Convo
```
to:
```
Private Convo
```

---

## Concierge Component Audit (Scoring 1-100)

| Component | Score | Status | Risk | Fix |
|-----------|-------|--------|------|-----|
| UI entry (AIConciergeChat.tsx) | 85 | Working | Low | Header layout needs rework |
| Chat message list + persistence | 90 | Working | Low | History hydration + cache working |
| Voice UI controls (VoiceButton) | 95 | Working (hidden by flag) | Low | Enable flag |
| Audio capture (audioCapture.ts) | 90 | Working | Low | Tested pipeline |
| Streaming client (useGeminiLive) | 85 | Working | Med | 15s timeouts in place |
| Playback + barge-in (audioPlayback.ts) | 90 | Working | Low | Flush/stop implemented |
| State management (conciergeSessionStore) | 85 | Working | Low | Zustand store synced |
| Provider (Gemini + Lovable fallback) | 80 | Working | Med | Fallback on any Gemini error |
| Error boundary / toasts | 80 | Working | Low | Toast on voice errors |
| Feature flags (voiceFeatureFlags.ts) | 70 | Root cause | High | Flag defaults to false |
| Styling + responsive | 80 | Working | Med | Button inconsistency |
| Search button | 10 | Not wired | High | No handler, purely decorative |

---

## QA Checklist

**Mic button:**
- [ ] Mic button visible in bottom-left of input area
- [ ] Mic button visible in header top-right
- [ ] Tap mic -- permission prompt appears
- [ ] Deny mic -- error toast shown
- [ ] Allow mic -- state changes to "listening", pulse animation
- [ ] Speak -- userTranscript appears as draft message
- [ ] AI responds -- assistantTranscript streams, audio plays
- [ ] Tap during speaking -- barge-in interrupts playback
- [ ] 3 failures -- circuit breaker bar appears
- [ ] "Try voice again" -- circuit resets

**Search:**
- [ ] Click search icon -- modal opens
- [ ] Type query -- results filter from chat history
- [ ] Click result -- modal closes, message scrolled to
- [ ] "Search across trip" toggle visible but disabled

**Styling:**
- [ ] Search, Upload, Send, Mic buttons all share emerald-to-cyan gradient
- [ ] "Private Convo" has no lock emoji
- [ ] Layout: Search (left), title (center), Private Convo + Mic (right)

**No regressions:**
- [ ] Text chat still works (send message, get streaming response)
- [ ] History loads from server
- [ ] Image attach still works
- [ ] Offline fallback still works

---

## Technical Summary of Changes

| # | File | Change |
|---|------|--------|
| 1 | `.env` | Add `VITE_VOICE_LIVE_ENABLED=true` |
| 2 | `src/components/AIConciergeChat.tsx` | Rework header layout: clickable search button, remove lock emoji, add header mic button, wire search modal state |
| 3 | `src/components/ai/ConciergeSearchModal.tsx` | New: search modal for concierge chat history with debounced filtering |
| 4 | `src/features/chat/components/AiChatInput.tsx` | Update Upload button to emerald-cyan gradient |

