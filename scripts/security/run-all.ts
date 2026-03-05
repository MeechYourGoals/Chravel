/**
 * Unified Security Pipeline Runner
 *
 * Runs all security checks in sequence and produces a combined report.
 * Designed for CI/CD integration — exits non-zero on critical findings.
 *
 * Usage:
 *   npx tsx scripts/security/run-all.ts         # Interactive (warnings only)
 *   npx tsx scripts/security/run-all.ts --ci    # CI mode (fails on critical)
 *
 * Pipeline order:
 *   1. Secret scan (fastest, highest impact)
 *   2. Dependency scan (npm audit)
 *   3. Static analysis (code patterns)
 *   4. RLS audit (Supabase policies)
 */

import { execSync } from 'child_process';
import * as path from 'path';

interface CheckResult {
  name: string;
  passed: boolean;
  duration: number;
  output: string;
}

const isCI = process.argv.includes('--ci');
const rootDir = path.resolve(__dirname, '../..');
const ciFlag = isCI ? '--ci' : '';

const CHECKS = [
  { name: 'Secret Scan', script: 'scripts/security/secret-scan.ts' },
  { name: 'Dependency Scan', script: 'scripts/security/dependency-scan.ts' },
  { name: 'Static Analysis', script: 'scripts/security/static-analysis.ts' },
  { name: 'RLS Audit', script: 'scripts/security/rls-audit.ts' },
];

function runCheck(name: string, script: string): CheckResult {
  const start = Date.now();
  try {
    const output = execSync(`npx tsx ${script} ${ciFlag}`, {
      cwd: rootDir,
      encoding: 'utf-8',
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return {
      name,
      passed: true,
      duration: Date.now() - start,
      output,
    };
  } catch (err: unknown) {
    const output =
      err && typeof err === 'object' && 'stdout' in err
        ? (err as { stdout: string }).stdout || ''
        : '';
    return {
      name,
      passed: false,
      duration: Date.now() - start,
      output,
    };
  }
}

function main(): void {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Chravel Security Pipeline              ║');
  console.log(`║   Mode: ${isCI ? 'CI (strict)' : 'Interactive'}                    ║`);
  console.log('╚══════════════════════════════════════════╝\n');

  const results: CheckResult[] = [];

  for (const check of CHECKS) {
    console.log(`Running: ${check.name}...`);
    const result = runCheck(check.name, check.script);
    results.push(result);

    const status = result.passed ? 'PASS' : 'FAIL';
    const duration = `${(result.duration / 1000).toFixed(1)}s`;
    console.log(`  ${status} (${duration})\n`);

    // In CI mode, print output for failed checks
    if (isCI && !result.passed) {
      console.log(result.output);
    }
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   Pipeline Summary                       ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  for (const r of results) {
    const icon = r.passed ? 'PASS' : 'FAIL';
    console.log(`  ${icon}  ${r.name} (${(r.duration / 1000).toFixed(1)}s)`);
  }

  console.log(
    `\n  Total: ${passed} passed, ${failed} failed (${(totalDuration / 1000).toFixed(1)}s)\n`,
  );

  if (failed > 0 && isCI) {
    console.log('CI GATE: FAIL — security checks did not pass');
    process.exit(1);
  }

  if (failed > 0) {
    console.log('WARNING: Some security checks failed. Review findings above.');
  } else {
    console.log('All security checks passed.');
  }
}

main();
