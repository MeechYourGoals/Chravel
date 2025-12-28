import { EventData } from '../types/events';
import { googleIO2026Event } from './events/googleIO2026';
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
    attendanceExpected: 100000,
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
    attendanceExpected: 75000,
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
    attendanceExpected: 2800,
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
    attendanceExpected: 50000,
    capacity: 50000,
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
    attendanceExpected: 12000,
    capacity: 12000,
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
    attendanceExpected: 11000,
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
  'bloomberg-screentime-2026': {
    id: 'bloomberg-screentime-2026',
    title: 'Bloomberg Screentime 2026',
    location: 'Los Angeles, CA',
    dateRange: 'May 14 - May 16, 2026',
    category: 'Media & Entertainment',
    description: 'Premier media and entertainment industry summit',
    tags: ['Media', 'Entertainment', 'Streaming', 'Content', 'Hollywood'],
    participants: [
      { id: 11, name: 'Jordan Park', avatar: getMockAvatar('Jordan Park'), role: 'Media Producer' },
      { id: 12, name: 'Taylor Mitchell', avatar: getMockAvatar('Taylor Mitchell'), role: 'Content Director' }
    ],
    itinerary: [
      {
        date: '2026-05-14',
        events: [
          { title: 'Industry Welcome Reception', location: 'Beverly Hills Hotel', time: '18:00' },
          { title: 'Streaming Wars Panel', location: 'Conference Center', time: '09:00' }
        ]
      }
    ],
    budget: {
      total: 1800000,
      spent: 900000,
      categories: [
        { name: 'Venue', allocated: 600000, spent: 400000 },
        { name: 'Speakers', allocated: 500000, spent: 300000 },
        { name: 'Catering', allocated: 700000, spent: 200000 }
      ]
    },
    groupChatEnabled: true,
    attendanceExpected: 450,
    capacity: 800,
    registrationStatus: 'open',
    checkedInCount: 240,
    userRole: 'attendee',
    tracks: [],
    speakers: [],
    sessions: [],
    sponsors: [],
    exhibitors: [],
    agenda: [
      { id: 'bst-a1', title: 'Industry Welcome Reception', start_time: '18:00', end_time: '21:00', location: 'Beverly Hills Hotel' },
      { id: 'bst-a2', title: 'Streaming Wars Panel', start_time: '09:00', end_time: '10:30', location: 'Conference Center' },
      { id: 'bst-a3', title: 'Content Monetization Masterclass', start_time: '11:00', end_time: '12:30', location: 'Workshop Room' }
    ],
    tasks: [
      { id: 'bst-t1', title: 'Check in at the registration desk', sort_order: 0 },
      { id: 'bst-t2', title: 'Pick up your media credentials', sort_order: 1 }
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
    attendanceExpected: 750,
    capacity: 750,
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
    attendanceExpected: 189,
    capacity: 400,
    registrationStatus: 'open',
    checkedInCount: 120,
    userRole: 'attendee',
    tracks: [],
    speakers: [],
    sessions: [],
    sponsors: [],
    exhibitors: []
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
    attendanceExpected: 325,
    capacity: 500,
    registrationStatus: 'open',
    checkedInCount: 60,
    userRole: 'attendee',
    tracks: [],
    speakers: [],
    sessions: [],
    sponsors: [],
    exhibitors: []
  },
  'nba-hof-2026': {
    id: 'nba-hof-2026',
    title: 'NBA Hall of Fame Induction 2026',
    location: 'Springfield, MA',
    dateRange: 'Sep 11 - Sep 13, 2026',
    category: 'Sports Ceremony',
    description: 'Basketball Hall of Fame induction ceremony and celebration',
    tags: ['Basketball', 'Sports', 'Hall of Fame', 'Ceremony', 'Legacy'],
    participants: [
      { id: 25, name: 'Marcus Thompson', avatar: getMockAvatar('Marcus Thompson'), role: 'Sports Coordinator' },
      { id: 26, name: 'Lisa Rodriguez', avatar: getMockAvatar('Lisa Rodriguez'), role: 'Event Director' }
    ],
    itinerary: [
      {
        date: '2026-09-11',
        events: [
          { title: 'Hall of Fame Welcome Reception', location: 'Basketball Hall of Fame', time: '18:00' },
          { title: 'Induction Ceremony', location: 'Symphony Hall', time: '19:30' }
        ]
      }
    ],
    budget: {
      total: 2000000,
      spent: 1200000,
      categories: [
        { name: 'Venue', allocated: 600000, spent: 400000 },
        { name: 'Catering', allocated: 500000, spent: 300000 },
        { name: 'Media Production', allocated: 900000, spent: 500000 }
      ]
    },
    groupChatEnabled: true,
    attendanceExpected: 275,
    capacity: 300,
    registrationStatus: 'open',
    checkedInCount: 90,
    userRole: 'attendee',
    tracks: [],
    speakers: [],
    sessions: [],
    sponsors: [],
    exhibitors: []
  },
  'google-io-2026': googleIO2026Event
};
