/**
 * Strips leaked tool-plan / internal JSON from concierge assistant messages.
 *
 * The AI model occasionally emits structured tool-plan JSON (containing keys
 * like `plan_version`, `actions`, `booking_assist`, `idempotency_key`) directly
 * into its text response — sometimes wrapped in markdown code fences.
 * This utility removes those blocks so users never see raw JSON instructions.
 */

/** Keys that identify a JSON object as an internal tool-plan. */
const TOOL_PLAN_KEYS = ['plan_version', 'booking_assist', 'idempotency_key', 'actions'];

/** Action type values that mark a JSON object as internal even without top-level plan keys. */
const TOOL_ACTION_TYPES = [
  'create_calendar_event',
  'save_place',
  'create_task',
  'create_poll',
  'search_places',
];

/** Returns true if a parsed JSON object contains tool-plan keys or action-type markers. */
function isToolPlanObject(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record);

  // Direct tool-plan key match
  if (TOOL_PLAN_KEYS.some(k => keys.includes(k))) return true;

  // Check for action type values
  if (typeof record.type === 'string' && TOOL_ACTION_TYPES.includes(record.type)) return true;

  // Check nested actions array for tool types
  if (Array.isArray(record.actions)) {
    return record.actions.some(
      (a: unknown) =>
        typeof a === 'object' &&
        a !== null &&
        typeof (a as Record<string, unknown>).type === 'string' &&
        TOOL_ACTION_TYPES.includes((a as Record<string, unknown>).type as string),
    );
  }

  return false;
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
 * Strip markdown code fences that contain tool-plan JSON.
 * Handles ```json ... ``` and ``` ... ``` (no language tag).
 */
function stripToolPlanFences(content: string): string {
  // Match fenced code blocks: ```json\n...\n``` or ```\n...\n```
  return content.replace(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/g, (match, inner: string) => {
    const trimmed = inner.trim();
    if (!trimmed.startsWith('{')) return match; // Not JSON — keep it

    try {
      const parsed = JSON.parse(trimmed);
      if (isToolPlanObject(parsed)) return ''; // Strip the entire fence
    } catch {
      // Not valid JSON — keep
    }
    return match;
  });
}

/**
 * Strip unfenced tool-plan JSON objects from content.
 */
function stripUnfencedToolPlanJSON(content: string): string {
  // Fast path: no tool-plan keys at all
  const hasAnyKey = TOOL_PLAN_KEYS.some(k => content.includes(`"${k}"`));
  const hasActionType = TOOL_ACTION_TYPES.some(t => content.includes(`"${t}"`));
  if (!hasAnyKey && !hasActionType) return content;

  let result = '';
  let i = 0;
  while (i < content.length) {
    const braceIdx = content.indexOf('{', i);
    if (braceIdx === -1) {
      result += content.slice(i);
      break;
    }

    result += content.slice(i, braceIdx);

    const endIdx = findBalancedBraceEnd(content, braceIdx);
    if (endIdx === -1) {
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

    i = endIdx + 1;
  }

  return result;
}

/**
 * Sanitize assistant message content by stripping any tool-plan JSON blocks,
 * including those wrapped in markdown code fences.
 * Returns the cleaned text, or an empty string if the entire message was only plans.
 * Preserves any non-JSON text that appears before, between, or after JSON blocks.
 */
export function sanitizeConciergeContent(content: string): string {
  if (!content) return content;

  // Fast path: no suspicious markers at all
  const hasFence = content.includes('```');
  const hasAnyKey = TOOL_PLAN_KEYS.some(k => content.includes(`"${k}"`));
  const hasActionType = TOOL_ACTION_TYPES.some(t => content.includes(`"${t}"`));
  if (!hasFence && !hasAnyKey && !hasActionType) return content;

  // Phase 1: Strip fenced code blocks containing tool-plan JSON
  let cleaned = hasFence ? stripToolPlanFences(content) : content;

  // Phase 2: Strip unfenced tool-plan JSON objects
  cleaned = stripUnfencedToolPlanJSON(cleaned);

  return cleaned.trim();
}
