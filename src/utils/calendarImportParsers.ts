/**
 * Multi-Format Calendar Import Parsers
 *
 * Routes files to the appropriate parser:
 * - .ics  → existing parseICSFile()
 * - .csv  → client-side CSV parser with column detection
 * - .xlsx/.xls → client-side Excel parser using xlsx library
 * - .pdf / images → AI-powered extraction via enhanced-ai-parser edge function
 * - plain text → AI-powered extraction via enhanced-ai-parser edge function
 */

import { parseICSFile, ICSParsedEvent, ICSParseResult } from './calendarImport';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

export type ImportSourceFormat = 'ics' | 'csv' | 'excel' | 'pdf' | 'image' | 'text' | 'url';

export interface SmartParseResult extends ICSParseResult {
  /** Which parser handled this file */
  sourceFormat: ImportSourceFormat;
  /** Per-event confidence scores (for AI-parsed results) */
  confidenceScores?: number[];
  /** Metadata from URL scrape (total found vs filtered) */
  urlMeta?: { eventsFound: number; eventsFiltered: number };
}

// ─── Column Detection Heuristics ─────────────────────────────────────────────

const COLUMN_PATTERNS = {
  date: /^(date|start|when|day|scheduled|begins|game.?date|show.?date|event.?date)$/i,
  title: /^(title|name|event|summary|subject|what|activity|opponent|show|game|match|artist|act|performer|event.?name|headliner|band)$/i,
  time: /^(time|start.?time|hour|begins|from|at|game.?time|show.?time|doors)$/i,
  endTime: /^(end.?time|ends|to|until|through|end)$/i,
  location: /^(location|venue|where|place|address|site|arena|stadium|city|theater|theatre|club|room)$/i,
  description: /^(description|details|notes|info|about|memo|comments)$/i,
};

interface ColumnMapping {
  date: number;
  title: number;
  time?: number;
  endTime?: number;
  location?: number;
  description?: number;
}

function detectColumns(headers: string[]): ColumnMapping | null {
  const mapping: Partial<ColumnMapping> = {};

  headers.forEach((header, index) => {
    const trimmed = header.trim();
    if (COLUMN_PATTERNS.date.test(trimmed) && mapping.date === undefined) {
      mapping.date = index;
    } else if (COLUMN_PATTERNS.title.test(trimmed) && mapping.title === undefined) {
      mapping.title = index;
    } else if (COLUMN_PATTERNS.time.test(trimmed) && mapping.time === undefined) {
      mapping.time = index;
    } else if (COLUMN_PATTERNS.endTime.test(trimmed) && mapping.endTime === undefined) {
      mapping.endTime = index;
    } else if (COLUMN_PATTERNS.location.test(trimmed) && mapping.location === undefined) {
      mapping.location = index;
    } else if (COLUMN_PATTERNS.description.test(trimmed) && mapping.description === undefined) {
      mapping.description = index;
    }
  });

  // date and title are required
  if (mapping.date === undefined || mapping.title === undefined) {
    return null;
  }

  return mapping as ColumnMapping;
}

/**
 * Scan the first N rows of data to find the best header row.
 * Returns the 0-based row index of the best header candidate + its mapping.
 */
function findBestHeaderRow(
  data: unknown[][],
  maxScan: number = 10,
): { rowIndex: number; mapping: ColumnMapping } | null {
  let bestRow = -1;
  let bestMapping: ColumnMapping | null = null;
  let bestScore = 0;

  const limit = Math.min(data.length, maxScan);

  for (let i = 0; i < limit; i++) {
    const row = data[i] ?? [];
    const headers = row.map(h => String(h ?? '').trim()).filter(h => h.length > 0);
    if (headers.length < 2) continue;

    const mapping = detectColumns(headers);
    if (!mapping) continue;

    // Score: count how many optional columns also matched
    let score = 2; // date + title are required
    if (mapping.time !== undefined) score++;
    if (mapping.endTime !== undefined) score++;
    if (mapping.location !== undefined) score++;
    if (mapping.description !== undefined) score++;

    if (score > bestScore) {
      bestScore = score;
      bestRow = i;
      bestMapping = mapping;
    }
  }

  if (bestRow === -1 || !bestMapping) return null;

  return { rowIndex: bestRow, mapping: bestMapping };
}

// ─── Date Parsing ────────────────────────────────────────────────────────────

