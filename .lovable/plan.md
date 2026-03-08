

## Problem

The concierge buttons (Search, Upload, Send, Waveform) all import from `src/lib/ctaButtonStyles.ts`, which still defines the old gold-filled gradient:

```
CTA_GRADIENT = 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/25'
```

This is the **single source of truth** for all four buttons. Updating this one file + VoiceButton's idle state will fix them all.

## Changes

### 1. `src/lib/ctaButtonStyles.ts` — Replace gold fill with ring treatment

The idle state for all app CTA buttons should be:
- **Dark charcoal background** (`bg-gray-800/80`)
- **White text/icons** (`text-white`)
- **Gold border** (`border border-gold-primary/60`)
- **Subtle gold glow shadow** (`shadow-[0_0_8px_rgba(196,151,70,0.15)]`)

Update `CTA_GRADIENT` to the ring treatment. Update `CTA_INTERACTIVE` to remove amber focus rings, use gold-primary. Update `CTA_BUTTON` to include the border.

### 2. `src/features/chat/components/VoiceButton.tsx` — Update idle state

Line 48 returns `CTA_GRADIENT` for idle — this will automatically pick up the new token. But the Lock icon on line 97 uses `text-amber-400/90` — change to `text-gold-primary/90`.

### 3. `src/features/chat/components/AiChatInput.tsx` — Send button

Line 166 manually composes `CTA_GRADIENT + CTA_INTERACTIVE + CTA_DISABLED`. After the token update, this will automatically use the new ring treatment.

### 4. `src/components/AIConciergeChat.tsx` — Search + Upload buttons

Lines 1763 and 1779 use `CTA_BUTTON` — will automatically update from the token change.

**Net: 2 files to edit (`ctaButtonStyles.ts`, `VoiceButton.tsx`). All consumers auto-inherit.**

