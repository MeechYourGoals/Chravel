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
  
  // Lakers trip
  if (tripId === '13') {
    demoData = lakersChannels;
  } 
  // Tesla Cybertruck Launch trip
  else if (tripId === '14') {
    demoData = teslaChannels;
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
