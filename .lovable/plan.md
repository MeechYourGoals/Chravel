## Revised Voice Button Architecture — Split Controls

### Current State

- **VoiceButton** (waveform) has full tap/hold dual-mode logic, but `AIConciergeChat` only passes `onConvoToggle` (wired to Gemini Live when `DUPLEX_VOICE_ENABLED=true`). `onConvoLongPress` and `isLiveActive` are never passed.
- `duplexFailed` state + 2 `useEffect`s create an auto-fallback mess from Live → dictation.
- Result: tap starts Gemini Live (wrong), long-press is a no-op (missing wire).

### New Architecture

```text
┌─────────────────────────────────────────────────────┐
│  chat-composer row                                  │
│                                                     │
│  [🔊 Waveform]  [  textarea input  [✨Live] ]  [→] │
│   dictation       text + Live btn inside     send   │
│   only            the input container               │
└─────────────────────────────────────────────────────┘
```

- **Waveform button** (left of input): dictation only. Simple tap toggle. No long-press logic.
- **Live button** (inside input, Left side): small subtle button with grayed out sparkle icon + "Live" label. Starts/stops Gemini Live.
- **Send button** (right of input): unchanged.

### Files to Change

**1. `src/features/chat/components/VoiceButton.tsx**`

- Remove all long-press logic (timer, refs, `handlePressStart`, `handlePressEnd`, `handlePressCancel`, `handleContextMenu`, `LONG_PRESS_MS`, `isTouchInteractionRef`)
- Remove `onLongPress` and `isLiveActive` props
- Remove emerald Gemini Live styling branch
- Simplify to a single `onClick` → `onToggle()` button
- Update tooltip to just "Tap to dictate" / "Stop listening"
- Keep blue dictation active state, pulse rings, error state

**2. `src/features/chat/components/AiChatInput.tsx**`

- Remove `onConvoLongPress` and `isLiveActive` props (and from VoiceButton usage)
- Add new `onLiveToggle` prop for Gemini Live
- Add `isLiveActive` prop (for Live button visual state)
- Add `isLiveEligible` prop (gate the Live button visibility)
- Inside the `relative flex-1` input container, add a small "Live" button positioned `absolute right-2 top-1/2 -translate-y-1/2` (shifted left if needed to not overlap textarea padding)
- Button design: small pill with `Sparkles` icon (14px) + "Live" text label, emerald gradient when active, subtle `bg-white/5 border-white/10` when idle
- Adjust textarea `pr-` padding to accommodate the Live button

**3. `src/components/AIConciergeChat.tsx**`

- `**handleConvoToggle**`: Simplify to always call `toggleDictation()`. If Gemini Live is active, stop it first. Remove all `duplexFailed` branching.
- **Add `handleLiveToggle**`: New callback that toggles Gemini Live. If dictation is active, stops it first. Checks plan limits. Calls `startLiveSession()` or `endLiveSession()`.
- **Remove**: `duplexFailed` state, both auto-fallback `useEffect`s (lines 586-607), `duplexFailed` from `handleEndLiveSession`
- **Simplify `convoVoiceState**`: Just return `dictationState` (no more live state mapping for the waveform button)
- **Simplify `isVoiceActive**`: Split into `isDictationActive` (for waveform) and `isLiveSessionActive` (for Live button/VoiceActiveBar)
- **Pass new props** to `AiChatInput`: `onLiveToggle={handleLiveToggle}`, `isLiveActive={liveState !== 'idle' && liveState !== 'error'}`, remove `onConvoLongPress`
- **VoiceActiveBar** guard: change from `isVoiceActive && !duplexFailed` to just checking live state directly
- **Remove** the dictation fallback bar JSX (lines 1919-1941) — dictation is now independent, controlled by its own button, no fallback bar needed

**4. `src/hooks/useLongPress.ts**` — No change needed (used elsewhere), but verify no other component imports it for voice.

### Dead Code Removed

- `LONG_PRESS_MS` constant in VoiceButton
- `pressTimerRef`, `didLongPressRef`, `pressStartRef`, `isTouchInteractionRef` refs in VoiceButton
- `handlePressStart`, `handlePressEnd`, `handlePressCancel`, `handleContextMenu` in VoiceButton
- `onLongPress` prop from VoiceButton and AiChatInput
- `duplexFailed` state + 2 `useEffect`s in AIConciergeChat
- `duplexFailed` branches in `handleConvoToggle` and `handleEndLiveSession`
- Dictation fallback bar JSX (~20 lines)
- `mapLiveStateToVoiceState` usage in `convoVoiceState` (waveform no longer shows live state)

### Live Button Design

- Idle: `bg-white/5 border border-white/10 text-white/50` — very subtle
- Active: `bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/20` — clear emerald glow
- Icon: `Sparkles` from lucide-react (14px) + "Live" text (text-[10px] font-medium)
- Size: `h-7 px-2 rounded-full` — compact pill inside input
- Position: absolute inside textarea container, vertically centered, right-aligned

### State Model

```text
idle ──tap waveform──▶ dictating ──tap waveform──▶ idle
  │                        │
  │                        │──tap Live──▶ (stop dictation) → live-active
  │                        
  └──tap Live──▶ live-active ──tap Live──▶ idle
                     │
                     └──tap waveform──▶ (stop live) → dictating
```

Mutually exclusive. Starting one stops the other. No auto-fallback.

### Regression Risks

- **Low**: VoiceButton simplification only removes code, keeps the working `onToggle` path
- **Low**: Live button is additive UI, no existing elements moved
- **Low**: `handleConvoToggle` becomes simpler (fewer branches = fewer bugs)
- **Watch**: Textarea right-padding needs to accommodate Live button without overlapping text