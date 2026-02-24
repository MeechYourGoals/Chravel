# Fix: Dictation Repeating Text, No Auto-Send, and Message Deletion

## Three Issues

### Issue 1: Dictation repeats words endlessly (critical)

**Root cause**: The `onresult` handler in `useWebSpeechVoice.ts` iterates over ALL `event.results` from index 0 on every callback. When `continuous = true` (non-iOS), the browser's `results` array grows cumulatively -- but the code re-reads every result from the start, appending already-accumulated text. This causes "this is great start but I also need" to repeat hundreds of times.

**Fix**: Track the last processed result index via a ref (`resultIndexRef`). On each `onresult`, only process results from the last-seen index forward.

### Issue 2: Dictation auto-sends instead of populating the text field

**Root cause**: In `AIConciergeChat.tsx` lines 226-237, `handleDictationResult` calls `setInputMessage(text)` then immediately fires `handleSendMessageRef.current(text)` via `queueMicrotask`. The user confirmed they want insert-only behavior.

**Fix**: Change `handleDictationResult` to only call `setInputMessage(text)` -- remove the `queueMicrotask` auto-send. The user can then review, edit, and press Send manually.

### Issue 3: Users cannot delete concierge messages (privacy)

**Root cause**: No delete functionality exists. The `ai_queries` table has no DELETE RLS policy. The `ChatMessages` and `MessageRenderer` components have no delete buttons.

**Fix**: 

- Add a DELETE RLS policy on `ai_queries` so users can delete their own rows
- Add swipe-to-delete or long-press-to-delete on individual message bubbles in the concierge chat
- When a user message is deleted, it still counts toward their plans query allotment so they can't cheat the system
- When an AI response is deleted, it should no longer show up in concierge search results
- Both types of deletion also remove the message from local state and the Zustand store

---

## File-by-File Changes

### A) Fix dictation repeating (`src/hooks/useWebSpeechVoice.ts`)

1. Add `resultIndexRef = useRef(0)` to track the last-processed result index
2. Reset it to 0 in `startVoice` alongside other refs
3. In `recognition.onresult`, only iterate from `resultIndexRef.current` to `event.results.length`:

```text
Before (broken):
  for (let i = 0; i < event.results.length; i++) {
    if (result.isFinal) finalText += ...
    else interimText += ...
  }
  accumulatedTranscriptRef.current = prev + separator + finalText;

After (fixed):
  for (let i = resultIndexRef.current; i < event.results.length; i++) {
    if (event.results[i].isFinal) {
      finalText += event.results[i][0].transcript;
      resultIndexRef.current = i + 1;  // advance past this final result
    } else {
      interimText += event.results[i][0].transcript;
    }
  }
  // Only append NEW final text
  if (finalText) {
    accumulatedTranscriptRef.current += separator + finalText;
  }
```

This ensures each result segment is only processed once, eliminating the repetition.

### B) Remove auto-send (`src/components/AIConciergeChat.tsx`)

Change `handleDictationResult` (lines 226-237) to only populate the input field:

```typescript
const handleDictationResult = useCallback(
  (text: string) => {
    if (!text.trim()) return;
    // Insert text into input field only -- user reviews and sends manually
    setInputMessage(prev => prev ? prev + ' ' + text : text);
  },
  [],
);
```

Key changes:

- Remove the `queueMicrotask` that calls `handleSendMessageRef.current`
- Use functional update to append (in case user dictates multiple segments)

### C) Add message deletion UI (`src/features/chat/components/ChatMessages.tsx`)

Add an optional `onDeleteMessage` prop. When provided, render a delete button on each message bubble (shown on long-press for mobile, hover for desktop):

```typescript
interface ChatMessagesProps {
  messages: (ChatMessage | ChatMessageWithGrounding)[];
  isTyping: boolean;
  showMapWidgets?: boolean;
  onDeleteMessage?: (messageId: string) => void;  // NEW
}
```

