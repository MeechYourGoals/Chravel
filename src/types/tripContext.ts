import { TripTask } from './tasks';
import { CalendarEvent } from './calendar';
import { Broadcast } from './pro';

export interface TripFile {
  id: string;
  name: string;
  type: string;
  content?: string;
  extractedEvents?: number;
  aiSummary?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface TripPhoto {
  id: string;
  url: string;
  caption?: string;
  location?: string;
  timestamp: string;
  uploadedBy: string;
  aiTags?: string[];
}

export interface TripLink {
  id: string;
  url: string;
  title: string;
  description?: string;
  category: string;
  votes: number;
  addedBy: string;
  addedAt: string;
}

export interface TripPoll {
  id: string;
  question: string;
  options: Array<{
    id: string;
    text: string;
    votes: number;
  }>;
  totalVotes: number;
  createdBy: string;
  createdAt: string;
  status: 'active' | 'closed';
}

export interface ChatMessage {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface TripReceipt {
  id: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  splitBetween: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface TripContext {
  tripId: string;
  title: string;
  location: string;
  dateRange: {
    start: string;
    end: string;
  } | string;
  participants: Array<{
    id: string;
    name: string;
    role?: string;
  }>;
  itinerary: Array<{
    id: string;
    title: string;
    date: string;
    time?: string;
    location?: string;
    description?: string;
    events?: CalendarEvent[];
  }>;
  accommodation?: {
    name: string;
    address: string;
    checkIn: string;
    checkOut: string;
  } | string;
  currentDate: string;
  upcomingEvents: Array<{
    id: string;
    title: string;
    date: string;
    time?: string;
    location?: string;
  }>;
  recentUpdates: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
  }>;
  confirmationNumbers?: {
    [key: string]: string;
  };
  
  // Enhanced contextual data
  files?: TripFile[];
  photos?: TripPhoto[];
  links?: TripLink[];
  polls?: TripPoll[];
  chatHistory?: ChatMessage[];
  receipts?: TripReceipt[];
  tasks?: TripTask[];
  preferences?: {
    dietary: string[];
    vibe: string[];
    accessibility: string[];
    business: string[];
    entertainment: string[];
    lifestyle: string[];
    budgetMin: number;
    budgetMax: number;
    timePreference: 'early-riser' | 'night-owl' | 'flexible';
  };
  spendingPatterns?: {
    totalSpent: number;
    categories: { [category: string]: number };
    avgPerPerson: number;
  };
  groupDynamics?: {
    mostActiveParticipants: string[];
    recentDecisions: string[];
    consensusLevel: 'high' | 'medium' | 'low';
  };
  visitedPlaces?: string[];
  weatherContext?: {
    current: string;
    forecast: string[];
  };
  
  // Optional properties for legacy support
  isPro?: boolean;
  basecamp?: {
    name: string;
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  broadcasts?: Broadcast[];
  proData?: {
    category: string;
  };
}