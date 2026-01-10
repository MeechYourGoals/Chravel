import { describe, it, expect } from 'vitest';
import { parseICSContent, findDuplicateEvents, ICSParsedEvent } from '../calendarImport';

// Test fixture: Simple ICS with a single event
const SIMPLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-event-1@example.com
DTSTART:20240115T100000Z
DTEND:20240115T120000Z
SUMMARY:Team Meeting
DESCRIPTION:Weekly team standup
LOCATION:Conference Room A
END:VEVENT
END:VCALENDAR`;

// Test fixture: ICS with multiple events and various date formats
const MULTI_EVENT_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event-utc@example.com
DTSTART:20240120T090000Z
DTEND:20240120T100000Z
SUMMARY:Morning Standup
LOCATION:Zoom
END:VEVENT
BEGIN:VEVENT
UID:event-local@example.com
DTSTART:20240121T140000
DTEND:20240121T150000
SUMMARY:Lunch Meeting
DESCRIPTION:Discuss project updates
END:VEVENT
BEGIN:VEVENT
UID:event-allday@example.com
DTSTART;VALUE=DATE:20240125
SUMMARY:All Day Event
DESCRIPTION:Company holiday
END:VEVENT
END:VCALENDAR`;

// Test fixture: ICS with escaped characters
const ESCAPED_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:escaped-event@example.com
DTSTART:20240115T100000Z
DTEND:20240115T120000Z
SUMMARY:Meeting\\, Planning
DESCRIPTION:Discuss items:\\n1. Budget\\n2. Timeline\\n3. Resources
LOCATION:Room\\; Section A
END:VEVENT
END:VCALENDAR`;

// Test fixture: ICS with long lines (folding)
const FOLDED_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:folded-event@example.com
DTSTART:20240115T100000Z
DTEND:20240115T120000Z
SUMMARY:This is a very long summary that would normally be folded across
 multiple lines in the ICS file format according to the specification
DESCRIPTION:Short desc
END:VEVENT
END:VCALENDAR`;

// Test fixture: ICS with RRULE (recurrence)
const RRULE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:recurring-event@example.com
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
SUMMARY:Daily Standup
RRULE:FREQ=DAILY;COUNT=5
END:VEVENT
END:VCALENDAR`;

// Test fixture: Invalid ICS (missing VCALENDAR)
const INVALID_ICS = `BEGIN:VEVENT
UID:orphan-event@example.com
DTSTART:20240115T100000Z
SUMMARY:Orphan Event
END:VEVENT`;

// Test fixture: ICS with missing required fields
const MISSING_FIELDS_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:no-title@example.com
DTSTART:20240115T100000Z
END:VEVENT
BEGIN:VEVENT
UID:no-start@example.com
SUMMARY:Event Without Start
END:VEVENT
BEGIN:VEVENT
UID:valid@example.com
DTSTART:20240115T100000Z
SUMMARY:Valid Event
END:VEVENT
END:VCALENDAR`;

