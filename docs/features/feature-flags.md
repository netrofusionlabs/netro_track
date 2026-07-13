# Feature Flags

> **Purpose:** Define feature flag strategy for gradual rollout.
> **Dependencies:** [Feature Specifications](feature-specifications.md)

---

## Strategy

Feature flags are stored in the `company_settings` table, allowing per-company feature configuration.

## V1 Feature Flags

| Flag | Type | Default | Description |
|------|------|:-------:|-------------|
| `attendance_enabled` | boolean | true | Enable attendance module |
| `gps_tracking_enabled` | boolean | true | Enable GPS tracking |
| `visits_enabled` | boolean | true | Enable customer visits |
| `sales_enabled` | boolean | true | Enable product sales |
| `inspections_enabled` | boolean | true | Enable inspections |
| `require_selfie_for_visits` | boolean | false | Selfie mandatory for visits |
| `require_photos_for_inspections` | boolean | false | Photos mandatory |
| `mpin_enabled` | boolean | true | Allow MPIN login |
| `biometric_enabled` | boolean | true | Allow biometric login |
| `auto_punch_out_enabled` | boolean | true | Auto-close attendance at midnight |

## Implementation

- Flags fetched on login and cached in MMKV.
- Refreshed on app foreground and every 10 minutes.
- UI conditionally renders features based on flags.
- API enforces flags server-side (double check).
