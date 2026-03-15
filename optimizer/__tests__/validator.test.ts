import { describe, it, expect } from 'vitest';
import { validateArtifact, validateRewrite } from '../core/validator.js';
import type { Artifact } from '../types/index.js';

function makeArtifact(overrides: Partial<Artifact> = {}): Artifact {
  return {
    id: 'test-id',
    name: 'test-artifact',
    artifactType: 'skill',
    path: '/test/SKILL.md',
    relativePath: '.claude/skills/test/SKILL.md',
    rawContent: '---\nname: test\ndescription: Use when testing.\n---\n# Test\n',
    frontmatter: { name: 'test', description: 'Use when testing.' },
    body: '# Test\n',
    sections: ['Test'],
    hash: 'abc123',
    parsedAt: new Date().toISOString(),
    parseConfidence: 1.0,
    issues: [],
    ...overrides,
  };
}

describe('validateArtifact', () => {
  it('validates a well-formed skill', () => {
    const result = validateArtifact(makeArtifact());
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('flags missing frontmatter', () => {
    const result = validateArtifact(makeArtifact({ frontmatter: null }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.rule === 'frontmatter-required')).toBe(true);
  });

  it('flags empty files', () => {
    const result = validateArtifact(makeArtifact({ rawContent: '  \n  ' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.rule === 'non-empty')).toBe(true);
  });

  it('warns on unclosed code blocks', () => {
    const result = validateArtifact(makeArtifact({ body: '```js\nconsole.log("hi")\n' }));
    expect(result.warnings.some(w => w.rule === 'code-blocks-balanced')).toBe(true);
  });
});

describe('validateRewrite', () => {
  it('blocks rewrites that remove too much content', () => {
    const original = makeArtifact({ rawContent: 'A'.repeat(1000) });
    const candidate = makeArtifact({ rawContent: 'A'.repeat(100) });
    const result = validateRewrite(original, candidate);
    expect(result.safeToApply).toBe(false);
    expect(result.errors.some(e => e.rule === 'no-content-loss')).toBe(true);
  });

  it('warns when sections are removed', () => {
    const original = makeArtifact({ sections: ['Overview', 'Details'] });
    const candidate = makeArtifact({ sections: ['Overview'] });
    const result = validateRewrite(original, candidate);
    expect(result.warnings.some(w => w.message.includes('Details'))).toBe(true);
  });
});
