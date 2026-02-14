import { Recommendation } from './types';
import uberBlack from '@/assets/recommendations/uber-black.png';
import lyftCar from '@/assets/recommendations/lyft-car.png';
import hotelsCom from '@/assets/recommendations/hotels-com.png';
import orbitzPackages from '@/assets/recommendations/orbitz-packages.png';
import airbnbHome from '@/assets/recommendations/airbnb-home.png';
import navanBusiness from '@/assets/recommendations/navan-business.png';
import bookingInterface from '@/assets/recommendations/booking-interface.png';
import americanAirlines from '@/assets/recommendations/american-airlines.png';
import tripadvisorExperiences from '@/assets/recommendations/tripadvisor-experiences.png';
import deltaAirlines from '@/assets/recommendations/delta-airlines.png';
import virginAtlantic from '@/assets/recommendations/virgin-atlantic.png';
import luxuryCarRental from '@/assets/recommendations/luxury-car-rental.png';
import waymoAutonomous from '@/assets/recommendations/waymo-autonomous.png';

export const transportationRecommendations: Recommendation[] = [
  // American Airlines
  {
    id: 101,
    type: 'transportation',
    title: 'American Airlines - Premium Flight Experience',
    location: 'Miami International Airport, FL',
    city: 'Miami',
    coordinates: { lat: 25.7617, lng: -80.1918 },
    description:
      'Earn 5,000 bonus AAdvantage miles on your next Miami flight. Premium cabin upgrades available.',
    rating: 4.6,
    priceLevel: 3,
    images: [americanAirlines],
    tags: ['Airline', 'Miles Rewards', 'Premium Service'],
    isSponsored: true,
    sponsorBadge: 'Promoted',
    promoText: '5,000 bonus miles for Chravel users!',
    ctaButton: {
      text: 'Book Flight',
      action: 'book',
    },
    externalLink: 'https://www.aa.com/',
    distance: "12 miles from trip's base camp",
    isAvailable: true,
  },
  {
    id: 102,
    type: 'transportation',
    title: 'TripAdvisor - Experience Discovery',
    location: 'Worldwide Travel Experiences',
    city: 'Global',
    coordinates: { lat: 40.7128, lng: -74.006 },
    description:
      'Discover and compare top experiences worldwide. Read millions of reviews from real travelers.',
    rating: 4.6,
    priceLevel: 2,
    images: [tripadvisorExperiences],
    tags: ['Travel Planning', 'Reviews', 'Experiences'],
    isSponsored: true,
    sponsorBadge: 'Promoted',
    promoText: 'Compare top experiences worldwide',
    ctaButton: {
      text: 'Discover Experiences',
      action: 'view',
    },
    externalLink: 'https://www.tripadvisor.com/',
    distance: 'Worldwide coverage',
    isAvailable: true,
  },

  // Delta Airlines
  {
    id: 103,
    type: 'transportation',
    title: 'Delta Airlines - SkyMiles Accelerator',
    location: 'John F. Kennedy International Airport, NY',
    city: 'New York',
    coordinates: { lat: 40.7128, lng: -74.006 },
    description:
      'Double SkyMiles on all domestic flights booked through Chravel. Premium seat selection included.',
    rating: 4.8,
    priceLevel: 3,
    images: [deltaAirlines],
    tags: ['Airline', 'SkyMiles', 'Domestic Flights'],
    isSponsored: true,
    sponsorBadge: 'Promoted',
    promoText: 'Double SkyMiles for Chravel users!',
    ctaButton: {
      text: 'Earn Miles',
      action: 'book',
    },
    externalLink: 'https://www.delta.com/',
    distance: "15 miles from trip's base camp",
    isAvailable: true,
  },
  {
    id: 104,
    type: 'transportation',
    title: 'Virgin Atlantic - Premium Transatlantic',
    location: 'Heathrow Airport, London',
    city: 'London',
    coordinates: { lat: 51.5074, lng: -0.1278 },
    description:
      'Fly Virgin to London and beyond with award-winning service, premium entertainment, and luxury amenities.',
    rating: 4.7,
    priceLevel: 3,
    images: [virginAtlantic],
    tags: ['Airline', 'International', 'Premium Service'],
    isSponsored: true,
    sponsorBadge: 'Promoted',
    promoText: 'Fly Virgin to London for less',
    ctaButton: {
      text: 'Book Flight',
      action: 'book',
    },
    externalLink: 'https://www.virgin-atlantic.com/',
    distance: 'International routes',
    isAvailable: true,
  },

  // Hertz
  {
    id: 105,
    type: 'transportation',
    title: 'Hertz - Premium Car Rental',
    location: 'Miami Beach, FL',
    city: 'Miami',
    coordinates: { lat: 25.7617, lng: -80.1918 },
    description:
      'ChravelApp Exclusive: 20% off all luxury and premium vehicle rentals. Free additional driver included.',
    rating: 4.4,
    priceLevel: 3,
    images: [luxuryCarRental],
    tags: ['Car Rental', 'Luxury Vehicles', 'Premium Service'],
    isSponsored: true,
    sponsorBadge: 'Promoted',
    promoText: '20% off luxury rentals',
    ctaButton: {
      text: 'Reserve Car',
      action: 'reserve',
    },
    externalLink: 'https://www.hertz.com/',
    distance: "0.8 miles from trip's base camp",
    isAvailable: true,
  },

  // Uber
  {
    id: 107,
    type: 'transportation',
    title: 'Uber - Premium Airport Rides',
    location: 'Miami, FL',
    city: 'Miami',
    coordinates: { lat: 25.7617, lng: -80.1918 },
    description:
      'Flat $10 off airport rides for Chravel users. Choose from Uber Black, Uber Comfort, or UberX.',
    rating: 4.5,
    priceLevel: 2,
    images: [uberBlack],
    tags: ['Rideshare', 'Airport Transfer', 'Premium Service'],
    isSponsored: true,
    sponsorBadge: 'Promoted',
    promoText: '$10 off airport rides',
    ctaButton: {
      text: 'Get Ride',
      action: 'book',
    },
    externalLink: 'https://www.uber.com/',
    distance: 'Available citywide',
    isAvailable: true,
  },
  {
    id: 108,
    type: 'transportation',
    title: 'Lyft - Reliable City Rides',
    location: 'Major Cities Nationwide',
    city: 'Multiple Cities',
    coordinates: { lat: 40.7128, lng: -74.006 },
    description:
      'Safe, friendly rides when you need them. New user discount available for Chravel members.',
    rating: 4.5,
    priceLevel: 2,
    images: [lyftCar],
    tags: ['Rideshare', 'City Travel', 'New User Offer'],
    isSponsored: true,
    sponsorBadge: 'Promoted',
    promoText: 'New user discount for Chravel',
    ctaButton: {
      text: 'Get Ride',
      action: 'book',
    },
    externalLink: 'https://www.lyft.com/',
    distance: 'Available citywide',
    isAvailable: true,
  },

  // Waymo
  {
    id: 109,
    type: 'transportation',
    title: 'Waymo - Autonomous Ride Experience',
    location: 'San Francisco, CA',
    city: 'San Francisco',
    coordinates: { lat: 37.7749, lng: -122.4194 },
    description:
      "Experience the future of transportation with Waymo's self-driving vehicles. Safe, reliable, and innovative.",
    rating: 4.3,
    priceLevel: 2,
    images: [waymoAutonomous],
    tags: ['Autonomous', 'Self-Driving', 'Innovation'],
    isSponsored: true,
    sponsorBadge: 'Promoted',
    promoText: 'First ride free for new users',
    ctaButton: {
      text: 'Try Waymo',
      action: 'book',
    },
    externalLink: 'https://waymo.com/',
    distance: 'Available in select areas',
    isAvailable: true,
  },
  {
    id: 110,
    type: 'transportation',
    title: 'Hotels.com - Compare & Save',
    location: 'Global Hotel Network',
    city: 'Worldwide',
    coordinates: { lat: 40.7128, lng: -74.006 },
    description:
      'Compare hotel prices and earn rewards. Get one night free for every 10 nights booked.',
    rating: 4.4,
    priceLevel: 2,
    images: [hotelsCom],
    tags: ['Lodging', 'Price Comparison', 'Rewards Program'],
    isSponsored: true,
    sponsorBadge: 'Promoted',
    promoText: 'Collect 10 nights, get 1 free',
    ctaButton: {
      text: 'Find Hotels',
      action: 'view',
    },
    externalLink: 'https://www.hotels.com/',
    distance: 'Global coverage',
    isAvailable: true,
  },

  // Orbitz
  {
    id: 111,
    type: 'transportation',
    title: 'Orbitz - Complete Travel Packages',
    location: 'Multiple Cities',
    city: 'Miami',
    coordinates: { lat: 25.7617, lng: -80.1918 },
    description:
      'Bundle flights, hotels, and car rentals for maximum savings. Exclusive Chravel member discounts available.',
    rating: 4.2,
    priceLevel: 2,
    images: [orbitzPackages],
    tags: ['Travel Booking', 'Package Deals', 'Multi-Service'],
    isSponsored: true,
    sponsorBadge: 'Promoted',
    promoText: 'Save more when you bundle',
    ctaButton: {
      text: 'View Packages',
      action: 'view',
    },
    externalLink: 'https://www.orbitz.com/',
    distance: 'Worldwide availability',
    isAvailable: true,
  },
  {
    id: 112,
    type: 'transportation',
    title: 'Airbnb - Unique Stays',
    location: 'Unique Homes Worldwide',
    city: 'Global',
    coordinates: { lat: 37.7749, lng: -122.4194 },
    description:
      'Stay in unique homes and experiences around the world. First-time booking discount available.',
    rating: 4.6,
    priceLevel: 2,
    images: [airbnbHome],
    tags: ['Lodging', 'Unique Stays', 'Local Experiences'],
    isSponsored: true,
    sponsorBadge: 'Promoted',
    promoText: 'First booking discount available',
    ctaButton: {
      text: 'Find Stay',
      action: 'view',
    },
    externalLink: 'https://www.airbnb.com/',
    distance: 'Worldwide availability',
    isAvailable: true,
  },

  // Navan
  {
    id: 113,
    type: 'transportation',
    title: 'Navan - Corporate Travel Management',
    location: 'Business Travel Worldwide',
    city: 'New York',
    coordinates: { lat: 40.7128, lng: -74.006 },
    description:
      "Streamline your business travel with Navan's integrated booking platform. Policy compliance and expense tracking included.",
    rating: 4.6,
    priceLevel: 3,
    images: [navanBusiness],
    tags: ['Corporate Travel', 'Business Management', 'Expense Tracking'],
    isSponsored: true,
    sponsorBadge: 'Promoted',
    promoText: 'Enterprise-grade travel solution',
    ctaButton: {
      text: 'Get Quote',
      action: 'view',
    },
    externalLink: 'https://navan.com/',
    distance: 'Global coverage',
    isAvailable: true,
  },
  {
    id: 114,
    type: 'transportation',
    title: 'Booking.com - Global Hotel Booking',
    location: 'Hotels & Accommodations Worldwide',
    city: 'Global',
    coordinates: { lat: 52.3676, lng: 4.9041 },
    description:
      'Book accommodations worldwide with free cancellation. Genius member benefits available.',
    rating: 4.5,
    priceLevel: 2,
    images: [bookingInterface],
    tags: ['Lodging', 'Global Booking', 'Free Cancellation'],
    isSponsored: true,
    sponsorBadge: 'Promoted',
    promoText: 'Free cancellation on most stays',
    ctaButton: {
      text: 'Book Stay',
      action: 'view',
    },
    externalLink: 'https://www.booking.com/',
    distance: 'Global coverage',
    isAvailable: true,
  },
];
