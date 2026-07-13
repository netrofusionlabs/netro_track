# Realtime Architecture

> **Purpose:** Define the real-time communication strategy for live tracking and notifications.
> **Scope:** Socket.IO design, room structure, event catalog, scaling.
> **Dependencies:** [System Architecture](system-architecture.md), [Authentication](authentication-authorization.md)

---

## 1. Technology

**Socket.IO** is used for all real-time communication:

| Feature | Why Socket.IO |
|---------|-------------|
| Auto-reconnection | Handles mobile connectivity drops |
| Room-based broadcasting | Natural fit for company/team isolation |
| Binary support | Efficient data transfer |
| Fallback transports | WebSocket → HTTP long-polling |
| Redis adapter | Multi-instance scaling |

---

## 2. Connection Lifecycle

```
Mobile App connects to Socket.IO
        │
        ▼
    Handshake: send JWT in auth header
        │
        ▼
    Server validates JWT
        │
        ├── Invalid → Connection rejected
        │
        └── Valid → Connection accepted
                │
                ▼
            Join rooms based on role:
                │
                ├── company:{companyId}          (all company members)
                ├── user:{userId}                (personal notifications)
                ├── role:{companyId}:{role}       (role-specific broadcasts)
                └── team:{managerId}             (manager's team updates)
                │
                ▼
            Connection active → listen for events
```

---

## 3. Room Structure

| Room Pattern | Who Joins | Purpose |
|-------------|-----------|---------|
| `company:{companyId}` | All connected users of a company | Company-wide broadcasts |
| `user:{userId}` | Individual user | Personal notifications |
| `team:{managerId}` | Manager + assigned employees | Team location updates |
| `tracking:{companyId}` | Managers and admins | Live GPS feed |
| `admin:{companyId}` | Client admin | Admin-specific events |
| `platform` | Super admins | Platform-wide events |

---

## 4. Event Catalog

### Client → Server Events

| Event | Payload | Sender | Description |
|-------|---------|--------|-------------|
| `location:update` | `{ lat, lng, accuracy, speed, heading, timestamp, battery, networkType }` | Client User | GPS location update |
| `attendance:status` | `{ status: 'WORKING' \| 'OFFLINE' }` | Client User | Attendance status change |
| `typing:start` | `{ context }` | Any | Typing indicator (future) |

### Server → Client Events

| Event | Payload | Receiver | Description |
|-------|---------|----------|-------------|
| `employee:location` | `{ userId, lat, lng, accuracy, battery, timestamp }` | Managers | Employee location update |
| `employee:status` | `{ userId, status, timestamp }` | Managers | Employee status change |
| `attendance:update` | `{ userId, type, timestamp }` | Managers/Admins | Attendance event |
| `notification:new` | `{ id, title, body, type, data }` | Individual | Push notification |
| `company:announcement` | `{ title, body }` | Company | Company-wide message |
| `sync:required` | `{ entities: string[] }` | Individual | Server tells client to refetch |

### Server → Server Events (via Redis Adapter)

| Event | Purpose |
|-------|---------|
| `session:invalidated` | Force logout across instances |
| `company:suspended` | Disconnect all company users |

---

## 5. Location Update Flow

```
Employee's Background GPS Service
        │
        │  Captures GPS every 30 seconds
        │  Buffers 5-10 points
        ▼
    Batch HTTP POST to /api/v1/tracking/batch
        │
        ▼
    Server processes batch:
        │
        ├── Store in PostgreSQL
        ├── Update Redis cache (latest position)
        └── Emit via Socket.IO:
                │
                ▼
            socket.to(`team:${managerId}`).emit('employee:location', {
              userId, lat, lng, accuracy, battery, timestamp
            });
                │
                ▼
            Manager's app receives update
                │
                ▼
            Map marker moves to new position
```

### Why Not Socket.IO for GPS Upload?

| Factor | HTTP Batch | Socket.IO |
|--------|-----------|-----------|
| Reliability | Retry with queue | Lost on disconnect |
| Offline | Queued in MMKV | Not possible |
| Server processing | Batch insert (efficient) | One-by-one |
| Battery | Fewer connections | Always connected |

**Decision:** GPS data is uploaded via HTTP (reliable, queueable), then broadcasted to managers via Socket.IO (real-time display).

---

## 6. Authentication

### Handshake Authentication

```typescript
// Server-side
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  try {
    const payload = verifyJWT(token);
    socket.data.user = payload;
    socket.data.companyId = payload.companyId;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});
```

### Token Refresh for Sockets

When the access token expires, the client must:

1. Disconnect the socket.
2. Refresh the token via HTTP.
3. Reconnect the socket with the new token.

---

## 7. Scaling with Redis Adapter

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  EC2 #1  │     │  EC2 #2  │     │  EC2 #3  │
│ Socket.IO│     │ Socket.IO│     │ Socket.IO│
│ Instance │     │ Instance │     │ Instance │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     └────────────────┼────────────────┘
                      │
              ┌───────┴───────┐
              │  Redis Pub/Sub │
              │   (Adapter)    │
              └───────────────┘
```

When an event is emitted on one instance, Redis Pub/Sub broadcasts it to all instances, ensuring every connected client receives it regardless of which server they're connected to.

**Install Redis adapter from day one** — even with a single instance — to avoid a breaking migration later.

---

## 8. Connection Management

| Concern | Strategy |
|---------|---------|
| Reconnection | Auto-reconnect with exponential backoff (Socket.IO default) |
| Heartbeat | 25-second ping interval, 20-second timeout |
| Max connections per user | 1 (disconnect previous on new connection) |
| Stale connections | Server-side timeout after 60 seconds of no heartbeat |
| Error handling | Reconnect on error; log disconnection reason |

---

## 9. Data Minimization

**Rules for Socket.IO payloads:**

- Send only metadata — NEVER images or large payloads.
- Location updates: only `{ userId, lat, lng, accuracy, battery, timestamp }`.
- Status updates: only `{ userId, status, timestamp }`.
- Notifications: only `{ id, title, type }` — fetch details via API.

---

## Future Considerations

- **Geofence events:** Real-time alerts when employees enter/exit defined areas.
- **Chat:** Manager-to-employee messaging via Socket.IO.
- **Typing indicators:** For future chat feature.
- **Presence system:** Track which users are currently online.
- **WebSocket compression:** Enable per-message deflate for bandwidth optimization.

---

## Best Practices

- Always authenticate socket connections — never allow anonymous connections.
- Use rooms for targeted broadcasting — never broadcast to all connections.
- Keep payloads small — fetch details via REST API.
- Implement Redis adapter from day one for scaling readiness.
- Log all connection/disconnection events for debugging.
- Handle reconnection gracefully on the client side.
