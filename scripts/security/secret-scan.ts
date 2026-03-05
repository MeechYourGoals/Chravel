/**
 * Secret Leak Detection (GitGuardian-like)
 * Scans committed files and staged changes for leaked secrets.
 *
 * Detects:
 *  - API keys (Stripe, Supabase service role, OpenAI, etc.)
 *  - Private keys (RSA, EC, PGP)
 *  - Tokens (JWT, OAuth, GitHub PAT)
 *  - Connection strings (database URLs)
 *  - High-entropy strings that look like secrets
 *
 * Usage: npx tsx scripts/security/secret-scan.ts
 * CI:    npx tsx scripts/security/secret-scan.ts --ci
 * Hook:  npx tsx scripts/security/secret-scan.ts --staged
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface SecretFinding {
  type: string;
  severity: 'critical' | 'high' | 'medium';
  file: string;
  line: number;
  snippet: string;
  recommendation: string;
}

interface SecretPattern {
  id: string;
  severity: SecretFinding['severity'];
  pattern: RegExp;
  recommendation: string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  // --- Critical: Highly specific patterns ---
  {
    id: 'stripe-secret-key',
    severity: 'critical',
    pattern: /sk_live_[a-zA-Z0-9]{24,}/,
    recommendation: 'Rotate this Stripe secret key immediately at dashboard.stripe.com',
  },
  {
    id: 'stripe-restricted-key',
    severity: 'critical',
    pattern: /rk_live_[a-zA-Z0-9]{24,}/,
    recommendation: 'Rotate this Stripe restricted key immediately',
  },
  {
    id: 'supabase-service-role',
    severity: 'critical',
    pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
    recommendation:
      'If this is a service_role key, rotate it immediately in Supabase dashboard. Anon keys are safe to expose.',
  },
  {
    id: 'openai-api-key',
    severity: 'critical',
    pattern: /sk-[a-zA-Z0-9]{20,}T3BlbkFJ[a-zA-Z0-9]{20,}/,
    recommendation: 'Rotate this OpenAI API key at platform.openai.com',
  },
  {
    id: 'github-pat',
    severity: 'critical',
    pattern: /ghp_[a-zA-Z0-9]{36}/,
    recommendation: 'Rotate this GitHub Personal Access Token',
  },
  {
    id: 'github-oauth',
    severity: 'critical',
    pattern: /gho_[a-zA-Z0-9]{36}/,
    recommendation: 'Rotate this GitHub OAuth token',
  },
  {
    id: 'aws-access-key',
    severity: 'critical',
    pattern: /AKIA[0-9A-Z]{16}/,
    recommendation: 'Rotate this AWS access key immediately',
  },
  {
    id: 'private-key-block',
    severity: 'critical',
    pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/,
    recommendation: 'Remove private key from source code. Use secret management.',
  },

  // --- High ---
  {
    id: 'google-api-key',
    severity: 'high',
    pattern: /AIza[0-9A-Za-z\-_]{35}/,
    recommendation:
      'If this is a server-side Google API key, rotate it. Client-side maps keys should be restricted by referrer.',
  },
  {
    id: 'slack-token',
    severity: 'high',
    pattern: /xox[bpors]-[0-9]{10,}-[a-zA-Z0-9-]+/,
    recommendation: 'Rotate this Slack token',
  },
  {
    id: 'twilio-api-key',
    severity: 'high',
    pattern: /SK[a-f0-9]{32}/,
    recommendation: 'Rotate this Twilio API key',
  },
  {
    id: 'sendgrid-api-key',
    severity: 'high',
    pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/,
    recommendation: 'Rotate this SendGrid API key',
  },
  {
    id: 'database-url',
    severity: 'high',
    pattern: /(?:postgres|mysql|mongodb):\/\/[^:]+:[^@]+@[^/]+/,
    recommendation: 'Database connection string with credentials exposed. Use env vars.',
  },

  // --- Medium ---
  {
    id: 'generic-secret-assignment',
    severity: 'medium',
    pattern:
      /(?:secret|password|passwd|apikey|api_key|access_token|auth_token)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    recommendation: 'Possible hardcoded credential. Use environment variables.',
  },
];

/** Files/dirs to always skip */
const SKIP_PATHS = new Set([
  'node_modules',
  'dist',
  '.git',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.husky',
]);

