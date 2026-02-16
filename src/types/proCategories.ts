
// ============= Pro Trip Category Enum System =============
// Stable internal enum values stored in DB; display labels mapped in UI

export type ProCategoryEnum =
  | 'touring'
  | 'sports'
  | 'work'
  | 'school'
  | 'productions'
  | 'celebrations'
  | 'other';

export interface ProCategoryConfig {
  id: ProCategoryEnum;
  label: string;
  description: string;
  searchSynonyms: string[];
  roles: string[];
  availableTabs: string[];
  requiredTabs: string[];
  terminology: {
    teamLabel: string;
    memberLabel: string;
    leaderLabel: string;
  };
}

// Ordered array — guarantees UI order in dropdowns
export const PRO_CATEGORIES_ORDERED: ProCategoryConfig[] = [
  {
    id: 'touring',
    label: 'Touring',
    description: 'Music tours, comedy shows, podcast tours, creator events, and entertainment productions',
    searchSynonyms: ['tour', 'touring', 'music', 'comedy', 'concert', 'band', 'show'],
    roles: ['Artist Team', 'Tour Manager', 'Crew', 'VIP', 'Security'],
    availableTabs: ['chat', 'calendar', 'ai-chat', 'media', 'payments', 'places', 'polls', 'tasks', 'team'],
    requiredTabs: ['team'],
    terminology: { teamLabel: 'Tour Crew', memberLabel: 'Crew Member', leaderLabel: 'Tour Manager' },
  },
  {
    id: 'sports',
    label: 'Sports',
    description: 'Professional, collegiate, and youth sports teams, tournaments, and athletic events',
    searchSynonyms: ['sport', 'sports', 'athletic', 'game', 'team', 'tournament', 'league'],
    roles: ['Player', 'Coach', 'Crew', 'Medical', 'Security'],
    availableTabs: ['chat', 'calendar', 'ai-chat', 'media', 'payments', 'places', 'polls', 'tasks', 'team'],
    requiredTabs: ['team'],
    terminology: { teamLabel: 'Team Roster', memberLabel: 'Team Member', leaderLabel: 'Team Captain' },
  },
  {
    id: 'work',
    label: 'Work',
    description: 'Corporate retreats, executive meetings, sales trips, recruiting events, and business travel',
    searchSynonyms: ['work', 'business', 'corporate', 'retreat', 'office', 'meeting', 'conference'],
    roles: [],
    availableTabs: ['chat', 'calendar', 'ai-chat', 'media', 'payments', 'places', 'polls', 'tasks', 'team'],
    requiredTabs: ['team'],
    terminology: { teamLabel: 'Attendees', memberLabel: 'Participant', leaderLabel: 'Event Lead' },
  },
  {
    id: 'school',
    label: 'School',
    description: 'Educational trips, academic competitions, and school-related events',
    searchSynonyms: ['school', 'education', 'student', 'academic', 'campus', 'field trip'],
    roles: ['Student', 'Chaperone', 'Teacher'],
    availableTabs: ['chat', 'calendar', 'ai-chat', 'media', 'payments', 'places', 'polls', 'tasks', 'team'],
    requiredTabs: ['team'],
    terminology: { teamLabel: 'Group', memberLabel: 'Participant', leaderLabel: 'Lead Teacher' },
  },
  {
    id: 'productions',
    label: 'Productions',
    description: 'Television shows, film productions, content shoots, and media projects',
    searchSynonyms: ['production', 'productions', 'content', 'shoot', 'film', 'tv', 'media', 'creator'],
    roles: ['Talent', 'Crew', 'Security'],
    availableTabs: ['chat', 'calendar', 'ai-chat', 'media', 'payments', 'places', 'polls', 'tasks', 'team'],
    requiredTabs: ['team'],
    terminology: { teamLabel: 'Cast & Crew', memberLabel: 'Production Member', leaderLabel: 'Producer' },
  },
  {
    id: 'celebrations',
    label: 'Celebrations',
    description: 'Weddings, bachelor/bachelorette trips, anniversaries, reunions, and milestone celebrations',
    searchSynonyms: ['celebration', 'celebrations', 'wedding', 'bachelor', 'bachelorette', 'party', 'anniversary', 'reunion'],
    roles: [],
    availableTabs: ['chat', 'calendar', 'ai-chat', 'media', 'payments', 'places', 'polls', 'tasks', 'team'],
    requiredTabs: ['team'],
    terminology: { teamLabel: 'Guest List', memberLabel: 'Guest', leaderLabel: 'Host' },
  },
  {
    id: 'other',
    label: 'Other',
    description: 'All other types of professional trips and events not covered by the above categories',
    searchSynonyms: ['other'],
    roles: [],
    availableTabs: ['chat', 'calendar', 'ai-chat', 'media', 'payments', 'places', 'polls', 'tasks', 'team'],
    requiredTabs: ['team'],
    terminology: { teamLabel: 'Team', memberLabel: 'Team Member', leaderLabel: 'Team Lead' },
  },
];

