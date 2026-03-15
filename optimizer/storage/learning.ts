import * as path from 'node:path';
import type { LearningEntry, OptimizerConfig } from '../types/index.js';
import { readJsonFile, writeJsonFile, ensureDir } from '../utils/file-io.js';

interface LearningStore {
  entries: LearningEntry[];
  stats: {
    totalAccepted: number;
    totalRejected: number;
    totalSkipped: number;
  };
}

function getLearningPath(config: OptimizerConfig): string {
  return path.join(config.dataDir, 'learning.json');
}

function loadStore(config: OptimizerConfig): LearningStore {
  return (
    readJsonFile<LearningStore>(getLearningPath(config)) ?? {
      entries: [],
      stats: { totalAccepted: 0, totalRejected: 0, totalSkipped: 0 },
    }
  );
}

function saveStore(config: OptimizerConfig, store: LearningStore): void {
  ensureDir(config.dataDir);
  writeJsonFile(getLearningPath(config), store);
}

export function recordDecision(config: OptimizerConfig, entry: LearningEntry): void {
  const store = loadStore(config);
  store.entries.push(entry);

  if (entry.action === 'accept') store.stats.totalAccepted++;
  else if (entry.action === 'reject') store.stats.totalRejected++;
  else store.stats.totalSkipped++;

  saveStore(config, store);
}

export function getLearningStats(config: OptimizerConfig): LearningStore['stats'] {
  return loadStore(config).stats;
}

export function getArtifactHistory(config: OptimizerConfig, artifactId: string): LearningEntry[] {
  const store = loadStore(config);
  return store.entries.filter(e => e.artifactId === artifactId);
}
