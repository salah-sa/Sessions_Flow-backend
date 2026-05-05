# SessionFlow Backup Strategy

> Version: 1.0 | Last Updated: 2026-05-05

## Overview

This document defines the backup, recovery, and disaster recovery (DR) procedures for the SessionFlow platform.

---

## 1. MongoDB Atlas Backup

### Continuous Backup (Atlas M10+)
- **Type**: Point-in-Time Recovery (PITR)
- **Retention**: 7 days continuous, 30-day snapshots
- **RPO**: < 1 second (oplog-based)
- **RTO**: < 15 minutes (automated restore)

### Snapshot Schedule
| Frequency | Retention | Type |
|-----------|-----------|------|
| Every 6 hours | 7 days | Automated |
| Daily | 30 days | Automated |
| Weekly | 12 weeks | Automated |
| Monthly | 12 months | Manual trigger |

### Configuration
```bash
# Atlas CLI — Enable continuous backup
atlas backups config update \
  --clusterName sessionflow-prod \
  --pitEnabled true \
  --referenceHourOfDay 3 \
  --referenceMinuteOfHour 0

# Create on-demand snapshot before major releases
atlas backups snapshots create \
  --clusterName sessionflow-prod \
  --description "Pre-release v1.2.0"
```

### Restore Procedures
```bash
# Restore to a specific point in time
atlas backups restores start pointInTime \
  --clusterName sessionflow-prod \
  --pointInTimeUTCSeconds $(date -d '2 hours ago' +%s) \
  --targetClusterName sessionflow-restore

# Restore from snapshot
atlas backups restores start automated \
  --clusterName sessionflow-prod \
  --snapshotId <SNAPSHOT_ID> \
  --targetClusterName sessionflow-restore
```

---

## 2. Redis Backup

### RDB Snapshots
- **Frequency**: Every 15 minutes
- **Retention**: Last 24 hours
- **Storage**: Redis Cloud managed (or local dump.rdb)

### AOF Persistence
- **fsync**: `everysec` (balanced durability/performance)
- **Rewrite**: Automatic when AOF exceeds 64MB

### Recovery
```bash
# Stop Redis, replace dump.rdb, restart
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb /backups/redis/dump-$(date +%Y%m%d).rdb
```

---

## 3. Application State

### What to Back Up
| Component | Method | Frequency |
|-----------|--------|-----------|
| MongoDB collections | Atlas PITR | Continuous |
| Redis sessions/presence | RDB + AOF | 15 min |
| Environment variables | Railway Secrets Export | Per deployment |
| Docker images | Container Registry | Per CI build |
| Source code | Git (GitHub) | Per commit |

### What NOT to Back Up (Ephemeral)
- SignalR connections (reconstructed on reconnect)
- In-memory caches (auto-populated)
- Prometheus metrics (scrape-based, reconstructed)

---

## 4. Disaster Recovery Plan

### Scenario: Complete Region Failure
1. **Detection**: Health check failure (`/healthz` returns 503)
2. **Failover**: Atlas multi-region replicas auto-promote
3. **Application**: Railway re-deploys to available region
4. **Verification**: Run E2E health suite (`e2e/tests/health.spec.ts`)
5. **Communication**: Alert via admin broadcast system

### Scenario: Data Corruption
1. **Isolate**: Take affected cluster offline
2. **Identify**: Check audit logs for source
3. **Restore**: Use Atlas PITR to pre-corruption timestamp
4. **Validate**: Run unit test suite + manual data audit
5. **Post-mortem**: Document in `CHANGELOG.md`

---

## 5. Testing Schedule

| Test | Frequency | Owner |
|------|-----------|-------|
| Snapshot restore drill | Monthly | DevOps |
| PITR accuracy test | Quarterly | DevOps |
| Full DR simulation | Semi-annual | Platform Team |
| Redis failover test | Monthly | DevOps |
