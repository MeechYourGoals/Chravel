# Anti-Goldfish Protocol for Chravel

## Core Principle
Long-running agents fail from lack of engineering rituals, not lack of intelligence.

## Session Protocol (MANDATORY)

### 1. Session Start Checklist
```bash
# ALWAYS start every session with these steps:
1. Read claude-progress.txt (current state)
2. Read git log --oneline -10 (recent changes)
3. Check npm run lint && npm run typecheck (build health)
4. Verify server starts (npm run dev)
5. Review "What's Broken" and "Do NOT Touch" sections
```

### 2. Work Discipline
- **ONE feature per session** - Pick from Feature Queue, mark in progress
- **Incremental commits** - Commit after each logical unit of work
- **E2E validation** - Test as a real user, not just unit tests
- **Leave breadcrumbs** - Update progress file before ending session

### 3. Session End Checklist
```bash
# ALWAYS end every session with these steps:
1. Run all tests (npm run test, npm run typecheck)
2. Commit code with clear message
3. Update claude-progress.txt:
   - Mark feature status
   - Document what's broken
   - Write "Immediate Next Action"
   - Note any gotchas
4. Never leave session with broken build
```

## Testing Philosophy

### ❌ INSUFFICIENT
- Unit tests pass
- `curl localhost:3000` returns 200
- "Looks good to me"

### ✅ REQUIRED
- Manual browser testing of the actual feature
- User flows work end-to-end
- Screenshots of working UI
- Edge cases validated
- Mobile responsive verified

## Failure Modes Prevented

| Old Behavior | New Behavior |
|--------------|--------------|
| "Feature complete!" (it wasn't) | Check feature_list.json status |
| Lost track of what was done | Read git log + progress file |
| Broke auth while fixing calendar | Check "Do NOT Touch" list |
| Spent 2 hours on broken environment | Run _init.sh health checks first |
| One-shot entire rewrite | Pick ONE feature, complete it |

## File Structure

```
/
├── claude-progress.txt       # Session state, handoff notes
├── CLAUDE_PROTOCOL.md        # This file - the rules
├── _init.sh                  # Environment setup script (optional)
└── .git/                     # Commit history = memory
```

## Communication Contract

### When Claude Starts a Session
"Reading project state... [summary of progress file + git log]"

### When Claude Finishes a Session  
"Updated claude-progress.txt with:
- Feature [X] status: ✅/⏳/❌
- Next session: [specific action]
- Commits: [list]"

### When Claude Encounters Blocker
"Blocker: [issue]. Documented in progress file. Need: [what's needed]."

## Non-Negotiables

1. **Never skip reading claude-progress.txt** at session start
2. **Never mark feature done** without E2E validation
3. **Never commit broken code** (lint/typecheck must pass)
4. **Never leave vague handoff** ("work on payments" → "implement split calculation for N people in PaymentsTab.tsx")
5. **Never touch "Do NOT Touch" files** without explicit permission

## Questions to Ask Every Session

1. What's the ONE thing I'm supposed to build right now?
2. What was I told NOT to touch?
3. What's currently broken that I need to avoid breaking further?
4. How will I know this feature is actually done?
5. What should the next session work on?

---

**Remember**: You're not a goldfish. Act like a senior engineer.
