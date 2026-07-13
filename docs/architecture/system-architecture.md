# System Architecture

> **Purpose:** Define the high-level system topology, infrastructure components, and their interactions.
> **Scope:** Infrastructure design, network flow, deployment topology.
> **Dependencies:** [Product Overview](../product/product-overview.md)

---

## 1. System Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│                                                                  │
│    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│    │  Android App  │    │   iOS App    │    │  Admin Portal │     │
│    │  (React Native)│    │ (React Native)│   │  (Future Web) │     │
│    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘     │
│           │                   │                    │              │
└───────────┼───────────────────┼────────────────────┼──────────────┘
            │                   │                    │
            └───────────────────┼────────────────────┘
                                │
                         HTTPS + WSS
                                │
┌───────────────────────────────┼──────────────────────────────────┐
│                        Edge Layer                                │
│                                │                                 │
│                    ┌───────────┴───────────┐                     │
│                    │   Cloudflare DNS +     │                     │
│                    │   SSL Termination      │                     │
│                    └───────────┬───────────┘                     │
│                                │                                 │
└────────────────────────────────┼──────────────────────────────────┘
                                │
┌───────────────────────────────┼──────────────────────────────────┐
│                     Application Layer                            │
│                                │                                 │
│    ┌───────────────────────────┴───────────────────────┐         │
│    │              AWS EC2 Instance                      │         │
│    │                                                    │         │
│    │    ┌──────────────────────────────────────┐        │         │
│    │    │             Nginx                     │        │         │
│    │    │     (Reverse Proxy + Static Files)    │        │         │
│    │    └──────────────┬───────────────────────┘        │         │
│    │                   │                                │         │
│    │    ┌──────────────┴───────────────────────┐        │         │
│    │    │         PM2 Process Manager           │        │         │
│    │    │                                       │        │         │
│    │    │    ┌─────────────────────────┐        │        │         │
│    │    │    │  Node.js Express API     │        │        │         │
│    │    │    │  + Socket.IO Server      │        │        │         │
│    │    │    └─────────────────────────┘        │        │         │
│    │    └──────────────────────────────────────┘        │         │
│    │                                                    │         │
│    └────────────────────────────────────────────────────┘         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
            │              │              │              │
┌───────────┼──────────────┼──────────────┼──────────────┼──────────┐
│           │       Data & Services Layer  │              │          │
│           │              │              │              │          │
│  ┌────────┴──────┐ ┌────┴──────┐ ┌─────┴─────┐ ┌─────┴─────┐   │
│  │  PostgreSQL   │ │   Redis   │ │Cloudflare  │ │  Firebase  │   │
│  │   (Neon)      │ │  (Cache,  │ │    R2      │ │    FCM     │   │
│  │               │ │  Queues,  │ │  (Images)  │ │   (Push)   │   │
│  │  • User data  │ │  Socket)  │ │            │ │            │   │
│  │  • Business   │ │           │ │  • Selfies  │ │• Attendance│   │
│  │  • GPS        │ │  • Sessions│ │  • Photos  │ │  Reminders │   │
│  │  • Audit      │ │  • Rate   │ │  • Logos   │ │• Task      │   │
│  │               │ │    limits │ │            │ │  Assigned  │   │
│  │               │ │  • BullMQ │ │            │ │• Announce- │   │
│  │               │ │    jobs   │ │            │ │  ments     │   │
│  └───────────────┘ └──────────┘ └────────────┘ └────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Inventory

| Component | Technology | Purpose | Hosting |
|-----------|-----------|---------|---------|
| Mobile App | React Native CLI + TypeScript | Field employee interface | App stores |
| API Server | Node.js + Express + TypeScript | Business logic, REST API | AWS EC2 |
| WebSocket Server | Socket.IO | Real-time live tracking | AWS EC2 (same process) |
| Database | PostgreSQL 15+ | Primary data store | Neon (managed) |
| Cache / Queue | Redis 7+ | Caching, sessions, jobs, Socket.IO adapter | AWS EC2 or ElastiCache |
| Object Storage | Cloudflare R2 | Images (selfies, photos, logos) | Cloudflare (managed) |
| Push Notifications | Firebase Cloud Messaging | Mobile push notifications | Google (managed) |
| Maps | Google Maps Platform | Map display, geocoding | Google (managed) |
| Reverse Proxy | Nginx | SSL termination, request routing | AWS EC2 |
| Process Manager | PM2 | Node.js process lifecycle | AWS EC2 |
| CI/CD | GitHub Actions | Automated build and deployment | GitHub (managed) |
| DNS | Cloudflare | DNS management, DDoS protection | Cloudflare (managed) |

---

## 3. Network Flow

### API Request Flow

