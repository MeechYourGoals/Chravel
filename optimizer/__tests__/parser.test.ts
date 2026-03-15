import { describe, it, expect } from 'vitest';
import { parseArtifact } from '../core/parser.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

function createTempFile(content: string, filename: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'optimizer-test-'));
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

describe('parseArtifact', () => {
  it('parses skill with valid frontmatter', () => {
    const content = `---
name: my-skill
description: Use when testing parser.
---

# My Skill

## Overview
This is a test skill.

## When to Use
- When testing
`;
    const filePath = createTempFile(content, 'SKILL.md');
    const artifact = parseArtifact(filePath, '.claude/skills/my-skill/SKILL.md', 'skill');

    expect(artifact.name).toBe('my-skill');
    expect(artifact.frontmatter?.name).toBe('my-skill');
    expect(artifact.frontmatter?.description).toBe('Use when testing parser.');
    expect(artifact.sections).toContain('Overview');
    expect(artifact.sections).toContain('When to Use');
    expect(artifact.parseConfidence).toBe(1.0);
    expect(artifact.issues.length).toBe(0);
  });

  it('detects missing frontmatter on skill', () => {
    const content = `# No Frontmatter Skill

Just some content.
`;
    const filePath = createTempFile(content, 'SKILL.md');
    const artifact = parseArtifact(filePath, '.claude/skills/bad/SKILL.md', 'skill');

    expect(artifact.frontmatter).toBeNull();
    expect(artifact.parseConfidence).toBe(0.6);
    expect(artifact.issues.some(i => i.message === 'Missing YAML frontmatter')).toBe(true);
  });

  it('warns when description does not start with Use when', () => {
    const content = `---
name: test-skill
description: This skill does something.
---

# Test
`;
    const filePath = createTempFile(content, 'SKILL.md');
    const artifact = parseArtifact(filePath, '.claude/skills/test/SKILL.md', 'skill');

    expect(artifact.issues.some(i => i.message.includes('should start with'))).toBe(true);
  });

  it('parses command files (no frontmatter)', () => {
    const content = `Perform a full audit of the system.

1. Check dependencies
2. Review security
3. Produce report
`;
    const filePath = createTempFile(content, 'audit.md');
    const artifact = parseArtifact(filePath, '.claude/commands/audit.md', 'command');

    expect(artifact.artifactType).toBe('command');
    expect(artifact.name).toBe('audit');
    expect(artifact.frontmatter).toBeNull();
    expect(artifact.issues.length).toBe(0);
  });

  it('parses plugin.json', () => {
    const content = JSON.stringify({
      name: 'test-plugin',
      description: 'A test plugin',
      version: '1.0.0',
      skills: ['skill-a', 'skill-b'],
    });
    const filePath = createTempFile(content, 'plugin.json');
    const artifact = parseArtifact(filePath, '.claude/plugins/test/plugin.json', 'plugin');

    expect(artifact.artifactType).toBe('plugin');
    expect(artifact.frontmatter?.name).toBe('test-plugin');
    expect(artifact.frontmatter?.version).toBe('1.0.0');
    expect(artifact.issues.length).toBe(0);
  });

  it('detects invalid JSON in plugin', () => {
    const filePath = createTempFile('{ invalid json', 'plugin.json');
    const artifact = parseArtifact(filePath, '.claude/plugins/bad/plugin.json', 'plugin');

    expect(artifact.parseConfidence).toBe(0.2);
    expect(artifact.issues.some(i => i.message === 'Invalid JSON')).toBe(true);
  });
});
