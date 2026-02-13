/**
 * Agenda Import Parsers
 *
 * Routes agenda imports to the appropriate parser:
 * - PDF / Images → enhanced-ai-parser with extractionType: 'agenda'
 * - URL → scrape-agenda edge function
 * - Plain text → enhanced-ai-parser with extractionType: 'agenda'
 *
 * All return a unified AgendaParseResult.
 */

import { supabase } from '@/integrations/supabase/client';
import type { EventAgendaItem } from '@/types/events';

export type AgendaSourceFormat = 'pdf' | 'image' | 'url' | 'text';

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

// ─── File Parser (PDF / Image) ───────────────────────────────────────────────

export async function parseAgendaFile(file: File): Promise<AgendaParseResult> {
  const sourceFormat: AgendaSourceFormat = file.type === 'application/pdf' ? 'pdf' : 'image';
  let filePath: string | null = null;

  try {
    // Upload file to Supabase storage (temp)
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
        // Best-effort cleanup for temporary upload
      }
    }
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
      if (s.track?.trim()) session.track = s.track.trim();
      if (s.speakers && Array.isArray(s.speakers) && s.speakers.length > 0) {
        const cleaned = s.speakers
          .filter(sp => sp && typeof sp === 'string' && sp.trim())
          .map(sp => sp.trim());
        if (cleaned.length > 0) session.speakers = cleaned;
      }
      return session;
    });
}
