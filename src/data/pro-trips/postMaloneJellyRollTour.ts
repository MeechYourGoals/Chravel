import { ProTripData } from '../../types/pro';
import { getMockAvatar } from '../../utils/mockAvatars';

export const postMaloneJellyRollTour: ProTripData = {
  id: 'postmalone-jellyroll-tour-2026',
  title: 'Post Malone × Jelly Roll — Stadium Tour 2026',
  description: 'Major stadium tour featuring Post Malone and Jelly Roll across North America with full production crew.',
  location: 'Multiple Cities, USA',
  dateRange: 'Jun 1 - Sep 30, 2026',
  proTripCategory: 'Tour – Music, Comedy, etc.',
  tags: ['Stadium', 'North America', 'Hip-Hop', 'Country Rock'],
  basecamp_name: 'AT&T Stadium',
  basecamp_address: '1 AT&T Way, Arlington, TX 76011',
  tasks: [
    {
      id: 'task-tour-1',
      title: 'Load-in schedule confirmed with all venues',
      description: 'Verify load-in times and crew access for next 5 tour stops',
      completed: true,
      due_at: '2026-05-28',
      assigned_to: 'production-director',
      created_at: new Date(Date.now() - 604800000).toISOString()
    },
    {
      id: 'task-tour-2',
      title: 'Soundcheck rehearsal with full band',
      description: 'Complete soundcheck and stage positioning rehearsal',
      completed: false,
      due_at: '2026-06-01',
      assigned_to: 'tour-manager',
      created_at: new Date().toISOString()
    }
  ],
  polls: [
    {
      id: 'poll-tour-1',
      question: 'Which new song should we add to the setlist?',
      options: [
        { id: 'opt1', text: 'Chemical', votes: 1240 },
        { id: 'opt2', text: 'Mourning', votes: 890 },
        { id: 'opt3', text: 'Overdrive', votes: 2150 }
      ],
      total_votes: 4280,
      status: 'closed',
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  links: [
    {
      id: 'link-tour-1',
      url: 'https://www.attstadium.com/events',
      title: 'AT&T Stadium - Tour Kickoff Venue',
      description: 'Stadium information and load-in procedures',
      domain: 'attstadium.com',
      created_at: new Date().toISOString(),
      source: 'places'
    },
    {
      id: 'link-tour-2',
      url: 'https://www.soldierfield.com',
      title: 'Soldier Field Chicago - Tour Stop 2',
      description: 'Chicago venue details and logistics',
      domain: 'soldierfield.com',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      source: 'manual'
    }
  ],
  broadcasts: [
    {
      id: 'bc-tour-1',
      senderId: '3',
      message: 'Tour bus call time: 9 AM tomorrow. Breakfast served on bus starting 8:30 AM.',
      targetTrips: ['postmalone-jellyroll-tour-2026'],
      priority: 'urgent',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      readBy: ['1', '2', '4']
    },
    {
      id: 'bc-tour-2',
      senderId: '1',
      message: 'Amazing show tonight fam! Chicago you were incredible! 🔥',
      targetTrips: ['postmalone-jellyroll-tour-2026'],
      priority: 'normal',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      readBy: ['2', '3']
    }
  ],
  participants: [
    { id: 1, name: 'Post Malone', avatar: getMockAvatar('Post Malone'), role: 'Headliner' },
    { id: 2, name: 'Jelly Roll', avatar: getMockAvatar('Jelly Roll'), role: 'Co-Headliner' },
    { id: 3, name: 'Dre London', avatar: getMockAvatar('Dre London'), role: 'Tour Manager' },
    { id: 4, name: 'Marissa Jones', avatar: getMockAvatar('Marissa Jones'), role: 'Production Director' }
  ],
  roster: [
    { id: '1', name: 'Post Malone', role: 'Headliner', email: 'postmalone@tour.com', avatar: getMockAvatar('Post Malone'), credentialLevel: 'AllAccess', permissions: ['admin'], roomPreferences: [], dietaryRestrictions: [], medicalNotes: '' },
    { id: '2', name: 'Jelly Roll', role: 'Co-Headliner', email: 'jellyroll@tour.com', avatar: getMockAvatar('Jelly Roll'), credentialLevel: 'AllAccess', permissions: ['admin'], roomPreferences: [], dietaryRestrictions: [], medicalNotes: '' },
    { id: '3', name: 'Dre London', role: 'Tour Manager', email: 'dre@tour.com', avatar: getMockAvatar('Dre London'), credentialLevel: 'Backstage', permissions: ['admin'], roomPreferences: [], dietaryRestrictions: [], medicalNotes: '' },
    { id: '4', name: 'Marissa Jones', role: 'Production Director', email: 'marissa@tour.com', avatar: getMockAvatar('Marissa Jones'), credentialLevel: 'Backstage', permissions: ['editor'], roomPreferences: [], dietaryRestrictions: [], medicalNotes: '' }
  ],
  itinerary: [
    {
      date: '2026-06-01',
      events: [
        { title: 'Tour Kickoff - Chicago', location: 'Soldier Field', time: '19:00', type: 'event' },
        { title: 'Sound Check', location: 'Soldier Field', time: '16:00', type: 'event' }
      ]
    }
  ],
  budget: {
    total: 15000000,
    spent: 8500000,
    categories: [
      { name: 'Venues', budgeted: 6000000, spent: 3500000 },
      { name: 'Production', budgeted: 4000000, spent: 2800000 },
      { name: 'Crew', budgeted: 3000000, spent: 1200000 },
      { name: 'Marketing', budgeted: 2000000, spent: 1000000 }
    ]
  },
  schedule: [
    {
      id: 'show-1',
      title: 'Chicago Stadium Show',
      location: 'Soldier Field, Chicago',
      startTime: '2026-06-01T19:00:00Z',
      endTime: '2026-06-01T22:00:00Z',
      type: 'show',
      participants: ['1', '2'],
      priority: 'high'
    }
  ],
  roomAssignments: [],
  perDiem: { dailyRate: 150, currency: 'USD', startDate: '2026-06-01', endDate: '2026-09-30', participants: [] },
  settlement: [],
  medical: [],
  compliance: [],
  media: [],
  sponsors: []
};