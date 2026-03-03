/**
 * buildSpeechText — Deterministic spoken-transcript builder for AI Concierge TTS.
 *
 * Converts rich assistant messages (with hotel/place/flight cards, URLs, markdown)
 * into clean, speakable text that sounds natural through ElevenLabs TTS.
 *
 * Rules:
 * - Never read raw URLs, tracking links, or markdown syntax aloud.
 * - If cards exist, speak a short summary + up to MAX_SPOKEN_CARDS top cards.
 * - Hard cap spoken chars at MAX_SPOKEN_CHARS.
 * - Strip markdown formatting (bold, italic, headers, lists, code blocks).
 */

import type { HotelResult } from '@/features/chat/components/HotelResultCards';
import type { PlaceResult } from '@/features/chat/components/PlaceResultCards';

/** Max characters in the spoken transcript (~60-90 seconds of TTS audio). */
const MAX_SPOKEN_CHARS = 1200;

/** Max number of cards to speak details for. */
const MAX_SPOKEN_CARDS = 3;

interface SpeechTextInput {
  /** The display text / markdown content of the assistant message. */
  displayText: string;
  /** Hotel cards attached to the message. */
  hotels?: HotelResult[];
  /** Place cards attached to the message. */
  places?: PlaceResult[];
  /** Flight cards attached to the message. */
  flights?: Array<{
    origin: string;
    destination: string;
    airline?: string | null;
    price?: { display?: string | null } | null;
    stops?: number | null;
    durationMinutes?: number | null;
  }>;
}

/** Strip markdown formatting to produce speakable plain text. */
function stripMarkdown(text: string): string {
  return (
    text
      // Remove images: ![alt](url)
      .replace(/!\[.*?\]\(.*?\)/g, '')
      // Remove links but keep label: [label](url) → label
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Remove raw URLs (http/https)
      .replace(/https?:\/\/[^\s)]+/g, '')
      // Remove bold/italic markers
      .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, '$2')
      // Remove headers (# ## ###)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove blockquotes
      .replace(/^>\s+/gm, '')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`([^`]*)`/g, '$1')
      // Remove horizontal rules
      .replace(/^-{3,}$/gm, '')
      // Remove list markers (- * 1.)
      .replace(/^[\s]*[-*]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // Remove emoji shortcodes (:emoji:)
      .replace(/:[a-z_]+:/g, '')
      // Collapse multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      // Collapse multiple spaces
      .replace(/ {2,}/g, ' ')
      .trim()
  );
}

/** Summarize a hotel card into a short spoken phrase. */
function summarizeHotel(hotel: HotelResult): string {
  const parts: string[] = [hotel.title];

  const location = [hotel.location?.city, hotel.location?.region].filter(Boolean).join(', ');
  if (location) parts.push(`in ${location}`);

  if (hotel.details?.rating != null) {
    parts.push(`rated ${hotel.details.rating.toFixed(1)} stars`);
  }

  if (hotel.price?.display) {
    parts.push(`starting at ${hotel.price.display}`);
  }

  if (hotel.details?.refundable) {
    parts.push('refundable');
  }

  return parts.join(', ') + '.';
}

/** Summarize a place card into a short spoken phrase. */
function summarizePlace(place: PlaceResult): string {
  const parts: string[] = [place.name];

  if (place.address) parts.push(place.address);
  if (place.rating != null) parts.push(`rated ${place.rating.toFixed(1)}`);
  if (place.priceLevel) {
    const priceMap: Record<string, string> = {
      PRICE_LEVEL_FREE: 'free',
      PRICE_LEVEL_INEXPENSIVE: 'budget-friendly',
      PRICE_LEVEL_MODERATE: 'moderately priced',
      PRICE_LEVEL_EXPENSIVE: 'upscale',
      PRICE_LEVEL_VERY_EXPENSIVE: 'luxury',
    };
    const label = priceMap[place.priceLevel];
    if (label) parts.push(label);
  }

  return parts.join(', ') + '.';
}

/** Summarize a flight card into a short spoken phrase. */
function summarizeFlight(
  flight: SpeechTextInput['flights'] extends (infer T)[] ? T : never,
): string {
  const parts: string[] = [];

  if (flight.airline) parts.push(flight.airline);
  parts.push(`from ${flight.origin} to ${flight.destination}`);

  if (flight.stops != null) {
    parts.push(
      flight.stops === 0 ? 'nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`,
    );
  }

  if (flight.durationMinutes != null) {
    const hrs = Math.floor(flight.durationMinutes / 60);
    const mins = flight.durationMinutes % 60;
    const durParts: string[] = [];
    if (hrs > 0) durParts.push(`${hrs} hour${hrs > 1 ? 's' : ''}`);
    if (mins > 0) durParts.push(`${mins} minute${mins > 1 ? 's' : ''}`);
    if (durParts.length > 0) parts.push(durParts.join(' and '));
  }

  if (flight.price?.display) parts.push(flight.price.display);

  return parts.join(', ') + '.';
}

