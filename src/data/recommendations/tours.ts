
import { Recommendation } from './types';
import evergladesBoat from '@/assets/recommendations/everglades-boat.png';
import evergladesWildlife from '@/assets/recommendations/everglades-wildlife.png';
import littleHavanaFood from '@/assets/recommendations/little-havana-food.png';
import littleHavanaStreet from '@/assets/recommendations/little-havana-street.png';

export const tourRecommendations: Recommendation[] = [
  {
    id: 6,
    type: 'tour',
    title: 'Everglades Airboat Adventure',
    location: 'Everglades National Park, FL',
    city: 'Miami',
    coordinates: { lat: 25.7617, lng: -80.1918 },
    description: 'Thrilling airboat ride through the Everglades with wildlife viewing and gator encounters.',
    rating: 4.6,
    priceLevel: 2,
    images: [
      evergladesBoat,
      evergladesWildlife
    ],
    tags: ['Wildlife', 'Adventure', 'Nature', 'Airboat'],
    isSponsored: true,
    sponsorBadge: 'Promoted',
    ctaButton: {
      text: 'Book Adventure',
      action: 'book'
    },
    externalLink: 'https://www.evergladesairboat.com/',
    userRecommendations: {
      count: 9,
      names: ['Kevin Z.', 'Emily C.', 'Ryan M.', 'Nicole S.']
    },
    distance: '45 minutes from Miami',
    isAvailable: true
  },
  {
    id: 10,
    type: 'tour',
    title: 'Miami Food & Culture Tour',
    location: 'Little Havana, Miami, FL',
    city: 'Miami',
    coordinates: { lat: 25.7617, lng: -80.1918 },
    description: 'Authentic culinary journey through Little Havana with Cuban coffee, traditional pastries, and live music.',
    rating: 4.8,
    priceLevel: 2,
    images: [
      littleHavanaFood,
      littleHavanaStreet
    ],
    tags: ['Cuban Culture', 'Food Tour', 'Live Music', 'Authentic'],
    isSponsored: true,
    sponsorBadge: 'Featured',
    promoText: 'Free cafecito with every tour!',
    ctaButton: {
      text: 'Join Tour',
      action: 'book'
    },
    externalLink: 'https://www.miamifoodtours.com/',
    userRecommendations: {
      count: 18,
      names: ['Maria C.', 'Jose R.', 'Cuban A.', 'Food B.']
    },
    distance: '6.1 miles from your location',
    isAvailable: true
  }
];
