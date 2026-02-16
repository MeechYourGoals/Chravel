import { supabase } from '@/integrations/supabase/client';
import { parseICSContent } from './calendarImport';
import * as XLSX from 'xlsx';

export type LineupSourceFormat = 'url' | 'text' | 'ics' | 'csv' | 'excel' | 'pdf' | 'image';

export interface LineupParseResult {
  names: string[];
  errors: string[];
  isValid: boolean;
  sourceFormat: LineupSourceFormat;
  namesFound?: number;
}

function normalizeNames(rawNames: unknown): string[] {
  if (!Array.isArray(rawNames)) return [];

  const deduped = new Map<string, string>();
  for (const value of rawNames) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;

    const key = trimmed.toLocaleLowerCase();
    if (!deduped.has(key)) deduped.set(key, trimmed);
  }

  return Array.from(deduped.values()).sort((a, b) => a.localeCompare(b));
}

async function parseLineup(source: { url?: string; text?: string }): Promise<LineupParseResult> {
  const sourceFormat: LineupSourceFormat = source.url ? 'url' : 'text';

  try {
    const { data, error } = await supabase.functions.invoke('scrape-lineup', {
      body: source,
    });

    if (error) {
      return {
        names: [],
        errors: [`Failed to extract lineup: ${error.message}`],
        isValid: false,
        sourceFormat,
      };
    }

    const names = normalizeNames(data?.names ?? []);

    if (!data?.success || names.length === 0) {
      return {
        names: [],
        errors: [data?.error || 'No lineup names found in the provided source'],
        isValid: false,
        sourceFormat,
        namesFound: data?.names_found,
      };
    }

    return {
      names,
      errors: [],
      isValid: true,
      sourceFormat,
      namesFound: data?.names_found ?? names.length,
    };
  } catch (error) {
    return {
      names: [],
      errors: [
        `Couldn't extract names from that link—try another URL or paste text (${error instanceof Error ? error.message : 'Unknown error'})`,
      ],
      isValid: false,
      sourceFormat,
    };
  }
}

export function parseLineupURL(url: string): Promise<LineupParseResult> {
  return parseLineup({ url: url.trim() });
}

export function parseLineupText(text: string): Promise<LineupParseResult> {
  return parseLineup({ text: text.trim() });
}

// ─── ICS Parser (extract SUMMARY as performer names) ─────────────────────────

async function parseICSLineup(file: File): Promise<LineupParseResult> {
  const content = await file.text();
  const result = parseICSContent(content);
  if (!result.isValid || result.events.length === 0) {
    return {
      names: [],
      errors: result.errors.length > 0 ? result.errors : ['No events found in ICS file'],
      isValid: false,
      sourceFormat: 'ics',
    };
  }
  const names = normalizeNames(result.events.map(e => e.title));
  return {
    names,
    errors: result.errors,
    isValid: names.length > 0,
    sourceFormat: 'ics',
  };
}

// ─── CSV/Excel Column Detection (name/speaker/artist) ─────────────────────────

const NAME_COLUMN_PATTERNS =
  /^(name|names|speaker|speakers|artist|artists|performer|performers|act|band|headliner)$/i;

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

async function parseCSVLineup(file: File): Promise<LineupParseResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 1) {
    return { names: [], errors: ['CSV is empty'], isValid: false, sourceFormat: 'csv' };
  }
  const headers = parseCSVLine(lines[0]);
  const nameIndex = headers.findIndex(h => NAME_COLUMN_PATTERNS.test(h.trim()));
  if (nameIndex === -1) {
    return {
      names: [],
      errors: [`Could not detect name column. Headers: ${headers.join(', ')}`],
      isValid: false,
      sourceFormat: 'csv',
    };
  }
  const names: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const val = row[nameIndex]?.trim();
    if (val) names.push(val);
  }
  const normalized = normalizeNames(names);
  return {
    names: normalized,
    errors: [],
    isValid: normalized.length > 0,
    sourceFormat: 'csv',
  };
}

async function parseExcelLineup(file: File): Promise<LineupParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  if (workbook.SheetNames.length === 0) {
    return { names: [], errors: ['Excel has no sheets'], isValid: false, sourceFormat: 'excel' };
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][];
  if (jsonData.length < 1) {
    return {
      names: [],
      errors: ['Excel sheet is empty'],
      isValid: false,
      sourceFormat: 'excel',
    };
  }
  const headers = (jsonData[0] ?? []).map(h => String(h ?? '').trim());
  const nameIndex = headers.findIndex(h => NAME_COLUMN_PATTERNS.test(h));
  if (nameIndex === -1) {
    return {
      names: [],
      errors: [`Could not detect name column. Headers: ${headers.join(', ')}`],
      isValid: false,
      sourceFormat: 'excel',
    };
  }
  const names: string[] = [];
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] ?? [];
    const val = row[nameIndex];
    const str = typeof val === 'string' ? val : val instanceof Date ? '' : String(val ?? '');
    if (str.trim()) names.push(str.trim());
  }
  const normalized = normalizeNames(names);
  return {
    names: normalized,
    errors: [],
    isValid: normalized.length > 0,
    sourceFormat: 'excel',
  };
}

// ─── AI Parser (PDF / Image) ─────────────────────────────────────────────────

async function parseLineupFileAI(file: File): Promise<LineupParseResult> {
  const sourceFormat: LineupSourceFormat = file.type === 'application/pdf' ? 'pdf' : 'image';
  let filePath: string | null = null;

  try {
    const fileExt = file.name.split('.').pop() ?? 'bin';
    filePath = `lineup-imports/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('trip-media')
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      return {
        names: [],
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
        messageText: `Extract all performer, speaker, artist, or band names from this ${sourceFormat === 'pdf' ? 'PDF' : 'image'}. Focus on lineup posters, artist lists, and schedule documents.`,
      },
    });

    if (error) {
      return {
        names: [],
        errors: [`AI parsing failed: ${error.message}`],
        isValid: false,
        sourceFormat,
      };
    }

    const rawSessions = data?.sessions ?? [];
    const namesFromSpeakers = rawSessions.flatMap((s: { speakers?: string[] }) =>
      Array.isArray(s.speakers)
        ? s.speakers.filter((n: unknown) => typeof n === 'string' && (n as string).trim())
        : [],
    );
    const namesFromTitles = rawSessions
      .map((s: { title?: string }) => (typeof s.title === 'string' ? s.title.trim() : ''))
      .filter(Boolean);
    const allNames = namesFromSpeakers.length > 0 ? namesFromSpeakers : namesFromTitles;
    const names = normalizeNames(allNames);

    return {
      names,
      errors: names.length === 0 ? ['No lineup names found in the file'] : [],
      isValid: names.length > 0,
      sourceFormat,
    };
  } catch (err) {
    return {
      names: [],
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

function getLineupFileFormat(file: File): LineupSourceFormat {
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
  return 'pdf';
}

/** Main file router: ICS, CSV, Excel, PDF, Image */
export async function parseLineupFile(file: File): Promise<LineupParseResult> {
  const format = getLineupFileFormat(file);
  switch (format) {
    case 'ics':
      return parseICSLineup(file);
    case 'csv':
      return parseCSVLineup(file);
    case 'excel':
      return parseExcelLineup(file);
    case 'pdf':
    case 'image':
      return parseLineupFileAI(file);
    default:
      return parseLineupFileAI(file);
  }
}
