#!/usr/bin/env node
/**
 * Post-Deploy Smoke Test
 *
 * Verifies critical surfaces are working after a deployment.
 * Designed to run in CI or manually after deploy.
 *
 * Usage:
 *   DEPLOY_URL=https://chravel.com npx tsx scripts/smoke-test.ts
 *   DEPLOY_URL=https://chravel.com SUPABASE_URL=https://xxx.supabase.co npx tsx scripts/smoke-test.ts
 *
 * Exit codes:
 *   0 = all checks pass
 *   1 = one or more checks failed
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEPLOY_URL = process.env.DEPLOY_URL || '';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const TIMEOUT_MS = 10_000;

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

async function httpCheck(
  name: string,
  url: string,
  expectedStatus: number = 200,
): Promise<CheckResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    clearTimeout(timer);

    const passed = res.status === expectedStatus;
    return {
      name,
      passed,
      detail: passed ? `HTTP ${res.status}` : `Expected ${expectedStatus}, got ${res.status}`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      name,
      passed: false,
      detail: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
}

async function healthEndpointCheck(): Promise<CheckResult> {
  const start = Date.now();
  const url = `${SUPABASE_URL}/functions/v1/health`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.status !== 200) {
      return {
        name: 'Health endpoint',
        passed: false,
        detail: `HTTP ${res.status}`,
        durationMs: Date.now() - start,
      };
    }

    const body = await res.json();
    const passed = body.status === 'healthy';
    return {
      name: 'Health endpoint',
      passed,
      detail: passed ? `status: ${body.status}` : `status: ${body.status} (expected: healthy)`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      name: 'Health endpoint',
      passed: false,
      detail: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('\n  Post-Deploy Smoke Test');
  console.log(''.padStart(60, '-'));

  if (!DEPLOY_URL && !SUPABASE_URL) {
    console.log('  No DEPLOY_URL or SUPABASE_URL set. Set at least one to run smoke tests.');
    console.log('  Example: DEPLOY_URL=https://chravel.com npx tsx scripts/smoke-test.ts');
    process.exit(0);
  }

  const results: CheckResult[] = [];

  // Frontend checks (only if DEPLOY_URL set)
  if (DEPLOY_URL) {
    console.log(`\n  Target: ${DEPLOY_URL}`);
    results.push(await httpCheck('Main page', DEPLOY_URL));
    results.push(await httpCheck('Auth page', `${DEPLOY_URL}/auth`));
  }

  // Backend checks (only if SUPABASE_URL set)
  if (SUPABASE_URL) {
    console.log(`  Supabase: ${SUPABASE_URL}`);
    results.push(await healthEndpointCheck());
  }

  // Report results
  console.log('\n  Results:');
  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? 'PASS' : 'FAIL';
    console.log(`  [${icon}] ${r.name} (${r.durationMs}ms)`);
    if (!r.passed) {
      console.log(`         ${r.detail}`);
      allPassed = false;
    }
  }

  const passCount = results.filter(r => r.passed).length;
  console.log(`\n  ${passCount}/${results.length} checks passed.`);

  if (!allPassed) {
    console.log('  Some smoke tests failed. Investigate before proceeding.\n');
    process.exit(1);
  }

  console.log('  All smoke tests passed.\n');
}

main();
