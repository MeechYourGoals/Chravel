import type { Artifact, ValidationError, ValidationResult } from '../types/index.js';

function validateFrontmatterStructure(artifact: Artifact): ValidationError[] {
  const errors: ValidationError[] = [];

  if (artifact.artifactType === 'skill') {
    if (!artifact.frontmatter) {
      errors.push({
        rule: 'frontmatter-required',
        message: 'Skills must have YAML frontmatter',
        severity: 'error',
      });
    } else {
      if (typeof artifact.frontmatter.name !== 'string' || !artifact.frontmatter.name) {
        errors.push({
          rule: 'frontmatter-name',
          message: 'Frontmatter must include a non-empty "name" field',
          severity: 'error',
        });
      }
      if (
        typeof artifact.frontmatter.description !== 'string' ||
        !artifact.frontmatter.description
      ) {
        errors.push({
          rule: 'frontmatter-description',
          message: 'Frontmatter must include a non-empty "description" field',
          severity: 'error',
        });
      }
      // Name format check
      if (typeof artifact.frontmatter.name === 'string') {
        if (!/^[a-z0-9-]+$/.test(artifact.frontmatter.name)) {
          errors.push({
            rule: 'frontmatter-name-format',
            message: 'Name should be kebab-case (lowercase letters, numbers, hyphens)',
            severity: 'warn',
          });
        }
      }
    }
  }

  if (artifact.artifactType === 'plugin') {
    if (!artifact.frontmatter) {
      errors.push({
        rule: 'plugin-json-valid',
        message: 'plugin.json must be valid JSON',
        severity: 'error',
      });
    }
  }

  return errors;
}

function validateContentIntegrity(artifact: Artifact): ValidationError[] {
  const errors: ValidationError[] = [];

  if (artifact.rawContent.trim().length === 0) {
    errors.push({
      rule: 'non-empty',
      message: 'Artifact file is empty',
      severity: 'error',
    });
  }

  // Check for broken markdown (unclosed code blocks)
  const codeBlockCount = (artifact.body.match(/```/g) ?? []).length;
  if (codeBlockCount % 2 !== 0) {
    errors.push({
      rule: 'code-blocks-balanced',
      message: 'Unclosed code block detected',
      severity: 'warn',
    });
  }

  return errors;
}

function detectRegressions(original: Artifact, candidate: Artifact): ValidationError[] {
  const errors: ValidationError[] = [];

  // Content must not shrink by more than 50%
  if (candidate.rawContent.length < original.rawContent.length * 0.5) {
    errors.push({
      rule: 'no-content-loss',
      message: `Content shrank by ${Math.round((1 - candidate.rawContent.length / original.rawContent.length) * 100)}% — possible data loss`,
      severity: 'error',
    });
  }

  // Frontmatter fields must not be removed
  if (original.frontmatter) {
    for (const key of Object.keys(original.frontmatter)) {
      if (candidate.frontmatter && !(key in candidate.frontmatter)) {
        errors.push({
          rule: 'no-field-removal',
          message: `Frontmatter field "${key}" was removed`,
          severity: 'error',
        });
      }
    }
  }

  // Sections must not disappear entirely
  for (const section of original.sections) {
    if (!candidate.sections.includes(section)) {
      errors.push({
        rule: 'no-section-removal',
        message: `Section "${section}" was removed`,
        severity: 'warn',
      });
    }
  }

  return errors;
}

export function validateArtifact(artifact: Artifact): ValidationResult {
  const allErrors: ValidationError[] = [
    ...validateFrontmatterStructure(artifact),
    ...validateContentIntegrity(artifact),
  ];

  const errors = allErrors.filter(e => e.severity === 'error');
  const warnings = allErrors.filter(e => e.severity === 'warn');

  return {
    artifactId: artifact.id,
    valid: errors.length === 0,
    errors,
    warnings,
    safeToApply: true,
  };
}

export function validateRewrite(original: Artifact, candidate: Artifact): ValidationResult {
  const structureErrors = [
    ...validateFrontmatterStructure(candidate),
    ...validateContentIntegrity(candidate),
  ];
  const regressionErrors = detectRegressions(original, candidate);
  const allErrors = [...structureErrors, ...regressionErrors];

  const errors = allErrors.filter(e => e.severity === 'error');
  const warnings = allErrors.filter(e => e.severity === 'warn');

  return {
    artifactId: original.id,
    valid: errors.length === 0,
    errors,
    warnings,
    safeToApply: errors.length === 0,
  };
}
