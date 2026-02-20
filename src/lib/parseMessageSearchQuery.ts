/**
 * Message Search Query Parser
 * Lightweight DSL for filtering messages by sender, broadcast, weekday, and date range.
 * Backward compatible: if no recognized tokens exist, treat input as plain text search.
 */

export type RangePreset = 'last7d' | 'last14d' | 'last30d';

export interface ParsedMessageSearchQuery {
  /** Remaining free-text search terms (message content) */
  text: string;
  /** Resolved sender name for from: filter */
  sender?: string;
  /** If true, return only broadcast messages */
  isBroadcastOnly?: boolean;
  /** Weekday 0-6 (Sunday=0) for day: filter or weekday convenience */
  weekday?: number;
  /** Inclusive start date for after: or range preset */
  after?: Date;
  /** Exclusive end date for before: or range preset */
  before?: Date;
  /** Preset range when user types range:last7d etc. */
  rangePreset?: RangePreset;
}

const WEEKDAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

const RANGE_PRESETS: Record<string, RangePreset> = {
  last7d: 'last7d',
  last14d: 'last14d',
  last30d: 'last30d',
};

/** Regex for from:"Coach Mike" or from:Coach */
const FROM_PATTERN = /from:(?:"([^"]+)"|(\S+))/gi;
/** Regex for after:YYYY-MM-DD */
const AFTER_PATTERN = /after:(\d{4}-\d{2}-\d{2})\b/gi;
/** Regex for before:YYYY-MM-DD */
const BEFORE_PATTERN = /before:(\d{4}-\d{2}-\d{2})\b/gi;
/** Regex for day:Tuesday or day:monday */
const DAY_PATTERN = /day:(\w+)\b/gi;
/** Regex for range:last7d, range:last14d, range:last30d */
const RANGE_PATTERN = /range:(last7d|last14d|last30d)\b/gi;

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

  // 3. Extract after:YYYY-MM-DD
  remaining = remaining.replace(AFTER_PATTERN, (_, dateStr) => {
    const d = parseISODate(dateStr);
    if (d) {
      result.after = d;
      if (!result.before && result.rangePreset) {
        // Clear range preset if explicit after given
        result.rangePreset = undefined;
      }
    }
    return ' ';
  });

  // 4. Extract before:YYYY-MM-DD
  remaining = remaining.replace(BEFORE_PATTERN, (_, dateStr) => {
    const d = parseISODate(dateStr);
    if (d) {
      result.before = d;
      if (result.rangePreset) result.rangePreset = undefined;
    }
    return ' ';
  });

  // 5. Extract day:<weekday>
  remaining = remaining.replace(DAY_PATTERN, (_, dayStr) => {
    const wd = parseWeekday(dayStr);
    if (wd !== undefined) result.weekday = wd;
    return ' ';
  });

  // 6. Extract range:last7d|last14d|last30d
  remaining = remaining.replace(RANGE_PATTERN, (_, preset) => {
    const p = RANGE_PRESETS[preset?.toLowerCase()];
    if (p) {
      result.rangePreset = p;
      const { after, before } = rangePresetToDates(p);
      if (!result.after) result.after = after;
      if (!result.before) result.before = before;
    }
    return ' ';
  });

  // 7. Weekday convenience: if remaining contains a standalone weekday name
  const { weekday: wdConv, textWithoutWeekday } = extractWeekdayConvenience(remaining);
  if (wdConv !== undefined && result.weekday === undefined) {
    result.weekday = wdConv;
    remaining = textWithoutWeekday;
    if (!result.rangePreset && !result.after && !result.before) {
      result.rangePreset = 'last14d';
      const { after, before } = rangePresetToDates('last14d');
      result.after = after;
      result.before = before;
    }
  }

  // 8. Collapse whitespace and trim for remaining text
  result.text = remaining.replace(/\s+/g, ' ').trim();

  return result;
}

function parseISODate(str: string): Date | null {
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  const year = parseInt(y!, 10);
  const month = parseInt(m!, 10) - 1;
  const day = parseInt(d!, 10);
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

function parseWeekday(str: string): number | undefined {
  const lower = str?.toLowerCase().trim();
  const idx = WEEKDAY_NAMES.indexOf(lower as (typeof WEEKDAY_NAMES)[number]);
  return idx >= 0 ? idx : undefined;
}

function rangePresetToDates(preset: RangePreset): { after: Date; before: Date } {
  const now = new Date();
  const before = new Date(now);
  before.setHours(23, 59, 59, 999);
  const after = new Date(now);
  switch (preset) {
    case 'last7d':
      after.setDate(after.getDate() - 7);
      break;
    case 'last14d':
      after.setDate(after.getDate() - 14);
      break;
    case 'last30d':
      after.setDate(after.getDate() - 30);
      break;
    default:
      after.setDate(after.getDate() - 14);
  }
  after.setHours(0, 0, 0, 0);
  return { after, before };
}

/**
 * If remaining contains a standalone weekday token, return its index and text without it.
 * Avoid matching substrings (e.g. "Tuesday" in "EveryTuesday").
 */
function extractWeekdayConvenience(remaining: string): {
  weekday: number | undefined;
  textWithoutWeekday: string;
} {
  const tokens = remaining.split(/\s+/).filter(Boolean);
  const kept: string[] = [];
  let found: number | undefined;
  for (const token of tokens) {
    const idx = WEEKDAY_NAMES.indexOf(token.toLowerCase() as (typeof WEEKDAY_NAMES)[number]);
    if (idx >= 0 && found === undefined) {
      found = idx;
    } else {
      kept.push(token);
    }
  }
  return {
    weekday: found,
    textWithoutWeekday: kept.join(' '),
  };
}
