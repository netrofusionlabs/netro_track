# Authentication & Authorization Architecture

> **Purpose:** Define the complete authentication and authorization strategy.
> **Scope:** JWT lifecycle, MPIN, biometric, device registration, RBAC.
> **Dependencies:** [Multi-Tenancy](multi-tenancy.md), [User Roles](../product/user-roles.md)

---

## 1. Authentication Flows

### 1.1 First-Time Login

```
Login ID (COMPANY-EMPLOYEE) or Email ID + Password
        │
        ▼
    Validate credentials (Argon2 hash comparison)
        │
        ▼
    Register device (fingerprint + FCM token)
        │
        ▼
    Prompt: Create MPIN (4-6 digits)
        │
        ▼
    Hash MPIN (Argon2) → store in DB
        │
        ▼
    Prompt: Enable biometrics (optional)
        │
        ▼
    Issue JWT access token (15 min) + refresh token (7 days)
        │
        ▼
    Dashboard
```

### 1.2 Daily Login (MPIN)

```
MPIN Entry (4-6 digits)
        │
        ▼
    Validate MPIN hash (Argon2 verify)
        │
        ├── Failed → Increment fail counter (Redis)
        │              ├── < 5 attempts → "Incorrect MPIN"
        │              └── ≥ 5 attempts → Lock 30 min
        │
        └── Success → Reset fail counter
                │
                ▼
            Verify device fingerprint
                │
                ├── Mismatch → "Device not registered" → full re-auth
                │
                └── Match → Issue JWT tokens
                        │
                        ▼
                    Dashboard
```

### 1.3 Biometric Login

```
Biometric prompt (Touch ID / Face ID)
        │
        ▼
    OS verifies biometric → returns stored credential
        │
        ▼
    Validate → Issue JWT tokens → Dashboard
```

#### Quick Demo Test Accounts (Login Screen Shortcuts)

| Role | Employee / Login ID | Password | Scope |
|------|---------------------|----------|-------|
| `MASTER_SUPER_ADMIN` | `NETRO-MASTER` | `Password123!` | System Owner (Global) |

---

## 2. JWT Token Strategy

### Token Types

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access Token | 15 minutes | Memory (Zustand) | API authentication |
| Refresh Token | 7 days | MMKV (encrypted) | Obtain new access token |

### Access Token Payload

```json
{
  "sub": "user-uuid",
  "companyId": "company-uuid",
  "role": "CLIENT_USER",
  "deviceId": "device-fingerprint",
  "iat": 1700000000,
  "exp": 1700000900
}
```

### Refresh Token Strategy

```
Access token expires (15 min)
        │
        ▼
    Axios interceptor catches 401
        │
        ▼
    Send refresh token to /api/v1/auth/refresh
        │
        ▼
    Server validates refresh token
        │
        ├── Valid → Issue new access token + new refresh token
        │            (old refresh token is revoked — single-use)
        │
        └── Invalid/Expired → Logout user → MPIN screen
```

### Token Refresh Queue

When multiple API calls fail simultaneously with 401:

```
Request A → 401
Request B → 401        ← Queue these
Request C → 401
        │
        ▼
    Only ONE refresh request sent
        │
        ▼
    New tokens received
        │
        ▼
    Retry all queued requests with new token
```

---

## 3. MPIN Security

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Length | 4–6 digits | Balance security and usability |
| Hashing | Argon2id | Memory-hard, brute-force resistant |
| Max attempts | 5 consecutive failures | Prevent brute force |
| Lockout duration | 30 minutes | Auto-unlock, no admin intervention |
| Lockout counter | Redis (per user) | Survives server restart |
| Storage | Server-side hash only | Never stored on device |
| Reset | By employee (with password) or by admin | Two reset paths |

---

## 4. Device Registration

### Device Fingerprint Components

