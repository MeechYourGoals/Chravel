/**
 * Account Deletion Executor — Cron Edge Function
 *
 * Processes accounts whose 30-day grace period has expired.
 * Triggered daily via Supabase Cron or external scheduler.
 *
 * Deletion order (respects foreign key constraints):
 * 1. Remove user from trips, organizations, channels
 * 2. Anonymize chat messages (keep content with snapshotted sender_display_name, null out user_id)
 * 3. Delete user-owned data (tasks, polls, events, payments, files, etc.)
 * 4. Delete storage media (avatars, uploads, exports)
 * 5. Delete private_profiles (cascades from profiles)
 * 6. Delete profiles row
 * 7. Delete auth.users entry (invalidates all sessions)
 * 8. Audit log the deletion
 */

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { verifyCronAuth } from '../_shared/cronGuard.ts';
import { logError } from '../_shared/errorHandling.ts';

interface DeletionResult {
  userId: string;
  success: boolean;
  tablesProcessed: string[];
  storageCleanedUp: string[];
  errors: string[];
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-ACCOUNT-DELETIONS] ${step}${detailsStr}`);
};

/**
 * Tables where user data should be fully deleted.
 * Order matters — delete dependent rows before parent rows.
 */
const TABLES_TO_DELETE = [
  // Notifications & device tokens
  { table: 'push_device_tokens', userColumn: 'user_id' },
  { table: 'notifications', userColumn: 'user_id' },
  { table: 'notification_preferences', userColumn: 'user_id' },

  // AI & recommendations
  { table: 'ai_queries', userColumn: 'user_id' },
  { table: 'saved_recommendations', userColumn: 'user_id' },
  { table: 'concierge_usage', userColumn: 'user_id' },

  // Events (dependent rows first)
  { table: 'event_qa_upvotes', userColumn: 'user_id' },
  { table: 'event_qa_questions', userColumn: 'user_id' },
  { table: 'event_rsvps', userColumn: 'user_id' },

  // Tasks
  { table: 'task_assignments', userColumn: 'user_id' },

  // Payments & receipts
  { table: 'payment_splits', userColumn: 'payer_id' },
  { table: 'receipts', userColumn: 'user_id' },

  // Messages & channels (read receipts first)
  { table: 'message_read_receipts', userColumn: 'user_id' },
  { table: 'broadcast_reactions', userColumn: 'user_id' },
  { table: 'channel_members', userColumn: 'user_id' },

  // Trip memberships & preferences
  { table: 'trip_member_preferences', userColumn: 'user_id' },
  { table: 'trip_personal_basecamps', userColumn: 'user_id' },
  { table: 'trip_join_requests', userColumn: 'user_id' },
  { table: 'trip_admins', userColumn: 'user_id' },
  { table: 'trip_members', userColumn: 'user_id' },

  // Travel wallet
  { table: 'loyalty_airlines', userColumn: 'user_id' },
  { table: 'loyalty_hotels', userColumn: 'user_id' },
  { table: 'loyalty_rentals', userColumn: 'user_id' },
  { table: 'user_payment_methods', userColumn: 'user_id' },
  { table: 'user_accommodations', userColumn: 'user_id' },

  // Organization memberships
  { table: 'organization_members', userColumn: 'user_id' },

  // Roles & entitlements
  { table: 'user_trip_roles', userColumn: 'user_id' },
  { table: 'user_roles', userColumn: 'user_id' },
  { table: 'user_entitlements', userColumn: 'user_id' },
  { table: 'user_preferences', userColumn: 'user_id' },

  // Advertiser (if applicable)
  { table: 'advertisers', userColumn: 'user_id' },
] as const;

/**
 * Tables where messages should be anonymized rather than deleted.
 * Keeps content + sender_display_name snapshot, nullifies user_id.
 */
const TABLES_TO_ANONYMIZE = [
  { table: 'trip_chat_messages', userColumn: 'user_id', displayNameColumn: 'sender_display_name' },
  { table: 'channel_messages', userColumn: 'sender_id', displayNameColumn: null },
] as const;

/**
 * Tables where the user is the creator — reassign or mark as orphaned.
 * We don't delete trips/events/polls outright to avoid data loss for other members.
 */
const TABLES_TO_ORPHAN = [
  { table: 'trips', userColumn: 'created_by' },
  { table: 'trip_events', userColumn: 'created_by' },
  { table: 'trip_polls', userColumn: 'created_by' },
  { table: 'trip_tasks', userColumn: 'created_by' },
  { table: 'broadcasts', userColumn: 'created_by' },
  { table: 'trip_receipts', userColumn: 'uploaded_by' },
  { table: 'trip_files', userColumn: 'uploaded_by' },
  { table: 'trip_links', userColumn: 'created_by' },
  { table: 'trip_payment_messages', userColumn: 'payer_id' },
  { table: 'trip_invites', userColumn: 'invited_by' },
  { table: 'event_agenda_items', userColumn: 'created_by' },
  { table: 'event_tasks', userColumn: 'created_by' },
  { table: 'organizations', userColumn: 'created_by' },
] as const;

/** Storage buckets that may contain user files */
const STORAGE_BUCKETS = [
  'avatars',
  'trip-media',
  'trip-files',
  'trip-photos',
  'trip-images',
  'chat-media',
  'user-data-exports',
] as const;

/**
 * Delete all files in a storage bucket for a specific user folder.
 * Avatar bucket uses user_id as folder name.
 */
async function cleanupStorageBucket(
  supabase: any, // intentional: bypass deep SupabaseClient generic inference (TS2345)
  bucket: string,
  userId: string,
): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;

  try {
    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list(userId, { limit: 1000 });

    if (listError) {
      // Bucket may not exist or folder may be empty — not an error
      if (!listError.message.includes('not found')) {
        errors.push(`${bucket}: list error - ${listError.message}`);
      }
      return { deleted, errors };
    }

    if (!files || files.length === 0) {
      return { deleted, errors };
    }

    const filePaths = files.map(f => `${userId}/${f.name}`);
    const { error: removeError } = await supabase.storage.from(bucket).remove(filePaths);

    if (removeError) {
      errors.push(`${bucket}: remove error - ${removeError.message}`);
    } else {
      deleted = filePaths.length;
    }
  } catch (err) {
    errors.push(`${bucket}: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { deleted, errors };
}

