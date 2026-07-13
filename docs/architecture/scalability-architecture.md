# Scalability Architecture

> **Purpose:** Define the scalability strategy for handling growth from 100 to 10,000+ companies.
> **Scope:** Horizontal scaling, caching, connection pooling, partitioning, load balancing.
> **Dependencies:** [System Architecture](system-architecture.md), [GPS Tracking](gps-tracking-architecture.md)

---

## 1. Scalability Targets

| Metric | V1 (Launch) | Future | Growth Factor |
|--------|:-----------:|:------:|:-------------:|
| Companies | 100 | 10,000 | 100× |
| Employees | 10,000 | 500,000 | 50× |
| Concurrent Users | 2,000 | 50,000 | 25× |
| GPS Points/Day | ~9.6M | ~480M | 50× |
| API Requests/Second | ~100 | ~5,000 | 50× |
| WebSocket Connections | 2,000 | 50,000 | 25× |

---

## 2. Real-Time Hitting & Concurrency Capacity

To understand how many users can hit the backend concurrently in real-time, the system defines "Hitting Capability" by operational tier:

### A. Concurrent Active Sessions
*   **V1 Launch (Single `t3.medium` EC2):** Supports **2,000 concurrent active users** (active mobile app instances connected via WebSocket/Socket.IO and API).
*   **V1+ Scale (Single `t3.xlarge` EC2):** Supports **5,000 concurrent active users**.
*   **V2 Scale (2 EC2 instances behind ALB):** Supports **15,000 concurrent active users**.
*   **V3 Scale (Auto-Scaling Group, 2-6 instances):** Scales up to **50,000 concurrent active users**.

### B. API Throughput
*   **V1 Launch:** Designed to handle **~100 requests per second (RPS)**.
*   **V3 Scale:** Designed to handle up to **5,000 requests per second (RPS)**.

### C. Traffic Management & Optimization
1.  **Client-Side Batching:** The mobile app does not send a separate API request for every location update. Instead, location data is saved locally inside MMKV storage and sent in **batches of 5–10 points every 2.5 to 5 minutes** in a single optimized payload. This reduces server hit frequency by up to **90%**.
2.  **Redis Cache Shielding:** Read-heavy operations (e.g. session tokens check, dashboard counters, product catalogues, and the latest coordinates) are cached in Redis. Hits to these endpoints bypass PostgreSQL entirely, preserving database resources.
3.  **Database Connection Pooling:** Prisma client instances use connection pools of 20 connections per server node. Neon's PgBouncer handles **100 to 500 concurrent connections** directly, allowing serverless or multi-threaded app instances to process queries concurrently.

---

## 3. Scaling Strategy by Layer

### Application Layer

| Phase | Strategy | Handles |
|-------|---------|---------|
| V1 | Single EC2 (t3.medium) | 2,000 concurrent |
| V1+ | Single EC2 (t3.xlarge) | 5,000 concurrent |
| V2 | 2 EC2 behind ALB | 15,000 concurrent |
| V3 | Auto Scaling Group (2-6 instances) | 50,000 concurrent |

### Database Layer

| Phase | Strategy | Handles |
|-------|---------|---------|
| V1 | Neon Pro (single, pooled) | 10,000 employees |
| V2 | Neon with read replicas | 100,000 employees |
| V3 | Neon Enterprise + partitioned GPS table | 500,000 employees |

### Cache Layer (Redis)

| Phase | Strategy | Handles |
|-------|---------|---------|
| V1 | Redis on EC2 (local) | Basic caching + Socket adapter |
| V2 | ElastiCache (single node) | High availability |
| V3 | ElastiCache cluster | Horizontal cache scaling |

---

## 4. Caching Strategy

### What to Cache

| Data | Cache Key | TTL | Invalidation |
|------|----------|:---:|-------------|
| User session | `session:{userId}` | 15 min | On logout / token refresh |
| Latest GPS position | `gps:latest:{userId}` | 5 min | On new GPS batch |
| Dashboard counts | `dashboard:{companyId}:{role}` | 2 min | On attendance/visit events |
| Company settings | `company:{companyId}:settings` | 10 min | On settings update |
| Customer list | `customers:{companyId}` | 5 min | On customer CRUD |
| Product list | `products:{companyId}` | 10 min | On product CRUD |
| Rate limit counters | `ratelimit:{ip}:{endpoint}` | Sliding window | Auto-expire |
| MPIN fail counter | `mpin:fails:{userId}` | 30 min | On successful login |

### Cache-Aside Pattern

```
Request arrives
    │
    ├── Check Redis cache
    │       │
    │       ├── Cache hit → Return cached data
    │       │
    │       └── Cache miss → Query PostgreSQL
    │                           │
    │                           ├── Store in Redis (with TTL)
    │                           └── Return data
```

---

## 5. Database Optimization

### Connection Pooling

```
Application (Node.js)
    │
    ├── Prisma Client (connection pool: 10-20 connections)
    │
    ▼
Neon Connection Pooler (PgBouncer)
    │
    ├── Pool size: 100-500 connections
    │
    ▼
PostgreSQL Instance
```

### Table Partitioning (GPS Data)

GPS tracks table partitioned by month:

