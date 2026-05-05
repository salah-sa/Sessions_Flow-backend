/**
 * SessionFlow Load Test — k6
 * 
 * Installation: https://k6.io/docs/get-started/installation/
 * Run:          k6 run load-test.js
 * Run (CI):     k6 run --out json=results.json load-test.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Custom Metrics ──────────────────────────────────────────────────
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const healthDuration = new Trend('health_duration');

// ── Test Configuration ──────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m',  target: 50 },   // Ramp to 50 concurrent
    { duration: '2m',  target: 50 },   // Hold at 50
    { duration: '30s', target: 100 },  // Spike to 100
    { duration: '1m',  target: 100 },  // Hold at 100
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],  // 95th < 500ms, 99th < 1.5s
    errors: ['rate<0.05'],                             // Error rate < 5%
    login_duration: ['p(95)<1000'],                   // Login < 1s at p95
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5180';

// ── Test Scenarios ──────────────────────────────────────────────────
export default function () {
  // 1. Health Check (lightweight, always available)
  const healthRes = http.get(`${BASE_URL}/ping`);
  healthDuration.add(healthRes.timings.duration);
  check(healthRes, {
    'ping: status 200': (r) => r.status === 200,
    'ping: has alive status': (r) => JSON.parse(r.body).status === 'alive',
  }) || errorRate.add(1);

  // 2. Detailed Health Check
  const detailedHealth = http.get(`${BASE_URL}/api/v1/health`);
  check(detailedHealth, {
    'health: returns response': (r) => [200, 503].includes(r.status),
    'health: has services': (r) => JSON.parse(r.body).services !== undefined,
  }) || errorRate.add(1);

  // 3. Login Attempt (simulates auth load)
  const loginPayload = JSON.stringify({
    email: `loadtest_${__VU}@test.com`,
    password: 'LoadTest123!',
  });
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  loginDuration.add(loginRes.timings.duration);
  check(loginRes, {
    'login: responds (200 or 401)': (r) => [200, 401].includes(r.status),
  }) || errorRate.add(1);

  // 4. Metrics Endpoint (Prometheus scrape simulation)
  const metricsRes = http.get(`${BASE_URL}/metrics`);
  check(metricsRes, {
    'metrics: status 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}

// ── Summary Handler ─────────────────────────────────────────────────
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';
