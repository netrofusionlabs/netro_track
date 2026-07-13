# Deployment Overview

> **Purpose:** High-level deployment and infrastructure architecture.
> **Dependencies:** [System Architecture](../architecture/system-architecture.md)

---

## Infrastructure Stack

| Component | Provider | Details |
|-----------|----------|---------|
| Database | Neon (AWS) | Managed serverless PostgreSQL |
| API Server | AWS EC2 | Ubuntu LTS instances |
| Object Storage | Cloudflare R2 | S3-compatible, no egress fees |
| DNS / CDN | Cloudflare | Proxy, SSL, static asset caching |
| Caching / Queues | Redis (EC2) | Initial: on API EC2. Future: ElastiCache |
| Process Manager | PM2 | Node.js cluster mode and monitoring |
| Reverse Proxy | Nginx | TLS termination, load balancing, gzip |

## Node.js Deployment (EC2 + PM2)

```bash
# pm2.config.js
module.exports = {
  apps: [{
    name: 'netrotrack-api',
    script: './dist/server.js',
    instances: 'max',       // Utilize all CPU cores
    exec_mode: 'cluster',   // Cluster mode for zero-downtime reloads
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }, {
    name: 'netrotrack-worker',
    script: './dist/jobs/index.js',
    instances: 1,           // Single worker instance for cron jobs
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
```

## Mobile App Deployment

| Platform | Store | Tooling | Release Track |
|----------|-------|---------|---------------|
| Android | Google Play Store | Fastlane | Internal Testing → Production |
| iOS | Apple App Store | Fastlane | TestFlight → App Store |

## High Availability (V2+)

As the platform scales beyond a single EC2 instance, the architecture transitions to:
1. Application Load Balancer (ALB).
2. Auto Scaling Group (min 2 instances) across multiple Availability Zones.
3. ElastiCache for Redis (replacing local Redis).
4. ALB Sticky Sessions enabled for Socket.IO.
