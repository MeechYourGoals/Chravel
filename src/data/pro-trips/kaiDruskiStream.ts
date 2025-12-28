import { ProTripData } from '../../types/pro';
import { getMockAvatar } from '../../utils/mockAvatars';

export const kaiDruskiStream: ProTripData = {
  id: 'jake-paul-anthony-joshua-netflix',
  title: 'Jake Paul vs Anthony Joshua Netflix Fight Production',
  description: 'Major boxing event production for Netflix, featuring Jake Paul vs Anthony Joshua in Miami.',
  location: 'Miami, FL',
  dateRange: 'March 15 - March 18, 2025',
  proTripCategory: 'Content',
  tags: ['Content', 'Boxing', 'Sports Entertainment', 'Netflix Production'],
  basecamp_name: 'Kaseya Center',
  basecamp_address: '601 Biscayne Blvd, Miami, FL 33132',
  tasks: [
    {
      id: 'task-fight-1',
      title: 'Verify ring setup and safety protocols',
      description: 'Complete inspection of boxing ring installation and safety equipment',
      completed: true,
      due_at: '2025-03-14',
      assigned_to: 'production-director',
      created_at: new Date(Date.now() - 604800000).toISOString()
    },
    {
      id: 'task-fight-2',
      title: 'Coordinate broadcast equipment setup',
      description: 'Netflix streaming infrastructure and camera positioning',
      completed: false,
      due_at: '2025-03-15',
      assigned_to: 'technical-director',
      created_at: new Date().toISOString()
    }
  ],
  polls: [
    {
      id: 'poll-fight-1',
      question: 'Fight week media schedule preference?',
      options: [
        { id: 'opt1', text: 'Morning Press Events', votes: 18 },
        { id: 'opt2', text: 'Afternoon Sessions', votes: 25 },
        { id: 'opt3', text: 'Evening Only', votes: 12 }
      ],
      total_votes: 55,
      status: 'closed',
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  links: [
    {
      id: 'link-fight-1',
      url: 'https://www.netflix.com/sports',
      title: 'Netflix Sports Live Events',
      description: 'Official broadcast platform for fight event',
      domain: 'netflix.com',
      created_at: new Date().toISOString(),
      source: 'places'
    },
    {
      id: 'link-fight-2',
      url: 'https://www.fourseasons.com/miami',
      title: 'Four Seasons Miami - Team Hotel',
      description: 'Production crew and talent accommodation',
      domain: 'fourseasons.com',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      source: 'manual'
    }
  ],
  broadcasts: [
    {
      id: 'bc-fight-1',
      senderId: '1',
      message: 'Final production meeting at 3 PM. All crew leads must attend.',
      targetTrips: ['jake-paul-anthony-joshua-netflix'],
      priority: 'urgent',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      readBy: ['2', '3', '4']
    },
    {
      id: 'bc-fight-2',
      senderId: '3',
      message: 'Weigh-in scheduled for tomorrow at noon. Camera crews ready by 11 AM.',
      targetTrips: ['jake-paul-anthony-joshua-netflix'],
      priority: 'normal',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      readBy: ['1', '2']
    }
  ],
  participants: [
    { id: '1', name: 'Jake Paul', avatar: getMockAvatar('Jake Paul'), role: 'Fighters' },
    { id: '2', name: 'Anthony Joshua', avatar: getMockAvatar('Anthony Joshua'), role: 'Fighters' },
    { id: '3', name: 'Production Director', avatar: getMockAvatar('Production Director'), role: 'Production Crew' },
    { id: '4', name: 'Netflix Executive Producer', avatar: getMockAvatar('Netflix Executive Producer'), role: 'Production Crew' }
  ],
  budget: {
    total: 2500000,
    spent: 850000,
    categories: [
      { name: 'Venue & Production', budgeted: 1200000, spent: 450000 },
      { name: 'Broadcast Equipment', budgeted: 600000, spent: 200000 },
      { name: 'Crew & Talent', budgeted: 500000, spent: 150000 },
      { name: 'Logistics', budgeted: 200000, spent: 50000 }
    ]
  },
  itinerary: [
    {
      date: '2025-03-15',
      events: [
        { time: '08:00', title: 'Production Crew Setup', location: 'Kaseya Center', type: 'meeting' },
        { time: '12:00', title: 'Official Weigh-In Ceremony', location: 'Main Stage', type: 'meeting' },
        { time: '15:00', title: 'Press Conference', location: 'Media Room', type: 'meeting' },
        { time: '19:00', title: 'Fight Night Begins', location: 'Main Arena', type: 'meeting' }
      ]
    }
  ],
  roster: [
    {
      id: '1',
      name: 'Jake Paul',
      email: 'jake@paulpromotions.com',
      avatar: getMockAvatar('Jake Paul'),
      role: 'Fighters',
      credentialLevel: 'AllAccess',
      permissions: ['all-areas', 'fighter-exclusive'],
      roomPreferences: ['suite', 'high-floor'],
      dietaryRestrictions: []
    },
    {
      id: '2',
      name: 'Anthony Joshua',
      email: 'aj@joshuaboxing.com',
      avatar: getMockAvatar('Anthony Joshua'),
      role: 'Fighters',
      credentialLevel: 'AllAccess',
      permissions: ['all-areas', 'fighter-exclusive'],
      roomPreferences: ['suite', 'high-floor'],
      dietaryRestrictions: []
    },
    {
      id: '3',
      name: 'Production Director',
      email: 'production@netflix.com',
      avatar: getMockAvatar('Production Director'),
      role: 'Production Crew',
      credentialLevel: 'AllAccess',
      permissions: ['all-areas', 'production-control'],
      roomPreferences: ['suite', 'high-floor'],
      dietaryRestrictions: []
    },
    {
      id: '4',
      name: 'Netflix Executive Producer',
      email: 'exec@netflix.com',
      avatar: getMockAvatar('Netflix Executive Producer'),
      role: 'Production Crew',
      credentialLevel: 'AllAccess',
      permissions: ['all-areas', 'executive-access'],
      roomPreferences: ['suite', 'high-floor'],
      dietaryRestrictions: []
    }
  ],
  roomAssignments: [
    {
      id: 'room-fight1',
      room: 'Presidential Suite A',
      hotel: 'Four Seasons Miami',
      occupants: ['1'],
      checkIn: '2025-03-15T14:00:00Z',
      checkOut: '2025-03-18T12:00:00Z',
      roomType: 'suite',
      specialRequests: ['late-checkout', 'fighter-security']
    }
  ],
  schedule: [
    {
      id: 'sched-fight1',
      type: 'show',
      title: 'Main Event Fight',
      startTime: '2025-03-15T23:00:00Z',
      endTime: '2025-03-16T02:00:00Z',
      location: 'Kaseya Center Main Arena',
      participants: ['1', '2', '3', '4'],
      priority: 'critical',
      notes: 'Live Netflix broadcast of Paul vs Joshua main event'
    }
  ],
  perDiem: {
    dailyRate: 500,
    currency: 'USD',
    startDate: '2025-03-15',
    endDate: '2025-03-18',
    participants: [
      { participantId: '3', customRate: 750, advances: 0, deductions: 0, balance: 2250 },
      { participantId: '4', customRate: 650, advances: 0, deductions: 0, balance: 1950 }
    ]
  },
  settlement: [],
  medical: [],
  compliance: [
    {
      id: 'comp-fight1',
      type: 'safety',
      title: 'Boxing Commission Regulations',
      description: 'All fight operations must comply with Florida Athletic Commission rules',
      deadline: '2025-03-14',
      status: 'compliant',
      assignedTo: '3',
      documents: ['commission-approval.pdf', 'safety-protocols.pdf']
    }
  ],
  media: [
    {
      id: 'media-fight1',
      type: 'press-conference',
      outlet: 'Netflix Global Sports',
      contactPerson: 'Media Relations Director',
      scheduledTime: '2025-03-15T15:00:00Z',
      duration: 120,
      location: 'Kaseya Center Media Room',
      participants: ['1', '2', '3', '4'],
      status: 'confirmed'
    }
  ],
  sponsors: [
    {
      id: 'sponsor-fight1',
      sponsor: 'Netflix',
      activation: 'Exclusive broadcast rights and promotion',
      deadline: '2025-03-15',
      assignedTo: '4',
      status: 'completed',
      deliverables: ['live-broadcast', 'documentary-series', 'marketing-campaign'],
      notes: 'Netflix exclusive streaming partner for fight event'
    }
  ]
};