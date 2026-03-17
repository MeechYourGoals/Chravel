import { describe, expect, it } from 'vitest';
import { getDemoTripCoverFallback } from '../demoTripCoverFallbacks';

describe('getDemoTripCoverFallback', () => {
  it('returns a local fallback cover for known demo trip ids', () => {
    expect(getDemoTripCoverFallback(1)).toBeTruthy();
    expect(getDemoTripCoverFallback('12')).toBeTruthy();
  });

  it('returns undefined for unknown ids', () => {
    expect(getDemoTripCoverFallback('999')).toBeUndefined();
  });
});
