# 🚨 TROUBLESHOOTING & EMERGENCY FIXES

> **Purpose:** Escape hatches when AI tools mess up or checks are too strict
> **Philosophy:** Better to ship with warnings than to block all development

---

## 🆘 EMERGENCY: I Need to Deploy NOW

### Option 1: Skip Pre-Commit Hooks (Fastest)
```bash
# Skip all pre-commit checks and commit immediately
git commit --no-verify -m "emergency fix: description"
git push
```

**When to use:** Critical production bug, AI generated broken code, deadline pressure

**Risk:** Code might have linting/type errors (but will still deploy if it builds)

---

### Option 2: Auto-Fix Everything Possible
```bash
# Fix all auto-fixable issues
npm run fix

# Then commit normally
git add .
git commit -m "fix: auto-fixed linting and formatting"
git push
```

**When to use:** Most common case - AI added extra brackets, formatting issues, etc.

---

### Option 3: Skip Specific Checks
```bash
# Skip type checking but keep linting
SKIP_TYPECHECK=true git commit -m "fix: description"

# Or just format + commit
npm run format
git commit --no-verify -m "fix: description"
```

---

## 🔧 Common AI Code Mistakes & Quick Fixes

### 1. TypeScript Errors ("Property X does not exist...")
```bash
# See all type errors
npm run typecheck

# Quick fix: Add type assertions
# Before: const user = data.user;
# After:  const user = data.user as User;

# Or add any temporarily (not ideal but unblocks)
# After:  const user = data.user as any; // TODO: fix type
```

### 2. ESLint Errors (unused vars, missing deps, etc.)
```bash
# Auto-fix most issues
npm run lint

# If it still fails, disable the rule for that line:
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const unusedVar = something;
```

### 3. Unclosed Brackets/Braces
```bash
# Use your editor's bracket matcher
# VS Code: Ctrl+Shift+P → "Go to Bracket"

# Or use prettier to auto-fix formatting
npm run format
```

### 4. Build Failures
```bash
# See the exact error
npm run build

# Common fixes:
# - Missing import: Add the import statement
# - Undefined variable: Check spelling, add declaration
# - Type error: Add type assertion or fix the type
```

---

## 🎚️ Adjusting Strictness Levels

### Make Pre-Commit Hooks Less Strict

Edit `.lintstagedrc.js` to skip type checking:

```javascript
module.exports = {
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix',
    'prettier --write',
    // Remove this line to skip typecheck:
    // () => 'tsc --noEmit',
  ],
  '*.{json,css,md}': ['prettier --write'],
};
```

Then commit:
```bash
git add .lintstagedrc.js
git commit -m "chore: reduce pre-commit strictness"
git push
```

---

### Disable Specific ESLint Rules

Edit `eslint.config.js` and change errors to warnings:

```javascript
rules: {
  // Change from "error" to "warn"
  "@typescript-eslint/no-unused-vars": "warn",  // Was: "error"
  "@typescript-eslint/no-explicit-any": "off",  // Was: "warn"
}
```

---

### Skip CI Checks Temporarily

If GitHub Actions CI is blocking your PR:

1. **Option A: Merge anyway** (if you have admin access)
   - Go to PR → "Merge without waiting for checks"

2. **Option B: Disable CI temporarily**
   - Rename `.github/workflows/ci.yml` to `ci.yml.disabled`
   - Push, merge, then re-enable

---

## 🛡️ Graduated Enforcement Strategy

### Phase 1: Warnings Only (Week 1-2)
**Goal:** Learn what breaks, fix gradually

```bash
# All checks run but don't block
npm run lint        # Shows warnings, doesn't fail
npm run typecheck   # Shows errors, doesn't fail
npm run build       # Only this blocks deployment
```

**Action:**
- Note common errors
- Fix them gradually
- AI tools learn from fixes

---

### Phase 2: Soft Enforcement (Week 3-4)
**Goal:** Auto-fix what we can, warn about the rest

```bash
# Pre-commit auto-fixes most issues
git commit  # Runs lint --fix, prettier --write
            # Shows type errors but doesn't block

# CI reports but doesn't block PRs
# Vercel still deploys
```

**Action:**
- Fix type errors when convenient
- Let auto-fix handle formatting/linting
- Only Vercel build failures block deploys

---

### Phase 3: Full Enforcement (Month 2+)
**Goal:** All checks must pass

```bash
# Pre-commit blocks if checks fail
git commit  # Must pass: lint, format, typecheck

# CI blocks PR merge if checks fail
# Vercel only deploys if CI passes
```

**Action:**
- Codebase is now clean
- New code must meet standards
- Escape hatches still available for emergencies

---

## 🚀 Quick Fix Scripts

### I Just Want to Ship This

```bash
# 1. Auto-fix everything possible
npm run fix

# 2. If still broken, commit with --no-verify
git commit --no-verify -m "fix: emergency deploy"

# 3. Push and deploy
git push

# 4. Fix properly later
# TODO: Come back and fix the type errors
```

