import { EventData } from '../types/events';
import { googleIO2026Event } from './events/googleIO2026';
import { getMockAvatar } from '../utils/mockAvatars';

export const eventsMockData: Record<string, EventData> = {
  'sxsw-2025': {
    id: 'sxsw-2025',
    title: 'SXSW 2025',
    location: 'Austin, TX',
    dateRange: 'Mar 7 - Mar 16, 2025',
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
        date: '2025-03-07',
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
    attendanceExpected: 2000,
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
  'wef-2025': {
    id: 'wef-2025',
    title: 'World Economic Forum 2025',
    location: 'Davos, Switzerland',
    dateRange: 'Jan 20 - Jan 24, 2025',
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
        date: '2025-01-20',
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
    attendanceExpected: 800,
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
  'money2020-2025': {
    id: 'money2020-2025',
    title: 'Money20/20 Las Vegas 2025',
    location: 'Las Vegas, NV',
    dateRange: 'Oct 26 - Oct 29, 2025',
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
        date: '2025-10-26',
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
    attendanceExpected: 1500,
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
    attendanceExpected: 320,
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
  'inbound-2025': {
    id: 'inbound-2025',
    title: 'INBOUND by HubSpot 2025',
    location: 'San Francisco, CA',
    dateRange: 'Sep 9 - Sep 12, 2025',
    category: 'Marketing & CX',
    description: 'Marketing, sales, and customer success conference',
    tags: ['Marketing', 'Sales', 'Customer Experience', 'Digital', 'Growth'],
    participants: [
      { id: 13, name: 'Maya Patel', avatar: getMockAvatar('Maya Patel'), role: 'Marketing Director' },
      { id: 14, name: 'Chris Johnson', avatar: getMockAvatar('Chris Johnson'), role: 'Sales Strategy' }
    ],
    itinerary: [
      {
        date: '2025-09-09',
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
    attendanceExpected: 1500,
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
  'invest-fest-2025': {
    id: 'invest-fest-2025',
    title: 'Invest Fest 2025',
    location: 'Atlanta, GA (GWCC)',
    dateRange: 'Aug 23 - Aug 25, 2025',
    category: 'Personal Finance',
    description: 'Personal finance mega-expo for building generational wealth',
    tags: ['Finance', 'Investing', 'Wealth Building', 'Education', 'Community'],
    participants: [
      { id: 15, name: 'Jamal Washington', avatar: getMockAvatar('Jamal Washington'), role: 'Finance Director' },
      { id: 16, name: 'Keisha Davis', avatar: getMockAvatar('Keisha Davis'), role: 'Community Lead' }
    ],
    itinerary: [
      {
        date: '2025-08-23',
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
        bio: 'Best-selling author of "Rich Dad Poor Dad" and internationally recognized financial educator who has challenged the way people think about money and investing.',
        avatar: getMockAvatar('Robert Kiyosaki'),
        sessions: ['keynote-1', 'panel-1']
      },
      {
        id: 'speaker-2',
        name: 'Suze Orman',
        title: 'Financial Advisor & Author',
        company: 'Suze Orman Media',
        bio: 'New York Times bestselling author and personal finance expert who has transformed the way Americans think about personal finance, money, and life.',
        avatar: getMockAvatar('Suze Orman'),
        sessions: ['keynote-2', 'workshop-1']
      },
      {
        id: 'speaker-3',
        name: 'Dave Ramsey',
        title: 'Radio Host & Author',
        company: 'Ramsey Solutions',
        bio: 'Radio host, author, and financial expert who has helped millions of people get out of debt and build wealth through his proven money principles.',
        avatar: getMockAvatar('Dave Ramsey'),
        sessions: ['workshop-2', 'panel-2']
      }
    ],
    sessions: [
      {
        id: 'keynote-1',
        title: 'The Future of Financial Education',
        description: 'Exploring how financial literacy will evolve in the digital age and what it means for building generational wealth.',
        speaker: 'speaker-1',
        track: 'main-stage',
        startTime: '09:30',
        endTime: '10:30',
        location: 'Hall A - Main Stage'
      },
      {
        id: 'workshop-1',
        title: 'Women & Wealth: Breaking Barriers',
        description: 'Addressing the unique financial challenges women face and providing actionable strategies for building wealth.',
        speaker: 'speaker-2',
        track: 'workshops',
        startTime: '11:00',
        endTime: '12:00',
        location: 'Hall B - Workshop Area'
      },
      {
        id: 'panel-1',
        title: 'Investing in Volatile Times',
        description: 'Expert panel discussion on navigating market uncertainty and making smart investment decisions.',
        speaker: 'speaker-1',
        track: 'panels',
        startTime: '14:00',
        endTime: '15:00',
        location: 'Hall C - Panel Stage'
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
      },
      {
        id: 'sponsor-2',
        name: 'Charles Schwab',
        tier: 'gold',
        logo: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=120&h=60&fit=crop',
        website: 'https://schwab.com',
        description: 'Investment and advisory services',
        booth: 'B2'
      }
    ],
    exhibitors: [
      {
        id: 'exhibitor-1',
        name: 'Financial Planning Solutions',
        description: 'Comprehensive financial planning services for individuals and families',
        booth: 'E1',
        logo: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=80&h=80&fit=crop',
        website: 'https://fppsolutions.com',
        contacts: [
          { name: 'Michael Johnson', role: 'Senior Advisor', email: 'michael@fppsolutions.com' }
        ]
      }
    ]
  },
  'grammys-2025': {
    id: 'grammys-2025',
    title: 'The 67th Grammy Awards',
    location: 'Los Angeles, CA',
    dateRange: 'Feb 2, 2025',
    category: 'Music Awards',
    description: 'Music industry\'s most prestigious awards ceremony',
    tags: ['Music', 'Awards', 'Entertainment', 'Industry', 'Celebration'],
    participants: [
      { id: 17, name: 'Isabella Martinez', avatar: getMockAvatar('Isabella Martinez'), role: 'Awards Producer' },
      { id: 18, name: 'Michael Torres', avatar: getMockAvatar('Michael Torres'), role: 'Music Director' }
    ],
    itinerary: [
      {
        date: '2025-02-02',
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
  'yc-demo-day-2025': {
    id: 'yc-demo-day-2025',
    title: 'Y Combinator W25 Demo Day',
    location: 'Mountain View, CA',
    dateRange: 'Mar 25 - Mar 26, 2025',
    category: 'Startup Showcase',
    description: 'Startup showcase for Y Combinator Winter 2025 batch',
    tags: ['Startups', 'Venture Capital', 'Innovation', 'Technology', 'Pitching'],
    participants: [
      { id: 19, name: 'Amanda Liu', avatar: getMockAvatar('Amanda Liu'), role: 'Program Director' },
      { id: 20, name: 'Kevin Brown', avatar: getMockAvatar('Kevin Brown'), role: 'Investor Relations' }
    ],
    itinerary: [
      {
        date: '2025-03-25',
        events: [
          { title: 'Investor Registration', location: 'Computer History Museum', time: '08:00' },
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
    attendanceExpected: 400,
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
  'tiktok-summit-2025': {
    id: 'tiktok-summit-2025',
    title: 'TikTok Creator Accelerator Summit',
    location: 'Los Angeles, CA',
    dateRange: 'Jun 18 - Jun 20, 2025',
    category: 'Creator Economy',
    description: 'Summit for content creators and digital marketing professionals',
    tags: ['Creator Economy', 'Social Media', 'Content Creation', 'Digital Marketing', 'Influencers'],
    participants: [
      { id: 21, name: 'Zoe Parker', avatar: getMockAvatar('Zoe Parker'), role: 'Creator Relations' },
      { id: 22, name: 'Tyler Johnson', avatar: getMockAvatar('Tyler Johnson'), role: 'Content Strategy' }
    ],
    itinerary: [
      {
        date: '2025-06-18',
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
    attendanceExpected: 600,
    capacity: 200,
    registrationStatus: 'open',
    checkedInCount: 60,
    userRole: 'attendee',
    tracks: [],
    speakers: [],
    sessions: [],
    sponsors: [],
    exhibitors: []
  },
  'oscars-2025': {
    id: 'oscars-2025',
    title: 'The 97th Academy Awards',
    location: 'Hollywood, CA',
    dateRange: 'Mar 2, 2025',
    category: 'Film Awards',
    description: 'Film industry\'s most prestigious awards ceremony',
    tags: ['Film', 'Awards', 'Hollywood', 'Entertainment', 'Ceremony'],
    participants: [
      { id: 23, name: 'Rachel Green', avatar: getMockAvatar('Rachel Green'), role: 'Awards Producer' },
      { id: 24, name: 'James Wilson', avatar: getMockAvatar('James Wilson'), role: 'Film Coordinator' }
    ],
    itinerary: [
      {
        date: '2025-03-02',
        events: [
          { title: 'Red Carpet Arrivals', location: 'Dolby Theatre', time: '17:30' },
          { title: 'Academy Awards Ceremony', location: 'Main Theatre', time: '20:00' }
        ]
      }
    ],
    budget: {
      total: 25000000,
      spent: 20000000,
      categories: [
        { name: 'Production', allocated: 15000000, spent: 12000000 },
        { name: 'Venue', allocated: 5000000, spent: 4000000 },
        { name: 'Talent', allocated: 5000000, spent: 4000000 }
      ]
    },
    groupChatEnabled: true,
    attendanceExpected: 500,
    capacity: 500,
    registrationStatus: 'open',
    checkedInCount: 150,
    userRole: 'attendee',
    tracks: [],
    speakers: [],
    sessions: [],
    sponsors: [],
    exhibitors: []
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
    groupChatEnabled: false,
    attendanceExpected: 14500,
    capacity: 15000,
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
  'spotify-house-seoul-2026': googleIO2026Event
};
