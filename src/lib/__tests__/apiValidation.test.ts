import { describe, it, expect } from 'vitest';
import {
  uuidSchema,
  tripIdSchema,
  sanitizedTextSchema,
  emailSchema,
  urlSchema,
  coordinateSchema,
  conciergeMessageSchema,
  chatMessageSchema,
  validateInput,
} from '../apiValidation';

describe('API Validation - UUID Schema', () => {
  it('accepts valid UUIDs', () => {
    expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
  });

  it('rejects invalid UUIDs', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
    expect(uuidSchema.safeParse('').success).toBe(false);
    expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716').success).toBe(false);
  });
});

describe('API Validation - Trip ID Schema', () => {
  it('accepts UUIDs', () => {
    expect(tripIdSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
  });

  it('accepts short alphanumeric IDs', () => {
    expect(tripIdSchema.safeParse('demo-trip-1').success).toBe(true);
    expect(tripIdSchema.safeParse('abc123').success).toBe(true);
  });

  it('rejects empty strings', () => {
    expect(tripIdSchema.safeParse('').success).toBe(false);
  });

  it('rejects special characters', () => {
    expect(tripIdSchema.safeParse('trip<script>alert(1)</script>').success).toBe(false);
  });
});

describe('API Validation - Sanitized Text', () => {
  it('strips HTML tags', () => {
    const result = sanitizedTextSchema.safeParse('<script>alert("xss")</script>Hello');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toContain('<script>');
      expect(result.data).toContain('Hello');
    }
  });

  it('strips javascript: protocol', () => {
    const result = sanitizedTextSchema.safeParse('javascript:alert(1)');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toContain('javascript:');
    }
  });

  it('enforces max length', () => {
    const result = sanitizedTextSchema.safeParse('x'.repeat(20000));
    expect(result.success).toBe(false);
  });
});

describe('API Validation - Email', () => {
  it('accepts valid emails', () => {
    expect(emailSchema.safeParse('user@example.com').success).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
    expect(emailSchema.safeParse('').success).toBe(false);
  });
});

describe('API Validation - URL', () => {
  it('accepts https URLs', () => {
    expect(urlSchema.safeParse('https://chravel.app').success).toBe(true);
  });

  it('rejects javascript: URLs', () => {
    expect(urlSchema.safeParse('javascript:alert(1)').success).toBe(false);
  });

  it('rejects data: URLs', () => {
    expect(urlSchema.safeParse('data:text/html,<h1>hi</h1>').success).toBe(false);
  });
});

describe('API Validation - Coordinates', () => {
  it('accepts valid coordinates', () => {
    expect(coordinateSchema.safeParse({ lat: 34.0522, lng: -118.2437 }).success).toBe(true);
  });

  it('rejects out-of-range lat', () => {
    expect(coordinateSchema.safeParse({ lat: 91, lng: 0 }).success).toBe(false);
    expect(coordinateSchema.safeParse({ lat: -91, lng: 0 }).success).toBe(false);
  });

  it('rejects out-of-range lng', () => {
    expect(coordinateSchema.safeParse({ lat: 0, lng: 181 }).success).toBe(false);
  });
});

describe('API Validation - Concierge Message', () => {
  it('accepts valid messages', () => {
    const result = conciergeMessageSchema.safeParse({
      message: 'Find restaurants near the hotel',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty messages', () => {
    const result = conciergeMessageSchema.safeParse({ message: '' });
    expect(result.success).toBe(false);
  });

  it('rejects oversized messages', () => {
    const result = conciergeMessageSchema.safeParse({ message: 'x'.repeat(5000) });
    expect(result.success).toBe(false);
  });
});

describe('API Validation - Chat Message', () => {
  it('accepts valid chat messages', () => {
    const result = chatMessageSchema.safeParse({
      content: 'Hello everyone!',
      channel_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid channel ID', () => {
    const result = chatMessageSchema.safeParse({
      content: 'Hello',
      channel_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('limits attachment count', () => {
    const result = chatMessageSchema.safeParse({
      content: 'Hello',
      channel_id: '550e8400-e29b-41d4-a716-446655440000',
      attachments: Array.from({ length: 15 }, () => ({
        type: 'image',
        url: 'https://example.com/img.jpg',
      })),
    });
    expect(result.success).toBe(false);
  });
});

describe('API Validation - validateInput helper', () => {
  it('returns success with data for valid input', () => {
    const result = validateInput(uuidSchema, '550e8400-e29b-41d4-a716-446655440000');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('550e8400-e29b-41d4-a716-446655440000');
    }
  });

  it('returns error details for invalid input', () => {
    const result = validateInput(uuidSchema, 'bad-id');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
      expect(result.details.length).toBeGreaterThan(0);
    }
  });
});
