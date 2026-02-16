/**
 * Agenda Import Parsers
 *
 * Routes agenda imports to the appropriate parser:
 * - ICS → parseICSContent, convert to sessions
 * - CSV / Excel → client-side column detection
 * - PDF / Images → enhanced-ai-parser with extractionType: 'agenda'
 * - URL → scrape-agenda edge function
 * - Plain text → enhanced-ai-parser with extractionType: 'agenda'
 *
 * All return a unified AgendaParseResult. Best-effort: only populate fields present in source.
 */

import { supabase } from '@/integrations/supabase/client';
import type { EventAgendaItem } from '@/types/events';
import { parseICSContent, ICSParsedEvent } from './calendarImport';
import * as XLSX from 'xlsx';

export type AgendaSourceFormat = 'ics' | 'csv' | 'excel' | 'pdf' | 'image' | 'url' | 'text';

/** A parsed session before it gets an ID (ready for addSession) */
export type ParsedAgendaSession = Omit<EventAgendaItem, 'id'>;

export interface AgendaParseResult {
  sessions: ParsedAgendaSession[];
  errors: string[];
  isValid: boolean;
  sourceFormat: AgendaSourceFormat;
  /** How many sessions the source originally contained (for URL imports) */
  sessionsFound?: number;
}

// ─── ICS Parser ──────────────────────────────────────────────────────────────

function icsEventToSession(event: ICSParsedEvent, index: number): ParsedAgendaSession {
  const session: ParsedAgendaSession = { title: event.title };
  const dateStr = event.startTime.toISOString().split('T')[0];
  session.session_date = dateStr;
  if (!event.isAllDay) {
    session.start_time = event.startTime.toTimeString().slice(0, 5);
    if (event.endTime.getTime() !== event.startTime.getTime()) {
      session.end_time = event.endTime.toTimeString().slice(0, 5);
    }
  }
  if (event.location) session.location = event.location;
  if (event.description) session.description = event.description;
  return session;
}

async function parseICSAgenda(file: File): Promise<AgendaParseResult> {
  const content = await file.text();
  const result = parseICSContent(content);
  if (!result.isValid || result.events.length === 0) {
    return {
      sessions: [],
      errors: result.errors.length > 0 ? result.errors : ['No events found in ICS file'],
      isValid: false,
      sourceFormat: 'ics',
    };
  }
  const sessions = result.events.map((e, i) => icsEventToSession(e, i));
  return {
    sessions,
    errors: result.errors,
    isValid: sessions.length > 0,
    sourceFormat: 'ics',
  };
}

// ─── CSV/Excel Column Detection (Agenda) ──────────────────────────────────────

const AGENDA_COLUMN_PATTERNS = {
  date: /^(date|day|session.?date|when|scheduled)$/i,
  title: /^(title|session|name|event|summary|subject|talk|panel|workshop|activity|event.?name)$/i,
  startTime: /^(start|start.?time|time|begins|from|at)$/i,
  endTime: /^(end|end.?time|ends|to|until)$/i,
  location: /^(location|room|venue|where|place|stage|hall)$/i,
  speakers: /^(speaker|speakers|presenter|performers|artist|panelists)$/i,
  description: /^(description|details|notes|info|about)$/i,
};

interface AgendaColumnMapping {
  title: number;
  date?: number;
  startTime?: number;
  endTime?: number;
  location?: number;
  speakers?: number;
  description?: number;
}

