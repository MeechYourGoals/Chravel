import * as path from 'node:path';
import { parseArgs, getFlag, hasFlag } from './args.js';
import { getDefaultConfig } from '../config/defaults.js';
import { crawl, detectDuplicateNames } from '../core/crawler.js';
import { parseArtifact } from '../core/parser.js';
import { evaluateArtifact, scoreToGrade } from '../core/evaluator.js';
import { buildReportData, renderMarkdownReport } from '../core/reporter.js';
import { rewriteArtifact } from '../core/rewriter.js';
import { validateArtifact, validateRewrite } from '../core/validator.js';
import { buildManifest, saveManifest, loadManifest } from '../storage/manifest.js';
import { createBackup, getBackups } from '../storage/backups.js';
import { logHistory, getHistory } from '../storage/history.js';
import { recordDecision } from '../storage/learning.js';
import { writeFileAtomic, writeJsonFile, ensureDir, readFileSync } from '../utils/file-io.js';
import * as log from '../utils/logging.js';
import type { Artifact, ArtifactScore, OptimizerConfig } from '../types/index.js';

function resolveRootDir(): string {
  return process.env.OPTIMIZER_ROOT ?? process.cwd();
}

function getConfig(args: ReturnType<typeof parseArgs>): OptimizerConfig {
  const rootDir = resolveRootDir();
  const config = getDefaultConfig(rootDir);
  if (hasFlag(args, 'verbose')) {
    config.verbose = true;
    log.setVerbose(true);
  }
  if (hasFlag(args, 'dry-run')) config.dryRun = true;
  if (hasFlag(args, 'no-dry-run')) config.dryRun = false;
  return config;
}

function scanAndParse(config: OptimizerConfig): Artifact[] {
  const crawlResults = crawl(config);
  log.info(`Found ${crawlResults.length} artifact files`);

  const artifacts: Artifact[] = [];
  for (const result of crawlResults) {
    try {
      const artifact = parseArtifact(result.path, result.relativePath, result.artifactType);
      artifacts.push(artifact);
      log.verbose(
        `Parsed: ${artifact.name} (${artifact.artifactType}) — confidence: ${artifact.parseConfidence}`,
      );
    } catch (err) {
      log.warn(`Failed to parse ${result.relativePath}: ${err}`);
    }
  }
  return artifacts;
}

// --- Commands ---

function cmdScan(config: OptimizerConfig): void {
  log.heading('Scan');
  const artifacts = scanAndParse(config);
  const manifest = buildManifest(artifacts, config);
  saveManifest(config, manifest);

  const dupes = detectDuplicateNames(crawl(config));
  if (dupes.length > 0) {
    log.warn('Duplicate artifact names detected:');
    for (const d of dupes) {
      log.warn(`  ${d.name}: ${d.paths.join(', ')}`);
    }
  }

  log.success(`Manifest saved with ${manifest.entries.length} artifacts`);
  log.table(
    ['ID', 'Name', 'Type', 'Path'],
    manifest.entries.map(e => [e.id.slice(0, 8), e.name, e.artifactType, e.relativePath]),
  );

  logHistory(config, {
    timestamp: new Date().toISOString(),
    action: 'scan',
    artifactId: '*',
    artifactName: '*',
    oldHash: null,
    newHash: null,
    result: 'success',
    details: { count: manifest.entries.length },
  });
}

