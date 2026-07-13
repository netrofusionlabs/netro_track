# Security Overview

> **Purpose:** Comprehensive security strategy.
> **Dependencies:** [Authentication Architecture](../architecture/authentication-authorization.md)

---

## Security Layers

| Layer | Protection |
|-------|-----------|
| **Transport** | HTTPS/TLS 1.3 only, HSTS headers |
| **Authentication** | JWT with short-lived access tokens (15 min) |
| **Authorization** | RBAC (4 roles) + tenant isolation |
| **Data** | Argon2 hashing (passwords, MPINs), encrypted MMKV storage |
| **API** | Rate limiting, request validation (Zod), Helmet.js headers |
| **Storage** | Signed URLs with 15 min expiry for R2 |
| **Device** | Device binding — 1 user = 1 registered device |
| **Session** | Refresh token rotation, remote session invalidation |

---

## Credential Security

| Credential | Algorithm | Parameters |
|-----------|-----------|-----------|
| Password | Argon2id | memoryCost: 65536, timeCost: 3, parallelism: 4 |
| MPIN | Argon2id | Same as password |
| Refresh Token | SHA-256 hash | Stored hashed, never plain text |

---

## MPIN Lockout

- 5 failed attempts → 30-minute lockout.
- Counter stored in Redis (`mpin:fails:{userId}`).
- Counter reset on successful login.
- Admin can reset lockout manually.

---

## Device Binding

- First login registers device (device ID, model, OS, app version).
- Subsequent logins must match registered device.
- Admin can reset device binding to allow re-registration.
- Only 1 active device per user (configurable per company).

---

## API Security

| Protection | Implementation |
|-----------|---------------|
| Input validation | Zod schemas on all endpoints |
| SQL injection | Prisma parameterized queries |
| XSS | Helmet.js headers, no user HTML rendering |
| CSRF | Token-based auth (no cookies for API) |
| Rate limiting | Redis-backed per-IP and per-user limits |
| CORS | Configured for mobile app and future web portal |
| Request size | Body limit: 10MB (for image metadata) |

---

## Data Privacy

- Company data isolated by `company_id` on every query.
- GPS data visible only to authorized managers/admins.
- Images accessible only via signed URLs (no public URLs for sensitive data).
- Audit logs track all sensitive operations.
- Soft delete preserves data for compliance.

---

## Environment Variables

- All secrets stored in `.env` files (never committed).
- `.env.example` template committed with placeholder values.
- Production secrets managed via EC2 environment or secrets manager.
