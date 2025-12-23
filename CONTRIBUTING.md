# Contributing to Chravel

> **Important:** Before making architectural changes, read `docs/ACTIVE/ARCHITECTURE_DECISIONS.md`.

---

## Getting Started

### Prerequisites

- Node.js 18+ (use nvm: `nvm use 18`)
- npm (comes with Node.js)
- Git
- Supabase CLI (for Edge Functions development)

### Setup

```bash
# Clone the repository
git clone https://github.com/MeechYourGoals/Chravel.git
cd Chravel

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

### Environment Variables

See `docs/ACTIVE/ENVIRONMENT_SETUP_GUIDE.md` for detailed instructions on obtaining API keys.

---

## Development Workflow

### Branch Naming

- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates
- `refactor/*` - Code refactoring
- `chore/*` - Maintenance tasks

### Before Committing

**Every change must pass these checks:**

```bash
# Run all checks
npm run lint && npm run typecheck && npm run build

# Or use the validate script
npm run validate
```

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add real-time chat notifications
fix: resolve map marker positioning issue
docs: update deployment guide for Vercel
refactor: consolidate payment service functions
chore: update dependencies to latest versions
```

---

## Code Quality Standards

### TypeScript

- `"strict": true` is enforced
- All function parameters and return types must be explicitly typed
- No `any` types unless interfacing with untyped third-party libs (comment why)

### React Patterns

- Hooks first, handlers next, return last
- Use `useCallback` for handlers passed as props
- Always include cleanup in `useEffect` for subscriptions
- Compute derived state above return, don't store in state

### Supabase

- Never call Supabase directly in JSX
- Always go through `/src/integrations/supabase/client.ts`
- Handle errors explicitly (don't ignore them)
- Use generated Database types from Supabase CLI

See `CLAUDE.md` for comprehensive coding standards.

---

## Pull Request Guidelines

### PR Checklist

Before submitting a PR, ensure:

- [ ] All checks pass (`npm run validate`)
- [ ] Production build succeeds (`npm run build`)
- [ ] No console.log statements in production code
- [ ] No hardcoded development URLs or API keys
- [ ] Code follows patterns in `CLAUDE.md`

### Architectural Review

PRs that involve architectural changes require additional review:

- [ ] No deprecated mobile strategies introduced
- [ ] Flutter remains the only native mobile path
- [ ] Docs updated to match code changes
- [ ] Changes align with `ARCHITECTURE_DECISIONS.md`

### What Will Get Your PR Rejected

1. **Build failures**: Code that doesn't compile
2. **Type errors**: Missing or incorrect TypeScript types
3. **Lint errors**: ESLint violations
4. **Platform regressions**: Reintroducing Capacitor or hybrid wrappers
5. **Security issues**: Exposed secrets, SQL injection, XSS vulnerabilities
6. **Missing error handling**: Ignored async errors

---

## Platform Policy

### No Regressions Policy

This repository has an explicit No Regressions Policy regarding mobile platform strategy.

**PRs that reintroduce deprecated platform assumptions will be rejected.**

Specifically, do NOT:

- Add Capacitor, Cordova, or hybrid wrapper dependencies
- Add deployment steps using `npx cap`, `capacitor.config.*`
- Document Capacitor as a supported mobile path
- Create CI/CD workflows for Capacitor-based builds
- Mix Flutter and Capacitor concepts in documentation

**Read:** `ARCHITECTURE_DECISIONS.md` before making architectural changes.

### Current Platform Reality

| Platform | Status | Technology |
|----------|--------|------------|
| Web | **Active** | React/TypeScript + Vite |
| PWA | **Active** | Service Worker |
| iOS | **Planned** | Flutter (separate repo) |
| Android | **Planned** | Flutter (separate repo) |

The Flutter mobile app does not exist in this repository. This repo is web-only.

---

## Testing

### Unit Tests

```bash
# Run unit tests
npm run test

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui
```

### E2E Tests

```bash
# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

### Manual Testing Checklist

Before major releases, test:

- Authentication flow (sign up, sign in, sign out)
- Trip creation and editing
- Real-time chat messaging
- Media upload
- Expense splitting
- Calendar management
- AI Concierge responses
- Offline functionality (PWA)

---

## Documentation

### Updating Docs

When you change code, update related documentation:

1. Feature changes → Update `DEVELOPER_HANDBOOK.md`
2. Deployment changes → Update `DEPLOYMENT_GUIDE.md`
3. API changes → Update `docs/API_DOCUMENTATION.md`
4. Architecture changes → Update `ARCHITECTURE_DECISIONS.md`

### Documentation Standards

- Use clear, concise language
- Include code examples where helpful
- Keep instructions actionable
- Date all documents
- Avoid historical context unless in archive

---

## Getting Help

### Resources

- **Development Setup**: `DEVELOPER_HANDBOOK.md`
- **Deployment**: `DEPLOYMENT_GUIDE.md`
- **Architecture**: `ARCHITECTURE_DECISIONS.md`
- **API Reference**: `docs/API_DOCUMENTATION.md`
- **Coding Standards**: `CLAUDE.md`

### Support

- **GitHub Issues**: Report bugs and request features
- **Pull Requests**: Contribute code changes
- **Discussions**: Ask questions and share ideas

---

## License

See `LICENSE` file for licensing information.

---

**Last Updated:** December 2025
