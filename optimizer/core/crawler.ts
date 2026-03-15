import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ArtifactType, OptimizerConfig } from '../types/index.js';
import { verbose } from '../utils/logging.js';

export interface CrawlResult {
  path: string;
  relativePath: string;
  artifactType: ArtifactType;
  extension: string;
}

function inferArtifactType(relativePath: string, extension: string): ArtifactType {
  if (relativePath.includes('/skills/') && extension === '.md') return 'skill';
  if (relativePath.includes('/commands/') && extension === '.md') return 'command';
  if (relativePath.includes('/output-styles/') && extension === '.md') return 'output-style';
  if (extension === '.json' && path.basename(relativePath) === 'plugin.json') return 'plugin';
  return 'config';
}

function isExcluded(relativePath: string, excludeGlobs: string[]): boolean {
  for (const glob of excludeGlobs) {
    // Handle **/dir/** pattern — match if path contains /dir/
    if (glob.startsWith('**/') && glob.endsWith('/**')) {
      const segment = glob.slice(3, -3);
      if (relativePath.includes(`/${segment}/`) || relativePath.startsWith(`${segment}/`))
        return true;
    }
    // Handle **/filename pattern — match if path ends with filename
    else if (glob.startsWith('**/')) {
      const filename = glob.slice(3);
      if (relativePath.endsWith(filename) || relativePath.endsWith(`/${filename}`)) return true;
    }
    // Exact match
    else if (relativePath === glob) {
      return true;
    }
  }
  return false;
}

function walkDirectory(dir: string, rootDir: string, config: OptimizerConfig): CrawlResult[] {
  const results: CrawlResult[] = [];

  if (!fs.existsSync(dir)) {
    verbose(`Directory not found: ${dir}`);
    return results;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.claude') continue;
    if (entry.name === 'node_modules') continue;

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);

    if (isExcluded(relativePath, config.excludeGlobs)) {
      verbose(`Excluded: ${relativePath}`);
      continue;
    }

    if (entry.isDirectory()) {
      results.push(...walkDirectory(fullPath, rootDir, config));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!config.supportedExtensions.includes(ext)) continue;

      const artifactType = inferArtifactType(relativePath, ext);
      verbose(`Found: ${relativePath} (${artifactType})`);

      results.push({
        path: fullPath,
        relativePath,
        artifactType,
        extension: ext,
      });
    }
  }

  return results;
}

export function crawl(config: OptimizerConfig): CrawlResult[] {
  const allResults: CrawlResult[] = [];
  const seen = new Set<string>();

  for (const scanDir of config.scanDirs) {
    const fullDir = path.join(config.rootDir, scanDir);
    const results = walkDirectory(fullDir, config.rootDir, config);

    for (const result of results) {
      if (!seen.has(result.path)) {
        seen.add(result.path);
        allResults.push(result);
      }
    }
  }

  return allResults;
}

export function detectDuplicateNames(
  results: CrawlResult[],
): Array<{ name: string; paths: string[] }> {
  const nameMap = new Map<string, string[]>();

  for (const result of results) {
    const name = path.basename(path.dirname(result.path));
    const existing = nameMap.get(name) ?? [];
    existing.push(result.relativePath);
    nameMap.set(name, existing);
  }

  return Array.from(nameMap.entries())
    .filter(([, paths]) => paths.length > 1)
    .map(([name, paths]) => ({ name, paths }));
}
