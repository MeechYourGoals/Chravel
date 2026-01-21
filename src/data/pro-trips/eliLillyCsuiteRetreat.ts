import { ProTripData } from '../../types/pro';
import { getMockAvatar } from '../../utils/mockAvatars';

export const eliLillyCsuiteRetreat: ProTripData = {
  id: 'eli-lilly-c-suite-retreat-2026',
  title: 'Eli Lilly C-Suite Retreat 2026',
  description: 'Executive strategic planning retreat at Terranea Resort for senior leadership team.',
  location: 'Terranea Resort, Rancho Palos Verdes CA',
  dateRange: 'Jan 15 - Jan 18, 2026',
  proTripCategory: 'Business Travel',
  tags: [],
  basecamp_name: 'Terranea Resort',
  basecamp_address: '100 Terranea Way, Rancho Palos Verdes, CA 90275',
  tasks: [
    {
      id: 'task-eli-1',
      title: 'Finalize 2026 strategic initiatives deck',
      description: 'Complete presentation materials for strategic planning session',
      completed: true,
      due_at: '2026-01-14',
      assigned_to: 'strategy-team',
      created_at: new Date(Date.now() - 604800000).toISOString()
    },
    {
      id: 'task-eli-2',
      title: 'Distribute pre-read materials to executives',
      description: 'Send quarterly reports and market analysis to all attendees',
      completed: false,
      due_at: '2026-01-15',
      assigned_to: 'executive-assistant',
      created_at: new Date().toISOString()
    }
  ],
  polls: [
    {
      id: 'poll-eli-1',
      question: 'Preferred breakout session focus for Day 2?',
      options: [
        { id: 'opt1', text: 'AI in Drug Discovery', votes: 18 },
        { id: 'opt2', text: 'Market Expansion Strategy', votes: 12 },
        { id: 'opt3', text: 'Operational Excellence', votes: 8 }
      ],
      total_votes: 38,
      status: 'closed',
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  links: [
    {
      id: 'link-eli-1',
      url: 'https://www.terranea.com/meetings',
      title: 'Terranea Resort - Executive Meeting Facilities',
      description: 'Resort amenities and meeting room configurations',
      domain: 'terranea.com',
      created_at: new Date().toISOString(),
      source: 'places'
    },
    {
      id: 'link-eli-2',
      url: 'https://www.lilly.com/strategic-plan-2026',
      title: 'Eli Lilly Strategic Plan 2026',
      description: 'Internal strategic planning documents',
      domain: 'lilly.com',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      source: 'manual'
    }
  ],
  broadcasts: [
    {
      id: 'bc-eli-1',
      senderId: '9',
      message: 'Welcome everyone! Looking forward to a productive strategic planning session.',
      targetTrips: ['eli-lilly-c-suite-retreat-2026'],
      priority: 'normal',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      readBy: ['10', '11', '12']
    },
    {
      id: 'bc-eli-2',
      senderId: '11',
      message: 'REMINDER: All executives please review pre-read materials before tomorrow morning session.',
      targetTrips: ['eli-lilly-c-suite-retreat-2026'],
      priority: 'urgent',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      readBy: ['9', '10']
    }
  ],
  participants: [
    { id: '9', name: 'David Ricks', avatar: getMockAvatar('David Ricks'), role: 'Executives' },
    { id: '10', name: 'Anat Ashkenazi', avatar: getMockAvatar('Anat Ashkenazi'), role: 'Executives' },
    { id: '11', name: 'Patrik Jonsson', avatar: getMockAvatar('Patrik Jonsson'), role: 'Executives' },
    { id: '12', name: 'Dan Skovronsky', avatar: getMockAvatar('Dan Skovronsky'), role: 'Executives' },
    { id: '13', name: 'Anne White', avatar: getMockAvatar('Anne White'), role: 'Executives' },
    { id: '14', name: 'Ilya Yuffa', avatar: getMockAvatar('Ilya Yuffa'), role: 'Executives' },
    { id: '15', name: 'Jake Van Naarden', avatar: getMockAvatar('Jake Van Naarden'), role: 'Executives' },
    { id: '16', name: 'Lydia Eckland', avatar: getMockAvatar('Lydia Eckland'), role: 'Executives' },
    { id: '17', name: 'Mike Mason', avatar: getMockAvatar('Mike Mason'), role: 'Executives' },
    { id: '18', name: 'Christi Shaw', avatar: getMockAvatar('Christi Shaw'), role: 'Executives' },
    { id: '19', name: 'Regional VP North America', avatar: getMockAvatar('Regional VP North America'), role: 'VPs' },
    { id: '20', name: 'Regional VP Europe', avatar: getMockAvatar('Regional VP Europe'), role: 'VPs' },
    { id: '21', name: 'Regional VP Asia Pacific', avatar: getMockAvatar('Regional VP Asia Pacific'), role: 'VPs' },
    { id: '22', name: 'SVP R&D Operations', avatar: getMockAvatar('SVP R&D Operations'), role: 'VPs' },
    { id: '23', name: 'SVP Manufacturing', avatar: getMockAvatar('SVP Manufacturing'), role: 'VPs' },
    { id: '24', name: 'SVP Global Marketing', avatar: getMockAvatar('SVP Global Marketing'), role: 'VPs' },
    { id: '25', name: 'Chief Medical Officer', avatar: getMockAvatar('Chief Medical Officer'), role: 'VPs' },
    { id: '26', name: 'Chief Information Officer', avatar: getMockAvatar('Chief Information Officer'), role: 'VPs' },
    { id: '27', name: 'Chief People Officer', avatar: getMockAvatar('Chief People Officer'), role: 'VPs' },
    { id: '28', name: 'Chief Scientific Officer', avatar: getMockAvatar('Chief Scientific Officer'), role: 'VPs' },
    { id: '29', name: 'Director Global Strategy', avatar: getMockAvatar('Director Global Strategy'), role: 'Directors' },
    { id: '30', name: 'Director Innovation', avatar: getMockAvatar('Director Innovation'), role: 'Directors' },
    { id: '31', name: 'Director Business Development', avatar: getMockAvatar('Director Business Development'), role: 'Directors' },
    { id: '32', name: 'Director Corporate Affairs', avatar: getMockAvatar('Director Corporate Affairs'), role: 'Directors' },
    { id: '33', name: 'Director Regulatory Affairs', avatar: getMockAvatar('Director Regulatory Affairs'), role: 'Directors' },
    { id: '34', name: 'Director Quality Assurance', avatar: getMockAvatar('Director Quality Assurance'), role: 'Directors' },
    { id: '35', name: 'Strategic Planner 1', avatar: getMockAvatar('Strategic Planner 1'), role: 'Coordinators' },
    { id: '36', name: 'Strategic Planner 2', avatar: getMockAvatar('Strategic Planner 2'), role: 'Coordinators' },
    { id: '37', name: 'Executive Assistant 1', avatar: getMockAvatar('Executive Assistant 1'), role: 'Support Staff' },
    { id: '38', name: 'Executive Assistant 2', avatar: getMockAvatar('Executive Assistant 2'), role: 'Support Staff' },
    { id: '39', name: 'Facilities Coordinator', avatar: getMockAvatar('Facilities Coordinator'), role: 'Support Staff' },
    { id: '40', name: 'AV Tech Support', avatar: getMockAvatar('AV Tech Support'), role: 'Support Staff' }
  ],
  budget: {
    total: 75000,
    spent: 25000,
    categories: [
      { name: 'Accommodation', budgeted: 35000, spent: 15000 },
      { name: 'Meals', budgeted: 20000, spent: 7000 },
      { name: 'Transportation', budgeted: 15000, spent: 3000 },
      { name: 'Meeting Facilities', budgeted: 5000, spent: 0 }
    ]
  },
  itinerary: [
    {
      date: '2026-01-15',
      events: [
        { time: '09:00', title: 'Welcome Breakfast', location: 'Terranea Resort - Ocean View Room', type: 'meeting' },
        { time: '10:30', title: '2026 Strategic Planning Session', location: 'Executive Boardroom', type: 'meeting' },
        { time: '14:00', title: 'Working Lunch', location: 'Private Dining Room', type: 'meeting' },
        { time: '19:00', title: 'Executive Dinner', location: 'Catalina Kitchen', type: 'meeting' }
      ]
    }
  ],
  roster: [
    {
      id: '9',
      name: 'David Ricks',
      email: 'david.ricks@lilly.com',
      avatar: getMockAvatar('David Ricks'),
      role: 'Executives',
      credentialLevel: 'AllAccess',
      permissions: ['all-areas', 'executive-access'],
      roomPreferences: ['ocean-view', 'executive-suite'],
      dietaryRestrictions: []
    },
    {
      id: '10',
      name: 'Anat Ashkenazi',
      email: 'anat.ashkenazi@lilly.com',
      avatar: getMockAvatar('Anat Ashkenazi'),
      role: 'Executives',
      credentialLevel: 'AllAccess',
      permissions: ['all-areas', 'executive-access'],
      roomPreferences: ['ocean-view', 'quiet-floor'],
      dietaryRestrictions: ['pescatarian']
    },
    {
      id: '11',
      name: 'Strategic Planner',
      email: 'strategy@lilly.com',
      avatar: getMockAvatar('Strategic Planner'),
      role: 'Coordinators',
      credentialLevel: 'Backstage',
      permissions: ['planning-access', 'logistics-coordination'],
      roomPreferences: ['standard-room']
    }
  ],
  roomAssignments: [
    {
      id: 'room-el1',
      room: 'Presidential Suite',
      hotel: 'Terranea Resort',
      occupants: ['9'],
      checkIn: '2026-01-15T15:00:00Z',
      checkOut: '2026-01-18T11:00:00Z',
      roomType: 'suite',
      specialRequests: ['executive-amenities', 'late-checkout']
    }
  ],
  schedule: [
    {
      id: 'sched-el1',
      type: 'meeting',
      title: 'Strategic Planning Setup',
      startTime: '2026-01-15T08:00:00Z',
      endTime: '2026-01-15T09:00:00Z',
      location: 'Executive Boardroom',
      participants: ['11'],
      priority: 'medium',
      notes: 'Prepare materials and AV setup'
    }
  ],
  perDiem: {
    dailyRate: 100,
    currency: 'USD',
    startDate: '2026-01-15',
    endDate: '2026-01-18',
    participants: [
      { participantId: '9', customRate: 0, advances: 0, deductions: 0, balance: 0 },
      { participantId: '10', customRate: 0, advances: 0, deductions: 0, balance: 0 }
    ]
  },
  settlement: [],
  medical: [],
  compliance: [
    {
      id: 'comp-el1',
      type: 'safety',
      title: 'Executive Travel Security',
      description: 'Enhanced security protocols for C-suite executives',
      deadline: '2026-01-14',
      status: 'compliant',
      assignedTo: '11',
      documents: ['security-protocols.pdf']
    }
  ],
  media: [],
  sponsors: []
};
