/**
 * Static Security Analysis (Semgrep-like)
 * Scans source files for common security anti-patterns.
 *
 * Detects:
 *  - Hardcoded secrets / API keys
 *  - SQL injection patterns
 *  - Unsafe eval / innerHTML usage
 *  - Missing auth checks
 *  - Insecure data handling
 *  - Client-side trust of sensitive IDs
 *
 * Usage: npx tsx scripts/security/static-analysis.ts
 * CI:    npx tsx scripts/security/static-analysis.ts --ci
 */

import * as fs from 'fs';
import * as path from 'path';

interface Finding {
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  file: string;
  line: number;
  message: string;
  snippet: string;
}

interface Rule {
  id: string;
  severity: Finding['severity'];
  pattern: RegExp;
  message: string;
  /** If set, only scan files matching this glob-like extension list */
  fileExtensions?: string[];
  /** Lines matching this pattern are excluded (e.g. comments) */
  exclude?: RegExp;
}

const RULES: Rule[] = [
  // --- Critical ---
  {
    id: 'hardcoded-secret',
    severity: 'critical',
    pattern:
      /(?:api[_-]?key|secret[_-]?key|password|private[_-]?key|service[_-]?role)\s*[:=]\s*['"][A-Za-z0-9+/=_-]{20,}['"]/i,
    message: 'Possible hardcoded secret detected. Use environment variables instead.',
    exclude: /(?:\/\/.*test|\/\/.*example|\/\/.*mock|\/\/.*fallback|FALLBACK_)/,
  },
  {
    id: 'service-role-key',
    severity: 'critical',
    pattern: /supabase_service_role|SERVICE_ROLE_KEY/i,
    message:
      'Service role key reference in client code. This key must NEVER be exposed to the browser.',
    fileExtensions: ['.ts', '.tsx'],
    exclude: /(?:\.env|types\.ts|\/\/.*never)/,
  },
  {
    id: 'eval-usage',
    severity: 'critical',
    pattern: /\beval\s*\(/,
    message: 'eval() is a code injection vector. Use safer alternatives.',
    exclude: /\/\/.*safe|\/\/.*eslint-disable/,
  },

  // --- High ---
  {
    id: 'innerhtml-xss',
    severity: 'high',
    pattern: /\.innerHTML\s*=/,
    message:
      'Direct innerHTML assignment is an XSS vector. Use textContent or a sanitization library.',
    fileExtensions: ['.ts', '.tsx'],
    exclude: /sanitize|DOMPurify|textContent/,
  },
  {
    id: 'dangerously-set-html',
    severity: 'high',
    pattern: /dangerouslySetInnerHTML/,
    message:
      'dangerouslySetInnerHTML bypasses React XSS protection. Ensure input is sanitized server-side.',
    fileExtensions: ['.tsx'],
  },
  {
    id: 'sql-injection',
    severity: 'high',
    pattern: /\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b/i,
    message: 'Possible SQL injection via string interpolation. Use parameterized queries.',
  },
  {
    id: 'sql-injection-reverse',
    severity: 'high',
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE)\s.*\$\{/i,
    message: 'Possible SQL injection via template literal. Use parameterized queries.',
  },
  {
    id: 'open-redirect',
    severity: 'high',
    pattern: /window\.location\s*=\s*(?:params|query|search|input|user|req)/i,
    message: 'Possible open redirect. Validate redirect targets against an allowlist.',
  },

  // --- Medium ---
  {
    id: 'console-log-sensitive',
    severity: 'medium',
    pattern: /console\.log\s*\(.*(?:password|secret|token|key|credential|session|auth).*\)/i,
    message: 'Logging potentially sensitive data. Remove before production.',
    exclude: /\/\/.*debug|test/,
  },
  {
    id: 'localstorage-sensitive',
    severity: 'medium',
    pattern: /localStorage\.setItem\s*\(\s*['"](?:.*(?:token|secret|password|key|session).*)['"]/i,
    message: 'Storing sensitive data in localStorage. Use httpOnly cookies or secure storage.',
    exclude: /auth-session|concierge-usage/,
  },
  {
    id: 'client-side-role-check',
    severity: 'medium',
    pattern: /(?:role|isAdmin|isSuperAdmin)\s*===?\s*['"](?:admin|super)/i,
    message:
      'Client-side role checks can be bypassed. Ensure role validation happens server-side (RLS/Edge Functions).',
    fileExtensions: ['.ts', '.tsx'],
    exclude: /\/\/.*display|\/\/.*ui|\.test\.|__tests__/,
  },
  {
    id: 'unvalidated-id-param',
    severity: 'medium',
    pattern: /useParams.*(?:tripId|userId|eventId)(?!.*isValid)/,
    message: 'URL parameter used without format validation. Validate IDs before sending to API.',
    fileExtensions: ['.tsx'],
  },
  {
    id: 'fetch-no-auth',
    severity: 'medium',
    pattern: /fetch\s*\(\s*[`'"](?:https?:)?\/\/.*(?!supabase|google|localhost)/,
    message: 'External fetch call — ensure proper authentication headers are included.',
    fileExtensions: ['.ts', '.tsx'],
    exclude: /proxy|health|og|preview|static/,
  },

  // --- Low ---
  {
    id: 'todo-security',
    severity: 'low',
    pattern: /(?:TODO|FIXME|HACK).*(?:security|auth|rls|permission|vulnerability)/i,
    message: 'Security-related TODO found. Ensure this is addressed before launch.',
  },
  {
    id: 'cors-wildcard',
    severity: 'low',
    pattern: /['"]\*['"]\s*(?:\/\/.*cors|.*access-control)/i,
    message: 'CORS wildcard detected. Restrict to specific origins in production.',
  },
];

function scanFile(filePath: string): Finding[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const findings: Finding[] = [];
  const ext = path.extname(filePath);

  for (const rule of RULES) {
    // Skip if rule is scoped to specific extensions and file doesn't match
    if (rule.fileExtensions && !rule.fileExtensions.includes(ext)) continue;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (rule.pattern.test(line)) {
        // Check exclusion pattern
        if (rule.exclude && rule.exclude.test(line)) continue;

        findings.push({
          rule: rule.id,
          severity: rule.severity,
          file: filePath,
          line: i + 1,
          message: rule.message,
          snippet: line.trim().substring(0, 120),
        });
      }
    }
  }

  return findings;
}

function walkDir(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  const skipDirs = new Set([
    'node_modules',
    'dist',
    '.git',
    'ios',
    'android',
    '.husky',
    'public',
    'docs',
    'test-results',
  ]);

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        walk(path.join(currentDir, entry.name));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          results.push(path.join(currentDir, entry.name));
        }
      }
    }
  }

  walk(dir);
  return results;
}

function main(): void {
  const isCI = process.argv.includes('--ci');
  const rootDir = path.resolve(__dirname, '../..');

  console.log('=== Chravel Static Security Analysis ===\n');

  const files = walkDir(path.join(rootDir, 'src'), ['.ts', '.tsx', '.js', '.jsx']);
  // Also scan edge functions
  const edgeFnDir = path.join(rootDir, 'supabase', 'functions');
  if (fs.existsSync(edgeFnDir)) {
    files.push(...walkDir(edgeFnDir, ['.ts', '.tsx', '.js']));
  }
  // Also scan scripts
  const scriptsDir = path.join(rootDir, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    files.push(...walkDir(scriptsDir, ['.ts', '.js']));
  }
  // Also scan API directory
  const apiDir = path.join(rootDir, 'api');
  if (fs.existsSync(apiDir)) {
    files.push(...walkDir(apiDir, ['.ts', '.js']));
  }

  console.log(`Scanning ${files.length} files...\n`);

  const allFindings: Finding[] = [];
  for (const file of files) {
    allFindings.push(...scanFile(file));
  }

  // Group by severity
  const bySeverity: Record<string, Finding[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    info: [],
  };
  for (const f of allFindings) {
    bySeverity[f.severity].push(f);
  }

  // Print findings
  for (const severity of ['critical', 'high', 'medium', 'low', 'info']) {
    const findings = bySeverity[severity];
    if (findings.length === 0) continue;

    console.log(`--- ${severity.toUpperCase()} (${findings.length}) ---\n`);
    for (const f of findings) {
      const relPath = path.relative(rootDir, f.file);
      console.log(`  [${f.rule}] ${relPath}:${f.line}`);
      console.log(`    ${f.message}`);
      console.log(`    > ${f.snippet}`);
      console.log('');
    }
  }

  // Summary
  console.log('--- Summary ---');
  console.log(`  Critical: ${bySeverity.critical.length}`);
  console.log(`  High:     ${bySeverity.high.length}`);
  console.log(`  Medium:   ${bySeverity.medium.length}`);
  console.log(`  Low:      ${bySeverity.low.length}`);
  console.log(`  Total:    ${allFindings.length}\n`);

  // CI gate
  if (isCI && bySeverity.critical.length > 0) {
    console.log('CI GATE: FAIL — critical security findings detected');
    process.exit(1);
  }

  console.log('Static analysis complete.\n');
}

main();
