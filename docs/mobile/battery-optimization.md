# Battery Optimization

> **Purpose:** Strategies to minimize battery drain from GPS tracking.
> **Dependencies:** [GPS Tracking Architecture](../architecture/gps-tracking-architecture.md)

---

## Key Strategy: Adaptive Tracking

| State | Interval | Detection |
|-------|:--------:|-----------|
| Moving (> 2 m/s) | 30s | Speed from GPS |
| Slow (0.5-2 m/s) | 60s | Speed from GPS |
| Stationary (< 0.5 m/s) | 120s | No movement for 2 min |
| Charging | 30s | Battery charging status |

## Additional Optimizations

- **Batch HTTP requests:** 5-10 GPS points per request (not individual).
- **Efficient location provider:** Fused Location (Android) / CLLocationManager (iOS).
- **Reduced accuracy when stationary:** Switch to `BALANCED_POWER_ACCURACY` when not moving.
- **Deferred updates (iOS):** Batch location updates when moving.
- **Wake lock management:** Partial wake lock only during active tracking.
- **Network-efficient sync:** Compress payloads, minimize headers.
- **Show battery percentage in app:** Transparency with users about battery usage.

## Target: < 5% battery drain per hour of tracking
