import * as path from 'node:path';
import type { HistoryEntry, OptimizerConfig } from '../types/index.js';
import { appendLine, readFileSafe, ensureDir } from '../utils/file-io.js';

function getHistoryPath(config: OptimizerConfig): string {
  return path.join(config.dataDir, 'history.jsonl');
}

export function logHistory(config: OptimizerConfig, entry: HistoryEntry): void {
  ensureDir(config.dataDir);
  appendLine(getHistoryPath(config), JSON.stringify(entry));
}

export function getHistory(
  config: OptimizerConfig,
  filter?: { artifactId?: string; action?: string; last?: number },
): HistoryEntry[] {
  const content = readFileSafe(getHistoryPath(config));
  if (!content) return [];

  let entries: HistoryEntry[] = content
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line) as HistoryEntry;
      } catch {
        return null;
      }
    })
    .filter((e): e is HistoryEntry => e !== null);

  if (filter?.artifactId) {
    entries = entries.filter(e => e.artifactId === filter.artifactId);
  }
  if (filter?.action) {
    entries = entries.filter(e => e.action === filter.action);
  }
  if (filter?.last) {
    entries = entries.slice(-filter.last);
  }

  return entries;
}
