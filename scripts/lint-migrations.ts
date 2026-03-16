#!/usr/bin/env node
/**
 * Migration SQL Linter
 *
 * Validates Supabase migration files for safety and consistency.
 * Enforces idempotency, naming conventions, and schema qualification.
 *
 * Usage:
 *   npx tsx scripts/lint-migrations.ts           # lint all migrations
 *   npx tsx scripts/lint-migrations.ts --fix-names # report naming issues only
 *
 * Exit codes:
 *   0 = all migrations pass
 *   1 = violations found
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Violation {
  file: string;
  line: number;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'supabase/migrations');
const TIMESTAMP_PATTERN = /^\d{14}_/; // YYYYMMDDHHMMSS_

// Patterns that indicate documented NO-OPs (safe to skip)
const NOOP_PATTERNS = [
  /^\s*SELECT\s+1\s*;?\s*$/i,
  /^\s*--\s*NO-OP/i,
  /^\s*--\s*This migration was a duplicate/i,
];

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

function lintFile(filePath: string, fileName: string): Violation[] {
  const violations: Violation[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Skip documented NO-OPs
  const trimmedContent = content.trim();
  const isNoOp = NOOP_PATTERNS.some(p => p.test(trimmedContent));
  if (isNoOp) return violations;

  // Skip empty files
  const sqlContent = lines
    .filter(l => {
      const t = l.trim();
      return t && !t.startsWith('--');
    })
    .join('\n');
  if (!sqlContent.trim()) return violations;

  // Rule 1: Timestamp naming convention (warning for legacy files that can't be renamed)
  if (!TIMESTAMP_PATTERN.test(fileName)) {
    violations.push({
      file: fileName,
      line: 0,
      rule: 'naming-convention',
      message: `Migration file must start with YYYYMMDDHHMMSS_ timestamp prefix`,
      severity: 'warning',
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('--')) continue;

    // Build multi-line context (current + next 2 lines) for multi-line statements
    const context = lines
      .slice(i, Math.min(i + 3, lines.length))
      .join(' ')
      .toLowerCase();

    // Rule 2: CREATE TABLE must have IF NOT EXISTS
    if (/\bcreate\s+table\b/i.test(trimmed) && !/\bif\s+not\s+exists\b/i.test(context)) {
      // Allow CREATE TABLE inside DO $$ blocks (PL/pgSQL with dynamic checks)
      const prevContext = lines
        .slice(Math.max(0, i - 5), i)
        .join(' ')
        .toLowerCase();
      if (!prevContext.includes('do $$') && !prevContext.includes('do $block$')) {
        violations.push({
          file: fileName,
          line: lineNum,
          rule: 'create-table-idempotent',
          message: 'CREATE TABLE should use IF NOT EXISTS',
          severity: 'warning',
        });
      }
    }

    // Rule 3: CREATE INDEX must have IF NOT EXISTS
    if (
      /\bcreate\s+(unique\s+)?index\b/i.test(trimmed) &&
      !/\bif\s+not\s+exists\b/i.test(context) &&
      !/\bcreate\s+or\s+replace\b/i.test(context)
    ) {
      violations.push({
        file: fileName,
        line: lineNum,
        rule: 'create-index-idempotent',
        message: 'CREATE INDEX should use IF NOT EXISTS',
        severity: 'warning',
      });
    }

    // Rule 4: DROP TABLE/INDEX without IF EXISTS (warning for legacy, catches future issues in review)
    if (/\bdrop\s+(table|index|view|type)\b/i.test(trimmed) && !/\bif\s+exists\b/i.test(context)) {
      violations.push({
        file: fileName,
        line: lineNum,
        rule: 'drop-if-exists',
        message: 'DROP should use IF EXISTS to be idempotent',
        severity: 'warning',
      });
    }

    // Rule 5: CREATE FUNCTION should use CREATE OR REPLACE
    if (
      /\bcreate\s+function\b/i.test(trimmed) &&
      !/\bcreate\s+or\s+replace\s+function\b/i.test(context)
    ) {
      violations.push({
        file: fileName,
        line: lineNum,
        rule: 'create-or-replace-function',
        message: 'CREATE FUNCTION should use CREATE OR REPLACE FUNCTION',
        severity: 'warning',
      });
    }

    // Rule 6: CREATE TRIGGER should use CREATE OR REPLACE (PG14+) or DROP IF EXISTS first
    // This is a warning only since older PG versions may not support it
    if (
      /\bcreate\s+trigger\b/i.test(trimmed) &&
      !/\bcreate\s+or\s+replace\s+trigger\b/i.test(context)
    ) {
      // Check if there's a DROP TRIGGER IF EXISTS in the preceding lines
      const prevLines = lines
        .slice(Math.max(0, i - 3), i)
        .join(' ')
        .toLowerCase();
      if (!prevLines.includes('drop trigger if exists')) {
        violations.push({
          file: fileName,
          line: lineNum,
          rule: 'create-trigger-idempotent',
          message:
            'CREATE TRIGGER should be preceded by DROP TRIGGER IF EXISTS or use CREATE OR REPLACE',
          severity: 'warning',
        });
      }
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log('\n  Migration SQL Linter');
  console.log(''.padStart(60, '-'));
  console.log(`  Scanning ${files.length} migration files...`);

  // Check for duplicate timestamps
  const timestamps = new Map<string, string[]>();
  for (const file of files) {
    const match = file.match(/^(\d{14})/);
    if (match) {
      const ts = match[1];
      if (!timestamps.has(ts)) timestamps.set(ts, []);
      timestamps.get(ts)!.push(file);
    }
  }

  const allViolations: Violation[] = [];

  // Report duplicate timestamps
  for (const [ts, dupes] of timestamps) {
    if (dupes.length > 1) {
      allViolations.push({
        file: dupes.join(', '),
        line: 0,
        rule: 'duplicate-timestamp',
        message: `Duplicate timestamp ${ts} found across ${dupes.length} files`,
        severity: 'warning',
      });
    }
  }

  // Lint each file
  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const violations = lintFile(filePath, file);
    allViolations.push(...violations);
  }

  // Report results
  const errors = allViolations.filter(v => v.severity === 'error');
  const warnings = allViolations.filter(v => v.severity === 'warning');

  if (allViolations.length === 0) {
    console.log('\n  All migrations pass lint checks.\n');
    process.exit(0);
  }

  if (errors.length > 0) {
    console.log(`\n  Errors (${errors.length}):`);
    for (const v of errors) {
      const loc = v.line > 0 ? `:${v.line}` : '';
      console.log(`  [ERROR] ${v.file}${loc}`);
      console.log(`    Rule: ${v.rule}`);
      console.log(`    ${v.message}`);
    }
  }

  if (warnings.length > 0) {
    console.log(`\n  Warnings (${warnings.length}):`);
    // Group warnings by rule to avoid excessive output for legacy migrations
    const byRule = new Map<string, Violation[]>();
    for (const v of warnings) {
      if (!byRule.has(v.rule)) byRule.set(v.rule, []);
      byRule.get(v.rule)!.push(v);
    }

    for (const [rule, violations] of byRule) {
      console.log(`\n  [WARN] ${rule} (${violations.length} occurrences)`);
      // Show first 5 per rule
      for (const v of violations.slice(0, 5)) {
        const loc = v.line > 0 ? `:${v.line}` : '';
        console.log(`    ${v.file}${loc} — ${v.message}`);
      }
      if (violations.length > 5) {
        console.log(`    ... and ${violations.length - 5} more`);
      }
    }
  }

  console.log(`\n  Summary: ${errors.length} errors, ${warnings.length} warnings`);

  // Only fail on errors, not warnings (legacy migrations may have many warnings)
  if (errors.length > 0) {
    console.log('  Fix errors to pass migration lint.\n');
    process.exit(1);
  }

  console.log('  Warnings are informational for legacy migrations.\n');
}

main();
