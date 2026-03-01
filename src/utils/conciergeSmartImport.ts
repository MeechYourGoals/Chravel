/**
 * Concierge Smart Import Pipeline
 *
 * Shared extraction layer used by both the Calendar Import Modal and the
 * AI Concierge. Accepts images, PDFs, and text, routes them through the
 * existing enhanced-ai-parser edge function, and returns normalised
 * ExtractedCalendarItem[] that the concierge can preview before writing.
 */

import { supabase } from '@/integrations/supabase/client';
import { createHash } from '@/utils/importHash';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ExtractedItemKind =
  | 'flight'
  | 'hotel'
  | 'event'
  | 'restaurant'
  | 'car'
  | 'train'
  | 'other';

export interface ExtractedCalendarItem {
  /** Client-generated id for selection */
  id: string;
  kind: ExtractedItemKind;
  title: string;
  /** ISO 8601 */
  startDatetime: string;
  /** ISO 8601, may be null for point-in-time events */
  endDatetime: string | null;
  /** IANA timezone if detectible (e.g. "America/Los_Angeles") */
  timezone: string | null;
  locationName: string | null;
  locationAddress: string | null;
  notes: string | null;
  /** Original source reference */
  source: string;
  /** 0..1 confidence from the AI parser */
  confidence: number;
  /** User-facing warnings (e.g. "Missing time", "Ambiguous timezone") */
  warnings: string[];
  /** Deterministic hash for idempotency: hash(tripId + title + startDatetime + source) */
  importHash: string | null;
  /** Suggested calendar category mapping */
  category: string;
}

export interface SmartImportPipelineResult {
  items: ExtractedCalendarItem[];
  errors: string[];
  sourceFormat: 'image' | 'pdf' | 'text';
}

// ─── Kind → Category mapping ────────────────────────────────────────────────

function kindToCategory(kind: ExtractedItemKind): string {
  switch (kind) {
    case 'flight':
    case 'train':
    case 'car':
      return 'transportation';
    case 'hotel':
      return 'lodging';
    case 'restaurant':
      return 'dining';
    case 'event':
      return 'activity';
    default:
      return 'other';
  }
}

function inferKind(title: string, category?: string): ExtractedItemKind {
  const lower = (title + ' ' + (category ?? '')).toLowerCase();
  if (/\b(flight|airline|boarding|depart|arrive|terminal)\b/.test(lower)) return 'flight';
  if (/\b(hotel|inn|resort|suite|check.?in|check.?out|booking|reservation)\b/.test(lower))
    return 'hotel';
  if (/\b(train|rail|amtrak)\b/.test(lower)) return 'train';
  if (/\b(car|rental|hertz|avis|enterprise)\b/.test(lower)) return 'car';
  if (/\b(restaurant|dinner|lunch|brunch|cafe|bistro|dining)\b/.test(lower)) return 'restaurant';
  return 'event';
}

// ─── Pipeline: Image / PDF ──────────────────────────────────────────────────

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

/**
 * Parse an image or PDF attachment through the enhanced-ai-parser edge
 * function, returning normalised ExtractedCalendarItem[].
 *
 * Accepts the attachment as a base64-encoded data string + mimeType so that
 * both the Concierge (which already has a base64 payload) and the Calendar
 * Import Modal (which has a File object) can call this without re-encoding.
 */
