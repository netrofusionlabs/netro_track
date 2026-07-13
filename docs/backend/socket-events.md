# Socket Events Reference

> **Purpose:** Complete catalog of all Socket.IO events.
> **Dependencies:** [Realtime Architecture](../architecture/realtime-architecture.md)

---

## Connection

```typescript
// Client connection
const socket = io('wss://api.netrotrack.com', {
  auth: { token: accessToken },
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity,
});
```

---

## Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `location:update` | `{ lat, lng, accuracy, speed, battery, timestamp }` | Employee GPS update (supplemental to HTTP batch) |
| `status:change` | `{ status: 'WORKING' \| 'OFFLINE' }` | Employee status change |

### Server → Client

| Event | Target Room | Payload | Description |
|-------|------------|---------|-------------|
| `employee:location` | `team:{managerId}` | `{ userId, lat, lng, accuracy, battery, timestamp }` | Live employee position |
| `employee:status` | `team:{managerId}` | `{ userId, status, name, timestamp }` | Status change notification |
| `attendance:event` | `tracking:{companyId}` | `{ userId, type, timestamp }` | Punch in/out event |
| `notification:new` | `user:{userId}` | `{ id, title, body, type }` | Personal notification |
| `announcement:new` | `company:{companyId}` | `{ id, title, body }` | Company announcement |
| `sync:required` | `user:{userId}` | `{ entities: string[] }` | Tell client to refetch data |
| `force:logout` | `user:{userId}` | `{ reason }` | Force client logout |

---

## Rooms

| Room | Members | Auto-join |
|------|---------|:---------:|
| `company:{companyId}` | All company users | ✅ On connect |
| `user:{userId}` | Individual user | ✅ On connect |
| `team:{managerId}` | Manager + assigned employees | ✅ Based on role |
| `tracking:{companyId}` | Managers + admins | ✅ Based on role |
| `platform` | Super admins | ✅ Based on role |
