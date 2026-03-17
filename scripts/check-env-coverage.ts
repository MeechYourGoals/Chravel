#!/usr/bin/env node
/**
 * Edge Function Environment Coverage Scanner
 *
 * Scans all Supabase edge functions for Deno.env.get() calls and verifies
 * each referenced secret is documented in .env.example or .env.production.example.
 *
 * Usage:
 *   npx tsx scripts/check-env-coverage.ts
 *   npx tsx scripts/check-env-coverage.ts --strict  # exit 1 on any undocumented var
 *
 * Exit codes:
 *   0 = all env vars documented (or only Supabase built-ins undocumented)
 *   1 = undocumented env vars found (strict mode)
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const FUNCTIONS_DIR = path.resolve(process.cwd(), 'supabase/functions');
const ENV_EXAMPLE = path.resolve(process.cwd(), '.env.example');
const ENV_PROD_EXAMPLE = path.resolve(process.cwd(), '.env.production.example');

// Built-in Supabase secrets that are always available — no need to document
const SUPABASE_BUILTINS = new Set([
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_DB_URL',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findTsFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTsFiles(fullPath));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractEnvVars(filePath: string): Array<{ varName: string; line: number }> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results: Array<{ varName: string; line: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    // Match Deno.env.get('VAR_NAME') or Deno.env.get("VAR_NAME")
    const regex = /Deno\.env\.get\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(lines[i])) !== null) {
      results.push({ varName: match[1], line: i + 1 });
    }
  }
  return results;
}

function loadDocumentedVars(filePath: string): Set<string> {
  const vars = new Set<string>();
  if (!fs.existsSync(filePath)) return vars;

  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    if (key) vars.add(key);
  }
  return vars;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const strict = process.argv.includes('--strict');

  // Collect all env vars from edge functions
  const files = findTsFiles(FUNCTIONS_DIR);
  const envUsages = new Map<string, Array<{ file: string; line: number }>>();

  for (const file of files) {
    const vars = extractEnvVars(file);
    for (const { varName, line } of vars) {
      const relPath = path.relative(process.cwd(), file);
      if (!envUsages.has(varName)) {
        envUsages.set(varName, []);
      }
      envUsages.get(varName)!.push({ file: relPath, line });
    }
  }

  // Load documented vars
  const documented = new Set<string>();
  for (const v of loadDocumentedVars(ENV_EXAMPLE)) documented.add(v);
  for (const v of loadDocumentedVars(ENV_PROD_EXAMPLE)) documented.add(v);

  // Also count VITE_ prefixed vars as documented (frontend vars, not relevant here)
  // and Supabase builtins
  const allVarNames = Array.from(envUsages.keys()).sort();

  const undocumented: Array<{ varName: string; usages: Array<{ file: string; line: number }> }> =
    [];
  const builtins: string[] = [];
  const documentedVars: string[] = [];

  for (const varName of allVarNames) {
    if (SUPABASE_BUILTINS.has(varName)) {
      builtins.push(varName);
    } else if (documented.has(varName) || documented.has(`VITE_${varName}`)) {
      documentedVars.push(varName);
    } else {
      undocumented.push({ varName, usages: envUsages.get(varName)! });
    }
  }

  // Report
  console.log('\n  Edge Function Env Coverage Scanner');
  console.log(''.padStart(60, '-'));
  console.log(`  Total unique env vars found: ${allVarNames.length}`);
  console.log(`  Supabase built-ins (always available): ${builtins.length}`);
  console.log(`  Documented in .env examples: ${documentedVars.length}`);
  console.log(`  Undocumented: ${undocumented.length}`);
  console.log(''.padStart(60, '-'));

  if (undocumented.length > 0) {
    console.log('\n  Undocumented env vars:');
    for (const { varName, usages } of undocumented) {
      console.log(`\n  ${varName}`);
      for (const { file, line } of usages.slice(0, 3)) {
        console.log(`    ${file}:${line}`);
      }
      if (usages.length > 3) {
        console.log(`    ... and ${usages.length - 3} more`);
      }
    }

    if (strict) {
      console.log('\n  Add missing vars to .env.example or .env.production.example to fix.\n');
      process.exit(1);
    } else {
      console.log('\n  Run with --strict to fail on undocumented vars.\n');
    }
  } else {
    console.log('\n  All edge function env vars are documented.\n');
  }
}

main();
