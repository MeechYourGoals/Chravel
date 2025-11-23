import { ProTripData } from '../../types/pro';
import { getMockAvatar } from '../../utils/mockAvatars';

export const nvidiaBowlingNight: ProTripData = {
  id: 'nvidia-bowling-2025',
  title: 'NVIDIA Santa Clara — Employee Bowling Night',
  description: 'Team building bowling event for NVIDIA employees with dinner and prizes.',
  location: 'Santa Clara, CA',
  dateRange: 'Dec 8, 2025',
  proTripCategory: 'Business Travel',
  tags: ['Corporate Event', 'Tech', 'Entertainment', 'Employee Engagement'],
  basecamp_name: 'NVIDIA Headquarters',
  basecamp_address: '2788 San Tomas Expressway, Santa Clara, CA 95051',
  tasks: [
    {
      id: 'task-nvidia-1',
      title: 'Reserve bowling lanes and equipment',
      description: 'Book 10 lanes at AMF Moonlite for 100+ attendees',
      completed: true,
      due_at: '2025-12-01',
      assigned_to: 'event-planner',
      created_at: new Date(Date.now() - 604800000).toISOString()
    },
    {
      id: 'task-nvidia-2',
      title: 'Order team building prizes and awards',
      description: 'Purchase trophies and NVIDIA swag for tournament winners',
      completed: false,
      due_at: '2025-12-07',
      assigned_to: 'people-ops',
      created_at: new Date().toISOString()
    }
  ],
  polls: [
    {
      id: 'poll-nvidia-1',
      question: 'Dinner menu preference?',
      options: [
        { id: 'opt1', text: 'Pizza & Wings', votes: 48 },
        { id: 'opt2', text: 'Burgers & Fries', votes: 32 },
        { id: 'opt3', text: 'Mexican Buffet', votes: 20 }
      ],
      total_votes: 100,
      status: 'closed',
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  links: [
    {
      id: 'link-nvidia-1',
      url: 'https://www.amf.com/moonlite-lanes',
      title: 'AMF Moonlite Lanes',
      description: 'Bowling venue with food and full bar',
      domain: 'amf.com',
      created_at: new Date().toISOString(),
      source: 'places'
    },
    {
      id: 'link-nvidia-2',
      url: 'https://www.nvidia.com/en-us/about-nvidia/culture',
      title: 'NVIDIA Company Culture',
      description: 'Team building and employee engagement programs',
      domain: 'nvidia.com',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      source: 'manual'
    }
  ],
  broadcasts: [
    {
      id: 'bc-nvidia-1',
      senderId: '1',
      message: 'Looking forward to seeing everyone tonight! Let\'s have some fun! 🎳',
      targetTrips: ['nvidia-bowling-2025'],
      priority: 'normal',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      readBy: ['2', '3', '4']
    },
    {
      id: 'bc-nvidia-2',
      senderId: '4',
      message: 'REMINDER: Event starts at 6 PM. Carpool from HQ leaves at 5:45 PM.',
      targetTrips: ['nvidia-bowling-2025'],
      priority: 'urgent',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      readBy: ['1', '2']
    }
  ],
  participants: [
    { id: 1, name: 'Jensen Huang', avatar: getMockAvatar('Jensen Huang'), role: 'Host' },
    { id: 2, name: 'Colette Kress', avatar: getMockAvatar('Colette Kress'), role: 'CFO' },
    { id: 3, name: 'Mark Stevens', avatar: getMockAvatar('Mark Stevens'), role: 'People Ops' },
    { id: 4, name: 'Lena Ko', avatar: getMockAvatar('Lena Ko'), role: 'Event Planner' }
  ],
  roster: [
    { id: '1', name: 'Jensen Huang', role: 'Host', email: 'jensen@nvidia.com', avatar: getMockAvatar('Jensen Huang'), credentialLevel: 'AllAccess', permissions: ['admin'], roomPreferences: [], dietaryRestrictions: [], medicalNotes: '' },
    { id: '2', name: 'Colette Kress', role: 'CFO', email: 'colette@nvidia.com', avatar: getMockAvatar('Colette Kress'), credentialLevel: 'AllAccess', permissions: ['admin'], roomPreferences: [], dietaryRestrictions: [], medicalNotes: '' },
    { id: '3', name: 'Mark Stevens', role: 'People Ops', email: 'mark@nvidia.com', avatar: getMockAvatar('Mark Stevens'), credentialLevel: 'Backstage', permissions: ['editor'], roomPreferences: [], dietaryRestrictions: [], medicalNotes: '' },
    { id: '4', name: 'Lena Ko', role: 'Event Planner', email: 'lena@nvidia.com', avatar: getMockAvatar('Lena Ko'), credentialLevel: 'Guest', permissions: ['editor'], roomPreferences: [], dietaryRestrictions: [], medicalNotes: '' }
  ],
  itinerary: [
    {
      date: '2025-12-08',
      events: [
        { title: 'Team Check-in', location: 'AMF Moonlite Lanes', time: '18:00', type: 'event' },
        { title: 'Bowling Tournament', location: 'AMF Moonlite Lanes', time: '18:30', type: 'event' },
        { title: 'Awards & Dinner', location: 'AMF Moonlite Lanes', time: '21:00', type: 'event' }
      ]
    }
  ],
  budget: {
    total: 12000,
    spent: 8500,
    categories: [
      { name: 'Venue', budgeted: 5000, spent: 4000 },
      { name: 'Food & Drinks', budgeted: 4000, spent: 3000 },
      { name: 'Prizes', budgeted: 2000, spent: 1000 },
      { name: 'Transportation', budgeted: 1000, spent: 500 }
    ]
  },
  schedule: [
    {
      id: 'bowling-1',
      title: 'Team Bowling Tournament',
      location: 'AMF Moonlite Lanes',
      startTime: '2025-12-08T18:30:00Z',
      endTime: '2025-12-08T21:00:00Z',
      type: 'meeting',
      participants: ['1', '2', '3', '4'],
      priority: 'medium'
    }
  ],
  roomAssignments: [],
  perDiem: { dailyRate: 75, currency: 'USD', startDate: '2025-12-08', endDate: '2025-12-08', participants: [] },
  settlement: [],
  medical: [],
  compliance: [],
  media: [],
  sponsors: []
};