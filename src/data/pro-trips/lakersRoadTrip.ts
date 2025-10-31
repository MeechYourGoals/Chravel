import { ProTripData } from '../../types/pro';
import { getMockAvatar } from '../../utils/mockAvatars';

export const lakersRoadTrip: ProTripData = {
  id: 'lakers-road-trip',
  title: 'Lakers Road Trip - Western Conference',
  description: 'Los Angeles Lakers road trip covering 5 games across the Western Conference.',
  location: 'Phoenix AZ, Denver CO, Portland OR',
  dateRange: 'Jan 20 - Feb 3, 2025',
  proTripCategory: 'Sports – Pro, Collegiate, Youth',
  tags: ['Sports', 'Basketball', 'Road Trip'],
  basecamp_name: 'Staples Center',
  basecamp_address: '1111 S Figueroa St, Los Angeles, CA 90015',
  broadcasts: [],
  participants: [
    { id: 1, name: 'LeBron James', avatar: getMockAvatar('LeBron James'), role: 'Players' },
    { id: 2, name: 'Anthony Davis', avatar: getMockAvatar('Anthony Davis'), role: 'Players' },
    { id: 3, name: 'Austin Reaves', avatar: getMockAvatar('Austin Reaves'), role: 'Players' },
    { id: 4, name: 'D\'Angelo Russell', avatar: getMockAvatar('D\'Angelo Russell'), role: 'Players' },
    { id: 5, name: 'Rui Hachimura', avatar: getMockAvatar('Rui Hachimura'), role: 'Players' },
    { id: 6, name: 'Christian Wood', avatar: getMockAvatar('Christian Wood'), role: 'Players' },
    { id: 7, name: 'Jarred Vanderbilt', avatar: getMockAvatar('Jarred Vanderbilt'), role: 'Players' },
    { id: 8, name: 'Taurean Prince', avatar: getMockAvatar('Taurean Prince'), role: 'Players' },
    { id: 9, name: 'Gabe Vincent', avatar: getMockAvatar('Gabe Vincent'), role: 'Players' },
    { id: 10, name: 'Cam Reddish', avatar: getMockAvatar('Cam Reddish'), role: 'Players' },
    { id: 11, name: 'Max Christie', avatar: getMockAvatar('Max Christie'), role: 'Players' },
    { id: 12, name: 'Dalton Knecht', avatar: getMockAvatar('Dalton Knecht'), role: 'Players' },
    { id: 13, name: 'Jalen Hood-Schifino', avatar: getMockAvatar('Jalen Hood-Schifino'), role: 'Players' },
    { id: 14, name: 'Maxwell Lewis', avatar: getMockAvatar('Maxwell Lewis'), role: 'Players' },
    { id: 15, name: 'Christian Koloko', avatar: getMockAvatar('Christian Koloko'), role: 'Players' },
    { id: 16, name: 'Head Coach Redick', avatar: getMockAvatar('Head Coach Redick'), role: 'Coaches' },
    { id: 17, name: 'Assistant Coach Nate McMillan', avatar: getMockAvatar('Assistant Coach Nate McMillan'), role: 'Coaches' },
    { id: 18, name: 'Assistant Coach Scott Brooks', avatar: getMockAvatar('Assistant Coach Scott Brooks'), role: 'Coaches' },
    { id: 19, name: 'Team Doctor', avatar: getMockAvatar('Team Doctor'), role: 'Medical Staff' },
    { id: 20, name: 'Head Trainer', avatar: getMockAvatar('Head Trainer'), role: 'Medical Staff' },
    { id: 21, name: 'Team Manager', avatar: getMockAvatar('Team Manager'), role: 'Team Operations' },
    { id: 22, name: 'Logistics Coordinator', avatar: getMockAvatar('Logistics Coordinator'), role: 'Team Operations' }
  ],
  budget: {
    total: 150000,
    spent: 45000,
    categories: [
      { name: 'Travel', budgeted: 60000, spent: 20000 },
      { name: 'Accommodation', budgeted: 50000, spent: 15000 },
      { name: 'Meals', budgeted: 30000, spent: 8000 },
      { name: 'Logistics', budgeted: 10000, spent: 2000 }
    ]
  },
  itinerary: [
    {
      date: '2025-01-20',
      events: [
        { time: '08:00', title: 'Team Departure', location: 'LAX Airport', type: 'travel' },
        { time: '12:00', title: 'Arrival in Phoenix', location: 'Phoenix Sky Harbor', type: 'travel' },
        { time: '16:00', title: 'Team Practice', location: 'Footprint Center', type: 'meeting' },
        { time: '19:00', title: 'Game vs Suns', location: 'Footprint Center', type: 'meeting' }
      ]
    }
  ],
  roster: [
    {
      id: '1',
      name: 'Luka Doncic',
      email: 'ld@lakers.com',
      avatar: getMockAvatar('Luka Doncic'),
      role: 'Players',
      credentialLevel: 'AllAccess',
      permissions: ['locker-room', 'team-areas'],
      roomPreferences: ['suite', 'high-floor'],
      dietaryRestrictions: []
    },
    {
      id: '2',
      name: 'Coach Johnson',
      email: 'coach@lakers.com',
      avatar: getMockAvatar('Coach Johnson'),
      role: 'Coaches',
      credentialLevel: 'AllAccess',
      permissions: ['all-areas', 'team-management'],
      roomPreferences: ['suite', 'quiet-floor'],
      dietaryRestrictions: ['diabetic-friendly']
    },
    {
      id: '3',
      name: 'Team Manager',
      email: 'manager@lakers.com',
      avatar: getMockAvatar('Team Manager'),
      role: 'PR/Marketing',
      credentialLevel: 'Backstage',
      permissions: ['team-coordination', 'logistics'],
      roomPreferences: ['standard-room']
    }
  ],
  roomAssignments: [
    {
      id: 'room-1',
      room: 'Suite 1201',
      hotel: 'Phoenix Marriott',
      occupants: ['1'],
      checkIn: '2025-01-20T15:00:00Z',
      checkOut: '2025-01-21T11:00:00Z',
      roomType: 'suite',
      specialRequests: ['late-checkout', 'quiet-floor']
    }
  ],
  schedule: [
    {
      id: 'sched-1',
      type: 'meeting',
      title: 'Pre-game Team Meeting',
      startTime: '2025-01-20T17:00:00Z',
      endTime: '2025-01-20T18:00:00Z',
      location: 'Hotel Conference Room',
      participants: ['1', '2', '3'],
      priority: 'high',
      notes: 'Review game strategy and matchups'
    }
  ],
  perDiem: {
    dailyRate: 150,
    currency: 'USD',
    startDate: '2025-01-20',
    endDate: '2025-02-03',
    participants: [
      { participantId: '1', customRate: 200, advances: 0, deductions: 0, balance: 2800 },
      { participantId: '2', customRate: 175, advances: 0, deductions: 0, balance: 2450 }
    ]
  },
  settlement: [],
  medical: [
    {
      id: 'med-1',
      participantId: '1',
      date: '2025-01-18',
      type: 'checkup',
      description: 'Pre-trip physical examination',
      severity: 'minor',
      status: 'resolved',
      treatedBy: 'Team Doctor Smith',
      restricted: false
    }
  ],
  compliance: [
    {
      id: 'comp-1',
      type: 'safety',
      title: 'NBA Travel Protocols',
      description: 'All team members must follow NBA travel and safety guidelines',
      deadline: '2025-01-19',
      status: 'compliant',
      assignedTo: '2',
      documents: ['nba-travel-policy.pdf']
    }
  ],
  media: [],
  sponsors: []
};
