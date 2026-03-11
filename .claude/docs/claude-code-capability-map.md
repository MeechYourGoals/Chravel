# Claude Code Capability Map

> What is a skill, what is built-in, what is a hook, and what is none of these.
> Last updated: 2026-03-11

---

## 1. Built-in Commands (NOT skills)

These are hardcoded into Claude Code. You cannot override or extend them.

| Command | Purpose |
|---|---|
| `/help` | Show help and available commands |
| `/clear` | Clear conversation history |
| `/compact [instructions]` | Compact context with optional focus |
| `/context` | Visualize context usage |
| `/copy` | Copy last response to clipboard |
| `/cost` | Show token usage statistics |
| `/exit` | Exit the CLI |
| `/model [model]` | Select or change AI model |
| `/permissions` | View/update tool permissions |
| `/config` | Open settings interface |
| `/hooks` | Manage hook configurations |
| `/mcp` | Manage MCP server connections |
| `/memory` | Edit CLAUDE.md or manage auto-memory |
| `/init` | Initialize project with CLAUDE.md |
| `/btw <question>` | Quick side question without adding to history |
| `/fast [on\|off]` | Toggle fast mode (same model, faster output) |
| `/plan` | Enter plan mode |
| `/vim` | Toggle Vim editing mode |
| `/rewind` | Rewind to previous checkpoint |
| `/fork [name]` | Fork conversation at current point |
| `/diff` | Interactive diff viewer |
| `/doctor` | Diagnose Claude Code installation |
| `/tasks` | List background tasks |
| `/agents` | Manage agent configurations |
| `/plugin` | Manage plugins |
| `/skills` | List available skills |
| `/theme` | Change color theme |
| `/output-style [style]` | Switch output styles |
| `/insights` | Generate session analysis report |

---

## 2. Bundled Anthropic Skills (shipped with Claude Code)

These are prompt-based skills that come with every Claude Code installation.

| Skill | Trigger | Purpose |
|---|---|---|
| `/simplify` | User-invoked or auto on code review | Review changed code for reuse, quality, efficiency |
| `/batch <instruction>` | User-invoked | Large-scale parallel changes across codebase |
| `/debug` | User-invoked | Troubleshoot current session using debug log |
| `/loop [interval] <prompt>` | User-invoked | Run a prompt repeatedly on a cron schedule |
| `/claude-api` | Auto on `anthropic`/`@anthropic-ai/sdk` imports | Load Claude API reference material |
| `/session-start-hook` | User-invoked | Create SessionStart hooks for web sessions |
| `/security-review` | User-invoked | Analyze pending changes for security vulnerabilities |
| `/pr-comments [PR]` | User-invoked | Fetch GitHub PR review comments |

---

## 3. Output Styles (NOT skills)

Switched via `/output-style [name]`. These modify Claude's response behavior, not its capabilities.

| Style | Purpose |
|---|---|
| **Default** | Standard code and guidance |
| **Explanatory** | Adds educational insights about implementation choices |
| **Learning** | Pauses to ask user to write small code pieces for practice |
| **Custom** | Create `.claude/output-styles/<name>/STYLE.md` |

---

## 4. Hooks (NOT skills — deterministic lifecycle automation)

Configured in `settings.json`. Fire automatically at lifecycle events.

| Hook Event | Purpose | Example |
|---|---|---|
| `SessionStart` | Run on session begin | Install dependencies |
| `Stop` | Run when Claude finishes responding | Verify commits pushed |
| `PreToolUse` | Before tool executes (can block) | Prevent edits to protected files |
| `PostToolUse` | After tool succeeds | Auto-format with Prettier |
| `PostToolUseFailure` | After tool fails | Cleanup after failures |
| `UserPromptSubmit` | Before Claude processes your prompt | Validate/modify prompts |
| `PreCompact` | Before context compaction | Save state |
| `SessionEnd` | Session terminates | Cleanup |
| `SubagentStart/Stop` | Subagent lifecycle | Track subagent work |
| `Notification` | Claude sends notification | Desktop alerts |

**Key difference from skills:** Hooks are deterministic shell commands that fire on events. Skills are prompt-based instructions that change how Claude thinks and acts.

---

## 5. Custom Global Skills (~/.claude/skills/)

Personal skills available across all projects.

