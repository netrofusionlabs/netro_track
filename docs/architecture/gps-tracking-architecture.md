# GPS Tracking Architecture

> **Purpose:** Define the background GPS tracking system — the most critical feature of NetroTrack.
> **Scope:** Background tracking, batch sync, data pipeline, battery optimization, platform specifics.
> **Dependencies:** [Offline Architecture](offline-architecture.md), [Realtime Architecture](realtime-architecture.md)

---

## 1. Tracking Lifecycle

```
Employee taps "Punch In"
        │
        ▼
    Start background GPS service
        │
        ├── Capture location every 30 seconds
        ├── Buffer 5-10 points locally (MMKV)
        ├── Batch sync every 2.5-5 minutes via HTTP
        ├── Continue when screen locked
        ├── Continue when app is backgrounded
        └── Continue when user switches apps
        │
Employee taps "Punch Out"
        │
        ▼
    Stop background GPS service
    Flush remaining buffer
    Final sync
```

---

## 2. GPS Data Point

Each capture records:

```typescript
interface GpsPoint {
  id: string;               // Local UUID (idempotency key)
  userId: string;
  companyId: string;
  attendanceId: string;     // Links to current attendance session
  latitude: number;         // Decimal degrees
  longitude: number;        // Decimal degrees
  accuracy: number;         // Meters
  speed: number;            // m/s (0 if stationary)
  heading: number;          // Degrees from north (0-360)
  altitude: number;         // Meters above sea level
  timestamp: string;        // ISO 8601 UTC
  batteryLevel: number;     // 0-100 percentage
  batteryCharging: boolean;
  networkType: string;      // 'wifi' | 'cellular' | 'none'
  gpsProvider: string;      // 'gps' | 'network' | 'fused'
  isAccurate: boolean;      // accuracy <= 100m
}
```

---

## 3. Batch Sync Strategy

### Why Batch?

| Approach | Requests/Hour | Battery Impact | Reliability |
|----------|:------------:|:--------------:|:-----------:|
| Send each point (every 30s) | 120 | 🔴 High | Medium |
| **Batch 5-10 points (every 2.5-5 min)** | 12-24 | 🟢 Low | High |

### Batch Upload

```typescript
// Client-side buffer management
class GpsBuffer {
  private buffer: GpsPoint[] = [];
  private readonly MAX_BUFFER_SIZE = 10;
  private readonly FLUSH_INTERVAL_MS = 150_000; // 2.5 minutes
  
  addPoint(point: GpsPoint) {
    this.buffer.push(point);
    
    if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
      this.flush();
    }
  }
  
  async flush() {
    if (this.buffer.length === 0) return;
    
    const points = [...this.buffer];
    this.buffer = [];
    
    try {
      await api.post('/api/v1/tracking/batch', { points });
    } catch (error) {
      // Network error: move to offline queue
      syncQueue.add({
        type: 'GPS_BATCH',
        payload: { points },
        priority: 2,
      });
    }
  }
}
```

### API Endpoint

```
POST /api/v1/tracking/batch
Content-Type: application/json

{
  "points": [
    { "id": "uuid-1", "latitude": 17.385, "longitude": 78.486, ... },
    { "id": "uuid-2", "latitude": 17.386, "longitude": 78.487, ... },
    ...
  ]
}
```

---

## 4. Server-Side Processing

```
Batch received (5-10 points)
        │
        ▼
    Validate with Zod schema
        │
        ▼
    Deduplicate by local UUID
        │
        ▼
    Bulk insert into PostgreSQL
        │
        ▼
    Update Redis cache (latest position per employee)
        │
        ▼
    Emit latest point via Socket.IO to manager's room
        │
        ▼
    Return success with count of inserted points
```

### Bulk Insert

```typescript
// Repository: efficient batch insert
async insertBatch(companyId: string, points: GpsPoint[]) {
  return prisma.gpsTrack.createMany({
    data: points.map(p => ({
      id: p.id,
      companyId,
      userId: p.userId,
      attendanceId: p.attendanceId,
      latitude: p.latitude,
      longitude: p.longitude,
      accuracy: p.accuracy,
      speed: p.speed,
      heading: p.heading,
      altitude: p.altitude,
      batteryLevel: p.batteryLevel,
      batteryCharging: p.batteryCharging,
      networkType: p.networkType,
      gpsProvider: p.gpsProvider,
      isAccurate: p.isAccurate,
      capturedAt: new Date(p.timestamp),
    })),
    skipDuplicates: true, // Idempotent: skip if UUID already exists
  });
}
```