Each message `<div>` gets a small trash icon that appears on hover/focus, calling `onDeleteMessage(message.id)`.

### D) Add message deletion UI to MessageRenderer (`src/features/chat/components/MessageRenderer.tsx`)

Add `onDelete?: (id: string) => void` prop. Show a small Trash2 icon button in the top-right corner of each message bubble on hover, with a confirmation tap on mobile.

### E) Wire deletion in AIConciergeChat (`src/components/AIConciergeChat.tsx`)

Add a `handleDeleteMessage` function that:

1. Removes the message from local `messages` state
2. If the message ID starts with `history-user-` or `history-assistant-`, extract the `ai_queries` row ID and:
  - For user messages: delete the entire `ai_queries` row (since the question is being removed)
  - For assistant messages: update the row to set `response_text = null`
3. For non-history (current-session) messages, just remove from local state

```typescript
const handleDeleteMessage = useCallback(async (messageId: string) => {
  // Remove from local state immediately
  setMessages(prev => prev.filter(m => m.id !== messageId));
  
  // If it's a persisted history message, also delete from DB
  const historyMatch = messageId.match(/^history-(user|assistant)-([^-]+)-/);
  if (historyMatch && user?.id) {
    const [, role, rowId] = historyMatch;
    if (role === 'user') {
      // Delete the entire row (removes both Q and A)
      await supabase.from('ai_queries').delete().eq('id', rowId).eq('user_id', user.id);
      // Also remove the paired assistant message
      const pairedId = messageId.replace('history-user-', 'history-assistant-');
      setMessages(prev => prev.filter(m => m.id !== pairedId));
    } else {
      // Just null out the response
      await supabase.from('ai_queries').update({ response_text: null }).eq('id', rowId).eq('user_id', user.id);
    }
  }
}, [user?.id]);
```

Pass it to `ChatMessages`:

```tsx
<ChatMessages
  messages={messages}
  isTyping={isTyping}
  showMapWidgets={true}
  onDeleteMessage={handleDeleteMessage}
/>
```

### F) Add DELETE RLS policy (new migration)

Create `supabase/migrations/20260224_add_ai_queries_delete_policy.sql`:

```sql
CREATE POLICY "Users can delete their own AI queries"
  ON ai_queries
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI queries"
  ON ai_queries
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Files Changed Summary


| File                                                            | Change                                                            | Priority |
| --------------------------------------------------------------- | ----------------------------------------------------------------- | -------- |
| `src/hooks/useWebSpeechVoice.ts`                                | Fix result index tracking to prevent repeated text                | Critical |
| `src/components/AIConciergeChat.tsx`                            | Remove auto-send; add `handleDeleteMessage`; pass to ChatMessages | Critical |
| `src/features/chat/components/ChatMessages.tsx`                 | Add `onDeleteMessage` prop, render delete button per message      | High     |
| `src/features/chat/components/MessageRenderer.tsx`              | Add `onDelete` prop, show trash icon on hover/long-press          | High     |
| `supabase/migrations/20260224_add_ai_queries_delete_policy.sql` | DELETE + UPDATE RLS policies for `ai_queries`                     | High     |


## What is NOT changed

- `VoiceButton.tsx` -- no changes needed
- `AiChatInput.tsx` -- no changes needed
- `universalSearchService.ts` -- no changes needed
- `conciergeGateway.ts` -- no changes needed
- Edge functions -- no changes needed
- Zustand store -- messages sync automatically via existing effect

## Regression Checklist

- Dictation produces clean, non-repeating text
- Transcribed text appears in input field without auto-sending
- User can edit text before pressing Send
- Trash icon appears on hover/long-press for each message bubble
- Deleting a user message removes it from UI and DB
- Deleting an AI response removes it from UI and nulls `response_text` in DB
- Map cards, grounding sources, and tool results still render
- Search still finds concierge conversations
- No console errors