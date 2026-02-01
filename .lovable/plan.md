
# End-to-End Encryption Integration + Marketing Update

## Summary

Integrate the existing `privacyService` (AES-GCM 256-bit E2EE) into the chat flow so that **High Privacy** trips actually encrypt/decrypt messages, and update the Greek Life marketing badge to accurately reflect current capabilities.

---

## Current State Analysis

### What Exists (Ready)

| Component | Status | Location |
|-----------|--------|----------|
| AES-GCM 256-bit encryption | ✅ Implemented | `src/services/privacyService.ts` |
| Per-trip key generation | ✅ Implemented | `privacyService.generateTripKey()` |
| Encrypt/decrypt methods | ✅ Implemented | `privacyService.encryptMessage()` / `decryptMessage()` |
| Database columns | ✅ Exist | `privacy_mode`, `privacy_encrypted` on `trip_chat_messages` |
| Privacy config table | ✅ Exists | `trip_privacy_configs` with auto-init trigger |
| Privacy config auto-init | ✅ Trigger exists | `initialize_trip_privacy_config()` |
| UI Privacy Settings | ✅ Exists | `TripPrivacySettings.tsx` |

### What's Missing (Integration Gap)

| Gap | Impact |
|-----|--------|
| Chat service doesn't call `privacyService` before insert | Messages stored as plaintext |
| Chat hooks don't decrypt on read | Encrypted messages would display as gibberish |
| No hook to fetch trip's privacy config | Can't determine if trip is High Privacy |
| Trip creation defaults to 'standard' | Pro/Event trips should default to 'high' |

---

## Implementation Plan

### Phase 1: Create Privacy Config Hook

**New File**: `src/hooks/useTripPrivacyConfig.ts`

Hook to fetch a trip's privacy configuration from `trip_privacy_configs` table:

```typescript
export const useTripPrivacyConfig = (tripId: string | undefined) => {
  return useQuery({
    queryKey: ['tripPrivacyConfig', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_privacy_configs')
        .select('*')
        .eq('trip_id', tripId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!tripId,
    staleTime: 60000, // Cache for 1 minute
  });
};
```

---

### Phase 2: Update Chat Service for Encryption

**File**: `src/services/chatService.ts`

Add encryption before database insert:

```typescript
import { privacyService } from './privacyService';

export async function sendChatMessage(msg: ChatMessageInsert) {
  let contentToSend = msg.content;
  let isEncrypted = false;
  
  // Encrypt if High Privacy mode
  if (msg.privacy_mode === 'high') {
    const result = await privacyService.prepareMessageForSending(
      msg.content,
      msg.trip_id,
      'high'
    );
    contentToSend = result.content;
    isEncrypted = result.encrypted;
  }
  
  const insertPayload = {
    ...msg,
    content: contentToSend,
    privacy_encrypted: isEncrypted,
    // ... rest of payload
  };
  
  // ... existing insert logic
}
```

---

### Phase 3: Update Chat Hook for Decryption

**File**: `src/features/chat/hooks/useTripChat.ts`

Add privacy config fetch and decrypt on message load:

```typescript
import { privacyService } from '@/services/privacyService';

// In useQuery for messages:
const decryptedMessages = await Promise.all(
  (data || []).map(async (msg) => {
    if (msg.privacy_encrypted && msg.content) {
      try {
        const decrypted = await privacyService.prepareMessageForDisplay(
          msg.content,
          tripId,
          true
        );
        return { ...msg, content: decrypted };
      } catch (error) {
        console.error('Decryption failed for message:', msg.id);
        return { ...msg, content: '[Unable to decrypt message]' };
      }
    }
    return msg;
  })
);
```

Also decrypt incoming realtime messages in the subscription handler.

---

### Phase 4: Pass Privacy Mode to Chat Operations

**File**: `src/features/chat/components/TripChat.tsx`

Fetch privacy config and pass to sendMessage:

