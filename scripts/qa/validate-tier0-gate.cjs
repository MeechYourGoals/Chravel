#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const matrixPath = path.join(repoRoot, 'qa/journeys/tier0.json');

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!fs.existsSync(matrixPath)) {
  fail(`Tier-0 matrix not found at ${path.relative(repoRoot, matrixPath)}`);
}

const raw = fs.readFileSync(matrixPath, 'utf8');
let matrix;
try {
  matrix = JSON.parse(raw);
} catch (error) {
  fail(`Tier-0 matrix is invalid JSON: ${error.message}`);
}

if (!Array.isArray(matrix.journeys) || matrix.journeys.length === 0) {
  fail('Tier-0 matrix must contain at least one journey in journeys[]');
}

const missingFiles = [];
const skippedTests = [];
const allowSkippedFiles = new Set(matrix.allowSkippedFiles || []);

for (const journey of matrix.journeys) {
  if (!journey?.id || !journey?.name) {
    fail('Each Tier-0 journey must define id and name');
  }

  if (!Array.isArray(journey.requiredFiles) || journey.requiredFiles.length === 0) {
    fail(`Journey ${journey.id} must define at least one required file`);
  }

  for (const relativeFile of journey.requiredFiles) {
    const filePath = path.join(repoRoot, relativeFile);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(`${journey.id}: ${relativeFile}`);
      continue;
    }

    const source = fs.readFileSync(filePath, 'utf8');
    const hasSkip = /(?:describe|test)\.skip\s*\(/.test(source) || /test\.fixme\s*\(/.test(source);
    if (hasSkip && !allowSkippedFiles.has(relativeFile)) {
      skippedTests.push(`${journey.id}: ${relativeFile}`);
    }
  }
}

if (missingFiles.length > 0) {
  fail(`Tier-0 matrix has missing files:\n${missingFiles.map(item => `  - ${item}`).join('\n')}`);
}

if (skippedTests.length > 0) {
  fail(
    `Tier-0 coverage includes skipped/fixme tests (not allowed):\n${skippedTests
      .map(item => `  - ${item}`)
      .join('\n')}`,
  );
}

console.log(`✅ Tier-0 gate validated (${matrix.journeys.length} journeys).`);
