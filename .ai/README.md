# 🤖 Universal AI Coding Assistant Instructions

> **For:** Google Jules, GitHub Copilot, and any other AI coding assistant
> **Primary Documentation:** See ../CLAUDE.md for complete engineering standards
> **Quick Reference:** See ../AI_GUIDELINES.md for condensed rules

---

## 📋 AI Assistant Configuration Map

This project supports multiple AI coding assistants. Each has its own instruction file:

### Supported AI Assistants

| AI Assistant | Instruction File | Status |
|--------------|------------------|--------|
| **Claude Code** | `../CLAUDE.md` | ✅ Primary (most detailed) |
| **Cursor** | `../.cursorrules` | ✅ Configured |
| **Lovable** | `../.lovable/instructions.md` | ✅ Configured |
| **Google Jules** | This file (`.ai/README.md`) | ✅ Configured |
| **GitHub Copilot** | Context from workspace | ℹ️ Uses project context |
| **Others** | This file + `../AI_GUIDELINES.md` | ✅ Fallback |

---

## 🎯 Quick Start for AI Assistants

### Step 1: Read the Primary Documentation
**→ Read `../CLAUDE.md`** - This is the complete engineering manifesto with:
- Full React patterns with examples
- Supabase integration rules
- Google Maps implementation patterns
- Error prevention strategies
- Complete code examples

### Step 2: Understand Build Requirements
Every code change must pass:
```bash
npm run lint        # ESLint validation
npm run typecheck   # TypeScript validation
npm run build       # Production build test
```

### Step 3: Follow Core Principles
1. **Zero Syntax Errors** - Every bracket must close cleanly
2. **TypeScript Strict Mode** - All types must be explicit
3. **No Experimental Syntax** - Use stable APIs only
4. **Readable Code** - Clear names, single responsibility functions

---

## ⚙️ CRITICAL RULES (All AI Assistants)

### 1. Zero Syntax Errors
- Every `{}`, `()`, `[]`, and JSX tag must close cleanly
- Mentally simulate `npm run build` before returning code
- If uncertain about bracket balance → simplify

### 2. TypeScript Requirements
- All function parameters must have explicit types
- All return types must be declared
- No `any` types unless documented with a comment explaining why
- Use project's generated Database types for Supabase

### 3. React Patterns
```tsx
// ✅ CORRECT: Hooks first, handlers next, return last
export function Component({ prop }: Props) {
  const [state, setState] = useState<Type>(initialValue);

  const handleAction = useCallback(() => {
    // handler logic
  }, [dependencies]);

  return <div>JSX</div>;
}

// ❌ WRONG: Hooks inside conditionals
if (condition) {
  const [state, setState] = useState(); // BREAKS REACT RULES
}
```

### 4. Supabase Integration
- **Never** call Supabase directly in JSX event handlers
- **Always** route through `/src/integrations/supabase/client.ts`
- **Always** handle error objects explicitly
- **Never** ignore errors from database operations

```tsx
// ✅ CORRECT
const { data, error } = await supabase.from('trips').select('*');
if (error) {
  console.error('Database error:', error);
  setError(error.message);
  return;
}
setData(data ?? []);

// ❌ WRONG - ignoring errors
const { data } = await supabase.from('trips').select('*');
setData(data); // What if there was an error?
```

### 5. Google Maps
- **Always** null-check `mapRef.current` before operations
- **Always** clean up event listeners in `useEffect` return
- **Debounce** high-frequency events (drag, zoom, bounds_changed)
- **Type** all coordinates as `{ lat: number; lng: number }`

```tsx
// ✅ CORRECT
if (mapRef.current) {
  mapRef.current.setCenter({ lat, lng });
}

// ❌ WRONG - no null check
mapRef.current.setCenter({ lat, lng }); // CRASHES if map not loaded
```

---

## 🚫 PROHIBITED ACTIONS

All AI assistants must **NEVER**:

