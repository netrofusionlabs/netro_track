# Project Execution Plan

> **Purpose:** Outline the high-level phases to build NetroTrack V1.

---

## Phase 1: Foundation (Weeks 1-2)

**Backend:**
- Project setup (monorepo, ESLint, Prettier).
- Database schema and Prisma setup.
- CI/CD pipeline for backend.
- Core middleware (Auth, Tenant, Validation, Error Handling).
- Authentication module (Login, JWT, Device Registration).

**Mobile:**
- React Native CLI initialization.
- Design system and theme engine implementation.
- Navigation setup (Root, Auth, Tabs).
- Auth screens and logic (Login, MPIN setup).

## Phase 2: Core Data & Structure (Weeks 3-4)

**Backend:**
- Company & Employee CRUD.
- RBAC enforcement.
- Customer & Product CRUD.

**Mobile:**
- Role-based tab navigators.
- Shared components (Lists, Cards, Pickers).
- Dashboard UI skeletons.
- State management setup (Zustand + TanStack Query).

## Phase 3: Field Operations (Weeks 5-6)

**Backend:**
- Attendance module (Punch in/out).
- Customer Visits module.
- Product Sales module.
- Image upload flow (R2 Signed URLs).

**Mobile:**
- Offline queue architecture (MMKV).
- Sync engine implementation.
- Camera and Image picker integration.
- Visit and Sale forms.

## Phase 4: GPS Tracking & Live (Weeks 7-8)

**Backend:**
- GPS batch sync endpoint.
- Socket.IO setup and Redis adapter.
- Live tracking rooms.

**Mobile:**
- Background location service (Android + iOS).
- GPS buffer and batch sync.
- MapView integration.
- Route playback UI.

## Phase 5: Polish & Admin (Weeks 9-10)

**Backend:**
- Report generation endpoints.
- Dashboard aggregations.
- Push notification (FCM) integration.

**Mobile:**
- Dashboards populated with real data.
- Push notification handling.
- E2E testing of critical paths.
- Performance profiling (launch time, battery drain).

## Phase 6: Launch (Weeks 11-12)

- Staging deployment and QA.
- iOS App Store review submission.
- Google Play Store submission.
- Production infrastructure scaling (ALB, Redis).
- Go-live.