/**
 * Build a spoken transcript from a rich assistant message.
 *
 * Returns a clean, speakable string suitable for ElevenLabs TTS,
 * or an empty string if there's nothing meaningful to speak.
 */
export function buildSpeechText(input: SpeechTextInput): string {
  const { displayText, hotels, places, flights } = input;

  const hotelCount = hotels?.length ?? 0;
  const placeCount = places?.length ?? 0;
  const flightCount = flights?.length ?? 0;
  const totalCards = hotelCount + placeCount + flightCount;

  // Start with cleaned display text
  let spokenBase = stripMarkdown(displayText);

  // If there are cards, append spoken summaries
  if (totalCards > 0) {
    const cardSummaries: string[] = [];

    if (hotelCount > 0) {
      const spokenHotels = hotels!.slice(0, MAX_SPOKEN_CARDS);
      if (hotelCount > MAX_SPOKEN_CARDS) {
        cardSummaries.push(
          `I've shown ${hotelCount} hotel options above. Here are the top ${MAX_SPOKEN_CARDS}.`,
        );
      }
      spokenHotels.forEach(h => cardSummaries.push(summarizeHotel(h)));
    }

    if (placeCount > 0) {
      const spokenPlaces = places!.slice(0, MAX_SPOKEN_CARDS);
      if (placeCount > MAX_SPOKEN_CARDS) {
        cardSummaries.push(
          `I've shown ${placeCount} places above. Here are the top ${MAX_SPOKEN_CARDS}.`,
        );
      }
      spokenPlaces.forEach(p => cardSummaries.push(summarizePlace(p)));
    }

    if (flightCount > 0) {
      const spokenFlights = flights!.slice(0, MAX_SPOKEN_CARDS);
      if (flightCount > MAX_SPOKEN_CARDS) {
        cardSummaries.push(
          `I've shown ${flightCount} flight options above. Here are the top ${MAX_SPOKEN_CARDS}.`,
        );
      }
      spokenFlights.forEach(f => cardSummaries.push(summarizeFlight(f)));
    }

    cardSummaries.push('Tap Save to Trip on any card to pin it.');

    if (spokenBase) {
      spokenBase = spokenBase + '\n\n' + cardSummaries.join(' ');
    } else {
      spokenBase = cardSummaries.join(' ');
    }
  }

  // Hard cap
  if (spokenBase.length > MAX_SPOKEN_CHARS) {
    // Truncate at the last sentence boundary before the cap
    const truncated = spokenBase.slice(0, MAX_SPOKEN_CHARS);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?'),
    );
    if (lastSentenceEnd > MAX_SPOKEN_CHARS * 0.5) {
      spokenBase =
        truncated.slice(0, lastSentenceEnd + 1) + ' Check the full detail in the chat above.';
    } else {
      spokenBase = truncated.trim() + '... Check the full detail in the chat above.';
    }
  }

  return spokenBase.trim();
}

export type { SpeechTextInput };
