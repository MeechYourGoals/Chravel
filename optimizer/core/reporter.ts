import type { ArtifactScore, ReportData } from '../types/index.js';
import { scoreToGrade } from './evaluator.js';

export function buildReportData(scores: ArtifactScore[]): ReportData {
  const totalArtifacts = scores.length;
  const parseFailures = scores.filter(s =>
    s.antiPatterns.some(p => p.startsWith('parse-error')),
  ).length;
  const avgScore =
    totalArtifacts > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.overallScore, 0) / totalArtifacts)
      : 0;

  const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const s of scores) {
    const grade = scoreToGrade(s.overallScore);
    gradeDistribution[grade] = (gradeDistribution[grade] ?? 0) + 1;
  }

  // Top issues across all artifacts
  const issueCounts = new Map<string, { count: number; severity: string }>();
  for (const s of scores) {
    for (const issue of s.issues) {
      const key = issue.message;
      const existing = issueCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        issueCounts.set(key, { count: 1, severity: issue.severity });
      }
    }
  }
  const topIssues = Array.from(issueCounts.entries())
    .map(([message, data]) => ({ message, count: data.count, severity: data.severity }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Anti-pattern counts
  const antiPatternCounts: Record<string, number> = {};
  for (const s of scores) {
    for (const ap of s.antiPatterns) {
      antiPatternCounts[ap] = (antiPatternCounts[ap] ?? 0) + 1;
    }
  }

  // Recommendations
  const recommendations: string[] = [];
  if (parseFailures > 0) recommendations.push(`Fix ${parseFailures} parse failures`);
  const lowScorers = scores.filter(s => s.overallScore < 60);
  if (lowScorers.length > 0)
    recommendations.push(`Review ${lowScorers.length} low-scoring artifacts (score < 60)`);
  const missingFrontmatter = scores.filter(s => s.antiPatterns.includes('missing-frontmatter'));
  if (missingFrontmatter.length > 0)
    recommendations.push(`Add frontmatter to ${missingFrontmatter.length} skills`);

  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalArtifacts,
      parseFailures,
      averageScore: avgScore,
      gradeDistribution,
      topIssues,
      antiPatternCounts,
      duplicatesDetected: 0,
      deadArtifacts: 0,
    },
    artifacts: scores,
    recommendations,
  };
}

export function renderMarkdownReport(data: ReportData): string {
  const lines: string[] = [];

  lines.push('# Skill Optimizer Report');
  lines.push('');
  lines.push(`Generated: ${data.timestamp}`);
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Artifacts | ${data.summary.totalArtifacts} |`);
  lines.push(`| Parse Failures | ${data.summary.parseFailures} |`);
  lines.push(`| Average Score | ${data.summary.averageScore}/100 |`);
  lines.push(`| Duplicates | ${data.summary.duplicatesDetected} |`);
  lines.push('');

  lines.push('## Grade Distribution');
  lines.push('');
  for (const [grade, count] of Object.entries(data.summary.gradeDistribution)) {
    const bar = '█'.repeat(count);
    lines.push(`- **${grade}**: ${count} ${bar}`);
  }
  lines.push('');

  lines.push('## Top Issues');
  lines.push('');
  for (const issue of data.summary.topIssues) {
    lines.push(`- [${issue.severity}] ${issue.message} (${issue.count} artifacts)`);
  }
  lines.push('');

  if (data.recommendations.length > 0) {
    lines.push('## Recommendations');
    lines.push('');
    for (const rec of data.recommendations) {
      lines.push(`- ${rec}`);
    }
    lines.push('');
  }

  lines.push('## Artifact Scores');
  lines.push('');
  lines.push('| Artifact | Type | Score | Grade | Risk | Issues |');
  lines.push('|----------|------|-------|-------|------|--------|');

  const sorted = [...data.artifacts].sort((a, b) => a.overallScore - b.overallScore);
  for (const a of sorted) {
    const grade = scoreToGrade(a.overallScore);
    lines.push(
      `| ${a.artifactName} | ${a.artifactPath.split('/')[1] ?? ''} | ${a.overallScore} | ${grade} | ${a.rewriteRisk} | ${a.issues.length} |`,
    );
  }
  lines.push('');

  return lines.join('\n');
}
