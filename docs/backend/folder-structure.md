# Backend Folder Structure

> **Purpose:** Define the complete directory layout for the backend application.
> **Dependencies:** [Backend Overview](backend-overview.md)

---

```
apps/backend/
├── src/
│   ├── modules/                          # Feature modules
│   │   ├── auth/
│   │   │   ├── auth.controller.ts        # Route handlers
│   │   │   ├── auth.service.ts           # Business logic
│   │   │   ├── auth.repository.ts        # Database queries
│   │   │   ├── auth.validator.ts         # Zod request schemas
│   │   │   ├── auth.routes.ts            # Express route definitions
│   │   │   └── auth.types.ts             # Module-specific types
│   │   │
│   │   ├── companies/
│   │   │   ├── companies.controller.ts
│   │   │   ├── companies.service.ts
│   │   │   ├── companies.repository.ts
│   │   │   ├── companies.validator.ts
│   │   │   ├── companies.routes.ts
│   │   │   └── companies.types.ts
│   │   │
│   │   ├── employees/                    # User/employee management
│   │   ├── attendance/                   # Punch in/out, working hours
│   │   ├── tracking/                     # GPS tracking, route playback
│   │   ├── visits/                       # Customer visits
│   │   ├── sales/                        # Product sales
│   │   ├── inspections/                  # Field inspections
│   │   ├── customers/                    # Customer management
│   │   ├── products/                     # Product catalog
│   │   ├── reports/                      # Report generation
│   │   ├── notifications/                # Push notifications
│   │   ├── uploads/                      # Image upload (signed URLs)
│   │   ├── dashboard/                    # Dashboard aggregations
│   │   └── settings/                     # Company settings
│   │
│   ├── middleware/                        # Express middleware
│   │   ├── auth.middleware.ts            # JWT verification
│   │   ├── tenant.middleware.ts          # Company ID injection
│   │   ├── role.middleware.ts            # RBAC enforcement
│   │   ├── validate.middleware.ts        # Zod validation
│   │   ├── rateLimiter.middleware.ts     # Rate limiting
│   │   ├── requestId.middleware.ts       # Request correlation ID
│   │   └── errorHandler.middleware.ts    # Global error handler
│   │
│   ├── socket/                           # Socket.IO
│   │   ├── socket.ts                     # Socket server setup
│   │   ├── socketAuth.ts                 # Socket authentication
│   │   ├── handlers/
│   │   │   ├── tracking.handler.ts       # Location update events
│   │   │   └── notification.handler.ts   # Notification events
│   │   └── rooms.ts                      # Room management
│   │
│   ├── jobs/                             # BullMQ background jobs
│   │   ├── index.ts                      # Worker startup
│   │   ├── queues.ts                     # Queue definitions
│   │   ├── gpsAggregation.job.ts         # GPS data aggregation
│   │   ├── reportGeneration.job.ts       # Report generation
│   │   ├── notificationDispatch.job.ts   # FCM notification sending
│   │   ├── dataRetention.job.ts          # Data cleanup/archival
│   │   └── imageCleanup.job.ts           # Orphaned image cleanup
│   │
│   ├── shared/                           # Shared utilities
│   │   ├── errors/
│   │   │   ├── AppError.ts              # Base error class
│   │   │   └── errorCodes.ts            # Error code constants
│   │   ├── utils/
│   │   │   ├── jwt.ts                   # Token generation/verification
│   │   │   ├── hash.ts                  # Argon2 hashing
│   │   │   ├── pagination.ts            # Pagination helpers
│   │   │   ├── response.ts              # Standardized response builders
│   │   │   └── dateUtils.ts             # Date/time utilities
│   │   ├── types/
│   │   │   ├── express.d.ts             # Express type extensions
│   │   │   └── common.types.ts          # Shared types
│   │   ├── constants/
│   │   │   ├── roles.ts                 # User role constants
│   │   │   └── limits.ts                # System limits
│   │   └── config/
│   │       ├── env.ts                   # Environment variable loader
│   │       ├── redis.ts                 # Redis client configuration
│   │       ├── prisma.ts                # Prisma client singleton
│   │       └── r2.ts                    # Cloudflare R2 S3 client
│   │
│   ├── prisma/
│   │   ├── schema.prisma                # Database schema
│   │   ├── migrations/                   # Migration files
│   │   └── seed.ts                      # Seed data script
│   │
│   ├── app.ts                           # Express app configuration
│   └── server.ts                        # Server entry point
│
├── tests/                               # Test files
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── .env.example                         # Environment variable template
├── .eslintrc.js                         # ESLint configuration
├── .prettierrc                          # Prettier configuration
├── tsconfig.json                        # TypeScript configuration
├── package.json
└── nodemon.json                         # Development server config
```

---

## Convention Rules

- One module per feature domain.
- Each module contains exactly: controller, service, repository, validator, routes, types.
- Middleware is shared across all modules.
- Socket handlers are grouped separately from REST controllers.
- Background jobs are standalone with their own queue definitions.
- Shared utilities are never feature-specific.
