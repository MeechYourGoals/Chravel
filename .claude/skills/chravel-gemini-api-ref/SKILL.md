---
name: chravel-gemini-api-ref
description: Gemini API reference for Chravel development. Current model specs, SDK usage, function calling patterns, and multimodal capabilities. Use when building with Gemini models, implementing function calling, using structured outputs, or needing current model specifications. Triggers on "gemini api", "gemini model", "google genai sdk", "gemini function calling", "gemini structured output".
user-invocable: false
---

# Gemini API Reference

## Current Models (as of March 2026)

- `gemini-3.1-pro-preview`: 1M tokens, complex reasoning, coding, research (replaces deprecated `gemini-3-pro-preview`)
- `gemini-3-flash-preview`: 1M tokens, fast, balanced performance, multimodal
- `gemini-3-pro-image-preview`: 65k / 32k tokens, image generation and editing
- `gemini-live-2.5-flash-native-audio`: GA voice model for Vertex AI Live API

> Models like `gemini-2.5-*`, `gemini-2.0-*`, `gemini-1.5-*` are legacy and deprecated.
> `gemini-3-pro-preview` deprecated March 9, 2026 — routes to `gemini-3.1-pro-preview`.

## Thought Signatures (thinkingConfig)

Gemini 3+ models use `thinkingLevel` in `generationConfig` (NOT `thinkingBudget` — that's Gemini 2.5):
```typescript
generationConfig: {
  thinkingConfig: { thinkingLevel: "medium" } // "low" | "medium" | "high"
}
```
- `medium` for flash (speed/quality balance), `high` for pro (max reasoning)
- Chravel concierge: controlled by `ENABLE_THINKING_CONFIG` env var (default ON)

## Streaming Function Call Arguments

For faster tool-use feedback during streaming:
```typescript
toolConfig: {
  functionCallingConfig: { streamFunctionCallArguments: true }
}
```
Function call arguments arrive incrementally instead of all-at-once.

## Combined Grounding

`googleSearch` and `functionDeclarations` CAN coexist as **separate tool objects**:
```typescript
tools: [
  { functionDeclarations: [...] },
  { googleSearch: {} },        // separate object — OK
  { googleMaps: {} },          // maps grounding (Gemini 2.5 only)
]
```
> Combining them in the SAME object causes 400 errors.
> Chravel: controlled by `ENABLE_COMBINED_GROUNDING` (default OFF) and `ENABLE_MAPS_GROUNDING` (default OFF).

## SDK

**JavaScript/TypeScript** (used in Chravel):
```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});
const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents: "Your prompt here"
});
console.log(response.text);
```

> Legacy SDK `@google/generative-ai` is deprecated. Use `@google/genai`.

## API Spec (source of truth)

- **v1beta** (default): `https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta`
- **v1**: `https://generativelanguage.googleapis.com/$discovery/rest?version=v1`

When in doubt, use v1beta. The official SDKs target v1beta.

## Documentation

Fetch docs index: `https://ai.google.dev/gemini-api/docs/llms.txt`

Key pages (append `.md.txt` to fetch):
- Models: `https://ai.google.dev/gemini-api/docs/models.md.txt`
- Function calling: `https://ai.google.dev/gemini-api/docs/function-calling.md.txt`
- Structured outputs: `https://ai.google.dev/gemini-api/docs/structured-output.md.txt`
- Text generation: `https://ai.google.dev/gemini-api/docs/text-generation.md.txt`
- Image understanding: `https://ai.google.dev/gemini-api/docs/image-understanding.md.txt`
- SDK migration: `https://ai.google.dev/gemini-api/docs/migrate.md.txt`

## Chravel Integration Points

- **AI Concierge**: Uses Gemini for trip planning, recommendations, tool calling
- **Smart Import**: Uses Gemini for parsing emails, PDFs, reservation data
- **Gemini Live**: Real-time voice interaction for trip coordination
- **Location**: `src/lib/geminiLive/`, `src/components/ai/`, `src/hooks/useAIConciergePreferences.ts`
