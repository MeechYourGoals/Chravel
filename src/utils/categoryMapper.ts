import { CalendarEvent } from '@/types/calendar';

export const mapCategoryToEventType = (categoryId: string): CalendarEvent['event_category'] => {
  const mapping: Record<string, CalendarEvent['event_category']> = {
    accommodations: 'lodging',
    food: 'dining',
    transportation: 'transportation',
    fitness: 'activity',
    nightlife: 'entertainment',
    attractions: 'activity',
    budget: 'other',
  };
  return mapping[categoryId] || 'other';
};