```typescript
interface DeviceFingerprint {
  deviceId: string;        // Unique device identifier
  platform: 'ios' | 'android';
  model: string;           // e.g., "iPhone 14 Pro"
  osVersion: string;       // e.g., "17.1"
  appVersion: string;      // e.g., "1.0.0"
}
```

### Single Device Policy

| Rule | Behavior |
|------|----------|
| Default | One registered device per user |
| New device login | Requires full credentials (Employee ID + Password) |
| Previous device | All tokens revoked, device deregistered |
| Admin action | Can remotely revoke device registration |
| Future | Configurable per company (allow multiple devices) |

---

## 5. Authorization (RBAC)

### Role Hierarchy

```typescript
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CLIENT_ADMIN = 'CLIENT_ADMIN',
  CLIENT_MANAGER = 'CLIENT_MANAGER',
  CLIENT_USER = 'CLIENT_USER',
}
```

### Middleware Chain

```
Request
    │
    ▼
authMiddleware          → Verify JWT, extract user
    │
    ▼
tenantMiddleware        → Inject companyId from JWT
    │
    ▼
roleMiddleware(roles)   → Check user role against allowed roles
    │
    ▼
Controller
```

### Route Protection Pattern

```typescript
// Employees can punch in
router.post('/attendance/punch-in',
  authMiddleware,
  attendanceController.punchIn
);

// Managers, HR, Company Admins and Super Admins can view team attendance
router.get('/attendance/team',
  authMiddleware,
  requireRoles(Role.MANAGER, Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN),
  attendanceController.getTeam
);

// HR, Company Admin and Super Admin can create users (Rank 2+ authority)
router.post('/user-management',
  authMiddleware,
  requireRoles(Role.MANAGER, Role.HR, Role.COMPANY_ADMIN, Role.SUPER_ADMIN),
  validate(createUserSchema),
  userManagementController.createUser
);

// Super Admin only
router.post('/companies',
  authMiddleware,
  requireRoles(Role.SUPER_ADMIN),
  companyController.create
);
```

### Data-Level Authorization

Beyond role checks, data access must be further restricted:

```typescript
// Manager can only see their assigned employees
async getTeamAttendance(managerId: string, companyId: string) {
  const assignedEmployees = await this.getManagerEmployees(managerId, companyId);
  
  return this.attendanceRepo.findByEmployees(
    companyId,
    assignedEmployees.map(e => e.id)
  );
}
```

---

## 6. Session Management

| Scenario | Behavior |
|----------|----------|
| Normal activity | Access token refreshed transparently |
| App backgrounded | Tokens persist; refresh on return |
| App killed | Tokens persist in MMKV; validate on launch |
| 7 days inactive | Refresh token expires → MPIN required |
| Password changed by admin | All tokens revoked → full re-auth |
| Account suspended | Next API call returns 403 → logout |
| Company suspended | Next API call returns 403 → logout |

---

## 7. Password Security

| Parameter | Value |
|-----------|-------|
| Hashing algorithm | Argon2id |
| Minimum length | 8 characters |
| Complexity | At least one uppercase, one lowercase, one number |
| Reset method | Admin-initiated only (employee cannot self-reset) |
| History | Cannot reuse last 3 passwords (future) |

---

## 8. Security Headers

```typescript
// Applied via Helmet.js
{
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}
```

---

## Future Considerations

- **OAuth2 / SSO:** Enterprise SSO integration (SAML, OpenID Connect).
- **Multi-device support:** Configurable per company.
- **API keys:** For machine-to-machine integrations.
- **Two-factor authentication:** TOTP-based 2FA for admin roles.
- **Password policy per company:** Configurable complexity and expiry.
- **Session activity logging:** Record all login/logout events with device info.

---

## Best Practices

- Never log tokens, passwords, or MPINs.
- Always validate tokens server-side — never trust client claims.
- Use short-lived access tokens with transparent refresh.
- Implement token revocation for security-critical events.
- Test authentication flows with expired, invalid, and stolen tokens.
- Rate limit all authentication endpoints aggressively.
