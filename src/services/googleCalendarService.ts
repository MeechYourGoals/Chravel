import { supabase } from '../integrations/supabase/client';
export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  all_day?: boolean;
}

export interface CalendarConnection {
  id: string;
  user_id: string;
  provider: 'google' | 'outlook' | 'apple';
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  calendar_id: string;
  sync_enabled: boolean;
}

export class GoogleCalendarService {
  private static instance: GoogleCalendarService;

  static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  async authenticateUser(): Promise<string> {
    throw new Error(
      'Google Calendar OAuth is not configured. ' +
        'A Google Cloud client ID and redirect URI must be set up before calendar sync can work.',
    );
  }

  async handleAuthCallback(code: string): Promise<CalendarConnection> {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { code },
      });

      if (error) throw error;
      return data.connection;
    } catch (error) {
      console.error('Auth callback error:', error);
      throw error;
    }
  }

  async getStoredConnection(userId: string): Promise<CalendarConnection | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('calendar_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .maybeSingle();
      if (error || !data) return null;
      return data as CalendarConnection;
    } catch (error) {
      console.error('Error getting stored connection:', error);
      return null;
    }
  }

  async syncEventToCalendar(eventData: CalendarEvent, userId: string): Promise<any> {
    try {
      const connection = await this.getStoredConnection(userId);
      if (!connection) {
        throw new Error('No Google Calendar connection found');
      }

      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'sync_to_google',
          eventData,
          accessToken: connection.access_token,
          calendarId: connection.calendar_id,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error syncing event:', error);
      throw error;
    }
  }

  async importFromGoogle(userId: string): Promise<CalendarEvent[]> {
    try {
      const connection = await this.getStoredConnection(userId);
      if (!connection) {
        throw new Error('No Google Calendar connection found');
      }

      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'import_from_google',
          userId,
          accessToken: connection.access_token,
          calendarId: connection.calendar_id,
        },
      });

      if (error) throw error;
      return data.events || [];
    } catch (error) {
      console.error('Error importing events:', error);
      throw error;
    }
  }

  async getUserCalendars(userId: string): Promise<any[]> {
    try {
      const connection = await this.getStoredConnection(userId);
      if (!connection) {
        throw new Error('No Google Calendar connection found');
      }

      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'get_calendars',
          accessToken: connection.access_token,
        },
      });

      if (error) throw error;
      return data.calendars || [];
    } catch (error) {
      console.error('Error getting calendars:', error);
      throw error;
    }
  }

  async disconnectCalendar(userId: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('calendar_connections')
        .delete()
        .eq('user_id', userId)
        .eq('provider', 'google');
      if (error) {
        console.warn('Calendar connections table not available or other error:', error);
      }
    } catch (error) {
      console.warn('Error disconnecting calendar (non-fatal in demo):', error);
    }
  }

  async toggleSync(userId: string, enabled: boolean): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('calendar_connections')
        .update({ sync_enabled: enabled })
        .eq('user_id', userId)
        .eq('provider', 'google');
      if (error) {
        console.warn('Calendar connections table not available or other error:', error);
      }
    } catch (error) {
      console.warn('Error toggling sync (non-fatal in demo):', error);
    }
  }
}

export const googleCalendarService = GoogleCalendarService.getInstance();
