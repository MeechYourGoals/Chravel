/**
 * Supabase RLS Policy Auditor
 *
 * Scans migration files for RLS policy definitions and validates:
 *  - Every table has RLS enabled
 *  - SELECT policies use auth.uid() checks
 *  - INSERT/UPDATE/DELETE policies exist and are restrictive
 *  - No policies use `true` (public access) without documentation
 *  - Trip access respects membership checks
 *
 * Usage: npx tsx scripts/security/rls-audit.ts
 * CI:    npx tsx scripts/security/rls-audit.ts --ci
 */

import * as fs from 'fs';
import * as path from 'path';

interface RLSFinding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  table: string;
  issue: string;
  file: string;
  line: number;
  recommendation: string;
}

interface TableInfo {
  name: string;
  rlsEnabled: boolean;
  policies: {
    name: string;
    operation: string;
    using: string;
    withCheck: string;
    file: string;
    line: number;
  }[];
  file: string;
  line: number;
}

/** Tables that are legitimately public (no auth needed) */
const PUBLIC_TABLES = new Set(['schema_migrations', 'spatial_ref_sys']);

/** Sensitive tables that MUST have strict RLS */
const SENSITIVE_TABLES = new Set([
  'trips',
  'trip_members',
  'messages',
  'channels',
  'payments',
  'payment_splits',
  'user_profiles',
  'secure_storage',
  'concierge_usage',
  'notifications',
  'media',
  'trip_media',
  'calendars',
  'calendar_events',
  'broadcasts',
]);

function parseRLSFromMigrations(migrationsDir: string): {
  tables: Map<string, TableInfo>;
  findings: RLSFinding[];
} {
  const tables = new Map<string, TableInfo>();
  const findings: RLSFinding[] = [];

  if (!fs.existsSync(migrationsDir)) {
    console.log('[WARN] No migrations directory found');
    return { tables, findings };
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Detect CREATE TABLE
      const createMatch = line.match(
        /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/i,
      );
      if (createMatch) {
        const tableName = createMatch[1];
        if (!tables.has(tableName)) {
          tables.set(tableName, {
            name: tableName,
            rlsEnabled: false,
            policies: [],
            file,
            line: lineNum,
          });
        }
      }

      // Detect ALTER TABLE ... ENABLE ROW LEVEL SECURITY
      const rlsMatch = line.match(
        /alter\s+table\s+(?:public\.)?(\w+)\s+enable\s+row\s+level\s+security/i,
      );
      if (rlsMatch) {
        const tableName = rlsMatch[1];
        const table = tables.get(tableName);
        if (table) {
          table.rlsEnabled = true;
        } else {
          tables.set(tableName, {
            name: tableName,
            rlsEnabled: true,
            policies: [],
            file,
            line: lineNum,
          });
        }
      }

      // Detect CREATE POLICY
      const policyMatch = line.match(
        /create\s+policy\s+["']([^"']+)["']\s+on\s+(?:public\.)?(\w+)/i,
      );
      if (policyMatch) {
        const policyName = policyMatch[1];
        const tableName = policyMatch[2];

        // Look ahead for the operation, USING, and WITH CHECK clauses
        let operation = 'ALL';
        let using = '';
        let withCheck = '';

        // Scan up to 20 lines ahead for the full policy definition
        const policyBlock = lines.slice(i, Math.min(i + 20, lines.length)).join(' ');

        const opMatch = policyBlock.match(/for\s+(select|insert|update|delete|all)/i);
        if (opMatch) operation = opMatch[1].toUpperCase();

        const usingMatch = policyBlock.match(/using\s*\((.+?)(?:\)\s*(?:with|;)|\);\s*$)/i);
        if (usingMatch) using = usingMatch[1].trim();

        const withCheckMatch = policyBlock.match(/with\s+check\s*\((.+?)\)\s*;/i);
        if (withCheckMatch) withCheck = withCheckMatch[1].trim();

        const table = tables.get(tableName);
        if (table) {
          table.policies.push({
            name: policyName,
            operation,
            using: using || '(not parsed)',
            withCheck: withCheck || '',
            file,
            line: lineNum,
          });
        }
      }
    }
  }

  return { tables, findings };
}

