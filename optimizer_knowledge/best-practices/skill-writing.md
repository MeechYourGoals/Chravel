# How to Write Effective Skills

## Golden Rules

1. **Frontmatter is mandatory** — Every skill needs `name` and `description`
2. **Description = trigger** — Start with "Use when..." and list specific symptoms/keywords
3. **Don't summarize the workflow** — Description tells Claude *when* to load the skill, not *what* it teaches
4. **Structure for scanning** — Use H2 sections, tables, and bullet points
5. **Specificity over cleverness** — Concrete examples beat abstract rules

## Strong Skill Template

```markdown
---
name: my-skill-name
description: Use when [specific conditions]. Triggers on "keyword1", "keyword2", "keyword3".
---

# Skill Title

One-sentence purpose statement.

## When to Use
- Symptom A
- Symptom B
- Error pattern C

## Core Pattern
[Step-by-step or before/after]

## Quick Reference
| Scenario | Action |
|----------|--------|
| X        | Do Y   |

## Common Mistakes
- Mistake → Fix
```

## Anti-Patterns to Avoid

- **Vague triggers:** "Use for general development" → too broad
- **Workflow in description:** Don't describe what the skill does, only when to use it
- **Wall of text:** If it's over 300 lines, split into sub-skills
- **Missing guardrails:** Always include "Do NOT" rules for risky operations
- **Generic advice:** "Be careful with state" → not actionable
