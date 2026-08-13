# NetroTrack Documentation

> **Enterprise-grade documentation for the NetroTrack Field Workforce Management Platform.**

---

## Quick Navigation

### Product
| Document | Purpose |
|----------|---------|
| [Product Overview](product/product-overview.md) | Vision, mission, objectives, target industries |
| [Product Philosophy](product/product-philosophy.md) | Design principles and product values |
| [User Roles](product/user-roles.md) | Role definitions, permissions matrix |
| [User Workflows](product/user-workflows.md) | Daily workflows for each role |
| [Business Rules](product/business-rules.md) | Complete business rules catalog |
| [Glossary](product/glossary.md) | Domain terminology dictionary |

### Architecture
| Document | Purpose |
|----------|---------|
| [System Architecture](architecture/system-architecture.md) | Infrastructure, deployment topology |
| [Application Architecture](architecture/application-architecture.md) | Layered architecture, module isolation |
| [Multi-Tenancy](architecture/multi-tenancy.md) | Tenant isolation, data boundaries |
| [Authentication & Authorization](architecture/authentication-authorization.md) | JWT, MPIN, biometric, RBAC |
| [Realtime Architecture](architecture/realtime-architecture.md) | Socket.IO, live tracking |
| [Offline Architecture](architecture/offline-architecture.md) | Offline-first, sync engine |
| [Image Upload Architecture](architecture/image-upload-architecture.md) | Signed URL flow, R2 integration |
| [GPS Tracking Architecture](architecture/gps-tracking-architecture.md) | Background tracking, batch sync |
| [Scalability Architecture](architecture/scalability-architecture.md) | Horizontal scaling, caching |

### Features
| Document | Purpose |
|----------|---------|
| [Authentication](features/authentication.md) | Login, MPIN, biometric, device registration |
| [Attendance](features/attendance.md) | Punch in/out, working hours, history |
| [Live Tracking](features/live-tracking.md) | GPS tracking, route playback |
| [Customer Visits](features/customer-visits.md) | Visit creation, verification |
| [Product Sales](features/product-sales.md) | Sales recording |
| [Inspections](features/inspections.md) | Field inspections |
| [Reports](features/reports.md) | All report types by role |
| [Notifications](features/notifications.md) | Push notification types |
| [Dashboards](features/dashboards.md) | Dashboard specs per role |
| [User Management](features/user-management.md) | User creation, Access Roles, Designation Titles, Timeline Audit Engine |

### Backend
| Document | Purpose |
|----------|---------|
| [Backend Overview](backend/backend-overview.md) | Architecture and patterns |
| [Folder Structure](backend/folder-structure.md) | Directory layout |
| [API Design](backend/api-design.md) | REST conventions, response format |
| [API Reference](backend/api-reference.md) | Complete endpoint catalog |
| [Middleware Strategy](backend/middleware-strategy.md) | Middleware chain |
| [Service Layer](backend/service-layer.md) | Business logic organization |
| [Repository Layer](backend/repository-layer.md) | Data access patterns |
| [Socket Events](backend/socket-events.md) | Real-time event catalog |
| [Background Jobs](backend/background-jobs.md) | BullMQ job definitions |
| [Validation Strategy](backend/validation-strategy.md) | Zod schemas |
| [Error Handling](backend/error-handling.md) | Error codes, error classes |
| [Logging & Monitoring](backend/logging-monitoring.md) | Pino, health endpoints |
| [Caching Strategy](backend/caching-strategy.md) | Redis patterns |

### Mobile
| Document | Purpose |
|----------|---------|
| [Mobile Overview](mobile/mobile-overview.md) | Architecture and patterns |
| [Folder Structure](mobile/folder-structure.md) | Directory layout |
| [Navigation Hierarchy](mobile/navigation-hierarchy.md) | Navigators and screens |
| [Screen Inventory](mobile/screen-inventory.md) | Complete screen catalog |
| [Component Strategy](mobile/component-strategy.md) | Reusable components |
| [State Management](mobile/state-management.md) | Zustand + TanStack Query |
| [Offline Strategy](mobile/offline-strategy.md) | MMKV queues, sync engine |
| [Background Tracking](mobile/background-tracking.md) | GPS service |
| [Push Notifications](mobile/push-notifications.md) | FCM integration |
| [Performance Strategy](mobile/performance-strategy.md) | Optimization techniques |
| [Battery Optimization](mobile/battery-optimization.md) | Power-efficient tracking |
| [Error Handling](mobile/error-handling.md) | Error boundaries, retry |

### Database
| Document | Purpose |
|----------|---------|
| [Database Overview](database/database-overview.md) | PostgreSQL/Neon strategy |
| [Entity Relationship](database/entity-relationship.md) | Complete ERD |
| [Schema Reference](database/schema-reference.md) | All tables and columns |
| [Indexing Strategy](database/indexing-strategy.md) | Index catalog |
| [Naming Conventions](database/naming-conventions.md) | Database naming standards |
| [Audit Strategy](database/audit-strategy.md) | Audit columns and log |
| [Soft Delete Strategy](database/soft-delete-strategy.md) | Soft delete pattern |
| [Migration Strategy](database/migration-strategy.md) | Prisma migrations |
| [Data Retention](database/data-retention.md) | GPS retention, archival |

