import { parseMessageSearchQuery } from '../parseMessageSearchQuery';

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

  describe('combined filters', () => {
    it('broadcast from:Coach practice', () => {
      const r = parseMessageSearchQuery('broadcast from:Coach practice');
      expect(r).toMatchObject({
        text: 'practice',
        sender: 'Coach',
        isBroadcastOnly: true,
      });
    });
  });
});
