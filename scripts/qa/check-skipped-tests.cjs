#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const allowlistPath = path.join(repoRoot, 'qa/journeys/skip-allowlist.json');

const CRITICAL_DIRS = ['e2e', 'src/services/__tests__', 'src/__tests__', 'src/pages/__tests__'];
const skipPattern = /(?:describe|test)\.skip\s*\(|test\.fixme\s*\(/;

function walk(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      results.push(...walk(full));
      continue;
    }
    if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) results.push(full);
  }
  return results;
}

const allowlist = fs.existsSync(allowlistPath)
  ? new Set(JSON.parse(fs.readFileSync(allowlistPath, 'utf8')).allowed || [])
  : new Set();

const skippedFiles = new Set();
for (const relDir of CRITICAL_DIRS) {
  const fullDir = path.join(repoRoot, relDir);
  if (!fs.existsSync(fullDir)) continue;
  for (const testFile of walk(fullDir)) {
    const source = fs.readFileSync(testFile, 'utf8');
    if (skipPattern.test(source)) skippedFiles.add(path.relative(repoRoot, testFile));
  }
}

const unexpected = [...skippedFiles].filter(file => !allowlist.has(file));
if (unexpected.length > 0) {
  console.error('❌ New skipped tests detected in critical suites (not in allowlist):');
  for (const file of unexpected.sort()) console.error(`  - ${file}`);
  console.error(
    '\nIf this is truly temporary, add file to qa/journeys/skip-allowlist.json with a follow-up issue.',
  );
  process.exit(1);
}

const staleAllowlist = [...allowlist].filter(file => !skippedFiles.has(file));
if (staleAllowlist.length > 0) {
  console.warn('⚠️ Skip allowlist has stale entries (good cleanup opportunity):');
  for (const file of staleAllowlist.sort()) console.warn(`  - ${file}`);
}

console.log(`✅ Skip policy validated (${skippedFiles.size} files currently skipped).`);
