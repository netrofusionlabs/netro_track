# Offline Architecture

> **Purpose:** Define the offline-first strategy for field operations.
> **Scope:** Offline queue, sync engine, conflict resolution, data persistence.
> **Dependencies:** [Application Architecture](application-architecture.md), [GPS Tracking](gps-tracking-architecture.md)

---

## 1. Offline-First Philosophy

Field employees often work in rural areas, villages, and locations with unreliable or no internet connectivity. **The application MUST continue working without interruption.**

| Feature | Offline Behavior |
|---------|-----------------|
| Attendance (Punch In/Out) | ✅ Works — queued locally |
| GPS Tracking | ✅ Works — buffered in MMKV |
| Customer Visits | ✅ Works — saved locally |
| Product Sales | ✅ Works — saved locally |
| Inspections | ✅ Works — saved locally |
| Dashboard | ⚠️ Shows cached data |
| Reports | ⚠️ Shows cached data |
| Live Tracking (manager) | ❌ Requires connectivity |
| Image Upload | ⚠️ Queued — uploads when online |

---

## 2. Offline Queue Architecture

```
┌─────────────────────────────────────────┐
│              Mobile App                  │
│                                         │
│  ┌───────────┐     ┌───────────────┐   │
│  │  Feature   │────▶│  Sync Engine   │   │
│  │  (visits,  │     │               │   │
│  │   sales,   │     │  ┌─────────┐  │   │
│  │   etc.)    │     │  │  Queue   │  │   │
│  └───────────┘     │  │  (MMKV)  │  │   │
│                     │  └─────────┘  │   │
│                     │       │        │   │
│                     │  ┌────┴─────┐  │   │
│                     │  │ Network  │  │   │
│                     │  │ Monitor  │  │   │
│                     │  └────┬─────┘  │   │
│                     └───────┼────────┘   │
│                             │            │
└─────────────────────────────┼────────────┘
                              │
                    Online? ──┤
                              │
                    ┌─────────▼──────────┐
                    │   API Server        │
                    └────────────────────┘
```

---

## 3. Queue Item Structure

Every offline action is wrapped in a queue item:

```typescript
interface SyncQueueItem {
  id: string;              // Local UUID (for idempotency)
  type: SyncItemType;      // 'ATTENDANCE' | 'GPS_BATCH' | 'VISIT' | 'SALE' | 'INSPECTION' | 'IMAGE'
  endpoint: string;        // API endpoint to call
  method: 'POST' | 'PUT';
  payload: unknown;        // The request body
  createdAt: string;       // ISO timestamp when action was taken
  retryCount: number;      // Number of sync attempts
  maxRetries: number;      // Maximum retry attempts (default: 10)
  status: 'PENDING' | 'SYNCING' | 'FAILED' | 'COMPLETED';
  error?: string;          // Last error message
  priority: number;        // Lower = higher priority
}
```

### Priority Order

| Priority | Type | Rationale |
|----------|------|-----------|
| 1 | Attendance | Most time-sensitive — affects working hours |
| 2 | GPS Batch | Volume data — sync early to prevent overflow |
| 3 | Customer Visits | Business-critical data |
| 4 | Product Sales | Business-critical data |
| 5 | Inspections | Business-critical data |
| 6 | Images | Large payloads — sync after metadata |

---

## 4. Sync Engine

### Trigger Conditions

```
Sync triggers when ALL of:
    ✅ Network is available (NetInfo reports connected)
    ✅ Queue has pending items
    ✅ No sync already in progress (mutex lock)

Sync also triggers on:
    • App comes to foreground
    • Network transitions from offline → online
    • Periodic check (every 60 seconds when app is active)
```

### Sync Process

```
1. Acquire sync lock (prevent concurrent syncs)
       │
2. Read queue items sorted by priority, then createdAt
       │
3. For each item:
       │
       ├── Set status → SYNCING
       │
       ├── Make API call (with local UUID in header)
       │       │
       │       ├── Success (2xx) → Remove from queue
       │       │
       │       ├── Client error (4xx) → Mark FAILED, skip
       │       │   (except 401 → refresh token, retry)
       │       │
       │       └── Server error (5xx) or network error
       │           → Increment retryCount
       │           → If retryCount >= maxRetries → Mark FAILED
       │           → Else → Back to PENDING (retry later)
       │
4. Release sync lock
       │
5. If items remain → schedule next sync with backoff
```

### Exponential Backoff

```
Retry 1: 5 seconds
Retry 2: 10 seconds
Retry 3: 20 seconds
Retry 4: 40 seconds
Retry 5: 60 seconds (cap)
...
Retry 10: 60 seconds (max retries reached → FAILED)
```