export async function parseAttachmentForCalendar(
  base64Data: string,
  mimeType: string,
  fileName: string,
  tripId: string,
): Promise<SmartImportPipelineResult> {
  const sourceFormat: 'image' | 'pdf' = mimeType === 'application/pdf' ? 'pdf' : 'image';

  let filePath: string | null = null;

  try {
    const ext = fileName.split('.').pop() ?? 'bin';
    filePath = `calendar-imports/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    // Decode base64 → Uint8Array for upload
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const { error: uploadError } = await supabase.storage
      .from('trip-media')
      .upload(filePath, bytes, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      return {
        items: [],
        errors: [`Failed to upload file: ${uploadError.message}`],
        sourceFormat,
      };
    }

    const { data: urlData } = supabase.storage.from('trip-media').getPublicUrl(filePath);

    const { data, error } = await supabase.functions.invoke('enhanced-ai-parser', {
      body: {
        fileUrl: urlData.publicUrl,
        fileType: mimeType,
        extractionType: 'calendar',
        messageText: `Extract ALL scheduled events, reservations, flights, check-ins, and bookings from this ${sourceFormat}. Include confirmation numbers, times, locations, and any relevant details.`,
      },
    });

    if (error) {
      return {
        items: [],
        errors: [`AI parsing failed: ${error.message}`],
        sourceFormat,
      };
    }

    const aiEvents: AIExtractedEvent[] = data?.extracted_data?.events ?? [];
    if (aiEvents.length === 0) {
      return {
        items: [],
        errors: ['No calendar events found in the attachment'],
        sourceFormat,
      };
    }

    const items = aiEvents.map((evt, idx) => mapAIEventToExtracted(evt, idx, fileName, tripId));

    return { items, errors: [], sourceFormat };
  } catch (err) {
    return {
      items: [],
      errors: [`Parsing error: ${err instanceof Error ? err.message : 'Unknown error'}`],
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

/**
 * Parse plain text (pasted confirmation email, etc.) through the AI parser.
 */
export async function parseTextForCalendar(
  text: string,
  tripId: string,
): Promise<SmartImportPipelineResult> {
  try {
    const { data, error } = await supabase.functions.invoke('enhanced-ai-parser', {
      body: {
        messageText: text,
        extractionType: 'calendar',
      },
    });

    if (error) {
      return { items: [], errors: [`AI parsing failed: ${error.message}`], sourceFormat: 'text' };
    }

    const aiEvents: AIExtractedEvent[] = data?.extracted_data?.events ?? [];
    if (aiEvents.length === 0) {
      return { items: [], errors: ['No events found in the text'], sourceFormat: 'text' };
    }

    const items = aiEvents.map((evt, idx) =>
      mapAIEventToExtracted(evt, idx, 'pasted-text', tripId),
    );

    return { items, errors: [], sourceFormat: 'text' };
  } catch (err) {
    return {
      items: [],
      errors: [`Parsing error: ${err instanceof Error ? err.message : 'Unknown error'}`],
      sourceFormat: 'text',
    };
  }
}

// ─── Internal mapper ────────────────────────────────────────────────────────

function mapAIEventToExtracted(
  evt: AIExtractedEvent,
  index: number,
  source: string,
  tripId: string,
): ExtractedCalendarItem {
  const warnings: string[] = [];

  // Build ISO start datetime
  let startDatetime: string;
  if (evt.start_time && evt.date) {
    startDatetime = buildISO(evt.date, evt.start_time);
  } else if (evt.date) {
    startDatetime = new Date(evt.date).toISOString();
    if (!evt.all_day) warnings.push('Missing time — defaulting to all-day');
  } else {
    startDatetime = new Date().toISOString();
    warnings.push('Missing date — using today');
  }

  // Build end datetime
  let endDatetime: string | null = null;
  if (evt.end_time && evt.date) {
    endDatetime = buildISO(evt.date, evt.end_time);
  }

  const kind = inferKind(evt.title, evt.category);

  const notes =
    [
      evt.source_text ? `Source: ${evt.source_text}` : '',
      evt.confirmation_number ? `Confirmation: ${evt.confirmation_number}` : '',
    ]
      .filter(Boolean)
      .join('\n') || null;

  const importHash = createHash(tripId, evt.title, startDatetime, source);

  return {
    id: `extracted-${Date.now()}-${index}`,
    kind,
    title: evt.title,
    startDatetime,
    endDatetime,
    timezone: null,
    locationName: evt.location ?? null,
    locationAddress: null,
    notes,
    source,
    confidence: evt.confidence ?? 0.8,
    warnings,
    importHash,
    category: kindToCategory(kind),
  };
}

function buildISO(dateStr: string, timeStr: string): string {
  try {
    // Try combined parsing
    const combined = new Date(`${dateStr}T${timeStr}`);
    if (!isNaN(combined.getTime())) return combined.toISOString();

    // Fallback: parse date and time separately
    const datePart = new Date(dateStr);
    if (isNaN(datePart.getTime())) return new Date().toISOString();

    const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2] || '0', 10);
      const ampm = timeMatch[3]?.toLowerCase();
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      datePart.setHours(hours, minutes, 0, 0);
    }

    return datePart.toISOString();
  } catch {
    return new Date().toISOString();
  }
}
