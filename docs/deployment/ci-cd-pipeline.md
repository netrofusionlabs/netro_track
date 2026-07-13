# CI/CD Pipeline

> **Purpose:** Define continuous integration and delivery workflows.
> **Dependencies:** [Deployment Overview](deployment-overview.md)

---

## CI Pipeline (GitHub Actions)

Triggers on every PR to `develop` or `main`.

### Backend CI
1. Install dependencies (`npm ci`).
2. Type check (`tsc --noEmit`).
3. Lint (`eslint`).
4. Run Unit Tests (`npm run test:unit`).
5. (Optional) Run Integration Tests (requires DB).

### Mobile CI
1. Install dependencies.
2. Type check.
3. Lint.
4. Run Component Tests.

---

## CD Pipeline (Backend)

Triggers on push to `main` (Production) and `develop` (Staging).

1. Build code (`npm run build`).
2. Run Prisma migrations (`npx prisma migrate deploy`).
3. SSH into EC2 instance.
4. Pull latest code.
5. Reload PM2 (`pm2 reload netrotrack-api`).

---

## CD Pipeline (Mobile)

Triggers on release tags (e.g., `v1.0.0`).

### Android
1. Set up Java and Android SDK.
2. Build Android App Bundle (.aab).
3. Upload to Google Play Console (Internal Testing Track) via Fastlane.

### iOS
1. Set up macOS runner.
2. Install dependencies (CocoaPods).
3. Build archive (.xcarchive).
4. Upload to TestFlight via Fastlane.

---

## Environment Strategy

| Environment | Branch | Database | API URL | Usage |
|-------------|--------|----------|---------|-------|
| **Development** | Feature branches | Neon (feature branch) | `localhost:3000` | Local dev |
| **Staging** | `develop` | Neon (staging branch) | `staging-api.netrotrack.com` | Internal testing, QA |
| **Production** | `main` | Neon (main branch) | `api.netrotrack.com` | Live users |
