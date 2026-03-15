/**
 * Recommendation Mappers
 *
 * Converts DB rows and Campaign objects into the Recommendation shape
 * consumed by RecommendationCard. This bridges the gap between the
 * existing UI and the new data sources without modifying any components.
 */

import type { Recommendation, RecommendationItemRow } from '@/data/recommendations/types';
import type { CampaignWithTargeting } from '@/types/advertiser';

/** Counter for generating stable numeric IDs from UUID-based items */
let nextMappedId = 10000;

/**
 * Convert a recommendation_items DB row into the Recommendation interface.
 */
export function dbItemToRecommendation(row: RecommendationItemRow): Recommendation {
  const imageUrls = Array.isArray(row.images)
    ? row.images.map(img => (typeof img === 'string' ? img : img.url))
    : [];

  return {
    id: nextMappedId++,
    uuid: row.id,
    type: row.type,
    title: row.title,
    location: row.location || '',
    city: row.city || '',
    country: row.country || undefined,
    coordinates:
      row.latitude != null && row.longitude != null
        ? { lat: row.latitude, lng: row.longitude }
        : undefined,
    description: row.description || '',
    rating: row.rating || 0,
    priceLevel: (row.price_level || 2) as 1 | 2 | 3 | 4,
    images: imageUrls,
    tags: row.tags || [],
    isSponsored: false,
    isOrganic: true,
    source: row.source as Recommendation['source'],
    sponsorBadge: row.sponsor_badge || undefined,
    promoText: row.promo_text || undefined,
    ctaButton: {
      text: row.cta_text || 'View',
      action: (row.cta_action || 'view') as 'book' | 'reserve' | 'view' | 'save',
    },
    externalLink: row.external_link || '',
    affiliateProvider: row.affiliate_provider || undefined,
    affiliateId: row.affiliate_id || undefined,
    isAvailable: row.is_active,
  };
}

/**
 * Convert an active Campaign (with targeting) into the Recommendation interface.
 * Campaigns are marked as sponsored with source = 'campaign'.
 */
export function campaignToRecommendation(campaign: CampaignWithTargeting): Recommendation {
  const imageUrls = Array.isArray(campaign.images) ? campaign.images.map(img => img.url) : [];

  const recType = mapCampaignTagsToType(campaign.tags);

  return {
    id: nextMappedId++,
    uuid: campaign.id,
    campaignId: campaign.id,
    type: recType,
    title: campaign.name,
    location: campaign.destination_info?.location || '',
    city: campaign.destination_info?.city || '',
    country: campaign.destination_info?.country || undefined,
    coordinates:
      campaign.destination_info?.latitude != null && campaign.destination_info?.longitude != null
        ? {
            lat: campaign.destination_info.latitude,
            lng: campaign.destination_info.longitude,
          }
        : undefined,
    description: campaign.description || '',
    rating: 0,
    priceLevel: 2,
    images: imageUrls,
    tags: campaign.tags || [],
    isSponsored: true,
    isOrganic: false,
    source: 'campaign',
    sponsorBadge: 'Sponsored',
    promoText: campaign.discount_details || undefined,
    ctaButton: {
      text: campaign.website_url ? 'Book Now' : 'View',
      action: campaign.website_url ? 'book' : 'view',
    },
    externalLink: campaign.website_url || '',
    isAvailable: campaign.status === 'active',
  };
}

/**
 * Map campaign tags to a Recommendation type.
 * Falls back to 'activity' if no clear match is found.
 */
function mapCampaignTagsToType(tags: string[]): Recommendation['type'] {
  const tagSet = new Set(tags.map(t => t.toLowerCase()));

  if (tagSet.has('lodging') || tagSet.has('luxury-stays') || tagSet.has('budget-friendly')) {
    return 'hotel';
  }
  if (tagSet.has('rideshare') || tagSet.has('airport-transfer') || tagSet.has('car-rental')) {
    return 'transportation';
  }
  if (tagSet.has('travel-booking') || tagSet.has('package-deals') || tagSet.has('multi-service')) {
    return 'transportation';
  }
  if (tagSet.has('food-tour') || tagSet.has('dining') || tagSet.has('restaurant')) {
    return 'restaurant';
  }
  if (tagSet.has('adventure') || tagSet.has('group-travel') || tagSet.has('solo-travel')) {
    return 'activity';
  }
  if (tagSet.has('concierge') || tagSet.has('corporate-travel') || tagSet.has('business-travel')) {
    return 'experience';
  }

  return 'activity';
}
