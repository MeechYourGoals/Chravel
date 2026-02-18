import { format, parse } from 'date-fns';

/**
 * Format date for display (e.g. "Mar 15, 2026")
 */
export const formatShortDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format date compact, no year (e.g. "Mar 15")
 */
export const formatCompactDate = (dateString: string): string => {
  return format(new Date(dateString), 'MMM d');
};

/**
 * Parse date range string like "Mar 15 - Mar 22, 2026" into separate dates
 */
export const parseDateRange = (dateRange: string): { start: string; end: string } => {
  try {
    // Handle format: "Mar 15 - Mar 22, 2026" or "Oct 5 - Oct 15, 2025"
    const parts = dateRange.split(' - ');
    if (parts.length !== 2) {
      throw new Error('Invalid date range format');
    }

    const startPart = parts[0].trim();
    const endPartWithYear = parts[1].trim();
    
    // Extract year from end part (e.g., "Mar 22, 2026" -> "2026")
    const yearMatch = endPartWithYear.match(/, (\d{4})$/);
    const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
    
    // Remove year from end part (e.g., "Mar 22, 2026" -> "Mar 22")
    const endPart = endPartWithYear.replace(/, \d{4}$/, '').trim();
    
    // Parse dates
    const startDate = parse(`${startPart}, ${year}`, 'MMM d, yyyy', new Date());
    const endDate = parse(`${endPart}, ${year}`, 'MMM d, yyyy', new Date());
    
    // Format as ISO date strings (YYYY-MM-DD)
    return {
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd')
    };
  } catch (error) {
    console.error('Error parsing date range:', error);
    // Return current date as fallback
    const today = format(new Date(), 'yyyy-MM-dd');
    return { start: today, end: today };
  }
};

/**
 * Format ISO date strings back to display format like "Mar 15 - Mar 22, 2026"
 */
export const formatDateRange = (start: string, end: string): string => {
  try {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Same month and year
    if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
      return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
    }
    
    // Same year, different month
    if (startDate.getFullYear() === endDate.getFullYear()) {
      return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
    }
    
    // Different year
    return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
  } catch (error) {
    console.error('Error formatting date range:', error);
    return 'Invalid date range';
  }
};
