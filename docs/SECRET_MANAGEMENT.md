# SessionFlow Secret Management

> Version: 1.0 | Last Updated: 2026-05-05

## Overview

This document defines the secret management practices for the SessionFlow platform, covering storage, rotation, and access patterns.

---

## 1. Secret Classification

| Level | Examples | Storage | Rotation |
|-------|----------|---------|----------|
| **Critical** | MongoDB URI, JWT Secret, Resend API Key | Railway Secrets (encrypted) | 90 days |
| **High** | Google OAuth credentials, Firebase Admin | Railway Secrets | 180 days |
| **Medium** | TURN server credentials, SMTP config | Railway Secrets | 365 days |
| **Low** | Feature flags, API base URLs | `.env` / Build args | On change |

---

## 2. Environment Variable Inventory

### Backend (HeadlessHost / Railway)
```env
# ── Critical ──────────────────────────────────────────────────
MONGODB_URI=mongodb+srv://...          # MongoDB Atlas connection
JWT_SECRET=<256-bit random>            # JWT signing key
JWT_REFRESH_SECRET=<256-bit random>    # Refresh token signing key
RESEND_API_KEY=re_xxx                  # Email delivery

# ── High ──────────────────────────────────────────────────────
GOOGLE_CREDENTIALS_JSON=<base64>       # Google OAuth service account
FIREBASE_CREDENTIALS_JSON=<base64>     # Firebase Admin SDK

# ── Medium ────────────────────────────────────────────────────
REDIS_URL=redis://...                  # Redis connection
PAYMOB_HMAC_SECRET=<hex>              # Payment webhook verification

# ── Runtime ───────────────────────────────────────────────────
ASPNETCORE_URLS=http://+:8080
DOTNET_RUNNING_IN_CONTAINER=true
```

### Frontend (Vite Build Args)
```env
# ── Public (embedded in JS bundle — NEVER put secrets here) ──
VITE_API_URL=https://api.sessionflow.com
VITE_TURN_URI=turn:relay.sessionflow.com:3478
VITE_TURN_USER=<public-turn-user>
VITE_TURN_PASS=<turn-credential>       # Note: TURN creds are time-limited
```

---

## 3. Rotation Procedures

### JWT Secret Rotation
```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 64)

# 2. Set in Railway (both old and new for grace period)
railway variables set JWT_SECRET="$NEW_SECRET"
railway variables set JWT_SECRET_PREVIOUS="$OLD_SECRET"

# 3. Deploy — app accepts both during transition
railway up

# 4. After 24h (all old tokens expired), remove previous
railway variables delete JWT_SECRET_PREVIOUS
```

### MongoDB URI Rotation
```bash
# 1. Create new user in Atlas
atlas dbusers create --username newuser --password <generated>

# 2. Update Railway secret
railway variables set MONGODB_URI="mongodb+srv://newuser:..."

# 3. Deploy and verify
railway up
curl https://api.sessionflow.com/healthz

# 4. Delete old user in Atlas
atlas dbusers delete olduser
```

---

## 4. Access Control

### Who Can Access Secrets
| Role | Access Level | Method |
|------|-------------|--------|
| Platform Admin | Full read/write | Railway Dashboard |
| DevOps | Read + rotate | Railway CLI |
| Developer | Read (non-critical only) | `.env.example` reference |
| CI/CD | Read (scoped) | GitHub Actions secrets |

### Audit Trail
- All secret access logged via Railway's audit log
- Secret changes trigger deployment notifications
- Monthly access review by Platform Admin

---

## 5. CI/CD Integration

### GitHub Actions Secrets
```yaml
# .github/workflows/build.yml
env:
  MONGODB_URI: ${{ secrets.MONGODB_URI }}
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  # NEVER log secrets — use masking
```

### Railway Deployment
```bash
# Export current config (for DR)
railway variables list --json > secrets-backup-$(date +%Y%m%d).enc.json
# Encrypt backup
gpg --symmetric --cipher-algo AES256 secrets-backup-*.json
```

---

## 6. Emergency Procedures

### Compromised Secret
1. **Immediate**: Rotate the compromised secret
2. **Assess**: Check audit logs for unauthorized access
3. **Invalidate**: Force-expire all user sessions (clear Redis)
4. **Notify**: Alert affected users if data exposure confirmed
5. **Post-mortem**: Document in incident log
