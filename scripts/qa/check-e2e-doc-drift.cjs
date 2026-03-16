#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const readmePath = path.join(repoRoot, 'e2e/README.md');

if (!fs.existsSync(readmePath)) {
  console.error('❌ e2e/README.md is missing');
  process.exit(1);
}

const readme = fs.readFileSync(readmePath, 'utf8');
const files = fs.readdirSync(path.join(repoRoot, 'e2e'));

const hasStatusSections =
  readme.includes('## ✅ Implemented suites (source of truth)') &&
  readme.includes('## 🗺️ Planned suites (not yet implemented)');

if (!hasStatusSections) {
  console.error(
    '❌ e2e/README.md must contain implemented/planned status sections to avoid confidence drift.',
  );
  process.exit(1);
}

const requiredImplementedEntries = [
  'e2e/specs/auth/full-auth.spec.ts',
  'e2e/specs/trips/trip-crud.spec.ts',
  'e2e/specs/rls/trip-rls.spec.ts',
  'e2e/specs/smoke.spec.ts',
];

const missing = requiredImplementedEntries.filter(entry => !readme.includes(entry));
if (missing.length > 0) {
  console.error('❌ e2e/README.md missing required implemented suite entries:');
  for (const entry of missing) console.error(`  - ${entry}`);
  process.exit(1);
}

if (!files.includes('specs')) {
  console.error('❌ e2e/specs directory missing');
  process.exit(1);
}

console.log('✅ E2E documentation drift check passed.');
