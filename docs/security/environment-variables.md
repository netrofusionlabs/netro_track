# Environment Variables

> **Purpose:** Complete environment variable reference.
> **Dependencies:** [Security Overview](security-overview.md)

---

## Backend (.env)

```bash
# ───── Server ─────
NODE_ENV=development              # development | staging | production
PORT=3000                          # Server port
LOG_LEVEL=info                     # debug | info | warn | error

# ───── Database ─────
DATABASE_URL=postgresql://...      # Neon pooled connection string
DIRECT_DATABASE_URL=postgresql://...  # Neon direct connection (migrations)

# ───── Redis ─────
REDIS_URL=redis://localhost:6379   # Redis connection string

# ───── JWT ─────
JWT_ACCESS_SECRET=<64+ char random string>
JWT_REFRESH_SECRET=<64+ char random string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ───── Cloudflare R2 ─────
R2_ACCOUNT_ID=<cloudflare account id>
R2_ACCESS_KEY_ID=<r2 access key>
R2_SECRET_ACCESS_KEY=<r2 secret key>
R2_BUCKET_NAME=netrotrack-bucket
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com

# ───── Firebase ─────
FIREBASE_PROJECT_ID=<firebase project id>
FIREBASE_SERVICE_ACCOUNT=<path to service account JSON>

# ───── Rate Limiting ─────
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5

# ───── App ─────
APP_NAME=NetroTrack
APP_URL=https://api.netrotrack.com
MIN_APP_VERSION_ANDROID=1.0.0
MIN_APP_VERSION_IOS=1.0.0
```

## Rules

- **Never** commit `.env` files to version control.
- **Always** update `.env.example` when adding new variables.
- **Use strong, unique secrets** for JWT keys (generate with `openssl rand -hex 64`).
- **Rotate secrets** every 6 months or after any suspected compromise.
