import type { TripEvent } from '@/services/calendarService';

type DemoTripEventSeed = {
  title: string;
  start_time: string;
  end_time?: string;
  location?: string;
  description?: string;
};

const baseTimestamps = {
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const buildEvent = (tripId: number, index: number, seed: DemoTripEventSeed): TripEvent => ({
  id: `demo-trip-${tripId}-event-${index}`,
  trip_id: String(tripId),
  title: seed.title,
  description: seed.description,
  start_time: seed.start_time,
  end_time: seed.end_time,
  location: seed.location,
  event_category: 'itinerary',
  include_in_itinerary: true,
  source_type: 'demo',
  source_data: {},
  created_by: 'demo-user',
  created_at: baseTimestamps.created_at,
  updated_at: baseTimestamps.updated_at,
});

const demoTripEventSeeds: Record<number, DemoTripEventSeed[]> = {
  1: [
    {
      title: 'Beach Meetup + Pickup Wristbands',
      start_time: '2026-03-15T11:00:00-05:00',
      end_time: '2026-03-15T12:00:00-05:00',
      location: 'Playa Delfines',
      description: 'Meet by the lifeguard tower. Bring ID.',
    },
    {
      title: 'Catamaran + Snorkel Excursion',
      start_time: '2026-03-17T09:30:00-05:00',
      end_time: '2026-03-17T13:30:00-05:00',
      location: 'Marina Aquatours',
      description: 'Motion-sickness meds recommended.',
    },
    {
      title: 'Nightlife: Club Entry Window',
      start_time: '2026-03-17T22:30:00-05:00',
      end_time: '2026-03-18T01:00:00-05:00',
      location: 'Zona Hotelera',
    },
  ],
  2: [
    {
      title: 'TeamLab Planets Tickets',
      start_time: '2026-10-06T10:30:00+09:00',
      end_time: '2026-10-06T12:00:00+09:00',
      location: 'Toyosu',
      description: 'Arrive 15 min early.',
    },
    {
      title: 'Tsukiji Food Walk',
      start_time: '2026-10-06T11:30:00+09:00',
      end_time: '2026-10-06T13:00:00+09:00',
      location: 'Tsukiji Outer Market',
    },
    {
      title: 'Shibuya Crossing Photo Meet',
      start_time: '2026-10-08T19:00:00+09:00',
      end_time: '2026-10-08T19:45:00+09:00',
      location: 'Shibuya Station Hachikō',
      description: 'Wear comfy shoes.',
    },
  ],
  3: [
    {
      title: 'Welcome Dinner',
      start_time: '2026-12-10T19:00:00+08:00',
      end_time: '2026-12-10T21:00:00+08:00',
      location: 'Seminyak',
      description: 'Smart casual.',
    },
    {
      title: 'Ceremony',
      start_time: '2026-12-11T16:30:00+08:00',
      end_time: '2026-12-11T17:30:00+08:00',
      location: 'Beachfront Venue',
      description: 'Phones away during vows.',
    },
    {
      title: 'Reception + Afterparty',
      start_time: '2026-12-11T18:00:00+08:00',
      end_time: '2026-12-12T00:30:00+08:00',
      location: 'Same venue',
    },
  ],
  4: [
    {
      title: 'Brunch (Reservation)',
      start_time: '2026-11-08T11:00:00-06:00',
      end_time: '2026-11-08T12:30:00-06:00',
      location: 'The Gulch',
      description: 'Confirm headcount by 10:00.',
    },
    {
      title: 'Broadway Bar Crawl',
      start_time: '2026-11-08T20:00:00-06:00',
      end_time: '2026-11-08T23:00:00-06:00',
      location: 'Broadway',
      description: 'Meet at the first stop.',
    },
    {
      title: 'Spa Appointments',
      start_time: '2026-11-09T10:00:00-06:00',
      end_time: '2026-11-09T12:00:00-06:00',
      location: '12 South',
    },
  ],
  5: [
    {
      title: 'House Check-in Window',
      start_time: '2026-04-10T15:00:00-07:00',
      end_time: '2026-04-10T17:00:00-07:00',
      location: 'Indio House',
      description: 'Code in chat.',
    },
    {
      title: 'Festival Gates + Meet Point',
      start_time: '2026-04-11T16:00:00-07:00',
      end_time: '2026-04-11T16:30:00-07:00',
      location: 'Coachella Entrance',
      description: 'If late, pin location in Places.',
    },
    {
      title: 'Set Time Clash (Edge Case)',
      start_time: '2026-04-11T21:00:00-07:00',
      end_time: '2026-04-11T22:00:00-07:00',
      location: 'Outdoor Stage',
      description: 'Two must-see artists at same time.',
    },
  ],
  6: [
    {
      title: 'Desert Safari Pickup',
      start_time: '2026-07-06T14:00:00+04:00',
      end_time: '2026-07-06T18:30:00+04:00',
      location: 'Hotel Lobby',
      description: 'Wear closed-toe shoes.',
    },
    {
      title: 'Burj Khalifa Time Slot',
      start_time: '2026-07-07T17:00:00+04:00',
      end_time: '2026-07-07T18:00:00+04:00',
      location: 'Downtown Dubai',
      description: 'Tickets in Files.',
    },
    {
      title: 'Birthday Dinner',
      start_time: '2026-07-07T20:30:00+04:00',
      end_time: '2026-07-07T22:30:00+04:00',
      location: 'DIFC',
      description: 'Dress code enforced.',
    },
  ],
  7: [
    {
      title: 'Tee Time (Group A)',
      start_time: '2026-02-21T08:10:00-07:00',
      end_time: '2026-02-21T12:30:00-07:00',
      location: 'TPC Scottsdale',
      description: 'Arrive 45 min early.',
    },
    {
      title: 'Tee Time (Group B)',
      start_time: '2026-02-21T08:10:00-07:00',
      end_time: '2026-02-21T12:30:00-07:00',
      location: 'TPC Scottsdale',
    },
    {
      title: 'Dinner + Trophy Roast',
      start_time: '2026-02-21T19:30:00-07:00',
      end_time: '2026-02-21T22:00:00-07:00',
      location: 'Old Town Scottsdale',
      description: 'Loser speech mandatory.',
    },
  ],
  8: [
    {
      title: 'Sunrise Yoga',
      start_time: '2026-11-11T06:30:00-05:00',
      end_time: '2026-11-11T07:30:00-05:00',
      location: 'Beach Deck',
      description: 'Bring towel + water.',
    },
    {
      title: 'Breathwork Circle',
      start_time: '2026-11-11T07:15:00-05:00',
      end_time: '2026-11-11T08:00:00-05:00',
      location: 'Shala',
    },
    {
      title: 'Cenote Swim + Sound Bath',
      start_time: '2026-11-13T13:00:00-05:00',
      end_time: '2026-11-13T16:00:00-05:00',
      location: 'Cenote Dos Ojos',
      description: 'Transport leaves 12:15.',
    },
  ],
  9: [
    {
      title: 'Vineyard Tasting #1',
      start_time: '2026-05-02T12:00:00-07:00',
      end_time: '2026-05-02T13:30:00-07:00',
      location: 'St. Helena',
      description: 'Prepaid tasting.',
    },
    {
      title: 'Vineyard Tasting #2',
      start_time: '2026-05-02T13:00:00-07:00',
      end_time: '2026-05-02T14:30:00-07:00',
      location: 'Yountville',
    },
    {
      title: 'Dinner Reservation',
      start_time: '2026-05-02T19:00:00-07:00',
      end_time: '2026-05-02T21:00:00-07:00',
      location: 'Napa',
      description: 'Confirm dietary restrictions.',
    },
  ],
  10: [
    {
      title: 'Ski Rental Fitting',
      start_time: '2026-12-12T16:00:00-07:00',
      end_time: '2026-12-12T17:30:00-07:00',
      location: 'Aspen Mountain Sports',
      description: 'Bring boot sizes.',
    },
    {
      title: 'First Chair Meet',
      start_time: '2026-12-13T08:30:00-07:00',
      end_time: '2026-12-13T09:00:00-07:00',
      location: 'Gondola Base',
      description: 'Coffee beforehand.',
    },
    {
      title: 'Team Dinner (Private Room)',
      start_time: '2026-12-13T19:00:00-07:00',
      end_time: '2026-12-13T21:30:00-07:00',
      location: 'Downtown Aspen',
      description: 'Expense tracking in Payments.',
    },
  ],
  11: [
    {
      title: 'Boarding Window',
      start_time: '2026-06-15T12:00:00-04:00',
      end_time: '2026-06-15T13:30:00-04:00',
      location: 'Terminal',
      description: 'Passports in Files.',
    },
    {
      title: 'Sail Away Deck Spot',
      start_time: '2026-06-15T16:00:00-04:00',
      end_time: '2026-06-15T16:45:00-04:00',
      location: 'Pool Deck',
      description: 'Meet by the funnel.',
    },
    {
      title: 'Character Breakfast',
      start_time: '2026-06-16T08:00:00-04:00',
      end_time: '2026-06-16T09:00:00-04:00',
      location: 'Dining Hall',
      description: 'Reservation required.',
    },
  ],
  12: [
    {
      title: 'Trailhead Departure',
      start_time: '2026-07-11T06:00:00-06:00',
      end_time: '2026-07-11T06:15:00-06:00',
      location: 'Lamar Valley',
      description: 'Leave exactly on time.',
    },
    {
      title: 'Geyser Basin Walk',
      start_time: '2026-07-12T10:00:00-06:00',
      end_time: '2026-07-12T12:30:00-06:00',
      location: 'Old Faithful Area',
      description: 'Pack lunch.',
    },
    {
      title: 'Stargazing Meetup',
      start_time: '2026-07-12T22:00:00-06:00',
      end_time: '2026-07-12T23:30:00-06:00',
      location: 'Campground',
      description: 'Headlamps + layers.',
    },
  ],
};

export const demoTripEventsByTripId: Record<string, TripEvent[]> = Object.fromEntries(
  Object.entries(demoTripEventSeeds).map(([tripId, seeds]) => [
    String(tripId),
    seeds.map((seed, index) => buildEvent(Number(tripId), index + 1, seed)),
  ]),
);
