#!/usr/bin/env node
/**
 * Post-Deploy Health Gate
 *
 * Polls the health endpoint after deployment until it reports healthy
 * or a timeout is reached. Use as a CI gate or manual verification step.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co npx tsx scripts/health-gate.ts
 *   SUPABASE_URL=https://xxx.supabase.co TIMEOUT=60 npx tsx scripts/health-gate.ts
 *
 * Exit codes:
 *   0 = health endpoint reports healthy
 *   1 = timeout reached or persistent failure
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const TIMEOUT_SECONDS = parseInt(process.env.TIMEOUT || '30', 10);
const POLL_INTERVAL_MS = 3_000;
const REQUEST_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function checkHealth(): Promise<{ healthy: boolean; status: string; responseTime: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(`${SUPABASE_URL}/functions/v1/health`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.status !== 200) {
      return { healthy: false, status: `HTTP ${res.status}`, responseTime: Date.now() - start };
    }

    const body = await res.json();
    return {
      healthy: body.status === 'healthy',
      status: body.status || 'unknown',
      responseTime: Date.now() - start,
    };
  } catch (err) {
    return {
      healthy: false,
      status: err instanceof Error ? err.message : String(err),
      responseTime: Date.now() - start,
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  console.log('\n  Post-Deploy Health Gate');
  console.log(''.padStart(60, '-'));

  if (!SUPABASE_URL) {
    console.log('  No SUPABASE_URL set. Set it to run the health gate.');
    console.log('  Example: SUPABASE_URL=https://xxx.supabase.co npx tsx scripts/health-gate.ts');
    process.exit(0);
  }

  console.log(`  Target: ${SUPABASE_URL}/functions/v1/health`);
  console.log(`  Timeout: ${TIMEOUT_SECONDS}s`);
  console.log(`  Poll interval: ${POLL_INTERVAL_MS / 1000}s`);
  console.log('');

  const deadline = Date.now() + TIMEOUT_SECONDS * 1000;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt++;
    const result = await checkHealth();

    if (result.healthy) {
      console.log(`  [PASS] Attempt ${attempt}: healthy (${result.responseTime}ms)`);
      console.log('\n  Health gate passed. Service is healthy.\n');
      process.exit(0);
    }

    console.log(`  [WAIT] Attempt ${attempt}: ${result.status} (${result.responseTime}ms)`);

    if (Date.now() + POLL_INTERVAL_MS < deadline) {
      await sleep(POLL_INTERVAL_MS);
    } else {
      break;
    }
  }

  console.log(`\n  Health gate FAILED after ${attempt} attempts (${TIMEOUT_SECONDS}s timeout).`);
  console.log('  Service may still be starting up or there may be an issue.\n');
  process.exit(1);
}

main();
