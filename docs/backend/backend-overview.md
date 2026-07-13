# Backend Overview

> **Purpose:** High-level backend architecture and technology decisions.
> **Scope:** Node.js/Express architecture, technology stack, and patterns.
> **Dependencies:** [Application Architecture](../architecture/application-architecture.md)

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Node.js (LTS) | Server runtime |
| Framework | Express.js | HTTP server, routing |
| Language | TypeScript (strict) | Type safety |
| ORM | Prisma | Database access, migrations |
| Realtime | Socket.IO + Redis adapter | Live tracking |
| Validation | Zod | Request/response validation |
| Auth | JWT (jsonwebtoken) | Authentication |
| Hashing | Argon2 | Password/MPIN hashing |
| Logging | Pino | Structured JSON logging |
| Caching | Redis (ioredis) | Caching, sessions, rate limiting |
| Jobs | BullMQ | Background job processing |
| HTTP Security | Helmet.js | Secure HTTP headers |
| CORS | cors | Cross-origin resource sharing |
| Rate Limiting | rate-limiter-flexible | Redis-backed rate limiting |
| File Uploads | @aws-sdk/client-s3 | R2 signed URL generation |

---

## Architectural Principles

1. **Layered architecture:** Controller → Service → Repository → Database.
2. **Feature-first modules:** Each feature is a self-contained module.
3. **Middleware chain:** Auth → Tenant → Role → Validation → Handler.
4. **Shared nothing between modules:** Cross-module communication via events or shared services.
5. **Configuration via environment variables:** No hardcoded values.
6. **Comprehensive error handling:** Global error handler, custom error classes.
7. **Structured logging:** Every request logged with correlation ID.

---

## API Versioning

All endpoints are prefixed with `/api/v1/`. New versions created only for breaking changes. Non-breaking additions (new fields, new endpoints) are added to the current version.

---

## Server Entry Point

```typescript
// server.ts
import { createApp } from './app';
import { createSocketServer } from './socket';
import { startWorkers } from './jobs';

const app = createApp();
const server = app.listen(process.env.PORT || 3000);
const io = createSocketServer(server);

startWorkers(); // BullMQ workers

// Graceful shutdown
process.on('SIGTERM', async () => {
  server.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});
```
