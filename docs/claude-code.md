# Claude Code Integration

This project uses **Claude Code** for local code analysis and MCP features. The CLI is added as a development dependency and provides commands for code review, security audits and performance checks.

## Installation

1. Install the CLI globally (optional):

```bash
npm install -g @anthropic-ai/claude-code
```

2. Install project dependencies:

```bash
npm install
```

3. Run initialization if needed:

```bash
npx claude init
```

## Usage

Convenience scripts are available:

```bash
npm run claude            # Launch interactive Claude Code
npm run claude:analyze    # Analyze the codebase
npm run claude:security   # Run security audit
npm run claude:review     # Perform a full review
```

Configuration lives in `.claude-code/` and includes MCP settings for Supabase and Capacitor.
