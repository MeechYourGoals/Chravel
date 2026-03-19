import { describe, expect, it } from 'vitest';
import { normalizeResumptionToken } from '../voiceSessionResumption.ts';

describe('normalizeResumptionToken', () => {
  it('returns undefined for non-string values', () => {
    expect(normalizeResumptionToken(undefined)).toBeUndefined();
    expect(normalizeResumptionToken(null)).toBeUndefined();
    expect(normalizeResumptionToken(123)).toBeUndefined();
    expect(normalizeResumptionToken({})).toBeUndefined();
  });

  it('returns undefined for blank or whitespace strings', () => {
    expect(normalizeResumptionToken('')).toBeUndefined();
    expect(normalizeResumptionToken('   ')).toBeUndefined();
    expect(normalizeResumptionToken('\n\t')).toBeUndefined();
  });

  it('trims and returns valid tokens', () => {
    expect(normalizeResumptionToken('abc-token')).toBe('abc-token');
    expect(normalizeResumptionToken('  abc-token  ')).toBe('abc-token');
  });
});
