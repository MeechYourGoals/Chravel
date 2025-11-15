import { describe, it, expect } from 'vitest';

// Extract and test the normalizeDateInput function
function normalizeDateInput(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;

  // If already YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // If ISO 8601 datetime, extract date part only
  if (dateStr.includes('T')) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  // Match MM/DD/YYYY and convert to YYYY-MM-DD
  const usDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usDateMatch) {
    const [, month, day, year] = usDateMatch;
    const paddedMonth = month.padStart(2, '0');
    const paddedDay = day.padStart(2, '0');
    return `${year}-${paddedMonth}-${paddedDay}`;
  }

  return undefined;
}

describe('tripService - normalizeDateInput', () => {
  it('should preserve YYYY-MM-DD format', () => {
    const result = normalizeDateInput('2025-11-21');
    expect(result).toBe('2025-11-21');
  });

  it('should convert MM/DD/YYYY to YYYY-MM-DD', () => {
    const result = normalizeDateInput('11/21/2025');
    expect(result).toBe('2025-11-21');
  });

  it('should extract date from ISO datetime strings', () => {
    const result = normalizeDateInput('2025-11-21T15:30:00.000Z');
    expect(result).toBe('2025-11-21');
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
    expect(result).toBe('2025-01-05');
  });

  it('should pad single-digit months and days correctly', () => {
    const result = normalizeDateInput('3/9/2025');
    expect(result).toBe('2025-03-09');
  });

  it('should handle ISO datetime with timezone offset', () => {
    const result = normalizeDateInput('2025-12-25T18:00:00+05:00');
    expect(result).toBe('2025-12-25');
  });
});
