/**
 * Normalize optional session resumption handles from client/server payloads.
 *
 * Vertex setup rejects malformed optional fields, so blank/whitespace values
 * must be treated as absent and omitted from setup payloads.
 */
export function normalizeResumptionToken(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
