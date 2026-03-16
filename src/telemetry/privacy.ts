/**
 * Telemetry Privacy Utilities
 *
 * PII redaction and data minimization for analytics events.
 * Apply these before sending search queries, error stacks, or user-generated content.
 */

const MAX_QUERY_WORDS = 3;
const MAX_STACK_LENGTH = 500;

/**
 * Redact search queries to prevent logging private search terms.
 * Keeps first 3 words, truncates the rest.
 */
export function redactSearchQuery(query: string): string {
  if (!query) return '';
  const words = query.trim().split(/\s+/);
  if (words.length <= MAX_QUERY_WORDS) return query.trim();
  return words.slice(0, MAX_QUERY_WORDS).join(' ') + ' [...]';
}

/**
 * Redact stack traces to remove file paths that may contain usernames
 * or query parameters that may contain tokens.
 */
export function redactStackTrace(stack: string | undefined): string | undefined {
  if (!stack) return undefined;
  return stack
    .substring(0, MAX_STACK_LENGTH)
    .replace(/\/Users\/[^/]+\//g, '/[user]/')
    .replace(/\/home\/[^/]+\//g, '/[user]/')
    .replace(/\?[^\s)]+/g, '?[redacted]');
}
