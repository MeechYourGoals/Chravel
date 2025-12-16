export interface ICSEvent {
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  uid: string;
}

/**
 * Minimal event data required for ICS export.
 * This allows components to export events without needing all CalendarEvent properties.
 */
export interface ICSExportEvent {
  id: string;
  title: string;
  date: Date;
  location?: string;
  description?: string;
}

export class CalendarExporter {
  private formatDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  exportToICS(events: ICSExportEvent[], tripName: string): string {
    const icsEvents = events.map(event => ({
      title: event.title,
      start: event.date instanceof Date ? event.date : new Date(event.date),
      end: new Date((event.date instanceof Date ? event.date : new Date(event.date)).getTime() + (2 * 60 * 60 * 1000)), // 2 hours default
      location: event.location,
      description: event.description,
      uid: event.id
    }));

    return this.generateICS(icsEvents, tripName);
  }

  private generateICS(events: ICSEvent[], calendarName: string): string {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ravel//Trip Planning//EN',
      `X-WR-CALNAME:${this.escapeText(calendarName)}`,
      'X-WR-TIMEZONE:UTC',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    events.forEach(event => {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${event.uid}@ravel.app`);
      lines.push(`DTSTART:${this.formatDate(event.start)}`);
      lines.push(`DTEND:${this.formatDate(event.end)}`);
      lines.push(`SUMMARY:${this.escapeText(event.title)}`);
      
      if (event.location) {
        lines.push(`LOCATION:${this.escapeText(event.location)}`);
      }
      
      if (event.description) {
        lines.push(`DESCRIPTION:${this.escapeText(event.description)}`);
      }
      
      lines.push(`DTSTAMP:${this.formatDate(new Date())}`);
      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  downloadICS(events: ICSExportEvent[], tripName: string): void {
    const icsContent = this.exportToICS(events, tripName);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${tripName.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  generateCalendarUrls(event: ICSExportEvent): {
    google: string;
    outlook: string;
    apple: string;
  } {
    const eventDate = event.date instanceof Date ? event.date : new Date(event.date);
    const startDate = eventDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const endDate = new Date(eventDate.getTime() + (2 * 60 * 60 * 1000))
      .toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const params = {
      title: encodeURIComponent(event.title),
      start: startDate,
      end: endDate,
      location: encodeURIComponent(event.location || ''),
      description: encodeURIComponent(event.description || '')
    };

    return {
      google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${params.title}&dates=${params.start}/${params.end}&location=${params.location}&details=${params.description}`,
      outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${params.title}&startdt=${params.start}&enddt=${params.end}&location=${params.location}&body=${params.description}`,
      apple: `data:text/calendar;charset=utf8,${encodeURIComponent(this.generateICS([{
        title: event.title,
        start: eventDate,
        end: new Date(eventDate.getTime() + (2 * 60 * 60 * 1000)),
        location: event.location,
        description: event.description,
        uid: event.id
      }], 'Trip Event'))}`
    };
  }
}

export const calendarExporter = new CalendarExporter();