import { TripChannel, ChannelMessage } from '../types/roleChannels';

interface DemoMessage {
  senderName: string;
  content: string;
  timestamp: string;
}

interface DemoChannelData {
  channel: Omit<TripChannel, 'id' | 'tripId' | 'createdAt' | 'updatedAt'>;
  messages: DemoMessage[];
}

// Lakers Road Trip Demo Channels
const lakersChannels: DemoChannelData[] = [
  {
    channel: {
      channelName: 'Players',
      channelSlug: 'players',
      description: 'Team player discussions',
      requiredRoleId: 'demo-role-players',
      requiredRoleName: 'Players',
      isPrivate: true,
      isArchived: false,
      memberCount: 15,
      createdBy: 'demo-user'
    },
    messages: [
      {
        senderName: 'LeBron James',
        content: "Who's got the playlist for the bus? 🎵",
        timestamp: '2:30 PM'
      },
      {
        senderName: 'Anthony Davis',
        content: 'I got you. Sending now.',
        timestamp: '2:32 PM'
      },
      {
        senderName: 'Austin Reaves',
        content: 'Practice tomorrow 2pm at the arena 🏀',
        timestamp: '4:45 PM'
      }
    ]
  },
  {
    channel: {
      channelName: 'Coaches',
      channelSlug: 'coaches',
      description: 'Coaching staff coordination',
      requiredRoleId: 'demo-role-coaches',
      requiredRoleName: 'Coaches',
      isPrivate: true,
      isArchived: false,
      memberCount: 5,
      createdBy: 'demo-user'
    },
    messages: [
      {
        senderName: 'Head Coach',
        content: 'Reviewing game film at 7pm in conference room B',
        timestamp: '11:15 AM'
      },
      {
        senderName: 'Assistant Coach',
        content: 'Defense needs work on pick and roll coverage',
        timestamp: '11:20 AM'
      }
    ]
  }
];

// Beyoncé Cowboy Carter World Tour Demo Channels
const beyonceChannels: DemoChannelData[] = [
  {
    channel: {
      channelName: 'Production',
      channelSlug: 'production',
      description: 'Stage, sound, and lighting coordination',
      requiredRoleId: 'demo-role-production',
      requiredRoleName: 'Production',
      isPrivate: true,
      isArchived: false,
      memberCount: 18,
      createdBy: 'demo-user'
    },
    messages: [
      {
        senderName: 'Tour Manager',
        content: 'Load-in complete. Sound check at 4pm.',
        timestamp: '1:05 PM'
      },
      {
        senderName: 'Lighting Director',
        content: 'New cues uploaded for opener. Please review.',
        timestamp: '1:20 PM'
      }
    ]
  },
  {
    channel: {
      channelName: 'Security',
      channelSlug: 'security',
      description: 'Venue and backstage security',
      requiredRoleId: 'demo-role-security',
      requiredRoleName: 'Security',
      isPrivate: true,
      isArchived: false,
      memberCount: 10,
      createdBy: 'demo-user'
    },
    messages: [
      {
        senderName: 'Security Lead',
        content: 'Artist transport route confirmed. All clear.',
        timestamp: '2:00 PM'
      },
      {
        senderName: 'Backstage Ops',
        content: 'Credential checkpoint moved to Gate B.',
        timestamp: '2:14 PM'
      }
    ]
  }
];

// Eli Lilly C-Suite Retreat Demo Channels
const eliLillyChannels: DemoChannelData[] = [
  {
    channel: {
      channelName: 'Executive Team',
      channelSlug: 'executive-team',
      description: 'Agenda coordination for executives',
      requiredRoleId: 'demo-role-executives',
      requiredRoleName: 'Executives',
      isPrivate: true,
      isArchived: false,
      memberCount: 6,
      createdBy: 'demo-user'
    },
    messages: [
      {
        senderName: 'Chief of Staff',
        content: 'Keynote moved to 9:30am to accommodate flights.',
        timestamp: '8:12 AM'
      },
      {
        senderName: 'Comms Director',
        content: 'Slides uploaded to shared drive. Link in calendar invite.',
        timestamp: '8:40 AM'
      }
    ]
  },
  {
    channel: {
      channelName: 'Logistics',
      channelSlug: 'logistics',
      description: 'Transport and room block coordination',
      requiredRoleId: 'demo-role-logistics',
      requiredRoleName: 'Logistics',
      isPrivate: true,
      isArchived: false,
      memberCount: 9,
      createdBy: 'demo-user'
    },
    messages: [
      {
        senderName: 'Logistics Lead',
        content: 'Shuttle departs every 15 minutes from the lobby.',
        timestamp: '7:55 AM'
      },
      {
        senderName: 'Venue Coordinator',
        content: 'Meeting rooms A-D are ready. Wi‑Fi codes posted.',
        timestamp: '8:05 AM'
      }
    ]
  }
];

export const isTripWithDemoChannels = (tripId: string): boolean => {
  // Accept both legacy numeric demo IDs and new pro trip slugs
  return [
    '13', // legacy Lakers id (if referenced elsewhere)
    'lakers-road-trip',
    'beyonce-cowboy-carter-tour',
    'eli-lilly-c-suite-retreat-2026'
  ].includes(tripId);
};

export const getDemoChannelsForTrip = (tripId: string): { channels: TripChannel[]; messagesByChannel: Map<string, ChannelMessage[]> } => {
  const now = new Date().toISOString();
  
  let demoData: DemoChannelData[] = [];
  
  // Map both legacy ids and current slugs
  if (tripId === '13' || tripId === 'lakers-road-trip') {
    demoData = lakersChannels;
  } else if (tripId === 'beyonce-cowboy-carter-tour') {
    demoData = beyonceChannels;
  } else if (tripId === 'eli-lilly-c-suite-retreat-2026') {
    demoData = eliLillyChannels;
  }
  
  const channels: TripChannel[] = demoData.map((data, index) => ({
    id: `demo-channel-${tripId}-${index}`,
    tripId: tripId,
    ...data.channel,
    createdAt: now,
    updatedAt: now
  }));
  
  const messagesByChannel = new Map<string, ChannelMessage[]>();
  
  demoData.forEach((data, channelIndex) => {
    const channelId = `demo-channel-${tripId}-${channelIndex}`;
    const messages: ChannelMessage[] = data.messages.map((msg, msgIndex) => ({
      id: `demo-msg-${channelId}-${msgIndex}`,
      channelId: channelId,
      senderId: `demo-sender-${msgIndex}`,
      senderName: msg.senderName,
      content: msg.content,
      messageType: 'text' as const,
      createdAt: now,
      editedAt: undefined,
      deletedAt: undefined
    }));
    
    messagesByChannel.set(channelId, messages);
  });
  
  return { channels, messagesByChannel };
};
