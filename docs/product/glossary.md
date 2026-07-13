# Glossary

> **Purpose:** Define domain terminology used throughout NetroTrack documentation and codebase.
> **Scope:** Business terms, technical terms, abbreviations.
> **Dependencies:** None — reference document.

---

## Business Terms

| Term | Definition |
|------|-----------|
| **Tenant** | An organization (company) using the NetroTrack platform. Each tenant's data is isolated. |
| **Company** | Synonym for tenant. An organization that subscribes to NetroTrack. |
| **Field Employee** | An employee who works outside the office, visiting customers, sites, or farms. Mapped to `CLIENT_USER` role. |
| **Field Workforce** | The collective group of field employees in an organization. |
| **Punch In** | The action of starting a workday. Triggers attendance recording and GPS tracking. |
| **Punch Out** | The action of ending a workday. Stops GPS tracking and finalizes attendance. |
| **Working Hours** | The duration between Punch In and Punch Out. |
| **Customer Visit** | A verified visit to a customer location, captured with GPS, photos, and notes. |
| **Inspection** | A field inspection of a site, farm, or asset with observations and recommendations. |
| **Product Sale** | A recorded sale of products during a field visit. |
| **Route** | The GPS path an employee traveled during a workday. |
| **Route Playback** | Replaying an employee's GPS path on a map in chronological order. |
| **Live Tracking** | Real-time display of an employee's GPS location on a manager's dashboard. |
| **Distance** | Total distance traveled by an employee during a workday, calculated from GPS points. |
| **Branch** | A physical office or location of a company. |
| **Department** | An organizational division within a company. |
| **Designation** | An employee's job title or position. |
| **MPIN** | Mobile Personal Identification Number. A 4-6 digit PIN for quick authentication. |
| **Onboarding** | The process of setting up a new company or employee on the platform. |
| **Subscription** | A company's service plan defining features and usage limits (future). |
| **White Label** | Customizing the platform's branding for a specific company or reseller (future). |

---

## User Roles

| Term | Definition |
|------|-----------|
| **Super Admin** | Platform owner who manages all companies and platform operations. |
| **Client Admin** | Company administrator who manages employees, settings, and reports for their organization. |
| **Client Manager** | Team supervisor who monitors assigned employees' activities and performance. |
| **Client User** | Field employee who uses the app for daily operations (attendance, visits, sales, inspections). |

---

## Technical Terms

| Term | Definition |
|------|-----------|
| **Multi-Tenant** | Architecture pattern where a single application instance serves multiple companies with complete data isolation. |
| **SaaS** | Software as a Service. Cloud-based software delivered over the internet on a subscription basis. |
| **JWT** | JSON Web Token. A compact, URL-safe means of representing claims to be transferred between two parties. Used for authentication. |
| **Refresh Token** | A long-lived token used to obtain new access tokens without re-authentication. |
| **RBAC** | Role-Based Access Control. Authorization model where permissions are assigned to roles, and roles to users. |
| **Offline-First** | Design pattern where the application functions without internet connectivity, queuing actions for later synchronization. |
| **Sync Engine** | The system component responsible for synchronizing offline-queued data with the server. |
| **Signed URL** | A pre-authorized URL that allows direct file upload to cloud storage without routing through the API server. |
| **Socket.IO** | Library for real-time, bidirectional event-based communication. Used for live tracking. |
| **Background Tracking** | GPS location capture that continues when the app is not in the foreground. |
| **Batch Sync** | Sending multiple data points in a single API request to reduce network overhead. |
| **Soft Delete** | Marking a record as deleted (via `deleted_at` timestamp) without physically removing it from the database. |
| **Audit Log** | A chronological record of system activities for security and compliance. |
| **Tenant Isolation** | Ensuring that one company's data is completely inaccessible to another company. |
| **Idempotent** | An operation that produces the same result regardless of how many times it's executed. Critical for sync retry logic. |
| **Optimistic UI** | Updating the user interface immediately before server confirmation, rolling back if the operation fails. |
| **Skeleton Screen** | A loading placeholder that mimics the page layout before content loads. |
| **Error Boundary** | A React component that catches JavaScript errors in its child component tree and displays a fallback UI. |

---

## Technology Terms

| Term / Abbreviation | Definition |
|---------------------|-----------|
| **React Native CLI** | The official React Native build system (as opposed to Expo). |
| **Zustand** | Lightweight state management library for React. |
| **TanStack Query** | (Formerly React Query) Library for managing server state, caching, and synchronization. |
| **Prisma** | Type-safe ORM for Node.js and TypeScript. |
| **Zod** | TypeScript-first schema validation library. |
| **MMKV** | High-performance key-value storage for React Native. |
| **Pino** | Fast, low-overhead JSON logging library for Node.js. |
| **BullMQ** | Redis-backed queue system for Node.js background jobs. |
| **Argon2** | Password hashing algorithm (winner of the Password Hashing Competition). |
| **Neon** | Serverless PostgreSQL database provider with branching and autoscaling. |
| **Cloudflare R2** | S3-compatible object storage service by Cloudflare. |
| **PM2** | Production process manager for Node.js applications. |
| **Nginx** | High-performance HTTP server and reverse proxy. |
| **FCM** | Firebase Cloud Messaging. Push notification service by Google. |
| **Reanimated** | React Native animation library for smooth, 60fps animations. |
| **Vision Camera** | High-performance camera library for React Native. |
| **React Hook Form** | Performant form library for React based on hooks. |
| **Redis** | In-memory data structure store used for caching, sessions, and message brokering. |

---

## Abbreviations

| Abbreviation | Meaning |
|-------------|---------|
| API | Application Programming Interface |
| CI/CD | Continuous Integration / Continuous Deployment |
| CRUD | Create, Read, Update, Delete |
| DNS | Domain Name System |
| DTO | Data Transfer Object |
| ERD | Entity Relationship Diagram |
| FMCG | Fast-Moving Consumer Goods |
| GPS | Global Positioning System |
| HTTPS | Hypertext Transfer Protocol Secure |
| i18n | Internationalization |
| LTS | Long-Term Support |
| MVP | Minimum Viable Product |
| ORM | Object-Relational Mapping |
| PII | Personally Identifiable Information |
| REST | Representational State Transfer |
| SOLID | Single responsibility, Open-closed, Liskov substitution, Interface segregation, Dependency inversion |
| TTL | Time to Live |
| UTC | Coordinated Universal Time |
| UUID | Universally Unique Identifier |
| UX | User Experience |

---

## Future Considerations

- Add terms as new modules are introduced (Task, Leave, Expense, Geofence).
- Maintain this glossary as the authoritative terminology reference.
- Link to this glossary from other documentation when introducing domain-specific terms.
