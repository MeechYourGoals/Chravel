# PRD Skill

Generate detailed Product Requirements Documents (PRDs) for features.

## When to Use

Use this skill when you need to create a PRD for a new feature before implementing it with Ralph.

## Workflow

When the user says "Load the prd skill and create a PRD for [feature]", follow this process:

### 1. Gather Information

Ask clarifying questions to understand the feature:

1. **What problem does this solve?** - The user need or pain point
2. **Who is the target user?** - Specific user persona or segment
3. **What's the scope?** - MVP vs full feature
4. **What tech stack?** - Framework, database, etc.
5. **Any existing patterns?** - UI components, API conventions to follow
6. **Success criteria?** - How will we know it works?

Don't ask all at once - conversational back-and-forth is fine.

### 2. Generate the PRD

Create a markdown file at `tasks/prd-[feature-name].md` with this structure:

```markdown
# PRD: [Feature Name]

## Overview
Brief description of the feature and its purpose.

## Problem Statement
What user problem does this solve? Why now?

## Target Users
Who will use this feature?

## Goals
- Goal 1
- Goal 2

## Non-Goals
- What this feature will NOT do

## User Stories

### US-001: [Story Title]
**As a** [user type]
**I want to** [action]
**So that** [benefit]

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Technical Notes:**
- Implementation hints
- Files to modify
- Dependencies

---

### US-002: [Next Story]
...

## Technical Approach
High-level technical strategy.

## Dependencies
- External services
- Other features
- Libraries needed

## Out of Scope (Future)
Things we might do later but not in this PRD.

## Success Metrics
How we measure success.
```

### 3. Story Guidelines

Each user story should be:

- **Small** - Completable in one Claude Code context window (~30 min of work)
- **Independent** - Can be implemented without other incomplete stories
- **Testable** - Clear acceptance criteria
- **Ordered** - Dependencies flow correctly (schema before API, API before UI)

**Right-sized stories:**
- Add a database migration
- Create an API endpoint
- Build a UI component
- Add form validation
- Implement a specific test suite

**Too big (split these):**
- "Build the authentication system"
- "Create the dashboard"
- "Add the admin panel"

### 4. Save the PRD

```bash
mkdir -p tasks
cat > tasks/prd-[feature-name].md << 'EOF'
[PRD content here]
EOF
```

Confirm the file location with the user.

### 5. Next Steps

Tell the user:
```
PRD saved to tasks/prd-[feature-name].md

To convert this to Ralph format and start autonomous development:
1. Say: "Load the ralph skill and convert tasks/prd-[feature-name].md to prd.json"
2. Then run: ./scripts/ralph/ralph.sh
```

## Tips

- Ask about UI requirements early - browser verification stories need specific details
- Include technical notes to help future Claude instances
- Order stories by dependency: data → API → UI
- Each story should have 3-5 acceptance criteria, not 15
- Consider error states and edge cases as separate stories
