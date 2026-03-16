/**
 * cleanup-staging-tables — Scheduled maintenance job
 *
 * Deletes old rows from staging tables that accumulate PII and waste storage:
 *   - smart_import_candidates: accepted/rejected older than 90 days
 *   - shared_inbound_items:    completed/failed  older than 30 days
 *   - webhook_events:                            older than 30 days
 *
 * Deploy as a Supabase scheduled Edge Function (weekly is sufficient).
 * Requires SUPABASE_SERVICE_ROLE_KEY — no user auth needed.
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Optional: a shared secret the cron invoker sets so random callers can't trigger cleanup
const CLEANUP_SECRET = Deno.env.get('CLEANUP_SECRET');

serve(async req => {
  // Only POST allowed
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Secret check (optional but recommended)
  if (CLEANUP_SECRET) {
    const incoming = req.headers.get('x-cleanup-secret');
    if (incoming !== CLEANUP_SECRET) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date().toISOString();
  const results: Record<string, number | string> = { ran_at: now };

  // ── smart_import_candidates: accepted/rejected older than 90 days ─────────
  try {
    const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from('smart_import_candidates')
      .delete({ count: 'exact' })
      .in('status', ['accepted', 'rejected'])
      .lt('updated_at', cutoff90);

    if (error) throw error;
    results.smart_import_candidates_deleted = count ?? 0;
    console.log(`[cleanup] smart_import_candidates: deleted ${count ?? 0} rows older than 90d`);
  } catch (err) {
    console.error('[cleanup] smart_import_candidates error:', err);
    results.smart_import_candidates_error = err instanceof Error ? err.message : String(err);
  }

  // ── shared_inbound_items: completed/failed older than 30 days ────────────
  try {
    const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from('shared_inbound_items')
      .delete({ count: 'exact' })
      .in('ingestion_status', ['completed', 'failed'])
      .lt('updated_at', cutoff30);

    if (error) throw error;
    results.shared_inbound_items_deleted = count ?? 0;
    console.log(`[cleanup] shared_inbound_items: deleted ${count ?? 0} rows older than 30d`);
  } catch (err) {
    console.error('[cleanup] shared_inbound_items error:', err);
    results.shared_inbound_items_error = err instanceof Error ? err.message : String(err);
  }

  // ── webhook_events: older than 30 days ───────────────────────────────────
  try {
    const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from('webhook_events')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff30);

    if (error) throw error;
    results.webhook_events_deleted = count ?? 0;
    console.log(`[cleanup] webhook_events: deleted ${count ?? 0} rows older than 30d`);
  } catch (err) {
    console.error('[cleanup] webhook_events error:', err);
    results.webhook_events_error = err instanceof Error ? err.message : String(err);
  }

  console.log('[cleanup] Done:', results);
  return new Response(JSON.stringify({ success: true, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
