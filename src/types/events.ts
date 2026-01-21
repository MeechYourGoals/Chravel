
export interface Track {
  id: string;
  name: string;
  color: string;
  location: string;
}

export interface Speaker {
  id: string;
  name: string;
  title: string;
  company: string;
  bio: string;
  avatar: string;
  sessions: string[];
  // 🆕 Performer type for versatility
  performerType?: 'speaker' | 'comedian' | 'musician' | 'dj' | 'host' | 'panelist' | 'officiant' | 'other';
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    website?: string;
  };
}

export interface Session {
  id: string;
  title: string;
  description: string;
  speaker: string; // Speaker ID
  track: string; // Track ID
  startTime: string;
  endTime: string;
  location: string;
}

export interface Sponsor {
  id: string;
  name: string;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  logo: string;
  website: string;
  description: string;
  booth?: string;
}

export interface Exhibitor {
  id: string;
  name: string;
  description: string;
  booth: string;
  logo: string;
  website: string;
  contacts: {
    name: string;
    role: string;
    email: string;
  }[];
}

// Agenda item for event schedule
export interface EventAgendaItem {
  id: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  track?: string;
  speakers?: string[];
}

// Task for attendees
export interface EventTask {
  id: string;
  title: string;
  description?: string;
  sort_order: number;
}

export type EventUserRole = 'organizer' | 'speaker' | 'exhibitor' | 'attendee';

export type RSVPStatus = 'going' | 'maybe' | 'not-going' | 'not-answered';

export interface EventAttendee {
  id: string;
  name: string;
  email: string;
  status: RSVPStatus;
  rsvpedAt?: string;
}

export interface EventData {
  id: string;
  title: string;
  location: string;
  dateRange: string;
  category: string;
  description: string;
  tags: string[];
  capacity: number;
  registrationStatus: 'open' | 'closed' | 'waitlist';
  attendanceExpected: number;
  groupChatEnabled: boolean;
  archived?: boolean;
  coverPhoto?: string;
  card_color?: string;
  // 🆕 Event feature toggles (organizer controls)
  chatEnabled?: boolean; // Default: true
  pollsEnabled?: boolean; // Default: true
  conciergeEnabled?: boolean; // Default: false (Chravel+ only)
  mediaUploadEnabled?: boolean; // Default: true
  mediaUploadPermissions?: 'everyone' | 'organizers' | 'cohosts'; // Default: 'everyone'
  pdfScheduleUrl?: string;
  
  // Media content for events
  photos?: Array<{
    id: string;
    media_url: string;
    filename: string;
    metadata: any;
    created_at: string;
    source: 'chat' | 'upload';
  }>;
  videos?: Array<{
    id: string;
    media_url: string;
    filename: string;
    metadata: any;
    created_at: string;
    source: 'chat' | 'upload';
  }>;
  audio?: Array<{
    id: string;
    media_url: string;
    filename: string;
    metadata: any;
    created_at: string;
    source: 'chat' | 'upload';
  }>;
  files?: Array<{
    id: string;
    media_url: string;
    filename: string;
    metadata: any;
    created_at: string;
    source: 'chat' | 'upload';
  }>;
  links?: Array<{
    id: string;
    url: string;
    title: string;
    description: string;
    domain: string;
    image_url?: string;
    created_at: string;
    source: 'chat' | 'manual' | 'places';
  }>;
  
  // Event-specific features
  tracks: Track[];
  speakers: Speaker[];
  sessions: Session[];
  sponsors: Sponsor[];
  exhibitors: Exhibitor[];
  
  // Agenda and Tasks (new)
  agenda?: EventAgendaItem[];
  tasks?: EventTask[];
  
  // User context
  userRole: EventUserRole;
  
  // Analytics
  checkedInCount: number;
  
  // Enhanced participant data
  participants: Array<{
    id: number;
    name: string;
    avatar: string;
    role: string;
    userRole?: EventUserRole;
    checkedIn?: boolean;
  }>;
  
  // Budget with sponsor revenue
  budget: {
    total: number;
    spent: number;
    sponsorRevenue?: number;
    categories: Array<{
      name: string;
      allocated: number;
      spent: number;
    }>;
  };
  
  // Basic trip data for compatibility
  itinerary: Array<{
    date: string;
    events: Array<{
      title: string;
      location: string;
      time: string;
    }>;
  }>;
}
