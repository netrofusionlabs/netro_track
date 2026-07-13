# NetroTrack — AI Development Guide

> **This file is the authoritative reference for any AI assistant working on the NetroTrack codebase.**
> Read this file in its entirety before generating any code, configuration, or documentation.

---

## 1. Project Identity

| Key | Value |
|-----|-------|
| Product | NetroTrack |
| Type | Commercial Multi-Tenant SaaS Platform |
| Domain | Field Workforce Management |
| Tagline | Track. Manage. Perform. |
| Organization | NetroFusion Labs |

**NetroTrack is NOT a prototype, hackathon project, or MVP experiment.**
It is a production-grade, enterprise-ready SaaS platform designed for 10+ years of maintenance.

---

## 2. Authoritative References

| Document | Path | Purpose |
|----------|------|---------|
| Product Bible | `NETROTRACK_PRODUCT_BIBLE.md` | Single source of truth for product requirements |
| Documentation | `docs/` | Complete technical and product documentation |
| This File | `AGENTS.md` | AI behavioral rules and coding standards |

Always read the Product Bible and relevant `docs/` files before implementing any feature.

---

## 3. Technology Stack — Do NOT Deviate

### Mobile Application

| Concern | Technology | Version Policy |
|---------|-----------|----------------|
| Framework | React Native CLI | Latest stable |
| Language | TypeScript (strict) | Latest stable |
| Navigation | React Navigation | v6+ |
| State (client) | Zustand | Latest stable |
| State (server) | TanStack Query | v5+ |
| HTTP | Axios | Latest stable |
| Forms | React Hook Form | Latest stable |
| Validation | Zod | Latest stable |
| Animations | Reanimated | v3+ |
| Maps | React Native Maps | Latest stable |
| Camera | Vision Camera | v4+ |
| Secure Storage | MMKV | Latest stable |
| Image Picker | React Native Image Picker | Latest stable |
| Push Notifications | Firebase Cloud Messaging | Latest stable |
| Min Android | API 26 (Android 8.0) | — |
| Min iOS | iOS 14+ | — |

### Backend

| Concern | Technology |
|---------|-----------|
| Runtime | Node.js (LTS) |
| Framework | Express.js |
| Language | TypeScript (strict) |
| ORM | Prisma |
| Realtime | Socket.IO |
| Validation | Zod |
| Auth | JWT + Refresh Tokens |
| Password Hashing | Argon2 |
| Logging | Pino |
| Caching / Sessions | Redis |
| Background Jobs | BullMQ |

### Infrastructure

| Concern | Technology |
|---------|-----------|
| Database | PostgreSQL on Neon (pooled connections) |
| Object Storage | Cloudflare R2 |
| Hosting | AWS EC2 (Ubuntu LTS) |
| Reverse Proxy | Nginx |
| Process Manager | PM2 |
| CI/CD | GitHub Actions |
| Push Notifications | Firebase Cloud Messaging |
| Maps | Google Maps Platform |

**Rule: Do NOT introduce any library, framework, or service not listed above without explicit human approval.**

---

## 4. Architecture Rules

### 4.1 Monorepo Structure

```
netrotrack/
├── apps/
│   ├── mobile/          # React Native CLI app
│   └── backend/         # Node.js Express API
├── packages/
│   └── shared/          # Shared Zod schemas, types, constants
├── docs/                # Documentation repository
├── AGENTS.md            # This file
├── NETROTRACK_PRODUCT_BIBLE.md
└── package.json         # Workspace root
```

### 4.2 Layered Architecture (Backend)

```
Controller (Route Handler)
    ↓
Middleware (Auth, Tenant, Validation)
    ↓
Service (Business Logic)
    ↓
Repository (Data Access via Prisma)
    ↓
Database (PostgreSQL)
```

- **Never** put business logic in controllers.
- **Never** put database queries in services.
- **Never** access Prisma directly from controllers.

### 4.3 Feature-First Architecture (Mobile)

```
src/
├── features/
│   ├── auth/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── stores/
│   │   └── types.ts
│   ├── attendance/
│   ├── tracking/
│   ├── visits/
│   ├── sales/
│   └── inspections/
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   ├── theme/
│   └── types/
└── navigation/
```

### 4.4 Multi-Tenancy