function parseFlexibleDate(dateStr: string, timeStr?: string): Date | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();

  // Try native Date parsing first
  let date = new Date(cleaned);

  // Handle MM/DD/YYYY or M/D/YYYY
  if (isNaN(date.getTime())) {
    const mdyMatch = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (mdyMatch) {
      const [, m, d, y] = mdyMatch;
      const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
      date = new Date(year, parseInt(m, 10) - 1, parseInt(d, 10));
    }
  }

  // Handle YYYY-MM-DD
  if (isNaN(date.getTime())) {
    const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    }
  }

  if (isNaN(date.getTime())) return null;

  // Apply time if provided
  if (timeStr) {
    const timeParsed = parseTimeString(timeStr.trim());
    if (timeParsed) {
      date.setHours(timeParsed.hours, timeParsed.minutes, 0, 0);
    }
  }

  return date;
}

function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;

  // Handle HH:MM AM/PM
  const ampmMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2] || '0', 10);
    const isPM = ampmMatch[3].toLowerCase() === 'pm';
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    return { hours, minutes };
  }

  // Handle HH:MM (24h)
  const h24Match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    return { hours: parseInt(h24Match[1], 10), minutes: parseInt(h24Match[2], 10) };
  }

  return null;
}

// ─── Row to Event Mapper ─────────────────────────────────────────────────────

function rowToEvent(row: string[], mapping: ColumnMapping, index: number): ICSParsedEvent | null {
  const dateStr = row[mapping.date];
  const title = row[mapping.title]?.trim();

  if (!dateStr || !title) return null;

  const timeStr = mapping.time !== undefined ? row[mapping.time] : undefined;
  const startTime = parseFlexibleDate(dateStr, timeStr);
  if (!startTime) return null;

  let endTime = startTime;
  if (mapping.endTime !== undefined && row[mapping.endTime]) {
    const endTimeParsed = parseFlexibleDate(dateStr, row[mapping.endTime]);
    if (endTimeParsed) endTime = endTimeParsed;
  }

  const isAllDay = !timeStr;

  return {
    uid: `imported-spreadsheet-${Date.now()}-${index}`,
    title,
    startTime,
    endTime,
    location:
      mapping.location !== undefined ? row[mapping.location]?.trim() || undefined : undefined,
    description:
      mapping.description !== undefined ? row[mapping.description]?.trim() || undefined : undefined,
    isAllDay,
  };
}

// ─── CSV Parser ──────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export async function parseCSVCalendar(file: File): Promise<SmartParseResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      events: [],
      errors: ['CSV file has no data rows'],
      isValid: false,
      sourceFormat: 'csv',
    };
  }

  const headers = parseCSVLine(lines[0]);
  const mapping = detectColumns(headers);

  if (!mapping) {
    return {
      events: [],
      errors: [
        `Could not detect required columns (date + title). Found headers: ${headers.join(', ')}`,
      ],
      isValid: false,
      sourceFormat: 'csv',
    };
  }

  const events: ICSParsedEvent[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const event = rowToEvent(row, mapping, i);
    if (event) {
      events.push(event);
    } else {
      errors.push(`Row ${i + 1}: Could not parse date or title`);
    }
  }

  return {
    events,
    errors,
    isValid: events.length > 0,
    sourceFormat: 'csv',
  };
}

// ─── Excel Parser ────────────────────────────────────────────────────────────

export async function parseExcelCalendar(file: File): Promise<SmartParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  if (workbook.SheetNames.length === 0) {
    return {
      events: [],
      errors: ['Excel file has no sheets'],
      isValid: false,
      sourceFormat: 'excel',
    };
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][];

  if (jsonData.length < 2) {
    return {
      events: [],
      errors: ['Excel sheet has no data rows'],
      isValid: false,
      sourceFormat: 'excel',
    };
  }

  // Scan first 10 rows for the best header row (handles title rows, blank rows, etc.)
  const headerResult = findBestHeaderRow(jsonData);

  if (!headerResult) {
    // Fallback: show what we found for debugging
    const firstRowHeaders = (jsonData[0] ?? []).map(h => String(h ?? ''));
    return {
      events: [],
      errors: [
        `Could not detect required columns (date + title). First row values: ${firstRowHeaders.join(', ')}`,
      ],
      isValid: false,
      sourceFormat: 'excel',
    };
  }

  const { rowIndex: headerRowIndex, mapping } = headerResult;

  const events: ICSParsedEvent[] = [];
  const errors: string[] = [];

  // Data rows start after the header row
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const rawRow = jsonData[i] ?? [];
    const row = rawRow.map(cell => {
      if (cell instanceof Date) {
        return cell.toISOString().split('T')[0];
      }
      return String(cell ?? '');
    });
    const event = rowToEvent(row, mapping, i);
    if (event) {
      events.push(event);
    } else {
      // Only log errors for non-empty rows
      const hasContent = row.some(c => c.trim().length > 0);
      if (hasContent) {
        errors.push(`Row ${i + 1}: Could not parse date or title`);
      }
    }
  }

  return {
    events,
    errors,
    isValid: events.length > 0,
    sourceFormat: 'excel',
  };
}

