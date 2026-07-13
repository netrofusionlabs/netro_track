# Background Jobs

> **Purpose:** Define BullMQ background job definitions and scheduling.
> **Dependencies:** [Scalability Architecture](../architecture/scalability-architecture.md)

---

## Queue Architecture

All queues are backed by Redis via BullMQ.

| Queue | Job | Schedule | Concurrency | Description |
|-------|-----|----------|:-----------:|-------------|
| `notification` | `send-push` | On-demand | 10 | Send FCM push notification |
| `notification` | `attendance-reminder` | Cron: `0 9 * * *` | 5 | Daily attendance reminder |
| `notification` | `daily-summary` | Cron: `0 20 * * *` | 5 | Daily activity summary |
| `reports` | `generate-report` | On-demand | 3 | Generate CSV/PDF report |
| `gps` | `aggregate-daily` | Cron: `0 2 * * *` | 2 | Aggregate GPS data for retention |
| `cleanup` | `retention-cleanup` | Cron: `0 3 * * *` | 1 | Delete old GPS data, expired tokens |
| `cleanup` | `orphan-images` | Cron: `0 4 * * 0` | 1 | Clean orphaned R2 uploads (weekly) |
| `sync` | `broadcast-update` | On-demand | 10 | Emit Socket.IO events asynchronously |

---

## Job Processing Pattern

```typescript
// Job definition
const notificationQueue = new Queue('notification', { connection: redis });

// Adding a job
await notificationQueue.add('send-push', {
  userId: 'user-uuid',
  title: 'Attendance Reminder',
  body: 'Don\'t forget to punch in!',
  data: { type: 'ATTENDANCE_REMINDER' },
});

// Worker
const worker = new Worker('notification', async (job) => {
  if (job.name === 'send-push') {
    await fcmService.send(job.data);
  }
}, { connection: redis, concurrency: 10 });
```

---

## Retry Strategy

| Job Type | Max Retries | Backoff | Strategy |
|----------|:----------:|---------|----------|
| Push notification | 3 | Exponential (1s, 2s, 4s) | Discard after max |
| Report generation | 2 | Fixed (10s) | Mark as failed |
| GPS aggregation | 5 | Exponential (5s base) | Critical — alert on failure |
| Cleanup | 3 | Fixed (60s) | Retry next cycle |

---

## Monitoring

- BullMQ dashboard (Bull Board) for job queue monitoring.
- Alert on failed jobs that exceed retry limits.
- Log all job completions and failures with execution time.