---

## 5. Platform-Specific Implementation

### Android

| Component | Technology |
|-----------|-----------|
| Background Service | Foreground Service with persistent notification |
| Location Provider | Google Fused Location Provider |
| Wake Lock | Partial wake lock during tracking |
| Battery Optimization | Exclude from Doze mode (request user permission) |

```
Android Requirements:
• ACCESS_FINE_LOCATION
• ACCESS_COARSE_LOCATION
• ACCESS_BACKGROUND_LOCATION (Android 10+)
• FOREGROUND_SERVICE
• FOREGROUND_SERVICE_LOCATION (Android 14+)
• POST_NOTIFICATIONS (Android 13+)
```

### iOS

| Component | Technology |
|-----------|-----------|
| Background Mode | Location Updates background mode |
| Location Provider | CLLocationManager (significant change + continuous) |
| Battery | Deferred location updates when possible |
| Permissions | "Always Allow" location permission required |

```
iOS Requirements:
• NSLocationWhenInUseUsageDescription
• NSLocationAlwaysUsageDescription
• NSLocationAlwaysAndWhenInUseUsageDescription
• UIBackgroundModes: location
```

---

## 6. Adaptive Tracking

To optimize battery, use adaptive intervals:

| State | Detection | Capture Interval | Rationale |
|-------|-----------|:-----------------:|-----------|
| Moving (speed > 2 m/s) | Speed from GPS | 30 seconds | Full resolution |
| Slow (speed 0.5-2 m/s) | Speed from GPS | 60 seconds | Reduced frequency |
| Stationary (speed < 0.5 m/s) | Speed + no movement for 2 min | 120 seconds | Minimal battery |
| Charging | Battery status | 30 seconds | Battery not a concern |

---

## 7. Distance Calculation

Calculate distance traveled from GPS points:

```typescript
// Haversine formula for distance between two GPS points
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Total distance: sum of sequential point-to-point distances
// Filter out inaccurate points (accuracy > 100m) before calculation
```

---

## 8. Data Volume Projections

| Scale | Employees | Points/Day/Employee | Points/Day Total | Storage/Day |
|-------|:---------:|:-------------------:|:----------------:|:-----------:|
| V1 Launch | 10,000 | ~960 (8hr × 120/hr) | ~9.6M | ~2.3 GB |
| V1 Full | 10,000 | ~960 | ~9.6M | ~2.3 GB |
| Future | 500,000 | ~960 | ~480M | ~115 GB |

### Mitigation Strategies

| Strategy | Impact |
|----------|--------|
| Table partitioning by date (monthly) | Query performance at scale |
| Indexes on (company_id, user_id, captured_at) | Fast lookups |
| Data retention: 90 days hot, 1 year aggregated | Storage cost control |
| Batch inserts | Reduced write overhead |
| Connection pooling | Handle high write concurrency |

---

## 9. Route Playback

Managers can view an employee's route on a map:

```
GET /api/v1/tracking/route?userId={id}&date={YYYY-MM-DD}

Response:
{
  "data": {
    "points": [
      { "lat": 17.385, "lng": 78.486, "timestamp": "...", "speed": 5.2 },
      ...
    ],
    "totalDistance": 45200,  // meters
    "duration": 28800,       // seconds
    "startTime": "...",
    "endTime": "..."
  }
}
```

Rendered as a polyline on the map with color-coded speed indicators.

---

## Future Considerations

- **Geofencing:** Alerts when employees enter/exit predefined areas.
- **Route optimization:** Suggest optimal visit order based on GPS data.
- **Anomaly detection:** Flag suspicious GPS patterns (teleportation, stationary for too long).
- **Heatmaps:** Visualize high-activity areas.
- **Time-series database:** Consider TimescaleDB for GPS data at massive scale.
- **Map matching:** Snap GPS points to roads for cleaner routes.

---

## Best Practices

- Buffer GPS points locally — never send individual points.
- Use adaptive intervals to balance accuracy and battery life.
- Filter inaccurate points (accuracy > 100m) before distance calculation.
- Always include local UUIDs for idempotent sync.
- Request "Always Allow" location permission with clear user explanation.
- Show a persistent notification during tracking (required for Android foreground service).
- Test tracking on low-end Android devices — they're the primary target.