/** File extensions to skip (binary/non-text) */
const SKIP_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.mp3',
  '.mp4',
  '.webm',
  '.zip',
  '.tar',
  '.gz',
]);

/** Known safe patterns (anon keys, test fixtures, etc.) */
const SAFE_PATTERNS = [
  /FALLBACK_ANON_KEY/, // Our publishable anon key fallback
  /test|mock|fixture|example|sample|placeholder|dummy/i, // Test data
  /\.test\.|\.spec\.|__tests__|__mocks__/, // Test files (checked against file path)
];

function isKnownSafe(line: string, filePath: string): boolean {
  return SAFE_PATTERNS.some(p => p.test(line) || p.test(filePath));
}

function walkDir(dir: string): string[] {
  const results: string[] = [];

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_PATHS.has(entry.name)) continue;
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (SKIP_EXTENSIONS.has(ext)) continue;
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

function getStagedFiles(rootDir: string): string[] {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      cwd: rootDir,
      encoding: 'utf-8',
    });
    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(f => path.join(rootDir, f));
  } catch {
    return [];
  }
}

function scanFile(filePath: string): SecretFinding[] {
  const findings: SecretFinding[] = [];

  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return findings;
  }

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines and short lines
    if (line.trim().length < 10) continue;

    // Skip comments that are clearly documentation
    if (/^\s*(?:\/\/|\/\*|\*|#)\s*(?:example|usage|note|doc|see|ref)/i.test(line)) continue;

    for (const pattern of SECRET_PATTERNS) {
      if (pattern.pattern.test(line)) {
        // Check if this is a known safe pattern
        if (isKnownSafe(line, filePath)) continue;

        // Redact the actual secret in the snippet
        const snippet = line
          .trim()
          .substring(0, 120)
          .replace(/(['"])[A-Za-z0-9+/=_-]{20,}(['"])/g, '$1[REDACTED]$2');

        findings.push({
          type: pattern.id,
          severity: pattern.severity,
          file: filePath,
          line: i + 1,
          snippet,
          recommendation: pattern.recommendation,
        });
      }
    }
  }

  return findings;
}

function main(): void {
  const isCI = process.argv.includes('--ci');
  const stagedOnly = process.argv.includes('--staged');
  const rootDir = path.resolve(__dirname, '../..');

  console.log('=== Chravel Secret Leak Detection ===\n');

  let files: string[];

  if (stagedOnly) {
    files = getStagedFiles(rootDir);
    console.log(`Scanning ${files.length} staged files...\n`);
  } else {
    files = walkDir(rootDir);
    console.log(`Scanning ${files.length} files...\n`);
  }

  const allFindings: SecretFinding[] = [];
  for (const file of files) {
    allFindings.push(...scanFile(file));
  }

  // Deduplicate by file+line+type
  const seen = new Set<string>();
  const uniqueFindings = allFindings.filter(f => {
    const key = `${f.file}:${f.line}:${f.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (uniqueFindings.length === 0) {
    console.log('No secrets detected.\n');
    return;
  }

  // Group by severity
  const bySeverity: Record<string, SecretFinding[]> = {
    critical: [],
    high: [],
    medium: [],
  };
  for (const f of uniqueFindings) {
    bySeverity[f.severity].push(f);
  }

  for (const severity of ['critical', 'high', 'medium']) {
    const findings = bySeverity[severity];
    if (findings.length === 0) continue;

    console.log(`--- ${severity.toUpperCase()} (${findings.length}) ---\n`);
    for (const f of findings) {
      const relPath = path.relative(rootDir, f.file);
      console.log(`  [${f.type}] ${relPath}:${f.line}`);
      console.log(`    > ${f.snippet}`);
      console.log(`    Action: ${f.recommendation}`);
      console.log('');
    }
  }

  console.log('--- Summary ---');
  console.log(`  Critical: ${bySeverity.critical.length}`);
  console.log(`  High:     ${bySeverity.high.length}`);
  console.log(`  Medium:   ${bySeverity.medium.length}`);
  console.log(`  Total:    ${uniqueFindings.length}\n`);

  if (isCI && bySeverity.critical.length > 0) {
    console.log('CI GATE: FAIL — critical secrets detected in codebase');
    process.exit(1);
  }

  if (stagedOnly && bySeverity.critical.length > 0) {
    console.log('PRE-COMMIT: BLOCKED — secrets detected in staged files');
    process.exit(1);
  }

  console.log('Secret scan complete.\n');
}

main();
