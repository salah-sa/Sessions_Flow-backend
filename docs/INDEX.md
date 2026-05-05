# SessionFlow Documentation Index

> **Platform Version**: v1.1.0 | **Last Updated**: 2026-05-05

## Quick Links

| Document | Version | Description |
|----------|---------|-------------|
| [README](../README.md) | 1.1.0 | Project overview, setup, and deployment |
| [CHANGELOG](../CHANGELOG.md) | 1.1.0 | Release history and change tracking |
| [SYSTEM_ARCHITECTURE](../SYSTEM_ARCHITECTURE.md) | 1.0.0 | High-level system design |

## Operations

| Document | Version | Description |
|----------|---------|-------------|
| [Backup Strategy](./BACKUP_STRATEGY.md) | 1.0.0 | MongoDB Atlas backup, Redis persistence, DR |
| [Secret Management](./SECRET_MANAGEMENT.md) | 1.0.0 | Secret classification, rotation, access control |
| [Multi-Region](./MULTI_REGION.md) | 1.0.0 | Multi-region deployment architecture |

## Configuration

| Document | Version | Description |
|----------|---------|-------------|
| [SaaS Admin Guide](../SAAS_ADMIN_GUIDE.md) | 1.0.0 | Admin features and configuration |
| [Environment Variables](../.env.example) | 1.1.0 | All required env vars with descriptions |

## API & Testing

| Resource | Location | Description |
|----------|----------|-------------|
| OpenAPI Spec | `GET /openapi/v1.json` (dev only) | Auto-generated API documentation |
| Unit Tests | `SessionFlow.Tests/` | xUnit tests (auth, middleware, services) |
| E2E Tests | `e2e/tests/` | Playwright browser tests |
| Load Tests | `e2e/load-test.js` | k6 performance benchmarks |
| Health Check | `GET /api/v1/health` | Detailed infrastructure status |
| Prometheus | `GET /metrics` | Prometheus metrics endpoint |

---

## Versioning Policy

- Documentation versions track the **platform release** they describe
- Major doc changes bump the doc version
- All docs include a `Version` and `Last Updated` header
- Breaking API changes must be reflected in both CHANGELOG and relevant docs
