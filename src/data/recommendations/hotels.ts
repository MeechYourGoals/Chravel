
import { Recommendation } from './types';
import fourSeasonsExterior from '@/assets/recommendations/four-seasons-exterior.png';
import fourSeasonsPool from '@/assets/recommendations/four-seasons-pool.png';
import setaiExterior from '@/assets/recommendations/setai-exterior.png';
import setaiSpa from '@/assets/recommendations/setai-spa.png';

export const hotelRecommendations: Recommendation[] = [
  {
    id: 1,
    type: 'hotel',
    title: 'Four Seasons Ocean Drive',
    location: 'Miami Beach, FL',
    city: 'Miami',
    coordinates: { lat: 25.7617, lng: -80.1918 },
    description: 'Luxury beachfront hotel with stunning ocean views, world-class spa, and rooftop pool.',
    rating: 4.8,
    priceLevel: 4,
    images: [
      fourSeasonsExterior,
      fourSeasonsPool
    ],
    tags: ['Luxury', 'Beachfront', 'Spa', 'Pool'],
    isSponsored: true,
    sponsorBadge: 'Featured',
    promoText: '10% off for Chravel users!',
    ctaButton: {
      text: 'Book Now',
      action: 'book'
    },
    externalLink: 'https://www.fourseasons.com/miamib/',
    userRecommendations: {
      count: 3,
      names: ['Sarah M.', 'Tom R.', 'Lisa K.']
    },
    distance: '0.3 miles from your hotel',
    isAvailable: true
  },
  {
    id: 7,
    type: 'hotel',
    title: 'The Setai Miami Beach',
    location: 'Miami Beach, FL',
    city: 'Miami',
    coordinates: { lat: 25.7617, lng: -80.1918 },
    description: 'Contemporary luxury with Asian-inspired design, pristine beachfront, and award-winning spa.',
    rating: 4.9,
    priceLevel: 4,
    images: [
      setaiExterior,
      setaiSpa
    ],
    tags: ['Luxury', 'Beachfront', 'Spa', 'Contemporary'],
    isSponsored: true,
    sponsorBadge: 'Featured',
    promoText: 'Free room upgrade for Chravel users!',
    ctaButton: {
      text: 'Book Now',
      action: 'book'
    },
    externalLink: 'https://www.setai.com/',
    userRecommendations: {
      count: 7,
      names: ['Michael T.', 'Jessica P.', 'David L.', 'Amanda R.']
    },
    distance: '0.5 miles from your hotel',
    isAvailable: true
  }
];
