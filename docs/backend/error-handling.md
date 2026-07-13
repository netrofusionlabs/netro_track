# Error Handling

> **Purpose:** Define error handling patterns, error codes, and custom error classes.
> **Dependencies:** [API Design](api-design.md)

---

## Custom Error Class

```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

---

## Error Codes

| Code | Status | Description |
|------|:------:|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INVALID_CREDENTIALS` | 401 | Wrong password or MPIN |
| `TOKEN_EXPIRED` | 401 | JWT expired |
| `TOKEN_INVALID` | 401 | JWT malformed or tampered |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `COMPANY_SUSPENDED` | 403 | Company is suspended |
| `ACCOUNT_SUSPENDED` | 403 | User account is suspended |
| `ACCOUNT_LOCKED` | 403 | Too many failed MPIN attempts |
| `DEVICE_MISMATCH` | 403 | Request from unregistered device |
| `NOT_FOUND` | 404 | Resource not found |
| `ATTENDANCE_EXISTS` | 409 | Already punched in today |
| `DUPLICATE_ENTRY` | 409 | Record already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Global Error Handler

```typescript
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: { code: err.code, details: err.details },
      meta: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }

  // Unexpected error — log full details, return generic message
  logger.error({ err, requestId: req.requestId }, 'Unhandled error');
  
  return res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    error: { code: 'INTERNAL_ERROR' },
    meta: { timestamp: new Date().toISOString(), requestId: req.requestId },
  });
};
```

---

## Rules

- **Never** expose internal error messages, stack traces, or database errors to the client.
- **Always** log the full error details server-side.
- **Always** include `requestId` in error responses for debugging.
- **Use AppError** for all business-level errors.
- **Let unexpected errors** fall through to the global error handler.
