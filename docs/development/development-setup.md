# Development Setup

> **Purpose:** Local development environment setup guide.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20 LTS | Runtime |
| npm | 10+ | Package manager |
| Git | Latest | Version control |
| Ruby | 3.0+ | iOS CocoaPods |
| CocoaPods | Latest | iOS dependencies |
| Xcode | 15+ | iOS development |
| Android Studio | Latest | Android development |
| Java JDK | 17 | Android build |
| Redis | 7+ | Local caching/queues |
| VS Code | Latest | IDE |

## Quick Start

```bash
# 1. Clone repository
git clone <repo-url> && cd NetroTrack

# 2. Install dependencies (all workspaces)
npm install

# 3. Configure environment
cp apps/backend/.env.example apps/backend/.env
# Edit .env with your Neon, Redis, R2, Firebase credentials

# 4. Run database migrations
cd apps/backend && npx prisma migrate dev

# 5. Generate Prisma client
npx prisma generate

# 6. Seed database
npx prisma db seed

# 7. Start backend
npm run dev --workspace=apps/backend

# 8. Start mobile (in another terminal)
# Android
npm run android --workspace=apps/mobile
# iOS
cd apps/mobile/ios && pod install && cd ..
npm run ios --workspace=apps/mobile
```

## Monorepo Structure

```
NetroTrack/
├── apps/
│   ├── backend/      # Node.js API server
│   └── mobile/       # React Native app
├── packages/
│   └── shared/       # Shared types, schemas, constants
├── docs/             # Documentation
├── package.json      # Root package.json (npm workspaces)
└── tsconfig.base.json # Shared TS config
```
