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

// Beyonce Cowboy Carter Tour Demo Channels
const beyonceChannels: DemoChannelData[] = [
  {
    channel: {
      channelName: 'Production',
      channelSlug: 'production',
      description: 'Production team coordination',
      requiredRoleId: 'demo-role-production',
      requiredRoleName: 'Production',
      isPrivate: true,
      isArchived: false,
      memberCount: 25,
      createdBy: 'demo-user'
    },
    messages: [
      {
        senderName: 'Production Lead',
        content: 'Stage setup complete. Sound check at 3pm',
        timestamp: '1:45 PM'
      },
      {
        senderName: 'Lighting Director',
        content: 'New lighting cues programmed for Act 2',
        timestamp: '2:10 PM'
      },
      {
        senderName: 'Stage Manager',
        content: 'All pyro tested and ready for tonight',
        timestamp: '2:30 PM'
      }
    ]
  },
  {
    channel: {
      channelName: 'Security',
      channelSlug: 'security',
      description: 'Security team coordination',
      requiredRoleId: 'demo-role-security',
      requiredRoleName: 'Security',
      isPrivate: true,
      isArchived: false,
      memberCount: 20,
      createdBy: 'demo-user'
    },
    messages: [
      {
        senderName: 'Security Chief',
        content: 'VIP entrance secured. Meet & greet at 6pm',
        timestamp: '10:00 AM'
      },
      {
        senderName: 'Head of Security',
        content: 'Barricades in place. Crowd control ready',
        timestamp: '10:30 AM'
      }
    ]
  }
];

// Eli Lilly C-Suite Retreat Demo Channels
const eliLillyChannels: DemoChannelData[] = [
  {
    channel: {
      channelName: 'Executives',
      channelSlug: 'executives',
      description: 'Executive team discussions',
      requiredRoleId: 'demo-role-executives',
      requiredRoleName: 'Executives',
      isPrivate: true,
      isArchived: false,
      memberCount: 8,
      createdBy: 'demo-user'
    },
    messages: [
      {
        senderName: 'David Ricks',
        content: 'Strategic planning session moved to 3pm today',
        timestamp: '9:00 AM'
      },
      {
        senderName: 'Anat Ashkenazi',
        content: 'Q1 financials deck ready for review',
        timestamp: '9:15 AM'
      },
      {
        senderName: 'Dan Skovronsky',
        content: 'R&D pipeline update at tomorrow\'s session',
        timestamp: '10:30 AM'
      }
    ]
  },
  {
    channel: {
      channelName: 'Event Planning',
      channelSlug: 'event-planning',
      description: 'Event coordination team',
      requiredRoleId: 'demo-role-event',
      requiredRoleName: 'Event Planning',
      isPrivate: true,
      isArchived: false,
      memberCount: 4,
      createdBy: 'demo-user'
    },
    messages: [
      {
        senderName: 'Event Coordinator',
        content: 'Dinner reservations confirmed for 7:30pm',
        timestamp: '11:00 AM'
      },
      {
        senderName: 'Meeting Planner',
        content: 'AV equipment tested in all conference rooms',
        timestamp: '11:20 AM'
      }
    ]
  }
];

// Tesla Cybertruck Launch Demo Channels
const teslaChannels: DemoChannelData[] = [
  {
    channel: {
      channelName: 'Production Crew',
      channelSlug: 'production-crew',
      description: 'Production team coordination',
      requiredRoleId: 'demo-role-production',
      requiredRoleName: 'Production',
      isPrivate: true,
      isArchived: false,
      memberCount: 12,
      createdBy: 'demo-user'
    },
    messages: [
      {
        senderName: 'Production Lead',
        content: 'Stage setup complete. Sound check at 3pm',
        timestamp: '1:45 PM'
      },
      {
        senderName: 'AV Tech',
        content: 'Lighting programmed and ready to test',
        timestamp: '2:10 PM'
      },
      {
        senderName: 'Stage Manager',
        content: 'Truck arrives at 4pm. Everyone ready to sync.',
        timestamp: '2:30 PM'
      }
    ]
  },
  {
    channel: {
      channelName: 'Security',
      channelSlug: 'security',
      description: 'Security team coordination',
      requiredRoleId: 'demo-role-security',
      requiredRoleName: 'Security',
      isPrivate: true,
      isArchived: false,
      memberCount: 8,
      createdBy: 'demo-user'
    },
    messages: [
      {
        senderName: 'Security Chief',
        content: 'Perimeter secured. All checkpoints active.',
        timestamp: '10:00 AM'
      },
      {
        senderName: 'Security Lead',
        content: 'VIP entrance ready. Badge system live.',
        timestamp: '10:30 AM'
      }
    ]
  }
];

export const getDemoChannelsForTrip = (tripId: string): { channels: TripChannel[]; messagesByChannel: Map<string, ChannelMessage[]> } => {
  const now = new Date().toISOString();
  
  let demoData: DemoChannelData[] = [];
  
  // Map trip IDs to demo channels (handle both numeric and string IDs)
  const tripIdStr = String(tripId);
  
  if (tripIdStr === '13' || tripIdStr === 'lakers-road-trip') {
    demoData = lakersChannels;
  } 
  else if (tripIdStr === '14' || tripIdStr === 'tesla-cybertruck-roadshow-2025') {
    demoData = teslaChannels;
  }
  else if (tripIdStr === '15' || tripIdStr === 'beyonce-cowboy-carter-tour') {
    demoData = beyonceChannels;
  }
  else if (tripIdStr === '16' || tripIdStr === 'eli-lilly-c-suite-retreat-2026') {
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
