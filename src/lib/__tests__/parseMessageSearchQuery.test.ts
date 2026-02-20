import { parseMessageSearchQuery, type ParsedMessageSearchQuery } from '../parseMessageSearchQuery';

describe('parseMessageSearchQuery', () => {
  describe('plain text (backward compatible)', () => {
    it('returns entire input as text when no tokens', () => {
      expect(parseMessageSearchQuery('hello world')).toEqual({
        text: 'hello world',
      });
    });

    it('returns empty text for empty input', () => {
      expect(parseMessageSearchQuery('')).toEqual({ text: '' });
      expect(parseMessageSearchQuery('   ')).toEqual({ text: '' });
    });
  });

  describe('from: sender filter', () => {
    it('extracts from:Coach', () => {
      const r = parseMessageSearchQuery('from:Coach practice');
      expect(r.sender).toBe('Coach');
      expect(r.text).toBe('practice');
    });

    it('extracts from:"Coach Mike"', () => {
      const r = parseMessageSearchQuery('from:"Coach Mike" meeting');
      expect(r.sender).toBe('Coach Mike');
      expect(r.text).toBe('meeting');
    });

    it('extracts from: with no remaining text', () => {
      const r = parseMessageSearchQuery('from:Coach');
      expect(r.sender).toBe('Coach');
      expect(r.text).toBe('');
    });
  });

  describe('broadcast filter', () => {
    it('extracts broadcast keyword', () => {
      const r = parseMessageSearchQuery('broadcast meeting');
      expect(r.isBroadcastOnly).toBe(true);
      expect(r.text).toBe('meeting');
    });

    it('broadcast from:Coach extracts both', () => {
      const r = parseMessageSearchQuery('broadcast from:Coach practice');
      expect(r.isBroadcastOnly).toBe(true);
      expect(r.sender).toBe('Coach');
      expect(r.text).toBe('practice');
    });

    it('from:Coach broadcast practice extracts both', () => {
      const r = parseMessageSearchQuery('from:Coach broadcast practice');
      expect(r.isBroadcastOnly).toBe(true);
      expect(r.sender).toBe('Coach');
      expect(r.text).toBe('practice');
    });
  });

  describe('day/weekday filter', () => {
    it('day:Tuesday extracts weekday', () => {
      const r = parseMessageSearchQuery('day:Tuesday meeting');
      expect(r.weekday).toBe(2); // Tuesday = 2
      expect(r.text).toBe('meeting');
    });

    it('Tuesday as convenience sets weekday + default range', () => {
      const r = parseMessageSearchQuery('Tuesday');
      expect(r.weekday).toBe(2);
      expect(r.rangePreset).toBe('last14d');
      expect(r.after).toBeDefined();
      expect(r.before).toBeDefined();
      expect(r.text).toBe('');
    });

    it('Tuesday meeting extracts weekday and keeps meeting as text', () => {
      const r = parseMessageSearchQuery('Tuesday meeting');
      expect(r.weekday).toBe(2);
      expect(r.rangePreset).toBe('last14d');
      expect(r.text).toBe('meeting');
    });

    it('day:Monday extracts 1', () => {
      const r = parseMessageSearchQuery('day:Monday');
      expect(r.weekday).toBe(1);
    });

    it('day:Sunday extracts 0', () => {
      const r = parseMessageSearchQuery('day:Sunday');
      expect(r.weekday).toBe(0);
    });
  });

  describe('after/before date filter', () => {
    it('after:2026-02-01 extracts date', () => {
      const r = parseMessageSearchQuery('after:2026-02-01 meeting');
      expect(r.after).toEqual(new Date(Date.UTC(2026, 1, 1)));
      expect(r.text).toBe('meeting');
    });

    it('before:2026-02-15 extracts date', () => {
      const r = parseMessageSearchQuery('before:2026-02-15');
      expect(r.before).toEqual(new Date(Date.UTC(2026, 1, 15)));
    });

    it('day:Tuesday after:2026-02-01 before:2026-02-15', () => {
      const r = parseMessageSearchQuery('day:Tuesday after:2026-02-01 before:2026-02-15');
      expect(r.weekday).toBe(2);
      expect(r.after).toEqual(new Date(Date.UTC(2026, 1, 1)));
      expect(r.before).toEqual(new Date(Date.UTC(2026, 1, 15)));
    });
  });

  describe('range preset', () => {
    it('range:last7d sets preset and dates', () => {
      const r = parseMessageSearchQuery('range:last7d meeting');
      expect(r.rangePreset).toBe('last7d');
      expect(r.after).toBeDefined();
      expect(r.before).toBeDefined();
      expect(r.text).toBe('meeting');
    });

    it('range:last14d sets preset', () => {
      const r = parseMessageSearchQuery('range:last14d');
      expect(r.rangePreset).toBe('last14d');
    });

    it('range:last30d sets preset', () => {
      const r = parseMessageSearchQuery('range:last30d');
      expect(r.rangePreset).toBe('last30d');
    });
  });

  describe('combined filters', () => {
    it('broadcast from:Coach practice', () => {
      const r = parseMessageSearchQuery('broadcast from:Coach practice');
      expect(r).toMatchObject({
        text: 'practice',
        sender: 'Coach',
        isBroadcastOnly: true,
      });
    });

    it('from:Coach day:Tuesday after:2026-02-01', () => {
      const r = parseMessageSearchQuery('from:Coach day:Tuesday after:2026-02-01 meeting');
      expect(r).toMatchObject({
        text: 'meeting',
        sender: 'Coach',
        weekday: 2,
        after: new Date(Date.UTC(2026, 1, 1)),
      });
    });
  });

  describe('invalid dates', () => {
    it('ignores malformed after: (invalid month)', () => {
      const r = parseMessageSearchQuery('after:2026-13-01 meeting');
      expect(r.after).toBeUndefined();
      expect(r.text).toBe('meeting');
    });
  });
});
