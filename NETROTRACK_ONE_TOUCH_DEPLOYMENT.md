# NetroTrack One-Touch Deployment – Technical Implementation Plan

## 1. Purpose

This document turns the current manually configured production stack into a repeatable deployment system.

The supplied architecture recommends:

- `e2-standard-4`, 4 vCPU / 16 GB RAM
- Ubuntu 24.04
- 100 GB Persistent Disk
- Docker + Docker Compose
- PostgreSQL on the same VM
- Cloud Storage for assets and PostgreSQL backups
- Global External Application Load Balancer
- Static external IP
- Google-managed TLS
- health checks, monitoring and alerts

These points are explicitly present in the architecture document. fileciteturn2file1L59-L109

The current NetroTrack backend is Node.js/Prisma/PostgreSQL/Redis and exposes `/health`. The previous production incident was a Prisma/OpenSSL mismatch; the Docker image must therefore install OpenSSL in build and runtime stages. fileciteturn1file0L11-L27

## 2. Target flow

```text
Developer
   |
   | git push
   v
GitHub Actions
   |
   | Docker build + tests
   | Prisma generate
   | OpenSSL present
   | push immutable image
   v
GHCR
   |
   | one-touch deployment
   v
Terraform
   |
   +--> VPC/subnet/firewall
   +--> VM + service account
   +--> Cloud Storage
   +--> unmanaged instance group
   +--> health check
   +--> backend service
   +--> HTTPS certificate
   +--> HTTPS forwarding rule
   +--> HTTP -> HTTPS redirect
   |
   v
VM startup/deploy
   |
   +--> Docker
   +--> PostgreSQL
   +--> Redis
   +--> Backend image
   |
   +--> optional restore from gs:// backup
   |
   v
https://netro-track-api.netrofusion.in/health
   |
   v
HTTP 200
```

The architecture uses an external load balancer in front of the VM rather than exposing the application directly. The supplied design also recommends no public IP on the VM. fileciteturn2file3L164-L191

## 3. Repository layout

```text
infra/
├── terraform/
│   ├── modules/
│   │   ├── network/
│   │   ├── storage/
│   │   ├── compute/
│   │   └── load_balancer/
│   └── environments/
│       └── production/
├── scripts/
│   ├── one-touch-deploy.sh
│   ├── backup-db.sh
│   └── restore-db.sh
├── .github/workflows/
│   └── build-backend.yml
└── docs/
    └── ONE-TOUCH-DEPLOYMENT.md
```

## 4. Terraform responsibilities

Terraform owns only durable infrastructure:

1. VPC and subnet
2. firewall
3. VM service account
4. VM
5. unmanaged instance group
6. Cloud Storage buckets
7. global static IP
8. health check
9. backend service
10. URL map
11. Google-managed certificate
12. HTTPS proxy
13. HTTPS forwarding rule
14. HTTP redirect URL map/proxy/rule

This makes the current manually-created GCP resources reproducible.

## 5. Application build responsibilities

GitHub Actions builds the backend image.

### Required Dockerfile rule

For `node:20-bookworm-slim`, install OpenSSL in both builder and runner stages:

```dockerfile
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
```

Do this before `prisma generate` in the builder and keep OpenSSL in the runtime image.

This specifically prevents the failure previously observed where Prisma selected `openssl-1.1.x` and the container crashed because `libssl.so.1.1` was missing. fileciteturn1file9L935-L951

### Image tagging

Prefer:

```text
ghcr.io/netrofusionlabs/netro_track-backend:<git-sha>
```

Avoid using `latest` for production.

The branch name tag (`production`) can remain as a convenience tag, but Terraform should ultimately deploy an immutable SHA or digest.

## 6. Database strategy

The architecture intentionally keeps PostgreSQL on the same VM initially. fileciteturn2file6L649-L681

Backups go to Cloud Storage.

Recommended:

```text
daily   -> 7 days
weekly  -> 4 weeks
monthly -> 3 months
```

