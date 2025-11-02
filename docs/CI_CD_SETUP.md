# CI/CD Setup Guide

## Overview

Chravel uses GitHub Actions for continuous integration and deployment. This ensures code quality, type safety, and build integrity on every push and pull request.

## GitHub Actions Workflow

### Configuration

The CI workflow is defined in `.github/workflows/ci.yml`.

**Key Features:**
- Runs on every push to `main` and `develop` branches
- Runs on all pull requests
- Uses Node.js 20.x (required for modern dependencies)
- Caches npm dependencies for faster builds
- Runs linting, type checking, and build verification

### Workflow Steps

1. **Checkout Code** - Pulls the latest code from the repository
2. **Setup Node.js 20.x** - Installs Node.js with npm caching
3. **Install Dependencies** - Runs `npm ci` for clean, reproducible installs
4. **Lint** - Runs `npm run lint` to catch code quality issues
5. **Type Check** - Runs `npm run typecheck` to verify TypeScript types
6. **Build** - Runs `npm run build` to ensure production build succeeds

### Environment

- **Runner:** Ubuntu Latest
- **Node Version:** 20.x (required by path-scurry@2.0.0 and other dependencies)
- **Package Manager:** npm with ci for reproducible builds

## Local Development

### Required Scripts

The following npm scripts are required for the CI workflow:

```json
{
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "build": "vite build"
  }
}
```

### Pre-Commit Checks

Before pushing code, run these commands locally to catch issues early:

```bash
# Run all checks that CI will run
npm run lint
npm run typecheck
npm run build
```

### Fixing Common Issues

**ESLint Errors:**
```bash
npm run lint          # See errors
npm run lint -- --fix # Auto-fix when possible
```

**TypeScript Errors:**
```bash
npm run typecheck     # See type errors
# Fix manually in your editor
```

**Build Errors:**
```bash
npm run build         # See build errors
# Check for syntax errors, missing imports, etc.
```

## Node.js Version Requirements

### Why Node.js 20?

Several modern dependencies require Node.js 20 or higher:
- `path-scurry@2.0.0` - Requires Node.js 20 or >=22
- Modern npm features and performance improvements
- Better ESM support
- Improved security and stability

### Local Development

Ensure you're using Node.js 20 or higher locally:

```bash
# Check your Node.js version
node --version

# If using nvm, install Node.js 20
nvm install 20
nvm use 20

# Make it default
nvm alias default 20
```

### CI/CD

The GitHub Actions workflow automatically uses Node.js 20.x via:

```yaml
- name: Use Node.js 20.x
  uses: actions/setup-node@v3
  with:
    node-version: '20'
```

## Package Lock File

### Importance

`package-lock.json` ensures reproducible builds by locking exact dependency versions.

**Critical Rules:**
- ✅ Always commit `package-lock.json` changes
- ✅ Run `npm install` (not `npm ci`) when adding/updating packages
- ✅ Keep it in sync with `package.json`
- ❌ Never manually edit `package-lock.json`
- ❌ Never delete it and regenerate (breaks lock integrity)

### Syncing the Lock File

If you see lock file warnings or CI failures:

```bash
# Regenerate lock file from package.json
npm install

# Commit the changes
git add package-lock.json
git commit -m "fix: sync package-lock.json"
git push
```

### Common Lock File Issues

**"Dependencies missing from lock file"**
- **Cause:** package.json updated without running `npm install`
- **Fix:** Run `npm install` and commit changes

**"Version mismatch"**
- **Cause:** Manual package.json edits or merge conflicts
- **Fix:** Run `npm install` and commit changes

**"Integrity check failed"**
- **Cause:** Corrupted lock file or npm cache issues
- **Fix:** Clear cache (`npm cache clean --force`), then `npm install`

## Deployment Workflow

### Branch Strategy

**Main Branch (`main`):**
- Production-ready code only
- Protected branch (requires PR approval)
- CI must pass before merge
- Deploys to production automatically (if configured)

**Development Branch (`develop`):**
- Active development
- Feature branches merge here first
- CI must pass before merge
- Deploys to staging environment

