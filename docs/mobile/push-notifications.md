# Push Notifications (Mobile)

> **Purpose:** FCM integration and notification handling.
> **Dependencies:** [Mobile Overview](mobile-overview.md)

---

## Firebase Cloud Messaging Setup

- FCM token obtained on app launch and stored in backend via `POST /api/v1/auth/device/register`.
- Token refreshed automatically; backend updated on change.

## Notification Types

| Type | Trigger | Deep Link |
|------|---------|-----------|
| `ATTENDANCE_REMINDER` | Cron job (9 AM) | Dashboard |
| `DAILY_SUMMARY` | Cron job (8 PM) | History |
| `TASK_ASSIGNED` | Manager action (future) | Task detail |
| `MANAGER_ANNOUNCEMENT` | Manager broadcast | Notifications |
| `COMPANY_ANNOUNCEMENT` | Admin broadcast | Notifications |
| `SUBSCRIPTION_REMINDER` | Billing (future) | Settings |

## Handling

- **Foreground:** Show in-app snackbar/banner.
- **Background:** System notification; tap opens deep link.
- **Killed:** System notification; tap launches app with deep link.

## Data Payload

```json
{
  "notification": { "title": "...", "body": "..." },
  "data": { "type": "ATTENDANCE_REMINDER", "screen": "Dashboard", "entityId": "..." }
}
```
