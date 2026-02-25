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
}