function detectAgendaColumns(headers: string[]): AgendaColumnMapping | null {
  const mapping: Partial<AgendaColumnMapping> = {};
  headers.forEach((header, index) => {
    const t = header.trim();
    if (AGENDA_COLUMN_PATTERNS.title.test(t) && mapping.title === undefined) mapping.title = index;
    else if (AGENDA_COLUMN_PATTERNS.date.test(t) && mapping.date === undefined)
      mapping.date = index;
    else if (AGENDA_COLUMN_PATTERNS.startTime.test(t) && mapping.startTime === undefined)
      mapping.startTime = index;
    else if (AGENDA_COLUMN_PATTERNS.endTime.test(t) && mapping.endTime === undefined)
      mapping.endTime = index;
    else if (AGENDA_COLUMN_PATTERNS.location.test(t) && mapping.location === undefined)
      mapping.location = index;
    else if (AGENDA_COLUMN_PATTERNS.speakers.test(t) && mapping.speakers === undefined)
      mapping.speakers = index;
    else if (AGENDA_COLUMN_PATTERNS.description.test(t) && mapping.description === undefined)
      mapping.description = index;
  });
  if (mapping.title === undefined) return null;
  return mapping as AgendaColumnMapping;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else current += ch;
  }
  result.push(current);
  return result;
}

function rowToAgendaSession(
  row: string[],
  mapping: AgendaColumnMapping,
  index: number,
): ParsedAgendaSession | null {
  const title = row[mapping.title]?.trim();
  if (!title) return null;
  const session: ParsedAgendaSession = { title };
  if (mapping.date !== undefined && row[mapping.date]?.trim()) {
    const d = row[mapping.date].trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) session.session_date = d;
    else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(d)) {
      const [m, day, y] = d.split('/');
      const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
      session.session_date = `${year}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } else session.session_date = d;
  }
  if (mapping.startTime !== undefined && row[mapping.startTime]?.trim())
    session.start_time = row[mapping.startTime].trim();
  if (mapping.endTime !== undefined && row[mapping.endTime]?.trim())
    session.end_time = row[mapping.endTime].trim();
  if (mapping.location !== undefined && row[mapping.location]?.trim())
    session.location = row[mapping.location].trim();
  if (mapping.speakers !== undefined && row[mapping.speakers]?.trim()) {
    const raw = row[mapping.speakers].trim();
    const speakers = raw
      .split(/[,;|]/)
      .map(s => s.trim())
      .filter(Boolean);
    if (speakers.length > 0) session.speakers = speakers;
  }
  if (mapping.description !== undefined && row[mapping.description]?.trim())
    session.description = row[mapping.description].trim();
  return session;
}

async function parseCSVAgenda(file: File): Promise<AgendaParseResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    return { sessions: [], errors: ['CSV has no data rows'], isValid: false, sourceFormat: 'csv' };
  }
  const headers = parseCSVLine(lines[0]);
  const mapping = detectAgendaColumns(headers);
  if (!mapping) {
    return {
      sessions: [],
      errors: [`Could not detect title column. Headers: ${headers.join(', ')}`],
      isValid: false,
      sourceFormat: 'csv',
    };
  }
  const sessions: ParsedAgendaSession[] = [];
  const errors: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const s = rowToAgendaSession(row, mapping, i);
    if (s) sessions.push(s);
    else if (row.some(c => c.trim())) errors.push(`Row ${i + 1}: Could not parse`);
  }
  return {
    sessions,
    errors,
    isValid: sessions.length > 0,
    sourceFormat: 'csv',
  };
}

async function parseExcelAgenda(file: File): Promise<AgendaParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  if (workbook.SheetNames.length === 0) {
    return { sessions: [], errors: ['Excel has no sheets'], isValid: false, sourceFormat: 'excel' };
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][];
  if (jsonData.length < 2) {
    return {
      sessions: [],
      errors: ['Excel sheet has no data rows'],
      isValid: false,
      sourceFormat: 'excel',
    };
  }
  let bestRow = -1;
  let bestMapping: AgendaColumnMapping | null = null;
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i] ?? [];
    const headers = row.map(h => String(h ?? '').trim()).filter(h => h.length > 0);
    const m = detectAgendaColumns(headers);
    if (m && m.title !== undefined) {
      bestRow = i;
      bestMapping = m;
      break;
    }
  }
  if (bestRow === -1 || !bestMapping) {
    return {
      sessions: [],
      errors: [`Could not detect title column. First row: ${(jsonData[0] ?? []).join(', ')}`],
      isValid: false,
      sourceFormat: 'excel',
    };
  }
  const sessions: ParsedAgendaSession[] = [];
  const errors: string[] = [];
  for (let i = bestRow + 1; i < jsonData.length; i++) {
    const rawRow = jsonData[i] ?? [];
    const row = rawRow.map(cell =>
      cell instanceof Date ? cell.toISOString().split('T')[0] : String(cell ?? ''),
    );
    const s = rowToAgendaSession(row, bestMapping, i);
    if (s) sessions.push(s);
    else if (row.some(c => c.trim())) errors.push(`Row ${i + 1}: Could not parse`);
  }
  return {
    sessions,
    errors,
    isValid: sessions.length > 0,
    sourceFormat: 'excel',
  };
}

// ─── AI File Parser (PDF / Image) ─────────────────────────────────────────────

async function parseAgendaFileAI(file: File): Promise<AgendaParseResult> {
  const sourceFormat: AgendaSourceFormat = file.type === 'application/pdf' ? 'pdf' : 'image';
  let filePath: string | null = null;

  try {
    const fileExt = file.name.split('.').pop() ?? 'bin';
    filePath = `agenda-imports/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('trip-media')
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      return {
        sessions: [],
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
        extractionType: 'agenda',
        messageText: `Extract all agenda sessions from this ${sourceFormat === 'pdf' ? 'PDF document' : 'image'}.`,
      },
    });

    if (error) {
      return {
        sessions: [],
        errors: [`AI parsing failed: ${error.message}`],
        isValid: false,
        sourceFormat,
      };
    }

    const rawSessions = data?.sessions ?? [];
    const sessions = mapRawSessions(rawSessions);

    return {
      sessions,
      errors: sessions.length === 0 ? ['No agenda sessions found in the file'] : [],
      isValid: sessions.length > 0,
      sourceFormat,
    };
  } catch (err) {
    return {
      sessions: [],
      errors: [`AI parsing error: ${err instanceof Error ? err.message : 'Unknown error'}`],
      isValid: false,
      sourceFormat,
    };
  } finally {
    if (filePath) {
      try {
        await supabase.storage.from('trip-media').remove([filePath]);
      } catch {
        // Best-effort cleanup
      }
    }
  }
}

