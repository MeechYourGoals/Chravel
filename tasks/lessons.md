# Lessons

- When editing files in this environment, do not invoke `apply_patch` through `exec_command`; use direct file writes/edits via shell tools instead.
- When users report frustration after a fix, immediately prioritize a minimal hardening patch over rewrite-by-default; first eliminate closure/state races in hot realtime paths.
- When a user says a fix "didn't get pushed", verify remote branch existence/tracking (`git branch -vv`, `git fetch`) before closing, then push/create the feature branch explicitly.
- If a user calls out tool misuse mid-task, immediately adjust editing approach (use direct file edits) and avoid repeating the flagged pattern in the same session.
- When a user asks "yes please do" on adding regression coverage, add a focused automated spec directly for the requested flow and validate it, instead of re-explaining current behavior only.
