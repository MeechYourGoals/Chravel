# How to Write Effective Commands

## Key Principles

1. **Commands are action-oriented** — They define a workflow to execute, not knowledge to reference
2. **Numbered steps** — Use ordered lists for sequential workflows
3. **Output specification** — Always define what the command should produce
4. **Keep it focused** — One command = one responsibility

## Strong Command Template

```markdown
Perform [action] for [context].

Required workflow:
1. [First step with specific instructions]
2. [Second step]
3. [Decision point with criteria]
4. Produce:
   - [Deliverable 1]
   - [Deliverable 2]
5. If code changes are requested, inspect existing code before proposing edits.
6. Optimize for minimal safe diff and no dead code.
```

## Common Issues

- **No output spec** — Always specify what the command should produce
- **Too abstract** — Include concrete criteria for each step
- **Missing safety** — Add "inspect before editing" and "minimal diff" instructions
