/**
 * AI Utility Functions
 * Shared utilities for AI model selection, complexity detection, safety filtering, and PII redaction
 */

export interface QueryComplexity {
  score: number; // 0-1, where 1 is most complex
  factors: {
    length: number;
    reasoningRequired: boolean;
    multiStep: boolean;
    requiresContext: boolean;
    technicalTerms: number;
  };
  recommendedModel: 'flash' | 'pro';
}

/**
 * Analyze query complexity to determine optimal model
 */
export function analyzeQueryComplexity(
  query: string,
  chatHistoryLength: number = 0,
  contextSize: number = 0,
): QueryComplexity {
  const normalizedQuery = query.toLowerCase().trim();
  const queryLength = normalizedQuery.length;

  // Complexity indicators
  const reasoningKeywords = [
    'why',
    'how',
    'explain',
    'analyze',
    'compare',
    'evaluate',
    'reasoning',
    'strategy',
    'optimize',
    'best approach',
    'what if',
    'scenario',
    'trade-off',
    'pros and cons',
    'consider',
    'think about',
  ];

  const multiStepKeywords = [
    'then',
    'after',
    'next',
    'step',
    'process',
    'workflow',
    'sequence',
    'first',
    'second',
    'finally',
    'subsequently',
    'followed by',
  ];

  const technicalTerms = [
    'api',
    'integration',
    'algorithm',
    'architecture',
    'optimization',
    'scalability',
    'performance',
    'latency',
    'throughput',
    'database',
    'query',
    'index',
    'cache',
    'async',
    'concurrent',
    'distributed',
  ];

  const requiresContextKeywords = [
    'based on',
    'according to',
    'from the',
    'in the context',
    'given that',
    'considering',
    'taking into account',
    'with respect to',
  ];

  // Calculate factors
  const hasReasoning = reasoningKeywords.some(kw => normalizedQuery.includes(kw));
  const hasMultiStep = multiStepKeywords.some(kw => normalizedQuery.includes(kw));
  const hasContextRequirement = requiresContextKeywords.some(kw => normalizedQuery.includes(kw));
  const technicalTermCount = technicalTerms.filter(term => normalizedQuery.includes(term)).length;

  // Length factor (0-0.3)
  const lengthFactor = Math.min(queryLength / 500, 0.3);

  // Reasoning factor (0-0.3)
  const reasoningFactor = hasReasoning ? 0.3 : 0;

  // Multi-step factor (0-0.2)
  const multiStepFactor = hasMultiStep ? 0.2 : 0;

  // Context requirement factor (0-0.1)
  const contextFactor = hasContextRequirement ? 0.1 : 0;

  // Technical terms factor (0-0.1)
  const technicalFactor = Math.min(technicalTermCount * 0.05, 0.1);

  // Chat history complexity (0-0.05)
  const historyFactor = Math.min(chatHistoryLength / 20, 0.05);

  // Context size complexity (0-0.05)
  const contextSizeFactor = Math.min(contextSize / 10000, 0.05);

  const totalScore =
    lengthFactor +
    reasoningFactor +
    multiStepFactor +
    contextFactor +
    technicalFactor +
    historyFactor +
    contextSizeFactor;

  const complexity: QueryComplexity = {
    score: Math.min(totalScore, 1.0),
    factors: {
      length: lengthFactor,
      reasoningRequired: hasReasoning,
      multiStep: hasMultiStep,
      requiresContext: hasContextRequirement,
      technicalTerms: technicalTermCount,
    },
    recommendedModel: totalScore > 0.5 ? 'pro' : 'flash',
  };

  return complexity;
}

/**
 * Content filtering - detect profanity and inappropriate content
 */
