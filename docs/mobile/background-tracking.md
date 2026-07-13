# Background Tracking (Mobile)

> **Purpose:** Mobile-specific background GPS implementation.
> **Dependencies:** [GPS Tracking Architecture](../architecture/gps-tracking-architecture.md)

---

## Implementation

See [GPS Tracking Architecture](../architecture/gps-tracking-architecture.md) for the complete tracking design.

### Android
- **Foreground Service** with persistent notification ("NetroTrack is tracking your location").
- **Google Fused Location Provider** for battery-efficient location.
- Request `ACCESS_BACKGROUND_LOCATION` permission.
- Exclude from Doze mode battery optimization.

### iOS
- **Background Location Updates** mode in Capabilities.
- **CLLocationManager** with `allowsBackgroundLocationUpdates = true`.
- Request "Always Allow" location permission.
- Use deferred location updates to reduce battery consumption.

### Adaptive Intervals
- Moving (speed > 2 m/s): 30-second capture.
- Stationary (speed < 0.5 m/s for 2 min): 120-second capture.
- Charging: always 30-second capture.

### Buffer & Sync
- Buffer 5-10 GPS points in MMKV.
- HTTP batch POST every 2.5-5 minutes.
- Offline: queue in MMKV until connectivity returns.
