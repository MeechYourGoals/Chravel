import type { Artifact, ArtifactScore, ScoringIssue } from '../types/index.js';
import { RUBRIC_DIMENSIONS } from '../config/defaults.js';

// --- Scoring functions (each returns 0-10) ---

function scoreClarity(a: Artifact): { score: number; issues: ScoringIssue[] } {
  const issues: ScoringIssue[] = [];
  let score = 10;

  const vagueWords = [
    'appropriate',
    'properly',
    'correctly',
    'as needed',
    'if necessary',
    'handle accordingly',
    'be careful',
  ];
  const bodyLower = a.body.toLowerCase();
  for (const word of vagueWords) {
    if (bodyLower.includes(word)) {
      score -= 1;
      issues.push({
        dimension: 'clarity',
        severity: 'minor',
        message: `Vague language: "${word}"`,
        fixable: true,
      });
    }
  }

  if (!a.body.includes('#')) {
    score -= 2;
    issues.push({
      dimension: 'clarity',
      severity: 'major',
      message: 'No headings — hard to scan',
      fixable: true,
    });
  }

  return { score: Math.max(0, score), issues };
}

function scoreSpecificity(a: Artifact): { score: number; issues: ScoringIssue[] } {
  const issues: ScoringIssue[] = [];
  let score = 10;

  const hasExamples = /```|example|e\.g\.|for instance/i.test(a.body);
  if (!hasExamples && a.body.length > 200) {
    score -= 3;
    issues.push({
      dimension: 'specificity',
      severity: 'major',
      message: 'No examples or code blocks',
      fixable: true,
    });
  }

  const hasConcreteConditions = /when|if |trigger|symptom/i.test(a.body);
  if (!hasConcreteConditions) {
    score -= 2;
    issues.push({
      dimension: 'specificity',
      severity: 'minor',
      message: 'No concrete trigger conditions in body',
      fixable: true,
    });
  }

  return { score: Math.max(0, score), issues };
}

function scoreConcision(a: Artifact): { score: number; issues: ScoringIssue[] } {
  const issues: ScoringIssue[] = [];
  const lineCount = a.body.split('\n').length;
  let score = 10;

  if (lineCount > 500) {
    score -= 4;
    issues.push({
      dimension: 'concision',
      severity: 'major',
      message: `Very long artifact (${lineCount} lines)`,
      fixable: false,
    });
  } else if (lineCount > 300) {
    score -= 2;
    issues.push({
      dimension: 'concision',
      severity: 'minor',
      message: `Long artifact (${lineCount} lines)`,
      fixable: false,
    });
  }

  // Check for repeated phrases
  const sentences = a.body.split(/[.!?]\s+/);
  const seen = new Set<string>();
  let duplicates = 0;
  for (const s of sentences) {
    const normalized = s.trim().toLowerCase().slice(0, 60);
    if (normalized.length > 20 && seen.has(normalized)) duplicates++;
    seen.add(normalized);
  }
  if (duplicates > 2) {
    score -= 2;
    issues.push({
      dimension: 'concision',
      severity: 'minor',
      message: `${duplicates} repeated phrases detected`,
      fixable: true,
    });
  }

  return { score: Math.max(0, score), issues };
}

function scoreDeterminism(a: Artifact): { score: number; issues: ScoringIssue[] } {
  const issues: ScoringIssue[] = [];
  let score = 10;

  const ambiguous = ['might', 'could', 'maybe', 'perhaps', 'consider', 'you may want to'];
  const bodyLower = a.body.toLowerCase();
  let hits = 0;
  for (const word of ambiguous) {
    if (bodyLower.includes(word)) hits++;
  }
  if (hits >= 3) {
    score -= 3;
    issues.push({
      dimension: 'determinism',
      severity: 'minor',
      message: `${hits} ambiguous/non-deterministic phrases`,
      fixable: true,
    });
  } else if (hits >= 1) {
    score -= 1;
  }

  return { score: Math.max(0, score), issues };
}

function scoreStructure(a: Artifact): { score: number; issues: ScoringIssue[] } {
  const issues: ScoringIssue[] = [];
  let score = 10;

  if (a.sections.length === 0) {
    score -= 4;
    issues.push({
      dimension: 'structure',
      severity: 'major',
      message: 'No H2 sections',
      fixable: true,
    });
  } else if (a.sections.length < 2 && a.body.split('\n').length > 50) {
    score -= 2;
    issues.push({
      dimension: 'structure',
      severity: 'minor',
      message: 'Only 1 section for long content',
      fixable: true,
    });
  }

  if (a.artifactType === 'skill' && !a.frontmatter) {
    score -= 3;
    issues.push({
      dimension: 'structure',
      severity: 'critical',
      message: 'Missing YAML frontmatter',
      fixable: true,
    });
  }

  return { score: Math.max(0, score), issues };
}

function scoreTriggerPrecision(a: Artifact): { score: number; issues: ScoringIssue[] } {
  const issues: ScoringIssue[] = [];
  let score = 10;

  if (a.artifactType !== 'skill') return { score, issues };

  const desc = (a.frontmatter?.description ?? '') as string;
  if (!desc) {
    score = 0;
    issues.push({
      dimension: 'trigger_precision',
      severity: 'critical',
      message: 'No description/trigger',
      fixable: true,
    });
    return { score, issues };
  }

  if (!desc.toLowerCase().startsWith('use')) {
    score -= 3;
    issues.push({
      dimension: 'trigger_precision',
      severity: 'major',
      message: 'Description doesn\'t start with "Use when..."',
      fixable: true,
    });
  }

  const triggerKeywords = desc.match(/\b(when|trigger|on)\b/gi) ?? [];
  if (triggerKeywords.length === 0) {
    score -= 2;
    issues.push({
      dimension: 'trigger_precision',
      severity: 'minor',
      message: 'No explicit trigger keywords in description',
      fixable: true,
    });
  }

  return { score: Math.max(0, score), issues };
}

function scoreOutputContract(a: Artifact): { score: number; issues: ScoringIssue[] } {
  const issues: ScoringIssue[] = [];
  let score = 10;

  const hasOutput = /output|produce|generate|return|result|deliver/i.test(a.body);
  if (!hasOutput && a.body.length > 100) {
    score -= 3;
    issues.push({
      dimension: 'output_contract',
      severity: 'major',
      message: 'No output/deliverable described',
      fixable: true,
    });
  }

  const hasFormat = /format|template|structure|schema/i.test(a.body);
  if (!hasFormat && a.body.length > 200) {
    score -= 2;
    issues.push({
      dimension: 'output_contract',
      severity: 'minor',
      message: 'No output format specified',
      fixable: true,
    });
  }

  return { score: Math.max(0, score), issues };
}

function scoreToolUse(a: Artifact): { score: number; issues: ScoringIssue[] } {
  const issues: ScoringIssue[] = [];
  const score = 10;

  // Light check: does it reference tools?
  const toolMentions = a.body.match(
    /\b(Read|Write|Edit|Bash|Grep|Glob|Agent|WebFetch|WebSearch)\b/g,
  );
  if (toolMentions && toolMentions.length > 0) {
    // Tools mentioned — no penalty, can't verify correctness statically
  }

  return { score, issues };
}

function scoreEdgeCases(a: Artifact): { score: number; issues: ScoringIssue[] } {
  const issues: ScoringIssue[] = [];
  let score = 10;

  const hasEdge = /edge case|corner case|failure|error|fallback|exception|what if/i.test(a.body);
  if (!hasEdge && a.body.length > 200) {
    score -= 3;
    issues.push({
      dimension: 'edge_cases',
      severity: 'minor',
      message: 'No edge case or failure handling mentioned',
      fixable: true,
    });
  }

  return { score: Math.max(0, score), issues };
}

function scoreSafety(a: Artifact): { score: number; issues: ScoringIssue[] } {
  const issues: ScoringIssue[] = [];
  let score = 10;

  const hasGuardrails = /do not|don't|never|must not|avoid|warning|caution|constraint/i.test(
    a.body,
  );
  if (!hasGuardrails && a.body.length > 200) {
    score -= 3;
    issues.push({
      dimension: 'safety',
      severity: 'major',
      message: 'No safety guardrails or constraints',
      fixable: true,
    });
  }

  return { score: Math.max(0, score), issues };
}

function scoreConsistency(a: Artifact): { score: number; issues: ScoringIssue[] } {
  const issues: ScoringIssue[] = [];
  let score = 10;

  // Check if frontmatter name matches directory name
  if (a.artifactType === 'skill' && a.frontmatter?.name) {
    const dirName = a.relativePath.split('/').slice(-2, -1)[0];
    if (dirName && dirName !== a.frontmatter.name) {
      score -= 2;
      issues.push({
        dimension: 'consistency',
        severity: 'minor',
        message: `Frontmatter name "${a.frontmatter.name}" differs from directory "${dirName}"`,
        fixable: true,
      });
    }
  }

  return { score: Math.max(0, score), issues };
}

function scoreRedundancy(_a: Artifact): { score: number; issues: ScoringIssue[] } {
  // Cross-artifact redundancy is handled at batch level
  return { score: 10, issues: [] };
}

function scoreMaintainability(a: Artifact): { score: number; issues: ScoringIssue[] } {
  const issues: ScoringIssue[] = [];
  let score = 10;

  if (a.body.split('\n').length > 400) {
    score -= 2;
    issues.push({
      dimension: 'maintainability',
      severity: 'minor',
      message: 'Very long — hard to maintain',
      fixable: false,
    });
  }

  if (a.sections.length > 15) {
    score -= 1;
    issues.push({
      dimension: 'maintainability',
      severity: 'minor',
      message: 'Too many sections — consider consolidation',
      fixable: false,
    });
  }

  return { score: Math.max(0, score), issues };
}

function scoreTestability(a: Artifact): { score: number; issues: ScoringIssue[] } {
  const issues: ScoringIssue[] = [];
  let score = 10;

  const hasTestable = /test|verify|check|validate|assert|confirm/i.test(a.body);
  if (!hasTestable && a.body.length > 200) {
    score -= 2;
    issues.push({
      dimension: 'testability',
      severity: 'minor',
      message: 'No verification/testing criteria mentioned',
      fixable: true,
    });
  }

  return { score: Math.max(0, score), issues };
}

function scoreRewriteRisk(a: Artifact): { score: number; issues: ScoringIssue[] } {
  const issues: ScoringIssue[] = [];
  let score = 10;

  // Higher score = lower risk to rewrite = good
  // Complex artifacts with many dependencies are riskier
  const lineCount = a.body.split('\n').length;
  if (lineCount > 300) score -= 2;
  if (a.sections.length > 10) score -= 1;

  // Artifacts with security-related content are riskier to rewrite
  if (/RLS|security|auth|permission|secret/i.test(a.body)) {
    score -= 2;
    issues.push({
      dimension: 'rewrite_risk',
      severity: 'info',
      message: 'Contains security-sensitive content',
      fixable: false,
    });
  }

  return { score: Math.max(0, score), issues };
}

const SCORERS: Record<string, (a: Artifact) => { score: number; issues: ScoringIssue[] }> = {
  clarity: scoreClarity,
  specificity: scoreSpecificity,
  concision: scoreConcision,
  determinism: scoreDeterminism,
  structure: scoreStructure,
  trigger_precision: scoreTriggerPrecision,
  output_contract: scoreOutputContract,
  tool_use: scoreToolUse,
  edge_cases: scoreEdgeCases,
  safety: scoreSafety,
  consistency: scoreConsistency,
  redundancy: scoreRedundancy,
  maintainability: scoreMaintainability,
  testability: scoreTestability,
  rewrite_risk: scoreRewriteRisk,
};

export function evaluateArtifact(artifact: Artifact): ArtifactScore {
  const dimensions: Record<string, number> = {};
  const allIssues: ScoringIssue[] = [];
  const antiPatterns: string[] = [];
  const opportunities: string[] = [];

  let weightedSum = 0;
  let totalWeight = 0;

  for (const dim of RUBRIC_DIMENSIONS) {
    const scorer = SCORERS[dim.id];
    if (!scorer) {
      dimensions[dim.id] = 10;
      continue;
    }

    const result = scorer(artifact);
    dimensions[dim.id] = result.score;
    allIssues.push(...result.issues);

    weightedSum += result.score * dim.weight;
    totalWeight += dim.weight;
  }

  const overallScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) : 0;

  // Detect anti-patterns
  if (!artifact.frontmatter && artifact.artifactType === 'skill') {
    antiPatterns.push('missing-frontmatter');
  }
  if (artifact.body.split('\n').length > 500) {
    antiPatterns.push('overlong-artifact');
  }
  for (const issue of artifact.issues) {
    if (issue.severity === 'error') {
      antiPatterns.push(`parse-error: ${issue.message}`);
    }
  }

  // Detect opportunities
  const fixableIssues = allIssues.filter(i => i.fixable);
  if (fixableIssues.length > 0) {
    opportunities.push(`${fixableIssues.length} fixable issues found`);
  }

  // Determine rewrite risk
  let rewriteRisk: 'low' | 'medium' | 'high' = 'low';
  if (antiPatterns.length > 3 || overallScore < 50) rewriteRisk = 'high';
  else if (antiPatterns.length > 1 || overallScore < 70) rewriteRisk = 'medium';

  return {
    artifactId: artifact.id,
    artifactName: artifact.name,
    artifactPath: artifact.relativePath,
    overallScore,
    dimensions,
    issues: allIssues,
    antiPatterns,
    opportunities,
    rewriteRisk,
  };
}

export function scoreToGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
