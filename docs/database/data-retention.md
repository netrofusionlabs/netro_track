# Data Retention Policy

> **Purpose:** Define data retention, archival, and deletion policies.
> **Dependencies:** [Schema Reference](schema-reference.md), [GPS Tracking](../architecture/gps-tracking-architecture.md)

---

## Retention Schedule

| Data Type | Hot Storage | Warm (Aggregated) | Archive | Hard Delete |
|-----------|:----------:|:-----------------:|:-------:|:-----------:|
| GPS Tracks | 90 days | 1 year (daily summaries) | 3 years | After archive |
| Attendance Records | 2 years | Indefinite | — | Never |
| Customer Visits | 2 years | Indefinite | — | Never |
| Product Sales | 2 years | Indefinite | — | Never |
| Inspections | 2 years | Indefinite | — | Never |
| Audit Logs (security) | 2 years | — | 5 years | After archive |
| Audit Logs (routine) | 6 months | — | 2 years | After archive |
| Refresh Tokens (expired) | — | — | — | 30 days after expiry |
| FCM Tokens (stale) | — | — | — | 90 days inactive |
| Soft-deleted records | 2 years | — | — | After 2 years |

---

## GPS Data Aggregation

After 90 days, raw GPS points are aggregated into daily summaries:

```typescript
interface DailyGpsSummary {
  userId: string;
  companyId: string;
  date: Date;
  totalDistanceMeters: number;
  totalPoints: number;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  averageSpeed: number;
  maxSpeed: number;
  boundingBox: { minLat, maxLat, minLng, maxLng };
}
```

Raw GPS points are then deleted to control storage costs.

---

## Storage Cost Projections

| Scale | Raw GPS/Day | Monthly Storage | With Retention |
|-------|:----------:|:--------------:|:--------------:|
| 10K employees | ~2.3 GB | ~69 GB | ~207 GB (90-day hot) |
| 500K employees | ~115 GB | ~3.4 TB | ~10.3 TB (90-day hot) |

Retention policy keeps hot storage manageable while preserving business data indefinitely.

---

## Implementation

Retention is enforced by a **BullMQ scheduled job** running daily:

```
Daily at 02:00 UTC:
  1. Aggregate GPS data older than 90 days into daily summaries
  2. Delete raw GPS points older than 90 days
  3. Delete expired refresh tokens
  4. Delete stale FCM tokens (inactive > 90 days)
  5. Hard delete soft-deleted records older than 2 years
```

---

## GDPR Considerations

- Users can request data export (right to data portability).
- Company deletion requires complete data purge (right to erasure) — handled by Super Admin.
- Audit logs for security events are retained for compliance regardless of deletion requests.
- Personal data (name, phone, email) must be anonymizable on request.