// ─── AI Parser (PDFs, Images, Text) ──────────────────────────────────────────

interface AIExtractedEvent {
  title: string;
  date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  category?: string;
  confirmation_number?: string;
  confidence?: number;
  source_text?: string;
  all_day?: boolean;
}

function mapAIEventsToICS(aiEvents: AIExtractedEvent[]): {
  events: ICSParsedEvent[];
  confidenceScores: number[];
} {
  const events: ICSParsedEvent[] = [];
  const confidenceScores: number[] = [];

  aiEvents.forEach((aiEvent, index) => {
    const startTime = parseFlexibleDate(aiEvent.date, aiEvent.start_time);
    if (!startTime) return;

    let endTime = startTime;
    if (aiEvent.end_time) {
      const parsed = parseFlexibleDate(aiEvent.date, aiEvent.end_time);
      if (parsed) endTime = parsed;
    }

    const description = [
      aiEvent.source_text ? `Source: ${aiEvent.source_text}` : '',
      aiEvent.confirmation_number ? `Confirmation: ${aiEvent.confirmation_number}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    events.push({
      uid: `imported-ai-${Date.now()}-${index}`,
      title: aiEvent.title,
      startTime,
      endTime,
      location: aiEvent.location,
      description: description || undefined,
      isAllDay: aiEvent.all_day ?? !aiEvent.start_time,
    });

    confidenceScores.push(aiEvent.confidence ?? 0.8);
  });

  return { events, confidenceScores };
}

export async function parseWithAI(file: File): Promise<SmartParseResult> {
  const sourceFormat: ImportSourceFormat = file.type === 'application/pdf' ? 'pdf' : 'image';

  try {
    const fileExt = file.name.split('.').pop() ?? 'bin';
    const filePath = `calendar-imports/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('trip-media')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return {
        events: [],
        errors: [`Failed to upload file: ${uploadError.message}`],
        isValid: false,
        sourceFormat,
      };
    }

    const { data: urlData } = supabase.storage.from('trip-media').getPublicUrl(filePath);

    const { data, error } = await supabase.functions.invoke('enhanced-ai-parser', {
      body: {
        fileUrl: urlData.publicUrl,
        fileType: file.type,
        extractionType: 'calendar',
        messageText: `Extract ALL scheduled events from this ${sourceFormat === 'pdf' ? 'PDF document' : 'image'}. Include shows, concerts, performances, festivals, meetings, and any time-bound events.`,
      },
    });

    // Cleanup uploaded file
    await supabase.storage.from('trip-media').remove([filePath]);

    if (error) {
      return {
        events: [],
        errors: [`AI parsing failed: ${error.message}`],
        isValid: false,
        sourceFormat,
      };
    }

    const aiEvents: AIExtractedEvent[] = data?.extracted_data?.events ?? [];
    if (aiEvents.length === 0) {
      return {
        events: [],
        errors: ['No calendar events found in the file'],
        isValid: false,
        sourceFormat,
      };
    }

    const { events, confidenceScores } = mapAIEventsToICS(aiEvents);

    return {
      events,
      errors: [],
      isValid: events.length > 0,
      sourceFormat,
      confidenceScores,
    };
  } catch (err) {
    return {
      events: [],
      errors: [`AI parsing error: ${err instanceof Error ? err.message : 'Unknown error'}`],
      isValid: false,
      sourceFormat,
    };
  }
}

export async function parseTextWithAI(text: string): Promise<SmartParseResult> {
  try {
    const { data, error } = await supabase.functions.invoke('enhanced-ai-parser', {
      body: {
        messageText: text,
        extractionType: 'calendar',
      },
    });

    if (error) {
      return {
        events: [],
        errors: [`AI parsing failed: ${error.message}`],
        isValid: false,
        sourceFormat: 'text',
      };
    }

    const aiEvents: AIExtractedEvent[] = data?.extracted_data?.events ?? [];
    if (aiEvents.length === 0) {
      return {
        events: [],
        errors: ['No calendar events found in the text'],
        isValid: false,
        sourceFormat: 'text',
      };
    }

    const { events, confidenceScores } = mapAIEventsToICS(aiEvents);

    return {
      events,
      errors: [],
      isValid: events.length > 0,
      sourceFormat: 'text',
      confidenceScores,
    };
  } catch (err) {
    return {
      events: [],
      errors: [`AI parsing error: ${err instanceof Error ? err.message : 'Unknown error'}`],
      isValid: false,
      sourceFormat: 'text',
    };
  }
}

// ─── Main Router ─────────────────────────────────────────────────────────────

function getFileFormat(file: File): ImportSourceFormat {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'ics') return 'ics';
  if (ext === 'csv') return 'csv';
  if (ext === 'xlsx' || ext === 'xls') return 'excel';
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'image';

  // Fallback to mime type
  if (file.type === 'text/calendar') return 'ics';
  if (file.type === 'text/csv') return 'csv';
  if (file.type.includes('spreadsheet') || file.type.includes('excel')) return 'excel';
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('image/')) return 'image';

  return 'text';
}

