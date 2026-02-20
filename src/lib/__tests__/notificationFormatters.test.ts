import {
  formatDateRange,
  formatLocationSummary,
  formatTripDisplayName,
  buildTripContext,
  truncate,
} from '../notifications/formatters';

describe('formatDateRange', () => {
  it('formats a single date', () => {
    const result = formatDateRange('2026-06-10', undefined);
    expect(result).toBe('Jun 10, 2026');
  });

  it('formats same-year date range', () => {
    const result = formatDateRange('2026-06-10', '2026-06-25');
    expect(result).toContain('Jun 10');
    expect(result).toContain('Jun 25, 2026');
    expect(result).toContain('\u2013');
  });

  it('formats cross-year date range', () => {
    const result = formatDateRange('2025-12-28', '2026-01-05');
    expect(result).toContain('2025');
    expect(result).toContain('2026');
  });

  it('returns empty for undefined input', () => {
    expect(formatDateRange(undefined, undefined)).toBe('');
  });

  it('handles same-day range', () => {
    const result = formatDateRange('2026-06-10', '2026-06-10');
    expect(result).toBe('Jun 10, 2026');
  });

  it('handles Date objects', () => {
    const result = formatDateRange(new Date('2026-06-10'), new Date('2026-06-25'));
    expect(result).toContain('Jun');
  });
});

describe('formatLocationSummary', () => {
  it('formats single location', () => {
    expect(formatLocationSummary('Tokyo')).toBe('Tokyo');
  });

  it('formats multiple locations', () => {
    expect(formatLocationSummary(['Tokyo', 'Kyoto', 'Osaka'])).toBe('Tokyo, Kyoto, Osaka');
  });

  it('truncates >3 locations', () => {
    const result = formatLocationSummary(['Tokyo', 'Kyoto', 'Osaka', 'Nagoya', 'Hiroshima']);
    expect(result).toContain('+3 more');
  });

  it('returns empty for undefined', () => {
    expect(formatLocationSummary(undefined)).toBe('');
  });

  it('returns empty for empty array', () => {
    expect(formatLocationSummary([])).toBe('');
  });
});

describe('formatTripDisplayName', () => {
  it('returns normal name', () => {
    expect(formatTripDisplayName('Japan Trip')).toBe('Japan Trip');
  });

  it('truncates very long names', () => {
    const longName = 'A'.repeat(60);
    const result = formatTripDisplayName(longName);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result).toContain('...');
  });

  it('returns fallback for undefined', () => {
    expect(formatTripDisplayName(undefined)).toBe('your trip');
  });
});

describe('buildTripContext', () => {
  it('builds full context string', () => {
    const result = buildTripContext({
      location: ['Tokyo', 'Kyoto'],
      startDate: '2026-06-10',
      endDate: '2026-06-25',
    });
    expect(result).toContain('Tokyo');
    expect(result).toContain('Kyoto');
    expect(result).toContain('Jun');
    expect(result).toContain('\u2022');
  });

  it('returns empty for no context', () => {
    expect(buildTripContext({})).toBe('');
  });

  it('returns location only', () => {
    const result = buildTripContext({ location: 'Nationwide' });
    expect(result).toContain('Nationwide');
    expect(result).not.toContain('\u2022');
  });
});

describe('truncate', () => {
  it('truncates long text', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...');
  });

  it('does not truncate short text', () => {
    expect(truncate('Hi', 10)).toBe('Hi');
  });

  it('returns empty for empty input', () => {
    expect(truncate('', 5)).toBe('');
  });
});
