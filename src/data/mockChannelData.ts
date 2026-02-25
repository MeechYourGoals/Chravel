// Mock channel data for demo trips

export const lakersMockChannelData = {
  // Trip 13 - Lakers
  tripId: '13',
  admins: ['21', '22'], // Team Manager, Logistics Coordinator
  roles: [
    {
      id: 'lakers-role-players',
      name: 'Players',
      description: 'Team players',
      memberUserIds: [
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '10',
        '11',
        '12',
        '13',
        '14',
        '15',
      ],
    },
    {
      id: 'lakers-role-coaches',
      name: 'Coaches',
      description: 'Coaching staff',
      memberUserIds: ['16', '17', '18'],
    },
    {
      id: 'lakers-role-medical',
      name: 'Medical Staff',
      description: 'Team medical professionals',
      memberUserIds: ['19', '20'],
    },
    {
      id: 'lakers-role-operations',
      name: 'Team Operations',
      description: 'Logistics and operations staff',
      memberUserIds: ['21', '22'],
    },
    {
      id: 'lakers-role-security',
      name: 'Security',
      description: 'Security team',
      memberUserIds: ['23'],
    },
  ],
  channels: [
    {
      slug: 'players',
      name: 'Players',
      description: 'Team player discussions',
      roleId: 'lakers-role-players',
      isPrivate: true,
      messages: [
        {
          senderId: '21',
          senderName: 'Team Manager',
          content: 'Welcome to the Players channel! Use this for team-only discussions.',
          messageType: 'system' as const,
          timestamp: '2025-01-18T10:00:00Z',
        },
        {
          senderId: '1',
          senderName: 'LeBron James',
          content: "Who's got the pre-game playlist? 🎵",
          messageType: 'text' as const,
          timestamp: '2025-01-18T14:30:00Z',
        },
        {
          senderId: '2',
          senderName: 'Anthony Davis',
          content: 'I got you. Sending it now.',
          messageType: 'text' as const,
          timestamp: '2025-01-18T14:32:00Z',
        },
        {
          senderId: '3',
          senderName: 'Austin Reaves',
          content: "Practice at 2pm sharp tomorrow. Don't be late! 🏀",
          messageType: 'text' as const,
          timestamp: '2025-01-18T16:45:00Z',
        },
        {
          senderId: '4',
          senderName: "D'Angelo Russell",
          content: 'Anyone down for film session tonight at 7?',
          messageType: 'text' as const,
          timestamp: '2025-01-18T18:20:00Z',
        },
        {
          senderId: '1',
          senderName: 'LeBron James',
          content: "I'm in. Let's study that Warriors defense.",
          messageType: 'text' as const,
          timestamp: '2025-01-18T18:25:00Z',
        },
      ],
    },
    {
      slug: 'coaches',
      name: 'Coaches',
      description: 'Coaching staff coordination',
      roleId: 'lakers-role-coaches',
      isPrivate: true,
      messages: [
        {
          senderId: '21',
          senderName: 'Team Manager',
          content: 'Coaches channel active. Coordinate practice schedules and strategy here.',
          messageType: 'system' as const,
          timestamp: '2025-01-18T09:00:00Z',
        },
        {
          senderId: '16',
          senderName: 'Head Coach',
          content:
            "Let's adjust the rotation for tomorrow's game. Davis needs more minutes in the 3rd quarter.",
          messageType: 'text' as const,
          timestamp: '2025-01-18T11:15:00Z',
        },
        {
          senderId: '17',
          senderName: 'Assistant Coach',
          content:
            "Agreed. I've noticed their defense drops off after halftime. We should exploit that.",
          messageType: 'text' as const,
          timestamp: '2025-01-18T11:20:00Z',
        },
        {
          senderId: '18',
          senderName: 'Skills Coach',
          content:
            'Can we run some pick-and-roll drills this afternoon? Need to tighten up those handoffs.',
          messageType: 'text' as const,
          timestamp: '2025-01-18T13:00:00Z',
        },
      ],
    },
    {
      slug: 'medical-staff',
      name: 'Medical Staff',
      description: 'Confidential medical discussions',
      roleId: 'lakers-role-medical',
      isPrivate: true,
      messages: [
        {
          senderId: '21',
          senderName: 'Team Manager',
          content: 'Medical Staff private channel. All discussions are confidential.',
          messageType: 'system' as const,
          timestamp: '2025-01-18T08:00:00Z',
        },
        {
          senderId: '19',
          senderName: 'Team Doctor',
          content: "Player #3's ankle looks good. Cleared for full contact practice.",
          messageType: 'text' as const,
          timestamp: '2025-01-18T10:30:00Z',
        },
        {
          senderId: '20',
          senderName: 'Physical Therapist',
          content: "Noted. I'll monitor during drills. Let's keep ice packs ready just in case.",
          messageType: 'text' as const,
          timestamp: '2025-01-18T10:35:00Z',
        },
        {
          senderId: '19',
          senderName: 'Team Doctor',
          content: "Reminder: Injury report due by 5pm today for tomorrow's game.",
          messageType: 'text' as const,
          timestamp: '2025-01-18T15:00:00Z',
        },
      ],
    },
    {
      slug: 'team-operations',
      name: 'Team Operations',
      description: 'Logistics and travel coordination',
      roleId: 'lakers-role-operations',
      isPrivate: true,
      messages: [
        {
          senderId: '21',
          senderName: 'Team Manager',
          content: 'Operations channel for logistics coordination.',
          messageType: 'system' as const,
          timestamp: '2025-01-18T07:00:00Z',
        },
        {
          senderId: '22',
          senderName: 'Logistics Coordinator',
          content: 'Bus departs hotel at 5:30pm tomorrow. Players need to be in lobby by 5:15pm.',
          messageType: 'text' as const,
          timestamp: '2025-01-18T12:00:00Z',
        },
        {
          senderId: '21',
          senderName: 'Team Manager',
          content: "Confirmed. I'll send reminder to everyone at 4pm.",
          messageType: 'text' as const,
          timestamp: '2025-01-18T12:05:00Z',
        },
        {
          senderId: '22',
          senderName: 'Logistics Coordinator',
          content: 'Also, catering for post-game is set. Menu uploaded to shared drive.',
          messageType: 'text' as const,
          timestamp: '2025-01-18T14:00:00Z',
        },
      ],
    },
    {
      slug: 'security',
      name: 'Security',
      description: 'Security protocols and coordination',
      roleId: 'lakers-role-security',
      isPrivate: true,
      messages: [
        {
          senderId: '21',
          senderName: 'Team Manager',
          content: 'Security channel established. Report any issues here immediately.',
          messageType: 'system' as const,
          timestamp: '2025-01-18T07:30:00Z',
        },
        {
          senderId: '23',
          senderName: 'Security Chief',
          content:
            'Venue walkthrough complete. All exits secured. VIP entrance ready at loading dock.',
          messageType: 'text' as const,
          timestamp: '2025-01-18T16:00:00Z',
        },
        {
          senderId: '23',
          senderName: 'Security Chief',
          content:
            'Crowd size expected: 18,000. Extra detail on west entrance per local PD recommendation.',
          messageType: 'text' as const,
          timestamp: '2025-01-18T17:30:00Z',
        },
      ],
    },
  ],
};

