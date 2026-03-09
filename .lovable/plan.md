

## Fix: Duplicate `isVoiceActive` declaration

**Root cause:** `isVoiceActive` is declared at both line 447 and line 613 in `AIConciergeChat.tsx`. This causes the TS2451 "Cannot redeclare block-scoped variable" build error, which breaks the preview.

**Fix:** Remove the duplicate at line 613. The definition at line 447 is the correct one — it handles both Gemini Live and dictation fallback states. Line 613 is a leftover from the overlay-to-inline-bar refactor.

**Single edit in `src/components/AIConciergeChat.tsx`:**
- Delete lines 612–613 (the comment + second `const isVoiceActive = ...`)

This resolves all 4 build errors (TS2451 x2, TS2448 x2) and restores the preview.