function cmdAnalyze(config: OptimizerConfig, args: ReturnType<typeof parseArgs>): void {
  log.heading('Analyze');
  const artifacts = scanAndParse(config);
  const scores: ArtifactScore[] = artifacts.map(a => evaluateArtifact(a));

  const format = getFlag(args, 'format', 'both');
  const reportData = buildReportData(scores);

  if (format === 'md' || format === 'both') {
    const mdReport = renderMarkdownReport(reportData);
    ensureDir(config.reportsDir);
    const mdPath = path.join(config.reportsDir, `${Date.now()}-analysis.md`);
    writeFileAtomic(mdPath, mdReport);
    log.success(`Markdown report: ${mdPath}`);
  }

  if (format === 'json' || format === 'both') {
    ensureDir(config.reportsDir);
    const jsonPath = path.join(config.reportsDir, `${Date.now()}-analysis.json`);
    writeJsonFile(jsonPath, reportData);
    log.success(`JSON report: ${jsonPath}`);
  }

  // Print summary
  log.heading('Summary');
  log.info(`Total: ${reportData.summary.totalArtifacts} artifacts`);
  log.info(`Average score: ${reportData.summary.averageScore}/100`);
  log.info(
    `Grade distribution: ${Object.entries(reportData.summary.gradeDistribution)
      .map(([g, c]) => `${g}:${c}`)
      .join(' ')}`,
  );

  if (reportData.summary.topIssues.length > 0) {
    log.heading('Top Issues');
    for (const issue of reportData.summary.topIssues.slice(0, 10)) {
      log.info(`  [${issue.severity}] ${issue.message} (${issue.count} artifacts)`);
    }
  }

  // Print lowest scoring
  const sorted = [...scores].sort((a, b) => a.overallScore - b.overallScore);
  log.heading('Lowest Scoring Artifacts');
  log.table(
    ['Name', 'Score', 'Grade', 'Risk', 'Issues'],
    sorted
      .slice(0, 10)
      .map(s => [
        s.artifactName,
        String(s.overallScore),
        scoreToGrade(s.overallScore),
        s.rewriteRisk,
        String(s.issues.length),
      ]),
  );

  logHistory(config, {
    timestamp: new Date().toISOString(),
    action: 'analyze',
    artifactId: '*',
    artifactName: '*',
    oldHash: null,
    newHash: null,
    result: 'success',
    details: { count: scores.length, avgScore: reportData.summary.averageScore },
  });
}

function cmdRewrite(config: OptimizerConfig, args: ReturnType<typeof parseArgs>): void {
  log.heading('Rewrite');
  const targetId = args.positional[0];
  if (!targetId) {
    log.error('Usage: optimize rewrite <artifact-id-prefix>');
    process.exit(1);
  }

  const profile = getFlag(args, 'profile', 'minimal') as 'low' | 'medium' | 'high';
  const riskMap: Record<string, 'low' | 'medium' | 'high'> = {
    minimal: 'low',
    moderate: 'medium',
    aggressive: 'high',
  };
  const maxRisk = riskMap[profile] ?? 'low';

  const artifacts = scanAndParse(config);
  const target = artifacts.find(a => a.id.startsWith(targetId) || a.name === targetId);

  if (!target) {
    log.error(`Artifact not found: ${targetId}`);
    log.info('Run "optimize scan" to see available artifact IDs');
    process.exit(1);
  }

  const score = evaluateArtifact(target);
  const result = rewriteArtifact(target, score, maxRisk);

  if (!result) {
    log.info(`No rewrites applicable for "${target.name}" at risk level "${profile}"`);
    return;
  }

  log.info(`Artifact: ${target.name}`);
  log.info(`Current score: ${score.overallScore}/100`);
  log.info(`Risk: ${result.risk}`);
  log.info(`Human review required: ${result.requiresHumanReview}`);
  log.info(`Changes: ${result.changes.length}`);
  log.log('');
  log.info('Rationale:');
  log.log(result.rationale);
  log.log('');
  log.info('Diff:');
  log.log(result.diff);

  logHistory(config, {
    timestamp: new Date().toISOString(),
    action: 'rewrite',
    artifactId: target.id,
    artifactName: target.name,
    oldHash: target.hash,
    newHash: null,
    result: 'success',
    details: { risk: result.risk, changesCount: result.changes.length },
  });
}

function cmdValidate(config: OptimizerConfig, args: ReturnType<typeof parseArgs>): void {
  log.heading('Validate');
  const targetId = args.positional[0];

  const artifacts = scanAndParse(config);
  const targets = targetId
    ? artifacts.filter(a => a.id.startsWith(targetId) || a.name === targetId)
    : artifacts;

  if (targets.length === 0) {
    log.error(`Artifact not found: ${targetId}`);
    process.exit(1);
  }

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const artifact of targets) {
    const result = validateArtifact(artifact);
    if (result.errors.length > 0 || result.warnings.length > 0) {
      log.log(`\n${artifact.name} (${artifact.relativePath}):`);
      for (const err of result.errors) {
        log.error(`  [${err.rule}] ${err.message}`);
        totalErrors++;
      }
      for (const warn of result.warnings) {
        log.warn(`  [${warn.rule}] ${warn.message}`);
        totalWarnings++;
      }
    }
  }

  log.log('');
  log.info(
    `Validated ${targets.length} artifacts: ${totalErrors} errors, ${totalWarnings} warnings`,
  );

  if (totalErrors > 0) {
    process.exitCode = 1;
  }
}

