/**
 * Message Search Query Parser
 * Lightweight DSL for filtering messages by sender and broadcast.
 * Matches iMessage/WhatsApp-style search: text + optional from: and broadcast filters.
 * Backward compatible: if no recognized tokens exist, treat input as plain text search.
 */

export interface ParsedMessageSearchQuery {
  /** Remaining free-text search terms (message content) */
  text: string;
  /** Resolved sender name for from: filter */
  sender?: string;
  /** If true, return only broadcast messages */
  isBroadcastOnly?: boolean;
}

/** Regex for from:"Coach Mike" or from:Coach */
const FROM_PATTERN = /from:(?:"([^"]+)"|(\S+))/gi;

/**
 * Parse a message search query into structured filters.
 * Plain text terms remain in `text` for content search.
 * Backward compatible: if no tokens match, entire input is treated as text.
 */
export function parseMessageSearchQuery(input: string): ParsedMessageSearchQuery {
  const trimmed = input.trim();
  if (!trimmed) {
    return { text: '' };
  }

  let remaining = trimmed;
  const result: ParsedMessageSearchQuery = {
    text: '',
  };

  // 1. Extract from:<name>
  remaining = remaining.replace(FROM_PATTERN, (_, quoted, unquoted) => {
    const name = (quoted ?? unquoted ?? '').trim();
    if (name) result.sender = name;
    return ' ';
  });

  // 2. Extract broadcast (whole-word, case-insensitive)
  const broadcastRegex = /\bbroadcast\b/gi;
  if (broadcastRegex.test(remaining)) {
    result.isBroadcastOnly = true;
    remaining = remaining.replace(broadcastRegex, ' ');
  }

  // 3. Collapse whitespace and trim for remaining text
  result.text = remaining.replace(/\s+/g, ' ').trim();

  return result;
}
