import { describe, expect, it } from 'vitest';

import { getConciergeInvalidationQueryKey, isConciergeWriteAction } from '../conciergeInvalidation';

describe('conciergeInvalidation', () => {
  it('returns trip-scoped query keys for standard write actions', () => {
    expect(getConciergeInvalidationQueryKey('createTask', 'trip-123')).toEqual([
      'tripTasks',
      'trip-123',
    ]);
    expect(getConciergeInvalidationQueryKey('createPoll', 'trip-123')).toEqual([
      'tripPolls',
      'trip-123',
    ]);
    expect(getConciergeInvalidationQueryKey('addToCalendar', 'trip-123')).toEqual([
      'calendarEvents',
      'trip-123',
    ]);
  });

  it('invalidates the shared trips cache for setTripHeaderImage', () => {
    expect(getConciergeInvalidationQueryKey('setTripHeaderImage', 'trip-123')).toEqual(['trips']);
  });

  it('identifies concierge write tools correctly', () => {
    expect(isConciergeWriteAction('setTripHeaderImage')).toBe(true);
    expect(isConciergeWriteAction('searchPlaces')).toBe(false);
  });

  it('returns null for tools with no invalidation mapping', () => {
    expect(getConciergeInvalidationQueryKey('searchPlaces', 'trip-123')).toBeNull();
  });
});
