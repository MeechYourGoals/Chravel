# Voice Session Load Tests

Load tests for the `gemini-voice-session` Supabase Edge Function using [k6](https://k6.io/).

## Prerequisites

1. Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/
2. A running Supabase instance (local or remote)
3. A valid JWT token for an authenticated test user

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL (e.g., `http://localhost:54321`) |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `TEST_JWT` | Yes | Valid JWT for an authenticated test user |
| `TEST_TRIP_ID` | No | Trip ID to use (defaults to zeroed UUID) |

## Running

### Full suite
```bash
k6 run \
  -e SUPABASE_URL=http://localhost:54321 \
  -e SUPABASE_ANON_KEY=your-anon-key \
  -e TEST_JWT=your-jwt-token \
  load-tests/voice-session.k6.js
```

### Single scenario
```bash
k6 run --scenario rate_limit_burst \
  -e SUPABASE_URL=http://localhost:54321 \
  -e SUPABASE_ANON_KEY=your-anon-key \
  -e TEST_JWT=your-jwt-token \
  load-tests/voice-session.k6.js
```

## Scenarios

| Scenario | Description | Expected |
|----------|-------------|----------|
| `health_check` | 50 VUs hitting GET endpoint for 30s | p95 < 500ms |
| `session_creation` | Ramp 1→50 VUs creating sessions | p95 < 5s |
| `rate_limit_burst` | 15 rapid requests from single user | Requests 11+ get 429 |
| `concurrent_limit` | 5 requests in 10s from single user | Requests 3+ get 429 |

## Thresholds

- Health check p95 latency < 500ms
- Session creation p95 latency < 5s
- Overall check pass rate > 90%