export async function parseCalendarFile(file: File): Promise<SmartParseResult> {
  const format = getFileFormat(file);

  switch (format) {
    case 'ics': {
      const result = await parseICSFile(file);
      return { ...result, sourceFormat: 'ics' };
    }
    case 'csv':
      return parseCSVCalendar(file);
    case 'excel':
      return parseExcelCalendar(file);
    case 'pdf':
    case 'image':
      return parseWithAI(file);
    default:
      return {
        events: [],
        errors: ['Unsupported file format'],
        isValid: false,
        sourceFormat: format,
      };
  }
}

/** Human-readable label for the source format */
export function getFormatLabel(format: ImportSourceFormat): string {
  switch (format) {
    case 'ics':
      return 'ICS Calendar';
    case 'csv':
      return 'CSV Spreadsheet';
    case 'excel':
      return 'Excel Spreadsheet';
    case 'pdf':
      return 'PDF Document';
    case 'image':
      return 'Image';
    case 'text':
      return 'Pasted Text';
    case 'url':
      return 'Website URL';
    default:
      return 'Unknown';
  }
}

// ─── URL Schedule Parser ─────────────────────────────────────────────────────

interface ScrapeScheduleEvent {
  title: string;
  date: string;
  start_time?: string;
  location?: string;
}

export async function parseURLSchedule(url: string): Promise<SmartParseResult> {
  try {
    const { data, error } = await supabase.functions.invoke('scrape-schedule', {
      body: { url },
    });

    if (error) {
      return {
        events: [],
        errors: [`Failed to scan website: ${error.message}`],
        isValid: false,
        sourceFormat: 'url',
      };
    }

    if (!data?.success) {
      return {
        events: [],
        errors: [data?.error || 'No schedule data found on this page'],
        isValid: false,
        sourceFormat: 'url',
        urlMeta: data?.events_found
          ? { eventsFound: data.events_found, eventsFiltered: data.events_filtered }
          : undefined,
      };
    }

    const scheduleEvents: ScrapeScheduleEvent[] = data.events ?? [];
    const events: ICSParsedEvent[] = [];
    for (let i = 0; i < scheduleEvents.length; i++) {
      const se = scheduleEvents[i];
      const startTime = parseFlexibleDate(se.date, se.start_time);
      if (!startTime) continue;

      events.push({
        uid: `imported-url-${Date.now()}-${i}`,
        title: se.title,
        startTime,
        endTime: startTime,
        location: se.location,
        isAllDay: !se.start_time,
      });
    }

    return {
      events,
      errors: [],
      isValid: events.length > 0,
      sourceFormat: 'url',
      urlMeta: {
        eventsFound: data.events_found,
        eventsFiltered: data.events_filtered,
      },
    };
  } catch (err) {
    return {
      events: [],
      errors: [`Website scan error: ${err instanceof Error ? err.message : 'Unknown error'}`],
      isValid: false,
      sourceFormat: 'url',
    };
  }
}
