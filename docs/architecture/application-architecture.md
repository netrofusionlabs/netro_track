# Application Architecture

> **Purpose:** Define the layered application architecture, module boundaries, and dependency rules.
> **Scope:** Backend and mobile application structure, separation of concerns, design patterns.
> **Dependencies:** [System Architecture](system-architecture.md)

---

## 1. Architecture Pattern

NetroTrack follows a **Feature-First Layered Architecture** — features are organized vertically (by domain), and each feature follows horizontal layers internally.

```
┌─────────────────────────────────────────────────┐
│                Presentation Layer                │
│        (Screens, Components, Navigation)         │
├─────────────────────────────────────────────────┤
│                 Business Layer                   │
│        (Hooks, ViewModels, Orchestration)         │
├─────────────────────────────────────────────────┤
│                  Service Layer                   │
│          (API calls, Business Logic)             │
├─────────────────────────────────────────────────┤
│                Repository Layer                  │
│        (Data Access, ORM, Local Storage)          │
├─────────────────────────────────────────────────┤
│                   Data Layer                     │
│          (PostgreSQL, Redis, MMKV)               │
└─────────────────────────────────────────────────┘
```

---

## 2. Backend Architecture

### Layer Responsibilities

| Layer | Responsibility | What Lives Here |
|-------|---------------|----------------|
| **Controller** | HTTP handling, request/response | Route handlers, parameter extraction |
| **Middleware** | Cross-cutting concerns | Auth, tenant, validation, logging, error handling |
| **Service** | Business logic | Orchestration, business rules, calculations |
| **Repository** | Data access | Prisma queries, database operations |
| **Model** | Data definitions | Prisma schema, TypeScript types |

### Dependency Flow (Backend)

```
Controller → Service → Repository → Database
                ↓
            Middleware (interceptors)
                ↓
            Shared (utils, types, constants)
```

**Rules:**
- Controllers MUST NOT contain business logic.
- Controllers MUST NOT access Prisma directly.
- Services MUST NOT know about HTTP (no `req`/`res` objects).
- Repositories MUST NOT contain business logic.
- Repositories are the ONLY layer that touches Prisma.

### Backend Module Structure

```
apps/backend/src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts       # Route handlers
│   │   ├── auth.service.ts          # Business logic
│   │   ├── auth.repository.ts       # Database queries
│   │   ├── auth.validator.ts        # Zod schemas
│   │   ├── auth.routes.ts           # Route definitions
│   │   └── auth.types.ts            # TypeScript types
│   │
│   ├── attendance/
│   │   ├── attendance.controller.ts
│   │   ├── attendance.service.ts
│   │   ├── attendance.repository.ts
│   │   ├── attendance.validator.ts
│   │   ├── attendance.routes.ts
│   │   └── attendance.types.ts
│   │
│   ├── tracking/
│   ├── visits/
│   ├── sales/
│   ├── inspections/
│   ├── reports/
│   ├── notifications/
│   ├── companies/
│   ├── employees/
│   └── uploads/
│
├── middleware/
│   ├── auth.middleware.ts            # JWT verification
│   ├── tenant.middleware.ts          # companyId injection
│   ├── role.middleware.ts            # RBAC enforcement
│   ├── validate.middleware.ts        # Zod request validation
│   ├── rateLimiter.middleware.ts     # Rate limiting
│   └── errorHandler.middleware.ts    # Global error handler
│
├── shared/
│   ├── errors/                       # Custom error classes
│   ├── utils/                        # Utility functions
│   ├── types/                        # Shared types
│   ├── constants/                    # Application constants
│   └── config/                       # Configuration
│
├── jobs/                             # BullMQ job definitions
├── socket/                           # Socket.IO event handlers
├── prisma/                           # Prisma schema and migrations
├── app.ts                            # Express app configuration
└── server.ts                         # Server entry point
```

---

## 3. Mobile Architecture

### Layer Responsibilities

| Layer | Responsibility | What Lives Here |
|-------|---------------|----------------|
| **Screen** | UI rendering, user interaction | Screen components, layout |
| **Component** | Reusable UI elements | Buttons, cards, inputs, modals |
| **Hook** | Business logic, state orchestration | Data fetching, state management |
| **Service** | API communication | Axios calls, request/response mapping |
| **Store** | Client state | Zustand stores, persisted state |
| **Type** | Data definitions | TypeScript interfaces, DTOs |

### Dependency Flow (Mobile)

```
Screen → Hooks → Services → API
            ↓
         Stores (Zustand)
            ↓
      TanStack Query (server state cache)
            ↓
         MMKV (local persistence)
```

**Rules:**
- Screens MUST NOT contain business logic — delegate to hooks.
- Screens MUST NOT make API calls directly — use hooks with TanStack Query.
- Components MUST be pure/presentational where possible.
- Stores (Zustand) are for CLIENT state only (theme, user session, offline queue).
- TanStack Query manages SERVER state (API data, caching, refetching).
- MMKV is for offline queue, secure storage, and persistent preferences.