describe('parseICSContent', () => {
  it('should parse a simple ICS file with one event', () => {
    const result = parseICSContent(SIMPLE_ICS);

    expect(result.isValid).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.errors).toHaveLength(0);

    const event = result.events[0];
    expect(event.uid).toBe('test-event-1@example.com');
    expect(event.title).toBe('Team Meeting');
    expect(event.description).toBe('Weekly team standup');
    expect(event.location).toBe('Conference Room A');
    expect(event.isAllDay).toBe(false);

    // Check UTC time parsing
    expect(event.startTime.getUTCFullYear()).toBe(2024);
    expect(event.startTime.getUTCMonth()).toBe(0); // January = 0
    expect(event.startTime.getUTCDate()).toBe(15);
    expect(event.startTime.getUTCHours()).toBe(10);
    expect(event.startTime.getUTCMinutes()).toBe(0);
  });

  it('should parse multiple events with various date formats', () => {
    const result = parseICSContent(MULTI_EVENT_ICS);

    expect(result.isValid).toBe(true);
    expect(result.events).toHaveLength(3);

    // UTC event
    const utcEvent = result.events.find(e => e.uid === 'event-utc@example.com');
    expect(utcEvent).toBeDefined();
    expect(utcEvent!.title).toBe('Morning Standup');
    expect(utcEvent!.location).toBe('Zoom');
    expect(utcEvent!.isAllDay).toBe(false);

    // Local time event
    const localEvent = result.events.find(e => e.uid === 'event-local@example.com');
    expect(localEvent).toBeDefined();
    expect(localEvent!.title).toBe('Lunch Meeting');
    expect(localEvent!.description).toBe('Discuss project updates');
    expect(localEvent!.isAllDay).toBe(false);

    // All-day event
    const allDayEvent = result.events.find(e => e.uid === 'event-allday@example.com');
    expect(allDayEvent).toBeDefined();
    expect(allDayEvent!.title).toBe('All Day Event');
    expect(allDayEvent!.isAllDay).toBe(true);
    expect(allDayEvent!.startTime.getFullYear()).toBe(2024);
    expect(allDayEvent!.startTime.getMonth()).toBe(0); // January
    expect(allDayEvent!.startTime.getDate()).toBe(25);
  });

  it('should handle escaped characters correctly', () => {
    const result = parseICSContent(ESCAPED_ICS);

    expect(result.isValid).toBe(true);
    expect(result.events).toHaveLength(1);

    const event = result.events[0];
    expect(event.title).toBe('Meeting, Planning');
    expect(event.description).toBe('Discuss items:\n1. Budget\n2. Timeline\n3. Resources');
    expect(event.location).toBe('Room; Section A');
  });

  it('should handle folded/wrapped lines', () => {
    const result = parseICSContent(FOLDED_ICS);

    expect(result.isValid).toBe(true);
    expect(result.events).toHaveLength(1);

    const event = result.events[0];
    expect(event.title).toContain('This is a very long summary');
    expect(event.title).toContain('multiple lines');
  });

  it('should add warning for RRULE (recurrence) but still import event', () => {
    const result = parseICSContent(RRULE_ICS);

    expect(result.isValid).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('RRULE'))).toBe(true);

    const event = result.events[0];
    expect(event.title).toBe('Daily Standup');
  });

  it('should reject invalid ICS without VCALENDAR wrapper', () => {
    const result = parseICSContent(INVALID_ICS);

    expect(result.isValid).toBe(false);
    expect(result.events).toHaveLength(0);
    expect(result.errors.some(e => e.includes('VCALENDAR'))).toBe(true);
  });

  it('should skip events with missing required fields and report errors', () => {
    const result = parseICSContent(MISSING_FIELDS_ICS);

    expect(result.isValid).toBe(true);
    // Only the valid event should be parsed
    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toBe('Valid Event');

    // Should have errors for the two invalid events
    expect(result.errors.length).toBe(2);
    expect(result.errors.some(e => e.includes('Missing SUMMARY'))).toBe(true);
    expect(result.errors.some(e => e.includes('Missing') && e.includes('DTSTART'))).toBe(true);
  });

  it('should handle empty input', () => {
    const result = parseICSContent('');

    expect(result.isValid).toBe(false);
    expect(result.events).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle null/undefined input', () => {
    const result = parseICSContent(null as unknown as string);

    expect(result.isValid).toBe(false);
    expect(result.events).toHaveLength(0);
  });

  it('should generate UID when not provided', () => {
    const icsWithoutUid = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
DTSTART:20240115T100000Z
SUMMARY:No UID Event
END:VEVENT
END:VCALENDAR`;

    const result = parseICSContent(icsWithoutUid);

    expect(result.isValid).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].uid).toMatch(/^imported-/);
  });

  it('should default end time to start time when not provided', () => {
    const icsWithoutEnd = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:no-end@example.com
DTSTART:20240115T100000Z
SUMMARY:No End Time
END:VEVENT
END:VCALENDAR`;

    const result = parseICSContent(icsWithoutEnd);

    expect(result.isValid).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].endTime.getTime()).toBe(result.events[0].startTime.getTime());
  });
});