function cmdApply(config: OptimizerConfig, args: ReturnType<typeof parseArgs>): void {
  log.heading('Apply');
  const targetId = args.positional[0];
  if (!targetId) {
    log.error('Usage: optimize apply <artifact-id-prefix>');
    process.exit(1);
  }

  const profile = getFlag(args, 'profile', 'minimal') as 'low' | 'medium' | 'high';
  const riskMap: Record<string, 'low' | 'medium' | 'high'> = {
    minimal: 'low',
    moderate: 'medium',
    aggressive: 'high',
  };
  const maxRisk = riskMap[profile] ?? 'low';

  const artifacts = scanAndParse(config);
  const target = artifacts.find(a => a.id.startsWith(targetId) || a.name === targetId);

  if (!target) {
    log.error(`Artifact not found: ${targetId}`);
    process.exit(1);
  }

  const score = evaluateArtifact(target);
  const result = rewriteArtifact(target, score, maxRisk);

  if (!result) {
    log.info(`No rewrites applicable for "${target.name}"`);
    return;
  }

  if (config.dryRun) {
    log.info('[DRY RUN] Would apply the following changes:');
    log.log(result.diff);
    log.info('Run with --no-dry-run to apply');
    return;
  }

  // Validate before applying
  const candidateArtifact: Artifact = {
    ...target,
    rawContent: result.rewritten,
    body: result.rewritten,
    hash: '',
  };
  const validation = validateRewrite(target, candidateArtifact);
  if (!validation.safeToApply) {
    log.error('Validation failed — not safe to apply:');
    for (const err of validation.errors) {
      log.error(`  ${err.message}`);
    }
    return;
  }

  // Create backup
  const backup = createBackup(target, config, 'pre-rewrite');
  log.info(`Backup created: ${backup.backupPath}`);

  // Apply
  writeFileAtomic(target.path, result.rewritten);
  log.success(`Applied rewrite to ${target.relativePath}`);

  recordDecision(config, {
    artifactId: target.id,
    timestamp: new Date().toISOString(),
    action: 'accept',
    profile,
    scoreImprovement: null,
    notes: result.rationale,
  });

  logHistory(config, {
    timestamp: new Date().toISOString(),
    action: 'apply',
    artifactId: target.id,
    artifactName: target.name,
    oldHash: target.hash,
    newHash: null,
    result: 'success',
    details: { backup: backup.backupPath, risk: result.risk },
  });
}

function cmdBatch(config: OptimizerConfig, args: ReturnType<typeof parseArgs>): void {
  log.heading('Batch');
  const safeOnly = hasFlag(args, 'safe-only');
  const limit = parseInt(getFlag(args, 'limit', '999'), 10);

  const artifacts = scanAndParse(config);
  const maxRisk: 'low' | 'medium' | 'high' = safeOnly ? 'low' : 'medium';

  let applied = 0;
  let skipped = 0;

  for (const artifact of artifacts.slice(0, limit)) {
    const score = evaluateArtifact(artifact);
    const result = rewriteArtifact(artifact, score, maxRisk);
    if (!result) {
      skipped++;
      continue;
    }

    if (config.dryRun) {
      log.info(
        `[DRY RUN] ${artifact.name}: ${result.changes.length} changes (risk: ${result.risk})`,
      );
      applied++;
      continue;
    }

    const backup = createBackup(artifact, config, 'batch-rewrite');
    writeFileAtomic(artifact.path, result.rewritten);
    log.success(`Applied: ${artifact.name} (backup: ${backup.backupPath})`);
    applied++;
  }

  log.log('');
  log.info(`Batch complete: ${applied} modified, ${skipped} skipped`);
}

function cmdHistory(config: OptimizerConfig, args: ReturnType<typeof parseArgs>): void {
  log.heading('History');
  const artifactId = getFlag(args, 'artifact', '');
  const last = parseInt(getFlag(args, 'last', '20'), 10);

  const entries = getHistory(config, {
    artifactId: artifactId || undefined,
    last,
  });

  if (entries.length === 0) {
    log.info('No history entries found');
    return;
  }

  log.table(
    ['Timestamp', 'Action', 'Artifact', 'Result'],
    entries.map(e => [new Date(e.timestamp).toLocaleString(), e.action, e.artifactName, e.result]),
  );
}

