import { beforeEach, describe, expect, it } from 'vitest';
import { getState, isOpen, recordFailure, recordSuccess, reset } from '../circuitBreaker';

describe('voice circuitBreaker', () => {
  beforeEach(() => {
    localStorage.clear();
    reset();
  });

  it('opens only after threshold failures', () => {
    expect(recordFailure('err-1')).toBe(false);
    expect(isOpen()).toBe(false);

    expect(recordFailure('err-2')).toBe(false);
    expect(isOpen()).toBe(false);

    expect(recordFailure('err-3')).toBe(true);
    expect(isOpen()).toBe(true);
  });

  it('resets on success after being open', () => {
    recordFailure('a');
    recordFailure('b');
    recordFailure('c');
    expect(isOpen()).toBe(true);

    recordSuccess();
    expect(isOpen()).toBe(false);
    expect(getState().failureCount).toBe(0);
  });

  it('resets fully with reset()', () => {
    recordFailure('a');
    recordFailure('b');
    reset();
    const state = getState();
    expect(state.failureCount).toBe(0);
    expect(state.isOpen).toBe(false);
    expect(state.phase).toBe('closed');
  });
});