This retention model is also in the supplied architecture. fileciteturn2file6L716-L742

### Backup format

Use PostgreSQL custom format:

```bash
pg_dump -Fc
```

This works well with:

```bash
pg_restore
```

Do not restore over a live production database without an explicit restore operation.

## 7. Restore workflow

A restore should be explicit:

```bash
./scripts/one-touch-deploy.sh production production \
  gs://netrotrack-prod-backups-<project>/postgres/daily/<backup>.dump.gz
```

The deployment sets:

```text
restore_on_boot=true
restore_backup_uri=<selected backup>
```

The VM startup process:

1. starts PostgreSQL
2. waits for readiness
3. downloads the selected backup
4. stops backend
5. recreates the target database
6. runs `pg_restore`
7. starts backend
8. verifies `/health`

### Critical production safety rule

Do not automatically restore a database every time Terraform changes the VM.

For normal deployments:

```text
restore_on_boot = false
```

For disaster recovery / migration:

```text
restore_on_boot = true
restore_backup_uri = "gs://..."
```

## 8. Secrets

Do not commit:

```text
POSTGRES_PASSWORD
REDIS_PASSWORD
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
R2_SECRET_ACCESS_KEY
GOOGLE_MAPS_API_KEY
```

The example `terraform.tfvars` contains placeholders only.

Recommended final implementation:

```text
Secret Manager
      |
      v
VM startup / deployment agent
      |
      v
/opt/netrotrack/.env
```

For an initial implementation, protected CI variables can populate `TF_VAR_*`, but note that sensitive Terraform variables may still enter Terraform state. For a mature production setup, use Secret Manager and minimize secret material in state.

## 9. DNS

Keep the DNS record:

```text
netro-track-api.netrofusion.in
    A
    8.232.197.48
```

Terraform creates the IP. DNS can remain at GoDaddy or later be moved to Cloud DNS.

The certificate becomes active only after DNS resolves to the load-balancer IP. Your current certificate and DNS flow has already been validated successfully.

## 10. Load balancer

The production pattern is:

```text
Internet
   |
   | :80
   v
HTTP redirect
   |
   | 301
   v
HTTPS :443
   |
   v
Global External Application Load Balancer
   |
   v
Backend service
   |
   v
Unmanaged instance group
   |
   v
NetroTrack VM
   |
   v
Backend :3000
```

The health check is:

```text
GET /health
```

Expected:

```http
HTTP/2 200
```

The current manually deployed backend has already demonstrated this endpoint and returns:

```json
{"success":true,"message":"Server is healthy"}
```

## 11. Firewall

Only the load-balancer health-check/proxy ranges should reach port 3000:

```text
35.191.0.0/16
130.211.0.0/22
```

No public PostgreSQL access:

```text
Internet -> 5432 = DENY
```

The supplied architecture explicitly says PostgreSQL must not be exposed publicly. fileciteturn2file6L664-L681

## 12. One-touch deployment

The supplied project can be deployed with:

```bash
./scripts/one-touch-deploy.sh production
```

This:

1. initializes Terraform
2. validates Terraform
3. creates a plan
4. applies the plan
5. reads the load-balancer IP
6. waits for the HTTPS endpoint
7. verifies `/health`

For a restore deployment:

```bash
./scripts/one-touch-deploy.sh production production \
  gs://BUCKET/postgres/daily/BACKUP.dump.gz
```

## 13. Recommended mature workflow

### Normal release

```text
PR
 |
 v
tests
 |
 v
Docker build
 |
 v
Prisma generate
 |
 v
security scan
 |
 v
GHCR image SHA
 |
 v
Terraform deploy
 |
 v
health check
 |
 v
smoke tests
```

### Restore / disaster recovery

```text
Select backup
      |
      v
Provision/recover VM
      |
      v
Restore PostgreSQL
      |
      v
Start Redis
      |
      v
Deploy immutable backend image
      |
      v
ALB health check
      |
      v
HTTPS smoke test
```

## 14. Rollback