- Every business table MUST include `companyId`.
- Every query MUST filter by `companyId`.
- Every API endpoint MUST extract `companyId` from the authenticated user's JWT.
- **Never** accept `companyId` from the request body or URL for data access.
- A middleware (`tenantMiddleware`) should inject `companyId` into the request context.

### 4.5 Module Isolation

Features must remain loosely coupled:

- `attendance` must NOT import from `visits`.
- `tracking` must NOT import from `sales`.
- Cross-feature communication goes through shared services or event emitters.

---

## 5. Coding Standards

### 5.1 TypeScript

- **Strict mode** is mandatory (`"strict": true` in `tsconfig.json`).
- **No `any` type** — use `unknown` when the type is genuinely unknown.
- **No type assertions** (`as Type`) unless absolutely necessary with a comment explaining why.
- **Prefer interfaces** for object shapes, **types** for unions/intersections.
- **Export types explicitly** — use `export type` where possible.

### 5.2 Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files (components) | PascalCase | `AttendanceCard.tsx` |
| Files (utilities) | camelCase | `dateUtils.ts` |
| Files (types) | camelCase | `types.ts` |
| Files (hooks) | camelCase with `use` prefix | `useAttendance.ts` |
| Files (services) | camelCase with `.service` suffix | `attendance.service.ts` |
| Files (repositories) | camelCase with `.repository` suffix | `attendance.repository.ts` |
| Files (controllers) | camelCase with `.controller` suffix | `attendance.controller.ts` |
| Files (middleware) | camelCase with `.middleware` suffix | `auth.middleware.ts` |
| Files (validators) | camelCase with `.validator` suffix | `attendance.validator.ts` |
| Variables | camelCase | `employeeCount` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Functions | camelCase (verb prefix) | `getAttendance()` |
| Classes | PascalCase | `AttendanceService` |
| Interfaces | PascalCase with `I` prefix (optional) | `AttendanceRecord` |
| Enums | PascalCase | `UserRole` |
| Enum members | UPPER_SNAKE_CASE | `CLIENT_USER` |
| Database tables | snake_case (plural) | `customer_visits` |
| Database columns | snake_case | `company_id` |
| API endpoints | kebab-case | `/api/v1/customer-visits` |
| Environment variables | UPPER_SNAKE_CASE | `DATABASE_URL` |

### 5.3 Function Rules

- Maximum 30 lines per function (soft limit; complex business logic may exceed with justification).
- Single responsibility per function.
- Pure functions preferred where possible.
- Always handle errors — never ignore promise rejections or caught errors.

### 5.4 Component Rules (React Native)

- Functional components only — no class components.
- One component per file.
- Props interface defined above the component.
- Destructure props in the function signature.
- Use `React.memo()` for expensive renders — not by default.
- Separate styles into `StyleSheet.create()` at the bottom of the file.
- Business logic belongs in hooks, not in component bodies.

### 5.5 Import Order

```typescript
// 1. React / React Native
import React from 'react';
import { View, Text } from 'react-native';

// 2. Third-party libraries
import { useQuery } from '@tanstack/react-query';

// 3. Shared modules
import { Button } from '@/shared/components';
import { useTheme } from '@/shared/hooks';

// 4. Feature-local modules
import { AttendanceCard } from './components';
import { useAttendance } from './hooks';

// 5. Types
import type { AttendanceRecord } from './types';
```

---

## 6. API Standards

### 6.1 Response Format

Every API response MUST follow this structure:

```typescript
// Success
{
  "success": true,
  "message": "Attendance recorded successfully",
  "data": { ... },
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}

// Error
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "latitude", "message": "Latitude is required" }
    ]
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}

// Paginated
{
  "success": true,
  "message": "Records fetched",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  },
  "meta": { ... }
}
```

### 6.2 HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (delete) |
| 400 | Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Rate Limited |
| 500 | Internal Server Error |

### 6.3 Versioning

- All endpoints are prefixed with `/api/v1/`.
- Never introduce breaking changes within a version.
- New versions (`/api/v2/`) only when backward-incompatible changes are necessary.

---

## 7. Security Rules

