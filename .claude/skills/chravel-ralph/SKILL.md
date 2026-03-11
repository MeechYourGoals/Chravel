---
name: chravel-ralph
description: Convert a Chravel PRD markdown document to Ralph's prd.json format for autonomous multi-story execution. Triggers on "convert PRD to ralph", "set up ralph", "prepare for ralph", "create prd.json", "run ralph on this PRD".
disable-model-invocation: true
---

# Chravel Ralph Converter

Convert PRD markdown documents to Ralph's JSON format for autonomous execution.

## When to Use

After creating a PRD with `/chravel-prd`. User says something like:
"Convert tasks/prd-[name].md to ralph format"

## Workflow

### 1. Read the PRD
Read the PRD file the user specifies.

### 2. Generate prd.json

Create `scripts/ralph/prd.json`:

```json
{
  "featureName": "Feature Name from PRD",
  "branchName": "feature/kebab-case-name",
  "description": "Brief description from PRD overview",
  "userStories": [
    {
      "id": "US-001",
      "title": "Story title",
      "description": "Implementation description with technical notes",
      "acceptanceCriteria": [
        "Criterion 1",
        "Criterion 2"
      ],
      "priority": 1,
      "passes": false
    }
  ]
}
```

### 3. Story Mapping

| PRD Field | JSON Field |
|---|---|
| Story ID (US-001) | `id` |
| Story title | `title` |
| User story + technical notes | `description` |
| Acceptance criteria | `acceptanceCriteria` array |
| Order in document | `priority` (1 = first) |
| Always | `passes: false` |

### 4. Chravel-Specific Checks

Before finalizing, verify:
- Stories reference correct Chravel paths (`src/features/`, `src/components/`)
- Supabase table/RLS stories come before UI stories
- Auth-dependent stories come after auth setup
- Mobile parity stories are included for any new UI
- No story is too large (should be ~30 min focused work)

### 5. Initialize Progress File

```bash
mkdir -p scripts/ralph
# Create progress.txt with feature name, date, branch
```

### 6. Confirm

```
Created scripts/ralph/prd.json with [N] stories

To start Ralph:
  ./scripts/ralph/ralph.sh [max_iterations]

Stories in order:
1. US-001: [title]
2. US-002: [title]
...
```