function cmdRollback(config: OptimizerConfig, args: ReturnType<typeof parseArgs>): void {
  log.heading('Rollback');
  const targetId = args.positional[0];
  if (!targetId) {
    log.error('Usage: optimize rollback <artifact-id-prefix>');
    process.exit(1);
  }

  const backups = getBackups(targetId, config);
  if (backups.length === 0) {
    // Try matching by name via manifest
    const manifest = loadManifest(config);
    const entry = manifest?.entries.find(e => e.name === targetId || e.id.startsWith(targetId));
    if (entry) {
      const entryBackups = getBackups(entry.id, config);
      if (entryBackups.length === 0) {
        log.error(`No backups found for "${targetId}"`);
        process.exit(1);
      }
    } else {
      log.error(`No backups found for "${targetId}"`);
      process.exit(1);
    }
  }

  const latest = backups[0];
  if (config.dryRun) {
    log.info(`[DRY RUN] Would restore ${latest.originalPath} from ${latest.backupPath}`);
    return;
  }

  const content = readFileSync(latest.backupPath);
  writeFileAtomic(latest.originalPath, content);
  log.success(`Restored ${latest.originalPath} from backup (${latest.timestamp})`);

  logHistory(config, {
    timestamp: new Date().toISOString(),
    action: 'rollback',
    artifactId: latest.artifactId,
    artifactName: latest.originalPath,
    oldHash: null,
    newHash: latest.hash,
    result: 'success',
    details: { backupTimestamp: latest.timestamp },
  });
}

function cmdReport(config: OptimizerConfig, args: ReturnType<typeof parseArgs>): void {
  log.heading('Report');
  const format = getFlag(args, 'format', 'both');
  const outputDir = getFlag(args, 'output', config.reportsDir);

  const artifacts = scanAndParse(config);
  const scores = artifacts.map(a => evaluateArtifact(a));
  const reportData = buildReportData(scores);

  ensureDir(outputDir);

  if (format === 'md' || format === 'both') {
    const mdReport = renderMarkdownReport(reportData);
    const mdPath = path.join(outputDir, `${Date.now()}-report.md`);
    writeFileAtomic(mdPath, mdReport);
    log.success(`Report: ${mdPath}`);
  }

  if (format === 'json' || format === 'both') {
    const jsonPath = path.join(outputDir, `${Date.now()}-report.json`);
    writeJsonFile(jsonPath, reportData);
    log.success(`Report: ${jsonPath}`);
  }
}

function cmdHelp(): void {
  log.log(`
Skill Optimizer — CLI for analyzing and improving prompt artifacts

Usage: npx tsx optimizer/cli/index.ts <command> [options]

Commands:
  scan                    Crawl directories and build artifact manifest
  analyze                 Score all artifacts against quality rubric
  rewrite <id|name>       Generate improved version of an artifact
  validate [id|name]      Lint and validate artifact structure
  apply <id|name>         Apply a proposed rewrite (backup first)
  batch                   Process multiple artifacts
  history                 Show change log
  rollback <id|name>      Revert artifact to previous version
  report                  Generate full analysis report
  help                    Show this help

Global Options:
  --verbose               Show detailed output
  --dry-run               Preview changes without applying (default: on)
  --no-dry-run            Actually apply changes

Command Options:
  analyze:
    --format md|json|both   Output format (default: both)
    --min-score <n>         Filter by minimum score

  rewrite / apply:
    --profile minimal|moderate|aggressive   Rewrite aggressiveness (default: minimal)

  batch:
    --safe-only             Only apply low-risk changes
    --limit <n>             Max artifacts to process

  history:
    --artifact <id>         Filter by artifact
    --last <n>              Show last N entries (default: 20)

  report:
    --format md|json|both   Output format (default: both)
    --output <dir>          Output directory
`);
}

// --- Main ---

function main(): void {
  const args = parseArgs(process.argv);
  const config = getConfig(args);

  const commands: Record<string, () => void> = {
    scan: () => cmdScan(config),
    analyze: () => cmdAnalyze(config, args),
    rewrite: () => cmdRewrite(config, args),
    validate: () => cmdValidate(config, args),
    apply: () => cmdApply(config, args),
    batch: () => cmdBatch(config, args),
    history: () => cmdHistory(config, args),
    rollback: () => cmdRollback(config, args),
    report: () => cmdReport(config, args),
    help: () => cmdHelp(),
  };

  const handler = commands[args.command];
  if (!handler) {
    log.error(`Unknown command: ${args.command}`);
    cmdHelp();
    process.exit(1);
  }

  handler();
}

main();
