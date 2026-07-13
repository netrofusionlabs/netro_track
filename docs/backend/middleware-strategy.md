# Middleware Strategy

> **Purpose:** Define the Express middleware chain and each middleware's responsibility.
> **Dependencies:** [Backend Overview](backend-overview.md)

---

## Middleware Execution Order

```
Request → requestId → cors → helmet → compression → bodyParser
→ rateLimiter → requestLogger → authMiddleware → tenantMiddleware
→ roleMiddleware → validateMiddleware → Controller → errorHandler → Response
```

---

## Middleware Catalog

### 1. requestId
Generates a unique UUID for every request. Attached to `req.requestId` and included in all logs and responses.

### 2. authMiddleware
Extracts and verifies JWT from `Authorization: Bearer {token}`. Attaches `req.user = { id, companyId, role, deviceId }`. Returns 401 if token invalid/expired.

### 3. tenantMiddleware
Extracts `companyId` from `req.user` (set by authMiddleware). Attaches `req.tenantId`. Verifies company is active. Returns 403 if company suspended.

### 4. roleMiddleware(allowedRoles[])
Factory function that returns middleware checking `req.user.role` against allowed roles. Returns 403 if unauthorized.

```typescript
export const roleMiddleware = (roles: UserRole[]) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    throw new AppError('FORBIDDEN', 'Insufficient permissions', 403);
  }
  next();
};
```

### 5. validateMiddleware(schema)
Factory function that validates `req.body`, `req.query`, or `req.params` against a Zod schema. Returns 400 with field-level errors if validation fails.

### 6. rateLimiterMiddleware
Redis-backed rate limiting with per-endpoint configuration. Returns 429 when limit exceeded.

### 7. errorHandler
Global error handler. Catches all thrown/unhandled errors. Maps `AppError` to appropriate HTTP status. Logs error details. Returns sanitized error response (no internal details).

---

## Usage Pattern

```typescript
router.post('/punch-in',
  authMiddleware,
  tenantMiddleware,
  roleMiddleware(['CLIENT_USER']),
  validateMiddleware(punchInSchema),
  attendanceController.punchIn
);
```
