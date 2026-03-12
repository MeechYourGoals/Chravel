import { describe, expect, it } from 'vitest';
import { getReactionTooltipText } from '../MessageReactionBar';

describe('getReactionTooltipText', () => {
  it('returns joined display names for reaction users', () => {
    const tooltip = getReactionTooltipText(['u1', 'u2'], {
      u1: 'Alex',
      u2: 'Jordan',
    });

    expect(tooltip).toBe('Alex, Jordan');
  });

  it('falls back safely for unknown users', () => {
    const tooltip = getReactionTooltipText(['u1'], {});

    expect(tooltip).toBe('Someone');
  });
});
