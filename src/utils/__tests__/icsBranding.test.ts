import { describe, it, expect } from 'vitest';
import { brandEventTitleForIcs, shouldSkipBranding, brandEventTitles } from '../icsBranding';

describe('icsBranding', () => {
  describe('brandEventTitleForIcs', () => {
    it('should add ChravelApp prefix to standard event titles', () => {
      expect(brandEventTitleForIcs('Team Meeting')).toBe('ChravelApp: Team Meeting');
      expect(brandEventTitleForIcs('Beach Day')).toBe('ChravelApp: Beach Day');
      expect(brandEventTitleForIcs('Dinner Reservation')).toBe('ChravelApp: Dinner Reservation');
    });

    it('should trim whitespace before applying branding', () => {
      expect(brandEventTitleForIcs('  Team Meeting  ')).toBe('ChravelApp: Team Meeting');
      expect(brandEventTitleForIcs('\t\nBeach Day\n\t')).toBe('ChravelApp: Beach Day');
    });

    it('should not double-prefix when ChravelApp prefix already exists (case-insensitive)', () => {
      expect(brandEventTitleForIcs('ChravelApp: Team Meeting')).toBe('ChravelApp: Team Meeting');
      expect(brandEventTitleForIcs('chravelapp: Beach Day')).toBe('chravelapp: Beach Day');
      expect(brandEventTitleForIcs('CHRAVELAPP: Dinner')).toBe('CHRAVELAPP: Dinner');
      expect(brandEventTitleForIcs('ChRaVeLaPp: Concert')).toBe('ChRaVeLaPp: Concert');
    });

    it('should not prefix titles with ZOOM prefix', () => {
      expect(brandEventTitleForIcs('ZOOM: Daily Standup')).toBe('ZOOM: Daily Standup');
      expect(brandEventTitleForIcs('zoom: Team Sync')).toBe('zoom: Team Sync');
      expect(brandEventTitleForIcs('Zoom: All Hands')).toBe('Zoom: All Hands');
    });

    it('should not prefix titles with Google Meet prefix', () => {
      expect(brandEventTitleForIcs('Google Meet: Interview')).toBe('Google Meet: Interview');
      expect(brandEventTitleForIcs('google meet: Planning Session')).toBe('google meet: Planning Session');
      expect(brandEventTitleForIcs('GOOGLE MEET: Review')).toBe('GOOGLE MEET: Review');
    });

    it('should not prefix titles with Microsoft Teams prefix', () => {
      expect(brandEventTitleForIcs('Teams: Sprint Planning')).toBe('Teams: Sprint Planning');
      expect(brandEventTitleForIcs('teams: Retrospective')).toBe('teams: Retrospective');
      expect(brandEventTitleForIcs('TEAMS: Standup')).toBe('TEAMS: Standup');
      expect(brandEventTitleForIcs('Microsoft Teams: All Hands')).toBe('Microsoft Teams: All Hands');
    });

    it('should not prefix titles with Webex prefix', () => {
      expect(brandEventTitleForIcs('Webex: Client Call')).toBe('Webex: Client Call');
      expect(brandEventTitleForIcs('webex: Demo')).toBe('webex: Demo');
      expect(brandEventTitleForIcs('WEBEX: Training')).toBe('WEBEX: Training');
    });

    it('should not prefix titles with other known meeting platform prefixes', () => {
      expect(brandEventTitleForIcs('Skype: Interview')).toBe('Skype: Interview');
      expect(brandEventTitleForIcs('GoToMeeting: Workshop')).toBe('GoToMeeting: Workshop');
      expect(brandEventTitleForIcs('BlueJeans: Conference')).toBe('BlueJeans: Conference');
    });

    it('should handle empty or null titles with fallback', () => {
      expect(brandEventTitleForIcs('')).toBe('ChravelApp: Chravel Event');
      expect(brandEventTitleForIcs('   ')).toBe('ChravelApp: Chravel Event');
      // @ts-expect-error: Testing null handling
      expect(brandEventTitleForIcs(null)).toBe('ChravelApp: Chravel Event');
      // @ts-expect-error: Testing undefined handling
      expect(brandEventTitleForIcs(undefined)).toBe('ChravelApp: Chravel Event');
    });

    it('should handle titles with special characters', () => {
      expect(brandEventTitleForIcs('Team Meeting @ HQ')).toBe('ChravelApp: Team Meeting @ HQ');
      expect(brandEventTitleForIcs('Q&A Session')).toBe('ChravelApp: Q&A Session');
      expect(brandEventTitleForIcs('Conference: Day 1')).toBe('ChravelApp: Conference: Day 1');
      expect(brandEventTitleForIcs('Review (Final)')).toBe('ChravelApp: Review (Final)');
    });

    it('should handle international characters (UTF-8)', () => {
      expect(brandEventTitleForIcs('Café Meeting')).toBe('ChravelApp: Café Meeting');
      expect(brandEventTitleForIcs('München Trip')).toBe('ChravelApp: München Trip');
      expect(brandEventTitleForIcs('東京 Conference')).toBe('ChravelApp: 東京 Conference');
      expect(brandEventTitleForIcs('Встреча команды')).toBe('ChravelApp: Встреча команды');
    });

    it('should prefix titles that contain meeting platform names but not as prefix', () => {
      expect(brandEventTitleForIcs('Discussion about ZOOM features')).toBe('ChravelApp: Discussion about ZOOM features');
      expect(brandEventTitleForIcs('Comparing Teams vs Slack')).toBe('ChravelApp: Comparing Teams vs Slack');
      expect(brandEventTitleForIcs('How to use Google Meet effectively')).toBe('ChravelApp: How to use Google Meet effectively');
    });

    it('should handle very long titles', () => {
      const longTitle = 'A'.repeat(500);
      const branded = brandEventTitleForIcs(longTitle);
      expect(branded).toBe(`ChravelApp: ${longTitle}`);
      expect(branded.length).toBe(longTitle.length + 'ChravelApp: '.length);
    });

    it('should handle titles with only whitespace variations', () => {
      expect(brandEventTitleForIcs(' \t ')).toBe('ChravelApp: Chravel Event');
      expect(brandEventTitleForIcs('\n\r\n')).toBe('ChravelApp: Chravel Event');
    });
  });

  describe('shouldSkipBranding', () => {
    it('should return true for titles with ChravelApp prefix (case-insensitive)', () => {
      expect(shouldSkipBranding('ChravelApp: Meeting')).toBe(true);
      expect(shouldSkipBranding('chravelapp: Meeting')).toBe(true);
      expect(shouldSkipBranding('CHRAVELAPP: Meeting')).toBe(true);
    });

    it('should return true for titles with known meeting platform prefixes', () => {
      expect(shouldSkipBranding('ZOOM: Standup')).toBe(true);
      expect(shouldSkipBranding('Google Meet: Interview')).toBe(true);
      expect(shouldSkipBranding('Teams: Planning')).toBe(true);
      expect(shouldSkipBranding('Webex: Demo')).toBe(true);
      expect(shouldSkipBranding('Skype: Call')).toBe(true);
    });

    it('should return false for standard event titles', () => {
      expect(shouldSkipBranding('Team Meeting')).toBe(false);
      expect(shouldSkipBranding('Beach Day')).toBe(false);
      expect(shouldSkipBranding('Dinner Reservation')).toBe(false);
    });

    it('should return false for empty or null titles', () => {
      expect(shouldSkipBranding('')).toBe(false);
      expect(shouldSkipBranding('   ')).toBe(false);
      // @ts-expect-error: Testing null handling
      expect(shouldSkipBranding(null)).toBe(false);
      // @ts-expect-error: Testing undefined handling
      expect(shouldSkipBranding(undefined)).toBe(false);
    });

    it('should return false for titles containing but not starting with platform names', () => {
      expect(shouldSkipBranding('Discussion about ZOOM')).toBe(false);
      expect(shouldSkipBranding('Using Teams for collaboration')).toBe(false);
    });
  });

  describe('brandEventTitles', () => {
    it('should brand multiple titles correctly', () => {
      const titles = [
        'Team Meeting',
        'Beach Day',
        'ZOOM: Standup'
      ];

      const branded = brandEventTitles(titles);

      expect(branded).toEqual([
        'ChravelApp: Team Meeting',
        'ChravelApp: Beach Day',
        'ZOOM: Standup'
      ]);
    });

    it('should handle empty array', () => {
      expect(brandEventTitles([])).toEqual([]);
    });

    it('should preserve array order', () => {
      const titles = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
      const branded = brandEventTitles(titles);

      expect(branded).toEqual([
        'ChravelApp: First',
        'ChravelApp: Second',
        'ChravelApp: Third',
        'ChravelApp: Fourth',
        'ChravelApp: Fifth'
      ]);
    });

    it('should handle mixed titles with various prefixes', () => {
      const titles = [
        'Regular Event',
        'ChravelApp: Already Branded',
        'ZOOM: Call',
        'Google Meet: Interview',
        '',
        'Teams: Meeting'
      ];

      const branded = brandEventTitles(titles);

      expect(branded).toEqual([
        'ChravelApp: Regular Event',
        'ChravelApp: Already Branded',
        'ZOOM: Call',
        'Google Meet: Interview',
        'ChravelApp: Chravel Event',
        'Teams: Meeting'
      ]);
    });
  });

  describe('RFC 5545 compliance', () => {
    it('should produce titles compatible with iCalendar SUMMARY field', () => {
      // RFC 5545 allows UTF-8 text in SUMMARY
      const titles = [
        'Simple Meeting',
        'Meeting with: special, characters; and\\backslash',
        'Café Meeting',
        'Multi\nLine\nTitle'
      ];

      titles.forEach(title => {
        const branded = brandEventTitleForIcs(title);
        expect(branded).toContain('ChravelApp:');
        expect(typeof branded).toBe('string');
      });
    });

    it('should not introduce invalid characters', () => {
      const title = 'Normal Event\r\nTitle';
      const branded = brandEventTitleForIcs(title);

      // Branding should not corrupt the title
      expect(branded).toBeTruthy();
      expect(branded.startsWith('ChravelApp:')).toBe(true);
    });
  });

  describe('edge cases and regression tests', () => {
    it('should handle title that is exactly "ChravelApp:"', () => {
      expect(brandEventTitleForIcs('ChravelApp:')).toBe('ChravelApp:');
    });

    it('should handle title with multiple colons', () => {
      expect(brandEventTitleForIcs('Event: Part 1: Introduction')).toBe('ChravelApp: Event: Part 1: Introduction');
    });

    it('should handle numeric titles', () => {
      expect(brandEventTitleForIcs('2024 Annual Conference')).toBe('ChravelApp: 2024 Annual Conference');
      expect(brandEventTitleForIcs('123')).toBe('ChravelApp: 123');
    });

    it('should handle single character titles', () => {
      expect(brandEventTitleForIcs('A')).toBe('ChravelApp: A');
      expect(brandEventTitleForIcs('1')).toBe('ChravelApp: 1');
      expect(brandEventTitleForIcs('?')).toBe('ChravelApp: ?');
    });

    it('should not break on type coercion attempts', () => {
      // @ts-expect-error: Testing type safety
      expect(() => brandEventTitleForIcs(123)).not.toThrow();
      // @ts-expect-error: Testing type safety
      expect(() => brandEventTitleForIcs(true)).not.toThrow();
      // @ts-expect-error: Testing type safety
      expect(() => brandEventTitleForIcs({})).not.toThrow();
    });
  });
});
