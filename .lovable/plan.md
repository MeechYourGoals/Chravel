

# Fix Voice Concierge: Response Pipeline, Debug Leak, Restrictions

## Issues Identified

1. **Mic emoji prefix**: `handleVoiceUserMessage` in `AIConciergeChat.tsx` line 103 adds `🎤 ` before every voice message
2. **Debug panel leaking to production**: The debug info block (lines 668-694) is gated by `import.meta.env.DEV`, but in the Lovable preview environment this evaluates to `true` -- exposing internal model/auth/ws diagnostics to users
3. **Voice queries never respond**: The `useWebSpeechVoice` hook calls `gemini-chat` with `{ message, analysisType: 'chat' }` and NO trip context. `gemini-chat` then calls `lovable-concierge` internally (double edge function hop). But because `gemini-chat` invokes `lovable-concierge` using `supabase.functions.invoke()` with the anon key (not the user's auth token), the auth check in `lovable-concierge` likely fails or the request gets stuck
4. **Travel-only restriction**: System prompts in `lovable-concierge`, `gemini-chat`, and `ai-answer` all restrict answers to travel topics and decline sports/coding/etc. User wants fully unrestricted AI
5. **Placeholder text**: "Ask me anything about travel..." in `AiChatInput.tsx` reinforces the travel restriction
6. **Empty state text**: "Ask me anything about travel:" in `AIConciergeChat.tsx` also needs updating

## Technical Plan

### File 1: `src/components/AIConciergeChat.tsx`

**A. Remove mic emoji prefix** (line 103):
- Change `🎤 ${text}` to just `text`

**B. Remove debug panel entirely** (lines 668-694):
- Delete the `import.meta.env.DEV && (...)` block showing model, ws, auth, gate, entitlements

**C. Remove streaming voice transcript emoji** (line 766):
- Change `🔊 ${assistantTranscript}` to just `assistantTranscript`

**D. Update empty state text** (lines 739-741):
- Change "Ask me anything about travel:" to "Ask me anything:"
- Update example prompts to include non-travel examples

### File 2: `src/hooks/useWebSpeechVoice.ts`

**A. Route voice queries directly to `lovable-concierge` instead of `gemini-chat`**:
- Change `supabase.functions.invoke('gemini-chat', ...)` to `supabase.functions.invoke('lovable-concierge', ...)`
- This eliminates the double-hop and ensures proper auth token forwarding (supabase SDK automatically includes the user's JWT)

**B. Add a 15-second timeout** so the processing state never hangs forever

### File 3: `src/features/chat/components/AiChatInput.tsx`

**A. Update placeholder** (line 87):
- Change "Ask me anything about travel..." to "Ask me anything..."

### File 4: `supabase/functions/lovable-concierge/index.ts`

**A. Remove travel-only restriction from system prompt** (line 748):
- Remove the "ONLY decline questions with ZERO connection to travel" policy
- Replace with: "Answer any question the user asks. You are a versatile AI assistant with special expertise in travel and trip planning. Use trip context when relevant, but answer all topics freely."

### File 5: `supabase/functions/gemini-chat/index.ts`

**A. Remove travel-only restriction** (line 134):
- Update the base prompt to remove "only decline questions with zero travel connection" language

### File 6: `supabase/functions/ai-answer/index.ts`

**A. Remove travel-only restriction** (lines 86-88):
- Update to match the unrestricted policy

## Impact

- Voice queries will go directly to `lovable-concierge` with proper auth, eliminating the double-hop that causes hangs
- No debug internals shown to users
- No corny mic emoji on dictated messages
- Users can ask the concierge anything -- sports scores, general questions, whatever they want
- 15-second timeout ensures the UI never gets stuck on "Processing" indefinitely