export const youthSoccerMockChannelData = {
  // Trip 14 - Youth Soccer League
  tripId: '14',
  admins: ['33', '35'], // League Director, Parent who's also a coach
  roles: [
    {
      id: 'soccer-role-players',
      name: 'Players',
      description: 'Team players (kids)',
      memberUserIds: ['24', '25', '26', '27', '28', '29', '30', '31', '32', '40', '41', '42'],
    },
    {
      id: 'soccer-role-coaches',
      name: 'Coaches',
      description: 'Team coaches',
      memberUserIds: ['33', '34', '35'], // Note: '35' is also a parent
    },
    {
      id: 'soccer-role-parents',
      name: 'Parents',
      description: 'Player parents',
      memberUserIds: ['35', '36', '37', '38', '39'], // Note: '35' is also a coach
    },
  ],
  channels: [
    {
      slug: 'players',
      name: 'Players',
      description: 'Players-only chat',
      roleId: 'soccer-role-players',
      isPrivate: true,
      messages: [
        {
          senderId: '33',
          senderName: 'League Director',
          content: 'Players channel is live! Have fun and stay positive! ⚽',
          messageType: 'system' as const,
          timestamp: '2025-01-17T08:00:00Z',
        },
        {
          senderId: '24',
          senderName: 'Player 1',
          content: "Who's bringing the orange slices this week? 🍊",
          messageType: 'text' as const,
          timestamp: '2025-01-17T15:30:00Z',
        },
        {
          senderId: '25',
          senderName: 'Player 2',
          content: "My mom said she's bringing them! And juice boxes!",
          messageType: 'text' as const,
          timestamp: '2025-01-17T15:35:00Z',
        },
        {
          senderId: '26',
          senderName: 'Player 3',
          content: 'Can we practice our victory dance for when we win? 🕺',
          messageType: 'text' as const,
          timestamp: '2025-01-17T16:00:00Z',
        },
        {
          senderId: '27',
          senderName: 'Player 4',
          content: "YES! I've been working on my moves!",
          messageType: 'text' as const,
          timestamp: '2025-01-17T16:05:00Z',
        },
      ],
    },
    {
      slug: 'coaches',
      name: 'Coaches',
      description: 'Coach coordination',
      roleId: 'soccer-role-coaches',
      isPrivate: true,
      messages: [
        {
          senderId: '33',
          senderName: 'League Director',
          content: 'Coaches channel ready. Coordinate practice plans and game strategy here.',
          messageType: 'system' as const,
          timestamp: '2025-01-17T07:00:00Z',
        },
        {
          senderId: '34',
          senderName: 'Head Coach',
          content:
            'Practice plan for Thursday: 15min warmup, 20min passing drills, 20min scrimmage, 5min cooldown.',
          messageType: 'text' as const,
          timestamp: '2025-01-17T10:00:00Z',
        },
        {
          senderId: '35',
          senderName: 'Assistant Coach',
          content: "Sounds good! I'll set up the cones. Should we work on corner kicks too?",
          messageType: 'text' as const,
          timestamp: '2025-01-17T10:15:00Z',
        },
        {
          senderId: '33',
          senderName: 'League Director',
          content: 'Reminder: All coaches need to complete SafeSport training by end of month.',
          messageType: 'text' as const,
          timestamp: '2025-01-17T14:00:00Z',
        },
      ],
    },
    {
      slug: 'parents',
      name: 'Parents',
      description: 'Parent coordination',
      roleId: 'soccer-role-parents',
      isPrivate: true,
      messages: [
        {
          senderId: '33',
          senderName: 'League Director',
          content: 'Parents channel active. Coordinate carpools and snacks here.',
          messageType: 'system' as const,
          timestamp: '2025-01-17T07:30:00Z',
        },
        {
          senderId: '36',
          senderName: 'Parent 1',
          content: "Who can carpool to Saturday's game? I can take 3 kids in my minivan.",
          messageType: 'text' as const,
          timestamp: '2025-01-17T18:00:00Z',
        },
        {
          senderId: '37',
          senderName: 'Parent 2',
          content:
            "I can take 2! And I'm bringing the snacks this week - goldfish and juice boxes work?",
          messageType: 'text' as const,
          timestamp: '2025-01-17T18:10:00Z',
        },
        {
          senderId: '38',
          senderName: 'Parent 3',
          content: 'Perfect! My kid has a nut allergy so goldfish are great. Thank you! 🙏',
          messageType: 'text' as const,
          timestamp: '2025-01-17T18:15:00Z',
        },
        {
          senderId: '35',
          senderName: 'Assistant Coach',
          content:
            'Hey parents! Game starts at 10am sharp Saturday. Please arrive by 9:30 for warmups.',
          messageType: 'text' as const,
          timestamp: '2025-01-17T19:00:00Z',
        },
        {
          senderId: '39',
          senderName: 'Parent 4',
          content: 'Got it! Also, are we doing team photos this weekend?',
          messageType: 'text' as const,
          timestamp: '2025-01-17T19:30:00Z',
        },
      ],
    },
  ],
};

