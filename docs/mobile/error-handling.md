# Error Handling (Mobile)

> **Purpose:** Mobile error handling patterns.
> **Dependencies:** [Mobile Overview](mobile-overview.md)

---

## Every Screen Must Handle 5 States

| State | UI Pattern |
|-------|-----------|
| **Loading** | Skeleton screen or loading spinner |
| **Success** | Normal data display |
| **Error** | Error message with retry button |
| **Empty** | Illustration with descriptive text |
| **Offline** | Cached data + offline banner |

## Error Boundaries

React Error Boundaries at the navigator level catch unhandled JS errors and show a recovery screen instead of crashing.

## Network Error Handling

```typescript
// Axios interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      return refreshAndRetry(error.config);
    }
    if (!error.response) {
      // Network error — queue for offline sync if applicable
    }
    return Promise.reject(error);
  }
);
```

## User-Facing Error Messages

- Never show technical errors (stack traces, SQL errors).
- Show friendly messages: "Something went wrong. Please try again."
- Provide actionable options: Retry, Go Back, Contact Support.
- Log full error details to remote logging service (future).
