# Merge Conflict Resolution: Voice Session Timeout

If you see a merge conflict in `src/hooks/useGeminiLive.ts` around the session fetch (lines ~277–301):

## Accept the **CURRENT** change (cursor/gemini-voice-path-auth-fa3e)

**Why:** The current change has the complete implementation:
- `Promise.race([sessionFetchPromise, timeoutPromise])` — essential for the timeout to work
- `SESSION_FETCH_TIMEOUT_MS` constant (15s)
- Error message: "Voice session timed out. Please try again."

The **incoming** change (from main) may be missing the `await Promise.race` line, which would break timeout handling and reintroduce the infinite spinner.

## After resolving

Keep this structure:

```ts
const sessionFetchPromise = supabase.functions.invoke('gemini-voice-session', {
  body: { tripId, voice, isDemoMode },
});
const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(
    () => reject(new Error('Voice session timed out. Please try again.')),
    SESSION_FETCH_TIMEOUT_MS,
  );
});
const { data: sessionData, error: sessionError } = await Promise.race([
  sessionFetchPromise,
  timeoutPromise,
]);
```
