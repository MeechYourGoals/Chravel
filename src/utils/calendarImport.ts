/**
 * ICS Calendar Import Utility
 *
 * V1 Scope:
 * - Parses VEVENT components with: DTSTART, DTEND, SUMMARY, DESCRIPTION, LOCATION
 * - Handles common date formats: UTC (Z suffix), local timestamps, DATE-only events
 *
 * V1 Limitations:
 * - RRULE (recurrence rules) are NOT supported - events are imported as single occurrences
 * - VTIMEZONE components are ignored - all times treated as local or UTC
 * - VALARM (reminders) are ignored
 * - Attendees and organizers are ignored
 */

export interface ICSParsedEvent {
  /** Unique identifier from ICS (UID field) or generated */
  uid: string;
  /** Event title (SUMMARY field) */
  title: string;
  /** Event start time */
  startTime: Date;
  /** Event end time (may be same as start for all-day events) */
  endTime: Date;
  /** Event location (LOCATION field) */
  location?: string;
  /** Event description (DESCRIPTION field) */
  description?: string;
  /** Whether this is an all-day event (DATE format vs DATETIME) */
  isAllDay: boolean;
}

export interface ICSParseResult {
  /** Successfully parsed events */
  events: ICSParsedEvent[];
  /** Parsing errors/warnings */
  errors: string[];
  /** Whether the file was valid ICS format */
  isValid: boolean;
}

/**
 * Unescape ICS text values.
 * ICS escapes: \n -> newline, \, -> comma, \; -> semicolon, \\ -> backslash
 */
function unescapeICSText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * Parse an ICS date/datetime string.
 *
 * Formats supported:
 * - YYYYMMDD (DATE only, all-day event)
 * - YYYYMMDDTHHmmss (local datetime)
 * - YYYYMMDDTHHmmssZ (UTC datetime)
 */
function parseICSDate(dateStr: string): { date: Date; isAllDay: boolean } | null {
  if (!dateStr) return null;

  // Clean whitespace
  const cleaned = dateStr.trim();

  // DATE only format: YYYYMMDD (8 digits)
  if (/^\d{8}$/.test(cleaned)) {
    const year = parseInt(cleaned.slice(0, 4), 10);
    const month = parseInt(cleaned.slice(4, 6), 10) - 1; // JS months are 0-indexed
    const day = parseInt(cleaned.slice(6, 8), 10);
    return { date: new Date(year, month, day), isAllDay: true };
  }

  // DATETIME format: YYYYMMDDTHHmmss or YYYYMMDDTHHmmssZ
  const dtMatch = cleaned.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (dtMatch) {
    const [, yearStr, monthStr, dayStr, hourStr, minStr, secStr, utcFlag] = dtMatch;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const hour = parseInt(hourStr, 10);
    const min = parseInt(minStr, 10);
    const sec = parseInt(secStr, 10);

    if (utcFlag === 'Z') {
      // UTC time
      return { date: new Date(Date.UTC(year, month, day, hour, min, sec)), isAllDay: false };
    } else {
      // Local time
      return { date: new Date(year, month, day, hour, min, sec), isAllDay: false };
    }
  }

  return null;
}

/**
 * Extract a property value from an ICS line.
 * Handles property parameters (e.g., DTSTART;VALUE=DATE:20240115)
 */
function extractPropertyValue(line: string, propertyName: string): string | null {
  // Match property with optional parameters: PROPNAME;params:value or PROPNAME:value
  const regex = new RegExp(`^${propertyName}(?:;[^:]*)?:(.*)$`, 'i');
  const match = line.match(regex);
  return match ? match[1] : null;
}

/**
 * Unfold ICS content lines.
 * ICS spec: lines longer than 75 octets are wrapped with CRLF + space/tab continuation.
 */
function unfoldICSLines(content: string): string[] {
  // Normalize line endings to LF
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Unfold continuation lines (lines starting with space or tab)
  const unfolded = normalized.replace(/\n[ \t]/g, '');

  // Split into lines and filter empty
  return unfolded.split('\n').filter(line => line.trim().length > 0);
}

/**
 * Parse an ICS file content string into events.
 */