### Design System
| Document | Purpose |
|----------|---------|
| [Design System Overview](design-system/design-system-overview.md) | Philosophy and architecture |
| [Theme Engine](design-system/theme-engine.md) | Multi-theme, dynamic, white-label |
| [Color System](design-system/color-system.md) | Color tokens, dark mode |
| [Typography](design-system/typography.md) | Font scales |
| [Spacing & Elevation](design-system/spacing-elevation.md) | Spacing and shadow tokens |
| [Component Library](design-system/component-library.md) | Component catalog |
| [Iconography](design-system/iconography.md) | Icon system |
| [Map Styles](design-system/map-styles.md) | Map theming |

### Security
| Document | Purpose |
|----------|---------|
| [Security Overview](security/security-overview.md) | Security architecture |
| [Authentication Security](security/authentication-security.md) | JWT, MPIN, biometric |
| [Authorization Security](security/authorization-security.md) | RBAC, permissions |
| [Data Security](security/data-security.md) | Encryption, isolation |
| [API Security](security/api-security.md) | Rate limiting, headers |
| [Device Security](security/device-security.md) | Device binding |
| [Audit Logging](security/audit-logging.md) | Audit trail |
| [Compliance](security/compliance.md) | GDPR, data residency |

### Development
| Document | Purpose |
|----------|---------|
| [Development Setup](development/development-setup.md) | Local environment |
| [Coding Standards](development/coding-standards.md) | TypeScript, ESLint, Prettier |
| [Folder Conventions](development/folder-conventions.md) | Naming patterns |
| [Git Workflow](development/git-workflow.md) | Branching strategy |
| [Commit Standards](development/commit-standards.md) | Conventional commits |
| [Code Review Checklist](development/code-review-checklist.md) | Review criteria |
| [Environment Variables](development/environment-variables.md) | All env vars |

### Testing
| Document | Purpose |
|----------|---------|
| [Testing Strategy](testing/testing-strategy.md) | Test pyramid, coverage |
| [Backend Testing](testing/backend-testing.md) | API test patterns |
| [Mobile Testing](testing/mobile-testing.md) | Component test patterns |
| [Test Data Strategy](testing/test-data-strategy.md) | Seed data, fixtures |

### Deployment
| Document | Purpose |
|----------|---------|
| [Deployment Overview](deployment/deployment-overview.md) | CI/CD architecture |
| [Infrastructure](deployment/infrastructure.md) | AWS, Nginx, PM2 |
| [CI/CD Pipeline](deployment/ci-cd-pipeline.md) | GitHub Actions |
| [Environment Strategy](deployment/environment-strategy.md) | Dev/Staging/Prod |
| [Backup & DR](deployment/backup-disaster-recovery.md) | Backup, recovery |
| [Runbook](deployment/runbook.md) | Operational procedures |

### Planning & Roadmap
| Document | Purpose |
|----------|---------|
| [Execution Plan](planning/execution-plan.md) | Project execution strategy |
| [Sprint Planning](planning/sprint-planning.md) | Sprint structure |
| [Dependency Graph](planning/dependency-graph.md) | Feature dependencies |
| [Critical Path](planning/critical-path.md) | Critical path analysis |
| [Risk Register](planning/risk-register.md) | Risk catalog |
| [Acceptance Criteria](planning/acceptance-criteria.md) | Definition of Done |
| [Release Roadmap](roadmap/release-roadmap.md) | Phase 1–4 breakdown |
| [MVP Scope](roadmap/mvp-scope.md) | MVP features |
| [V1 Scope](roadmap/v1-scope.md) | Version 1 scope |
| [V2 Scope](roadmap/v2-scope.md) | Version 2 scope |
| [V3 Scope](roadmap/v3-scope.md) | Version 3 scope |
| [Future Modules](roadmap/future-modules.md) | Future module specs |

---

## Reading Order

For new team members, read in this order:

1. `NETROTRACK_PRODUCT_BIBLE.md` (root) — Product specification
2. `AGENTS.md` (root) — AI and coding standards
3. `product/` — Understand the domain
4. `architecture/` — Understand the system design
5. `database/` — Understand the data model
6. `backend/` — Understand the API layer
7. `mobile/` — Understand the client
8. `design-system/` — Understand the UI framework
9. `features/` — Deep dive into each module
10. `security/` → `development/` → `testing/` → `deployment/` → `planning/`

---

## Versioning

This documentation follows the product versioning. Major documentation changes are tracked via Git history.

| Version | Date | Description |
|---------|------|-------------|
| 0.1.0 | 2026-07-13 | Initial documentation repository |
