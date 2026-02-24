# TODO

- [x] Map Gemini Live voice pipeline end-to-end (UI/state/audio/transport/edge/env) and capture root-cause hypotheses.
- [x] Add structured instrumentation + dev Voice Diagnostics panel.
- [x] Reproduce failure and collect logs/evidence.
- [x] Implement minimal duplex/barge-in fix with explicit state machine transitions and stable refs/cleanup.
- [x] Verify desktop/mobile-targeted behavior with deterministic checks, plus text chat/query-limit/history regression checks.
- [x] Add review notes (what changed, risks, rollback).

## Review
- Added explicit voice lifecycle state machine (`idle`, `requesting_mic`, `ready`, `listening`, `sending`, `playing`, `interrupted`, `error`) in `useGeminiLive`.
- Added structured diagnostics state + debug logs for permissions/audio context/WS lifecycle and timing metrics.
- Added barge-in handling with RMS-based interruption detection while model is playing and explicit cancel signal dispatch.
- Added dev diagnostics panel in `AIConciergeChat` showing mic meter, transport/audio status, and latency metrics.
- Preserved text chat flow, message persistence hooks, and existing concierge cache/history behavior.


## Post-PR hardening
- [x] Fixed stale-closure regressions in `useGeminiLive` callback handlers by using refs for state/diagnostics reads inside WS/audio callbacks.
- [x] Re-ran typecheck and targeted lint for the modified hook.
