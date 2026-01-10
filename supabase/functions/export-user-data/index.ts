/**
 * GDPR Data Export Edge Function
 *
 * Exports all user data in a portable JSON format.
 * Generates a signed URL for secure download.
 *
 * Rate limited to 1 export per user per day.
 */

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders } from '../_shared/cors.ts';

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EXPORT-USER-DATA] ${step}${detailsStr}`);
};

// Tables and their user ID columns for GDPR export
// Add new tables here to include them in exports
const USER_DATA_TABLES = [
  // Profile & Settings
  { table: 'profiles', userColumn: 'user_id', description: 'User profile information' },
  { table: 'user_preferences', userColumn: 'user_id', description: 'App preferences and settings' },
  {
    table: 'notification_preferences',
    userColumn: 'user_id',
    description: 'Notification settings',
  },
  {
    table: 'push_device_tokens',
    userColumn: 'user_id',
    description: 'Registered devices for push notifications',
  },

  // Travel Wallet
  { table: 'loyalty_airlines', userColumn: 'user_id', description: 'Airline loyalty programs' },
  { table: 'loyalty_hotels', userColumn: 'user_id', description: 'Hotel loyalty programs' },
  { table: 'loyalty_rentals', userColumn: 'user_id', description: 'Rental car loyalty programs' },
  {
    table: 'user_payment_methods',
    userColumn: 'user_id',
    description: 'Saved payment methods (redacted)',
  },
  { table: 'user_accommodations', userColumn: 'user_id', description: 'Accommodation preferences' },

  // Trips & Memberships
  { table: 'trips', userColumn: 'created_by', description: 'Trips you created' },
  { table: 'trip_members', userColumn: 'user_id', description: 'Trip memberships' },
  { table: 'trip_admins', userColumn: 'user_id', description: 'Trips where you are an admin' },
  { table: 'trip_invites', userColumn: 'invited_by', description: 'Trip invitations you sent' },
  {
    table: 'trip_join_requests',
    userColumn: 'user_id',
    description: 'Trip join requests you made',
  },
  {
    table: 'trip_personal_basecamps',
    userColumn: 'user_id',
    description: 'Personal basecamp locations',
  },
  { table: 'trip_member_preferences', userColumn: 'user_id', description: 'Per-trip preferences' },

  // Messages & Communications
  { table: 'trip_chat_messages', userColumn: 'user_id', description: 'Chat messages you sent' },
  { table: 'channel_messages', userColumn: 'sender_id', description: 'Channel messages you sent' },
  { table: 'channel_members', userColumn: 'user_id', description: 'Channel memberships' },
  { table: 'message_read_receipts', userColumn: 'user_id', description: 'Message read receipts' },
  { table: 'broadcasts', userColumn: 'created_by', description: 'Broadcasts you created' },
  {
    table: 'broadcast_reactions',
    userColumn: 'user_id',
    description: 'Your reactions to broadcasts',
  },

  // Tasks & Polls
  { table: 'trip_tasks', userColumn: 'created_by', description: 'Tasks you created' },
  { table: 'task_assignments', userColumn: 'user_id', description: 'Tasks assigned to you' },
  { table: 'task_status', userColumn: 'updated_by', description: 'Task status changes you made' },
  { table: 'trip_polls', userColumn: 'created_by', description: 'Polls you created' },

  // Events & RSVPs
  { table: 'trip_events', userColumn: 'created_by', description: 'Events you created' },
  { table: 'event_rsvps', userColumn: 'user_id', description: 'Your event RSVPs' },
  {
    table: 'event_qa_questions',
    userColumn: 'user_id',
    description: 'Questions you asked at events',
  },
  { table: 'event_qa_upvotes', userColumn: 'user_id', description: 'Your upvotes on Q&A' },
  {
    table: 'event_agenda_items',
    userColumn: 'created_by',
    description: 'Agenda items you created',
  },
  { table: 'event_tasks', userColumn: 'created_by', description: 'Event tasks you created' },

  // Payments & Receipts
  { table: 'trip_payment_messages', userColumn: 'payer_id', description: 'Payments you made' },
  { table: 'payment_splits', userColumn: 'payer_id', description: 'Payment splits involving you' },
  { table: 'trip_receipts', userColumn: 'uploaded_by', description: 'Receipts you uploaded' },
  { table: 'receipts', userColumn: 'user_id', description: 'Your receipt records' },

  // Media & Files
  { table: 'trip_files', userColumn: 'uploaded_by', description: 'Files you uploaded' },
  { table: 'trip_links', userColumn: 'created_by', description: 'Links you shared' },

  // Organizations
  { table: 'organization_members', userColumn: 'user_id', description: 'Organization memberships' },
  { table: 'organizations', userColumn: 'created_by', description: 'Organizations you created' },

  // AI & Recommendations
  { table: 'ai_queries', userColumn: 'user_id', description: 'AI concierge queries' },
  {
    table: 'saved_recommendations',
    userColumn: 'user_id',
    description: 'Saved place recommendations',
  },
  { table: 'concierge_usage', userColumn: 'user_id', description: 'AI concierge usage stats' },

  // Notifications
  { table: 'notifications', userColumn: 'user_id', description: 'Your notifications' },

  // Roles & Permissions
  { table: 'user_roles', userColumn: 'user_id', description: 'Your system roles' },
  { table: 'user_trip_roles', userColumn: 'user_id', description: 'Your trip-specific roles' },

  // Entitlements & Subscriptions
  {
    table: 'user_entitlements',
    userColumn: 'user_id',
    description: 'Your subscription entitlements',
  },

  // Advertiser (if applicable)
  { table: 'advertisers', userColumn: 'user_id', description: 'Advertiser account (if any)' },
] as const;

// Fields to redact for security
const REDACTED_FIELDS = [
  'password',
  'password_hash',
  'secret',
  'token',
  'api_key',
  'private_key',
  'card_number',
  'cvv',
  'security_code',
  'account_number',
  'routing_number',
];

// Storage bucket for exports
const EXPORT_BUCKET = 'user-data-exports';

// How long the signed URL is valid (in seconds)
const SIGNED_URL_EXPIRY = 3600; // 1 hour

// Rate limit: 1 export per day
const RATE_LIMIT_WINDOW_SECONDS = 86400; // 24 hours
const RATE_LIMIT_MAX_REQUESTS = 1;

/**
 * Redact sensitive fields from a record
 */
function redactSensitiveData(record: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...record };
  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();
    if (REDACTED_FIELDS.some(field => lowerKey.includes(field))) {
      redacted[key] = '[REDACTED]';
    }
  }
  return redacted;
}

/**
 * Fetch data from a table for a specific user with pagination
 */
async function fetchTableData(
  supabaseClient: ReturnType<typeof createClient>,
  tableName: string,
  userColumn: string,
  userId: string,
  pageSize = 1000,
): Promise<Record<string, unknown>[]> {
  const allRecords: Record<string, unknown>[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabaseClient
      .from(tableName)
      .select('*')
      .eq(userColumn, userId)
      .range(offset, offset + pageSize - 1);

    if (error) {
      // Table might not exist or user might not have access - skip silently
      logStep(`Skipping table ${tableName}`, { error: error.message });
      break;
    }

    if (data && data.length > 0) {
      allRecords.push(...data.map(redactSensitiveData));
      offset += data.length;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allRecords;
}

/**
 * Generate signed URLs for user's media files
 */
async function getMediaSignedUrls(
  supabaseClient: ReturnType<typeof createClient>,
  tripFiles: Record<string, unknown>[],
): Promise<{ path: string; signedUrl: string | null; expiresAt: string }[]> {
  const mediaUrls: { path: string; signedUrl: string | null; expiresAt: string }[] = [];

  for (const file of tripFiles) {
    const storagePath = file.storage_path as string | undefined;
    if (storagePath) {
      try {
        const { data, error } = await supabaseClient.storage
          .from('trip-files')
          .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

        if (!error && data) {
          const expiresAt = new Date(Date.now() + SIGNED_URL_EXPIRY * 1000).toISOString();
          mediaUrls.push({
            path: storagePath,
            signedUrl: data.signedUrl,
            expiresAt,
          });
        } else {
          mediaUrls.push({
            path: storagePath,
            signedUrl: null,
            expiresAt: 'N/A - Could not generate URL',
          });
        }
      } catch {
        mediaUrls.push({
          path: storagePath,
          signedUrl: null,
          expiresAt: 'N/A - Error generating URL',
        });
      }
    }
  }

  return mediaUrls;
}

serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  // Get authorization header for authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    logStep('Unauthorized - missing auth header');
    return new Response(JSON.stringify({ error: 'Unauthorized - authentication required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Create client with user's JWT to get user ID
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  // Create service role client for storage operations
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    logStep('Export started', { method: req.method });

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      logStep('Authentication failed', { error: authError?.message });
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const userEmail = user.email;
    logStep('User authenticated', { userId, email: userEmail });

    // Rate limiting check
    const { data: rateData, error: rateError } = await serviceClient.rpc('increment_rate_limit', {
      rate_key: `gdpr_export:${userId}`,
      max_requests: RATE_LIMIT_MAX_REQUESTS,
      window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    });

    if (rateError) {
      logStep('Rate limit check failed', { error: rateError.message });
      // Fail open - allow if rate limit check fails
    } else if (rateData && rateData.length > 0 && !rateData[0].allowed) {
      logStep('Rate limited', { userId });
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'You can only export your data once per day. Please try again later.',
          retryAfter: RATE_LIMIT_WINDOW_SECONDS,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Build the export data structure
    const exportData: Record<string, unknown> = {
      _metadata: {
        exportTimestamp: new Date().toISOString(),
        userId,
        userEmail,
        schemaVersion: '1.0.0',
        appVersion: 'Chravel 2025',
        exportFormat: 'JSON',
        tablesIncluded: USER_DATA_TABLES.map(t => t.table),
        dataRetentionNote:
          'This export contains all personal data associated with your account as of the export timestamp.',
        legalBasis: 'GDPR Article 20 - Right to data portability',
      },
      _tableDescriptions: Object.fromEntries(USER_DATA_TABLES.map(t => [t.table, t.description])),
    };

    // Fetch data from each table
    logStep('Fetching user data from tables');
    let totalRecords = 0;

    for (const { table, userColumn } of USER_DATA_TABLES) {
      try {
        const data = await fetchTableData(userClient, table, userColumn, userId);
        if (data.length > 0) {
          exportData[table] = data;
          totalRecords += data.length;
          logStep(`Fetched ${table}`, { count: data.length });
        }
      } catch (error) {
        logStep(`Error fetching ${table}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with other tables
      }
    }

    logStep('Data collection complete', { totalRecords });

    // Generate signed URLs for media files
    const tripFiles = (exportData.trip_files as Record<string, unknown>[]) || [];
    if (tripFiles.length > 0) {
      logStep('Generating media signed URLs', { count: tripFiles.length });
      const mediaUrls = await getMediaSignedUrls(userClient, tripFiles);
      exportData._mediaFiles = {
        note: 'Signed URLs for your uploaded files. URLs expire in 1 hour.',
        files: mediaUrls,
      };
    }

    // Convert to JSON
    const jsonContent = JSON.stringify(exportData, null, 2);
    const jsonBytes = new TextEncoder().encode(jsonContent);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `chravel-data-export-${timestamp}.json`;
    const storagePath = `${userId}/${filename}`;

    // Upload to storage bucket
    logStep('Uploading export file', { storagePath, size: jsonBytes.length });

    const { error: uploadError } = await serviceClient.storage
      .from(EXPORT_BUCKET)
      .upload(storagePath, jsonBytes, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      logStep('Upload failed', { error: uploadError.message });

      // Fallback: return JSON directly if storage upload fails
      return new Response(jsonContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Generate signed URL for download
    const { data: signedUrlData, error: signedUrlError } = await serviceClient.storage
      .from(EXPORT_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    if (signedUrlError || !signedUrlData) {
      logStep('Signed URL generation failed', { error: signedUrlError?.message });

      // Fallback: return JSON directly
      return new Response(jsonContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    logStep('Export complete', {
      totalRecords,
      fileSize: jsonBytes.length,
      expiresIn: `${SIGNED_URL_EXPIRY / 60} minutes`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Your data export is ready for download.',
        downloadUrl: signedUrlData.signedUrl,
        expiresAt: new Date(Date.now() + SIGNED_URL_EXPIRY * 1000).toISOString(),
        expiresInMinutes: SIGNED_URL_EXPIRY / 60,
        filename,
        totalRecords,
        fileSizeBytes: jsonBytes.length,
        tablesExported: Object.keys(exportData).filter(k => !k.startsWith('_')).length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    logStep('ERROR', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Export failed',
        details: error instanceof Error ? error.stack : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
