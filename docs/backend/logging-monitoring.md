# Logging & Monitoring

> **Purpose:** Define structured logging and monitoring strategy.
> **Dependencies:** [Backend Overview](backend-overview.md)

---

## Logging with Pino

```typescript
import pino from 'pino';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Request logging middleware
app.use((req, res, next) => {
  req.log = logger.child({ requestId: req.requestId, tenantId: req.tenantId });
  const start = Date.now();
  res.on('finish', () => {
    req.log.info({
      method: req.method, url: req.url, statusCode: res.statusCode,
      duration: Date.now() - start,
    }, 'Request completed');
  });
  next();
});
```

---

## What to Log

| Level | What | Example |
|-------|------|---------|
| `error` | Unexpected failures, unhandled exceptions | Database connection failure |
| `warn` | Business rule violations, deprecated usage | MPIN lockout triggered |
| `info` | Successful operations, request/response | Punch in recorded |
| `debug` | Detailed operation data (dev only) | Prisma query details |

---

## What NOT to Log

- ❌ Passwords, MPINs, tokens
- ❌ Full request bodies with sensitive data
- ❌ PII unless anonymized
- ❌ Image binary data

---

## Health Endpoints

```
GET /health          → { status: 'ok', uptime: 123456, version: '1.0.0' }
GET /health/db       → { status: 'ok', latency: '3ms' }
GET /health/redis    → { status: 'ok', latency: '1ms' }
GET /health/storage  → { status: 'ok', bucket: 'accessible' }
```

---

## Future Monitoring Stack

| Component | Purpose |
|-----------|---------|
| Prometheus | Metrics collection |
| Grafana | Dashboard visualization |
| Loki | Log aggregation |
| Alertmanager | Alert routing |