---

## 5. Conflict Resolution

### Strategy: Last-Write-Wins (Server Authoritative)

```
Employee creates Visit offline at 10:30 AM (local time)
        │
Network comes back at 11:00 AM
        │
Sync sends Visit with original timestamp (10:30 AM)
        │
Server processes:
        │
        ├── No conflict → Insert with 10:30 AM timestamp
        │
        └── Duplicate detected (same local UUID)
            → Ignore (idempotent)
```

### Idempotency

Every offline action includes a local UUID. The server uses this to detect and reject duplicates:

```typescript
// Server-side
async createVisit(data: CreateVisitDTO) {
  // Check if this local UUID already exists
  const existing = await this.visitRepo.findByLocalId(data.localId, data.companyId);
  
  if (existing) {
    return existing; // Already synced — return existing record
  }
  
  return this.visitRepo.create(data);
}
```

---

## 6. Data Persistence (MMKV)

### Storage Keys

| Key Pattern | Data | Persistence |
|------------|------|-------------|
| `sync_queue` | Offline action queue | Until synced |
| `gps_buffer` | Buffered GPS points | Until synced |
| `cached_dashboard` | Last dashboard data | Until refreshed |
| `cached_customers` | Customer list | Until refreshed |
| `cached_products` | Product list | Until refreshed |
| `user_session` | Auth tokens, user profile | Until logout |
| `draft_visit_{id}` | In-progress visit form | Until submitted/discarded |
| `draft_inspection_{id}` | In-progress inspection form | Until submitted/discarded |

### MMKV vs AsyncStorage

| Criterion | MMKV | AsyncStorage |
|-----------|------|-------------|
| Speed | ~30x faster | Baseline |
| Encryption | Built-in | Manual |
| Synchronous API | ✅ | ❌ (async only) |
| Storage limit | Device storage | ~6MB default |
| **Decision** | **✅ Use MMKV** | ❌ |

---

## 7. Network Monitoring

```typescript
// Using @react-native-community/netinfo
import NetInfo from '@react-native-community/netinfo';

// Subscribe to connectivity changes
const unsubscribe = NetInfo.addEventListener(state => {
  if (state.isConnected && state.isInternetReachable) {
    // Trigger sync engine
    syncEngine.processQueue();
  }
});
```

### Connectivity States

| State | UI Indicator | Behavior |
|-------|-------------|----------|
| Connected (WiFi) | None | Normal operation + sync |
| Connected (Cellular) | None | Normal operation + sync |
| Connected (no internet) | ⚠️ Banner | Queue actions, show cached data |
| Disconnected | ⚠️ Banner | Queue actions, show cached data |

---

## 8. Offline UI Patterns

### Status Banner

When offline, show a subtle, non-intrusive banner:

```
┌─────────────────────────────────────────┐
│  ⚠ You're offline. Changes will sync   │
│      automatically when connected.      │
└─────────────────────────────────────────┘
```

### Pending Items Indicator

Show pending sync count in the dashboard:

```
┌─────────────────────────────────────────┐
│  ↻ 3 items pending sync                │
└─────────────────────────────────────────┘
```

### Form Behavior

- Forms continue to work offline.
- Submit shows success immediately (optimistic).
- Item appears in history with a "pending sync" indicator.
- When synced, indicator disappears.

---

## 9. Image Offline Strategy

Images are handled separately from metadata:

```
1. Employee takes photo offline
       │
2. Photo saved to device storage (compressed)
       │
3. Visit metadata saved to sync queue (without image URL)
       │
4. Image upload queued separately (lower priority)
       │
When online:
       │
5. Metadata syncs first → creates visit record (imageUrl = null)
       │
6. Image uploads → gets URL from R2
       │
7. PATCH visit record with image URL
```

---

## Future Considerations

- **Selective sync:** Only sync data relevant to the user's current context.
- **Delta sync:** Send only changed fields instead of full records.
- **Background sync:** iOS Background App Refresh / Android WorkManager for sync when app is closed.
- **Conflict UI:** Show conflicts to the user for manual resolution (for complex data types).
- **Offline analytics:** Track offline usage patterns for capacity planning.
- **Storage limits:** Warn users when offline storage is approaching device limits.

---

## Best Practices

- Never block the user because of connectivity — always allow action.
- Show clear indicators when offline, but don't interrupt the workflow.
- Test offline scenarios as rigorously as online scenarios.
- Include local UUIDs for all offline actions — idempotency is mandatory.
- Monitor sync queue sizes in production — large queues indicate connectivity issues.
- Persist the sync queue across app restarts — never lose user data.
