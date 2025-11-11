import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ============= COMMON VALIDATION HELPERS =============

/**
 * Validates that a URL is HTTPS and external (not internal/private network)
 * Prevents SSRF attacks by blocking:
 * - Internal IPs (127.0.0.1, 10.x.x.x, 192.168.x.x, etc.)
 * - HTTP (only HTTPS allowed)
 * - localhost, *.local domains
 */
export function validateExternalHttpsUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Must be HTTPS
    if (urlObj.protocol !== 'https:') {
      return false;
    }
    
    // Block localhost and .local domains
    const hostname = urlObj.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.local')) {
      return false;
    }
    
    // Block private/internal IP ranges
    const ipPatterns = [
      /^127\./,           // 127.0.0.0/8
      /^10\./,            // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
      /^192\.168\./,      // 192.168.0.0/16
      /^169\.254\./,      // 169.254.0.0/16 (link-local)
      /^::1$/,            // IPv6 localhost
      /^fc00:/,           // IPv6 private
      /^fe80:/            // IPv6 link-local
    ];
    
    // Check if hostname is an IP address
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(':')) {
      for (const pattern of ipPatterns) {
        if (pattern.test(hostname)) {
          return false;
        }
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Zod refinement for external HTTPS URLs
 */
export const externalHttpsUrlSchema = z.string().url().refine(
  (url) => validateExternalHttpsUrl(url),
  { message: "URL must be HTTPS and external (no internal/private networks)" }
);

/**
 * Allowed file types for uploads
 */
export const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/plain',
    'text/csv'
  ],
  media: ['video/mp4', 'video/quicktime', 'audio/mpeg', 'audio/wav']
};

/**
 * Blocked file extensions (executables, scripts, etc.)
 */
export const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.sh', '.bash', '.zsh', '.ps1', '.app', '.deb', '.rpm', '.msi', '.dmg',
  '.bin', '.run', '.dll', '.so', '.dylib'
];

/**
 * Validates file type against allowed types
 */
export function isValidFileType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(mimeType);
}

/**
 * Validates file extension is not blocked
 */
export function isBlockedExtension(filename: string): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return BLOCKED_EXTENSIONS.includes(ext);
}

// ============= FILE UPLOAD SCHEMAS =============

export const FileUploadSchema = z.object({
  tripId: z.string()
    .min(1, "Trip ID is required")
    .max(50, "Trip ID too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Trip ID contains invalid characters"),
  userId: z.string().uuid("Invalid user ID format"),
  file: z.custom<File>((val) => val instanceof File, {
    message: "File is required"
  })
}).refine(
  (data) => {
    if (data.file instanceof File) {
      // Check file size (50MB max)
      if (data.file.size > 50 * 1024 * 1024) {
        return false;
      }
      // Check file extension
      if (isBlockedExtension(data.file.name)) {
        return false;
      }
      // Check MIME type
      const allowedTypes = [
        ...ALLOWED_FILE_TYPES.images,
        ...ALLOWED_FILE_TYPES.documents,
        ...ALLOWED_FILE_TYPES.media
      ];
      return isValidFileType(data.file.type, allowedTypes);
    }
    return true;
  },
  {
    message: "File type not allowed or file too large (max 50MB). Blocked: executables, scripts, and unsafe file types."
  }
);

export const ImageUploadSchema = z.object({
  file: z.custom<File>((val) => val instanceof File, {
    message: "File is required"
  }),
  folder: z.string().max(100).optional().default('ad-images')
}).refine(
  (data) => {
    if (data.file instanceof File) {
      // Check file size (5MB max for images)
      if (data.file.size > 5 * 1024 * 1024) {
        return false;
      }
      // Check file extension
      if (isBlockedExtension(data.file.name)) {
        return false;
      }
      // Only images allowed
      return isValidFileType(data.file.type, ALLOWED_FILE_TYPES.images);
    }
    return true;
  },
  {
    message: "Only JPEG, PNG, and WebP images are allowed (max 5MB). Executables and scripts are blocked."
  }
);

// ============= DOCUMENT PROCESSOR SCHEMA =============

export const DocumentProcessorSchema = z.object({
  fileId: z.string().uuid("Invalid file ID format"),
  tripId: z.string().uuid("Invalid trip ID format"),
  forceReprocess: z.boolean().optional().default(false)
});

// ============= URL FETCHING SCHEMAS (SSRF Protection) =============

export const FetchOGMetadataSchema = z.object({
  url: externalHttpsUrlSchema.max(2000, "URL too long")
});

export const ReceiptOCRSchema = z.object({
  receiptId: z.string().uuid("Invalid receipt ID format"),
  imageUrl: externalHttpsUrlSchema.optional(),
  imageBase64: z.string().optional(),
  provider: z.enum(['google-vision', 'aws-textract', 'tesseract']).optional()
}).refine(
  (data) => data.imageUrl || data.imageBase64,
  { message: "Either imageUrl or imageBase64 is required" }
);

// ============= TRIP MEMBERSHIP VERIFICATION =============

/**
 * Verifies user is a member of the trip
 * Returns { isMember: boolean, error?: string }
 */
export async function verifyTripMembership(
  supabase: any,
  userId: string,
  tripId: string
): Promise<{ isMember: boolean; error?: string }> {
  try {
    const { data: membership, error } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return { isMember: false, error: `Database error: ${error.message}` };
    }

    if (!membership) {
      return { isMember: false, error: 'User is not a member of this trip' };
    }

    return { isMember: true };
  } catch (error) {
    return { isMember: false, error: `Verification failed: ${error.message}` };
  }
}

// ============= EXISTING SCHEMAS (preserved) =============

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
  url: externalHttpsUrlSchema.max(2000).optional(),
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
  cover_image_url: externalHttpsUrlSchema.max(500).optional()
});

// ============= GENERIC VALIDATION HELPER =============

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

// ============= INPUT SANITIZATION HELPERS =============

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
