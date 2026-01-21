import { ProTripData } from '../../types/pro';
import { getMockAvatar } from '../../utils/mockAvatars';

export const kaiDruskiStream: ProTripData = {
  id: 'amazon-prime-sports-broadcast-miami',
  title: 'Amazon Prime — Live Sports Broadcast Crew',
  description: 'On-site production and broadcast operations for live-streamed sports programming.',
  location: 'Miami, FL',
  dateRange: 'March 12 - March 17, 2026',
  proTripCategory: 'Content',
  tags: [],
  basecamp_name: 'Hard Rock Stadium',
  basecamp_address: '347 Don Shula Dr, Miami Gardens, FL 33056',
  tasks: [
    {
      id: 'task-broadcast-1',
      title: 'Verify camera rig installation',
      description: 'Complete inspection of all camera positions and broadcast equipment',
      completed: true,
      due_at: '2026-03-11',
      assigned_to: 'technical-director',
      created_at: new Date(Date.now() - 604800000).toISOString()
    },
    {
      id: 'task-broadcast-2',
      title: 'Test streaming infrastructure',
      description: 'Amazon Prime Video streaming setup and connectivity testing',
      completed: false,
      due_at: '2026-03-12',
      assigned_to: 'broadcast-ops',
      created_at: new Date().toISOString()
    }
  ],
  polls: [
    {
      id: 'poll-broadcast-1',
      question: 'Preferred crew call time for broadcast day?',
      options: [
        { id: 'opt1', text: '5:00 AM (Early Setup)', votes: 12 },
        { id: 'opt2', text: '7:00 AM (Standard)', votes: 15 },
        { id: 'opt3', text: '9:00 AM (Late Start)', votes: 4 }
      ],
      total_votes: 31,
      status: 'closed',
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  links: [
    {
      id: 'link-broadcast-1',
      url: 'https://www.amazon.com/primevideo/sports',
      title: 'Amazon Prime Video Sports',
      description: 'Official broadcast platform for live sports',
      domain: 'amazon.com',
      created_at: new Date().toISOString(),
      source: 'places'
    },
    {
      id: 'link-broadcast-2',
      url: 'https://www.hardrockstadium.com',
      title: 'Hard Rock Stadium - Broadcast Venue',
      description: 'Venue information and crew access details',
      domain: 'hardrockstadium.com',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      source: 'manual'
    }
  ],
  broadcasts: [
    {
      id: 'bc-broadcast-1',
      senderId: '1',
      message: 'Final broadcast prep meeting at 2 PM. All department heads required.',
      targetTrips: ['amazon-prime-sports-broadcast-miami'],
      priority: 'urgent',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      readBy: ['2', '3', '4']
    },
    {
      id: 'bc-broadcast-2',
      senderId: '2',
      message: 'Camera test scheduled for 10 AM tomorrow. All camera ops on standby.',
      targetTrips: ['amazon-prime-sports-broadcast-miami'],
      priority: 'normal',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      readBy: ['1', '3']
    }
  ],
  participants: [
    { id: '1', name: 'Dana Schultz', avatar: getMockAvatar('Dana Schultz'), role: 'Executive Producer' },
    { id: '2', name: 'Ramon Alvarez', avatar: getMockAvatar('Ramon Alvarez'), role: 'Technical Director' },
    { id: '3', name: 'Sophie Chen', avatar: getMockAvatar('Sophie Chen'), role: 'Broadcast Ops' },
    { id: '4', name: 'Luke Matthews', avatar: getMockAvatar('Luke Matthews'), role: 'Camera Lead' },
    { id: '5', name: 'Priya Nair', avatar: getMockAvatar('Priya Nair'), role: 'Talent Coordination' }
  ],
  budget: {
    total: 1800000,
    spent: 750000,
    categories: [
      { name: 'Broadcast Equipment', budgeted: 800000, spent: 350000 },
      { name: 'Crew & Staff', budgeted: 600000, spent: 250000 },
      { name: 'Venue & Facilities', budgeted: 300000, spent: 120000 },
      { name: 'Logistics & Travel', budgeted: 100000, spent: 30000 }
    ]
  },
  itinerary: [
    {
      date: '2026-03-12',
      events: [
        { time: '07:00', title: 'Broadcast Equipment Setup', location: 'Hard Rock Stadium', type: 'meeting' },
        { time: '10:00', title: 'Camera Test & Positioning', location: 'Broadcast Booth', type: 'meeting' },
        { time: '14:00', title: 'Technical Rehearsal', location: 'Production Truck', type: 'meeting' },
        { time: '18:00', title: 'Pre-Broadcast Final Check', location: 'Control Room', type: 'meeting' }
      ]
    }
  ],
  roster: [
    {
      id: '1',
      name: 'Dana Schultz',
      email: 'dana@amazonprime.com',
      avatar: getMockAvatar('Dana Schultz'),
      role: 'Executive Producer',
      credentialLevel: 'AllAccess',
      permissions: ['all-areas', 'executive-access'],
      roomPreferences: ['suite', 'high-floor'],
      dietaryRestrictions: []
    },
    {
      id: '2',
      name: 'Ramon Alvarez',
      email: 'ramon@amazonprime.com',
      avatar: getMockAvatar('Ramon Alvarez'),
      role: 'Technical Director',
      credentialLevel: 'AllAccess',
      permissions: ['all-areas', 'technical-control'],
      roomPreferences: ['standard', 'mid-floor'],
      dietaryRestrictions: []
    },
    {
      id: '3',
      name: 'Sophie Chen',
      email: 'sophie@amazonprime.com',
      avatar: getMockAvatar('Sophie Chen'),
      role: 'Broadcast Ops',
      credentialLevel: 'Backstage',
      permissions: ['broadcast-area', 'control-room'],
      roomPreferences: ['standard', 'mid-floor'],
      dietaryRestrictions: []
    },
    {
      id: '4',
      name: 'Luke Matthews',
      email: 'luke@amazonprime.com',
      avatar: getMockAvatar('Luke Matthews'),
      role: 'Camera Lead',
      credentialLevel: 'Backstage',
      permissions: ['field-access', 'camera-positions'],
      roomPreferences: ['standard', 'any-floor'],
      dietaryRestrictions: []
    },
    {
      id: '5',
      name: 'Priya Nair',
      email: 'priya@amazonprime.com',
      avatar: getMockAvatar('Priya Nair'),
      role: 'Talent Coordination',
      credentialLevel: 'Backstage',
      permissions: ['talent-area', 'backstage'],
      roomPreferences: ['standard', 'mid-floor'],
      dietaryRestrictions: []
    }
  ],
  roomAssignments: [
    {
      id: 'room-broadcast1',
      room: 'Executive Suite 501',
      hotel: 'Miami Marriott Biscayne Bay',
      occupants: ['1'],
      checkIn: '2026-03-12T14:00:00Z',
      checkOut: '2026-03-17T12:00:00Z',
      roomType: 'suite',
      specialRequests: ['early-checkin', 'quiet-floor']
    }
  ],
  schedule: [
    {
      id: 'sched-broadcast1',
      type: 'show',
      title: 'Live Sports Broadcast',
      startTime: '2026-03-12T19:00:00Z',
      endTime: '2026-03-12T23:00:00Z',
      location: 'Hard Rock Stadium',
      participants: ['1', '2', '3', '4', '5'],
      priority: 'critical',
      notes: 'Live Amazon Prime Video sports broadcast'
    }
  ],
  perDiem: {
    dailyRate: 400,
    currency: 'USD',
    startDate: '2026-03-12',
    endDate: '2026-03-17',
    participants: [
      { participantId: '1', customRate: 650, advances: 0, deductions: 0, balance: 3250 },
      { participantId: '2', customRate: 550, advances: 0, deductions: 0, balance: 2750 }
    ]
  },
  settlement: [],
  medical: [],
  compliance: [
    {
      id: 'comp-broadcast1',
      type: 'safety',
      title: 'FCC Broadcast Regulations',
      description: 'All broadcast operations must comply with FCC standards and streaming protocols',
      deadline: '2026-03-11',
      status: 'compliant',
      assignedTo: '2',
      documents: ['fcc-approval.pdf', 'broadcast-protocols.pdf']
    }
  ],
  media: [
    {
      id: 'media-broadcast1',
      type: 'press-conference',
      outlet: 'Amazon Prime Video Sports',
      contactPerson: 'Broadcast Media Coordinator',
      scheduledTime: '2026-03-12T14:00:00Z',
      duration: 90,
      location: 'Hard Rock Stadium Media Center',
      participants: ['1', '2', '5'],
      status: 'confirmed'
    }
  ],
  sponsors: [
    {
      id: 'sponsor-broadcast1',
      sponsor: 'Amazon Prime Video',
      activation: 'Exclusive broadcast rights and streaming platform',
      deadline: '2026-03-12',
      assignedTo: '1',
      status: 'completed',
      deliverables: ['live-broadcast', 'pre-show-coverage', 'post-game-highlights'],
      notes: 'Amazon Prime Video exclusive streaming partner for live sports'
    }
  ]
};