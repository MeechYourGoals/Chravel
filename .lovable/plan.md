

## What needs to happen

Claude Code created `supabase/functions/regenerate-all-embeddings/index.ts` but never added it to `supabase/config.toml`. Without the config entry, Lovable won't deploy it.

### Plan

1. **Add config entry** to `supabase/config.toml`:
   ```toml
   [functions.regenerate-all-embeddings]
   verify_jwt = false
   ```
   (JWT is disabled because the function self-validates via service role key in the Authorization header.)

2. **Deploy** — happens automatically once the config entry exists.

3. **Invoke dry-run** via `supabase--curl_edge_functions` to verify it boots and lists active trips.

4. **Invoke full regeneration** with `batchSize: 5` if dry-run succeeds.

No other code changes needed — the function implementation is already complete and uses the same `invokeEmbeddingModel` + `text-embedding-004` pattern as the rest of the codebase.

