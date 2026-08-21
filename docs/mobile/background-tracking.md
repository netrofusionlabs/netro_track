# Background Tracking (Mobile)

> **Purpose:** Mobile-specific background GPS implementation and architecture details.
> **Dependencies:** [GPS Tracking Architecture](../architecture/gps-tracking-architecture.md)

---

## Architecture (Hybrid Native-JS Sync Bridge)

To address Android's aggressive Doze Mode battery throttling and the destruction of the React Native JS thread when an app is swiped away from the Recents menu, NetroTrack uses a hybrid native-bridge synchronization architecture:

```
    [App in Foreground]
    JS Event Loop (trackingService.ts) captures & uploads GPS points every 10 seconds.
           │
           ├── App minimized (AppState changes to background/inactive)
           ▼
    [App in Background / Doze Mode]
    1. JS calls setBackgroundMode(true) via Native Bridge.
    2. Native LocationForegroundService (Kotlin) begins writing hardware GPS fixes
       directly into SharedPreferences on-disk buffer (every 10s).
    3. Even if the JS process is killed/swiped from recents, the Foreground Service
       continues tracking due to android:stopWithTask="false" and START_STICKY.
           │
           ├── App resumed (AppState changes to active)
           ▼
    [App Returns to Foreground]
    1. JS calls setBackgroundMode(false) to stop native buffering.
    2. JS calls drainNativeBuffer() which copies all cached points from SharedPreferences
       into the MMKV offline queue and clears the SharedPreferences store.
    3. JS calls syncNow() to flush the merged points to the database.
```

---

## Platform Specifics

### Android

- **Native Foreground Service (`LocationForegroundService.kt`)**: Handles background tracking independently of the React Native JS thread.
- **Task/Process Persistence**: Registered with `android:stopWithTask="false"` and returns `START_STICKY` inside `onStartCommand` to prevent tracking interruption when the app is swiped away from the Recents panel.
- **SharedPreferences Buffer**: Serves as a lightweight on-disk persistent cache with a max-limit safety guard (e.g., 720 points / ~2 hours) to prevent storage abuse.
- **Notification Visibility (Android 13 to 15+)**:
  - Configured with `NotificationManager.IMPORTANCE_DEFAULT` so it stays visible in the notification shade.
  - Silenced using `setSound(null, null)` and `enableVibration(false)` to prevent user annoyance.
  - Dynamically requests the `POST_NOTIFICATIONS` runtime permission on Android 13+ (API 33+).
- **Required Manifest Permissions**:
  - `ACCESS_FINE_LOCATION` & `ACCESS_COARSE_LOCATION`
  - `ACCESS_BACKGROUND_LOCATION` (Android 10+ / API 29+)
  - `FOREGROUND_SERVICE` & `FOREGROUND_SERVICE_LOCATION` (Android 14+ / API 34+)
  - `POST_NOTIFICATIONS` (Android 13+ / API 33+)

### iOS

- **Background Location Updates** capability active.
- **CLLocationManager** configured with `allowsBackgroundLocationUpdates = true` and `pausesLocationUpdatesAutomatically = false`.
- Request "Always Allow" location permission at runtime.

---

## Capture & Sync Intervals

| State | capture interval | data source | sync frequency |
|---|:---:|---|---|
| **Foreground (Active)** | 10 seconds | `getCurrentLocation` (JS bridge) | Immediate (every 10s via JS loop) |
| **Background (Minimized)** | 10 seconds | `LocationForegroundService` (Kotlin) | Buffered to SharedPreferences; synced upon reopen |
| **Accidental Kill (Swiped)** | 10 seconds | `LocationForegroundService` (Kotlin) | Buffered to SharedPreferences; synced upon reopen |

---

## Verification & Recovery

- If the device is offline, points are saved locally in MMKV.
- During background/swipe periods, points are cached in SharedPreferences.
- Every foreground resume triggers a native-to-MMKV drain followed by a bulk network flush, ensuring **zero tracking gaps** and **zero duplicate points** (deduplication is enforced by tracking state boundaries).