/**
 * Process a single account deletion.
 */
async function processAccountDeletion(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  profileId: string,
): Promise<DeletionResult> {
  const result: DeletionResult = {
    userId,
    success: false,
    tablesProcessed: [],
    storageCleanedUp: [],
    errors: [],
  };

  // Step 1: Anonymize chat messages — keep content, null out user reference
  for (const { table, userColumn, displayNameColumn } of TABLES_TO_ANONYMIZE) {
    try {
      const updatePayload: Record<string, unknown> = { [userColumn]: null };

      // For trip_chat_messages, ensure sender_display_name is preserved as "Deleted User"
      // if it wasn't already snapshotted
      if (displayNameColumn) {
        // First, update any null display names to "Deleted User"
        await supabase
          .from(table)
          .update({ [displayNameColumn]: 'Deleted User' })
          .eq(userColumn, userId)
          .is(displayNameColumn, null);
      }

      // Then null out the user_id
      const { error } = await supabase.from(table).update(updatePayload).eq(userColumn, userId);

      if (error) {
        result.errors.push(`anonymize ${table}: ${error.message}`);
      } else {
        result.tablesProcessed.push(`${table} (anonymized)`);
      }
    } catch (err) {
      result.errors.push(`anonymize ${table}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Step 2: Orphan user-created content — set creator to null so other members keep access
  for (const { table, userColumn } of TABLES_TO_ORPHAN) {
    try {
      const { error } = await supabase
        .from(table)
        .update({ [userColumn]: null })
        .eq(userColumn, userId);

      if (error) {
        // Column might not be nullable — skip gracefully
        if (!error.message.includes('not-null') && !error.message.includes('violates')) {
          result.errors.push(`orphan ${table}: ${error.message}`);
        }
      } else {
        result.tablesProcessed.push(`${table} (orphaned)`);
      }
    } catch (err) {
      result.errors.push(`orphan ${table}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Step 3: Delete user data from all owned tables
  for (const { table, userColumn } of TABLES_TO_DELETE) {
    try {
      const { error } = await supabase.from(table).delete().eq(userColumn, userId);

      if (error) {
        // Table might not exist in this environment — skip gracefully
        if (!error.message.includes('relation') && !error.message.includes('does not exist')) {
          result.errors.push(`delete ${table}: ${error.message}`);
        }
      } else {
        result.tablesProcessed.push(`${table} (deleted)`);
      }
    } catch (err) {
      result.errors.push(`delete ${table}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Step 4: Clean up storage buckets
  for (const bucket of STORAGE_BUCKETS) {
    const { deleted, errors } = await cleanupStorageBucket(supabase, bucket, userId);
    if (deleted > 0) {
      result.storageCleanedUp.push(`${bucket}: ${deleted} files`);
    }
    result.errors.push(...errors);
  }

  // Step 5: Delete private_profiles (cascades from profiles via FK, but explicit for safety)
  try {
    const { error } = await supabase.from('private_profiles').delete().eq('id', profileId);

    if (error) {
      result.errors.push(`delete private_profiles: ${error.message}`);
    } else {
      result.tablesProcessed.push('private_profiles (deleted)');
    }
  } catch (err) {
    result.errors.push(
      `delete private_profiles: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Step 6: Delete profiles row
  try {
    const { error } = await supabase.from('profiles').delete().eq('user_id', userId);

    if (error) {
      result.errors.push(`delete profiles: ${error.message}`);
      // Profile deletion failure is critical — don't proceed to auth deletion
      return result;
    }
    result.tablesProcessed.push('profiles (deleted)');
  } catch (err) {
    result.errors.push(`delete profiles: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  // Step 7: Delete auth.users entry — this invalidates ALL sessions (C3)
  try {
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      result.errors.push(`delete auth.users: ${error.message}`);
      return result;
    }
    result.tablesProcessed.push('auth.users (deleted + all sessions invalidated)');
  } catch (err) {
    result.errors.push(`delete auth.users: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  // Step 8: Audit log
  try {
    await supabase.from('security_audit_log').insert({
      event_type: 'account_deletion_executed',
      user_id: userId,
      details: {
        profile_id: profileId,
        tables_processed: result.tablesProcessed,
        storage_cleaned_up: result.storageCleanedUp,
        errors: result.errors,
        executed_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    // Audit log failure is non-critical — log but don't fail the deletion
    logError('AUDIT_LOG', err, { userId });
  }

  result.success = true;
  return result;
}

serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify cron/service caller authentication
    const guard = verifyCronAuth(req, corsHeaders);
    if (!guard.authorized) return guard.response!;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Find accounts past their grace period
    const { data: pendingDeletions, error: queryError } = await supabase
      .from('profiles')
      .select('id, user_id, display_name, deletion_requested_at, deletion_scheduled_for')
      .not('deletion_scheduled_for', 'is', null)
      .lte('deletion_scheduled_for', new Date().toISOString());

    if (queryError) {
      logStep('Failed to query pending deletions', { error: queryError.message });
      return new Response(JSON.stringify({ error: 'Failed to query pending deletions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!pendingDeletions || pendingDeletions.length === 0) {
      logStep('No accounts pending deletion');
      return new Response(
        JSON.stringify({ success: true, message: 'No accounts pending deletion', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    logStep('Processing account deletions', { count: pendingDeletions.length });

    const results: DeletionResult[] = [];

    // Process each deletion sequentially to avoid overwhelming the database
    for (const profile of pendingDeletions) {
      logStep('Processing deletion', {
        userId: profile.user_id,
        scheduledFor: profile.deletion_scheduled_for,
      });

      const result = await processAccountDeletion(supabase, profile.user_id, profile.id);
      results.push(result);

      logStep('Deletion result', {
        userId: profile.user_id,
        success: result.success,
        tablesProcessed: result.tablesProcessed.length,
        errors: result.errors.length,
      });
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    logStep('Batch complete', { total: results.length, successful, failed });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} account deletion(s)`,
        processed: results.length,
        successful,
        failed,
        results: results.map(r => ({
          userId: r.userId,
          success: r.success,
          tablesProcessed: r.tablesProcessed.length,
          storageCleanedUp: r.storageCleanedUp.length,
          errorCount: r.errors.length,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    logError('PROCESS_ACCOUNT_DELETIONS', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error during deletion processing' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
