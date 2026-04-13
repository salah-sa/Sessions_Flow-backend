# SessionFlow — Data Architecture Specification

> **Rule #1**: If you are writing a `fetch()`, `axios`, or direct API call inside a page or component, **you are doing it wrong**.

---

## Core Architecture

All server data flows through **one path**:

```
Backend API → fetchWithAuth (client.ts) → Resource Modules (resources.ts / resources_extra.ts)
    → TanStack Query Hooks (src/queries/) → React Components
```

**There are NO exceptions for data-consuming components.**

---

## Rules for Developers

### ✅ DO

- Use hooks from `src/queries/` for all data fetching (`useGroups`, `useSession`, etc.)
- Use `useMutation` hooks for all write operations
- Use `queryClient.invalidateQueries()` to trigger refetches after mutations
- Use `queryClient.setQueryData()` for optimistic updates
- Add new resource functions to `src/api/resources.ts` or `src/api/resources_extra.ts`
- Create new query hooks in `src/queries/` following existing patterns

### ❌ DO NOT

- Import from `../api/resources` or `../api/client` inside pages or components
- Call `fetch()`, `axios`, or any HTTP client directly in components
- Use `useEffect` to fetch data on mount
- Override `refetchOnMount: true` or `refetchOnWindowFocus: true` on individual queries
- Store server data in Zustand — use React Query cache as the single source of truth

### ⚠️ Exceptions (Whitelisted)

| File | Reason |
|---|---|
| `LoginPage.tsx` | Auth login is a one-shot mutation, not cached data |
| `RegisterPage.tsx` | Registration is a one-shot mutation |
| `TimetablePage.tsx` | `getFreeSlots` is a user-action-triggered one-shot lookup |

---

## QueryClient Configuration

Set globally in `main.tsx` — these defaults apply to ALL queries:

```typescript
staleTime: 5 * 60 * 1000      // Data fresh for 5 minutes
gcTime: 30 * 60 * 1000         // Cache GC after 30 min unused
refetchOnMount: false           // ← CRITICAL: prevents nav-triggered refetch
refetchOnWindowFocus: false     // No refetch on tab switch
refetchOnReconnect: false       // No refetch on network reconnect
```

**Do not override these per-query unless you have a documented reason.**

---

## Persistence Layer

- Uses `@tanstack/query-sync-storage-persister` with `localStorage`
- Key: `sf_query_cache`
- Survives: page refresh, browser restart, app rebuild
- All queries are automatically persisted — no opt-in needed

---

## Cache Invalidation Strategy

Mutations invalidate using **prefix keys** from `src/queries/keys.ts`:

```typescript
// Invalidate ALL group queries (list + detail)
queryClient.invalidateQueries({ queryKey: ["groups"] });

// Invalidate ONE specific group
queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(id) });
```

SignalR events also use these same keys in `SignalRProvider.tsx`.

---

## Real-Time Updates (SignalR)

- `NewChatMessage` → invalidates that group's chat messages
- `SessionStatusChanged` → invalidates session detail + lists + dashboard
- `AttendanceUpdated` → invalidates session attendance
- `GroupStatusChanged` → invalidates group detail + lists

**SignalR never triggers full dataset reloads.**

---

## Enforcement

| Tool | What it catches | When it runs |
|---|---|---|
| `scripts/arch-guard.ts` | Direct API imports, fetch calls in components | `npm run lint:arch` |
| `src/lib/apiMonitor.ts` | Duplicate/redundant API calls at runtime | Automatic in DEV mode |
| TypeScript compiler | Type errors from wrong hook usage | `npm run build` |

---

## Adding a New Data Feature

1. Add API function to `src/api/resources.ts` or `resources_extra.ts`
2. Add query key to `src/queries/keys.ts`
3. Create query hook in `src/queries/useXxxQueries.ts`
4. Import the hook in your page/component
5. Add invalidation rules to mutation `onSuccess` callbacks
6. (Optional) Add SignalR event handler in `SignalRProvider.tsx`

**Never skip steps 2-3. Direct API calls will be caught by the architecture guard.**