**Feature Branches:**
- Created from `develop`
- Naming: `feat/feature-name`, `fix/bug-name`
- CI runs on all pushes
- Merge to `develop` via PR

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull
   git checkout -b feat/your-feature
   ```

2. **Make Changes & Test Locally**
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```

3. **Commit & Push**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   git push origin feat/your-feature
   ```

4. **Open Pull Request**
   - GitHub will automatically run CI
   - Wait for green checkmark ✅
   - Request review from team
   - Address feedback
   - Merge when approved and CI passes

## Troubleshooting CI Failures

### Node Version Errors

**Error:** "The engine 'node' is incompatible with this module"

**Solution:** Update workflow to Node.js 20:
```yaml
node-version: '20'
```

### Lock File Errors

**Error:** "npm ERR! missing: package@version"

**Solution:** Sync lock file locally:
```bash
npm install
git add package-lock.json
git commit -m "fix: sync package-lock.json"
git push
```

### Lint Errors

**Error:** "ESLint found errors"

**Solution:** Fix locally first:
```bash
npm run lint -- --fix
git add .
git commit -m "fix: resolve lint errors"
git push
```

### Type Errors

**Error:** "TS2304: Cannot find name 'X'"

**Solution:** Fix TypeScript errors:
1. Check for missing imports
2. Verify type definitions installed
3. Run `npm run typecheck` locally
4. Fix all errors before pushing

### Build Errors

**Error:** "Vite build failed"

**Solution:** Common causes:
- Syntax errors in code
- Missing environment variables
- Import path issues
- Check build output for specific error
- Reproduce locally with `npm run build`

## Best Practices

### Code Quality

1. **Always run checks before pushing:**
   ```bash
   npm run lint && npm run typecheck && npm run build
   ```

2. **Use VS Code extensions:**
   - ESLint
   - Prettier
   - TypeScript

3. **Enable auto-fix on save:**
   ```json
   {
     "editor.codeActionsOnSave": {
       "source.fixAll.eslint": true
     }
   }
   ```

### Dependency Management

1. **Use exact versions for critical packages**
2. **Regular updates:** `npm outdated` → `npm update`
3. **Security audits:** `npm audit` → `npm audit fix`
4. **Keep lock file in sync:** Always commit after `npm install`

### Commit Hygiene

1. **Conventional Commits:**
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation
   - `style:` - Formatting
   - `refactor:` - Code restructuring
   - `test:` - Tests
   - `chore:` - Maintenance

2. **Atomic commits:** One logical change per commit
3. **Descriptive messages:** Explain why, not what
4. **Reference issues:** `fix: resolve login bug (#123)`

## Monitoring

### GitHub Actions Dashboard

View workflow runs:
1. Go to repository → Actions tab
2. See all workflow runs
3. Click any run to see detailed logs
4. Re-run failed workflows if needed

### Success Indicators

✅ **Green checkmark** - All checks passed
❌ **Red X** - CI failed, click for details
🟡 **Yellow dot** - CI running

### Notifications

Enable notifications for:
- Failed workflows on your branches
- PR review requests
- Deployment status

## Future Enhancements

### Planned Improvements

- [ ] Add test coverage reporting
- [ ] Add automated deployment to Vercel/Netlify
- [ ] Add performance benchmarking
- [ ] Add security scanning (Snyk, Dependabot)
- [ ] Add E2E testing with Playwright
- [ ] Add visual regression testing
- [ ] Add automated changelog generation
- [ ] Add release automation

### Progressive Enhancement

The CI/CD pipeline will grow with the project:
1. **Phase 1 (Current):** Lint, type check, build
2. **Phase 2:** Add unit tests, coverage thresholds
3. **Phase 3:** Add integration tests, E2E tests
4. **Phase 4:** Add deployment automation
5. **Phase 5:** Add monitoring and alerts

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Node.js Version Policy](https://nodejs.org/en/about/releases/)
- [npm ci vs npm install](https://docs.npmjs.com/cli/v8/commands/npm-ci)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Last Updated:** November 2, 2025
**Maintainer:** Chravel Engineering Team