export function parseICSContent(content: string): ICSParseResult {
  const result: ICSParseResult = {
    events: [],
    errors: [],
    isValid: false,
  };

  if (!content || typeof content !== 'string') {
    result.errors.push('Invalid input: content is empty or not a string');
    return result;
  }

  const lines = unfoldICSLines(content);

  // Check for VCALENDAR wrapper
  const hasVCalendarStart = lines.some(line => line.trim().toUpperCase() === 'BEGIN:VCALENDAR');
  const hasVCalendarEnd = lines.some(line => line.trim().toUpperCase() === 'END:VCALENDAR');

  if (!hasVCalendarStart || !hasVCalendarEnd) {
    result.errors.push('Invalid ICS format: missing VCALENDAR wrapper');
    return result;
  }

  result.isValid = true;

  // Parse VEVENT blocks
  let inEvent = false;
  let currentEvent: Partial<ICSParsedEvent> = {};
  let eventIndex = 0;

  for (const line of lines) {
    const upperLine = line.trim().toUpperCase();

    if (upperLine === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
      eventIndex++;
      continue;
    }

    if (upperLine === 'END:VEVENT') {
      inEvent = false;

      // Validate required fields
      if (!currentEvent.title) {
        result.errors.push(`Event #${eventIndex}: Missing SUMMARY (title)`);
        continue;
      }
      if (!currentEvent.startTime) {
        result.errors.push(`Event #${eventIndex}: Missing or invalid DTSTART`);
        continue;
      }

      // Default end time to start time if not provided
      if (!currentEvent.endTime) {
        currentEvent.endTime = currentEvent.startTime;
      }

      // Generate UID if not provided
      if (!currentEvent.uid) {
        currentEvent.uid = `imported-${Date.now()}-${eventIndex}`;
      }

      result.events.push(currentEvent as ICSParsedEvent);
      continue;
    }

    if (!inEvent) continue;

    // Parse event properties
    const trimmedLine = line.trim();

    // UID
    const uid = extractPropertyValue(trimmedLine, 'UID');
    if (uid) {
      currentEvent.uid = uid;
    }

    // SUMMARY (title)
    const summary = extractPropertyValue(trimmedLine, 'SUMMARY');
    if (summary) {
      currentEvent.title = unescapeICSText(summary);
    }

    // DESCRIPTION
    const description = extractPropertyValue(trimmedLine, 'DESCRIPTION');
    if (description) {
      currentEvent.description = unescapeICSText(description);
    }

    // LOCATION
    const location = extractPropertyValue(trimmedLine, 'LOCATION');
    if (location) {
      currentEvent.location = unescapeICSText(location);
    }

    // DTSTART
    const dtstart = extractPropertyValue(trimmedLine, 'DTSTART');
    if (dtstart) {
      const parsed = parseICSDate(dtstart);
      if (parsed) {
        currentEvent.startTime = parsed.date;
        currentEvent.isAllDay = parsed.isAllDay;
      }
    }

    // DTEND
    const dtend = extractPropertyValue(trimmedLine, 'DTEND');
    if (dtend) {
      const parsed = parseICSDate(dtend);
      if (parsed) {
        currentEvent.endTime = parsed.date;
      }
    }

    // Note: RRULE is intentionally ignored for V1
    // If we detect RRULE, we could add a warning
    if (trimmedLine.toUpperCase().startsWith('RRULE:')) {
      result.errors.push(
        `Event "${currentEvent.title || `#${eventIndex}`}": Recurrence rules (RRULE) are not supported in V1. Event imported as single occurrence.`,
      );
    }
  }

  return result;
}

/**
 * Read an ICS file and parse its contents.
 */
export async function parseICSFile(file: File): Promise<ICSParseResult> {
  return new Promise(resolve => {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.ics')) {
      resolve({
        events: [],
        errors: ['Invalid file type: expected .ics file'],
        isValid: false,
      });
      return;
    }

    const reader = new FileReader();

    reader.onload = e => {
      const content = e.target?.result as string;
      resolve(parseICSContent(content));
    };

    reader.onerror = () => {
      resolve({
        events: [],
        errors: ['Failed to read file'],
        isValid: false,
      });
    };

    reader.readAsText(file);
  });
}

/**
 * Check for duplicate events by matching start time, end time, and title.
 * Returns indices of events in parsedEvents that are duplicates of existingEvents.
 */
export function findDuplicateEvents(
  parsedEvents: ICSParsedEvent[],
  existingEvents: Array<{ start_time: string; end_time?: string | null; title: string }>,
): Set<number> {
  const duplicateIndices = new Set<number>();

  parsedEvents.forEach((parsed, index) => {
    const parsedStart = parsed.startTime.getTime();
    const parsedEnd = parsed.endTime.getTime();
    const parsedTitle = parsed.title.toLowerCase().trim();

    const isDuplicate = existingEvents.some(existing => {
      const existingStart = new Date(existing.start_time).getTime();
      const existingEnd = existing.end_time ? new Date(existing.end_time).getTime() : existingStart;
      const existingTitle = existing.title.toLowerCase().trim();

      return (
        parsedStart === existingStart && parsedEnd === existingEnd && parsedTitle === existingTitle
      );
    });

    if (isDuplicate) {
      duplicateIndices.add(index);
    }
  });

  return duplicateIndices;
}