Application rollback is deliberately simple:

```text
Terraform backend_image =
previous-good-image-sha
```

Then:

```bash
terraform apply
```

Database rollback is different.

Never treat database rollback as an application image rollback.

Use:

```text
backup -> restore -> migration compatibility check
```

For schema changes, use backward-compatible migrations:

1. add new nullable column/table
2. deploy application
3. backfill
4. switch reads/writes
5. remove old schema in a later release

## 15. Important improvement over the current manual setup

The current manual environment already has the important LB chain:

```text
static IP
 -> HTTP redirect
 -> HTTPS proxy
 -> URL map
 -> backend service
 -> unmanaged instance group
 -> VM:3000
```

The current health check is known to be healthy, and the application endpoint works.

Terraform's purpose is to make that configuration reproducible rather than repeatedly creating it by hand.

## 16. First implementation phases

### Phase 1 — Terraform import

Before destroying anything, import existing production resources into Terraform or deploy the Terraform stack under new names.

Recommended imports include:

```text
VM
instance group
static IP
health check
backend service
URL maps
target proxies
forwarding rules
SSL certificate
firewall
buckets
```

Do not run `terraform destroy` against the current production project until imports and plans have been reviewed.

### Phase 2 — Application CI

Add:

- unit tests
- TypeScript build
- Prisma generate
- Docker build
- OpenSSL verification
- GHCR push
- immutable SHA tag

### Phase 3 — Deployment

Use the one-touch script.

### Phase 4 — Backups

Create a systemd timer or Cloud Scheduler-driven job for:

```text
daily PostgreSQL backup
weekly retention
monthly retention
backup verification
```

### Phase 5 — Observability

Add:

- VM CPU alert
- disk utilization alert
- memory alert
- container restart alert
- backend health alert
- backup failure alert
- certificate expiry monitoring

## 17. Disaster recovery test

Do this monthly:

1. choose a known backup
2. create a temporary VM/environment
3. restore backup
4. deploy application
5. run smoke tests
6. verify tenant/company/employee/attendance/leave/visit data
7. record restore duration

Track:

```text
RPO = acceptable data loss
RTO = acceptable recovery time
```

Do not claim a backup strategy is production-ready until a restore has actually been tested.

## 18. Current NetroTrack-specific notes

The Prisma schema uses PostgreSQL and `DATABASE_URL`. fileciteturn2file5L453-L463

The current architecture already places PostgreSQL and Redis on the VM and uses Docker Compose. fileciteturn2file6L605-L645

The supplied architecture recommends Cloud Storage for assets and database backups, including:

```text
gs://netrotrack-prod-assets
gs://netrotrack-prod-backups
gs://netrotrack-prod-logs
```

and a backup layout under `backups/postgres/daily` and `weekly`. fileciteturn2file6L685-L714

## 19. Production acceptance checklist

### Infrastructure

- [ ] Terraform state stored remotely in a GCS bucket
- [ ] VM has no public IP
- [ ] firewall permits LB → backend only
- [ ] port 5432 is not public
- [ ] port 6379 is not public
- [ ] static IP reserved
- [ ] ALB backend healthy
- [ ] managed certificate ACTIVE

### Application

- [ ] immutable image deployed
- [ ] OpenSSL installed in Docker builder/runtime
- [ ] Prisma generate succeeds
- [ ] backend starts
- [ ] `/health` returns 200
- [ ] Redis connected
- [ ] PostgreSQL connected

### Database

- [ ] daily backup succeeds
- [ ] backup exists in GCS
- [ ] restore tested
- [ ] retention policy verified

### Security

- [ ] no secrets in Git
- [ ] VM service account least privilege
- [ ] bucket public access prevention enabled
- [ ] TLS enabled
- [ ] HTTP redirects to HTTPS
- [ ] admin access restricted

### Release

- [ ] CI build passed
- [ ] image SHA recorded
- [ ] Terraform plan reviewed
- [ ] deployment smoke test passed
- [ ] rollback image identified