// Lookup map for fast access by enum value
const CONFIG_MAP: Record<ProCategoryEnum, ProCategoryConfig> = PRO_CATEGORIES_ORDERED.reduce(
  (acc, config) => {
    acc[config.id] = config;
    return acc;
  },
  {} as Record<ProCategoryEnum, ProCategoryConfig>,
);

// ============= Legacy Migration =============

const LEGACY_TO_ENUM: Record<string, ProCategoryEnum> = {
  // Exact legacy labels
  'Sports – Pro, Collegiate, Youth': 'sports',
  'Tour – Music, Comedy, etc.': 'touring',
  'Business Travel': 'work',
  'Business Trips': 'work',
  'School Trip': 'school',
  'Content': 'productions',
  'Other': 'other',
};

/**
 * Normalizes any legacy or unknown category string to a valid ProCategoryEnum.
 * Handles exact matches first, then substring matching, defaults to 'other'.
 */
export function normalizeLegacyCategory(raw?: string | null): ProCategoryEnum {
  if (!raw) return 'other';

  // 1. Exact match (legacy label or already-enum value)
  if (LEGACY_TO_ENUM[raw]) return LEGACY_TO_ENUM[raw];
  if (CONFIG_MAP[raw as ProCategoryEnum]) return raw as ProCategoryEnum;

  // 2. Substring matching (case-insensitive) for fuzzy legacy data
  const lower = raw.toLowerCase();
  if (lower.includes('tour')) return 'touring';
  if (lower.includes('sport') || lower.includes('athletic')) return 'sports';
  if (lower.includes('business') || lower.includes('work') || lower.includes('corporate')) return 'work';
  if (lower.includes('school') || lower.includes('education')) return 'school';
  if (lower.includes('content') || lower.includes('production') || lower.includes('film') || lower.includes('tv')) return 'productions';
  if (lower.includes('celebrat') || lower.includes('wedding') || lower.includes('party')) return 'celebrations';

  return 'other';
}

// ============= Public API (backward-compatible names) =============

/** @deprecated Use ProCategoryEnum instead */
export type ProTripCategory = ProCategoryEnum;

export const getCategoryConfig = (category: ProCategoryEnum | string): ProCategoryConfig => {
  const normalized = normalizeLegacyCategory(category);
  return CONFIG_MAP[normalized];
};

export const getAllCategories = (): ProCategoryEnum[] => {
  return PRO_CATEGORIES_ORDERED.map(c => c.id);
};

/**
 * Returns the display label for a category enum value.
 * Gracefully handles unknown/legacy values.
 */
export const getCategoryLabel = (category: string | undefined | null): string => {
  const normalized = normalizeLegacyCategory(category);
  return CONFIG_MAP[normalized].label;
};

/**
 * Returns all search synonyms for a category (including the label itself).
 */
export const getCategorySynonyms = (category: ProCategoryEnum): string[] => {
  const config = CONFIG_MAP[category];
  return config ? [config.label.toLowerCase(), ...config.searchSynonyms] : [];
};