export const musicTourMockChannelData = {
  // Trip 15 - Music Tour
  tripId: '15',
  admins: ['43'], // Tour Manager
  roles: [
    {
      id: 'tour-role-production',
      name: 'Production Crew',
      description: 'Stage, sound, and lighting crew',
      memberUserIds: ['44', '45', '46', '47'],
    },
    {
      id: 'tour-role-security',
      name: 'Security Team',
      description: 'Venue and artist security',
      memberUserIds: ['48', '49'],
    },
    {
      id: 'tour-role-photographers',
      name: 'Media Team',
      description: 'Photographers and videographers',
      memberUserIds: ['50', '51'],
    },
    {
      id: 'tour-role-venues',
      name: 'Venue Liaisons',
      description: 'Venue coordination staff',
      memberUserIds: ['52', '53'],
    },
  ],
  channels: [
    {
      slug: 'production',
      name: 'Production Crew',
      description: 'Tech crew coordination',
      roleId: 'tour-role-production',
      isPrivate: true,
      messages: [
        {
          senderId: '43',
          senderName: 'Tour Manager',
          content: 'Production channel established. Coordinate load-in and tech here.',
          messageType: 'system' as const,
          timestamp: '2025-01-16T06:00:00Z',
        },
        {
          senderId: '44',
          senderName: 'Stage Manager',
          content: 'Load-in starts at 8am. Truck should arrive by 7:30. All hands on deck!',
          messageType: 'text' as const,
          timestamp: '2025-01-16T19:00:00Z',
        },
        {
          senderId: '45',
          senderName: 'Sound Engineer',
          content:
            'Roger that. Sound check at 2pm. Need at least 3 hours for line check and mixing.',
          messageType: 'text' as const,
          timestamp: '2025-01-16T19:15:00Z',
        },
        {
          senderId: '46',
          senderName: 'Lighting Director',
          content: 'Lights rigged and programmed. Running cue-to-cue at 4pm with artist.',
          messageType: 'text' as const,
          timestamp: '2025-01-16T20:00:00Z',
        },
        {
          senderId: '47',
          senderName: 'Video Tech',
          content: "LED wall sync'd. Running visual test during sound check.",
          messageType: 'text' as const,
          timestamp: '2025-01-16T20:30:00Z',
        },
      ],
    },
    {
      slug: 'security',
      name: 'Security Team',
      description: 'Security coordination',
      roleId: 'tour-role-security',
      isPrivate: true,
      messages: [
        {
          senderId: '43',
          senderName: 'Tour Manager',
          content: 'Security channel active. Report all incidents immediately.',
          messageType: 'system' as const,
          timestamp: '2025-01-16T06:30:00Z',
        },
        {
          senderId: '48',
          senderName: 'Head of Security',
          content: 'Venue walkthrough complete. 4 exits secured. Barrier installed at stage front.',
          messageType: 'text' as const,
          timestamp: '2025-01-16T14:00:00Z',
        },
        {
          senderId: '49',
          senderName: 'Security Detail',
          content: 'Local PD coordinated. 6 officers on-site tonight. Crowd capacity: 5,000.',
          messageType: 'text' as const,
          timestamp: '2025-01-16T15:30:00Z',
        },
        {
          senderId: '48',
          senderName: 'Head of Security',
          content: 'Artist arrival via back entrance at 6:30pm. Escort ready.',
          messageType: 'text' as const,
          timestamp: '2025-01-16T17:00:00Z',
        },
      ],
    },
    {
      slug: 'media-team',
      name: 'Media Team',
      description: 'Photo and video coordination',
      roleId: 'tour-role-photographers',
      isPrivate: true,
      messages: [
        {
          senderId: '43',
          senderName: 'Tour Manager',
          content: 'Media team channel ready. Share shot lists and content here.',
          messageType: 'system' as const,
          timestamp: '2025-01-16T07:00:00Z',
        },
        {
          senderId: '50',
          senderName: 'Lead Photographer',
          content:
            'Shot list for tonight: backstage prep, soundcheck candids, crowd energy, first 3 songs from pit.',
          messageType: 'text' as const,
          timestamp: '2025-01-16T12:00:00Z',
        },
        {
          senderId: '51',
          senderName: 'Videographer',
          content:
            "Copy that. I'll capture B-roll of load-in and crowd arrival. Need 4K for tour doc.",
          messageType: 'text' as const,
          timestamp: '2025-01-16T12:30:00Z',
        },
        {
          senderId: '50',
          senderName: 'Lead Photographer',
          content:
            "Uploading tonight's selects to Dropbox by midnight. Social team needs 5 hero shots.",
          messageType: 'text' as const,
          timestamp: '2025-01-16T21:00:00Z',
        },
      ],
    },
    {
      slug: 'venues',
      name: 'Venue Liaisons',
      description: 'Venue coordination',
      roleId: 'tour-role-venues',
      isPrivate: true,
      messages: [
        {
          senderId: '43',
          senderName: 'Tour Manager',
          content: 'Venue liaison channel active. Coordinate with local staff here.',
          messageType: 'system' as const,
          timestamp: '2025-01-16T07:30:00Z',
        },
        {
          senderId: '52',
          senderName: 'Venue Coordinator',
          content:
            'Dressing rooms ready. Catering arrives at 5pm. Green room stocked per rider specs.',
          messageType: 'text' as const,
          timestamp: '2025-01-16T13:00:00Z',
        },
        {
          senderId: '53',
          senderName: 'Local Production',
          content: 'Parking passes distributed. Venue staff briefed on timeline and restrictions.',
          messageType: 'text' as const,
          timestamp: '2025-01-16M16:00:00Z',
        },
        {
          senderId: '52',
          senderName: 'Venue Coordinator',
          content: 'Merch booth set up. POS systems tested. Ready for doors at 7pm.',
          messageType: 'text' as const,
          timestamp: '2025-01-16T18:00:00Z',
        },
      ],
    },
  ],
};

export const getAllMockChannelData = () => [
  lakersMockChannelData,
  youthSoccerMockChannelData,
  musicTourMockChannelData,
];
