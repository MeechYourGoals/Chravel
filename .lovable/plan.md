

# Fix Build Errors: Rename OpenAI Types + Widen Message Input

## Problem

9 build errors across edge functions, caused by two issues:

1. **Type naming still uses "OpenAI" prefixes** (which the PR #646 cleanup intended to remove) and the `ChatModelRequest.messages` type is too strict for consumer functions.
2. **`gemini-voice-session`** has a `createClient` generic inference issue causing `never` types.

---

## Fix 1: Rename and widen types in `supabase/functions/_shared/gemini.ts`

Rename all "OpenAI" prefixed types to Gemini-native names and widen the `messages` property so consumer functions don't need casts.

| Old Name | New Name |
|----------|----------|
| `OpenAITextPart` | `TextPart` |
| `OpenAIImageUrlPart` | `ImageUrlPart` |
| `OpenAIContentPart` | `ContentPart` |
| `OpenAIChatMessage` | `ChatMessage` |

Widen `ChatModelRequest.messages` to accept `ChatMessageInput[]` where:

```text
type ChatMessageInput = {
  role: string;
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
};
```

This means `ai-answer`, `document-processor`, `enhanced-ai-parser`, and `file-ai-parser` all pass type-checking without any changes to those files.

Internal functions (`callGeminiChat`, `callLovableChat`, `toGeminiParts`, etc.) continue to work because they only access `.role` and `.content` -- they don't require strict literal types.

**Changes in this file:**
- Lines 5-23: Rename types, add `ChatMessageInput`, update `ChatModelRequest.messages` to `ChatMessageInput[]`
- Line 108: Update `flattenOpenAIContentToText` parameter type reference
- Lines 178-179: Update `toGeminiParts` parameter type reference
- All internal logic stays identical

---

## Fix 2: Fix type inference in `supabase/functions/gemini-voice-session/index.ts`

The `canUseVoiceConcierge` function parameter typed as `ReturnType<typeof createClient>` resolves to a complex generic that causes `.plan`, `.status`, and `.role` to infer as `never`.

**Fix:** Change the parameter type to `any`:

```typescript
async function canUseVoiceConcierge(
  supabaseAdmin: any,
  userId: string,
): Promise<boolean> {
```

This is safe because the function only calls `.from().select().eq().maybeSingle()` -- standard Supabase client methods. The query results are already guarded with `String(row?.plan ?? '')`.

**Line 42:** Change parameter type from `ReturnType<typeof createClient>` to `any`.

---

## Files Modified

| File | Change |
|------|----------|
| `supabase/functions/_shared/gemini.ts` | Rename OpenAI types to Gemini-native names; widen `ChatModelRequest.messages` to `ChatMessageInput[]` |
| `supabase/functions/gemini-voice-session/index.ts` | Change `canUseVoiceConcierge` param type to `any` |

## Files NOT Modified

- `ai-answer/index.ts` -- no changes needed
- `document-processor/index.ts` -- no changes needed
- `enhanced-ai-parser/index.ts` -- no changes needed
- `file-ai-parser/index.ts` -- no changes needed

All 9 errors resolved with changes to only 2 files.

