import { describe, expect, it } from 'vitest';
import { demoModeService } from '../demoModeService';

describe('demo trip data', () => {
  it('returns demo calendar events and files for a known trip', () => {
    const tripId = '2';

    const events = demoModeService.getMockCalendarEvents(tripId);
    const files = demoModeService.getMockFiles(tripId);

    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0]?.trip_id).toBe(tripId);

    expect(files.length).toBeGreaterThan(0);
    expect(files[0]?.trip_id).toBe(tripId);
  });
});
