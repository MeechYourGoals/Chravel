import * as path from 'node:path';
import type { Artifact, BackupRecord, OptimizerConfig } from '../types/index.js';
import {
  copyFile,
  ensureDir,
  readFileSafe,
  writeFileAtomic,
  writeJsonFile,
  readJsonFile,
} from '../utils/file-io.js';

function getBackupsDir(config: OptimizerConfig): string {
  return path.join(config.dataDir, 'backups');
}

function getBackupIndexPath(config: OptimizerConfig): string {
  return path.join(config.dataDir, 'backup-index.json');
}

export function createBackup(
  artifact: Artifact,
  config: OptimizerConfig,
  reason: string,
): BackupRecord {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(getBackupsDir(config), artifact.id, timestamp);
  ensureDir(backupDir);

  const ext = path.extname(artifact.path);
  const backupPath = path.join(backupDir, `original${ext}`);
  copyFile(artifact.path, backupPath);

  const record: BackupRecord = {
    artifactId: artifact.id,
    originalPath: artifact.path,
    backupPath,
    timestamp: new Date().toISOString(),
    hash: artifact.hash,
    reason,
  };

  // Append to backup index
  const indexPath = getBackupIndexPath(config);
  const index = readJsonFile<BackupRecord[]>(indexPath) ?? [];
  index.push(record);
  writeJsonFile(indexPath, index);

  return record;
}

export function getBackups(artifactId: string, config: OptimizerConfig): BackupRecord[] {
  const index = readJsonFile<BackupRecord[]>(getBackupIndexPath(config)) ?? [];
  return index
    .filter(b => b.artifactId === artifactId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function restoreBackup(backup: BackupRecord): boolean {
  const content = readFileSafe(backup.backupPath);
  if (content === null) return false;

  writeFileAtomic(backup.originalPath, content);
  return true;
}
