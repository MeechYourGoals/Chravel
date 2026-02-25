import { Achievement } from '../components/gamification/AchievementBadge';

export interface TripProgress {
  accommodationBooked: boolean;
  flightsBooked: boolean;
  activitiesPlanned: number;
  tasksCompleted: number;
  totalTasks: number;
  budgetSet: boolean;
  participantsInvited: number;
}

export interface UserStats {
  totalTrips: number;
  completedTrips: number;
  countriesVisited: number;
  groupTripsOrganized: number;
  tasksCompleted: number;
  planningStreak: number;
  lastActivityDate?: string;
}

// Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_trip',
    title: 'First Adventure',
    description: 'Created your first trip',
    icon: '✈️',
    rarity: 'common',
  },
  {
    id: 'group_organizer',
    title: 'Group Leader',
    description: 'Organized a trip with 5+ people',
    icon: '👥',
    rarity: 'rare',
  },
  {
    id: 'international_explorer',
    title: 'International Explorer',
    description: 'Planned your first international trip',
    icon: '🌍',
    rarity: 'rare',
  },
  {
    id: 'budget_master',
    title: 'Budget Master',
    description: 'Stayed within budget on 3 trips',
    icon: '💰',
    rarity: 'epic',
  },
  {
    id: 'adventure_seeker',
    title: 'Adventure Seeker',
    description: 'Planned 5+ adventure activities',
    icon: '🏔️',
    rarity: 'rare',
  },
  {
    id: 'luxury_lover',
    title: 'Luxury Lover',
    description: 'Booked premium accommodations',
    icon: '🏖️',
    rarity: 'epic',
  },
  {
    id: 'trip_veteran',
    title: 'Trip Veteran',
    description: 'Completed 10 trips',
    icon: '🏆',
    rarity: 'legendary',
  },
  {
    id: 'master_organizer',
    title: 'Master Organizer',
    description: 'Reached organizer level 5',
    icon: '⭐',
    rarity: 'legendary',
  },
];

class GamificationService {
  calculateTripProgress(tripId: string): TripProgress {
    // Mock implementation - replace with real data
    const mockProgress: Record<string, TripProgress> = {
      '1': {
        accommodationBooked: true,
        flightsBooked: false,
        activitiesPlanned: 3,
        tasksCompleted: 1,
        totalTasks: 2,
        budgetSet: true,
        participantsInvited: 4,
      },
      '4': {
        accommodationBooked: true,
        flightsBooked: true,
        activitiesPlanned: 5,
        tasksCompleted: 0,
        totalTasks: 1,
        budgetSet: true,
        participantsInvited: 8,
      },
    };

    return (
      mockProgress[tripId] || {
        accommodationBooked: false,
        flightsBooked: false,
        activitiesPlanned: 0,
        tasksCompleted: 0,
        totalTasks: 0,
        budgetSet: false,
        participantsInvited: 0,
      }
    );
  }

  calculateProgressPercentage(progress: TripProgress): number {
    const weights = {
      accommodationBooked: 25,
      flightsBooked: 25,
      budgetSet: 15,
      activitiesPlanned: 15, // max 3 activities = 15%
      tasksCompleted: 15, // based on completion ratio
      participantsInvited: 5, // max 2 people = 5%
    };

    let totalProgress = 0;

    if (progress.accommodationBooked) totalProgress += weights.accommodationBooked;
    if (progress.flightsBooked) totalProgress += weights.flightsBooked;
    if (progress.budgetSet) totalProgress += weights.budgetSet;

    // Activities (up to 3 for full points)
    totalProgress += Math.min(progress.activitiesPlanned / 3, 1) * weights.activitiesPlanned;

    // Tasks completion ratio
    if (progress.totalTasks > 0) {
      totalProgress += (progress.tasksCompleted / progress.totalTasks) * weights.tasksCompleted;
    }

    // Participants (up to 2 additional for full points)
    totalProgress += Math.min(progress.participantsInvited / 2, 1) * weights.participantsInvited;

    return Math.min(Math.round(totalProgress), 100);
  }

  getDaysUntilTrip(tripId: string): number {
    // Mock implementation - replace with real trip dates
    const mockDates: Record<string, string> = {
      '1': '2024-03-15',
      '4': '2024-02-20',
      '6': '2024-04-01',
      '7': '2024-03-08',
    };

    const tripDate = mockDates[tripId];
    if (!tripDate) return 0;

    const now = new Date();
    const trip = new Date(tripDate);
    const diffTime = trip.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(diffDays, 0);
  }

  getTripMomentum(tripId: string): 'hot' | 'warm' | 'cold' {
    // Mock implementation based on recent activity
    const recentActivity: Record<string, number> = {
      '1': 5, // 5 activities in last 24h
      '4': 12, // High activity
      '6': 2,
      '7': 1,
    };

    const activity = recentActivity[tripId] || 0;

    if (activity >= 8) return 'hot';
    if (activity >= 3) return 'warm';
    return 'cold';
  }

  getUserAchievements(): Achievement[] {
    // Mock implementation - replace with real user data
    return ACHIEVEMENTS.slice(0, 3).map(achievement => ({
      ...achievement,
      unlockedAt: new Date().toISOString(),
    }));
  }

  getUserStats(): UserStats {
    // Mock implementation
    return {
      totalTrips: 8,
      completedTrips: 6,
      countriesVisited: 4,
      groupTripsOrganized: 3,
      tasksCompleted: 24,
      planningStreak: 5,
      lastActivityDate: new Date().toISOString(),
    };
  }

  getOrganizerLevel(stats: UserStats): { level: number; title: string; nextLevelProgress: number } {
    const levels = [
      { level: 1, title: 'Trip Newbie', required: 0 },
      { level: 2, title: 'Weekend Warrior', required: 2 },
      { level: 3, title: 'Travel Coordinator', required: 5 },
      { level: 4, title: 'Master Organizer', required: 10 },
      { level: 5, title: 'Travel Guru', required: 20 },
    ];

    let currentLevel = levels[0];
    let nextLevel = levels[1];

    for (let i = 0; i < levels.length; i++) {
      if (stats.totalTrips >= levels[i].required) {
        currentLevel = levels[i];
        nextLevel = levels[i + 1] || levels[i];
      }
    }

    const progress =
      nextLevel.level > currentLevel.level
        ? ((stats.totalTrips - currentLevel.required) /
            (nextLevel.required - currentLevel.required)) *
          100
        : 100;

    return {
      level: currentLevel.level,
      title: currentLevel.title,
      nextLevelProgress: Math.min(progress, 100),
    };
  }
}

export const gamificationService = new GamificationService();
