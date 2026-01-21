import { ProTripData } from '../../types/pro';
import { getMockAvatar } from '../../utils/mockAvatars';

export const goldmanSachsRecruiting: ProTripData = {
  id: 'gs-campus-gt-2025',
  title: 'Goldman Sachs Campus-Recruiting Trip — Georgia Tech',
  description: 'Campus recruiting visit to Georgia Tech featuring CEO keynote and networking events.',
  location: 'Atlanta, GA',
  dateRange: 'Sep 18 - Sep 19, 2025',
  proTripCategory: 'Business Travel',
  tags: [],
  basecamp_name: 'Georgia Tech Student Center',
  basecamp_address: '350 Ferst Drive NW, Atlanta, GA 30332',
  tasks: [
    {
      id: 'task-gs-1',
      title: 'Set up recruiting booth materials',
      description: 'Arrange banners, brochures, and swag at Student Center booth',
      completed: true,
      due_at: '2025-09-18',
      assigned_to: 'hr-coordinator',
      created_at: new Date(Date.now() - 604800000).toISOString()
    },
    {
      id: 'task-gs-2',
      title: 'Finalize student interview schedule',
      description: 'Confirm 15-minute interview slots with all pre-selected candidates',
      completed: false,
      due_at: '2025-09-19',
      assigned_to: 'campus-lead',
      created_at: new Date().toISOString()
    }
  ],
  polls: [
    {
      id: 'poll-gs-1',
      question: 'Preferred networking event format?',
      options: [
        { id: 'opt1', text: 'Casual Mixer', votes: 65 },
        { id: 'opt2', text: 'Panel Q&A', votes: 42 },
        { id: 'opt3', text: 'Speed Networking', votes: 28 }
      ],
      total_votes: 135,
      status: 'closed',
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  links: [
    {
      id: 'link-gs-1',
      url: 'https://www.gatech.edu/campus-map',
      title: 'Georgia Tech Campus Map',
      description: 'Campus navigation and building locations',
      domain: 'gatech.edu',
      created_at: new Date().toISOString(),
      source: 'places'
    },
    {
      id: 'link-gs-2',
      url: 'https://www.goldmansachs.com/careers',
      title: 'Goldman Sachs Careers Portal',
      description: 'Application portal and program information',
      domain: 'goldmansachs.com',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      source: 'manual'
    }
  ],
  broadcasts: [
    {
      id: 'bc-gs-1',
      senderId: '2',
      message: 'Keynote starting in 15 minutes! All team members please take your seats.',
      targetTrips: ['gs-campus-gt-2025'],
      priority: 'urgent',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      readBy: ['1', '3', '4']
    },
    {
      id: 'bc-gs-2',
      senderId: '1',
      message: 'Great turnout today! Thank you Georgia Tech for the warm welcome.',
      targetTrips: ['gs-campus-gt-2025'],
      priority: 'normal',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      readBy: ['2', '3']
    }
  ],
  participants: [
    { id: '1', name: 'David Solomon', avatar: getMockAvatar('David Solomon'), role: 'CEO Speaker' },
    { id: '2', name: 'Rachel Ma', avatar: getMockAvatar('Rachel Ma'), role: 'Campus Lead' },
    { id: '3', name: 'Luis Vargas', avatar: getMockAvatar('Luis Vargas'), role: 'Analyst Panelist' },
    { id: '4', name: 'Priya Dhillon', avatar: getMockAvatar('Priya Dhillon'), role: 'HR Coordinator' }
  ],
  roster: [
    { id: '1', name: 'David Solomon', role: 'CEO Speaker', email: 'david.solomon@gs.com', avatar: getMockAvatar('David Solomon'), credentialLevel: 'AllAccess', permissions: ['admin'], roomPreferences: [], dietaryRestrictions: [], medicalNotes: '' },
    { id: '2', name: 'Rachel Ma', role: 'Campus Lead', email: 'rachel.ma@gs.com', avatar: getMockAvatar('Rachel Ma'), credentialLevel: 'Backstage', permissions: ['editor'], roomPreferences: [], dietaryRestrictions: [], medicalNotes: '' },
    { id: '3', name: 'Luis Vargas', role: 'Analyst Panelist', email: 'luis.vargas@gs.com', avatar: getMockAvatar('Luis Vargas'), credentialLevel: 'Backstage', permissions: ['editor'], roomPreferences: [], dietaryRestrictions: [], medicalNotes: '' },
    { id: '4', name: 'Priya Dhillon', role: 'HR Coordinator', email: 'priya.dhillon@gs.com', avatar: getMockAvatar('Priya Dhillon'), credentialLevel: 'Guest', permissions: ['viewer'], roomPreferences: [], dietaryRestrictions: [], medicalNotes: '' }
  ],
  itinerary: [
    {
      date: '2025-09-18',
      events: [
        { title: 'Campus Arrival & Setup', location: 'Georgia Tech Student Center', time: '09:00', type: 'event' },
        { title: 'CEO Keynote', location: 'Klaus Advanced Computing Building', time: '14:00', type: 'event' },
        { title: 'Networking Reception', location: 'Tech Square', time: '18:00', type: 'event' }
      ]
    }
  ],
  budget: {
    total: 75000,
    spent: 45000,
    categories: [
      { name: 'Travel', budgeted: 25000, spent: 18000 },
      { name: 'Venue', budgeted: 20000, spent: 15000 },
      { name: 'Catering', budgeted: 15000, spent: 8000 },
      { name: 'Materials', budgeted: 15000, spent: 4000 }
    ]
  },
  schedule: [
    {
      id: 'keynote-1',
      title: 'CEO Keynote: Future of Finance',
      location: 'Klaus Advanced Computing Building',
      startTime: '2025-09-18T14:00:00Z',
      endTime: '2025-09-18T15:00:00Z',
      type: 'meeting',
      participants: ['1'],
      priority: 'high'
    }
  ],
  roomAssignments: [],
  perDiem: { dailyRate: 200, currency: 'USD', startDate: '2025-09-18', endDate: '2025-09-19', participants: [] },
  settlement: [],
  medical: [],
  compliance: [],
  media: [],
  sponsors: []
};