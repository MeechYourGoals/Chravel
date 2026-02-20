import {
  formatTimeForTimezone,
  generateSmsMessage,
  isSmsEligibleCategory,
  truncate,
} from '../../../supabase/functions/_shared/smsTemplates.ts';

describe('sms templates', () => {
  it('uses ChravelApp prefix and broadcast format', () => {
    const message = generateSmsMessage('broadcasts', {
      tripName: 'Ski Weekend',
      senderName: 'Alex',
      preview: 'Bus leaves in 30 minutes from the hotel lobby',
    });

    expect(message.startsWith('Chravel:')).toBe(true);
    expect(message).toContain('Broadcast in Ski Weekend');
    expect(message).toContain('from Alex');
  });

  it('formats bulk import aggregation message', () => {
    const message = generateSmsMessage('calendar_bulk_import', {
      tripName: 'Cat Williams Tour',
      amount: 22,
    });

    expect(message.startsWith('Chravel:')).toBe(true);
    expect(message).toContain('22 calendar events added');
    expect(message).toContain('Cat Williams Tour');
    expect(message).toContain('Smart Import');
  });

  it('formats calendar reminder with event and time', () => {
    const message = generateSmsMessage('calendar_events', {
      tripName: 'Tokyo Tour',
      eventName: 'Check-in',
      eventTime: '5:30 PM',
    });

    expect(message).toContain('Reminder - Check-in');
    expect(message).toContain('Tokyo Tour');
    expect(message).toContain('5:30 PM');
  });

  it('supports helper utilities', () => {
    expect(truncate('abcdef', 4)).toBe('a...');
    expect(isSmsEligibleCategory('tasks')).toBe(true);
    expect(isSmsEligibleCategory('trip_invites')).toBe(false);

    const formatted = formatTimeForTimezone('2026-02-14T20:00:00.000Z', 'America/Los_Angeles');
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });
});
