/**
 * Strips leaked tool-plan / internal JSON from concierge assistant messages.
 *
 * The AI model occasionally emits structured tool-plan JSON (containing keys
 * like `plan_version`, `actions`, `booking_assist`, `idempotency_key`) directly
 * into its text response. This utility removes those blocks so users never see
 * raw JSON instructions in the chat.
 */

const TOOL_PLAN_KEYS = [
  'plan_version',
  'actions',
  'booking_assist',
  'idempotency_key',
  'type.*clarify',
  'type.*tool',
];

/** Regex that matches a top-level JSON object containing any tool-plan key. */
const TOOL_PLAN_OBJECT_RE = new RegExp(
  '\\{[\\s\\S]*?(?:' +
    TOOL_PLAN_KEYS.map(k => `"${k}"`).join('|') +
    ')[\\s\\S]*?\\}(?:\\s*\\{[\\s\\S]*?(?:' +
    TOOL_PLAN_KEYS.map(k => `"${k}"`).join('|') +
    ')[\\s\\S]*?\\})*',
  'g',
);

/**
 * Returns true if a string looks like it's entirely a tool-plan JSON blob
 * (starts with `{` after trimming whitespace and contains tool-plan keys).
 */
function isEntirelyToolPlan(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) return false;
  return TOOL_PLAN_KEYS.some(k => {
    const re = new RegExp(`"${k}"`);
    return re.test(trimmed);
  });
}

/**
 * Sanitize assistant message content by stripping any tool-plan JSON blocks.
 * Returns the cleaned text, or an empty string if the entire message was a plan.
 */
export function sanitizeConciergeContent(content: string): string {
  if (!content) return content;

  // Fast path: no tool-plan keys at all
  const hasAnyKey = TOOL_PLAN_KEYS.some(k => {
    const re = new RegExp(`"${k}"`);
    return re.test(content);
  });
  if (!hasAnyKey) return content;

  // If the entire content is a tool-plan JSON blob, return empty
  if (isEntirelyToolPlan(content)) return '';

  // Strip embedded JSON blocks that contain tool-plan keys
  const cleaned = content.replace(TOOL_PLAN_OBJECT_RE, '').trim();
  return cleaned;
}
