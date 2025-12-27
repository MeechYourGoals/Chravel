import { CalendarEvent } from '@/types/calendar';
import { calendarService, TripEvent } from './calendarService';
import { brandEventTitleForIcs } from '@/utils/icsBranding';

/**
 * Calendar Sync Service
 * Handles export to iCal format and integration with external calendar systems
 */

export interface ICalEvent {
  uid: string;
  dtstart: Date;
  dtend?: Date;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  rrule?: string;
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
}

/**
 * Convert CalendarEvent to iCal format
 */
function eventToICal(event: CalendarEvent): ICalEvent {
  const startDate = new Date(event.date);
  const [hours, minutes] = event.time.split(':');
  startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));

  let endDate: Date | undefined;
  if (event.end_time) {
    endDate = event.end_time;
  } else if (event.time) {
    // Default to 1 hour duration if no end time
    endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);
  }

  const status = event.availability_status === 'tentative'
    ? 'TENTATIVE'
    : event.availability_status === 'free'
    ? 'TENTATIVE'
    : 'CONFIRMED';

  return {
    uid: `chravel-${event.id}@chravel.app`,
    dtstart: startDate,
    dtend: endDate,
    summary: brandEventTitleForIcs(event.title), // Apply ChravelApp branding
    description: event.description || '',
    location: event.location || '',
    rrule: event.recurrence_rule,
    status
  };
}

/**
 * Generate iCal file content from events
 */
function generateICalContent(events: CalendarEvent[], tripName: string): string {
  const now = new Date();
  const formattedNow = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let ical = `BEGIN:VCALENDAR\r\n`;
  ical += `VERSION:2.0\r\n`;
  ical += `PRODID:-//Chravel//Trip Calendar//EN\r\n`;
  ical += `CALSCALE:GREGORIAN\r\n`;
  ical += `METHOD:PUBLISH\r\n`;
  ical += `X-WR-CALNAME:${tripName}\r\n`;
  ical += `X-WR-TIMEZONE:UTC\r\n`;

  events.forEach(event => {
    const icalEvent = eventToICal(event);
    ical += `BEGIN:VEVENT\r\n`;
    ical += `UID:${icalEvent.uid}\r\n`;
    ical += `DTSTAMP:${formattedNow}\r\n`;
    
    // Format dates (YYYYMMDDTHHMMSSZ)
    const dtstart = icalEvent.dtstart.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    ical += `DTSTART:${dtstart}\r\n`;
    
    if (icalEvent.dtend) {
      const dtend = icalEvent.dtend.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      ical += `DTEND:${dtend}\r\n`;
    }
    
    ical += `SUMMARY:${escapeICalText(icalEvent.summary)}\r\n`;
    
    if (icalEvent.description) {
      ical += `DESCRIPTION:${escapeICalText(icalEvent.description)}\r\n`;
    }
    
    if (icalEvent.location) {
      ical += `LOCATION:${escapeICalText(icalEvent.location)}\r\n`;
    }
    
    if (icalEvent.rrule) {
      ical += `RRULE:${icalEvent.rrule}\r\n`;
    }
    
    if (icalEvent.status) {
      ical += `STATUS:${icalEvent.status}\r\n`;
    }
    
    ical += `END:VEVENT\r\n`;
  });

  ical += `END:VCALENDAR\r\n`;
  return ical;
}

/**
 * Escape special characters in iCal text fields
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Download iCal file
 */
export function downloadICalFile(events: CalendarEvent[], tripName: string, filename?: string): void {
  const icalContent = generateICalContent(events, tripName);
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${tripName.replace(/[^a-z0-9]/gi, '_')}_calendar.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export trip events to iCal format
 */
export async function exportTripEventsToICal(tripId: string, tripName: string): Promise<void> {
  try {
    const tripEvents = await calendarService.getTripEvents(tripId);
    const calendarEvents = tripEvents.map(calendarService.convertToCalendarEvent);
    downloadICalFile(calendarEvents, tripName);
  } catch (error) {
    console.error('Failed to export events to iCal:', error);
    throw error;
  }
}

/**
 * Generate iCal content as string (for API/email)
 */
export function generateICalString(events: CalendarEvent[], tripName: string): string {
  return generateICalContent(events, tripName);
}

/**
 * Parse RRULE string to human-readable format
 */
export function parseRRule(rrule: string): string {
  if (!rrule) return '';
  
  const parts = rrule.split(';');
  const freq = parts.find(p => p.startsWith('FREQ='))?.split('=')[1]?.toLowerCase();
  const interval = parts.find(p => p.startsWith('INTERVAL='))?.split('=')[1];
  const count = parts.find(p => p.startsWith('COUNT='))?.split('=')[1];
  const until = parts.find(p => p.startsWith('UNTIL='))?.split('=')[1];
  
  if (!freq) return rrule;
  
  let description = '';
  
  switch (freq) {
    case 'daily':
      description = interval && interval !== '1' ? `Every ${interval} days` : 'Daily';
      break;
    case 'weekly':
      description = interval && interval !== '1' ? `Every ${interval} weeks` : 'Weekly';
      break;
    case 'monthly':
      description = interval && interval !== '1' ? `Every ${interval} months` : 'Monthly';
      break;
    case 'yearly':
      description = interval && interval !== '1' ? `Every ${interval} years` : 'Yearly';
      break;
    default:
      return rrule;
  }
  
  if (count) {
    description += ` (${count} occurrences)`;
  } else if (until) {
    const untilDate = new Date(until);
    description += ` until ${untilDate.toLocaleDateString()}`;
  }
  
  return description;
}
