

# Plan: Fix Build Errors, Reduce TTS Latency, and Strip Leaked JSON/Markdown from Chat

## Problem Summary

Two user-facing issues plus build errors:

1. **Leaked JSON in chat**: The AI model wraps tool-plan JSON in markdown code fences (` ```json ... ``` `). The current `sanitizeConciergeContent` only strips raw JSON objects — it does not strip fenced code blocks containing tool-plan JSON. The screenshot shows ` ```json { "plan_version": "1.0", "actions": [...] } ``` ` rendered in the chat bubble.

2. **TTS initialization latency**: The current `useConciergeReadAloud` hook fetches the first sentence, waits for it to complete, then plays it. Pre-fetching is parallel but playback is sequential. The `getSession()` call adds ~100-200ms before any fetch starts.

3. **Build errors**: `useGoogleTTS.ts:256` references `splitIntoSentences` which doesn't exist in that file (it defines `splitIntoOptimalChunks`). Plus other pre-existing errors in unrelated files.

---

## Phase 1: Fix Build Errors

### 1a. `src/hooks/useGoogleTTS.ts` line 256
- Replace `splitIntoSentences` with `splitIntoOptimalChunks` (the function defined in this same file).

### 1b. Pre-existing errors (gmail, LineupImportModal, gmailAuth)
- These are pre-existing type errors unrelated to the current issues. Will note but not address in this plan unless requested.

---

## Phase 2: Sanitize Leaked JSON + Code Fences

**File: `src/lib/sanitizeConciergeContent.ts`**

Enhance the sanitizer to handle two additional leak patterns:

1. **Markdown code fences** containing tool-plan JSON: Strip ` ```json ... ``` ` blocks where the content parses as a tool-plan object. Also strip ` ``` ... ``` ` (no language tag) if it contains tool-plan JSON.

2. **Broader tool-plan key detection**: Add `"actions"` and `"type": "create_calendar_event"` / `"save_place"` as additional markers, since the screenshot shows these are the primary keys.

**Approach**:
- Before the existing brace-walking logic, add a regex pass that finds fenced code blocks (` ```json\n...\n``` ` or ` ```\n...\n``` `).
- For each fenced block, try to parse the inner content as JSON.
- If it's a tool-plan object, remove the entire fenced block (including the backtick markers).
- Then run the existing brace-walking sanitizer for any remaining unfenced tool-plan JSON.

Also add `'actions'` to `TOOL_PLAN_KEYS` to catch the pattern from the screenshot.

---

## Phase 3: Reduce TTS Latency

**File: `src/hooks/useConciergeReadAloud.ts`**

Three targeted optimizations:

1. **Cache the auth token**: Store `session.access_token` in a ref so repeated plays don't re-call `getSession()`. Refresh only when it's null or on auth change.

2. **Parallel pre-fetch with immediate playback**: Currently the first sentence is fetched, then playback starts, then remaining sentences are fetched in parallel. Instead:
   - Fire the first sentence fetch.
   - Simultaneously start pre-fetching sentence 2 (overlap with sentence 1 fetch).
   - Begin playback as soon as sentence 1 returns — while sentence 2+ are still fetching.
   - This shaves ~200-400ms off perceived latency.

3. **Shorter first chunk**: Modify `splitIntoSentences` to make the first chunk shorter (max ~80 chars / 1 sentence) so it returns faster from the TTS API. Subsequent chunks can be larger (2-3 sentences) since they pre-fetch during playback.

**File: `src/lib/buildSpeechText.ts`** (if exists)
- Ensure sanitized content is passed to TTS, not raw content with JSON.

---

## Phase 4: Sanitize During Streaming (Not Just Render)

**File: `src/components/AIConciergeChat.tsx`**

Currently, `sanitizeConciergeContent` runs at render time in `MessageRenderer`. During streaming, raw chunks accumulate and display before the final sanitized render. This is why users briefly see JSON.

Fix: Apply `sanitizeConciergeContent` to the accumulated content on each `onChunk` update, so the displayed content is always clean even mid-stream. This is cheap (fast-path exits immediately if no tool-plan keys found).

In the `onChunk` callback (~line 1042-1066):
- After `accumulatedStreamContent += text`, sanitize before setting into message state.

---

## Verification

- Build passes (fix `splitIntoSentences` reference).
- Chat messages never show raw JSON or fenced code blocks with tool plans.
- TTS playback starts ~300-500ms faster.
- No regression in place cards, hotel cards, or action results rendering.