---

### AI Generated Broken Code

```bash
# 1. Check what's broken
npm run validate

# 2. Try auto-fix first
npm run fix

# 3. If types are wrong, add quick workarounds
# Find the error:
npm run typecheck | grep error

# Add type assertions:
const data = response.data as YourType;

# Or temporarily disable:
// @ts-ignore
const data = response.data;

# 4. Commit and note the TODO
git commit -m "fix: workaround for AI type error, TODO: fix properly"
```

---

### Vercel Deployment Failed

```bash
# 1. Check Vercel logs for the exact error
# Look for: "error TS..." or "error: ..."

# 2. Fix locally
npm run build  # Reproduce the error

# 3. Common Vercel-specific fixes:

# Missing environment variables:
# → Add them in Vercel dashboard

# Import path case mismatch:
# → Ensure import './Component' matches file Component.tsx (case-sensitive)

# Missing dependencies:
# → npm install <package> --save
# → Commit package.json and package-lock.json

# 4. Push and redeploy
git push
```

---

## 📋 Checklist: When AI Breaks Things

- [ ] Run `npm run fix` first (auto-fixes 80% of issues)
- [ ] Run `npm run typecheck` to see type errors
- [ ] Add `// @ts-ignore` or `as any` for quick workarounds
- [ ] Add `// eslint-disable-next-line` for linting issues
- [ ] Use `git commit --no-verify` if stuck
- [ ] Add TODO comments for proper fixes later
- [ ] Deploy first, fix properly later if urgent

---

## 🎯 Philosophy: Ship First, Perfect Later

### The Goal is NOT Perfection
- ✅ Code should **build** (non-negotiable)
- ✅ Code should **run** (non-negotiable)
- ⚠️ Code should be **typed** (nice to have, fix later)
- ⚠️ Code should be **lint-free** (nice to have, auto-fixable)
- ⚠️ Code should be **formatted** (nice to have, auto-fixable)

### Priority Order
1. **Does it build?** (`npm run build`) ← Only true blocker
2. **Does it work?** (Test manually) ← Second blocker
3. **Does it have types?** (`npm run typecheck`) ← Fix when convenient
4. **Is it clean?** (`npm run lint`) ← Auto-fix handles this

---

## 🔑 Emergency Override Commands

### Bypass Everything (Nuclear Option)
```bash
# Commit without any checks
HUSKY=0 git commit -m "emergency fix" --no-verify

# Force push if needed
git push --force-with-lease
```

### Disable Husky Temporarily
```bash
# Disable pre-commit hooks for this session
export HUSKY=0

# Now commits skip all checks
git commit -m "fix: something"

# Re-enable when done
unset HUSKY
```

### Quick Type Fix for Entire File
```bash
# Add to top of file to skip type checking
// @ts-nocheck

// Your code here...
```

**Use sparingly!** But it unblocks deployments.

---

## 📞 When to Use Each Escape Hatch

| Situation | Command | Risk Level |
|-----------|---------|------------|
| Production is down | `git commit --no-verify` | 🟢 Low (if it builds) |
| Deadline in 1 hour | `npm run fix && git commit --no-verify` | 🟢 Low |
| AI broke types | Add `as any` temporarily | 🟡 Medium (tech debt) |
| Vercel failing | Fix the build error | 🟢 Low (required) |
| Stuck in dev loop | `HUSKY=0 git commit` | 🟡 Medium (bypasses all checks) |
| Everything broken | `// @ts-nocheck` at file top | 🔴 High (disables type safety) |

---

## ✅ Safe Defaults

**This setup is configured to:**
- ✅ Auto-fix linting issues (doesn't block)
- ✅ Auto-format code (doesn't block)
- ⚠️ Show type errors (warns but doesn't block initially)
- ✅ Only block if build fails (Vercel requirement)

**You can always:**
- Use `--no-verify` to skip checks
- Merge PRs even if CI warns
- Fix properly later when not under pressure

---

## 🎓 Learning from AI Mistakes

### Common Patterns

1. **AI adds extra closing bracket**
   - **Fix:** `npm run format` (Prettier catches it)

2. **AI uses wrong type**
   - **Quick fix:** Add `as Type` assertion
   - **Proper fix:** Update the type definition

3. **AI leaves unused variables**
   - **Fix:** `npm run lint` (ESLint removes them)

4. **AI doesn't cleanup useEffect**
   - **Quick fix:** Add return cleanup
   - **Future:** AI learns from CLAUDE.md

### Train Your AI Tools

After fixing AI mistakes:
- Keep the corrected code
- AI tools learn from your corrections
- Gradually they make fewer mistakes
- The manifesto guides them better over time

---

**Remember: These standards are guardrails, not prison walls. Use escape hatches when needed. Ship code, fix later if urgent.** 🚀
