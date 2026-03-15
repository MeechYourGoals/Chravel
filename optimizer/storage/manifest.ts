import * as path from 'node:path';
import type { Artifact, Manifest, ManifestEntry, OptimizerConfig } from '../types/index.js';
import { readJsonFile, writeJsonFile, ensureDir } from '../utils/file-io.js';
import { getFileStat } from '../utils/file-io.js';
import { MANIFEST_VERSION } from '../config/defaults.js';

function getManifestPath(config: OptimizerConfig): string {
  return path.join(config.dataDir, 'manifest.json');
}

export function loadManifest(config: OptimizerConfig): Manifest | null {
  return readJsonFile<Manifest>(getManifestPath(config));
}

export function saveManifest(config: OptimizerConfig, manifest: Manifest): void {
  ensureDir(config.dataDir);
  writeJsonFile(getManifestPath(config), manifest);
}

export function buildManifest(artifacts: Artifact[], config: OptimizerConfig): Manifest {
  const entries: ManifestEntry[] = artifacts.map(artifact => {
    const stat = getFileStat(artifact.path);
    return {
      id: artifact.id,
      path: artifact.path,
      relativePath: artifact.relativePath,
      artifactType: artifact.artifactType,
      name: artifact.name,
      hash: artifact.hash,
      lastModified: stat?.mtime ?? new Date().toISOString(),
      scannedAt: new Date().toISOString(),
    };
  });

  return {
    version: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    rootDir: config.rootDir,
    entries,
  };
}
