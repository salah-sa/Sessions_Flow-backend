# SessionFlow Multi-Region Architecture

> Version: 1.0 | Last Updated: 2026-05-05 | Status: Planning

## Overview

This document outlines the multi-region deployment strategy for SessionFlow, designed for high availability, low latency, and regulatory compliance.

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                  Global Load Balancer                 │
│              (Cloudflare / AWS CloudFront)            │
└──────────┬──────────────────────────┬────────────────┘
           │                          │
     ┌─────▼─────┐            ┌──────▼──────┐
     │  Region A  │            │  Region B   │
     │  (Primary) │            │ (Secondary) │
     ├───────────┤            ├────────────┤
     │ Railway    │            │ Railway     │
     │ HeadlessHost│           │ HeadlessHost│
     │ Port 8080  │            │ Port 8080   │
     ├───────────┤            ├────────────┤
     │ Redis      │◄──────────►│ Redis       │
     │ (Primary)  │  Repl.     │ (Replica)   │
     └─────┬─────┘            └──────┬──────┘
           │                          │
     ┌─────▼──────────────────────────▼─────┐
     │        MongoDB Atlas (Global)         │
     │   Primary: us-east-1                  │
     │   Secondary: eu-west-1, ap-south-1    │
     │   Read Preference: nearest            │
     └─────────────────────────────────────────┘
```

---

## 2. MongoDB Atlas Multi-Region

### Cluster Configuration
```bash
# Create M10+ multi-region cluster
atlas clusters create sessionflow-global \
  --provider AWS \
  --tier M10 \
  --region US_EAST_1 \
  --members 3 \
  --additionalRegions EU_WEST_1:1,AP_SOUTH_1:1

# Enable global writes (sharded)
atlas globalClusters manage \
  --clusterName sessionflow-global \
  --managedNamespace "sessionflow.sessions" \
  --customZoneMapping '{"US":"US_EAST_1","EU":"EU_WEST_1","APAC":"AP_SOUTH_1"}'
```

### Read Preference Strategy
| Operation | Read Preference | Rationale |
|-----------|----------------|-----------|
| Auth/Login | `primary` | Strong consistency for auth |
| Dashboard | `nearest` | Low latency acceptable |
| Reports | `secondary` | Offload to replicas |
| Real-time | `primary` | SignalR needs consistency |

---

## 3. Redis Multi-Region

### Architecture
- **Primary**: Redis Cloud (us-east-1) — write master
- **Replica**: Redis Cloud (eu-west-1) — read replica
- **SignalR Backplane**: Both regions subscribe to same Redis streams

### Configuration
```csharp
// appsettings.Production.json
{
  "Redis": {
    "Configuration": "redis-primary.example.com:6379,redis-replica.example.com:6379",
    "InstanceName": "SessionFlow_"
  }
}
```

---

## 4. Deployment Regions

### Phase 1 (Current)
| Component | Region | Provider |
|-----------|--------|----------|
| API | us-east-1 | Railway |
| MongoDB | us-east-1 | Atlas M2 |
| Redis | us-east-1 | Railway Redis |
| CDN | Global | Cloudflare |

### Phase 2 (Target)
| Component | Regions | Provider |
|-----------|---------|----------|
| API | us-east-1, eu-west-1 | Railway |
| MongoDB | us-east-1, eu-west-1, ap-south-1 | Atlas M10 |
| Redis | us-east-1, eu-west-1 | Redis Cloud |
| CDN | Global (200+ PoPs) | Cloudflare |

---

## 5. Traffic Routing

### DNS-Based (Cloudflare)
```
sessionflow.com → Cloudflare (anycast)
  ├─ US users → us-east-1 origin
  ├─ EU users → eu-west-1 origin
  └─ APAC users → ap-south-1 origin (fallback to us-east-1)
```

### Health-Based Failover
- Cloudflare monitors `/healthz` on each origin
- Automatic failover if origin returns 5xx for > 30s
- Manual override via Cloudflare dashboard

---

## 6. Data Residency & Compliance

| Region | Data Regulation | Strategy |
|--------|----------------|----------|
| EU | GDPR | User data stays in EU region |
| US | SOC 2 | Default region |
| APAC | PDPA (Singapore) | Read replicas, writes to nearest |

---

## 7. Prerequisites

- [ ] Atlas M10+ tier (current: M2 — upgrade required)
- [ ] Railway multi-region deployment
- [ ] Cloudflare Pro plan (for load balancing)
- [ ] Redis Cloud Active-Active subscription
- [ ] Update `MONGODB_URI` to multi-region connection string
- [ ] Test SignalR backplane across regions
