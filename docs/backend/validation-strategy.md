# Validation Strategy

> **Purpose:** Define request validation using Zod.
> **Dependencies:** [API Design](api-design.md)

---

## Approach

All request validation uses **Zod** schemas. Validation is enforced at the middleware level before reaching the controller.

---

## Pattern

```typescript
// attendance.validator.ts
import { z } from 'zod';

export const punchInSchema = z.object({
  body: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().positive().optional(),
    localId: z.string().uuid(),
  }),
});

export const attendanceHistorySchema = z.object({
  query: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
```

---

## Shared Schemas (packages/shared)

Schemas shared between mobile and backend live in `packages/shared/src/schemas/`:

```typescript
// packages/shared/src/schemas/gps.schema.ts
export const gpsPointSchema = z.object({
  id: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive(),
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  timestamp: z.string().datetime(),
  batteryLevel: z.number().int().min(0).max(100).optional(),
  networkType: z.enum(['wifi', 'cellular', 'none']).optional(),
});

export const gpsBatchSchema = z.object({
  points: z.array(gpsPointSchema).min(1).max(20),
});
```

---

## Validation Rules

- **All request bodies** are validated via Zod before reaching the controller.
- **Query parameters** are coerced to correct types (`z.coerce.number()`).
- **Path parameters** (UUIDs) are validated via Zod.
- **Shared schemas** are used by both mobile (client-side pre-validation) and backend (server-side enforcement).
- **Custom error messages** are provided for user-facing validation failures.

---

## Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "body.latitude", "message": "Number must be between -90 and 90" },
      { "field": "body.localId", "message": "Required" }
    ]
  }
}
```
