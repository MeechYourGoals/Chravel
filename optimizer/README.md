# Skill Optimizer

Internal CLI tool for analyzing, evaluating, and improving prompt/skill artifacts.

## Quick Start

```bash
# Scan all artifacts and build manifest
npm run optimize -- scan

# Analyze quality across all artifacts
npm run optimize -- analyze

# Generate full report
npm run optimize -- report

# Preview rewrite for a specific artifact
npm run optimize -- rewrite <name-or-id>

# Validate all artifacts
npm run optimize -- validate

# Show help
npm run optimize -- help
```

## Commands

| Command | Description |
|---------|-------------|
| `scan` | Crawl directories and build artifact manifest |
| `analyze` | Score all artifacts against 15-dimension quality rubric |
| `rewrite <id>` | Generate improved version with diff |
| `validate [id]` | Lint and validate artifact structure |
| `apply <id>` | Apply rewrite (backup first, dry-run by default) |
| `batch` | Process multiple artifacts |
| `history` | Show change log |
| `rollback <id>` | Revert to previous version |
| `report` | Generate markdown + JSON reports |

## Key Flags

- `--verbose` — Detailed output
- `--dry-run` — Preview without applying (default: on)
- `--no-dry-run` — Actually apply changes
- `--profile minimal|moderate|aggressive` — Rewrite aggressiveness
- `--safe-only` — Only low-risk changes (batch mode)
- `--format md|json|both` — Report format

## Architecture

```
optimizer/
├── cli/          — Entry point and argument parsing
├── core/         — Crawler, parser, evaluator, rewriter, validator, reporter
├── storage/      — Manifest, backups, history, learning memory
├── types/        — TypeScript interfaces
├── utils/        — File I/O, hashing, diffing, logging
├── config/       — Default configuration and rubric weights
├── __tests__/    — Unit tests (vitest)
└── .data/        — Runtime state (gitignored)
```

## Knowledge Base

Edit rules and profiles in `optimizer_knowledge/`:

- `rules/structure.yaml` — Format compliance rules
- `rules/antipatterns.yaml` — Anti-pattern definitions
- `rules/best-practices.yaml` — Scoring rubric
- `best-practices/` — How-to guides
- `profiles/` — Rewrite aggressiveness profiles

## Safety

- **Dry-run by default** — No changes without `--no-dry-run`
- **Backups before every write** — Stored in `.data/backups/`
- **Rollback support** — `optimize rollback <id>`
- **Validation gate** — Rewrites checked for regressions before applying
- **Human review required** — Medium/high risk changes flagged