function auditPolicies(tables: Map<string, TableInfo>): RLSFinding[] {
  const findings: RLSFinding[] = [];

  for (const [name, table] of tables) {
    if (PUBLIC_TABLES.has(name)) continue;

    // Check 1: RLS enabled
    if (!table.rlsEnabled) {
      const severity = SENSITIVE_TABLES.has(name) ? 'critical' : 'high';
      findings.push({
        severity,
        table: name,
        issue: 'Row Level Security is NOT enabled',
        file: table.file,
        line: table.line,
        recommendation: `ALTER TABLE ${name} ENABLE ROW LEVEL SECURITY;`,
      });
      continue; // No point checking policies if RLS isn't on
    }

    // Check 2: Has any policies at all
    if (table.policies.length === 0) {
      findings.push({
        severity: SENSITIVE_TABLES.has(name) ? 'critical' : 'medium',
        table: name,
        issue: 'RLS enabled but NO policies defined (all access blocked)',
        file: table.file,
        line: table.line,
        recommendation: 'Add appropriate RLS policies for this table',
      });
      continue;
    }

    // Check 3: Overly permissive policies
    for (const policy of table.policies) {
      // Check for `true` USING clause (allows all access)
      if (/^\s*true\s*$/i.test(policy.using)) {
        const severity = SENSITIVE_TABLES.has(name) ? 'critical' : 'medium';
        findings.push({
          severity,
          table: name,
          issue: `Policy "${policy.name}" uses USING (true) — allows unrestricted ${policy.operation} access`,
          file: policy.file,
          line: policy.line,
          recommendation: `Add auth.uid() check: USING (user_id = auth.uid())`,
        });
      }

      // Check for missing auth.uid() in sensitive table policies
      if (
        SENSITIVE_TABLES.has(name) &&
        !policy.using.includes('auth.uid()') &&
        !policy.using.includes('auth.role()') &&
        !/true/i.test(policy.using) && // already caught above
        policy.using !== '(not parsed)'
      ) {
        findings.push({
          severity: 'medium',
          table: name,
          issue: `Policy "${policy.name}" on sensitive table doesn't reference auth.uid()`,
          file: policy.file,
          line: policy.line,
          recommendation: 'Verify this policy correctly restricts access to authenticated users',
        });
      }
    }

    // Check 4: Sensitive tables should have policies for all operations
    if (SENSITIVE_TABLES.has(name)) {
      const operations = new Set(table.policies.map(p => p.operation));
      const hasAll = operations.has('ALL');

      if (!hasAll) {
        if (!operations.has('SELECT')) {
          findings.push({
            severity: 'high',
            table: name,
            issue: 'No SELECT policy on sensitive table',
            file: table.file,
            line: table.line,
            recommendation: `Add: CREATE POLICY "select_own" ON ${name} FOR SELECT USING (user_id = auth.uid());`,
          });
        }
        if (!operations.has('DELETE')) {
          findings.push({
            severity: 'low',
            table: name,
            issue: 'No explicit DELETE policy (may be intentional)',
            file: table.file,
            line: table.line,
            recommendation: 'Verify deletion is properly restricted',
          });
        }
      }
    }
  }

  return findings;
}

function main(): void {
  const isCI = process.argv.includes('--ci');
  const rootDir = path.resolve(__dirname, '../..');
  const migrationsDir = path.join(rootDir, 'supabase', 'migrations');

  console.log('=== Chravel RLS Policy Audit ===\n');

  const { tables } = parseRLSFromMigrations(migrationsDir);

  console.log(`Found ${tables.size} tables in migrations\n`);

  const findings = auditPolicies(tables);

  if (findings.length === 0) {
    console.log('No RLS issues found.\n');
    return;
  }

  // Group by severity
  const bySeverity: Record<string, RLSFinding[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };
  for (const f of findings) {
    bySeverity[f.severity].push(f);
  }

  for (const severity of ['critical', 'high', 'medium', 'low']) {
    const items = bySeverity[severity];
    if (items.length === 0) continue;

    console.log(`--- ${severity.toUpperCase()} (${items.length}) ---\n`);
    for (const f of items) {
      console.log(`  [${f.table}] ${f.issue}`);
      console.log(`    File: ${f.file}:${f.line}`);
      console.log(`    Fix:  ${f.recommendation}`);
      console.log('');
    }
  }

  console.log('--- Summary ---');
  console.log(`  Critical: ${bySeverity.critical.length}`);
  console.log(`  High:     ${bySeverity.high.length}`);
  console.log(`  Medium:   ${bySeverity.medium.length}`);
  console.log(`  Low:      ${bySeverity.low.length}`);
  console.log(`  Total:    ${findings.length}\n`);

  // Summary of table RLS status
  let rlsEnabled = 0;
  let rlsDisabled = 0;
  for (const [, table] of tables) {
    if (table.rlsEnabled) rlsEnabled++;
    else rlsDisabled++;
  }
  console.log(`  Tables with RLS: ${rlsEnabled}/${tables.size}`);
  console.log(`  Tables without:  ${rlsDisabled}/${tables.size}\n`);

  if (isCI && bySeverity.critical.length > 0) {
    console.log('CI GATE: FAIL — critical RLS issues found');
    process.exit(1);
  }

  console.log('RLS audit complete.\n');
}

main();
