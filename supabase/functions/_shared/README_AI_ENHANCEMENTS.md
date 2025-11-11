# AI Enhancement Utilities

## Quick Reference

### Smart Model Selection

```typescript
import { analyzeQueryComplexity } from '../_shared/aiUtils.ts';

const complexity = analyzeQueryComplexity(message, chatHistory.length, contextSize);
// Returns: { score: 0.0-1.0, factors: {...}, recommendedModel: 'flash' | 'pro' }
```

### Content Filtering

```typescript
import { filterProfanity } from '../_shared/aiUtils.ts';

const check = filterProfanity(userMessage);
if (!check.isClean) {
  console.warn('Profanity detected:', check.violations);
}
```

### PII Redaction

```typescript
import { redactPII } from '../_shared/aiUtils.ts';

const redacted = redactPII(message, {
  redactEmails: true,
  redactPhones: true,
  redactCreditCards: true
});
// Use redacted.redactedText for logging/storage
```

### Enhanced Prompts

```typescript
import { buildEnhancedSystemPrompt, requiresChainOfThought } from '../_shared/aiUtils.ts';

const useCoT = requiresChainOfThought(query, complexity);
const enhancedPrompt = buildEnhancedSystemPrompt(
  basePrompt,
  useCoT,      // Include chain-of-thought reasoning
  true         // Include few-shot examples
);
```

### Quality Testing

```typescript
import { testResponseQuality } from '../_shared/aiQualityTests.ts';

const result = testResponseQuality(query, response, { tripContext });
if (!result.passed) {
  console.warn('Quality issues:', result.issues);
  console.log('Metrics:', result.metrics);
}
```

## Integration Example

```typescript
// 1. Analyze complexity
const complexity = analyzeQueryComplexity(message, chatHistory.length, contextSize);

// 2. Filter content
const profanityCheck = filterProfanity(message);
const piiRedaction = redactPII(message);

// 3. Select model
const model = complexity.recommendedModel === 'pro' 
  ? 'google/gemini-2.5-pro' 
  : 'google/gemini-2.5-flash';

// 4. Build enhanced prompt
const useCoT = requiresChainOfThought(message, complexity);
const systemPrompt = buildEnhancedSystemPrompt(basePrompt, useCoT, true);

// 5. Make API call
const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  body: JSON.stringify({
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...chatHistory, { role: 'user', content: message }],
    temperature: complexity.score > 0.5 ? 0.5 : 0.7
  })
});

// 6. Test quality
const qualityResult = testResponseQuality(message, aiResponse);
console.log('Quality Score:', qualityResult.metrics.overall);

// 7. Log with redacted PII
console.log('Query (redacted):', piiRedaction.redactedText);
```
