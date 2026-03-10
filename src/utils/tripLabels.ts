/**
 * Returns display labels for a given trip category.
 */
export function getTripLabels(category: string): { label: string; shortLabel: string } {
  switch (category) {
    case 'sports':
      return { label: 'Sports Trip', shortLabel: 'Sports' };
    case 'music':
      return { label: 'Music Tour', shortLabel: 'Music' };
    case 'corporate':
      return { label: 'Corporate Travel', shortLabel: 'Corporate' };
    case 'entertainment':
      return { label: 'Entertainment', shortLabel: 'Entertainment' };
    default:
      return { label: 'Pro Trip', shortLabel: 'Pro' };
  }
}
