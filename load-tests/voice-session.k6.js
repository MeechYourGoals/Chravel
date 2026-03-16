import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const rateLimitHitRate = new Rate('rate_limit_hit_rate');
const sessionLatency = new Trend('session_creation_latency');

// Environment variables (set via -e flag or env)
const BASE_URL = __ENV.SUPABASE_URL || 'http://localhost:54321';
const ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';
const TEST_JWT = __ENV.TEST_JWT || '';
const TEST_TRIP_ID = __ENV.TEST_TRIP_ID || '00000000-0000-0000-0000-000000000001';

const FUNCTION_URL = `${BASE_URL}/functions/v1/gemini-voice-session`;

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TEST_JWT}`,
  apikey: ANON_KEY,
};

export const options = {
  scenarios: {
    // Scenario 1: Health check baseline — 50 VUs for 30s
    health_check: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30s',
      exec: 'healthCheck',
      tags: { scenario: 'health_check' },
    },
    // Scenario 2: Session creation under ramp — 1→50 VUs over 2 min
    session_creation: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      exec: 'createSession',
      startTime: '35s', // start after health_check
      tags: { scenario: 'session_creation' },
    },
    // Scenario 3: Rate limit burst — single user sends 15 rapid requests
    rate_limit_burst: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 15,
      exec: 'rateLimitBurst',
      startTime: '3m10s', // after session_creation
      tags: { scenario: 'rate_limit_burst' },
    },
    // Scenario 4: Concurrent session limit — single user sends 5 requests in 10s
    concurrent_limit: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 5,
      exec: 'concurrentBurst',
      startTime: '3m30s',
      tags: { scenario: 'concurrent_limit' },
    },
  },
  thresholds: {
    'http_req_duration{scenario:health_check}': ['p(95)<500'],
    'http_req_duration{scenario:session_creation}': ['p(95)<5000'],
    checks: ['rate>0.90'],
  },
};

// Scenario functions

export function healthCheck() {
  const res = http.get(FUNCTION_URL, { headers: { apikey: ANON_KEY } });
  check(res, {
    'health: status 200': r => r.status === 200,
    'health: has body': r => r.body && r.body.length > 0,
  });
  sleep(0.5);
}

export function createSession() {
  const payload = JSON.stringify({
    tripId: TEST_TRIP_ID,
    voice: 'Charon',
    sessionAttemptId: `k6-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  });

  const res = http.post(FUNCTION_URL, payload, { headers });

  sessionLatency.add(res.timings.duration);

  check(res, {
    'session: status 200 or 429': r => r.status === 200 || r.status === 429,
    'session: has body': r => r.body && r.body.length > 0,
  });

  if (res.status === 200) {
    const body = JSON.parse(res.body);
    check(body, {
      'session: has accessToken': b => !!b.accessToken,
      'session: has websocketUrl': b => !!b.websocketUrl,
      'session: has setupMessage': b => !!b.setupMessage,
    });
  }

  rateLimitHitRate.add(res.status === 429 ? 1 : 0);
  sleep(1 + Math.random() * 2); // 1-3s jitter
}

export function rateLimitBurst() {
  const payload = JSON.stringify({
    tripId: TEST_TRIP_ID,
    voice: 'Charon',
    sessionAttemptId: `k6-burst-${Date.now()}-${__ITER}`,
  });

  const res = http.post(FUNCTION_URL, payload, { headers });

  // First 10 should succeed (rate limit: 10 per 5 min)
  // Requests 11-15 should get 429
  if (__ITER < 10) {
    check(res, {
      [`burst req ${__ITER + 1}: should succeed`]: r => r.status === 200 || r.status === 403,
    });
  } else {
    check(res, {
      [`burst req ${__ITER + 1}: should be rate limited`]: r => r.status === 429,
    });
  }

  // No sleep — burst as fast as possible
}

export function concurrentBurst() {
  const payload = JSON.stringify({
    tripId: TEST_TRIP_ID,
    voice: 'Charon',
    sessionAttemptId: `k6-concurrent-${Date.now()}-${__ITER}`,
  });

  const res = http.post(FUNCTION_URL, payload, { headers });

  // First 2 should succeed (concurrent limit: 2 per 2 min)
  // Requests 3-5 should get 429
  if (__ITER < 2) {
    check(res, {
      [`concurrent req ${__ITER + 1}: should succeed`]: r => r.status === 200 || r.status === 403,
    });
  } else {
    check(res, {
      [`concurrent req ${__ITER + 1}: should be limited`]: r => r.status === 429,
    });
  }

  sleep(2); // 2s between requests
}
