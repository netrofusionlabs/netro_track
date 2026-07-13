# Caching Strategy

> **Purpose:** Define Redis caching patterns and cache management.
> **Dependencies:** [Scalability Architecture](../architecture/scalability-architecture.md)

---

## Redis Usage

| Purpose | Pattern | TTL |
|---------|---------|:---:|
| User session data | `session:{userId}` | 15 min |
| Latest GPS position | `gps:latest:{userId}` | 5 min |
| Dashboard aggregations | `dashboard:{companyId}:{role}` | 2 min |
| Company settings | `company:{companyId}:settings` | 10 min |
| Customer list | `customers:{companyId}` | 5 min |
| Product list | `products:{companyId}` | 10 min |
| Rate limit counters | `ratelimit:{identifier}` | Sliding window |
| MPIN fail counter | `mpin:fails:{userId}` | 30 min |
| Socket.IO adapter | Internal (Redis Pub/Sub) | — |
| BullMQ queues | Internal (Redis Streams) | — |

---

## Cache-Aside Pattern

```typescript
async getCompanySettings(companyId: string) {
  const cacheKey = `company:${companyId}:settings`;
  
  // 1. Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // 2. Query database
  const settings = await this.settingsRepo.findByCompany(companyId);
  
  // 3. Store in cache
  await redis.setex(cacheKey, 600, JSON.stringify(settings)); // 10 min TTL
  
  return settings;
}
```

---

## Cache Invalidation

| Trigger | Invalidated Keys |
|---------|-----------------|
| Company settings updated | `company:{companyId}:settings` |
| Employee CRUD | `dashboard:{companyId}:*` |
| Attendance event | `dashboard:{companyId}:*`, `gps:latest:{userId}` |
| GPS batch received | `gps:latest:{userId}` |
| Customer CRUD | `customers:{companyId}` |
| Product CRUD | `products:{companyId}` |

---

## Rules

- Cache is a **performance optimization**, not a source of truth.
- Always handle cache misses gracefully (fall back to database).
- Use TTL-based expiry as the primary invalidation strategy.
- Active invalidation for write operations.
- Never cache sensitive data (tokens, passwords).
