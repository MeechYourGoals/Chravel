import { createTripLink, getTripLinks } from '@/services/tripLinksService';

export interface ConciergeCardLink {
  title: string;
  url: string;
  type?: string;
}

interface SaveConciergeCardToTripParams {
  tripId: string;
  createdBy: string;
  isDemoMode: boolean;
  card: ConciergeCardLink;
}

export interface SaveConciergeCardToTripResult {
  ok: boolean;
  alreadySaved: boolean;
}

const normalizeUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

export async function saveConciergeCardToTrip({
  tripId,
  createdBy,
  isDemoMode,
  card,
}: SaveConciergeCardToTripParams): Promise<SaveConciergeCardToTripResult> {
  const normalizedUrl = normalizeUrl(card.url);
  const trimmedTitle = card.title.trim();

  if (!normalizedUrl || !trimmedTitle) {
    return { ok: false, alreadySaved: false };
  }

  const existing = await getTripLinks(tripId, isDemoMode);
  const hasExisting = existing.some(
    link => link.url.trim().toLowerCase() === normalizedUrl.toLowerCase(),
  );

  if (hasExisting) {
    return { ok: true, alreadySaved: true };
  }

  const created = await createTripLink(
    {
      tripId,
      title: trimmedTitle,
      url: normalizedUrl,
      addedBy: createdBy,
      category: card.type ?? 'other',
    },
    isDemoMode,
    { suppressToast: true },
  );

  return {
    ok: Boolean(created),
    alreadySaved: false,
  };
}
