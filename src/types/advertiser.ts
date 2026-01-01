export interface Advertiser {
  id: string;
  user_id: string;
  company_name: string;
  company_email: string;
  website?: string;
  status: 'active' | 'suspended' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface CampaignImage {
  url: string;
  alt?: string;
  order: number;
}

export interface DestinationInfo {
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface Campaign {
  id: string;
  advertiser_id: string;
  name: string;
  description?: string;
  discount_details?: string;
  images: CampaignImage[];
  destination_info?: DestinationInfo;
  tags: string[];
  status: 'draft' | 'active' | 'paused' | 'ended';
  start_date?: string;
  end_date?: string;
  website_url?: string;
  duration?: '1_week' | '1_month' | '3_months' | '6_months';
  budget_total?: number;
  budget_daily?: number;
  impressions: number;
  clicks: number;
  conversions: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignTargeting {
  id: string;
  campaign_id: string;
  age_min?: number;
  age_max?: number;
  genders: string[];
  interests: string[];
  locations: string[];
  trip_types: string[];
  created_at: string;
  updated_at: string;
}

export interface CampaignAnalytics {
  id: string;
  campaign_id: string;
  user_id?: string;
  event_type: 'impression' | 'click' | 'conversion';
  event_data?: Record<string, any>;
  created_at: string;
}

export interface CampaignWithTargeting extends Campaign {
  targeting?: CampaignTargeting;
}

export interface CampaignStats {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number; // Click-through rate
  conversionRate: number;
  costPerClick?: number;
  costPerConversion?: number;
}

export interface CampaignFormData {
  name: string;
  description: string;
  discount_details?: string;
  images: CampaignImage[];
  destination_info?: DestinationInfo;
  tags: string[];
  status: 'draft' | 'active';
  start_date?: string;
  end_date?: string;
  website_url?: string; // URL for Book Now button
  duration?: '1_week' | '1_month' | '3_months' | '6_months'; // Campaign duration option
  targeting: {
    age_min?: number;
    age_max?: number;
    genders: string[];
    interests: string[];
    locations: string[];
    trip_types: string[];
  };
}

// Duration options for campaigns
export const CAMPAIGN_DURATION_OPTIONS = [
  { value: '1_week', label: '1 Week', days: 7 },
  { value: '1_month', label: '1 Month', days: 30 },
  { value: '3_months', label: '3 Months', days: 90 },
  { value: '6_months', label: '6 Months', days: 180 },
] as const;

// Campaign Tag Categories
export const CAMPAIGN_TAG_CATEGORIES = {
  transportation: [
    { value: 'rideshare', label: 'Rideshare' },
    { value: 'airport-transfer', label: 'Airport Transfer' },
    { value: 'premium-service', label: 'Premium Service' },
    { value: 'city-travel', label: 'City Travel' },
    { value: 'car-rental', label: 'Car Rental' },
  ],
  accommodation: [
    { value: 'lodging', label: 'Lodging' },
    { value: 'price-comparison', label: 'Price Comparison' },
    { value: 'rewards-program', label: 'Rewards Program' },
    { value: 'budget-friendly', label: 'Budget Friendly' },
    { value: 'luxury-stays', label: 'Luxury Stays' },
  ],
  services: [
    { value: 'travel-booking', label: 'Travel Booking' },
    { value: 'package-deals', label: 'Package Deals' },
    { value: 'multi-service', label: 'Multi-Service' },
    { value: 'business-travel', label: 'Business Travel' },
    { value: 'concierge', label: 'Concierge' },
  ],
  specialOffers: [
    { value: 'new-user-offer', label: 'New User Offer' },
    { value: 'promotional', label: 'Promotional' },
    { value: 'discount', label: 'Discount' },
    { value: 'rewards', label: 'Rewards' },
    { value: 'limited-time', label: 'Limited Time' },
  ],
  travelType: [
    { value: 'group-travel', label: 'Group Travel' },
    { value: 'solo-travel', label: 'Solo Travel' },
    { value: 'family-friendly', label: 'Family Friendly' },
    { value: 'corporate-travel', label: 'Corporate Travel' },
    { value: 'adventure', label: 'Adventure' },
  ],
} as const;

export const MAX_CAMPAIGN_TAGS = 5;
export const MAX_CAMPAIGN_IMAGES = 5;