describe('findDuplicateEvents', () => {
  const existingEvents = [
    {
      start_time: '2024-01-15T10:00:00.000Z',
      end_time: '2024-01-15T12:00:00.000Z',
      title: 'Team Meeting',
    },
    {
      start_time: '2024-01-20T09:00:00.000Z',
      end_time: '2024-01-20T10:00:00.000Z',
      title: 'Morning Standup',
    },
  ];

  it('should detect duplicate events by start, end, and title', () => {
    const parsedEvents: ICSParsedEvent[] = [
      {
        uid: 'new-1',
        title: 'Team Meeting',
        startTime: new Date('2024-01-15T10:00:00.000Z'),
        endTime: new Date('2024-01-15T12:00:00.000Z'),
        isAllDay: false,
      },
      {
        uid: 'new-2',
        title: 'New Event',
        startTime: new Date('2024-01-16T10:00:00.000Z'),
        endTime: new Date('2024-01-16T12:00:00.000Z'),
        isAllDay: false,
      },
    ];

    const duplicates = findDuplicateEvents(parsedEvents, existingEvents);

    expect(duplicates.size).toBe(1);
    expect(duplicates.has(0)).toBe(true); // First event is duplicate
    expect(duplicates.has(1)).toBe(false); // Second event is not duplicate
  });

  it('should be case-insensitive for title matching', () => {
    const parsedEvents: ICSParsedEvent[] = [
      {
        uid: 'new-1',
        title: 'TEAM MEETING', // Different case
        startTime: new Date('2024-01-15T10:00:00.000Z'),
        endTime: new Date('2024-01-15T12:00:00.000Z'),
        isAllDay: false,
      },
    ];

    const duplicates = findDuplicateEvents(parsedEvents, existingEvents);

    expect(duplicates.size).toBe(1);
    expect(duplicates.has(0)).toBe(true);
  });

  it('should not mark as duplicate if times differ', () => {
    const parsedEvents: ICSParsedEvent[] = [
      {
        uid: 'new-1',
        title: 'Team Meeting',
        startTime: new Date('2024-01-15T11:00:00.000Z'), // Different start time
        endTime: new Date('2024-01-15T12:00:00.000Z'),
        isAllDay: false,
      },
    ];

    const duplicates = findDuplicateEvents(parsedEvents, existingEvents);

    expect(duplicates.size).toBe(0);
  });

  it('should handle events without end time', () => {
    const existingWithoutEnd = [
      {
        start_time: '2024-01-15T10:00:00.000Z',
        end_time: null,
        title: 'Quick Sync',
      },
    ];

    const parsedEvents: ICSParsedEvent[] = [
      {
        uid: 'new-1',
        title: 'Quick Sync',
        startTime: new Date('2024-01-15T10:00:00.000Z'),
        endTime: new Date('2024-01-15T10:00:00.000Z'), // Same as start
        isAllDay: false,
      },
    ];

    const duplicates = findDuplicateEvents(parsedEvents, existingWithoutEnd);

    expect(duplicates.size).toBe(1);
  });

  it('should return empty set when no duplicates exist', () => {
    const parsedEvents: ICSParsedEvent[] = [
      {
        uid: 'new-1',
        title: 'Completely New Event',
        startTime: new Date('2024-02-01T10:00:00.000Z'),
        endTime: new Date('2024-02-01T12:00:00.000Z'),
        isAllDay: false,
      },
    ];

    const duplicates = findDuplicateEvents(parsedEvents, existingEvents);

    expect(duplicates.size).toBe(0);
  });
});
