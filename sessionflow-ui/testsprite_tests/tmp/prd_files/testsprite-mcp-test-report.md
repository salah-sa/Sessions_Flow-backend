# TestSprite AI Testing Report (MCP) — SessionFlow

---

## 1️⃣ Document Metadata
- **Project Name:** SessionFlow
- **Date:** 2026-04-16
- **Prepared by:** TestSprite AI + Manual Remediation
- **Note:** TestSprite regenerates test scripts on each execution. Scripts TC002, TC004, TC008, TC009 were manually fixed to correct API contract mismatches (pagination envelope, pending login status code, ISO format, session lifecycle). All 10 tests pass when executed with the fixed scripts locally.

---

## 2️⃣ Requirement Validation Summary

### Authentication (`/api/auth`)

#### TC001 — POST /api/auth/login (Valid Credentials)
- **Status:** ✅ Passed (TestSprite + Local)
- **Validates:** Login with admin credentials returns 200 + JWT token

#### TC002 — POST /api/auth/register (New Engineer)
- **Status:** ✅ Passed (Local) | ✅ Passed (TestSprite Run 3)
- **Validates:** Registration returns 201 with `status: "Pending"`, login with pending account returns 400 (not 401)
- **Fix Applied:** Changed assertion from `401` to `400` for pending account login

#### TC003 — GET /api/auth/me (Authenticated User)
- **Status:** ✅ Passed (TestSprite + Local)
- **Validates:** Bearer token decodes to valid user profile

---

### Groups (`/api/groups`)

#### TC004 — POST /api/groups (Create Success)
- **Status:** ✅ Passed (Local) | ❌ Failed (TestSprite — script regenerated)
- **Root Cause:** TestSprite regenerates script each run, re-introducing `isinstance(list)` assertion on paginated envelope
- **Fix Applied:** Assert `items` key in envelope object, not raw list

#### TC005 — POST /api/groups (Schedule Validation Error)
- **Status:** ✅ Passed (TestSprite + Local)
- **Validates:** Mismatched Schedules.length vs Frequency returns 400

#### TC006 — PUT /api/groups/{id} (Update Success)
- **Status:** ✅ Passed (Local) | ❌ Failed (TestSprite — script regenerated with group name conflict)
- **Root Cause:** Hardcoded group name collides with existing test data; uses non-unique name
- **Fix Applied:** Used unique names via `uuid.uuid4()`

#### TC007 — DELETE /api/groups/{id} (Soft Delete)
- **Status:** ✅ Passed (TestSprite + Local)
- **Validates:** Soft-delete returns 200 with confirmation

---

### Sessions (`/api/sessions`)

#### TC008 — POST /api/sessions (Create Session)
- **Status:** ✅ Passed (Local + TestSprite Run 3)
- **Fix Applied:** Used `strftime("%Y-%m-%dT%H:%M:%SZ")` instead of broken `isoformat() + "Z"` which produces `+00:00Z`

#### TC009 — PUT /api/sessions/{id}/attendance (Update Attendance)
- **Status:** ✅ Passed (Local) | ❌ Failed (TestSprite — script regenerated without /start call)
- **Root Cause:** TestSprite keeps removing the mandatory `POST /api/sessions/{id}/start` step
- **Fix Applied:** Fetch auto-generated Session 1, call /start, then update attendance

---

### Students (`/api/groups/{id}/students`)

#### TC010 — POST /api/groups/{id}/students (Add Student)
- **Status:** ✅ Passed (TestSprite + Local)
- **Validates:** Student creation returns 201 with id, name, uniqueStudentCode

---

## 3️⃣ Coverage & Matching Metrics

| Requirement         | Total Tests | ✅ Local Pass | ✅ TestSprite Pass | ❌ TestSprite Regen Failure |
|---------------------|-------------|---------------|--------------------|-----------------------------|
| Authentication      | 3           | 3             | 3                  | 0                           |
| Groups & Schedules  | 4           | 4             | 2                  | 2 (script regenerated)      |
| Session Management  | 2           | 2             | 1                  | 1 (script regenerated)      |
| Students            | 1           | 1             | 1                  | 0                           |
| **Total**           | **10**      | **10**        | **7**              | **3**                       |

**Local Pass Rate: 100% (10/10)**
**TestSprite Cloud Pass Rate: 70% (7/10)** — all 3 failures are due to script regeneration overwriting fixes

---

## 4️⃣ Key Gaps / Risks

### Resolved Issues
1. **Pagination Envelope:** All GET list endpoints return `{items: [], totalCount, page, pageSize, hasMore}` — documented in PRD
2. **Pending Login Status:** Backend returns `400` (not `401`) for pending accounts — documented in PRD
3. **ISO Format:** Python `datetime.now(UTC).isoformat() + "Z"` produces `+00:00Z` which breaks C# DateTimeOffset parsing — must use `strftime`
4. **Session Lifecycle:** Must call `POST /start` before attendance update — documented in PRD
5. **Auto-Generated Sessions:** Manual session creation causes sequential validation errors — documented in PRD

### Outstanding Risk
- **TestSprite Script Regeneration:** The `generateCodeAndExecute` command regenerates test scripts on every invocation, overwriting manual fixes. The 3 failing tests in TestSprite cloud all pass locally with the corrected scripts. Consider using the TestSprite dashboard's manual edit feature for persistent fixes.
