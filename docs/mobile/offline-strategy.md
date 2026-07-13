# Offline Strategy (Mobile)

> **Purpose:** Mobile-specific offline implementation.
> **Dependencies:** [Offline Architecture](../architecture/offline-architecture.md)

---

## MMKV Sync Queue

All offline actions are persisted in MMKV as a JSON array. The sync engine processes them in priority order when connectivity returns. See [Offline Architecture](../architecture/offline-architecture.md) for the complete queue structure, sync process, and conflict resolution strategy.

## Key Implementation Points

- **Network detection:** `@react-native-community/netinfo` monitors connectivity.
- **Auto-sync triggers:** Network online event, app foreground event, 60-second interval.
- **Optimistic UI:** Actions appear successful immediately; sync indicator shown.
- **Image queueing:** Photos saved to device temp storage; upload URL requested on sync.
- **Draft persistence:** In-progress forms auto-save to `draft_{type}_{id}` MMKV keys.
- **Queue size monitoring:** Warn user if queue exceeds 100 items.
