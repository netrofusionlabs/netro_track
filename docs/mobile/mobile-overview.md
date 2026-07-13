# Mobile Overview

> **Purpose:** High-level mobile application architecture.
> **Dependencies:** [Application Architecture](../architecture/application-architecture.md)

---

## Technology Stack

| Concern | Technology |
|---------|-----------|
| Framework | React Native CLI (not Expo) |
| Language | TypeScript (strict) |
| Min Android | API 26 (Android 8.0) |
| Min iOS | iOS 14+ |
| Navigation | React Navigation v6+ |
| State (client) | Zustand |
| State (server) | TanStack Query v5+ |
| HTTP | Axios |
| Forms | React Hook Form |
| Validation | Zod |
| Animations | Reanimated v3+ |
| Maps | React Native Maps |
| Camera | Vision Camera v4+ |
| Storage | MMKV |
| Image Picker | React Native Image Picker |
| Push | Firebase Cloud Messaging |
| Location | @react-native-community/geolocation + background service |

---

## Architecture Principles

1. **Feature-first:** Each feature is a self-contained module.
2. **Screen → Hook → Service → API:** Separation of concerns.
3. **Zustand for client state:** Theme, auth session, offline queue.
4. **TanStack Query for server state:** Caching, refetching, background updates.
5. **MMKV for persistence:** Offline queues, cached data, secure storage.
6. **Offline-first:** Every field operation works without connectivity.

---

## App Entry Flow

```
App Launch → Splash Screen
    │
    ├── Check auth state (MMKV)
    │     ├── No tokens → Auth Navigator (Login)
    │     └── Tokens exist → Validate token
    │           ├── Invalid → Auth Navigator
    │           └── Valid → Load user profile
    │                 └── Route to role-based navigator
    │
    ├── User Role = CLIENT_USER → UserTabNavigator
    ├── User Role = CLIENT_MANAGER → ManagerTabNavigator
    ├── User Role = CLIENT_ADMIN → AdminTabNavigator
    └── User Role = SUPER_ADMIN → SuperAdminTabNavigator
```