### Mobile Module Structure

```
apps/mobile/src/
├── features/
│   ├── auth/
│   │   ├── screens/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── MpinScreen.tsx
│   │   │   ├── MpinSetupScreen.tsx
│   │   │   └── BiometricScreen.tsx
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── MpinKeypad.tsx
│   │   ├── hooks/
│   │   │   ├── useLogin.ts
│   │   │   └── useMpin.ts
│   │   ├── services/
│   │   │   └── auth.service.ts
│   │   ├── stores/
│   │   │   └── authStore.ts
│   │   └── types.ts
│   │
│   ├── attendance/
│   ├── tracking/
│   ├── visits/
│   ├── sales/
│   ├── inspections/
│   ├── reports/
│   ├── dashboard/
│   ├── profile/
│   └── notifications/
│
├── shared/
│   ├── components/                   # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── BottomSheet.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useTheme.ts
│   │   ├── useNetwork.ts
│   │   └── useLocation.ts
│   ├── theme/
│   │   ├── ThemeProvider.tsx
│   │   ├── tokens.ts
│   │   ├── lightTheme.ts
│   │   └── darkTheme.ts
│   ├── utils/
│   │   ├── dateUtils.ts
│   │   ├── formatters.ts
│   │   └── validators.ts
│   ├── services/
│   │   ├── api.ts                   # Axios instance
│   │   ├── storage.ts               # MMKV wrapper
│   │   └── sync.ts                  # Offline sync engine
│   └── types/
│       ├── api.types.ts
│       └── navigation.types.ts
│
├── navigation/
│   ├── RootNavigator.tsx
│   ├── AuthNavigator.tsx
│   ├── UserTabNavigator.tsx
│   ├── ManagerTabNavigator.tsx
│   ├── AdminTabNavigator.tsx
│   └── SuperAdminTabNavigator.tsx
│
└── App.tsx
```

---

## 4. Module Isolation

Each feature module is self-contained:

```
feature/
├── screens/        # What the user sees
├── components/     # Feature-specific UI pieces
├── hooks/          # Feature-specific logic
├── services/       # Feature-specific API calls
├── stores/         # Feature-specific state (if needed)
└── types.ts        # Feature-specific types
```

### Cross-Feature Communication

Features MUST NOT import directly from each other. When cross-feature communication is needed:

| Scenario | Pattern |
|----------|---------|
| Shared data types | Use `packages/shared` |
| Shared UI components | Use `shared/components` |
| Feature A needs data from Feature B | Use TanStack Query cache (read from shared query key) |
| Backend: Feature A triggers Feature B | Use event emitter or BullMQ job |
| State shared across features | Use a shared Zustand store in `shared/stores` |

---

## 5. Shared Package

The monorepo includes a shared package for code used by both mobile and backend:

```
packages/shared/
├── src/
│   ├── schemas/                      # Zod schemas (validation)
│   │   ├── auth.schema.ts
│   │   ├── attendance.schema.ts
│   │   ├── visit.schema.ts
│   │   └── ...
│   ├── types/                        # Shared TypeScript types
│   │   ├── user.types.ts
│   │   ├── attendance.types.ts
│   │   └── ...
│   ├── constants/                    # Shared constants
│   │   ├── roles.ts
│   │   ├── errorCodes.ts
│   │   └── ...
│   └── utils/                        # Shared utilities
│       ├── dateUtils.ts
│       └── formatters.ts
├── package.json
└── tsconfig.json
```

---

## 6. Design Principles Applied

| Principle | Application |
|-----------|------------|
| **SOLID** | Each module has single responsibility; layers depend on abstractions |
| **DRY** | Shared schemas, types, and components across mobile and backend |
| **KISS** | Simple, readable code over clever abstractions |
| **YAGNI** | Build only what's needed now; architecture supports future extension |
| **Feature-First** | Features are vertical slices, not horizontal layers |
| **Single Responsibility** | Each file has one purpose |
| **Dependency Injection** | Services receive dependencies, not create them (where practical) |
| **Clean Architecture** | Business logic is independent of frameworks and databases |

---

## Future Considerations

- **Microservices:** If the monolith outgrows a single EC2 instance, extract heavy features (GPS tracking, reports) into independent services.
- **API Gateway:** Centralized gateway when multiple services exist.
- **Event Sourcing:** For audit-heavy features, consider event sourcing for complete history.
- **Plugin Architecture:** For white-label and custom modules, consider a plugin system.

---

## Best Practices

- Follow the dependency flow — never skip layers.
- Keep each layer testable in isolation.
- Use dependency injection for services to enable mocking in tests.
- Review module boundaries during sprint planning.
- Document all architectural decisions using ADR (Architecture Decision Records) format.
