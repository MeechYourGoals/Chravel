
import { Recommendation } from './types';
import speedboatExterior from '@/assets/recommendations/speedboat-exterior.png';
import speedboatAction from '@/assets/recommendations/speedboat-action.png';
import wynwoodMurals from '@/assets/recommendations/wynwood-murals.png';
import wynwoodGallery from '@/assets/recommendations/wynwood-gallery.png';

export const activityRecommendations: Recommendation[] = [
  {
    id: 3,
    type: 'activity',
    title: 'Miami Vice Speedboat Tour',
    location: 'Downtown Miami, FL',
    city: 'Miami',
    coordinates: { lat: 25.7617, lng: -80.1918 },
    description: 'High-speed adventure through Biscayne Bay with celebrity home tours and Miami skyline views.',
    rating: 4.7,
    priceLevel: 2,
    images: [
      speedboatExterior,
      speedboatAction
    ],
    tags: ['Adventure', 'Sightseeing', 'Water Sports', 'Speedboat'],
    isSponsored: true,
    sponsorBadge: 'Promoted',
    ctaButton: {
      text: 'Book Tour',
      action: 'book'
    },
    externalLink: 'https://www.miamivicespeedboat.com/',
    userRecommendations: {
      count: 5,
      names: ['Mike D.', 'Emma W.', 'Carlos R.']
    },
    distance: '2.1 miles from your hotel',
    isAvailable: true
  },
  {
    id: 9,
    type: 'activity',
    title: 'Wynwood Art District Walking Tour',
    location: 'Wynwood, Miami, FL',
    city: 'Miami',
    coordinates: { lat: 25.7617, lng: -80.1918 },
    description: 'Guided exploration of world-famous street art murals and galleries in Miami\'s vibrant arts district.',
    rating: 4.6,
    priceLevel: 2,
    images: [
      wynwoodMurals,
      wynwoodGallery
    ],
    tags: ['Street Art', 'Cultural', 'Walking Tour', 'Photography'],
    isSponsored: true,
    sponsorBadge: 'Promoted',
    ctaButton: {
      text: 'Book Tour',
      action: 'book'
    },
    externalLink: 'https://www.wynwoodwalks.com/',
    userRecommendations: {
      count: 15,
      names: ['Artist M.', 'Gallery K.', 'Photo T.', 'Culture L.']
    },
    distance: '4.2 miles from your hotel',
    isAvailable: true
  }
];
