
import { Trip, getTripById, generateTripMockData } from '../data/tripsData';
import { proTripMockData } from '../data/proTripMockData';
import { ProTripData } from '../types/pro';
import { TripContext, TripFile, TripPhoto, TripLink, TripPoll, ChatMessage, TripReceipt } from '../types/tripContext';
import { supabase } from '@/integrations/supabase/client';

export class EnhancedTripContextService {
  static async getEnhancedTripContext(tripId: string, isProTrip = false): Promise<TripContext> {
    try {
      let baseContext: TripContext;
      
      if (isProTrip) {
        baseContext = await this.getProTripContext(tripId);
      } else {
        baseContext = await this.getConsumerTripContext(tripId);
      }

      // Enhance with comprehensive data
      const enhancedContext = await this.enhanceWithContextualData(baseContext);
      
      return enhancedContext;
    } catch (error) {
      console.error('Error fetching enhanced trip context:', error);
      throw new Error('Failed to fetch enhanced trip context');
    }
  }

  private static async getConsumerTripContext(tripId: string): Promise<TripContext> {
    const trip = getTripById(parseInt(tripId));
    if (!trip) {
      throw new Error('Trip not found');
    }

    const mockData = generateTripMockData(trip);
    const today = new Date().toISOString().split('T')[0];

    return {
      tripId,
      title: trip.title,
      location: trip.location,
      dateRange: trip.dateRange,
      participants: trip.participants.map(p => ({ id: p.id.toString(), name: p.name, role: 'participant' })),
      itinerary: mockData.itinerary.map((day, index) => ({
        id: index.toString(),
        title: `Day ${index + 1}`,
        date: day.date,
        events: day.events
      })),
      accommodation: typeof mockData.basecamp === 'object' 
        ? { name: mockData.basecamp.name, address: mockData.basecamp.address, checkIn: '', checkOut: '' }
        : mockData.basecamp,
      currentDate: today,
      upcomingEvents: this.getUpcomingEvents(mockData.itinerary, today),
      recentUpdates: mockData.broadcasts.map((b, i) => ({
        id: i.toString(),
        type: 'broadcast',
        message: b.content,
        timestamp: b.timestamp
      })),
      confirmationNumbers: {
        hotel: 'HTL-' + Math.random().toString(36).substr(2, 9),
        rental_car: 'CAR-' + Math.random().toString(36).substr(2, 9),
        flight: 'FLT-' + Math.random().toString(36).substr(2, 9),
      },
      basecamp: mockData.basecamp
    };
  }

  private static async getProTripContext(tripId: string): Promise<TripContext> {
    const proTrip: ProTripData = proTripMockData[tripId];
    if (!proTrip) {
      throw new Error('Pro trip not found');
    }

    const today = new Date().toISOString().split('T')[0];

    return {
      tripId,
      title: proTrip.title,
      location: proTrip.location,
      dateRange: proTrip.dateRange,
      participants: proTrip.participants.map(p => ({ id: p.id.toString(), name: p.name, role: p.role })),
      itinerary: (proTrip.itinerary || []).map((day, index) => ({
        id: index.toString(),
        title: `Day ${index + 1}`,
        date: day.date,
        events: day.events
      })),
      accommodation: `${proTrip.location} Accommodation`,
      currentDate: today,
      upcomingEvents: this.getUpcomingEvents(proTrip.itinerary || [], today),
      recentUpdates: [{
        id: '1',
        type: 'description',
        message: proTrip.description,
        timestamp: today
      }],
      confirmationNumbers: {
        venue: 'VEN-' + Math.random().toString(36).substr(2, 9),
        transportation: 'TRN-' + Math.random().toString(36).substr(2, 9)
      },
      isPro: true,
      proData: {
        category: proTrip.category || 'professional'
      }
    };
  }

  private static async enhanceWithContextualData(context: TripContext): Promise<TripContext> {
    // Enhance with files data
    const files = await this.getTripFiles(context.tripId);
    const photos = await this.getTripPhotos(context.tripId);
    const links = await this.getTripLinks(context.tripId);
    const polls = await this.getTripPolls(context.tripId);
    const chatHistory = await this.getChatHistory(context.tripId);
    const receipts = await this.getTripReceipts(context.tripId);
    const preferences = await this.getTripPreferences(context.tripId);
    
    // 🆕 Enhanced contextual data for AI Concierge
    const tasks = await this.getTripTasks(context.tripId);
    const payments = await this.getTripPayments(context.tripId);
    const calendar = await this.getTripCalendar(context.tripId);
    
    // 🆕 Geocode basecamp if it doesn't have coordinates
    if (context.basecamp && typeof context.basecamp === 'object') {
      const basecamp = context.basecamp as any;
      if (basecamp.address && !basecamp.lat && !basecamp.lng) {
        try {
          const coords = await this.geocodeAddress(basecamp.address);
          if (coords) {
            basecamp.lat = coords.lat;
            basecamp.lng = coords.lng;
          }
        } catch (error) {
          console.warn('Failed to geocode basecamp:', error);
        }
      }
    }
    
    // Analyze patterns
    const spendingPatterns = this.analyzeSpendingPatterns(receipts);
    const groupDynamics = this.analyzeGroupDynamics(chatHistory, polls);
    const visitedPlaces = this.extractVisitedPlaces(context.itinerary, photos);
    const weatherContext = await this.getWeatherContext(context.location);

    return {
      ...context,
      files,
      photos,
      links,
      polls,
      chatHistory: chatHistory.slice(-20), // Keep recent messages
      receipts,
      preferences,
      spendingPatterns,
      groupDynamics,
      visitedPlaces,
      weatherContext,
      // 🆕 Enhanced context for AI Concierge
      tasks
    };
  }