```typescript
import { useTripPrivacyConfig } from '@/hooks/useTripPrivacyConfig';

// Inside TripChat component:
const { data: privacyConfig } = useTripPrivacyConfig(resolvedTripId);

// In handleSendMessage:
await sendTripMessage(
  message.text, 
  authorName, 
  undefined, 
  undefined, 
  user?.id, 
  privacyConfig?.privacy_mode || 'standard',  // Use actual privacy mode
  messageType
);
```

---

### Phase 5: Default Pro/Event Trips to High Privacy

**File**: `supabase/functions/create-trip/index.ts`

Update trip creation to set privacy_mode based on trip_type:

```typescript
// In create-trip edge function, before insert:
const privacyMode = (trip_type === 'pro' || trip_type === 'event') 
  ? 'high' 
  : 'standard';

// Include in trips insert or ensure trigger uses this default
```

The database trigger `initialize_trip_privacy_config` already reads from `NEW.privacy_mode`, but trips table doesn't have this column. We need to:
1. Either add `privacy_mode` column to trips table, OR
2. Update the trigger to default based on `trip_type`

**Option B (recommended)**: Modify the trigger to check `trip_type`:

```sql
-- Migration to update trigger
CREATE OR REPLACE FUNCTION public.initialize_trip_privacy_config()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.trip_privacy_configs (
    trip_id, 
    privacy_mode, 
    ai_access_enabled, 
    created_by
  ) VALUES (
    NEW.id,
    CASE WHEN NEW.trip_type IN ('pro', 'event') THEN 'high' ELSE 'standard' END,
    CASE WHEN NEW.trip_type IN ('pro', 'event') THEN false ELSE true END,
    NEW.created_by
  );
  RETURN NEW;
END;
$function$;
```

---

### Phase 6: Update Marketing Badge

**File**: `src/components/landing/sections/UseCasesSection.tsx`

Change the Greek Life card badge from:
```
'Event isolation · end-to-end encryption available'
```

To:
```
'Private trip vaults with access controls'
```

This is accurate for current state and doesn't require E2EE to be fully integrated.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useTripPrivacyConfig.ts` | **NEW** - Hook to fetch trip privacy config |
| `src/services/chatService.ts` | Add encryption call before insert |
| `src/features/chat/hooks/useTripChat.ts` | Add decryption on message fetch + realtime |
| `src/features/chat/components/TripChat.tsx` | Pass privacy mode from config |
| `src/components/landing/sections/UseCasesSection.tsx` | Update Greek Life badge text |
| Database Migration | Update `initialize_trip_privacy_config` trigger |

---

## Security Considerations

1. **Key Storage**: Keys are cached in-memory only (`privacyService.keyCache`). New page load = new keys generated. This is a limitation of client-side E2EE.

2. **Key Distribution**: Current implementation generates keys per-session. For true multi-device E2EE, we'd need secure key exchange (future enhancement).

3. **Graceful Degradation**: If decryption fails, show `[Unable to decrypt message]` rather than crash.

4. **AI Concierge**: When `privacy_mode === 'high'`, AI features are automatically disabled via `canAIAccessMessages()`.

---

## Test Scenarios

1. **Standard Privacy Trip**:
   - Messages sent/stored as plaintext
   - AI Concierge has access
   - `privacy_encrypted = false`

2. **High Privacy Trip**:
   - Messages encrypted before send
   - Stored as base64 ciphertext
   - Decrypted on display
   - AI Concierge disabled
   - `privacy_encrypted = true`

3. **Mixed Mode** (privacy changed mid-trip):
   - Old messages retain their encryption state
   - New messages use current privacy mode
   - Both display correctly

---

## Implementation Order

1. Create `useTripPrivacyConfig` hook
2. Update `chatService.ts` for encryption
3. Update `useTripChat.ts` for decryption
4. Update `TripChat.tsx` to pass privacy mode
5. Database migration for trigger update
6. Update marketing badge
7. Test end-to-end flow
