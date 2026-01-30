

# Optimize Message Context: "50 Messages OR 72 Hours" Strategy

## Overview

Revert the message limit from 15 back to 50, and implement a "whichever is MORE" strategy that ensures users get sufficient context without risking AI degradation from unbounded message counts.

---

## Strategy: UNION of Time + Count

Instead of the current approach (15 messages AND 72 hours), we'll use:

**"50 most recent messages OR all messages from last 72 hours - whichever gives MORE context"**

This ensures:
- **Quiet trips**: Get full 72-hour history even if only 5 messages
- **Active trips**: Get at least 50 most recent messages even if they're only hours old
- **Bounded**: Never exceeds ~100 messages (safeguard against token overflow)

---

## File to Modify

| File | Changes |
|------|---------|
| `supabase/functions/_shared/contextBuilder.ts` | Update `fetchMessages()` with hybrid strategy |

---

## Implementation

**File:** `supabase/functions/_shared/contextBuilder.ts`

Update `fetchMessages` (lines 256-282):

```typescript
// Optimized: Get "50 messages OR 72 hours" - whichever provides MORE context
private static async fetchMessages(supabase: any, tripId: string) {
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    // Strategy: Fetch last 50 messages, then extend if they're all within 72h
    const { data, error } = await supabase
      .from('trip_chat_messages')
      .select('id, content, author_name, created_at, message_type')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .limit(50); // Base: last 50 messages

    if (error) throw error;
    
    let messages = data || [];
    
    // If we got 50 messages and the oldest is within 72h, 
    // there might be more recent messages - fetch by time instead
    if (messages.length === 50) {
      const oldestTimestamp = new Date(messages[messages.length - 1]?.created_at);
      
      if (oldestTimestamp > threeDaysAgo) {
        // All 50 messages are within 72h - fetch ALL from 72h (capped at 100)
        const { data: timeData } = await supabase
          .from('trip_chat_messages')
          .select('id, content, author_name, created_at, message_type')
          .eq('trip_id', tripId)
          .gte('created_at', threeDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(100); // Safety cap to prevent token overflow
        
        if (timeData && timeData.length > messages.length) {
          messages = timeData;
          console.log(`[Context] Extended to ${messages.length} messages (72h window)`);
        }
      }
    }

    console.log(`[Context] Fetched ${messages.length} messages for AI context`);

    return messages.map((m: any) => ({
      id: m.id,
      content: m.content,
      authorName: m.author_name,
      timestamp: m.created_at,
      type: m.message_type === 'broadcast' ? 'broadcast' : 'message'
    })).reverse();
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}
```

---

## Latency Considerations

| Context Size | Estimated Extra Tokens | Latency Impact |
|--------------|------------------------|----------------|
| 15 messages | ~500 tokens | Baseline |
| 50 messages | ~1,500 tokens | +200-300ms |
| 100 messages | ~3,000 tokens | +400-600ms |

The 100-message safety cap keeps worst-case latency under 3 seconds for AI response.

---

## Summary

| Before | After |
|--------|-------|
| 15 messages AND 72 hours | 50 messages OR 72 hours (max 100) |
| Could miss recent context | Always gets sufficient context |
| Fixed 15 message cap | Adaptive: 50-100 based on activity |

---

## Verification

After deployment:
- [ ] Check edge function logs for message count: `[Context] Fetched X messages`
- [ ] Test on quiet trip (< 50 messages in 72h) → Should get all messages
- [ ] Test on active trip (> 50 messages in 72h) → Should cap at 100
- [ ] Verify AI response latency stays under 4 seconds

