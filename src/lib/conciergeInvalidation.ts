export type ConciergeInvalidationQueryKey = string[];

const CONCIERGE_WRITE_ACTIONS = new Set<string>([
  'createPoll',
  'createTask',
  'addToCalendar',
  'savePlace',
  'setBasecamp',
  'addToAgenda',
  'setTripHeaderImage',
]);

export function isConciergeWriteAction(name: string): boolean {
  return CONCIERGE_WRITE_ACTIONS.has(name);
}

export function getConciergeInvalidationQueryKey(
  name: string,
  tripId: string,
): ConciergeInvalidationQueryKey | null {
  switch (name) {
    case 'createTask':
      return ['tripTasks', tripId];
    case 'createPoll':
      return ['tripPolls', tripId];
    case 'addToCalendar':
      return ['calendarEvents', tripId];
    case 'savePlace':
      return ['tripPlaces', tripId];
    case 'setBasecamp':
      return ['tripBasecamp', tripId];
    case 'addToAgenda':
      return ['eventAgenda', tripId];
    case 'setTripHeaderImage':
      // Trip cards on the homepage render from the shared ['trips'] query.
      return ['trips'];
    default:
      return null;
  }
}
