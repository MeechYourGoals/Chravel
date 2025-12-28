import { EventData } from '../types/events';
import { getMockAvatar } from '../utils/mockAvatars';

export const eventsMockData: Record<string, EventData> = {
  // Netflix Is a Joke Festival - FIRST in grid (flagship event)
  'netflix-joke-fest-2026': {
    id: 'netflix-joke-fest-2026',
    title: 'Netflix Is a Joke Festival 2026',
    location: 'Los Angeles, CA',
    dateRange: 'Apr 28 - May 6, 2026',
    category: 'Comedy Festival',
    description: 'Multi-day comedy festival featuring stand-up, live podcasts, and exclusive Netflix specials across LA venues',
    tags: ['Comedy', 'Entertainment', 'Live Shows', 'Netflix', 'Stand-up'],
    participants: [
      { id: 1, name: 'Sarah Chen', avatar: getMockAvatar('Sarah Chen'), role: 'Festival Director' },
      { id: 2, name: 'Marcus Rodriguez', avatar: getMockAvatar('Marcus Rodriguez'), role: 'Talent Coordinator' },
      { id: 3, name: 'Jessica Kim', avatar: getMockAvatar('Jessica Kim'), role: 'Venue Manager' },
      { id: 4, name: 'David Thompson', avatar: getMockAvatar('David Thompson'), role: 'Production Lead' }
    ],
    itinerary: [
      {
        date: '2026-04-28',
        events: [
          { title: 'Opening Night Gala', location: 'The Forum', time: '19:00' },
          { title: 'Headliner Comedy Show', location: 'Hollywood Bowl', time: '21:00' }
        ]
      }
    ],
    budget: {
      total: 15000000,
      spent: 8500000,
      categories: [
        { name: 'Venues', allocated: 5000000, spent: 3500000 },
        { name: 'Talent', allocated: 7000000, spent: 4000000 },
        { name: 'Production', allocated: 3000000, spent: 1000000 }
      ]
    },
    groupChatEnabled: true,
    attendanceExpected: 128437,
    capacity: 150000,
    registrationStatus: 'open',
    checkedInCount: 45000,
    userRole: 'attendee',
    tracks: [],
    speakers: [],
    sessions: [],
    sponsors: [],
    exhibitors: [],
    agenda: [
      { id: 'njf-a1', title: 'Opening Night Gala', start_time: '19:00', end_time: '22:00', location: 'The Forum' },
      { id: 'njf-a2', title: 'Stand-Up Marathon', start_time: '14:00', end_time: '23:00', location: 'Multiple Venues' },
      { id: 'njf-a3', title: 'Closing Night Spectacular', start_time: '20:00', end_time: '23:30', location: 'Hollywood Bowl' }
    ],
    tasks: [
      { id: 'njf-t1', title: 'Download the Netflix Is a Joke app', sort_order: 0 },
      { id: 'njf-t2', title: 'Pick up your wristband at will-call', sort_order: 1 },
      { id: 'njf-t3', title: 'Check venue-specific entry requirements', sort_order: 2 }
    ]
  },
  'sxsw-2026': {
    id: 'sxsw-2026',
    title: 'SXSW 2026',
    location: 'Austin, TX',
    dateRange: 'Mar 13 - Mar 22, 2026',
    category: 'Technology & Culture',
    description: 'Interactive technology, film, and music festival and conference',
    tags: ['Technology', 'Music', 'Film', 'Interactive', 'Networking'],
    participants: [
      { id: 1, name: 'Sarah Chen', avatar: getMockAvatar('Sarah Chen'), role: 'Event Coordinator' },
      { id: 2, name: 'Marcus Rodriguez', avatar: getMockAvatar('Marcus Rodriguez'), role: 'Tech Director' },
      { id: 3, name: 'Jessica Kim', avatar: getMockAvatar('Jessica Kim'), role: 'Music Coordinator' },
      { id: 4, name: 'David Thompson', avatar: getMockAvatar('David Thompson'), role: 'Film Producer' }
    ],
    itinerary: [
      {
        date: '2026-03-13',
        events: [
          { title: 'Registration & Welcome', location: 'Austin Convention Center', time: '09:00' },
          { title: 'Opening Keynote', location: 'Main Stage', time: '11:00' }
        ]
      }
    ],
    budget: {
      total: 2500000,
      spent: 1200000,
      categories: [
        { name: 'Venues', allocated: 800000, spent: 650000 },
        { name: 'Speakers', allocated: 600000, spent: 400000 },
        { name: 'Marketing', allocated: 400000, spent: 150000 }
      ]
    },
    groupChatEnabled: false,
    attendanceExpected: 74819,
    capacity: 75000,
    registrationStatus: 'open',
    checkedInCount: 22500,
    userRole: 'attendee',
    tracks: [],
    speakers: [],
    sessions: [],
    sponsors: [],
    exhibitors: [],
    agenda: [
      { id: 'a1', title: 'Registration & Welcome', start_time: '09:00', end_time: '10:00', location: 'Austin Convention Center' },
      { id: 'a2', title: 'Opening Keynote', start_time: '10:00', end_time: '11:30', location: 'Main Stage' },
      { id: 'a3', title: 'Interactive Showcase', start_time: '12:00', end_time: '14:00', location: 'Expo Hall' }
    ],
    tasks: [
      { id: 't1', title: 'Pick up your badge at registration', sort_order: 0 },
      { id: 't2', title: 'Download the SXSW GO app', sort_order: 1 },
      { id: 't3', title: 'Visit the welcome lounge for orientation', sort_order: 2 }
    ]
  },
  'wef-2026': {
    id: 'wef-2026',
    title: 'World Economic Forum 2026',
    location: 'Davos, Switzerland',
    dateRange: 'Jan 19 - Jan 23, 2026',
    category: 'Economics & Policy',
    description: 'Annual meeting of global leaders discussing world economic issues',
    tags: ['Economics', 'Policy', 'Leadership', 'Global Issues', 'Networking'],
    participants: [
      { id: 5, name: 'Dr. Elena Volkov', avatar: getMockAvatar('Dr. Elena Volkov'), role: 'Forum Director' },
      { id: 6, name: 'Ambassador Chen Wei', avatar: getMockAvatar('Ambassador Chen Wei'), role: 'Policy Advisor' },
      { id: 7, name: 'Maria Santos', avatar: getMockAvatar('Maria Santos'), role: 'Economics Lead' }
    ],
    itinerary: [
      {
        date: '2026-01-19',
        events: [
          { title: 'Opening Ceremony', location: 'Congress Centre', time: '09:00' },
          { title: 'Global Economic Outlook', location: 'Main Hall', time: '10:30' }
        ]
      }
    ],
    budget: {
      total: 5000000,
      spent: 3200000,
      categories: [
        { name: 'Venues', allocated: 1500000, spent: 1200000 },
        { name: 'Security', allocated: 1000000, spent: 800000 },
        { name: 'Hospitality', allocated: 2500000, spent: 1200000 }
      ]
    },
    groupChatEnabled: false,
    attendanceExpected: 1957,
    capacity: 3000,
    registrationStatus: 'open',
    checkedInCount: 900,
    userRole: 'attendee',
    tracks: [],
    speakers: [],
    sessions: [],
    sponsors: [],
    exhibitors: [],
    agenda: [
      { id: 'wef-a1', title: 'Opening Ceremony', start_time: '09:00', end_time: '10:00', location: 'Congress Centre', speakers: ['Klaus Schwab'] },
      { id: 'wef-a2', title: 'Global Economic Outlook', start_time: '10:30', end_time: '12:00', location: 'Main Hall' },
      { id: 'wef-a3', title: 'Climate and Economy Panel', start_time: '14:00', end_time: '15:30', location: 'Forum Hall', speakers: ['Al Gore', 'Christine Lagarde'] }
    ],
    tasks: [
      { id: 'wef-t1', title: 'Complete security clearance check-in', sort_order: 0 },
      { id: 'wef-t2', title: 'Collect your delegate badge', sort_order: 1 },
      { id: 'wef-t3', title: 'Review the session schedule in your app', sort_order: 2 }
    ]
  },
  'invest-fest-2026': {
    id: 'invest-fest-2026',
    title: 'Invest Fest 2026',
    location: 'Atlanta, GA (GWCC)',
    dateRange: 'Aug 22 - Aug 24, 2026',
    category: 'Personal Finance',
    description: 'Personal finance mega-expo for building generational wealth',
    tags: ['Finance', 'Investing', 'Wealth Building', 'Education', 'Community'],
    participants: [
      { id: 15, name: 'Jamal Washington', avatar: getMockAvatar('Jamal Washington'), role: 'Finance Director' },
      { id: 16, name: 'Keisha Davis', avatar: getMockAvatar('Keisha Davis'), role: 'Community Lead' }
    ],
    itinerary: [
      {
        date: '2026-08-22',
        events: [
          { title: 'Opening Ceremony', location: 'Georgia World Congress Center', time: '09:00' },
          { title: 'Wealth Building Basics', location: 'Hall A', time: '10:30' }
        ]
      }
    ],
    budget: {
      total: 8000000,
      spent: 4500000,
      categories: [
        { name: 'Venue', allocated: 3000000, spent: 2000000 },
        { name: 'Speakers', allocated: 2500000, spent: 1500000 },
        { name: 'Marketing', allocated: 2500000, spent: 1000000 }
      ]
    },
    groupChatEnabled: false,
    attendanceExpected: 51204,
    capacity: 51200,
    registrationStatus: 'open',
    checkedInCount: 12500,
    userRole: 'attendee',
    tracks: [
      { id: 'main-stage', name: 'Main Stage', color: '#10B981', location: 'Hall A' },
      { id: 'workshops', name: 'Workshops', color: '#3B82F6', location: 'Hall B' },
      { id: 'networking', name: 'Networking', color: '#8B5CF6', location: 'Expo Hall' },
      { id: 'panels', name: 'Expert Panels', color: '#F59E0B', location: 'Hall C' }
    ],
    agenda: [
      { id: 'if-a1', title: 'Opening Ceremony', start_time: '09:00', end_time: '09:30', location: 'Hall A - Main Stage' },
      { id: 'if-a2', title: 'The Future of Financial Education', start_time: '09:30', end_time: '10:30', location: 'Hall A - Main Stage', speakers: ['Robert Kiyosaki'] },
      { id: 'if-a3', title: 'Women & Wealth: Breaking Barriers', start_time: '11:00', end_time: '12:00', location: 'Hall B - Workshop Area', speakers: ['Suze Orman'] },
      { id: 'if-a4', title: 'Investing in Volatile Times', start_time: '14:00', end_time: '15:00', location: 'Hall C - Panel Stage' }
    ],
    tasks: [
      { id: 'if-t1', title: 'Pick up your badge and welcome kit at registration', description: 'Located in the main lobby, opens at 7:30 AM', sort_order: 0 },
      { id: 'if-t2', title: 'Complete the attendee survey for a chance to win prizes', sort_order: 1 },
      { id: 'if-t3', title: 'Visit sponsor booths to collect exclusive offers', sort_order: 2 },
      { id: 'if-t4', title: 'Download the Invest Fest app for real-time updates', sort_order: 3 }
    ],
    speakers: [
      {
        id: 'speaker-1',
        name: 'Robert Kiyosaki',
        title: 'Author & Investor',
        company: 'Rich Dad Company',
        bio: 'Best-selling author of "Rich Dad Poor Dad" and internationally recognized financial educator.',
        avatar: getMockAvatar('Robert Kiyosaki'),
        sessions: ['keynote-1', 'panel-1']
      },
      {
        id: 'speaker-2',
        name: 'Suze Orman',
        title: 'Financial Advisor & Author',
        company: 'Suze Orman Media',
        bio: 'New York Times bestselling author and personal finance expert.',
        avatar: getMockAvatar('Suze Orman'),
        sessions: ['keynote-2', 'workshop-1']
      }
    ],
    sessions: [
      {
        id: 'keynote-1',
        title: 'The Future of Financial Education',
        description: 'Exploring how financial literacy will evolve in the digital age.',
        speaker: 'speaker-1',
        track: 'main-stage',
        startTime: '09:30',
        endTime: '10:30',
        location: 'Hall A - Main Stage'
      }
    ],
    sponsors: [
      {
        id: 'sponsor-1',
        name: 'Fidelity Investments',
        tier: 'platinum',
        logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=120&h=60&fit=crop',
        website: 'https://fidelity.com',
        description: 'Leading financial services company',
        booth: 'A1'
      }
    ],
    exhibitors: []
  },
  'money2020-2026': {
    id: 'money2020-2026',
    title: 'Money20/20 Las Vegas 2026',
    location: 'Las Vegas, NV',
    dateRange: 'Oct 25 - Oct 28, 2026',
    category: 'Fintech',
    description: 'The largest global fintech event connecting the money ecosystem',
    tags: ['Fintech', 'Payments', 'Banking', 'Innovation', 'Blockchain'],
    participants: [
      { id: 8, name: 'Alex Rivera', avatar: getMockAvatar('Alex Rivera'), role: 'Fintech Director' },
      { id: 9, name: 'Sophie Zhang', avatar: getMockAvatar('Sophie Zhang'), role: 'Payments Lead' },
      { id: 10, name: 'Ryan O\'Connor', avatar: getMockAvatar('Ryan O\'Connor'), role: 'Banking Innovation' }
    ],
    itinerary: [
      {
        date: '2026-10-25',
        events: [
          { title: 'Registration & Networking', location: 'Venetian Expo', time: '08:00' },
          { title: 'Future of Payments Keynote', location: 'Palazzo Ballroom', time: '09:30' }
        ]
      }
    ],
    budget: {
      total: 3200000,
      spent: 1800000,
      categories: [
        { name: 'Venue', allocated: 1200000, spent: 900000 },
        { name: 'Speakers', allocated: 800000, spent: 500000 },
        { name: 'Technology', allocated: 600000, spent: 400000 }
      ]
    },
    groupChatEnabled: false,
    attendanceExpected: 12395,
    capacity: 12800,
    registrationStatus: 'open',
    checkedInCount: 3600,
    userRole: 'attendee',
    tracks: [],
    speakers: [],
    sessions: [],
    sponsors: [],
    exhibitors: [],
    agenda: [
      { id: 'm20-a1', title: 'Registration & Networking', start_time: '08:00', end_time: '09:30', location: 'Venetian Expo' },
      { id: 'm20-a2', title: 'Future of Payments Keynote', start_time: '09:30', end_time: '11:00', location: 'Palazzo Ballroom' },
      { id: 'm20-a3', title: 'Open Banking Workshop', start_time: '13:00', end_time: '14:30', location: 'Workshop Room B' }
    ],
    tasks: [
      { id: 'm20-t1', title: 'Register at the check-in desk', sort_order: 0 },
      { id: 'm20-t2', title: 'Download the Money20/20 app', sort_order: 1 },
      { id: 'm20-t3', title: 'Visit the expo floor for demo booths', sort_order: 2 }
    ]
  },
  'elan-steakhouse-opening-2026': {
    id: 'elan-steakhouse-opening-2026',
    title: 'Élan Steakhouse — Grand Opening Night',
    location: 'Chicago, IL',
    dateRange: 'Oct 3, 2026',
    category: 'Restaurant Grand Opening',
    description: 'Invitation-only grand opening celebration for Élan Steakhouse, a new luxury dining destination in Chicago. Guests enjoy chef-led tastings, signature cocktails, live jazz, and a first look at the space.',
    tags: ['Fine Dining', 'Steakhouse', 'Grand Opening', 'Chicago', 'Hospitality'],
    participants: [
      { id: 11, name: 'Chef Antoine Rousseau', avatar: getMockAvatar('Chef Antoine Rousseau'), role: 'Executive Chef' },
      { id: 12, name: 'Emily Carter', avatar: getMockAvatar('Emily Carter'), role: 'General Manager' }
    ],
    itinerary: [
      {
        date: '2026-10-03',
        events: [
          { title: 'VIP Welcome Reception', location: 'Élan Steakhouse Main Dining Room', time: '18:00' },
          { title: 'Chef-Led Tasting Experience', location: 'Private Dining Room', time: '19:00' },
          { title: 'Live Jazz & Cocktails', location: 'Lounge', time: '21:00' }
        ]
      }
    ],
    budget: {
      total: 180000,
      spent: 135000,
      categories: [
        { name: 'Catering & Beverages', allocated: 80000, spent: 65000 },
        { name: 'Entertainment', allocated: 40000, spent: 30000 },
        { name: 'Marketing & PR', allocated: 60000, spent: 40000 }
      ]
    },
    groupChatEnabled: true,
    attendanceExpected: 221,
    capacity: 320,
    registrationStatus: 'open',
    checkedInCount: 0,
    userRole: 'attendee',
    tracks: [],
    speakers: [],
    sessions: [],
    sponsors: [],
    exhibitors: [],
    agenda: [
      { id: 'elan-a1', title: 'VIP Welcome Reception', start_time: '18:00', end_time: '19:00', location: 'Main Dining Room' },
      { id: 'elan-a2', title: 'Chef-Led Tasting Experience', start_time: '19:00', end_time: '21:00', location: 'Private Dining Room' },
      { id: 'elan-a3', title: 'Live Jazz & Cocktails', start_time: '21:00', end_time: '23:00', location: 'Lounge' }
    ],
    tasks: [
      { id: 'elan-t1', title: 'Present your RSVP confirmation at the entrance', sort_order: 0 },
      { id: 'elan-t2', title: 'Meet the chef during the welcome reception', sort_order: 1 },
      { id: 'elan-t3', title: 'Explore the restaurant and bar areas', sort_order: 2 }
    ]
  },
  'inbound-2026': {
    id: 'inbound-2026',
    title: 'INBOUND by HubSpot 2026',
    location: 'San Francisco, CA',
    dateRange: 'Sep 8 - Sep 11, 2026',
    category: 'Marketing & CX',
    description: 'Marketing, sales, and customer success conference',
    tags: ['Marketing', 'Sales', 'Customer Experience', 'Digital', 'Growth'],
    participants: [
      { id: 13, name: 'Maya Patel', avatar: getMockAvatar('Maya Patel'), role: 'Marketing Director' },
      { id: 14, name: 'Chris Johnson', avatar: getMockAvatar('Chris Johnson'), role: 'Sales Strategy' }
    ],
    itinerary: [
      {
        date: '2026-09-08',
        events: [
          { title: 'Welcome & Networking', location: 'Moscone Center', time: '08:30' },
          { title: 'Future of Marketing Keynote', location: 'Main Stage', time: '10:00' }
        ]
      }
    ],
    budget: {
      total: 2800000,
      spent: 1400000,
      categories: [
        { name: 'Venue', allocated: 1000000, spent: 700000 },
        { name: 'Marketing', allocated: 800000, spent: 400000 },
        { name: 'Speakers', allocated: 1000000, spent: 300000 }
      ]
    },
    groupChatEnabled: false,
    attendanceExpected: 11450,
    capacity: 25000,
    registrationStatus: 'open',
    checkedInCount: 7500,
    userRole: 'attendee',
    tracks: [],
    speakers: [],
    sessions: [],
    sponsors: [],
    exhibitors: [],
    agenda: [
      { id: 'inb-a1', title: 'Welcome & Networking', start_time: '08:30', end_time: '10:00', location: 'Moscone Center' },
      { id: 'inb-a2', title: 'Future of Marketing Keynote', start_time: '10:00', end_time: '11:30', location: 'Main Stage' },
      { id: 'inb-a3', title: 'Sales Enablement Workshop', start_time: '14:00', end_time: '16:00', location: 'Workshop Hall' }
    ],
    tasks: [
      { id: 'inb-t1', title: 'Register at the welcome desk', sort_order: 0 },
      { id: 'inb-t2', title: 'Download HubSpot event app', sort_order: 1 }
    ]
  },
  'grammys-2026': {
    id: 'grammys-2026',
    title: 'The 68th Grammy Awards 2026',
    location: 'Los Angeles, CA',
    dateRange: 'Feb 8, 2026',
    category: 'Music Awards',
    description: 'Music industry\'s most prestigious awards ceremony',
    tags: ['Music', 'Awards', 'Entertainment', 'Industry', 'Celebration'],
    participants: [
      { id: 17, name: 'Isabella Martinez', avatar: getMockAvatar('Isabella Martinez'), role: 'Awards Producer' },
      { id: 18, name: 'Michael Torres', avatar: getMockAvatar('Michael Torres'), role: 'Music Director' }
    ],
    itinerary: [
      {
        date: '2026-02-08',
        events: [
          { title: 'Red Carpet Arrivals', location: 'Crypto.com Arena', time: '17:00' },
          { title: 'Grammy Awards Ceremony', location: 'Main Arena', time: '20:00' }
        ]
      }
    ],
    budget: {
      total: 15000000,
      spent: 12000000,
      categories: [
        { name: 'Production', allocated: 8000000, spent: 7000000 },
        { name: 'Venue', allocated: 3000000, spent: 2500000 },
        { name: 'Talent', allocated: 4000000, spent: 2500000 }
      ]
    },
    groupChatEnabled: true,
    attendanceExpected: 8193,
    capacity: 8400,
    registrationStatus: 'open',
    checkedInCount: 225,
    userRole: 'attendee',
    tracks: [],
    speakers: [],
    sessions: [],
    sponsors: [],
    exhibitors: [],
    agenda: [
      { id: 'gr-a1', title: 'Red Carpet Arrivals', start_time: '17:00', end_time: '19:30', location: 'Crypto.com Arena Entrance' },
      { id: 'gr-a2', title: 'Grammy Awards Ceremony', start_time: '20:00', end_time: '23:30', location: 'Main Arena' },
      { id: 'gr-a3', title: 'After Party', start_time: '23:30', end_time: '02:00', location: 'Grammy Museum' }
    ],
    tasks: [
      { id: 'gr-t1', title: 'Present your invitation at security', sort_order: 0 },
      { id: 'gr-t2', title: 'Collect your seating assignment', sort_order: 1 }
    ]
  },
  'yc-demo-day-2026': {
    id: 'yc-demo-day-2026',
    title: 'Y Combinator W26 Demo Day',
    location: 'San Francisco, CA',
    dateRange: 'Mar 24 - Mar 25, 2026',
    category: 'Startup Showcase',
    description: 'Startup showcase for Y Combinator Winter 2026 batch',
    tags: ['Startups', 'Venture Capital', 'Innovation', 'Technology', 'Pitching'],
    participants: [
      { id: 19, name: 'Amanda Liu', avatar: getMockAvatar('Amanda Liu'), role: 'Program Director' },
      { id: 20, name: 'Kevin Brown', avatar: getMockAvatar('Kevin Brown'), role: 'Investor Relations' }
    ],
    itinerary: [
      {
        date: '2026-03-24',
        events: [
          { title: 'Investor Registration', location: 'Masonic Auditorium', time: '08:00' },
          { title: 'Startup Presentations Day 1', location: 'Main Auditorium', time: '09:00' }
        ]
      }
    ],
    budget: {
      total: 800000,
      spent: 500000,
      categories: [
        { name: 'Venue', allocated: 300000, spent: 250000 },
        { name: 'Catering', allocated: 200000, spent: 150000 },
        { name: 'Technology', allocated: 300000, spent: 100000 }
      ]
    },
    groupChatEnabled: true,
    attendanceExpected: 152,
    capacity: 500,
    registrationStatus: 'open',
    checkedInCount: 120,
    userRole: 'attendee',
    tracks: [],
    speakers: [],
    sessions: [],
    sponsors: [],
    exhibitors: [],
    agenda: [
      { id: 'yc-a1', title: 'Investor Registration', start_time: '08:00', end_time: '09:00', location: 'Masonic Auditorium' },
      { id: 'yc-a2', title: 'Startup Presentations Day 1', start_time: '09:00', end_time: '17:00', location: 'Main Auditorium' }
    ],
    tasks: [
      { id: 'yc-t1', title: 'Check in at the investor desk', sort_order: 0 },
      { id: 'yc-t2', title: 'Download the YC Demo Day app', sort_order: 1 }
    ]
  },
  'tiktok-summit-2026': {
    id: 'tiktok-summit-2026',
    title: 'TikTok Creator Summit 2026',
    location: 'Los Angeles, CA',
    dateRange: 'Jun 17 - Jun 19, 2026',
    category: 'Creator Economy',
    description: 'Summit for content creators and digital marketing professionals',
    tags: ['Creator Economy', 'Social Media', 'Content Creation', 'Digital Marketing', 'Influencers'],
    participants: [
      { id: 21, name: 'Zoe Parker', avatar: getMockAvatar('Zoe Parker'), role: 'Creator Relations' },
      { id: 22, name: 'Tyler Johnson', avatar: getMockAvatar('Tyler Johnson'), role: 'Content Strategy' }
    ],
    itinerary: [
      {
        date: '2026-06-17',
        events: [
          { title: 'Creator Welcome Brunch', location: 'Beverly Hills Hotel', time: '10:00' },
          { title: 'Content Strategy Workshop', location: 'Conference Room A', time: '14:00' }
        ]
      }
    ],
    budget: {
      total: 1200000,
      spent: 700000,
      categories: [
        { name: 'Venue', allocated: 400000, spent: 300000 },
        { name: 'Creator Fees', allocated: 500000, spent: 300000 },
        { name: 'Production', allocated: 300000, spent: 100000 }
      ]
    },
    groupChatEnabled: true,
    attendanceExpected: 432,
    capacity: 800,
    registrationStatus: 'open',
    checkedInCount: 60,
    userRole: 'attendee',
    tracks: [],
    speakers: [],
    sessions: [],
    sponsors: [],
    exhibitors: [],
    agenda: [
      { id: 'tt-a1', title: 'Creator Welcome Brunch', start_time: '10:00', end_time: '12:00', location: 'Beverly Hills Hotel' },
      { id: 'tt-a2', title: 'Content Strategy Workshop', start_time: '14:00', end_time: '16:00', location: 'Conference Room A' }
    ],
    tasks: [
      { id: 'tt-t1', title: 'Pick up your creator badge', sort_order: 0 },
      { id: 'tt-t2', title: 'Download the TikTok Creator app', sort_order: 1 }
    ]
  },
  'french-riviera-marathon-2026': {
    id: 'french-riviera-marathon-2026',
    title: 'French Riviera Marathon: Nice–Cannes 2026',
    location: 'Nice → Cannes, France',
    dateRange: 'Apr 19, 2026',
    category: 'Public Sporting Event',
    description: 'The iconic French Riviera Marathon running along the Mediterranean coastline from Nice to Cannes. A globally recognized race welcoming elite athletes and amateur runners alike, ending with a festival-style finish on the Croisette.',
    tags: ['Marathon', 'Running', 'Sports', 'Mediterranean', 'Fitness'],
    participants: [
      { id: 25, name: 'Marc Dupont', avatar: getMockAvatar('Marc Dupont'), role: 'Race Director' },
      { id: 26, name: 'Sophie Laurent', avatar: getMockAvatar('Sophie Laurent'), role: 'Logistics Coordinator' }
    ],
    itinerary: [
      {
        date: '2026-04-19',
        events: [
          { title: 'Race Check-in & Bib Pickup', location: 'Promenade des Anglais, Nice', time: '06:00' },
          { title: 'Marathon Start', location: 'Nice Beachfront', time: '07:30' },
          { title: 'Finish Line Festival', location: 'La Croisette, Cannes', time: '12:00' }
        ]
      }
    ],
    budget: {
      total: 850000,
      spent: 620000,
      categories: [
        { name: 'Course Setup & Safety', allocated: 300000, spent: 250000 },
        { name: 'Medical & Support', allocated: 200000, spent: 150000 },
        { name: 'Finish Festival & Awards', allocated: 350000, spent: 220000 }
      ]
    },
    groupChatEnabled: true,
    attendanceExpected: 4215,
    capacity: 5000,
    registrationStatus: 'open',
    checkedInCount: 0,
    userRole: 'attendee',
    tracks: [],
    speakers: [],
    sessions: [],
    sponsors: [],
    exhibitors: [],
    agenda: [
      { id: 'frm-a1', title: 'Race Check-in & Bib Pickup', start_time: '06:00', end_time: '07:15', location: 'Promenade des Anglais, Nice' },
      { id: 'frm-a2', title: 'Marathon Start', start_time: '07:30', end_time: '07:45', location: 'Nice Beachfront' },
      { id: 'frm-a3', title: 'Finish Line Festival', start_time: '12:00', end_time: '16:00', location: 'La Croisette, Cannes' }
    ],
    tasks: [
      { id: 'frm-t1', title: 'Pick up your race bib and timing chip', sort_order: 0 },
      { id: 'frm-t2', title: 'Arrive at the start line 30 minutes early', sort_order: 1 },
      { id: 'frm-t3', title: 'Download the race tracker app for live timing', sort_order: 2 }
    ]
  },
  'spotify-house-seoul-2026': {
    id: 'spotify-house-seoul-2026',
    title: 'Spotify House Holiday Party — Seoul',
    location: 'Seoul, South Korea',
    dateRange: 'Dec 12, 2026',
    category: 'Brand / Music / Creator Event',
    description: 'Spotify\'s annual holiday celebration in Seoul bringing together artists, creators, industry leaders, and tastemakers. Featuring live performances, DJ sets, immersive brand activations, and curated experiences.',
    tags: ['Music', 'Creators', 'Brand Activation', 'Nightlife', 'Seoul'],
    participants: [
      { id: 1, name: 'DJ SODA', avatar: getMockAvatar('DJ SODA'), role: 'Headliner DJ' },
      { id: 2, name: 'Jay Park', avatar: getMockAvatar('Jay Park'), role: 'Special Guest Artist' },
      { id: 3, name: 'Min-ji Kim', avatar: getMockAvatar('Min-ji Kim'), role: 'Event Producer' },
      { id: 4, name: 'Alex Chen', avatar: getMockAvatar('Alex Chen'), role: 'Spotify Partnerships' }
    ],
    itinerary: [
      {
        date: '2026-12-12',
        events: [
          { title: 'VIP Check-In & Welcome Cocktails', location: 'Spotify House Seoul', time: '19:00' },
          { title: 'Opening Performance & Brand Activation', location: 'Main Stage', time: '20:00' },
          { title: 'DJ Sets & Late Night Party', location: 'Club Level', time: '22:00' }
        ]
      }
    ],
    budget: {
      total: 650000,
      spent: 420000,
      categories: [
        { name: 'Venue & Production', allocated: 280000, spent: 200000 },
        { name: 'Talent & Artists', allocated: 250000, spent: 150000 },
        { name: 'Hospitality & Catering', allocated: 120000, spent: 70000 }
      ]
    },
    groupChatEnabled: true,
    attendanceExpected: 1128,
    capacity: 1200,
    registrationStatus: 'open',
    checkedInCount: 0,
    userRole: 'attendee',
    tracks: [
      { id: 'main-stage', name: 'Main Stage', color: '#1DB954', location: 'Ground Floor' },
      { id: 'lounge', name: 'Creator Lounge', color: '#191414', location: '2nd Floor' },
      { id: 'club', name: 'Club Level', color: '#535353', location: 'Basement' }
    ],
    speakers: [
      {
        id: 'dj-soda',
        name: 'DJ SODA',
        title: 'International DJ & Producer',
        company: 'Independent',
        bio: 'World-renowned Korean DJ known for electrifying performances and massive social media following, bringing high-energy EDM to global audiences.',
        avatar: getMockAvatar('DJ SODA'),
        sessions: ['main-performance']
      },
      {
        id: 'jay-park',
        name: 'Jay Park',
        title: 'Artist & CEO',
        company: 'H1GHR Music & AOMG',
        bio: 'Korean-American rapper, singer, songwriter, and entrepreneur. Founder of two influential hip-hop labels and pioneer of Korean R&B.',
        avatar: getMockAvatar('Jay Park'),
        sessions: ['special-guest-set']
      }
    ],
    sessions: [
      {
        id: 'main-performance',
        title: 'Opening Performance & Brand Showcase',
        description: 'Spotify\'s immersive brand experience featuring live performances, artist collaborations, and exclusive music previews.',
        speaker: 'dj-soda',
        track: 'main-stage',
        startTime: '20:00',
        endTime: '22:00',
        location: 'Main Stage'
      },
      {
        id: 'special-guest-set',
        title: 'Jay Park Special Performance',
        description: 'Exclusive live set from Jay Park featuring unreleased tracks and surprise guest collaborations.',
        speaker: 'jay-park',
        track: 'main-stage',
        startTime: '21:00',
        endTime: '21:45',
        location: 'Main Stage'
      }
    ],
    sponsors: [
      {
        id: 'sponsor-1',
        name: 'Samsung',
        tier: 'platinum',
        logo: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=120&h=60&fit=crop',
        website: 'https://samsung.com',
        description: 'Premium audio and mobile technology partner',
        booth: 'Activation Zone A'
      }
    ],
    exhibitors: [],
    agenda: [
      { id: 'sps-a1', title: 'VIP Check-In & Welcome Cocktails', start_time: '19:00', end_time: '20:00', location: 'Entrance Lounge' },
      { id: 'sps-a2', title: 'Opening Performance', start_time: '20:00', end_time: '21:00', location: 'Main Stage' },
      { id: 'sps-a3', title: 'Jay Park Special Set', start_time: '21:00', end_time: '21:45', location: 'Main Stage' },
      { id: 'sps-a4', title: 'DJ Sets & Late Night Party', start_time: '22:00', end_time: '03:00', location: 'Club Level' }
    ],
    tasks: [
      { id: 'sps-t1', title: 'Download your digital invitation QR code', sort_order: 0 },
      { id: 'sps-t2', title: 'Arrive before 8 PM for priority entry', sort_order: 1 },
      { id: 'sps-t3', title: 'Check out the brand activations on the 2nd floor', sort_order: 2 },
      { id: 'sps-t4', title: 'Tag @spotify in your social posts for featured content', sort_order: 3 }
    ]
  }
};
