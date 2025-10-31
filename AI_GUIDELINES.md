# AI Development Guidelines

All AI coding systems (Claude Code, Cursor, Lovable, Codex, Google Jules, etc.) must follow the rules in **`CLAUDE.md`**.

## 🤖 AI Assistant Configuration Map

Each AI assistant has its own instruction file, but all reference **CLAUDE.md** for complete standards:

| AI Assistant | Primary Instruction File | Status |
|--------------|-------------------------|--------|
| **Claude Code** | `CLAUDE.md` | ✅ Most detailed |
| **Cursor** | `.cursorrules` | ✅ Configured |
| **Lovable** | `.lovable/instructions.md` | ✅ Configured |
| **Google Jules** | `.ai/README.md` | ✅ Configured |
| **Others** | `.ai/README.md` + this file | ✅ Fallback |

**All files reference `CLAUDE.md` as the source of truth.**

## Quick Reference
- Run `npm run lint && npm run typecheck && npm run build` before merging
- See **`CLAUDE.md`** for full patterns and examples
- If it doesn't build, it doesn't ship

## File Structure
- `CLAUDE.md` — Primary engineering manifesto (read this first)
- `.cursorrules` — Cursor AI specific instructions
- `.lovable/instructions.md` — Lovable AI specific instructions
- `.ai/README.md` — Universal fallback for any AI assistant
- `.claude/settings.json` — Auto-formatting hooks for Claude Code
- `.prettierrc` + `eslint.config.js` — Code style enforcement

## Core Principles

### 1. Zero Syntax Errors
Every bracket, parenthesis, and JSX tag must close cleanly. Test with `npm run build` before committing.

### 2. TypeScript Strict Mode
All function parameters and return types must be explicitly typed. No `any` types unless documented.

### 3. React Patterns
- Hooks first, handlers next, return last
- Always cleanup in `useEffect` returns
- Memoize handlers passed as props
- Never call hooks conditionally

### 4. Supabase Integration
- Handle errors explicitly
- Type all queries
- Never call Supabase in JSX
- Use optimistic updates

### 5. Google Maps
- Always null-check `mapRef.current`
- Debounce high-frequency events
- Clean up event listeners
- One map instance per page

## Pre-Commit Requirements

Every commit must pass:
```bash
npm run lint        # ESLint with auto-fix
npm run typecheck   # TypeScript validation
npm run build       # Production build test
```

## When Builds Fail

1. Read the exact error message
2. Check bracket balance
3. Run `npm run typecheck` locally
4. Fix syntax → commit → push
5. Check Vercel logs if still failing

## AI Agent Requirements

All AI assistants must:
- ✅ Validate syntax before returning code
- ✅ Preserve existing working code
- ✅ Comment complex logic
- ✅ Use stable APIs only
- ❌ Never output partial/broken code
- ❌ Never use experimental syntax
- ❌ Never ignore error objects

---

**For complete details, see `CLAUDE.md`**
