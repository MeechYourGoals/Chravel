import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Organization invite validation schemas
export const InviteOrganizationMemberSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID format"),
  email: z.string().email("Invalid email address").max(255, "Email too long"),
  role: z.enum(['admin', 'member'], {
    errorMap: () => ({ message: "Role must be either 'admin' or 'member'" })
  })
});

export const AcceptInviteSchema = z.object({
  token: z.string().uuid("Invalid token format")
});

export const LinkTripToOrgSchema = z.object({
  tripId: z.string()
    .min(1, "Trip ID is required")
    .max(50, "Trip ID too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Trip ID contains invalid characters"),
  organizationId: z.string().uuid("Invalid organization ID format")
});

// AI Features validation schemas
export const AIFeaturesSchema = z.object({
  feature: z.enum(['review-analysis', 'message-template', 'priority-classify', 'send-time-suggest'], {
    errorMap: () => ({ message: "Invalid feature type" })
  }),
  url: z.string().url().max(2000).optional(),
  venue_name: z.string().max(200).optional(),
  place_id: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  content: z.string().max(5000).optional(),
  template_id: z.string().uuid().optional(),
  context: z.record(z.any()).optional(),
  userId: z.string().uuid().optional(),
  tripId: z.string().max(50).optional()
});

// AI Answer validation schema
export const AIAnswerSchema = z.object({
  query: z.string().min(1, "Query is required").max(1000, "Query too long"),
  tripId: z.string()
    .min(1, "Trip ID is required")
    .max(50, "Trip ID too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Trip ID contains invalid characters"),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })).optional()
});

// Broadcast creation validation schema
export const BroadcastCreateSchema = z.object({
  trip_id: z.string()
    .min(1, "Trip ID is required")
    .max(50, "Trip ID too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Trip ID contains invalid characters"),
  content: z.string().min(1, "Content is required").max(5000, "Content too long"),
  location: z.string().max(500).optional(),
  tag: z.enum(['urgent', 'important', 'chill', 'fyi']).optional(),
  scheduled_time: z.string().datetime().optional()
});

// Trip creation validation schema
export const CreateTripSchema = z.object({
  name: z.string().min(1, "Trip name is required").max(200, "Trip name too long"),
  description: z.string().max(2000).optional(),
  destination: z.string().max(200).optional(),
  start_date: z.string().datetime({ message: "Invalid date format. Use ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)" }).optional(),
  end_date: z.string().datetime({ message: "Invalid date format. Use ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)" }).optional(),
  trip_type: z.enum(['consumer', 'pro', 'event']).optional(),
  cover_image_url: z.string().url().max(500).optional()
});

// Generic validation helper
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`
      };
    }
    return { success: false, error: 'Invalid input data' };
  }
}

// Input sanitization helpers
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, maxLength);
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().substring(0, 255);
}
