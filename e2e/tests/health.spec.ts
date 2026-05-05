/**
 * E2E: Health Check — Verify API endpoints respond correctly.
 */
import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_URL || 'http://localhost:5180';

test.describe('Health & Infrastructure Endpoints', () => {
  test('GET /ping should return alive status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/ping`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('alive');
    expect(body.time).toBeDefined();
  });

  test('GET /healthz should return ok status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/healthz`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('GET /api/v1/health should return detailed health report', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/health`);
    // May be 200 (Healthy) or 503 (Degraded) depending on infra
    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    expect(body.status).toBeDefined();
    expect(body.uptime).toBeDefined();
    expect(body.services).toBeDefined();
  });

  test('GET /metrics should return Prometheus format', async ({ request }) => {
    const response = await request.get(`${API_BASE}/metrics`);
    expect(response.status()).toBe(200);
    const text = await response.text();
    // Prometheus text format contains # HELP and # TYPE directives
    expect(text).toContain('# HELP');
  });
});