1. ❌ Output partial or broken code that won't compile
2. ❌ Use experimental TypeScript syntax (decorators, stage-3 proposals)
3. ❌ Create duplicate implementations of existing components
4. ❌ Ignore error objects from async operations
5. ❌ Add `console.log` statements without removing before commit
6. ❌ Use `any` type without documenting why
7. ❌ Break existing working code when adding features
8. ❌ Skip type definitions for function parameters/returns

---

## ✅ REQUIRED BEHAVIORS

All AI assistants must **ALWAYS**:

1. ✅ Validate syntax before returning code
2. ✅ Test mentally: "Would `npm run build` pass?"
3. ✅ Preserve existing working code patterns
4. ✅ Add comments for complex logic
5. ✅ Use stable, production-ready APIs only
6. ✅ Follow existing project structure and patterns
7. ✅ Type all variables, parameters, and returns explicitly
8. ✅ Handle errors gracefully with user-friendly messages

---

## 📁 PROJECT STRUCTURE

### Key Directories
```
/src
  /components/         # Reusable React components
  /pages/             # Route pages
  /integrations/
    /supabase/        # Database client, types, and queries
  /lib/               # Utility functions
  /hooks/             # Custom React hooks
  /types/             # TypeScript type definitions
```

### Key Files
- `/src/integrations/supabase/client.ts` — Supabase singleton (use this!)
- `/src/integrations/supabase/types.ts` — Generated database types
- `/package.json` — Scripts and dependencies
- `/tsconfig.json` — TypeScript configuration

---

## 🔧 DEVELOPMENT WORKFLOW

### Local Development
```bash
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run lint         # Run ESLint with auto-fix
npm run typecheck    # Validate TypeScript without building
npm run build        # Create production build
npm run preview      # Preview production build locally
```

### Pre-Commit Validation
```bash
npm run validate     # Run all checks: lint + typecheck + format
```

### Testing
```bash
npm run test         # Run Vitest tests
```

---

## 🎯 COMMON PATTERNS (Quick Reference)

### State Management
```tsx
// ✅ Typed state
const [items, setItems] = useState<Item[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// ✅ Derived state (don't store in state!)
const activeItems = items.filter(item => item.isActive);
```

### Effect Cleanup
```tsx
// ✅ Always cleanup to prevent memory leaks
useEffect(() => {
  let mounted = true;

  async function loadData() {
    const data = await fetchData();
    if (mounted) {
      setData(data);
    }
  }

  loadData();
  return () => { mounted = false; }; // Cleanup
}, []);
```

### Event Handlers
```tsx
// ✅ Memoize handlers passed as props
const handleClick = useCallback((id: string) => {
  if (!id) {
    console.error('ID is required');
    return;
  }
  performAction(id);
}, [performAction]);
```

---

## 🔗 DOCUMENTATION HIERARCHY

1. **../CLAUDE.md** ← Start here (most comprehensive)
2. **../AI_GUIDELINES.md** ← Quick reference
3. **../.cursorrules** ← Cursor-specific
4. **../.lovable/instructions.md** ← Lovable-specific
5. **.ai/README.md** ← This file (universal fallback)

---

## ✅ FINAL RULE

> **"If it doesn't build, it doesn't ship."**

Every AI assistant must guarantee that generated code:
1. Passes `npm run lint && npm run typecheck && npm run build`
2. Has clean syntax (balanced brackets, proper JSX)
3. Has explicit types (no undocumented `any`)
4. Follows patterns documented in `../CLAUDE.md`
5. Is production-ready for Vercel deployment

---

## 📞 WHEN IN DOUBT

1. **Check existing code** - Look at similar components in `/src/components`
2. **Read CLAUDE.md** - Most questions are answered there
3. **Test locally** - Run `npm run validate` to catch errors
4. **Default to simpler code** - Clarity over cleverness
5. **Ask for clarification** - Better than guessing wrong

---

**Last Updated:** 2025-10-31
**Maintained By:** AI Engineering Team + Meech
**Primary Documentation:** ../CLAUDE.md
