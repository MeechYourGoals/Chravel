/**
 * Runtime API Validation Layer (Zod-based)
 *
 * Validates all data at system boundaries:
 *  - Edge function request/response payloads
 *  - Supabase query parameters
 *  - User input from forms
 *  - URL parameters
 *
 * Zero UX impact for legitimate users — malformed requests fail fast
 * with clear error messages instead of causing downstream bugs.
 */

import { z } from 'zod';

// ============================================================
// Common Validators
// ============================================================

/** UUID v4 format — standard for Supabase primary keys */
export const uuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid UUID format');

/** Short alphanumeric ID — for demo/legacy trip IDs */
export const shortIdSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format');

/** Trip ID — accepts UUID or short alphanumeric */
export const tripIdSchema = z.string().refine(
  val => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const shortRegex = /^[a-zA-Z0-9_-]+$/;
    return val.length > 0 && val.length <= 50 && (uuidRegex.test(val) || shortRegex.test(val));
  },
  { message: 'Invalid trip ID format' },
);

/** Sanitized text — strips dangerous characters */
export const sanitizedTextSchema = z
  .string()
  .max(10000)
  .transform(val =>
    val
      .replace(/[<>]/g, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim(),
  );

/** Email */
export const emailSchema = z.string().email().max(255).toLowerCase();

/** URL — http/https only */
export const urlSchema = z
  .string()
  .url()
  .refine(
    val => {
      try {
        const url = new URL(val);
        return ['http:', 'https:'].includes(url.protocol);
      } catch {
        return false;
      }
    },
    { message: 'Only http and https URLs are allowed' },
  );

/** Coordinate */
export const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// ============================================================
// Concierge / AI Validation
// ============================================================

/** Concierge message input */
export const conciergeMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(4000, 'Message too long (max 4000 chars)'),
  tripId: tripIdSchema.optional(),
  context: z
    .object({
      tripName: z.string().max(200).optional(),
      location: z.string().max(500).optional(),
      dates: z
        .object({
          start: z.string().optional(),
          end: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  stream: z.boolean().optional(),
});

/** Concierge tool call validation — ensures AI only calls allowed tools */
export const conciergeToolCallSchema = z.object({
  name: z.enum([
    'search_places',
    'get_weather',
    'get_trip_details',
    'create_reservation_draft',
    'get_calendar_events',
    'search_flights',
    'search_hotels',
    'parse_schedule',
    'get_trip_members',
  ]),
  arguments: z.record(z.unknown()),
});

// ============================================================
// Trip Validation
// ============================================================

export const createTripSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).optional(),
  location: z.string().max(500).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  visibility: z.enum(['private', 'invite_only', 'public']).default('invite_only'),
});

export const updateTripSchema = createTripSchema.partial().extend({
  id: tripIdSchema,
});

// ============================================================
// Chat Validation
// ============================================================

export const chatMessageSchema = z.object({
  content: z.string().min(1).max(5000).trim(),
  channel_id: uuidSchema,
  reply_to: uuidSchema.optional(),
  attachments: z
    .array(
      z.object({
        type: z.enum(['image', 'file', 'link']),
        url: urlSchema,
        name: z.string().max(255).optional(),
      }),
    )
    .max(10)
    .optional(),
});

// ============================================================
// Payment Validation
// ============================================================

export const paymentRequestSchema = z.object({
  amount: z.number().positive().max(100000),
  currency: z.string().length(3).toUpperCase().default('USD'),
  description: z.string().max(500).optional(),
  tripId: tripIdSchema,
});

// ============================================================
// Validation Helper
// ============================================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details: z.ZodIssue[] };

/**
 * Validate data against a Zod schema with user-friendly error messages.
 * Returns a discriminated union so callers can handle errors explicitly.
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Build a human-readable error message
  const messages = result.error.issues.map(issue => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });

  return {
    success: false,
    error: messages.join('; '),
    details: result.error.issues,
  };
}
