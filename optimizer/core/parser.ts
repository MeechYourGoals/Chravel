import * as path from 'node:path';
import type { Artifact, ArtifactType, ParseIssue } from '../types/index.js';
import { readFileSync } from '../utils/file-io.js';
import { sha256, idFromPath } from '../utils/hashing.js';

interface FrontmatterResult {
  frontmatter: Record<string, unknown> | null;
  body: string;
}

function parseFrontmatter(content: string): FrontmatterResult {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) {
    return { frontmatter: null, body: content };
  }

  const endIndex = trimmed.indexOf('---', 3);
  if (endIndex === -1) {
    return { frontmatter: null, body: content };
  }

  const fmBlock = trimmed.slice(3, endIndex).trim();
  const body = trimmed.slice(endIndex + 3).trim();

  const frontmatter: Record<string, unknown> = {};
  for (const line of fmBlock.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    let value: unknown = line.slice(colonIndex + 1).trim();

    // Trim surrounding quotes
    if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    // Convert booleans
    if (value === 'true') value = true;
    if (value === 'false') value = false;

    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

function extractSections(body: string): string[] {
  const sections: string[] = [];
  for (const line of body.split('\n')) {
    const match = line.match(/^##\s+(.+)/);
    if (match) {
      sections.push(match[1].trim());
    }
  }
  return sections;
}

function inferName(
  filePath: string,
  frontmatter: Record<string, unknown> | null,
  artifactType: ArtifactType,
): string {
  if (frontmatter?.name && typeof frontmatter.name === 'string') {
    return frontmatter.name;
  }
  if (artifactType === 'plugin') {
    return path.basename(path.dirname(filePath));
  }
  // For skills, use parent directory name (e.g., chravel-bug-repro-first)
  if (artifactType === 'skill') {
    return path.basename(path.dirname(filePath));
  }
  // For commands, use filename without extension
  return path.basename(filePath, path.extname(filePath));
}

function validateSkill(
  frontmatter: Record<string, unknown> | null,
  body: string,
  sections: string[],
): ParseIssue[] {
  const issues: ParseIssue[] = [];

  if (!frontmatter) {
    issues.push({ severity: 'error', message: 'Missing YAML frontmatter' });
  } else {
    if (!frontmatter.name) {
      issues.push({ severity: 'error', message: 'Missing "name" in frontmatter' });
    }
    if (!frontmatter.description) {
      issues.push({ severity: 'error', message: 'Missing "description" in frontmatter' });
    }
    if (typeof frontmatter.description === 'string') {
      if (!frontmatter.description.toLowerCase().startsWith('use')) {
        issues.push({
          severity: 'warn',
          message: 'Description should start with "Use when..."',
        });
      }
      if (frontmatter.description.length > 1024) {
        issues.push({
          severity: 'warn',
          message: `Description is ${frontmatter.description.length} chars (max 1024)`,
        });
      }
    }
  }

  if (body.split('\n').length > 500) {
    issues.push({ severity: 'info', message: 'Artifact is very long (>500 lines)' });
  }

  if (sections.length === 0) {
    issues.push({ severity: 'warn', message: 'No H2 sections found — may lack structure' });
  }

  return issues;
}

function validateCommand(body: string): ParseIssue[] {
  const issues: ParseIssue[] = [];
  if (body.trim().length < 20) {
    issues.push({ severity: 'warn', message: 'Command body is very short' });
  }
  return issues;
}

function validatePlugin(frontmatter: Record<string, unknown> | null): ParseIssue[] {
  const issues: ParseIssue[] = [];
  if (!frontmatter) {
    issues.push({ severity: 'error', message: 'Failed to parse plugin.json' });
    return issues;
  }
  if (!frontmatter.name) {
    issues.push({ severity: 'error', message: 'Missing "name" in plugin.json' });
  }
  if (!frontmatter.version) {
    issues.push({ severity: 'warn', message: 'Missing "version" in plugin.json' });
  }
  if (!frontmatter.skills || !Array.isArray(frontmatter.skills)) {
    issues.push({ severity: 'warn', message: 'Missing or invalid "skills" array' });
  }
  return issues;
}

export function parseArtifact(
  filePath: string,
  relativePath: string,
  artifactType: ArtifactType,
): Artifact {
  const rawContent = readFileSync(filePath);
  const hash = sha256(rawContent);
  const id = idFromPath(relativePath);

  let frontmatter: Record<string, unknown> | null = null;
  let body: string = rawContent;
  let sections: string[] = [];
  let issues: ParseIssue[] = [];
  let parseConfidence = 1.0;

  if (artifactType === 'plugin' && filePath.endsWith('.json')) {
    try {
      frontmatter = JSON.parse(rawContent) as Record<string, unknown>;
      body = '';
    } catch {
      issues.push({ severity: 'error', message: 'Invalid JSON' });
      parseConfidence = 0.2;
    }
    issues.push(...validatePlugin(frontmatter));
  } else {
    const parsed = parseFrontmatter(rawContent);
    frontmatter = parsed.frontmatter;
    body = parsed.body;
    sections = extractSections(body);

    if (artifactType === 'skill') {
      issues = validateSkill(frontmatter, body, sections);
      if (!frontmatter) parseConfidence = 0.6;
    } else if (artifactType === 'command') {
      issues = validateCommand(body);
    }
  }

  const name = inferName(filePath, frontmatter, artifactType);

  return {
    id,
    name,
    artifactType,
    path: filePath,
    relativePath,
    rawContent,
    frontmatter,
    body,
    sections,
    hash,
    parsedAt: new Date().toISOString(),
    parseConfidence,
    issues,
  };
}
