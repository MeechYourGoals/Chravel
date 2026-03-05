/**
 * AI Security Layer — Prompt Injection Guardrails + LLM Tool Chain Security
 *
 * Implements the defense-in-depth architecture used by Anthropic/OpenAI:
 *
 * 1. INPUT SANITIZATION — strips injection attempts before they reach the LLM
 * 2. TOOL CALL VALIDATION — allowlist-based gate on every AI tool invocation
 * 3. OUTPUT SANITIZATION — prevents data leakage in AI responses
 * 4. SCOPE ENFORCEMENT — AI can only access data within the current trip
 * 5. AUDIT LOGGING — every tool call is logged for security review
 */

import { z } from 'zod';

// ============================================================
// 1. PROMPT INJECTION DETECTION
// ============================================================

/** Patterns that indicate prompt injection attempts */
const INJECTION_PATTERNS: { pattern: RegExp; severity: 'block' | 'flag' }[] = [
  // Direct injection attempts
  { pattern: /ignore\s+(?:all\s+)?previous\s+instructions/i, severity: 'block' },
  { pattern: /ignore\s+(?:all\s+)?above\s+instructions/i, severity: 'block' },
  { pattern: /disregard\s+(?:all\s+)?(?:previous|prior|above)/i, severity: 'block' },
  {
    pattern: /forget\s+(?:all\s+)?(?:previous|prior|above|your)\s+(?:instructions|rules|prompt)/i,
    severity: 'block',
  },
  { pattern: /you\s+are\s+now\s+(?:a|an|in)\s+/i, severity: 'block' },
  { pattern: /new\s+instructions?\s*:/i, severity: 'block' },
  { pattern: /system\s*:\s*/i, severity: 'flag' },

  // Data exfiltration attempts
  { pattern: /reveal\s+(?:your\s+)?(?:system\s+)?prompt/i, severity: 'block' },
  {
    pattern: /show\s+(?:me\s+)?(?:your\s+)?(?:system\s+)?(?:prompt|instructions)/i,
    severity: 'block',
  },
  { pattern: /what\s+(?:are|were)\s+your\s+(?:system\s+)?instructions/i, severity: 'block' },
  { pattern: /print\s+(?:your\s+)?(?:system\s+)?prompt/i, severity: 'block' },
  {
    pattern: /output\s+(?:your\s+)?(?:initial|system|original)\s+(?:prompt|instructions)/i,
    severity: 'block',
  },

  // Role manipulation
  {
    pattern: /pretend\s+(?:you\s+are|to\s+be)\s+(?:a\s+)?(?:different|another|new)/i,
    severity: 'block',
  },
  { pattern: /act\s+as\s+(?:a\s+)?(?:different|another|new)/i, severity: 'flag' },
  {
    pattern: /switch\s+(?:to\s+)?(?:a\s+)?(?:different|another|new)\s+(?:mode|role|persona)/i,
    severity: 'block',
  },

  // Encoding bypass attempts
  { pattern: /base64\s+decode/i, severity: 'flag' },
  { pattern: /rot13/i, severity: 'flag' },
  { pattern: /hex\s+decode/i, severity: 'flag' },

  // Tool abuse
  {
    pattern: /call\s+(?:the\s+)?function\s+(?:with|using)\s+(?:different|modified|altered)/i,
    severity: 'block',
  },
  {
    pattern: /override\s+(?:the\s+)?(?:tool|function)\s+(?:parameters|arguments|input)/i,
    severity: 'block',
  },
];

export interface InjectionCheckResult {
  safe: boolean;
  blocked: boolean;
  flagged: boolean;
  reasons: string[];
  sanitizedMessage: string;
}

/**
 * Check user message for prompt injection attempts.
 * Returns sanitized message + detection results.
 */
export function checkPromptInjection(message: string): InjectionCheckResult {
  const reasons: string[] = [];
  let blocked = false;
  let flagged = false;

  for (const { pattern, severity } of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      if (severity === 'block') {
        blocked = true;
        reasons.push(`Blocked: matches injection pattern "${pattern.source.substring(0, 40)}..."`);
      } else {
        flagged = true;
        reasons.push(`Flagged: matches suspicious pattern "${pattern.source.substring(0, 40)}..."`);
      }
    }
  }

  // Sanitize the message (strip control characters, normalize whitespace)
  // eslint-disable-next-line no-control-regex
  const controlCharRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
  const sanitizedMessage = message
    .replace(controlCharRegex, '') // Remove control chars
    .replace(/\r\n/g, '\n') // Normalize line endings
    .trim();

  return {
    safe: !blocked,
    blocked,
    flagged,
    reasons,
    sanitizedMessage: blocked ? '' : sanitizedMessage,
  };
}

// ============================================================
// 2. LLM TOOL CHAIN SECURITY
// ============================================================

/** All tools the AI concierge is allowed to call */
const ALLOWED_TOOLS = new Set([
  'search_places',
  'get_weather',
  'get_trip_details',
  'create_reservation_draft',
  'get_calendar_events',
  'search_flights',
  'search_hotels',
  'parse_schedule',
  'get_trip_members',
  'get_nearby_restaurants',
  'get_directions',
  'currency_convert',
]);

/** Tools that require trip ownership verification */
const TRIP_SCOPED_TOOLS = new Set([
  'get_trip_details',
  'create_reservation_draft',
  'get_calendar_events',
  'get_trip_members',
]);

/** Tools that can modify data (write operations) */
const WRITE_TOOLS = new Set(['create_reservation_draft']);