- **Never** log passwords, tokens, MPINs, or PII.
- **Never** return password hashes in API responses.
- **Never** trust client-side role claims — always verify from the database or JWT.
- **Never** accept `companyId` from request body for data access — derive from JWT.
- **Always** validate and sanitize all inputs using Zod schemas.
- **Always** use parameterized queries (Prisma handles this).
- **Always** set secure HTTP headers (Helmet.js).
- **Always** implement rate limiting on authentication endpoints.
- **Always** use HTTPS in production.
- MPIN must be hashed (Argon2), never stored as plaintext.
- JWT access tokens: 15-minute expiry.
- JWT refresh tokens: 7-day expiry, single-use with rotation.

---

## 8. Database Rules

- Every table MUST have: `id`, `created_at`, `updated_at`.
- Business tables MUST have: `company_id`.
- Use soft delete (`deleted_at` timestamp) — never hard delete business data.
- Store all timestamps in UTC.
- Use UUIDs for primary keys.
- Index all foreign keys.
- Index `company_id` on every business table.
- Index columns used in WHERE clauses and ORDER BY.

---

## 9. Git Workflow

### Branch Naming

```
main              → Production-ready code
develop           → Integration branch
feature/NT-XXX    → Feature branches
bugfix/NT-XXX     → Bug fix branches
hotfix/NT-XXX     → Production hotfixes
release/vX.Y.Z    → Release preparation
```

### Commit Messages (Conventional Commits)

```
feat(attendance): add punch-in with GPS capture
fix(tracking): resolve battery drain on Android 12+
docs(api): update authentication endpoint reference
refactor(auth): extract token validation to middleware
test(visits): add unit tests for visit creation service
chore(deps): update prisma to v5.x
```

---

## 10. Error Handling

### Backend

```typescript
// Always use custom error classes
throw new AppError('ATTENDANCE_ALREADY_EXISTS', 'Punch-in already recorded for today', 409);

// Never expose internal errors
// BAD: res.status(500).json({ error: err.message });
// GOOD: res.status(500).json({ success: false, message: 'An unexpected error occurred' });
```

### Mobile

- Every screen must handle: loading, success, error, empty, and offline states.
- Use Error Boundaries at the navigator level.
- Network errors should show retry options.
- Offline actions should queue silently and sync when connectivity returns.

---

## 11. Performance Requirements

| Metric | Target |
|--------|--------|
| App launch | < 3 seconds |
| API response (p95) | < 500ms |
| Login | < 2 seconds |
| Punch In/Out | Instant (< 300ms perceived) |
| GPS batch sync | Every 2.5–5 minutes |
| Image upload | < 5 seconds per image |
| List rendering | 60fps with virtualization |

---

## 12. Offline-First Rules

- Attendance, GPS, visits, sales, and inspections MUST work offline.
- Use MMKV for local queue storage.
- Automatic sync when connectivity returns — no user action required.
- Conflict resolution: last-write-wins with server timestamp.
- Queue items must include a local UUID to prevent duplicates on retry.

---

## 13. What NOT to Do

| ❌ Don't | ✅ Do |
|----------|-------|
| Add libraries without approval | Use only the approved stack |
| Put business logic in components | Use hooks and services |
| Use `any` type | Use proper types or `unknown` |
| Hard-code strings or values | Use constants, enums, or env vars |
| Skip error handling | Handle every error path |
| Ignore offline scenarios | Design offline-first |
| Trust client-side data | Validate everything server-side |
| Mix concerns across features | Keep features isolated |
| Write clever, compact code | Write readable, maintainable code |
| Skip TypeScript strict checks | Keep strict mode enabled |
| Use `console.log` | Use Pino logger (backend) or structured logging |
| Store images in the database | Store URLs only; images go to R2 |
| Accept `companyId` from request body | Always derive from JWT |

---

## 14. Scalability Targets

| Metric | V1 | Future |
|--------|-----|--------|
| Companies | 100 | 10,000 |
| Employees | 10,000 | 500,000 |
| Concurrent Users | 2,000 | 50,000 |
| GPS Records/Day | ~2M | ~200M |

Design every feature with these targets in mind. What works for 100 companies must still work for 10,000.

---

## 15. When in Doubt

1. Read the Product Bible (`NETROTRACK_PRODUCT_BIBLE.md`).
2. Read the relevant `docs/` file.
3. Read this file (`AGENTS.md`).
4. Follow existing patterns in the codebase.
5. Ask the human developer — do NOT guess.

**The goal is a production-grade, commercially viable SaaS platform. Every line of code should reflect that standard.**
