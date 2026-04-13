**Tech Stack:** .NET 8, MongoDB, React (TSX), SignalR, GSAP, `@emoji-mart/react`.

---

## 🏛️ ARCHITECTURAL DECISIONS

### 1. Smart Session Regeneration
**The system MUST implement Surgical Regeneration.**
- **Rule 1: Historical Immutability**: Sessions with status `Ended` or `Active` MUST be preserved.
- **Rule 2: Future Purge & Rebuild**: Sessions with status `Scheduled` that occur *after* the current time MUST be hard-deleted and regenerated according to the new schedule.
- **Rule 3: Sequence Continuity**: New sessions must increment from the last preserved session number.

### 2. Emoji Integration
**The system MUST use @emoji-mart/react.**
- **Rule 1: Virtualized Lazy Loading**: Load via `React.lazy` to prevent bundle bloat.
- **Rule 2: Contextual Popover**: UI must be a floating popover anchored to the input, not a modal.
- **Rule 3: Caret-Aware Insertion**: Insert emoji at current cursor position within the state.

---

---

### Task 1: Backend - Dashboard Analytics Hardening

**Files:**
- Modify: `SessionFlow.Desktop/Api/Endpoints/DashboardEndpoints.cs:20-60`
- Modify: `SessionFlow.Desktop/Api/Endpoints/DashboardEndpoints.cs:180-204`

**Step 1: Calculate Real Attendance Rate**
In `MapGet("/summary")`, compute the average attendance rate across all `Ended` sessions.
```csharp
var completedSessionsFilter = Builders<Session>.Filter.And(
    Builders<Session>.Filter.Eq(s => s.Status, SessionStatus.Ended),
    Builders<Session>.Filter.Eq(s => s.IsDeleted, false)
);
var attendanceAgg = await db.Sessions.Aggregate()
    .Match(completedSessionsFilter)
    .Group(new BsonDocument { { "_id", BsonNull.Value }, { "avg", new BsonDocument("$avg", "$AttendanceRate") } })
    .FirstOrDefaultAsync();
double attendanceRateOverall = attendanceAgg?["avg"]?.AsDouble ?? 0;
```

**Step 2: Generate 8-Week Trend Data**
Collect session counts for the last 8 weeks to replace hardcoded sparklines.
```csharp
var weeklyTrend = new List<int>();
for (int i = 7; i >= 0; i--) {
    var start = DateTimeOffset.UtcNow.AddDays(-i * 7);
    var end = start.AddDays(7);
    var count = await db.Sessions.CountDocumentsAsync(s => s.ScheduledAt >= start && s.ScheduledAt < end);
    weeklyTrend.Add((int)count);
}
```

**Step 3: Update Summary Response**
Add `attendanceRateOverall` and `weeklyTrend` to the anonymous object returned by the endpoint.

---

### Task 2: Frontend - Dashboard Real-Data Binding

**Files:**
- Modify: `sessionflow-ui/src/pages/DashboardPage.tsx:500-550`

**Step 1: Fix Hydration Logic**
Modify the check at line 421: 
`{summaryData !== null && summaryData.totalGroups === 0 ? <LaunchpadHero /> : ...}` 
to prevent the greeting from showing during initial load if the system is empty.

**Step 2: Bind Analytics Percentages**
Replace hardcoded `85%`, `92%` with `summaryData.attendanceRateOverall * 100` and calculated completion rates.

**Step 2: Bind Sparkline Charts**
Replace static `data` arrays in `<Sparkline />` components with `summaryData.weeklyTrend`.

---

### Task 3: Frontend - Chat Duplicate Message Fix

**Files:**
- Modify: `sessionflow-ui/src/pages/ChatPage.tsx:104-120`

**Step 1: Implement Deduplication in SignalR Handler**
Modify the `NewChatMessage` event listener to filter out any optimistic `temp-` messages from the same sender with matching text before adding the server-broadcasted message.
```typescript
setMessages((prev) => {
  const withoutPending = prev.filter(m => 
    !(m.id.startsWith('temp-') && m.senderId === message.senderId && m.text === message.text)
  );
  if (withoutPending.some(m => m.id === message.id)) return withoutPending;
  return [...withoutPending, message];
});
```

---

### Task 4: Frontend - Emoji Support Integration

**Files:**
- Modify: `sessionflow-ui/src/components/chat/Chat.tsx`

**Step 1: Install Emoji Mart**
Run: `npm install @emoji-mart/data @emoji-mart/react`

**Step 2: Lazy Load Picker**
```typescript
const Picker = React.lazy(() => import('@emoji-mart/react'));
```

**Step 3: Implement Popover UI**
Integrate the picker into a popover centered above the input bar with `theme="dark"`.

---

### Task 5: Backend - Smart Session Regeneration

**Files:**
- Modify: `SessionFlow.Desktop/Api/Endpoints/GroupEndpoints.cs`
- Modify: `SessionFlow.Desktop/Services/SessionService.cs`

**Step 1: Add Regeneration Endpoint**
Create `POST /api/groups/{id}/regenerate-sessions` in `GroupEndpoints.cs`.

**Step 2: Implement Deletion Logic in SessionService**
In `SessionService.cs`, add logic to delete only `Scheduled` sessions where `ScheduledAt > now`.
```csharp
await _db.Sessions.DeleteManyAsync(s => 
    s.GroupId == groupId && 
    s.Status == SessionStatus.Scheduled && 
    s.ScheduledAt > DateTimeOffset.UtcNow);
```

---

### Task 6: Frontend - Group Edit & Progression Fixes

**Files:**
- Modify: `sessionflow-ui/src/pages/GroupsPage.tsx`
- Modify: `sessionflow-ui/src/pages/GroupSessionsPage.tsx:360`

**Step 1: Add Regeneration Confirmation**
In `GroupsPage.tsx`, detect schedule changes and show the smart regeneration dialog before saving.

**Step 2: Fix Timeline Display**
In `GroupSessionsPage.tsx`, bind to `session.sessionNumber` instead of `startingOffset + index + 1`.

---

### Task 7: Frontend - History Module Refinement

**Files:**
- Modify: `sessionflow-ui/src/pages/HistoryPage.tsx`

**Step 1: Add Attendance Columns**
Display "Present/Total" counts in the history list cards for better transparency.

**Step 2: Implement Guidance Empty State**
Show a professional "No archived sessions found" screen with a "Return to Dashboard" action.

---

## Verification Plan

### Automated Verification
- **Endpoint Audit**: `curl http://localhost:5180/api/dashboard/summary` must show `attendanceRateOverall` > 0.
- **SignalR Dedup**: Send message in browser → verify console logs show 1 message in state, not 2.

### Manual Verification
1. **Regen Test**: Change group time → Confirm Regen → Verify `GroupSessionsPage` timeline dates updated, but `Ended` sessions remained.
2. **Emoji Test**: Open chat → Click Emoji → Select Emoji → Verify text appends to input.
