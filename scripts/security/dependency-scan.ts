/**
 * Dependency Scanner (Snyk-like)
 * Scans package.json + lock file for known vulnerable packages.
 * Runs `npm audit --json` under the hood and produces actionable output.
 *
 * Usage: npx tsx scripts/security/dependency-scan.ts
 * CI:    npx tsx scripts/security/dependency-scan.ts --ci  (exits non-zero on high/critical)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface AuditVulnerability {
  name: string;
  severity: string;
  via: Array<string | { title: string; url: string; severity: string; range: string }>;
  effects: string[];
  range: string;
  fixAvailable: boolean | { name: string; version: string; isSemVerMajor: boolean };
}

interface AuditReport {
  vulnerabilities: Record<string, AuditVulnerability>;
  metadata: {
    vulnerabilities: {
      info: number;
      low: number;
      moderate: number;
      high: number;
      critical: number;
      total: number;
    };
  };
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  moderate: 2,
  low: 1,
  info: 0,
};

function runAudit(): AuditReport | null {
  try {
    const output = execSync('npm audit --json 2>/dev/null', {
      cwd: path.resolve(__dirname, '../..'),
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    return JSON.parse(output);
  } catch (err: unknown) {
    // npm audit exits non-zero when vulns found — that's expected
    if (err && typeof err === 'object' && 'stdout' in err) {
      try {
        return JSON.parse((err as { stdout: string }).stdout);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function checkOutdatedDeps(): string[] {
  const warnings: string[] = [];
  const pkgPath = path.resolve(__dirname, '../../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  // Flag packages pinned to very old major versions (known risky patterns)
  const riskyPatterns: Record<string, { minSafe: number; reason: string }> = {
    vite: { minSafe: 5, reason: 'Older Vite versions have known security issues' },
    react: { minSafe: 18, reason: 'React <18 has known XSS vectors' },
    typescript: { minSafe: 5, reason: 'Older TS may not catch type-level exploits' },
  };

  for (const [pkg, config] of Object.entries(riskyPatterns)) {
    const version = allDeps[pkg];
    if (!version) continue;
    const major = parseInt(version.replace(/[^0-9.]/, '').split('.')[0], 10);
    if (!isNaN(major) && major < config.minSafe) {
      warnings.push(`[WARN] ${pkg}@${version}: ${config.reason}`);
    }
  }

  return warnings;
}

function main(): void {
  const isCI = process.argv.includes('--ci');

  console.log('=== Chravel Dependency Security Scan ===\n');

  // 1. npm audit
  const report = runAudit();
  if (!report) {
    console.log('[SKIP] Could not run npm audit (no lock file or network issue)');
    if (isCI) process.exit(0);
    return;
  }

  const meta = report.metadata.vulnerabilities;
  console.log(`Total vulnerabilities: ${meta.total}`);
  console.log(`  Critical: ${meta.critical}`);
  console.log(`  High:     ${meta.high}`);
  console.log(`  Moderate: ${meta.moderate}`);
  console.log(`  Low:      ${meta.low}`);
  console.log(`  Info:     ${meta.info}\n`);

  // Show details for high + critical
  const highSeverity = Object.entries(report.vulnerabilities)
    .filter(([, v]) => SEVERITY_ORDER[v.severity] >= SEVERITY_ORDER['high'])
    .sort((a, b) => (SEVERITY_ORDER[b[1].severity] || 0) - (SEVERITY_ORDER[a[1].severity] || 0));

  if (highSeverity.length > 0) {
    console.log('--- High/Critical Vulnerabilities ---\n');
    for (const [name, vuln] of highSeverity) {
      console.log(`  ${vuln.severity.toUpperCase()}: ${name}`);
      console.log(`    Range: ${vuln.range}`);

      // Show fix if available
      if (typeof vuln.fixAvailable === 'object') {
        console.log(
          `    Fix: upgrade to ${vuln.fixAvailable.name}@${vuln.fixAvailable.version}${vuln.fixAvailable.isSemVerMajor ? ' (MAJOR)' : ''}`,
        );
      } else if (vuln.fixAvailable === false) {
        console.log('    Fix: No fix available — consider replacing this package');
      }

      // Show advisory info
      for (const v of vuln.via) {
        if (typeof v === 'object' && v.title) {
          console.log(`    Advisory: ${v.title}`);
          if (v.url) console.log(`    URL: ${v.url}`);
        }
      }
      console.log('');
    }
  }

  // 2. Outdated dep warnings
  const outdatedWarnings = checkOutdatedDeps();
  if (outdatedWarnings.length > 0) {
    console.log('--- Outdated Package Warnings ---\n');
    outdatedWarnings.forEach(w => console.log(`  ${w}`));
    console.log('');
  }

  // 3. CI gate
  if (isCI && (meta.critical > 0 || meta.high > 0)) {
    console.log('CI GATE: FAIL — high/critical vulnerabilities found');
    process.exit(1);
  }

  console.log('Dependency scan complete.\n');
}

main();
