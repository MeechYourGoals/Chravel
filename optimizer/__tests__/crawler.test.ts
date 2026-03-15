import { describe, it, expect } from 'vitest';
import { crawl, detectDuplicateNames } from '../core/crawler.js';
import { getDefaultConfig } from '../config/defaults.js';
import * as path from 'node:path';

describe('crawl', () => {
  it('finds artifacts in .claude directory', () => {
    const rootDir = path.resolve(process.cwd());
    const config = getDefaultConfig(rootDir);
    const results = crawl(config);

    expect(results.length).toBeGreaterThan(0);

    const skills = results.filter(r => r.artifactType === 'skill');
    expect(skills.length).toBeGreaterThan(0);

    const commands = results.filter(r => r.artifactType === 'command');
    expect(commands.length).toBeGreaterThan(0);

    const plugins = results.filter(r => r.artifactType === 'plugin');
    expect(plugins.length).toBeGreaterThan(0);
  });

  it('excludes marketplace.json files', () => {
    const rootDir = path.resolve(process.cwd());
    const config = getDefaultConfig(rootDir);
    const results = crawl(config);

    const marketplaceFiles = results.filter(r => r.path.includes('marketplace.json'));
    expect(marketplaceFiles.length).toBe(0);
  });
});

describe('detectDuplicateNames', () => {
  it('detects duplicate directory names', () => {
    const results = [
      {
        path: '/a/skills/test/SKILL.md',
        relativePath: 'skills/test/SKILL.md',
        artifactType: 'skill' as const,
        extension: '.md',
      },
      {
        path: '/b/skills/test/SKILL.md',
        relativePath: 'plugins/x/skills/test/SKILL.md',
        artifactType: 'skill' as const,
        extension: '.md',
      },
    ];

    const dupes = detectDuplicateNames(results);
    expect(dupes.length).toBe(1);
    expect(dupes[0].name).toBe('test');
  });
});