function getAgendaFileFormat(file: File): AgendaSourceFormat {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'ics') return 'ics';
  if (ext === 'csv') return 'csv';
  if (ext === 'xlsx' || ext === 'xls') return 'excel';
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'image';
  if (file.type === 'text/calendar') return 'ics';
  if (file.type === 'text/csv') return 'csv';
  if (file.type.includes('spreadsheet') || file.type.includes('excel')) return 'excel';
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('image/')) return 'image';
  return 'text';
}

/** Main file router: ICS, CSV, Excel, PDF, Image */
export async function parseAgendaFile(file: File): Promise<AgendaParseResult> {
  const format = getAgendaFileFormat(file);
  switch (format) {
    case 'ics':
      return parseICSAgenda(file);
    case 'csv':
      return parseCSVAgenda(file);
    case 'excel':
      return parseExcelAgenda(file);
    case 'pdf':
    case 'image':
      return parseAgendaFileAI(file);
    default:
      return {
        sessions: [],
        errors: ['Unsupported file format for agenda import'],
        isValid: false,
        sourceFormat: format,
      };
  }
}

// ─── URL Parser ──────────────────────────────────────────────────────────────

export async function parseAgendaURL(url: string): Promise<AgendaParseResult> {
  try {
    const { data, error } = await supabase.functions.invoke('scrape-agenda', {
      body: { url },
    });

    if (error) {
      return {
        sessions: [],
        errors: [`Failed to scan website: ${error.message}`],
        isValid: false,
        sourceFormat: 'url',
      };
    }

    if (!data?.success) {
      return {
        sessions: [],
        errors: [data?.error || 'No agenda data found on this page'],
        isValid: false,
        sourceFormat: 'url',
        sessionsFound: data?.sessions_found,
      };
    }

    const sessions = mapRawSessions(data.sessions ?? []);

    return {
      sessions,
      errors: [],
      isValid: sessions.length > 0,
      sourceFormat: 'url',
      sessionsFound: data.sessions_found,
    };
  } catch (err) {
    return {
      sessions: [],
      errors: [`Website scan error: ${err instanceof Error ? err.message : 'Unknown error'}`],
      isValid: false,
      sourceFormat: 'url',
    };
  }
}

