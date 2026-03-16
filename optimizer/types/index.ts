// Skill Optimization System — Type Definitions

export type ArtifactType = 'skill' | 'command' | 'plugin' | 'output-style' | 'config';

export type Severity = 'error' | 'warn' | 'info';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ActionResult = 'success' | 'failure' | 'skipped';

// --- Parse Types ---

export interface ParseIssue {
  severity: Severity;
  message: string;
  line?: number;
}

export interface Artifact {
  id: string;
  name: string;
  artifactType: ArtifactType;
  path: string;
  relativePath: string;
  rawContent: string;
  frontmatter: Record<string, unknown> | null;
  body: string;
  sections: string[];
  hash: string;
  parsedAt: string;
  parseConfidence: number;
  issues: ParseIssue[];
}

// --- Evaluation Types ---

export interface ScoringIssue {
  dimension: string;
  severity: 'critical' | 'major' | 'minor';
  message: string;
  fixable: boolean;
}

export interface ArtifactScore {
  artifactId: string;
  artifactName: string;
  artifactPath: string;
  overallScore: number;
  dimensions: Record<string, number>;
  issues: ScoringIssue[];
  antiPatterns: string[];
  opportunities: string[];
  rewriteRisk: RiskLevel;
}

export interface RubricDimension {
  id: string;
  name: string;
  weight: number;
}

// --- Rewrite Types ---

export interface ChangeDescription {
  section: string;
  type: 'add' | 'remove' | 'modify';
  description: string;
}

export interface RewriteResult {
  artifactId: string;
  original: string;
  rewritten: string;
  diff: string;
  rationale: string;
  confidence: number;
  risk: RiskLevel;
  requiresHumanReview: boolean;
  changes: ChangeDescription[];
}

export interface RewriteProfile {
  id: string;
  name: string;
  description: string;
  maxRisk: RiskLevel;
  rules: string[];
}

// --- Validation Types ---

export interface ValidationError {
  rule: string;
  message: string;
  severity: Severity;
  location?: string;
}

export interface ValidationResult {
  artifactId: string;
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  safeToApply: boolean;
}

// --- Storage Types ---

export interface ManifestEntry {
  id: string;
  path: string;
  relativePath: string;
  artifactType: ArtifactType;
  name: string;
  hash: string;
  lastModified: string;
  scannedAt: string;
}

export interface Manifest {
  version: string;
  generatedAt: string;
  rootDir: string;
  entries: ManifestEntry[];
}

export interface BackupRecord {
  artifactId: string;
  originalPath: string;
  backupPath: string;
  timestamp: string;
  hash: string;
  reason: string;
}

export interface HistoryEntry {
  timestamp: string;
  action: string;
  artifactId: string;
  artifactName: string;
  oldHash: string | null;
  newHash: string | null;
  result: ActionResult;
  details: Record<string, unknown>;
}

export interface LearningEntry {
  artifactId: string;
  timestamp: string;
  action: 'accept' | 'reject' | 'skip';
  profile: string;
  scoreImprovement: number | null;
  notes: string;
}

// --- Config Types ---

export interface OptimizerConfig {
  rootDir: string;
  scanDirs: string[];
  includeGlobs: string[];
  excludeGlobs: string[];
  supportedExtensions: string[];
  dataDir: string;
  reportsDir: string;
  knowledgeDir: string;
  dryRun: boolean;
  verbose: boolean;
}

// --- CLI Types ---

export interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

// --- Report Types ---

export interface ReportData {
  timestamp: string;
  summary: {
    totalArtifacts: number;
    parseFailures: number;
    averageScore: number;
    gradeDistribution: Record<string, number>;
    topIssues: Array<{ message: string; count: number; severity: string }>;
    antiPatternCounts: Record<string, number>;
    duplicatesDetected: number;
    deadArtifacts: number;
  };
  artifacts: ArtifactScore[];
  recommendations: string[];
}