| Skill | Purpose |
|---|---|
| `architecture-audit` | Audit codebase architecture for structural issues |
| `simplify` | Code quality and simplification review |
| `debug-systematically` | Root-cause debugging with evidence-based diagnosis |
| `test-first-bugfix` | Reproduce → diagnose → fix → prove workflow |
| `refactor-safely` | Incremental refactoring with regression protection |
| `dead-code-cleanup` | Find and remove dead/unreachable code |
| `regression-containment` | Blast-radius analysis and regression prevention |
| `mobile-parity-audit` | Cross-platform feature/behavior parity audit |
| `security-review` | Security vulnerability and auth boundary audit |
| `dependency-and-hooks-audit` | React hooks, deps, effects, wiring audit |
| `prompt-optimizer` | Optimize prompts for AI coding agents |
| `implementation-plan` | Create step-by-step implementation plans |
| `pr-review-hard-mode` | Rigorous PR review with no hand-waving |
| `root-cause-analysis` | Deep root cause investigation for incidents |
| `ship-readiness` | Pre-ship verification checklist |
| `docs-sync` | Sync documentation with code reality |
| `learn-from-fixes` | Extract patterns from bug fixes for prevention |

---

## 6. Custom Chravel Repo Skills (.claude/skills/)

Project-specific skills for ChravelApp.

| Skill | Purpose |
|---|---|
| `chravel-architecture-audit` | Chravel-specific architecture and feature audit |
| `chravel-ui-consistency` | Design language and component consistency |
| `chravel-mobile-pwa-parity` | PWA/mobile web parity for Chravel flows |
| `chravel-gemini-live-debug` | Debug Gemini API / AI concierge integration |
| `chravel-ai-concierge` | AI concierge implementation guidance |
| `chravel-supabase-rls` | Supabase RLS, edge functions, auth audit |
| `chravel-smart-import` | Smart Import feature implementation |
| `chravel-payments` | Payments, RevenueCat, entitlements |
| `chravel-performance-audit` | Performance audit for critical paths |
| `chravel-release-readiness` | Release checklist for Chravel deploys |
| `chravel-design-language` | Premium dark/gold design system enforcement |
| `chravel-no-regressions` | Regression prevention for Trip Not Found, auth, RLS |
| `chravel-repo-map` | Codebase navigation and architecture reference |
| `chravel-bug-repro-first` | Chravel-specific bug reproduction workflow |
| `chravel-prd` | Create PRDs for Chravel features (user-invoked) |
| `chravel-ralph` | Convert PRDs to Ralph JSON format (user-invoked) |
| `chravel-gemini-api-ref` | Gemini API reference (auto-loaded, not in menu) |
| `agent-tooling-audit` | AI agent architecture and tool safety audit |

---

## 7. Subagents (NOT skills — isolated execution contexts)

Spawned by skills or Claude directly for parallel/isolated work.

| Type | Purpose |
|---|---|
| `Explore` | Fast codebase exploration |
| `Plan` | Architecture and implementation planning |
| `general-purpose` | Research, search, multi-step tasks |
| Custom agents | Defined in `.claude/agents/` |

---

## 8. Plugins (third-party skill bundles)

| Plugin | Source | Skills Provided |
|---|---|---|
| `superpowers` | obra/superpowers v4.3.1 | TDD, debugging, planning, worktrees, reviews (13 skills) |
| `agent-browser` | vercel-labs/agent-browser | Browser dogfooding |
| `chravel` | Local plugin | Loop, PRD, Ralph, Gemini API (migrated to repo skills) |

### Superpowers Overlap Monitoring

Superpowers v4.3.1 includes skills that overlap with custom global skills. Both coexist safely, but monitor for drift:

| Superpowers Skill | Overlapping Custom Skill | Status |
|---|---|---|
| `systematic-debugging` | `debug-systematically` (global) | Complementary — superpowers adds process; global adds depth |
| `test-driven-development` | `test-first-bugfix` (global) | Different scope — TDD for features; test-first for bugs |
| `verification-before-completion` | `ship-readiness` (global) | Complementary — superpowers auto-triggers; ship-readiness is manual |
| `worktrees` | N/A | No overlap — unique to superpowers |
| `parallel-implementation` | N/A | No overlap — unique to superpowers |

When superpowers updates to a new version, re-check for new overlap with the custom skill set.

---

## 9. Output Styles (custom)

| Style | Path | Purpose |
|---|---|---|
| `chravel` | `.claude/output-styles/chravel/STYLE.md` | Adds regression risk footer to code change responses |

---

## Decision: Where Does This Belong?

| Need | Use |
|---|---|
| Recurring task Claude should do a specific way | **Skill** |
| Automatic formatting/validation after edits | **Hook** (PostToolUse) |
| Block dangerous operations | **Hook** (PreToolUse) |
| Background knowledge Claude should always have | **CLAUDE.md** |
| One-off operating principles | **CLAUDE.md** |
| Isolated parallel research | **Subagent** |
| Periodic monitoring | **`/loop`** |
| Cross-project reusable behavior | **Global skill** (~/.claude/skills/) |
| Repo-specific workflow | **Repo skill** (.claude/skills/) |
| Quick side question | **`/btw`** (built-in command) |
| Change response verbosity | **Output style** |