// ─── Text Parser ─────────────────────────────────────────────────────────────

export async function parseAgendaText(text: string): Promise<AgendaParseResult> {
  try {
    const { data, error } = await supabase.functions.invoke('enhanced-ai-parser', {
      body: {
        messageText: text,
        extractionType: 'agenda',
      },
    });

    if (error) {
      return {
        sessions: [],
        errors: [`AI parsing failed: ${error.message}`],
        isValid: false,
        sourceFormat: 'text',
      };
    }

    const rawSessions = data?.sessions ?? [];
    const sessions = mapRawSessions(rawSessions);

    return {
      sessions,
      errors: sessions.length === 0 ? ['No agenda sessions found in the text'] : [],
      isValid: sessions.length > 0,
      sourceFormat: 'text',
    };
  } catch (err) {
    return {
      sessions: [],
      errors: [`AI parsing error: ${err instanceof Error ? err.message : 'Unknown error'}`],
      isValid: false,
      sourceFormat: 'text',
    };
  }
}

// ─── Shared Mapper ───────────────────────────────────────────────────────────

interface RawAgendaSession {
  title?: string;
  description?: string;
  session_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  track?: string;
  speakers?: string[];
}

/** Normalize string for dedupe key (lowercase, trim, collapse whitespace) */
function normalizeForDedupe(s: string | undefined): string {
  if (!s || typeof s !== 'string') return '';
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Build deterministic dedupe key for a session.
 * dedupe_key = normalize(title) + normalize(date) + normalize(start_time) + normalize(location)
 */
export function buildAgendaDedupeKey(session: ParsedAgendaSession): string {
  return [
    normalizeForDedupe(session.title),
    normalizeForDedupe(session.session_date),
    normalizeForDedupe(session.start_time),
    normalizeForDedupe(session.location),
  ].join('|');
}

/**
 * Find indices of sessions that are duplicates of existing sessions.
 * Uses: title + date + start_time + location (all normalized).
 */
export function findDuplicateAgendaSessions(
  parsed: ParsedAgendaSession[],
  existing: Array<Pick<ParsedAgendaSession, 'title' | 'session_date' | 'start_time' | 'location'>>,
): Set<number> {
  const existingKeys = new Set(existing.map(s => buildAgendaDedupeKey(s)));
  const duplicates = new Set<number>();
  parsed.forEach((s, i) => {
    if (existingKeys.has(buildAgendaDedupeKey(s))) duplicates.add(i);
  });
  return duplicates;
}

function mapRawSessions(raw: RawAgendaSession[]): ParsedAgendaSession[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(s => s.title && typeof s.title === 'string' && s.title.trim().length > 0)
    .map(s => {
      const session: ParsedAgendaSession = { title: s.title!.trim() };
      if (s.description?.trim()) session.description = s.description.trim();
      if (s.session_date?.trim()) session.session_date = s.session_date.trim();
      if (s.start_time?.trim()) session.start_time = s.start_time.trim();
      if (s.end_time?.trim()) session.end_time = s.end_time.trim();
      if (s.location?.trim()) session.location = s.location.trim();
      // Category/track removed per requirements; do not include in output
      if (s.speakers && Array.isArray(s.speakers) && s.speakers.length > 0) {
        const cleaned = s.speakers
          .filter(sp => sp && typeof sp === 'string' && sp.trim())
          .map(sp => sp.trim());
        if (cleaned.length > 0) session.speakers = cleaned;
      }
      return session;
    });
}