  // 🆕 Geocoding helper method
  private static async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
        body: {
          action: 'geocode',
          address
        }
      });

      if (error || !data?.results?.[0]) {
        console.warn('Geocoding failed:', error);
        return null;
      }

      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng
      };
    } catch (error) {
      console.warn('Geocoding error:', error);
      return null;
    }
  }

  private static async getTripFiles(tripId: string): Promise<TripFile[]> {
    try {
      // Use untyped supabase to avoid TS errors until types are regenerated
      const { data, error } = await (supabase as any)
        .from('trip_files')
        .select(`
          id,
          name,
          file_type,
          content_text,
          ai_summary,
          extracted_events,
          uploaded_by,
          created_at
        `)
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to fetch trip files:', error);
        return [];
      }

      return (data || []).map((file: any) => ({
        id: file.id,
        name: file.name,
        type: file.file_type,
        content: file.content_text,
        extractedEvents: file.extracted_events || 0,
        aiSummary: file.ai_summary,
        uploadedBy: 'Unknown',
        uploadedAt: file.created_at
      }));
    } catch (error) {
      console.warn('Error fetching trip files:', error);
      return [];
    }
  }

  private static async getTripPhotos(tripId: string): Promise<TripPhoto[]> {
    return [
      {
        id: 'photo-1',
        url: '/src/assets/vacation-beach-group.jpg',
        caption: 'Beach day with the crew! 🏖️',
        location: 'Santa Monica Beach',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        uploadedBy: 'Marcus',
        aiTags: ['beach', 'group', 'outdoor', 'sunny', 'recreational']
      },
      {
        id: 'photo-2',
        url: '/src/assets/vacation-landmark-selfie.jpg', 
        caption: 'Epic group selfie at the landmark!',
        location: 'Hollywood Sign Viewpoint',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        uploadedBy: 'Sarah',
        aiTags: ['landmark', 'selfie', 'group', 'tourist', 'scenic']
      }
    ];
  }

  private static async getTripLinks(tripId: string): Promise<TripLink[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('trip_links')
        .select(`
          id,
          url,
          title,
          description,
          category,
          votes,
          added_by,
          created_at
        `)
        .eq('trip_id', tripId)
        .order('votes', { ascending: false });

      if (error) {
        console.warn('Failed to fetch trip links:', error);
        return [];
      }

      return (data || []).map((link: any) => ({
        id: link.id,
        url: link.url,
        title: link.title,
        description: link.description,
        category: link.category,
        votes: link.votes || 0,
        addedBy: 'Unknown',
        addedAt: link.created_at
      }));
    } catch (error) {
      console.warn('Error fetching trip links:', error);
      return [];
    }
  }

  private static async getTripPolls(tripId: string): Promise<TripPoll[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('trip_polls')
        .select(`
          id,
          question,
          options,
          total_votes,
          status,
          created_by,
          created_at
        `)
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to fetch trip polls:', error);
        return [];
      }

      return (data || []).map((poll: any) => ({
        id: poll.id,
        question: poll.question,
        options: Array.isArray(poll.options) ? poll.options : [],
        totalVotes: poll.total_votes || 0,
        createdBy: 'Unknown',
        createdAt: poll.created_at,
        status: (poll.status as 'active' | 'closed') || 'active'
      }));
    } catch (error) {
      console.warn('Error fetching trip polls:', error);
      return [];
    }
  }

  private static async getChatHistory(tripId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('trip_chat_messages')
        .select(`
          id,
          content,
          author_name,
          sentiment,
          created_at
        `)
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('Failed to fetch chat history:', error);
        return [];
      }

      return (data || []).map((message: any) => ({
        id: message.id,
        content: message.content,
        author: message.author_name,
        timestamp: message.created_at,
        sentiment: message.sentiment as 'positive' | 'neutral' | 'negative' | undefined
      }));
    } catch (error) {
      console.warn('Error fetching chat history:', error);
      return [];
    }
  }

  private static async getTripReceipts(tripId: string): Promise<TripReceipt[]> {
    return [
      {
        id: 'receipt-1',
        amount: 156.80,
        currency: 'USD',
        description: 'Dinner at Le Comptoir',
        category: 'food',
        splitBetween: 4,
        uploadedBy: 'Emma',
        uploadedAt: '2025-01-15T19:30:00Z'
      },
      {
        id: 'receipt-2',
        amount: 89.50,
        currency: 'USD', 
        description: 'Uber to airport',
        category: 'transport',
        splitBetween: 3,
        uploadedBy: 'Alex',
        uploadedAt: '2025-01-15T08:15:00Z'
      }
    ];
  }

  private static async getTripPreferences(tripId: string): Promise<any> {
    try {
      const { data, error } = await (supabase as any)
        .from('trip_preferences')
        .select('*')
        .eq('trip_id', tripId)
        .maybeSingle();

      if (error || !data) {
        console.warn('Failed to fetch trip preferences:', error);
        return {
          dietary: [],
          vibe: [],
          accessibility: [],
          business: [],
          entertainment: [],
          lifestyle: [],
          budgetMin: 0,
          budgetMax: 1000,
          timePreference: 'flexible'
        };
      }

      return {
        dietary: data.dietary || [],
        vibe: data.vibe || [],
        accessibility: data.accessibility || [],
        business: data.business || [],
        entertainment: data.entertainment || [],
        lifestyle: data.lifestyle || [],
        budgetMin: data.budget_min || 0,
        budgetMax: data.budget_max || 1000,
        timePreference: data.time_preference || 'flexible'
      };
    } catch (error) {
      console.warn('Error fetching trip preferences:', error);
      return {
        dietary: [],
        vibe: [],
        accessibility: [],
        business: [],
        entertainment: [],
        lifestyle: [],
        budgetMin: 0,
        budgetMax: 1000,
        timePreference: 'flexible'
      };
    }
  }

  private static analyzeSpendingPatterns(receipts: TripReceipt[]) {
    const totalSpent = receipts.reduce((sum, r) => sum + r.amount, 0);
    const categories = receipts.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + r.amount;
      return acc;
    }, {} as { [category: string]: number });
    
    const avgPerPerson = receipts.reduce((sum, r) => sum + (r.amount / r.splitBetween), 0);

    return { totalSpent, categories, avgPerPerson };
  }

  private static analyzeGroupDynamics(chatHistory: ChatMessage[], polls: TripPoll[]) {
    const messageCount = chatHistory.reduce((acc, msg) => {
      acc[msg.author] = (acc[msg.author] || 0) + 1;
      return acc;
    }, {} as { [author: string]: number });

    const mostActiveParticipants = Object.entries(messageCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([name]) => name);

    const recentDecisions = polls
      .filter(p => p.status === 'closed')
      .map(p => {
        const winner = p.options.reduce((max, opt) => opt.votes > max.votes ? opt : max);
        return `${p.question}: ${winner.text}`;
      });

    const positiveMessages = chatHistory.filter(m => m.sentiment === 'positive').length;
    const ratio = chatHistory.length ? (positiveMessages / chatHistory.length) : 0;
    const consensusLevel: 'high' | 'medium' | 'low' = ratio > 0.7 ? 'high' : ratio > 0.4 ? 'medium' : 'low';

    return { mostActiveParticipants, recentDecisions, consensusLevel };
  }

  private static extractVisitedPlaces(itinerary: any[], photos: TripPhoto[]): string[] {
    const places = new Set<string>();
    
    // From itinerary
    itinerary.forEach(day => {
      day.events?.forEach((event: any) => {
        if (event.location) places.add(event.location);
      });
    });

    // From photos
    photos.forEach(photo => {
      if (photo.location) places.add(photo.location);
    });

    return Array.from(places);
  }

  private static async getWeatherContext(location: string) {
    // Mock weather data
    return {
      current: 'Sunny, 72°F',
      forecast: ['Sunny, 75°F', 'Partly cloudy, 70°F', 'Sunny, 78°F']
    };
  }

  private static getUpcomingEvents(itinerary: any[], currentDate: string): any[] {
    return itinerary
      .filter(day => day.date >= currentDate)
      .flatMap(day => 
        day.events?.map((event: any) => ({
          ...event,
          date: day.date
        })) || []
      )
      .slice(0, 5);
  }

  // 🆕 Enhanced data fetching methods for AI Concierge
  private static async getTripTasks(tripId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('trip_tasks')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trip tasks:', error);
      return [];
    }
  }

  private static async getTripPayments(tripId: string): Promise<any[]> {
    try {
      // Note: trip_payments table doesn't exist in current schema
      // Using mock data for now - this should be replaced with actual payment data
      console.warn('trip_payments table not found, returning empty array');
      return [];
    } catch (error) {
      console.error('Error fetching trip payments:', error);
      return [];
    }
  }

  private static async getTripCalendar(tripId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('trip_events')
        .select('*')
        .eq('trip_id', tripId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trip calendar:', error);
      return [];
    }
  }
}
