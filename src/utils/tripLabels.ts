/**
 * Returns display labels for a given trip category.
 */
export function getTripLabels(category: string): {
  label: string;
  shortLabel: string;
  schedule: string;
  team: string;
} {
  switch (category) {
    case 'sports':
      return { label: 'Sports Trip', shortLabel: 'Sports', schedule: 'Game Schedule', team: 'Roster' };
    case 'music':
      return { label: 'Music Tour', shortLabel: 'Music', schedule: 'Show Schedule', team: 'Band & Crew' };
    case 'corporate':
      return { label: 'Corporate Travel', shortLabel: 'Corporate', schedule: 'Agenda', team: 'Team' };
    case 'entertainment':
      return { label: 'Entertainment', shortLabel: 'Entertainment', schedule: 'Schedule', team: 'Cast & Crew' };
    default:
      return { label: 'Pro Trip', shortLabel: 'Pro', schedule: 'Schedule', team: 'Team' };
  }
}
