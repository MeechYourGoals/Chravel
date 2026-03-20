export const EVENT_OPEN_CHAT_MAX_ATTENDEES = 50;

export type ChatMode = 'broadcasts' | 'admin_only' | 'everyone' | null;
export type TripType = 'event' | 'pro' | 'consumer' | string | null;

const ADMIN_ROLES = new Set(['admin', 'organizer', 'owner']);

export function isLargeEvent(tripType: TripType, attendeeCount: number): boolean {
  return tripType === 'event' && attendeeCount > EVENT_OPEN_CHAT_MAX_ATTENDEES;
}

export function canEnableEveryoneChat(tripType: TripType, attendeeCount: number): boolean {
  return !isLargeEvent(tripType, attendeeCount);
}

export function resolveEffectiveMainChatMode(
  chatMode: ChatMode,
  tripType: TripType,
  attendeeCount: number,
): Exclude<ChatMode, null> {
  // Keep null mode permissive to match existing server policy (`chat_mode IS NULL` allows posting).
  const normalizedMode = chatMode ?? 'everyone';

  // 'broadcasts' mode is event-only; non-event trips should never be locked to broadcasts.
  // Guards against migration 20260214211051 which set DEFAULT 'broadcasts' for all trips.
  if (normalizedMode === 'broadcasts' && tripType !== 'event') {
    return 'everyone';
  }

  if (normalizedMode === 'everyone' && isLargeEvent(tripType, attendeeCount)) {
    return 'admin_only';
  }
  return normalizedMode;
}

export function canPostInMainChat(params: {
  chatMode: ChatMode;
  tripType: TripType;
  attendeeCount: number;
  userRole: string | null;
  isLoading: boolean;
}): boolean {
  const { chatMode, tripType, attendeeCount, userRole, isLoading } = params;
  if (isLoading) return false;

  const effectiveMode = resolveEffectiveMainChatMode(chatMode, tripType, attendeeCount);
  if (effectiveMode === 'everyone') return true;

  return ADMIN_ROLES.has(userRole ?? '');
}