```
Mobile App
    │
    │  HTTPS (Port 443)
    ▼
Cloudflare DNS (SSL at edge)
    │
    │  HTTPS
    ▼
Nginx (Port 443 → proxy_pass to :3000)
    │
    │  HTTP (localhost)
    ▼
Node.js Express (:3000)
    │
    ├── Auth Middleware → JWT validation
    ├── Tenant Middleware → companyId injection
    ├── Rate Limiting → Redis counter
    ├── Route Handler → Zod validation
    ├── Service Layer → Business logic
    ├── Repository Layer → Prisma queries
    │
    ▼
PostgreSQL (Neon — pooled connection)
```

### WebSocket Flow

```
Mobile App (Employee GPS data)
    │
    │  WSS (Port 443)
    ▼
Nginx (WebSocket upgrade → proxy_pass)
    │
    │  WS (localhost)
    ▼
Socket.IO Server
    │
    ├── JWT Handshake Auth
    ├── Join company room: company_{companyId}
    ├── Emit location update
    │
    ▼
Redis Adapter (pub/sub for multi-instance)
    │
    ▼
Socket.IO Server(s)
    │
    ▼
Manager clients in same company room
```

### Image Upload Flow

```
Mobile App
    │
    │  1. Request signed upload URL
    ▼
API Server
    │
    │  2. Generate signed URL (Cloudflare R2 S3-compatible API)
    ▼
Mobile App (receives signed URL)
    │
    │  3. Direct upload to R2 (multipart/form-data)
    ▼
Cloudflare R2
    │
    │  4. Upload complete → return URL
    ▼
Mobile App
    │
    │  5. Send image URL with business data (visit, inspection)
    ▼
API Server → PostgreSQL (store URL only)
```

---

## 4. Infrastructure Sizing

### V1 (Launch)

| Resource | Specification | Justification |
|----------|-------------|---------------|
| EC2 Instance | t3.medium (2 vCPU, 4GB RAM) | Handles 2,000 concurrent users |
| Neon Database | Pro plan (autoscaling) | Connection pooling, auto-backup |
| Redis | t3.micro or local on EC2 | Sessions, rate limiting, Socket.IO adapter |
| Cloudflare R2 | Pay-as-you-go | Egress-free, S3-compatible |
| Domain | api.netrotrack.com | API endpoint |

### Future (Scale)

| Resource | Specification | Justification |
|----------|-------------|---------------|
| EC2 Instances | 2+ behind ALB | Horizontal scaling for 50K concurrent |
| ElastiCache Redis | r6g.large cluster | High-availability caching |
| Neon Database | Enterprise with read replicas | Read scaling for reports |
| CDN | Cloudflare | Static asset caching |

---

## 5. External Service Dependencies

| Service | Purpose | Failure Impact | Fallback |
|---------|---------|----------------|----------|
| Neon (PostgreSQL) | Primary database | Critical — app unusable | None (managed HA) |
| Redis | Caching, queues, sockets | Degraded — no real-time, slower APIs | Direct DB queries (slower) |
| Cloudflare R2 | Image storage | Images cannot upload | Queue uploads for retry |
| Firebase FCM | Push notifications | Notifications delayed | In-app notifications |
| Google Maps | Map display | Maps don't render | Cached map tiles |
| GitHub | Code hosting, CI/CD | Cannot deploy | Manual deployment |

---

## 6. Security Boundaries

```
┌─────────────────────────────────────────────┐
│              Public Internet                 │
│                                             │
│  Only HTTPS (443) and WSS (443) allowed     │
└──────────────────┬──────────────────────────┘
                   │
           ┌───────┴───────┐
           │   Cloudflare   │  ← DDoS protection, SSL
           └───────┬───────┘
                   │
           ┌───────┴───────┐
           │    Nginx       │  ← Request filtering, rate limiting
           └───────┬───────┘
                   │
           ┌───────┴───────┐
           │   Node.js API  │  ← Auth, RBAC, input validation
           └───────┬───────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───┴───┐    ┌────┴────┐   ┌────┴────┐
│  Neon  │    │  Redis   │   │   R2    │
│(Private)│    │(Private) │   │(Signed) │
└────────┘    └──────────┘   └─────────┘
```

- Neon is accessed via private connection string (not publicly exposed).
- Redis is local to EC2 or in a private VPC.
- R2 uploads require signed URLs (no public write access).
- All inter-service communication is encrypted.

---

## Future Considerations

- **Load Balancer:** Application Load Balancer (ALB) when scaling to multiple EC2 instances.
- **Auto Scaling Group:** Automatic instance scaling based on CPU/connection count.
- **CDN:** Cloudflare CDN for static assets and cached API responses.
- **Message Queue:** Dedicated message broker (RabbitMQ/SQS) for inter-service communication.
- **Containerization:** Docker + ECS/Kubernetes for simplified deployment.
- **Admin Portal:** Separate Next.js application behind the same API.
- **API Gateway:** Centralized API gateway for rate limiting, versioning, and analytics.

---

## Best Practices

- Keep all infrastructure configuration as code (Terraform future consideration).
- Monitor all external service dependencies for uptime.
- Design every integration with circuit breakers and retry logic.
- Document runbooks for every infrastructure failure scenario.
- Maintain a clear separation between the application layer and data layer.
