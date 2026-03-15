export interface Recommendation {
  id: number;
  type: 'hotel' | 'restaurant' | 'activity' | 'tour' | 'experience' | 'transportation';
  title: string;
  location: string;
  city: string;
  coordinates?: { lat: number; lng: number };
  description: string;
  rating: number;
  priceLevel: 1 | 2 | 3 | 4; // $ to $$$$
  images: string[];
  tags: string[];
  isSponsored: boolean;
  sponsorBadge?: string;
  promoText?: string;
  ctaButton: {
    text: string;
    action: 'book' | 'reserve' | 'view' | 'save';
  };
  externalLink: string;
  userRecommendations?: {
    count: number;
    names: string[];
  };
  distance?: string;
  isAvailable: boolean;

  // Production fields (all optional for backward compat with mock data)
  uuid?: string;
  source?: 'curated' | 'api' | 'partner_feed' | 'campaign' | 'user_submitted';
  campaignId?: string;
  affiliateProvider?: string;
  affiliateId?: string;
  country?: string;
  isOrganic?: boolean;
}

/**
 * Row shape from the recommendation_items table in Supabase.
 * Used by recommendationMappers to convert DB rows → Recommendation.
 */
export interface RecommendationItemRow {
  id: string;
  type: Recommendation['type'];
  title: string;
  description: string | null;
  location: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  price_level: number | null;
  images: Array<{ url: string; alt?: string }>;
  tags: string[];
  external_link: string | null;
  affiliate_provider: string | null;
  affiliate_id: string | null;
  source: string;
  sponsor_badge: string | null;
  promo_text: string | null;
  cta_text: string;
  cta_action: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