/** Maximum argument sizes to prevent abuse */
const ARG_LIMITS: Record<string, number> = {
  query: 500,
  message: 2000,
  location: 200,
  name: 200,
  notes: 1000,
};

export interface ToolCallValidation {
  allowed: boolean;
  reason: string;
  requiresTripScope: boolean;
  isWriteOperation: boolean;
}

/**
 * Validate an AI tool call before execution.
 * This is the critical security gate — every tool call MUST pass through here.
 */
export function validateToolCall(
  toolName: string,
  args: Record<string, unknown>,
  context: { tripId?: string; userId?: string },
): ToolCallValidation {
  // Gate 1: Is this tool on the allowlist?
  if (!ALLOWED_TOOLS.has(toolName)) {
    return {
      allowed: false,
      reason: `Tool "${toolName}" is not in the allowed tools list`,
      requiresTripScope: false,
      isWriteOperation: false,
    };
  }

  // Gate 2: Validate argument sizes
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string') {
      const limit = ARG_LIMITS[key] || 2000;
      if (value.length > limit) {
        return {
          allowed: false,
          reason: `Argument "${key}" exceeds maximum length (${value.length}/${limit})`,
          requiresTripScope: false,
          isWriteOperation: false,
        };
      }
    }
  }

  // Gate 3: Trip-scoped tools must have a valid trip context
  const requiresTripScope = TRIP_SCOPED_TOOLS.has(toolName);
  if (requiresTripScope) {
    const tripId = (args.tripId as string) || context.tripId;
    if (!tripId) {
      return {
        allowed: false,
        reason: `Tool "${toolName}" requires a trip context but none provided`,
        requiresTripScope: true,
        isWriteOperation: false,
      };
    }

    // Validate trip ID format
    const tripIdRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const shortIdRegex = /^[a-zA-Z0-9_-]+$/;
    if (!tripIdRegex.test(tripId) && !shortIdRegex.test(tripId)) {
      return {
        allowed: false,
        reason: 'Invalid trip ID format in tool arguments',
        requiresTripScope: true,
        isWriteOperation: false,
      };
    }
  }

  // Gate 4: Write operations require authenticated user
  const isWriteOperation = WRITE_TOOLS.has(toolName);
  if (isWriteOperation && !context.userId) {
    return {
      allowed: false,
      reason: `Write tool "${toolName}" requires authenticated user`,
      requiresTripScope,
      isWriteOperation: true,
    };
  }

  return {
    allowed: true,
    reason: 'Passed all validation gates',
    requiresTripScope,
    isWriteOperation,
  };
}

// ============================================================
// 3. OUTPUT SANITIZATION
// ============================================================

/** Patterns that should never appear in AI responses */
const OUTPUT_REDACTION_PATTERNS = [
  {
    pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    replacement: '[REDACTED_TOKEN]',
  },
  { pattern: /sk_(?:live|test)_[a-zA-Z0-9]{24,}/g, replacement: '[REDACTED_STRIPE_KEY]' },
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, replacement: '[REDACTED_API_KEY]' },
  { pattern: /password\s*[:=]\s*['"][^'"]+['"]/gi, replacement: 'password: [REDACTED]' },
  {
    pattern: /(?:postgres|mysql|mongodb):\/\/[^:]+:[^@]+@[^\s]+/g,
    replacement: '[REDACTED_DB_URL]',
  },
];

/**
 * Sanitize AI output to prevent accidental data leakage.
 */
export function sanitizeAIOutput(response: string): string {
  let sanitized = response;

  for (const { pattern, replacement } of OUTPUT_REDACTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized;
}

// ============================================================
// 4. SCOPE ENFORCEMENT SCHEMA
// ============================================================

/**
 * Schema for validating that a tool call's data scope matches
 * the current user's trip access. Used server-side in edge functions.
 */
export const toolCallScopeSchema = z.object({
  toolName: z.string(),
  tripId: z.string(),
  userId: z.string(),
  timestamp: z.number(),
  args: z.record(z.unknown()),
});

export type ToolCallScope = z.infer<typeof toolCallScopeSchema>;

// ============================================================
// 5. AUDIT LOGGING
// ============================================================

export interface SecurityAuditEntry {
  timestamp: string;
  event: 'injection_attempt' | 'tool_call_blocked' | 'tool_call_allowed' | 'output_redacted';
  userId?: string;
  tripId?: string;
  details: Record<string, unknown>;
}

const auditLog: SecurityAuditEntry[] = [];
const MAX_AUDIT_LOG_SIZE = 1000;

/**
 * Log a security event for later review.
 * In production, these should be sent to a server-side logging service.
 */
export function logSecurityEvent(entry: Omit<SecurityAuditEntry, 'timestamp'>): void {
  const fullEntry: SecurityAuditEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  auditLog.push(fullEntry);

  // Keep log bounded
  if (auditLog.length > MAX_AUDIT_LOG_SIZE) {
    auditLog.splice(0, auditLog.length - MAX_AUDIT_LOG_SIZE);
  }

  // Log critical events to console in development
  if (entry.event === 'injection_attempt' || entry.event === 'tool_call_blocked') {
    console.warn(`[SECURITY] ${entry.event}:`, entry.details);
  }
}

/**
 * Get recent security events (for admin dashboard / monitoring).
 */
export function getSecurityAuditLog(limit: number = 50): SecurityAuditEntry[] {
  return auditLog.slice(-limit);
}
