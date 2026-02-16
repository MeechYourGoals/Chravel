import { ProTripData } from '../../types/pro';
import { getMockAvatar } from '../../utils/mockAvatars';

export const googleIO2026: ProTripData = {
  id: 'google-io-2026',
  title: 'Google I/O 2026 – Speakers & Demo Team',
  description: 'Google I/O 2026 developer conference speakers and demonstration team coordination.',
  location: 'Mountain View, CA',
  dateRange: 'May 12 - May 15, 2026',
  category: 'Enterprise',
  proTripCategory: 'work',
  tags: [],
  participants: [
    { id: '1', name: 'Sundar Pichai', avatar: getMockAvatar('Sundar Pichai'), role: 'Keynote Speakers' },
    { id: '2', name: 'Aparna Pappu', avatar: getMockAvatar('Aparna Pappu'), role: 'Demo Team' },
    { id: '3', name: 'Jordan Tigani', avatar: getMockAvatar('Jordan Tigani'), role: 'Product Managers' },
    { id: '4', name: 'Maya Chen', avatar: getMockAvatar('Maya Chen'), role: 'Developer Advocates' }
  ],
  budget: {
    total: 500000,
    spent: 125000,
    categories: [
      { name: 'Speaker Fees', budgeted: 200000, spent: 50000 },
      { name: 'Production', budgeted: 150000, spent: 40000 },
      { name: 'Accommodation', budgeted: 100000, spent: 25000 },
      { name: 'Catering', budgeted: 50000, spent: 10000 }
    ]
  },
  itinerary: [
    {
      date: '2026-05-12',
      events: [
        { time: '08:00', title: 'Keynote Rehearsal', location: 'Shoreline Amphitheatre', type: 'meeting' },
        { time: '10:00', title: 'Opening Keynote', location: 'Main Stage', type: 'meeting' },
        { time: '12:00', title: 'Developer Sessions Begin', location: 'Various Venues', type: 'meeting' },
        { time: '17:00', title: 'Developer After Hours', location: 'Googleplex', type: 'meeting' }
      ]
    }
  ],
  roster: [
    {
      id: '1',
      name: 'Sundar Pichai',
      email: 'sundar@google.com',
      avatar: getMockAvatar('Sundar Pichai'),
      role: 'Keynote Speakers',
      credentialLevel: 'AllAccess',
      permissions: ['all-areas', 'executive-access'],
      roomPreferences: ['executive-suite', 'private-transportation'],
      dietaryRestrictions: ['vegetarian']
    },
    {
      id: '2',
      name: 'Aparna Pappu',
      email: 'aparna@google.com',
      avatar: getMockAvatar('Aparna Pappu'),
      role: 'Demo Team',
      credentialLevel: 'AllAccess',
      permissions: ['demo-areas', 'backstage-access'],
      roomPreferences: ['suite', 'tech-setup'],
      dietaryRestrictions: []
    },
    {
      id: '3',
      name: 'Jordan Tigani',
      email: 'jtigani@google.com',
      avatar: getMockAvatar('Jordan Tigani'),
      role: 'Product Managers',
      credentialLevel: 'Backstage',
      permissions: ['product-demos', 'press-access'],
      roomPreferences: ['standard-suite'],
      dietaryRestrictions: ['gluten-free']
    },
    {
      id: '4',
      name: 'Maya Chen',
      email: 'mchen@google.com',
      avatar: getMockAvatar('Maya Chen'),
      role: 'Developer Advocates',
      credentialLevel: 'Backstage',
      permissions: ['developer-areas', 'community-access'],
      roomPreferences: ['standard-room'],
      dietaryRestrictions: []
    }
  ],
  roomAssignments: [
    {
      id: 'room-gio1',
      room: 'Executive Suite 2001',
      hotel: 'Four Seasons Silicon Valley',
      occupants: ['1'],
      checkIn: '2026-05-11T15:00:00Z',
      checkOut: '2026-05-16T12:00:00Z',
      roomType: 'suite',
      specialRequests: ['executive-floor', 'private-check-in']
    }
  ],
  schedule: [
    {
      id: 'sched-gio1',
      type: 'meeting',
      title: 'AI for Everyone Keynote',
      startTime: '2026-05-12T10:00:00Z',
      endTime: '2026-05-12T11:30:00Z',
      location: 'Shoreline Amphitheatre Main Stage',
      participants: ['1', '2'],
      priority: 'critical',
      notes: 'Major AI announcements and product launches'
    }
  ],
  perDiem: {
    dailyRate: 250,
    currency: 'USD',
    startDate: '2026-05-12',
    endDate: '2026-05-15',
    participants: [
      { participantId: '1', customRate: 0, advances: 0, deductions: 0, balance: 0 },
      { participantId: '2', customRate: 300, advances: 0, deductions: 0, balance: 1200 }
    ]
  },
  settlement: [],
  medical: [],
  compliance: [
    {
      id: 'comp-gio1',
      type: 'safety',
      title: 'Google Security Clearance',
      description: 'All speakers must complete security screening',
      deadline: '2026-05-01',
      status: 'compliant',
      assignedTo: '1',
      documents: ['security-clearance.pdf']
    }
  ],
  media: [
    {
      id: 'media-gio1',
      type: 'press-conference',
      outlet: 'Google Developer Channel',
      contactPerson: 'Media Relations',
      scheduledTime: '2026-05-12T10:00:00Z',
      duration: 240,
      location: 'Shoreline Amphitheatre',
      participants: ['1', '2', '3', '4'],
      status: 'confirmed'
    }
  ],
  sponsors: []
};