import { ProTripData } from '../../types/pro';

export const realHousewivesAtlShoot: ProTripData = {
  id: 'real-housewives-atl-s9-shoot-2025',
  title: 'Real Housewives ATL S9 Cast & Crew Shoot',
  description: 'Reality TV production shoot for Real Housewives of Atlanta Season 9 cast and crew.',
  location: 'Atlanta GA',
  dateRange: 'Aug 1 - Sep 30, 2025',
  category: 'TV Production',
  tags: ['TV Production', 'Reality Show', 'Cast & Crew'],
  participants: [
    { id: 27, name: 'Kenya Moore', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=40&h=40&fit=crop&crop=face', role: 'Cast' },
    { id: 28, name: 'Executive Producer', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face', role: 'Producers' },
    { id: 29, name: 'Camera Operator', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face', role: 'Camera Operators' },
    { id: 30, name: 'Production Assistant', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face', role: 'Crew' }
  ],
  budget: {
    total: 2500000,
    spent: 850000,
    categories: [
      { name: 'Cast Fees', budgeted: 1500000, spent: 500000 },
      { name: 'Crew Salaries', budgeted: 600000, spent: 200000 },
      { name: 'Production Costs', budgeted: 300000, spent: 100000 },
      { name: 'Location Fees', budgeted: 100000, spent: 50000 }
    ]
  },
  itinerary: [
    {
      date: '2025-08-01',
      events: [
        { time: '08:00', title: 'Production Setup', location: 'Atlanta Studio', type: 'meeting' },
        { time: '10:00', title: 'Cast Interviews', location: 'Interview Room A', type: 'meeting' },
        { time: '14:00', title: 'Group Scene Filming', location: 'Restaurant Location', type: 'meeting' },
        { time: '18:00', title: 'Wrap and Review', location: 'Production Office', type: 'meeting' }
      ]
    }
  ],
  roster: [
    {
      id: '27',
      name: 'Kenya Moore',
      email: 'kenya@bravotv.com',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=40&h=40&fit=crop&crop=face',
      role: 'Cast',
      credentialLevel: 'AllAccess',
      permissions: ['cast-areas', 'media-access'],
      roomPreferences: ['luxury-suite', 'atlanta-downtown'],
      dietaryRestrictions: ['organic-only']
    },
    {
      id: '28',
      name: 'Executive Producer',
      email: 'producer@bravotv.com',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
      role: 'Producers',
      credentialLevel: 'AllAccess',
      permissions: ['all-areas', 'production-control'],
      roomPreferences: ['executive-suite', 'near-production'],
      dietaryRestrictions: []
    },
    {
      id: '29',
      name: 'Camera Operator',
      email: 'camera@bravotv.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
      role: 'Camera Operators',
      credentialLevel: 'Backstage',
      permissions: ['filming-areas', 'equipment-access'],
      roomPreferences: ['crew-housing'],
      dietaryRestrictions: []
    },
    {
      id: '30',
      name: 'Production Assistant',
      email: 'pa@bravotv.com',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face',
      role: 'Crew',
      credentialLevel: 'Guest',
      permissions: ['general-access'],
      roomPreferences: ['crew-housing'],
      dietaryRestrictions: ['vegetarian']
    }
  ],
  roomAssignments: [
    {
      id: 'room-rh1',
      room: 'Penthouse Suite',
      hotel: 'St. Regis Atlanta',
      occupants: ['27'],
      checkIn: '2025-08-01T14:00:00Z',
      checkOut: '2025-09-30T12:00:00Z',
      roomType: 'suite',
      specialRequests: ['luxury-amenities', 'privacy', 'late-checkout']
    }
  ],
  equipment: [
    {
      id: 'eq-rh1',
      name: 'Professional Camera Kit',
      category: 'video',
      quantity: 3,
      location: 'Production Truck',
      status: 'setup',
      assignedTo: '29',
      notes: '4K cameras with full lighting kit'
    }
  ],
  schedule: [
    {
      id: 'sched-rh1',
      type: 'meeting',
      title: 'Season Finale Shoot',
      startTime: '2025-09-25T08:00:00Z',
      endTime: '2025-09-25T22:00:00Z',
      location: 'Atlanta Event Venue',
      participants: ['27', '28', '29', '30'],
      priority: 'critical',
      notes: 'Major season wrap-up scene'
    }
  ],
  perDiem: {
    dailyRate: 100,
    currency: 'USD',
    startDate: '2025-08-01',
    endDate: '2025-09-30',
    participants: [
      { participantId: '27', customRate: 250, advances: 0, deductions: 0, balance: 15250 },
      { participantId: '28', customRate: 150, advances: 0, deductions: 0, balance: 9150 }
    ]
  },
  settlement: [
    {
      venue: 'Bravo Network',
      date: '2025-09-30',
      guarantee: 1500000,
      backendPercentage: 100,
      grossRevenue: 2500000,
      expenses: 850000,
      netRevenue: 1650000,
      merchandiseRevenue: 0,
      finalPayout: 1650000,
      status: 'pending'
    }
  ],
  medical: [],
  compliance: [
    {
      id: 'comp-rh1',
      type: 'safety',
      title: 'TV Production Safety Compliance',
      description: 'All crew must complete safety training and background checks',
      deadline: '2025-07-25',
      status: 'compliant',
      assignedTo: '28',
      documents: ['safety-training.pdf', 'background-checks.pdf']
    }
  ],
  media: [
    {
      id: 'media-rh1',
      type: 'interview',
      outlet: 'Entertainment Tonight',
      contactPerson: 'Kevin Frazier',
      scheduledTime: '2025-09-28T16:00:00Z',
      duration: 20,
      location: 'Atlanta Studio',
      participants: ['27'],
      status: 'scheduled'
    }
  ],
  sponsors: [
    {
      id: 'sponsor-rh1',
      sponsor: 'Fashion Nova',
      activation: 'Wardrobe integration',
      deadline: '2025-08-15',
      assignedTo: '27',
      status: 'in-progress',
      deliverables: ['wardrobe-showcase', 'social-media-posts'],
      notes: 'Season-long wardrobe partnership'
    }
  ]
};
