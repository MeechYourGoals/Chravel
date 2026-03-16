import { describe, expect, it } from 'vitest';
import { canInitializeRevenueCat } from './revenuecat';

describe('canInitializeRevenueCat', () => {
  it('skips initialization in Lovable preview', () => {
    expect(canInitializeRevenueCat('rcb_valid_web_key', true)).toBe(false);
  });

  it('skips initialization when the key is missing', () => {
    expect(canInitializeRevenueCat('', false)).toBe(false);
    expect(canInitializeRevenueCat('   ', false)).toBe(false);
  });

  it('skips initialization for non-web RevenueCat keys', () => {
    expect(canInitializeRevenueCat('appl_native_key', false)).toBe(false);
    expect(canInitializeRevenueCat('goog_native_key', false)).toBe(false);
  });

  it('allows initialization for valid web billing keys outside preview', () => {
    expect(canInitializeRevenueCat('rcb_valid_web_key', false)).toBe(true);
  });
});
