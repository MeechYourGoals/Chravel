
import { LucideIcon } from 'lucide-react';

export type ProTripCategory =
  | 'Sports – Pro, Collegiate, Youth'
  | 'Tour – Music, Comedy, etc.'
  | 'Business Travel'
  | 'School Trip'
  | 'Content'
  | 'Other';

export interface ProCategoryConfig {
  id: ProTripCategory;
  name: string;
  description: string;
  roles: string[];
  availableTabs: string[];
  requiredTabs: string[];
  terminology: {
    teamLabel: string;
    memberLabel: string;
    leaderLabel: string;
  };
}

export const PRO_CATEGORY_CONFIGS: Record<ProTripCategory, ProCategoryConfig> = {
  'Sports – Pro, Collegiate, Youth': {
    id: 'Sports – Pro, Collegiate, Youth',
    name: 'Sports – Pro, Collegiate, Youth',
    description: 'Professional, collegiate, and youth sports teams, tournaments, and athletic events',
    roles: ['Player', 'Coach', 'Crew', 'Medical', 'Security'], // MVP: Capped at 5 roles
    availableTabs: ['chat', 'calendar', 'tasks', 'polls', 'places', 'team', 'finance', 'medical', 'compliance', 'ai-chat'],
    requiredTabs: ['team', 'medical'],
    terminology: {
      teamLabel: 'Team Roster',
      memberLabel: 'Team Member',
      leaderLabel: 'Team Captain'
    }
  },
  'Tour – Music, Comedy, etc.': {
    id: 'Tour – Music, Comedy, etc.',
    name: 'Tour – Music, Comedy, etc.',
    description: 'Music tours, comedy shows, podcast tours, creator events, and entertainment productions',
    roles: ['Artist Team', 'Tour Manager', 'Crew', 'VIP', 'Security'],
    availableTabs: ['chat', 'calendar', 'tasks', 'polls', 'places', 'team', 'finance', 'sponsors', 'ai-chat'],
    requiredTabs: ['team'],
    terminology: {
      teamLabel: 'Tour Crew',
      memberLabel: 'Crew Member',
      leaderLabel: 'Tour Manager'
    }
  },
  'Business Travel': {
    id: 'Business Travel',
    name: 'Business Travel',
    description: 'Corporate retreats, executive meetings, sales trips, recruiting events, and business travel',
    roles: [],
    availableTabs: ['chat', 'calendar', 'tasks', 'polls', 'places', 'team', 'finance', 'compliance', 'ai-chat'],
    requiredTabs: ['team'],
    terminology: {
      teamLabel: 'Attendees',
      memberLabel: 'Participant',
      leaderLabel: 'Event Lead'
    }
  },
  'School Trip': {
    id: 'School Trip',
    name: 'School Trip',
    description: 'Educational trips, academic competitions, and school-related events',
    roles: ['Student', 'Chaperone', 'Teacher'],
    availableTabs: ['chat', 'calendar', 'tasks', 'polls', 'places', 'team', 'compliance', 'medical', 'ai-chat'],
    requiredTabs: ['team', 'compliance'],
    terminology: {
      teamLabel: 'Group',
      memberLabel: 'Participant',
      leaderLabel: 'Lead Teacher'
    }
  },
  Content: {
    id: 'Content',
    name: 'Content',
    description: 'Television shows, film productions, creator content, and media shoots',
    roles: ['Talent', 'Crew', 'Security'],
    availableTabs: ['chat', 'calendar', 'tasks', 'polls', 'places', 'team', 'sponsors', 'compliance', 'ai-chat'],
    requiredTabs: ['team'],
    terminology: {
      teamLabel: 'Cast & Crew',
      memberLabel: 'Production Member',
      leaderLabel: 'Producer'
    }
  },
  Other: {
    id: 'Other',
    name: 'Other',
    description: 'All other types of professional trips and events not covered by the above categories',
    roles: [],
    availableTabs: ['chat', 'calendar', 'tasks', 'polls', 'places', 'team', 'finance', 'ai-chat'],
    requiredTabs: ['team'],
    terminology: {
      teamLabel: 'Team',
      memberLabel: 'Team Member',
      leaderLabel: 'Team Lead'
    }
  }
};

export const getCategoryConfig = (category: ProTripCategory): ProCategoryConfig => {
  return PRO_CATEGORY_CONFIGS[category];
};

export const getAllCategories = (): ProTripCategory[] => {
  return Object.keys(PRO_CATEGORY_CONFIGS) as ProTripCategory[];
};
