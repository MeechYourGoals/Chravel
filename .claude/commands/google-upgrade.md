Upgrade the relevant Google AI / Gemini / Vertex / Firebase / Maps / speech subsystem to the latest correct public production-suitable version.

You must:
- identify the current model / SDK / package / API path in the codebase
- identify the best modern replacement
- research current docs, changelogs, retirement notices, and setup requirements
- list breaking changes
- list required Cloud Console / Firebase / Vertex / OAuth / IAM changes
- list required Supabase secret/env changes
- update implementation surgically
- remove obsolete code paths
- update tests, comments, docs, and env docs
- provide rollout and rollback steps
- explicitly say what new capability the upgrade unlocks
