import type { Artifact, ArtifactScore, ChangeDescription, RewriteResult } from '../types/index.js';
import { generateDiff } from '../utils/diffing.js';

interface RewriteRule {
  id: string;
  name: string;
  risk: 'low' | 'medium' | 'high';
  applies: (artifact: Artifact, score: ArtifactScore) => boolean;
  apply: (content: string, artifact: Artifact) => { content: string; description: string };
}

const RULES: RewriteRule[] = [
  {
    id: 'add-missing-frontmatter-fields',
    name: 'Add missing frontmatter fields',
    risk: 'low',
    applies: (a: Artifact) =>
      a.artifactType === 'skill' && a.frontmatter !== null && !a.frontmatter.description,
    apply: (content: string, a: Artifact) => {
      const name = a.frontmatter?.name ?? a.name;
      const newFm = `---\nname: ${name}\ndescription: Use when working with ${name}. [TODO: Add specific trigger conditions]\n---`;
      if (content.startsWith('---')) {
        const endIdx = content.indexOf('---', 3);
        if (endIdx !== -1) {
          return {
            content: newFm + content.slice(endIdx + 3),
            description: 'Added missing description to frontmatter',
          };
        }
      }
      return { content, description: '' };
    },
  },
  {
    id: 'fix-description-prefix',
    name: 'Fix description to start with "Use when"',
    risk: 'low',
    applies: (a: Artifact) => {
      if (a.artifactType !== 'skill' || !a.frontmatter?.description) return false;
      const desc = String(a.frontmatter.description);
      return !desc.toLowerCase().startsWith('use');
    },
    apply: (content: string, a: Artifact) => {
      const oldDesc = String(a.frontmatter?.description ?? '');
      const newDesc = `Use when ${oldDesc.charAt(0).toLowerCase()}${oldDesc.slice(1)}`;
      return {
        content: content.replace(oldDesc, newDesc),
        description: `Changed description to start with "Use when": "${newDesc.slice(0, 60)}..."`,
      };
    },
  },
  {
    id: 'normalize-trailing-newline',
    name: 'Ensure file ends with newline',
    risk: 'low',
    applies: (a: Artifact) => !a.rawContent.endsWith('\n'),
    apply: (content: string) => ({
      content: content.trimEnd() + '\n',
      description: 'Added trailing newline',
    }),
  },
];

export function getApplicableRules(
  artifact: Artifact,
  score: ArtifactScore,
  maxRisk: 'low' | 'medium' | 'high' = 'low',
): RewriteRule[] {
  const riskOrder = { low: 0, medium: 1, high: 2 };
  return RULES.filter(
    rule => riskOrder[rule.risk] <= riskOrder[maxRisk] && rule.applies(artifact, score),
  );
}

export function rewriteArtifact(
  artifact: Artifact,
  score: ArtifactScore,
  maxRisk: 'low' | 'medium' | 'high' = 'low',
): RewriteResult | null {
  const applicableRules = getApplicableRules(artifact, score, maxRisk);
  if (applicableRules.length === 0) return null;

  let rewritten = artifact.rawContent;
  const changes: ChangeDescription[] = [];
  const rationale: string[] = [];

  for (const rule of applicableRules) {
    const result = rule.apply(rewritten, artifact);
    if (result.content !== rewritten && result.description) {
      rewritten = result.content;
      changes.push({
        section: rule.name,
        type: 'modify',
        description: result.description,
      });
      rationale.push(`[${rule.id}] ${result.description}`);
    }
  }

  if (changes.length === 0) return null;

  const riskOrder = { low: 0, medium: 1, high: 2 };
  const highestRisk = applicableRules.reduce(
    (max, r) => (riskOrder[r.risk] > riskOrder[max] ? r.risk : max),
    'low' as 'low' | 'medium' | 'high',
  );

  return {
    artifactId: artifact.id,
    original: artifact.rawContent,
    rewritten,
    diff: generateDiff(artifact.rawContent, rewritten),
    rationale: rationale.join('\n'),
    confidence: 0.9,
    risk: highestRisk,
    requiresHumanReview: highestRisk !== 'low',
    changes,
  };
}
