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
  targeting: {
    age_min?: number;
    age_max?: number;
    genders: string[];
    interests: string[];
    locations: string[];
    trip_types: string[];
  };
}