```sql
-- Partition by month on captured_at
CREATE TABLE gps_tracks (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL,
    user_id UUID NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL,
    ...
) PARTITION BY RANGE (captured_at);

-- Monthly partitions
CREATE TABLE gps_tracks_2025_01 PARTITION OF gps_tracks
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
    
CREATE TABLE gps_tracks_2025_02 PARTITION OF gps_tracks
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

### Index Strategy

| Index | Table | Purpose |
|-------|-------|---------|
| `(company_id, user_id, captured_at)` | gps_tracks | Route playback queries |
| `(company_id, date)` | attendance_records | Daily attendance lookup |
| `(company_id, created_at)` | customer_visits | Visit history |
| `(company_id)` | All business tables | Tenant isolation |
| `(manager_id)` | users | Team member lookup |

---

## 6. API Performance

### Request Processing Pipeline

```
Nginx (connection limiting, buffering)
    │
    ▼
Express.js (compression, parsing)
    │
    ▼
Rate Limiter (Redis-backed)
    │
    ▼
Auth Middleware (JWT verify — sync, fast)
    │
    ▼
Tenant Middleware (companyId injection)
    │
    ▼
Validation (Zod — fail fast)
    │
    ▼
Controller → Service → Repository
    │
    ▼
Response (< 500ms target)
```

### Response Optimization

| Technique | Where | Impact |
|-----------|-------|--------|
| Field selection | Prisma `select` | Reduce payload size |
| Pagination | All list endpoints | Limit result sets |
| Compression | Nginx gzip | 60-80% bandwidth reduction |
| Caching | Redis | Eliminate redundant DB queries |
| Connection pooling | Prisma + Neon | Reduce connection overhead |
| Query optimization | Prisma with raw SQL fallback | Complex queries |

---

## 7. Load Balancing (V2+)

```
Internet
    │
    ▼
Application Load Balancer (ALB)
    │
    ├── Health check: GET /health (every 30s)
    │
    ├── HTTP routing: /api/* → Target Group (API instances)
    │
    └── WebSocket routing: /socket.io/* → Target Group (sticky sessions)
    │
    ├── EC2 Instance 1 (Node.js + Socket.IO)
    ├── EC2 Instance 2 (Node.js + Socket.IO)
    └── EC2 Instance N (auto-scaling)
```

### Sticky Sessions for WebSocket

WebSocket connections must stick to the same instance. ALB uses cookie-based session affinity:

```
ALB → Cookie: AWSALB={instance-hash}
```

Combined with Redis adapter, Socket.IO events propagate across all instances.

---

## 8. Background Job Scaling

### BullMQ Queue Architecture

```
┌─────────────────────────────────────────────┐
│              BullMQ Queues (Redis)            │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ gps-agg  │  │ reports  │  │  notify   │  │
│  │ queue    │  │ queue    │  │  queue    │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │              │              │        │
└───────┼──────────────┼──────────────┼────────┘
        │              │              │
   ┌────┴────┐    ┌────┴────┐   ┌────┴────┐
   │ Worker  │    │ Worker  │   │ Worker  │
   │ (GPS    │    │ (Report │   │ (FCM    │
   │  aggr.) │    │  gen.)  │   │  send)  │
   └─────────┘    └─────────┘   └─────────┘
```

| Queue | Purpose | Concurrency |
|-------|---------|:-----------:|
| `gps-aggregation` | Aggregate GPS data for reporting | 5 |
| `report-generation` | Generate CSV/PDF reports | 3 |
| `notification-dispatch` | Send FCM push notifications | 10 |
| `image-cleanup` | Remove orphaned R2 uploads | 1 |
| `data-retention` | Archive/delete old GPS data | 1 |

---

## 9. Monitoring and Alerting

| Metric | Threshold | Action |
|--------|-----------|--------|
| API response time (p95) | > 500ms | Investigate slow queries |
| CPU usage | > 70% sustained | Scale up or add instance |
| Memory usage | > 80% | Check for memory leaks |
| Database connections | > 80% pool | Increase pool size |
| Redis memory | > 70% | Review TTLs, evict keys |
| WebSocket connections | > 80% capacity | Add instance |
| Error rate | > 1% of requests | Alert on-call engineer |
| Disk usage | > 80% | Clean logs, archive data |

### Health Endpoints

```
GET /health              → { status: 'ok', uptime: 123456 }
GET /health/db           → { status: 'ok', latency: '3ms' }
GET /health/redis        → { status: 'ok', latency: '1ms' }
GET /health/storage      → { status: 'ok', bucket: 'accessible' }
```

---

## Future Considerations

- **Microservices extraction:** GPS tracking as an independent service if write volume exceeds single-server capacity.
- **Read replicas:** Neon read replicas for report queries to avoid impacting write performance.
- **CDN:** Cloudflare CDN for static assets and API response caching.
- **Edge computing:** Cloudflare Workers for GPS data pre-processing near the edge.
- **Kubernetes:** Container orchestration for complex multi-service deployments.
- **TimescaleDB:** Time-series extension for PostgreSQL for GPS data at 100M+ points/day.

---

## Best Practices

- Profile before optimizing — measure first, then act.
- Design for 10× current load — build for what you'll need in 12 months.
- Cache aggressively but invalidate correctly.
- Partition high-volume tables early — retrofitting is painful.
- Use connection pooling everywhere — database connections are expensive.
- Monitor everything — you can't optimize what you can't measure.
- Load test before every major release.
