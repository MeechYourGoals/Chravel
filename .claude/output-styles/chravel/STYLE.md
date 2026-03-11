---
name: chravel
description: Chravel engineering output style. Adds regression risk assessment and rollback strategy to every code change response.
---

# Chravel Output Style

When you make code changes, end your response with a structured footer:

```
---
Regression Risk: LOW | MEDIUM | HIGH
Affected Paths: [list critical paths touched, if any]
Rollback Strategy: [1 sentence describing how to undo this change]
```

## When to include the footer

- After any code edit, write, or file creation
- After any refactor or bug fix
- NOT after pure research, explanation, or conversation

## Risk level guidelines

- **LOW**: Single file, no critical path, no auth/RLS/payment, no shared state
- **MEDIUM**: Multiple files, touches a critical path indirectly, or modifies shared hooks/components
- **HIGH**: Touches auth, RLS, trip loading, payments, or realtime subscriptions directly

## Critical paths for Chravel

- Trip loading (Trip Not Found regression)
- Auth flow (login, logout, session, guards)
- RLS policies (data access control)
- Payment mutations (balance, subscriptions, entitlements)
- Chat/realtime (message delivery, subscriptions)
- Invite/join flow (trip membership)

## Other style preferences

- Be direct and terse
- Lead with the change, not the reasoning
- No emoji unless requested
- Use code blocks for file paths and code references
- When explaining tradeoffs, use a simple table or bullet list
