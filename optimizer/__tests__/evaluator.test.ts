import { describe, it, expect } from 'vitest';
import { evaluateArtifact, scoreToGrade } from '../core/evaluator.js';
import type { Artifact } from '../types/index.js';

function makeArtifact(overrides: Partial<Artifact> = {}): Artifact {
  return {
    id: 'test-id',
    name: 'test-artifact',
    artifactType: 'skill',
    path: '/test/path/SKILL.md',
    relativePath: '.claude/skills/test/SKILL.md',
    rawContent: '',
    frontmatter: { name: 'test-artifact', description: 'Use when testing evaluator.' },
    body: `# Test Skill

## Overview
A well-structured test skill for evaluating the rubric engine.

## When to Use
- When running unit tests for the evaluator

## Core Pattern
Do not skip any steps. Never bypass validation.

If an error occurs, report it and fallback to safe defaults.

## Output
Produce a test result with pass/fail status.

## Examples
\`\`\`
example code here
\`\`\`
`,
    sections: ['Overview', 'When to Use', 'Core Pattern', 'Output', 'Examples'],
    hash: 'abc123',
    parsedAt: new Date().toISOString(),
    parseConfidence: 1.0,
    issues: [],
    ...overrides,
  };
}

describe('evaluateArtifact', () => {
  it('scores a well-structured artifact highly', () => {
    const artifact = makeArtifact();
    const score = evaluateArtifact(artifact);

    expect(score.overallScore).toBeGreaterThanOrEqual(70);
    expect(score.dimensions.structure).toBeGreaterThanOrEqual(7);
    expect(score.dimensions.trigger_precision).toBeGreaterThanOrEqual(7);
  });

  it('penalizes missing frontmatter', () => {
    const artifact = makeArtifact({ frontmatter: null });
    const score = evaluateArtifact(artifact);

    expect(score.dimensions.structure).toBeLessThanOrEqual(7);
    expect(score.antiPatterns).toContain('missing-frontmatter');
  });

  it('penalizes vague language', () => {
    const artifact = makeArtifact({
      body: 'Handle errors appropriately. Be careful with state. Do things properly and correctly as needed.',
    });
    const score = evaluateArtifact(artifact);

    expect(score.dimensions.clarity).toBeLessThan(8);
  });

  it('detects missing sections', () => {
    const artifact = makeArtifact({
      sections: [],
      body: 'Just a wall of text without any structure.',
    });
    const score = evaluateArtifact(artifact);

    expect(score.dimensions.structure).toBeLessThanOrEqual(6);
  });
});

describe('scoreToGrade', () => {
  it('returns correct grades', () => {
    expect(scoreToGrade(95)).toBe('A');
    expect(scoreToGrade(85)).toBe('B');
    expect(scoreToGrade(75)).toBe('C');
    expect(scoreToGrade(65)).toBe('D');
    expect(scoreToGrade(45)).toBe('F');
  });
});