export function filterProfanity(text: string): {
  isClean: boolean;
  filteredText: string;
  violations: string[];
} {
  // Common profanity patterns (simplified - in production, use a proper library)
  const profanityPatterns = [
    /\b(f\*\*k|fuck|sh\*\*t|shit|b\*\*ch|bitch|a\*\*hole|asshole)\b/gi,
    /\b(d\*\*n|damn|h\*\*l|hell)\b/gi,
    // Add more patterns as needed
  ];

  const violations: string[] = [];
  let filteredText = text;

  for (const pattern of profanityPatterns) {
    if (pattern.test(text)) {
      violations.push(pattern.source);
      filteredText = filteredText.replace(pattern, '[filtered]');
    }
  }

  return {
    isClean: violations.length === 0,
    filteredText,
    violations,
  };
}

/**
 * PII Redaction - remove or mask personally identifiable information
 */
export function redactPII(
  text: string,
  options: {
    redactEmails?: boolean;
    redactPhones?: boolean;
    redactCreditCards?: boolean;
    redactSSN?: boolean;
    redactIPs?: boolean;
  } = {},
): {
  redactedText: string;
  redactions: Array<{ type: string; original: string; masked: string }>;
} {
  const {
    redactEmails = true,
    redactPhones = true,
    redactCreditCards = true,
    redactSSN = true,
    redactIPs = true,
  } = options;

  let redactedText = text;
  const redactions: Array<{ type: string; original: string; masked: string }> = [];

  // Email addresses
  if (redactEmails) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    redactedText = redactedText.replace(emailRegex, match => {
      redactions.push({ type: 'email', original: match, masked: '[EMAIL_REDACTED]' });
      return '[EMAIL_REDACTED]';
    });
  }

  // Phone numbers (US format)
  if (redactPhones) {
    const phoneRegex = /\b(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g;
    redactedText = redactedText.replace(phoneRegex, match => {
      redactions.push({ type: 'phone', original: match, masked: '[PHONE_REDACTED]' });
      return '[PHONE_REDACTED]';
    });
  }

  // Credit card numbers (basic pattern)
  if (redactCreditCards) {
    const ccRegex = /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g;
    redactedText = redactedText.replace(ccRegex, match => {
      redactions.push({ type: 'credit_card', original: match, masked: '[CC_REDACTED]' });
      return '[CC_REDACTED]';
    });
  }

  // Social Security Numbers
  if (redactSSN) {
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    redactedText = redactedText.replace(ssnRegex, match => {
      redactions.push({ type: 'ssn', original: match, masked: '[SSN_REDACTED]' });
      return '[SSN_REDACTED]';
    });
  }

  // IP addresses
  if (redactIPs) {
    const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
    redactedText = redactedText.replace(ipRegex, match => {
      redactions.push({ type: 'ip', original: match, masked: '[IP_REDACTED]' });
      return '[IP_REDACTED]';
    });
  }

  return { redactedText, redactions };
}

/**
 * Build enhanced system prompt.
 *
 * Previously appended ~1,800 chars of few-shot examples and chain-of-thought
 * scaffolding. These were removed because:
 *   1. Gemini Flash/Pro already produce high-quality structured responses
 *      without explicit few-shot examples — the base prompt formatting rules
 *      are sufficient.
 *   2. Chain-of-thought scaffolding adds tokens Gemini must read before it can
 *      start generating, increasing time-to-first-token by ~200-400ms.
 *   3. The 8,000-char system prompt budget is better spent on actual trip data
 *      than on examples the model doesn't need.
 *
 * This function is kept as a passthrough for backward compatibility so callers
 * don't need to change.
 */
export function buildEnhancedSystemPrompt(
  basePrompt: string,
  _useChainOfThought: boolean = false,
  _includeFewShot: boolean = true,
): string {
  return basePrompt;
}

/**
 * Determine if query requires chain-of-thought reasoning
 */
export function requiresChainOfThought(query: string, complexity: QueryComplexity): boolean {
  const chainOfThoughtKeywords = [
    'should',
    'recommend',
    'best',
    'compare',
    'evaluate',
    'analyze',
    'strategy',
    'optimize',
    'consider',
    'trade-off',
    'pros and cons',
  ];

  const hasCoTKeywords = chainOfThoughtKeywords.some(kw => query.toLowerCase().includes(kw));

  return complexity.score > 0.4 || hasCoTKeywords || complexity.factors.reasoningRequired;
}
