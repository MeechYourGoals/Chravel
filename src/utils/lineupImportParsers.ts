import { supabase } from '@/integrations/supabase/client';

export type LineupSourceFormat = 'url' | 'text';

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
