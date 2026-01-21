# Ralph Skill

Convert PRD markdown documents to Ralph's JSON format for autonomous execution.

## When to Use

Use this skill after creating a PRD with the `prd` skill. The user will say something like:
"Load the ralph skill and convert tasks/prd-[name].md to prd.json"

## Workflow

### 1. Read the PRD

```bash
cat tasks/prd-[feature-name].md
```

### 2. Generate prd.json

Create `scripts/ralph/prd.json` with this structure:

```json
{
  "featureName": "Feature Name from PRD",
  "branchName": "feature/kebab-case-name",
  "description": "Brief description from PRD overview",
  "userStories": [
    {
      "id": "US-001",
      "title": "Story title",
      "description": "What needs to be implemented",
      "acceptanceCriteria": [
        "Criterion 1",
        "Criterion 2",
        "Criterion 3"
      ],
      "priority": 1,
      "passes": false
    }
  ]
}
```

### 3. Story Mapping Rules

For each user story in the PRD:

| PRD Field | JSON Field |
|-----------|------------|
| Story ID (US-001) | `id` |
| Story title | `title` |
| User story text + technical notes | `description` |
| Acceptance criteria | `acceptanceCriteria` array |
| Order in document | `priority` (1 = first) |
| Always | `passes: false` |

### 4. Branch Naming

Generate a clean branch name:
- Prefix with `feature/`
- Use kebab-case
- Keep it short but descriptive
- Examples:
  - `feature/user-authentication`
  - `feature/dashboard-analytics`
  - `feature/trip-details-modal`

### 5. Save the File

```bash
mkdir -p scripts/ralph
cat > scripts/ralph/prd.json << 'EOF'
{
  "featureName": "...",
  ...
}
EOF
```

### 6. Initialize Progress File

```bash
cat > scripts/ralph/progress.txt << 'EOF'
# Ralph Progress Log
# Learnings and context for future iterations

## Feature: [Feature Name]
## Started: [Date]
## Branch: [branch-name]

---

EOF
```

### 7. Copy Prompt Template (if not exists)

Check if `scripts/ralph/prompt.md` exists. If not, the user needs to copy it from the Ralph installation.

### 8. Confirm with User

```
✅ Created scripts/ralph/prd.json with [N] stories
✅ Initialized scripts/ralph/progress.txt

To start Ralph:
  ./scripts/ralph/ralph.sh [max_iterations]

To check status:
  ./scripts/ralph/ralph-status.sh

Stories will be implemented in order:
1. US-001: [title]
2. US-002: [title]
...
```

## Quality Checks

Before finalizing, verify:

1. **Story sizes** - Each should be ~30 min of focused work
2. **Dependencies** - Lower priority numbers should not depend on higher
3. **Acceptance criteria** - Clear, testable, 3-5 per story
4. **Branch name** - Valid git branch name

If stories seem too large, suggest splitting them.

## Example Conversion

**Input (PRD excerpt):**
```markdown
### US-001: Add trips database table
**As a** developer
**I want to** have a trips table in the database
**So that** I can store trip information

**Acceptance Criteria:**
- [ ] Migration creates trips table
- [ ] Table has id, name, start_date, end_date columns
- [ ] Migration runs without errors

**Technical Notes:**
- Use Drizzle ORM migration
- Follow existing schema patterns in db/schema.ts
```

**Output (prd.json excerpt):**
```json
{
  "id": "US-001",
  "title": "Add trips database table",
  "description": "Create database migration for trips table with id, name, start_date, end_date columns. Use Drizzle ORM migration following patterns in db/schema.ts.",
  "acceptanceCriteria": [
    "Migration creates trips table",
    "Table has id, name, start_date, end_date columns",
    "Migration runs without errors"
  ],
  "priority": 1,
  "passes": false
}
```

## Tips

- Keep descriptions concise but include technical hints
- Acceptance criteria should be checkable, not vague
- Frontend stories should include "Verify in browser" as acceptance criteria
- Test stories should specify what tests to write, not just "add tests"
