
import { Recommendation } from './types';
import artDecoFacades from '@/assets/recommendations/art-deco-facades.png';
import artDecoDetail from '@/assets/recommendations/art-deco-detail.png';
import livNightclub from '@/assets/recommendations/liv-nightclub.png';
import livTable from '@/assets/recommendations/liv-table.png';

export const experienceRecommendations: Recommendation[] = [
  {
    id: 4,
    type: 'experience',
    title: 'Art Deco Walking Tour',
    location: 'South Beach, FL',
    city: 'Miami',
    coordinates: { lat: 25.7617, lng: -80.1918 },
    description: 'Guided tour through the largest collection of Art Deco architecture in the world.',
    rating: 4.4,
    priceLevel: 1,
    images: [
      artDecoFacades,
      artDecoDetail
    ],
    tags: ['Architecture', 'Walking Tour', 'History', 'Cultural'],
    isSponsored: true,
    sponsorBadge: 'Promoted',
    ctaButton: {
      text: 'Join Tour',
      action: 'book'
    },
    externalLink: 'https://www.artdecomiami.com/',
    userRecommendations: {
      count: 12,
      names: ['Anna B.', 'David L.', 'Rachel M.', 'James K.']
    },
    distance: '0.8 miles from your location',
    isAvailable: true
  },
  {
    id: 11,
    type: 'experience',
    title: 'VIP Nightclub Package at LIV',
    location: 'South Beach, Miami, FL',
    city: 'Miami',
    coordinates: { lat: 25.7617, lng: -80.1918 },
    description: 'Exclusive VIP table service at Miami\'s premier nightclub with bottle service and priority entry.',
    rating: 4.5,
    priceLevel: 4,
    images: [
      livNightclub,
      livTable
    ],
    tags: ['VIP', 'Nightlife', 'Bottle Service', 'Exclusive'],
    isSponsored: true,
    sponsorBadge: 'Promoted',
    promoText: 'Skip the line with VIP access!',
    ctaButton: {
      text: 'Reserve VIP',
      action: 'book'
    },
    externalLink: 'https://www.livnightclub.com/',
    userRecommendations: {
      count: 9,
      names: ['Party A.', 'VIP B.', 'Night C.']
    },
    distance: '1.1 miles from your hotel',
    isAvailable: true
  }
];
