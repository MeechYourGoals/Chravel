Deep-dive the realtime voice stack.

You must:
- research the latest Gemini Live API docs
- confirm the best public production-suitable live model for current use
- confirm tool-calling behavior, barge-in, transcription, interruption handling, native audio, and known limitations
- inspect the existing voice architecture in the repo
- identify race conditions, disconnect risks, latency risks, auth risks, and fallback gaps
- determine what belongs in client vs Supabase Edge Functions
- identify required Vertex / Cloud Console setup
- produce:
  - ship status
  - current architecture map
  - failure points
  - recommended architecture
  - setup map
  - secret map
  - implementation order
  - test matrix
