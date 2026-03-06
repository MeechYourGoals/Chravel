/**
 * Strips leaked tool-plan / internal JSON from concierge assistant messages.
 *
 * The AI model occasionally emits structured tool-plan JSON (containing keys
 * like `plan_version`, `actions`, `booking_assist`, `idempotency_key`) directly
 * into its text response. This utility removes those blocks so users never see
 * raw JSON instructions in the chat.
 */

/** Keys that identify a JSON object as an internal tool-plan. */
const TOOL_PLAN_KEYS = ['plan_version', 'booking_assist', 'idempotency_key'];

/** Returns true if a parsed JSON object contains tool-plan keys. */
function isToolPlanObject(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  const keys = Object.keys(obj as Record<string, unknown>);
  return TOOL_PLAN_KEYS.some(k => keys.includes(k));
}

/**
 * Find the end index of a brace-balanced JSON object starting at `start`.
 * `content[start]` must be '{'. Returns -1 if no balanced closing brace found.
 */
function findBalancedBraceEnd(content: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < content.length; i++) {
    const ch = content[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Sanitize assistant message content by stripping any tool-plan JSON blocks.
 * Returns the cleaned text, or an empty string if the entire message was only plans.
 * Preserves any non-JSON text that appears before, between, or after JSON blocks.
 */
export function sanitizeConciergeContent(content: string): string {
  if (!content) return content;

  // Fast path: no tool-plan keys at all
  const hasAnyKey = TOOL_PLAN_KEYS.some(k => content.includes(`"${k}"`));
  if (!hasAnyKey) return content;

  // Walk through content, find top-level JSON objects, check if they are tool-plans,
  // and remove only those spans while preserving surrounding text.
  let result = '';
  let i = 0;
  while (i < content.length) {
    const braceIdx = content.indexOf('{', i);
    if (braceIdx === -1) {
      // No more braces — append the rest
      result += content.slice(i);
      break;
    }

    // Append text before this brace
    result += content.slice(i, braceIdx);

    // Try to extract a balanced JSON object
    const endIdx = findBalancedBraceEnd(content, braceIdx);
    if (endIdx === -1) {
      // Unbalanced — append as-is (not valid JSON)
      result += content.slice(braceIdx);
      break;
    }

    const jsonCandidate = content.slice(braceIdx, endIdx + 1);
    let isToolPlan = false;
    try {
      const parsed = JSON.parse(jsonCandidate);
      isToolPlan = isToolPlanObject(parsed);
    } catch {
      // Not valid JSON — keep it
    }

    if (!isToolPlan) {
      result += jsonCandidate;
    }
    // If it IS a tool plan, skip it (don't append)

    i = endIdx + 1;
  }

  return result.trim();
}
