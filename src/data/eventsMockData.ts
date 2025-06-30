import { EventData } from './eventsMockData';

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
      { id: 1, name: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=40&h=40&fit=crop&crop=face', role: 'Event Coordinator' },
      { id: 2, name: 'Marcus Rodriguez', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face', role: 'Tech Director' },
      { id: 3, name: 'Jessica Kim', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face', role: 'Music Coordinator' },
      { id: 4, name: 'David Thompson', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face', role: 'Film Producer' }
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
    attendanceExpected: 75000
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
      { id: 5, name: 'Dr. Elena Volkov', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=40&h=40&fit=crop&crop=face', role: 'Forum Director' },
      { id: 6, name: 'Ambassador Chen Wei', avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=40&h=40&fit=crop&crop=face', role: 'Policy Advisor' },
      { id: 7, name: 'Maria Santos', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=40&h=40&fit=crop&crop=face', role: 'Economics Lead' }
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
    attendanceExpected: 3000
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
      { id: 8, name: 'Alex Rivera', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face', role: 'Fintech Director' },
      { id: 9, name: 'Sophie Zhang', avatar: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=40&h=40&fit=crop&crop=face', role: 'Payments Lead' },
      { id: 10, name: 'Ryan O\'Connor', avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=40&h=40&fit=crop&crop=face', role: 'Banking Innovation' }
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
    attendanceExpected: 12000
  },
  'bloomberg-screentime-2025': {
    id: 'bloomberg-screentime-2025',
    title: 'Bloomberg Screentime 2025',
    location: 'Los Angeles, CA',
    dateRange: 'May 15 - May 17, 2025',
    category: 'Media & Entertainment',
    description: 'Premier media and entertainment industry summit',
    tags: ['Media', 'Entertainment', 'Streaming', 'Content', 'Hollywood'],
    participants: [
      { id: 11, name: 'Jordan Park', avatar: 'https://images.unsplash.com/photo-1506634572416-48cdfe530110?w=40&h=40&fit=crop&crop=face', role: 'Media Producer' },
      { id: 12, name: 'Taylor Mitchell', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=40&h=40&fit=crop&crop=face', role: 'Content Director' }
    ],
    itinerary: [
      {
        date: '2025-05-15',
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
    attendanceExpected: 800
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
      { id: 13, name: 'Maya Patel', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=40&h=40&fit=crop&crop=face', role: 'Marketing Director' },
      { id: 14, name: 'Chris Johnson', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face', role: 'Sales Strategy' }
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
    attendanceExpected: 25000
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
      { id: 15, name: 'Jamal Washington', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face', role: 'Finance Director' },
      { id: 16, name: 'Keisha Davis', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face', role: 'Community Lead' }
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
    
    // Enhanced event-specific data
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
    
    speakers: [
      {
        id: 'speaker-1',
        name: 'Robert Kiyosaki',
        title: 'Author & Investor',
        company: 'Rich Dad Company',
        bio: 'Best-selling author of "Rich Dad Poor Dad" and internationally recognized financial educator who has challenged the way people think about money and investing.',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
        sessions: ['keynote-1', 'panel-1'],
        socialLinks: {
          twitter: 'https://twitter.com/therealKiyosaki',
          website: 'https://richdad.com'
        }
      },
      {
        id: 'speaker-2',
        name: 'Suze Orman',
        title: 'Financial Advisor & Author',
        company: 'Suze Orman Media',
        bio: 'New York Times bestselling author and personal finance expert who has transformed the way Americans think about personal finance, money, and life.',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=80&h=80&fit=crop&crop=face',
        sessions: ['keynote-2', 'workshop-1'],
        socialLinks: {
          twitter: 'https://twitter.com/SuzeOrmanShow',
          website: 'https://suzeorman.com'
        }
      },
      {
        id: 'speaker-3',
        name: 'Dave Ramsey',
        title: 'Radio Host & Author',
        company: 'Ramsey Solutions',
        bio: 'Radio host, author, and financial expert who has helped millions of people get out of debt and build wealth through his proven money principles.',
        avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=80&h=80&fit=crop&crop=face',
        sessions: ['workshop-2', 'panel-2'],
        socialLinks: {
          twitter: 'https://twitter.com/DaveRamsey',
          website: 'https://ramseysolutions.com'
        }
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
        location: 'Hall A - Main Stage',
        capacity: 15000,
        rsvpCount: 12750,
        materials: [
          { title: 'Future of Finance Slides', url: '#', type: 'slides' },
          { title: 'Resource Guide', url: '#', type: 'document' }
        ]
      },
      {
        id: 'workshop-1',
        title: 'Women & Wealth: Breaking Barriers',
        description: 'Addressing the unique financial challenges women face and providing actionable strategies for building wealth.',
        speaker: 'speaker-2',
        track: 'workshops',
        startTime: '11:00',
        endTime: '12:00',
        location: 'Hall B - Workshop Area',
        capacity: 500,
        rsvpCount: 485,
        materials: [
          { title: 'Women & Wealth Workbook', url: '#', type: 'document' }
        ]
      },
      {
        id: 'panel-1',
        title: 'Investing in Volatile Times',
        description: 'Expert panel discussion on navigating market uncertainty and making smart investment decisions.',
        speaker: 'speaker-1',
        track: 'panels',
        startTime: '14:00',
        endTime: '15:00',
        location: 'Hall C - Panel Stage',
        capacity: 1000,
        rsvpCount: 875
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
      { id: 17, name: 'Isabella Martinez', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=40&h=40&fit=crop&crop=face', role: 'Awards Producer' },
      { id: 18, name: 'Michael Torres', avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=40&h=40&fit=crop&crop=face', role: 'Music Director' }
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
    attendanceExpected: 750
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
      { id: 19, name: 'Amanda Liu', avatar: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=40&h=40&fit=crop&crop=face', role: 'Program Director' },
      { id: 20, name: 'Kevin Brown', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face', role: 'Investor Relations' }
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
    attendanceExpected: 400
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
      { id: 21, name: 'Zoe Parker', avatar: 'https://images.unsplash.com/photo-1506634572416-48cdfe530110?w=40&h=40&fit=crop&crop=face', role: 'Creator Relations' },
      { id: 22, name: 'Tyler Johnson', avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=40&h=40&fit=crop&crop=face', role: 'Content Strategy' }
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
    attendanceExpected: 200
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
      { id: 23, name: 'Rachel Green', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=40&h=40&fit=crop&crop=face', role: 'Awards Producer' },
      { id: 24, name: 'James Wilson', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face', role: 'Film Coordinator' }
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
    attendanceExpected: 500
  },
  'nba-hof-2025': {
    id: 'nba-hof-2025',
    title: 'NBA Hall of Fame Induction 2025',
    location: 'Springfield, MA',
    dateRange: 'Sep 12 - Sep 14, 2025',
    category: 'Sports Ceremony',
    description: 'Basketball Hall of Fame induction ceremony and celebration',
    tags: ['Basketball', 'Sports', 'Hall of Fame', 'Ceremony', 'Legacy'],
    participants: [
      { id: 25, name: 'Marcus Thompson', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face', role: 'Sports Coordinator' },
      { id: 26, name: 'Lisa Rodriguez', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face', role: 'Event Director' }
    ],
    itinerary: [
      {
        date: '2025-09-12',
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
    attendanceExpected: 300
  }
};
