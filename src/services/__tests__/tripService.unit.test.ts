import { describe, it, expect } from 'vitest';

// Extract and test the normalizeDateInput function
function normalizeDateInput(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;

  // If already ISO format and valid, return as is
  if (dateStr.includes('T') && dateStr.includes('Z')) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return dateStr;
  }

  // Match YYYY-MM-DD
  const isoDateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0)).toISOString();
  }

  // Match MM/DD/YYYY
  const usDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usDateMatch) {
    const [, month, day, year] = usDateMatch;
    return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0)).toISOString();
  }

  return undefined;
}

describe('tripService - normalizeDateInput', () => {
  it('should convert YYYY-MM-DD to ISO format', () => {
    const result = normalizeDateInput('2025-11-21');
    expect(result).toBe('2025-11-21T12:00:00.000Z');
  });

  it('should convert MM/DD/YYYY to ISO format', () => {
    const result = normalizeDateInput('11/21/2025');
    expect(result).toBe('2025-11-21T12:00:00.000Z');
  });

  it('should preserve valid ISO format strings', () => {
    const isoDate = '2025-11-21T15:30:00.000Z';
    const result = normalizeDateInput(isoDate);
    expect(result).toBe(isoDate);
  });

  it('should return undefined for undefined input', () => {
    const result = normalizeDateInput(undefined);
    expect(result).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    const result = normalizeDateInput('');
    expect(result).toBeUndefined();
  });

  it('should return undefined for invalid date formats', () => {
    const result = normalizeDateInput('invalid-date');
    expect(result).toBeUndefined();
  });

  it('should handle single-digit months and days in MM/DD/YYYY', () => {
    const result = normalizeDateInput('1/5/2025');
    expect(result).toBe('2025-01-05T12:00:00.000Z');
  });

  it('should set time to noon UTC to avoid timezone issues', () => {
    const result = normalizeDateInput('2025-12-25');
    expect(result).toContain('T12:00:00.000Z');
  });
});
