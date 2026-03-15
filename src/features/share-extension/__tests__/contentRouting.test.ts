import { describe, it, expect } from 'vitest';
import type { ShareDestination, SharedContentType, RoutingConfidence } from '../types';

/**
 * Tests for content routing logic.
 * These test the TypeScript-side routing expectations that mirror
 * the Swift ContentRouter logic.
 */

interface RoutingTestCase {
  description: string;
  contentType: SharedContentType;
  url: string | null;
  text: string | null;
  expectedDestination: ShareDestination;
  expectedMinConfidence: RoutingConfidence;
}

const confidenceOrder: Record<RoutingConfidence, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function routeContent(
  contentType: SharedContentType,
  url: string | null,
  text: string | null,
): { destination: ShareDestination; confidence: RoutingConfidence } {
  // URL routing
  if (url) {
    const lowerURL = url.toLowerCase();

    const calendarPatterns = ['calendar', 'eventbrite', 'meetup.com/events', '.ics'];
    if (calendarPatterns.some(p => lowerURL.includes(p))) {
      return { destination: 'calendar', confidence: 'medium' };
    }

    const mapPatterns = [
      'maps.google',
      'maps.apple',
      'yelp.com',
      'tripadvisor',
      'booking.com',
      'airbnb.com',
    ];
    if (mapPatterns.some(p => lowerURL.includes(p))) {
      return { destination: 'explore_links', confidence: 'high' };
    }

    return { destination: 'explore_links', confidence: 'high' };
  }

  // File routing
  if (contentType === 'image' || contentType === 'pdf') {
    return { destination: 'concierge', confidence: 'medium' };
  }

  // Text routing
  if (text) {
    const lower = text.toLowerCase();
    const taskPatterns = ['todo:', 'task:', 'remind me', 'need to', 'book '];
    if (taskPatterns.some(p => lower.includes(p))) {
      return { destination: 'tasks', confidence: 'medium' };
    }

    const calPatterns = ['meeting at', 'dinner at', 'flight at', 'reservation for'];
    if (calPatterns.some(p => lower.includes(p))) {
      return { destination: 'calendar', confidence: 'medium' };
    }

    if (text.length < 280) {
      return { destination: 'chat', confidence: 'medium' };
    }

    return { destination: 'concierge', confidence: 'medium' };
  }

  return { destination: 'concierge', confidence: 'low' };
}

const testCases: RoutingTestCase[] = [
  {
    description: 'Web URL → Explore Links',
    contentType: 'url',
    url: 'https://example.com/cool-article',
    text: null,
    expectedDestination: 'explore_links',
    expectedMinConfidence: 'high',
  },
  {
    description: 'Google Maps link → Explore Links',
    contentType: 'url',
    url: 'https://maps.google.com/place?q=restaurant',
    text: null,
    expectedDestination: 'explore_links',
    expectedMinConfidence: 'high',
  },
  {
    description: 'Airbnb link → Explore Links',
    contentType: 'url',
    url: 'https://www.airbnb.com/rooms/12345',
    text: null,
    expectedDestination: 'explore_links',
    expectedMinConfidence: 'high',
  },
  {
    description: 'Eventbrite URL → Calendar',
    contentType: 'url',
    url: 'https://www.eventbrite.com/e/my-event-12345',
    text: null,
    expectedDestination: 'calendar',
    expectedMinConfidence: 'medium',
  },
  {
    description: 'Short text → Chat',
    contentType: 'plain_text',
    url: null,
    text: 'Hey, check this out!',
    expectedDestination: 'chat',
    expectedMinConfidence: 'medium',
  },
  {
    description: 'Task-like text → Tasks',
    contentType: 'plain_text',
    url: null,
    text: 'TODO: Book hotel in Barcelona for March 20-25',
    expectedDestination: 'tasks',
    expectedMinConfidence: 'medium',
  },
  {
    description: 'Calendar-like text → Calendar',
    contentType: 'plain_text',
    url: null,
    text: 'Dinner at 7pm at the Italian restaurant on Main St',
    expectedDestination: 'calendar',
    expectedMinConfidence: 'medium',
  },
  {
    description: 'Image → Concierge',
    contentType: 'image',
    url: null,
    text: null,
    expectedDestination: 'concierge',
    expectedMinConfidence: 'medium',
  },
  {
    description: 'PDF → Concierge',
    contentType: 'pdf',
    url: null,
    text: null,
    expectedDestination: 'concierge',
    expectedMinConfidence: 'medium',
  },
  {
    description: 'Long text → Concierge',
    contentType: 'plain_text',
    url: null,
    text: 'A'.repeat(300),
    expectedDestination: 'concierge',
    expectedMinConfidence: 'medium',
  },
  {
    description: 'Empty content → Concierge (low confidence)',
    contentType: 'plain_text',
    url: null,
    text: null,
    expectedDestination: 'concierge',
    expectedMinConfidence: 'low',
  },
];

describe('Content Routing Logic', () => {
  for (const tc of testCases) {
    it(tc.description, () => {
      const result = routeContent(tc.contentType, tc.url, tc.text);
      expect(result.destination).toBe(tc.expectedDestination);
      expect(confidenceOrder[result.confidence]).toBeGreaterThanOrEqual(
        confidenceOrder[tc.expectedMinConfidence],
      );
    });
  }
});

describe('Routing edge cases', () => {
  it('should handle URL with tracking parameters', () => {
    const result = routeContent(
      'url',
      'https://example.com/article?utm_source=twitter&ref=share',
      null,
    );
    expect(result.destination).toBe('explore_links');
  });

  it('should handle Booking.com URL', () => {
    const result = routeContent('url', 'https://www.booking.com/hotel/us/grand-hotel.html', null);
    expect(result.destination).toBe('explore_links');
    expect(result.confidence).toBe('high');
  });

  it('should handle "remind me" text as task', () => {
    const result = routeContent('plain_text', null, 'Remind me to pack sunscreen');
    expect(result.destination).toBe('tasks');
  });

  it('should handle "reservation for" text as calendar', () => {
    const result = routeContent('plain_text', null, 'We have a reservation for 4 at 8pm');
    expect(result.destination).toBe('calendar');
  });
});
