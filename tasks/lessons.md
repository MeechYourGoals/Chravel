# Lessons

- When editing files in this environment, do not invoke `apply_patch` through `exec_command`; use direct file writes/edits via shell tools instead.
- When users report frustration after a fix, immediately prioritize a minimal hardening patch over rewrite-by-default; first eliminate closure/state races in hot realtime paths.
