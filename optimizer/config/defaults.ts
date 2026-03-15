import * as path from 'node:path';
import type { OptimizerConfig, RubricDimension } from '../types/index.js';

export function getDefaultConfig(rootDir: string): OptimizerConfig {
  return {
    rootDir,
    scanDirs: ['.claude/skills', '.claude/plugins', '.claude/commands', '.claude/output-styles'],
    includeGlobs: ['**/*.md', '**/*.mdx', '**/*.yaml', '**/*.yml', '**/*.json'],
    excludeGlobs: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/marketplace.json'],
    supportedExtensions: ['.md', '.mdx', '.yaml', '.yml', '.json'],
    dataDir: path.join(rootDir, 'optimizer', '.data'),
    reportsDir: path.join(rootDir, 'reports', 'optimizer'),
    knowledgeDir: path.join(rootDir, 'optimizer_knowledge'),
    dryRun: true,
    verbose: false,
  };
}

export const RUBRIC_DIMENSIONS: RubricDimension[] = [
  { id: 'clarity', name: 'Clarity', weight: 0.1 },
  { id: 'specificity', name: 'Specificity', weight: 0.08 },
  { id: 'concision', name: 'Concision', weight: 0.06 },
  { id: 'determinism', name: 'Determinism', weight: 0.07 },
  { id: 'structure', name: 'Structure', weight: 0.08 },
  { id: 'trigger_precision', name: 'Trigger Precision', weight: 0.08 },
  { id: 'output_contract', name: 'Output Contract', weight: 0.07 },
  { id: 'tool_use', name: 'Tool-Use Correctness', weight: 0.06 },
  { id: 'edge_cases', name: 'Edge-Case Handling', weight: 0.06 },
  { id: 'safety', name: 'Safety/Guardrails', weight: 0.08 },
  { id: 'consistency', name: 'Internal Consistency', weight: 0.06 },
  { id: 'redundancy', name: 'Redundancy', weight: 0.05 },
  { id: 'maintainability', name: 'Maintainability', weight: 0.05 },
  { id: 'testability', name: 'Testability', weight: 0.05 },
  { id: 'rewrite_risk', name: 'Rewrite Risk', weight: 0.05 },
];

export const MANIFEST_VERSION = '1.0.0';
