import { ProTripData } from '../../types/pro';
import { getMockAvatar } from '../../utils/mockAvatars';

export const beyonceCowboyCarterTour: ProTripData = {
  id: 'beyonce-cowboy-carter-tour',
  title: 'Beyoncé – Cowboy Carter World Tour (Intl Leg)',
  description: 'International leg of Beyoncé Cowboy Carter World Tour covering major stadiums across Europe and Asia.',
  location: 'London, Paris, Tokyo, Sydney',
  dateRange: 'Mar 1 - Apr 30, 2025',
  proTripCategory: 'Tour – Music, Comedy, etc.',
  tags: ['Music Tour', 'Concert', 'International'],
  basecamp_name: 'Wembley Stadium',
  basecamp_address: 'Wembley, London HA9 0WS, United Kingdom',
  broadcasts: [],
  participants: [
    { id: 4, name: 'Beyoncé', avatar: '/images/avatars/blank-05.png', role: 'Artists' },
    { id: 5, name: 'Les Twins', avatar: getMockAvatar('Les Twins'), role: 'Dancers' },
    { id: 6, name: 'Simmie Cobbs Jr.', avatar: getMockAvatar('Simmie Cobbs Jr.'), role: 'Band' },
    { id: 7, name: 'Musical Director', avatar: getMockAvatar('Musical Director'), role: 'Band' },
    { id: 8, name: 'Tour Director', avatar: getMockAvatar('Tour Director'), role: 'Tour Manager' },
    { id: 9, name: 'Production Manager', avatar: getMockAvatar('Production Manager'), role: 'Production Crew' },
    { id: 10, name: 'Lighting Designer', avatar: getMockAvatar('Lighting Designer'), role: 'Production Crew' },
    { id: 11, name: 'Sound Engineer', avatar: getMockAvatar('Sound Engineer'), role: 'Production Crew' },
    { id: 12, name: 'Stage Manager', avatar: getMockAvatar('Stage Manager'), role: 'Production Crew' },
    { id: 13, name: 'Costume Designer', avatar: getMockAvatar('Costume Designer'), role: 'Creative Team' },
    { id: 14, name: 'Choreographer', avatar: getMockAvatar('Choreographer'), role: 'Creative Team' },
    { id: 15, name: 'Creative Director', avatar: getMockAvatar('Creative Director'), role: 'Creative Team' },
    { id: 16, name: 'Security Chief', avatar: getMockAvatar('Security Chief'), role: 'Security' },
    { id: 17, name: 'Personal Security 1', avatar: getMockAvatar('Personal Security 1'), role: 'Security' },
    { id: 18, name: 'Personal Security 2', avatar: getMockAvatar('Personal Security 2'), role: 'Security' },
    { id: 19, name: 'Wardrobe Assistant 1', avatar: getMockAvatar('Wardrobe Assistant 1'), role: 'Wardrobe' },
    { id: 20, name: 'Wardrobe Assistant 2', avatar: getMockAvatar('Wardrobe Assistant 2'), role: 'Wardrobe' },
    { id: 21, name: 'Hair Stylist', avatar: getMockAvatar('Hair Stylist'), role: 'Hair & Makeup' },
    { id: 22, name: 'Makeup Artist', avatar: getMockAvatar('Makeup Artist'), role: 'Hair & Makeup' },
    { id: 23, name: 'Personal Assistant', avatar: getMockAvatar('Personal Assistant'), role: 'Personal Staff' },
    { id: 24, name: 'Tour Photographer', avatar: getMockAvatar('Tour Photographer'), role: 'Media' },
    { id: 25, name: 'Videographer', avatar: getMockAvatar('Videographer'), role: 'Media' },
    { id: 26, name: 'Catering Manager', avatar: getMockAvatar('Catering Manager'), role: 'Catering' },
    { id: 27, name: 'Transportation Coordinator', avatar: getMockAvatar('Transportation Coordinator'), role: 'Logistics' },
    { id: 28, name: 'Venue Coordinator', avatar: getMockAvatar('Venue Coordinator'), role: 'Logistics' },
    { id: 29, name: 'FOH Engineer', avatar: getMockAvatar('FOH Engineer'), role: 'Audio Team' },
    { id: 30, name: 'Monitor Engineer', avatar: getMockAvatar('Monitor Engineer'), role: 'Audio Team' },
    { id: 31, name: 'Lighting Technician 1', avatar: getMockAvatar('Lighting Technician 1'), role: 'Lighting Team' },
    { id: 32, name: 'Lighting Technician 2', avatar: getMockAvatar('Lighting Technician 2'), role: 'Lighting Team' },
    { id: 33, name: 'Video Director', avatar: getMockAvatar('Video Director'), role: 'Video Team' },
    { id: 34, name: 'Camera Operator 1', avatar: getMockAvatar('Camera Operator 1'), role: 'Video Team' },
    { id: 35, name: 'Camera Operator 2', avatar: getMockAvatar('Camera Operator 2'), role: 'Video Team' },
    { id: 36, name: 'Backup Dancer 1', avatar: getMockAvatar('Backup Dancer 1'), role: 'Dancers' },
    { id: 37, name: 'Backup Dancer 2', avatar: getMockAvatar('Backup Dancer 2'), role: 'Dancers' },
    { id: 38, name: 'Backup Dancer 3', avatar: getMockAvatar('Backup Dancer 3'), role: 'Dancers' },
    { id: 39, name: 'Backup Dancer 4', avatar: getMockAvatar('Backup Dancer 4'), role: 'Dancers' },
    { id: 40, name: 'Backup Dancer 5', avatar: getMockAvatar('Backup Dancer 5'), role: 'Dancers' },
    { id: 41, name: 'Backup Dancer 6', avatar: getMockAvatar('Backup Dancer 6'), role: 'Dancers' },
    { id: 42, name: 'Guitar Player 1', avatar: getMockAvatar('Guitar Player 1'), role: 'Band' },
    { id: 43, name: 'Guitar Player 2', avatar: getMockAvatar('Guitar Player 2'), role: 'Band' },
    { id: 44, name: 'Bass Player', avatar: getMockAvatar('Bass Player'), role: 'Band' },
    { id: 45, name: 'Drummer', avatar: getMockAvatar('Drummer'), role: 'Band' },
    { id: 46, name: 'Keyboard Player', avatar: getMockAvatar('Keyboard Player'), role: 'Band' },
    { id: 47, name: 'Percussion', avatar: getMockAvatar('Percussion'), role: 'Band' },
    { id: 48, name: 'Backup Vocalist 1', avatar: getMockAvatar('Backup Vocalist 1'), role: 'Band' },
    { id: 49, name: 'Backup Vocalist 2', avatar: getMockAvatar('Backup Vocalist 2'), role: 'Band' },
    { id: 50, name: 'Pyrotechnics Specialist', avatar: getMockAvatar('Pyrotechnics Specialist'), role: 'Special Effects' },
    { id: 51, name: 'Rigging Specialist', avatar: getMockAvatar('Rigging Specialist'), role: 'Production Crew' },
    { id: 52, name: 'Set Designer', avatar: getMockAvatar('Set Designer'), role: 'Creative Team' },
    { id: 53, name: 'Staging Coordinator', avatar: getMockAvatar('Staging Coordinator'), role: 'Production Crew' },
    { id: 54, name: 'Load-In Manager', avatar: getMockAvatar('Load-In Manager'), role: 'Production Crew' },
    { id: 55, name: 'Truck Driver 1', avatar: getMockAvatar('Truck Driver 1'), role: 'Transportation' },
    { id: 56, name: 'Truck Driver 2', avatar: getMockAvatar('Truck Driver 2'), role: 'Transportation' },
    { id: 57, name: 'Bus Driver', avatar: getMockAvatar('Bus Driver'), role: 'Transportation' },
    { id: 58, name: 'Travel Coordinator', avatar: getMockAvatar('Travel Coordinator'), role: 'Logistics' },
    { id: 59, name: 'Merchandise Manager', avatar: getMockAvatar('Merchandise Manager'), role: 'Merchandise' },
    { id: 60, name: 'Tour Accountant', avatar: getMockAvatar('Tour Accountant'), role: 'Tour Manager' }
  ],
  budget: {
    total: 25000000,
    spent: 8500000,
    categories: [
      { name: 'Production', budgeted: 15000000, spent: 5000000 },
      { name: 'Travel & Logistics', budgeted: 5000000, spent: 1800000 },
      { name: 'Accommodation', budgeted: 3000000, spent: 1200000 },
      { name: 'Marketing', budgeted: 2000000, spent: 500000 }
    ]
  },
  itinerary: [
    {
      date: '2025-03-01',
      events: [
        { time: '10:00', title: 'Load-in Begins', location: 'Wembley Stadium', type: 'meeting' },
        { time: '14:00', title: 'Sound Check', location: 'Wembley Stadium Main Stage', type: 'meeting' },
        { time: '17:00', title: 'Final Rehearsal', location: 'Wembley Stadium', type: 'meeting' },
        { time: '20:00', title: 'Show Time', location: 'Wembley Stadium', type: 'meeting' }
      ]
    }
  ],
  roster: [
    {
      id: '4',
      name: 'Beyoncé',
      email: 'beyonce@beyonce.com',
      avatar: getMockAvatar('Beyoncé'),
      role: 'Artists',
      credentialLevel: 'AllAccess',
      permissions: ['all-areas', 'artist-privileges'],
      roomPreferences: ['presidential-suite', 'top-floor', 'extra-security'],
      dietaryRestrictions: ['no-dairy']
    },
    {
      id: '5',
      name: 'Tour Director',
      email: 'director@tourmanagement.com',
      avatar: getMockAvatar('Tour Director'),
      role: 'Tour Manager',
      credentialLevel: 'AllAccess',
      permissions: ['all-areas', 'tour-management'],
      roomPreferences: ['executive-suite', 'near-artist'],
      dietaryRestrictions: []
    },
    {
      id: '6',
      name: 'Production Manager',
      email: 'production@tourteam.com',
      avatar: getMockAvatar('Production Manager'),
      role: 'Production Crew',
      credentialLevel: 'Backstage',
      permissions: ['production-areas', 'equipment-access'],
      roomPreferences: ['standard-suite'],
      dietaryRestrictions: ['vegetarian']
    },
    {
      id: '7',
      name: 'Security Chief',
      email: 'security@tourteam.com',
      avatar: getMockAvatar('Security Chief'),
      role: 'Security',
      credentialLevel: 'AllAccess',
      permissions: ['security-protocols', 'emergency-access'],
      roomPreferences: ['standard-room', 'security-floor']
    },
    {
      id: '8',
      name: 'Sound Engineer',
      email: 'sound@tourteam.com',
      avatar: getMockAvatar('Sound Engineer'),
      role: 'Production Crew',
      credentialLevel: 'Backstage',
      permissions: ['audio-equipment', 'stage-access'],
      roomPreferences: ['crew-housing']
    }
  ],
  roomAssignments: [
    {
      id: 'room-ts1',
      room: 'Presidential Suite',
      hotel: 'The Langham London',
      occupants: ['4'],
      checkIn: '2025-02-28T14:00:00Z',
      checkOut: '2025-03-03T12:00:00Z',
      roomType: 'suite',
      specialRequests: ['extra-security', 'private-entrance', 'soundproofing']
    }
  ],
  schedule: [
    {
      id: 'sched-ts1',
      type: 'load-in',
      title: 'Production Load-in',
      startTime: '2025-03-01T08:00:00Z',
      endTime: '2025-03-01T12:00:00Z',
      location: 'Wembley Stadium Loading Dock',
      participants: ['6', '8'],
      priority: 'critical',
      notes: 'All production gear must be in place before sound check'
    }
  ],
  perDiem: {
    dailyRate: 200,
    currency: 'USD',
    startDate: '2025-03-01',
    endDate: '2025-04-30',
    participants: [
      { participantId: '4', customRate: 0, advances: 0, deductions: 0, balance: 0 },
      { participantId: '5', customRate: 300, advances: 0, deductions: 0, balance: 18300 },
      { participantId: '6', customRate: 250, advances: 0, deductions: 0, balance: 15250 }
    ]
  },
  settlement: [
    {
      venue: 'Wembley Stadium',
      date: '2025-03-01',
      guarantee: 8000000,
      backendPercentage: 85,
      grossRevenue: 12000000,
      expenses: 2500000,
      netRevenue: 9500000,
      merchandiseRevenue: 1500000,
      finalPayout: 11000000,
      status: 'calculated'
    }
  ],
  medical: [],
  compliance: [
    {
      id: 'comp-ts1',
      type: 'visa',
      title: 'International Tour Visas',
      description: 'All crew must have valid work visas for UK, France, Japan, and Australia',
      deadline: '2025-02-15',
      status: 'compliant',
      assignedTo: '5',
      documents: ['visa-checklist.pdf', 'work-permits.pdf']
    }
  ],
  media: [
    {
      id: 'media-ts1',
      type: 'interview',
      outlet: 'BBC Radio 1',
      contactPerson: 'Greg James',
      scheduledTime: '2025-03-02T10:00:00Z',
      duration: 45,
      location: 'BBC Broadcasting House',
      participants: ['4'],
      status: 'confirmed'
    }
  ],
  sponsors: [
    {
      id: 'sponsor-ts1',
      sponsor: 'Apple Music',
      activation: 'Exclusive streaming rights',
      deadline: '2025-03-01',
      assignedTo: '5',
      status: 'in-progress',
      deliverables: ['exclusive-content', 'behind-scenes-footage'],
      notes: 'Multi-platform content creation and distribution'
    }
  ]
};
