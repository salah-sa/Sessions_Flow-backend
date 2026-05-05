# Changelog

All notable changes to SessionFlow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-05-05

### Added
- **Idempotency Middleware** — `Idempotency-Key` header support for safe request retries (SHA-256 fingerprinting, 24h TTL)
- **Correlation ID Middleware** — `X-Correlation-Id` header propagation with Serilog LogContext enrichment
- **TURN Server Support** — configurable TURN relay for WebRTC calls via `VITE_TURN_URI/USER/PASS`
- **Focus Trap Hook** — `useFocusTrap.ts` for WAI-ARIA compliant modal keyboard navigation
- **Debounce Hook** — `useDebounce.ts` for search/filter input optimization
- **Skeleton Components** — unified loading skeletons matching dark theme aesthetic
- **Health Check Expansion** — uptime, per-service latency, environment, and `/healthz` alias
- **Exponential Backoff** — background services use progressive retry delays (5m → 60m cap)
- **API Versioning** — all endpoints migrated to `/api/v1/` prefix for future-proof versioning
- **OpenTelemetry** — distributed tracing with ASP.NET Core + HTTP client instrumentation
- **Prometheus Metrics** — `/metrics` endpoint for Grafana/Prometheus monitoring stack
- **OpenAPI Documentation** — auto-generated API docs at `/openapi/v1.json` (Development only)
- **CI/CD Pipeline** — 4-job GitHub Actions workflow (lint, build, Docker + Trivy scan, lockfile verification)
- **Unit Test Project** — `SessionFlow.Tests` with xUnit, Moq, FluentAssertions (9 passing tests)
- **E2E Test Suite** — Playwright tests for auth flows and health endpoints
- **k6 Load Tests** — 5-stage ramp-up (10→100 users) with p95/p99 thresholds
- **ESLint Strict Config** — TypeScript + React Hooks enforcement with flat config
- **Operational Docs** — Backup Strategy, Secret Management, Multi-Region Architecture, Doc Index

### Changed
- **Emoji Picker** — lazy-loaded on demand (~300KB saved from initial bundle)
- **Chat Memory** — capped at 20 pages (1000 messages) to prevent memory leaks
- **Health Endpoint** — now includes per-service response times and uptime metrics
- **Command Palette** — full ARIA accessibility (dialog, combobox, listbox, option roles)
- **Dockerfile** — hardened with non-root user (appuser), npm cache cleanup, HEALTHCHECK instruction
- **API Routes** — migrated from `/api/` to `/api/v1/` across all 34 endpoint files
- **Frontend API Client** — BASE_URL updated to `/api/v1` for versioned routing

### Fixed
- **Session Deduplication** — `MaintainSessionsAsync` prevents duplicate session generation on concurrent runs
- **Chunk Load Recovery** — `ErrorBoundary` detects stale chunk failures and auto-reloads once

### Security
- Refresh token rotation with SHA-256 hashing and device tracking
- JWT dual-key rotation with 5-minute overlap window
- Account lockout after 5 failed login attempts (10-minute cooldown)
- Paymob webhook HMAC-SHA512 verification
- Global exception middleware prevents stack trace leakage
- FluentValidation on all endpoint DTOs
- CORS restricted to configured origins only
- OTP rate limiting (5 attempts / 15 minutes)
- File upload magic-byte validation
- Audit log enrichment with IP, user agent, and geo data
- Chat XSS sanitization via HtmlSanitizer
- Secret masking in Serilog destructuring
- CSRF verification via `X-Requested-With` header

## [1.0.0] - 2026-04-15

### Added
- Initial release of SessionFlow platform
- Real-time session management with SignalR
- Multi-tier subscription system (Free, Pro, Enterprise, Ultra)
- Neural Chat with file attachments, reactions, and mentions
- WebRTC voice calls with peer-to-peer audio
- AI Center with Groq/OpenAI integration
- Student dashboard with attendance heatmaps
- Wallet system with Paymob payment integration
- Admin broadcast messaging
- Feature flag management
- Redis-backed presence with in-memory fallback
