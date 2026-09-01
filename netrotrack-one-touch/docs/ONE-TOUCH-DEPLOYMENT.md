# NetroTrack — One-Touch Deployment Reference

> **Single source of truth** for provisioning, deploying, and maintaining the NetroTrack backend infrastructure.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites-one-time-setup)
3. [Full End-to-End Flow](#3-full-end-to-end-flow)
4. [Running setup.sh — Step by Step](#4-running-setupsh--step-by-step)
5. [After Setup — First Deployment](#5-after-setup--first-deployment)
6. [Every Subsequent Deploy](#6-every-subsequent-deploy)
7. [Scripts Reference](#7-scripts-reference)
8. [GitHub Actions Secrets Reference](#8-github-actions-secrets-reference)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Architecture Overview

```
Internet
    │
    ▼
netro-track-api.netrofusion.in  (DNS A → 8.232.197.48)
    │
    ▼
Google Cloud Global HTTPS Load Balancer
    ├── :80  → 301 redirect → HTTPS
    └── :443 → Google-managed SSL cert
                    │
                    ▼
             Backend Service
          netrotrack-backend-service
                    │
                    ▼
         Unmanaged Instance Group
            netrotrack-prod-ig
                    │
                    ▼
           GCP VM: netro-track-prod
            us-central1-a  :3000
                    │
             Docker Compose
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   backend      postgres     redis
   :3000    127.0.0.1:5432  127.0.0.1:6379
```

**Security model:**
- Firewall allows only GCP LB health-check ranges (`35.191.0.0/16`, `130.211.0.0/22`) to reach `:3000`
- PostgreSQL and Redis bind to `127.0.0.1` only — never exposed to internet

**Responsibility split:**

| Layer | Tool | What it manages |
|-------|------|----------------|
| Infrastructure | Terraform | LB, SSL cert, firewall, static IP, instance group |
| VM setup | `setup.sh` + `vm-bootstrap.sh` | Docker, `/opt/netrotrack/`, docker-compose.yml |
| Application CI/CD | GitHub Actions | Docker image build, `.env`, container start |
| Runtime | Docker Compose | postgres, redis, backend containers |

---

## 2. Prerequisites (One-time Setup)

### Tools required

| Tool | Required | Install |
|------|----------|---------|
| `gcloud` | ✅ Always | https://cloud.google.com/sdk/docs/install |
| `terraform` | ✅ Always | https://developer.hashicorp.com/terraform/install |
| `curl` | ✅ Always | `brew install curl` |
| `jq` | ✅ Always | `brew install jq` |
| `gh` (GitHub CLI) | ⚠️ Only for auto-registering secrets | https://cli.github.com |

### Authentication

```bash
# 1. Authenticate gcloud (required)
gcloud auth login
gcloud auth application-default login

# 2. Authenticate GitHub CLI (optional — only if using auto-register in Phase 5)
gh auth login
#   → Choose: GitHub.com
#   → Choose: HTTPS
#   → Paste a GitHub Personal Access Token with scopes: repo, write:packages
```

### GitHub Actions app secrets (must exist before first deploy)

These must be added manually at:
**GitHub → `netrofusionlabs/NetroTrack` → Settings → Environments → `production` → Secrets**

| Secret | Description |
|--------|-------------|
| `POSTGRES_DB` | Database name |
| `POSTGRES_USER` | Database user |
| `POSTGRES_PASSWORD` | Database password |
| `REDIS_PASSWORD` | Redis auth password |
| `JWT_ACCESS_SECRET` | JWT access token secret (15-min expiry) |
| `JWT_REFRESH_SECRET` | JWT refresh token secret (7-day expiry) |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | R2 public CDN URL |
| `GOOGLE_MAPS_API_KEY` | Google Maps Platform API key |

> **`setup.sh` never asks for or touches these secrets.**

---

## 3. Full End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  ONE-TIME INFRASTRUCTURE SETUP                                   │
│                                                                  │
│  Developer machine                                               │
│    │                                                             │
│    │  ./setup.sh  (interactive, ~10 min)                        │
│    │                                                             │
│    ├── Phase 0: Prerequisites check                             │
│    ├── Phase 1: Collect config (VM, zone, domain, SSH key)      │
│    ├── Phase 2: Create GCS Terraform state bucket               │
│    ├── Phase 3: Bootstrap VM via gcloud                         │
│    │             → Install Docker CE                            │
│    │             → Create /opt/netrotrack/                      │
│    │             → Copy docker-compose.yml                      │
│    ├── Phase 4: Terraform apply                                 │
│    │             → Instance group, firewall, LB, SSL cert       │
│    ├── Phase 5: Register GitHub SSH secrets                     │
│    │             → GCP_VM_HOST, GCP_VM_USER,                   │
│    │                GCP_VM_SSH_KEY, GCP_VM_SSH_PORT             │
│    └── Phase 6: Health check validation                         │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  EVERY DEPLOYMENT (git push to 'production' branch)             │
│                                                                  │
│  Developer                                                       │
│    │  git push origin production                                │
│    ▼                                                             │
│  GitHub Actions                                                  │
│    ├── Build Docker image                                        │
│    ├── Push → ghcr.io/netrofusionlabs/netro_track-backend       │
│    ├── SSH into VM                                               │
│    │     Write /opt/netrotrack/.env (from GH secrets)           │
│    │     docker compose pull backend                             │
│    │     docker compose up -d postgres redis                     │
│    │     docker compose up -d backend                            │
│    │     curl http://127.0.0.1:3000/health → 200 ✔             │
│    └── Done                                                      │
│                            │                                     │
│                            ▼                                     │
│    https://netro-track-api.netrofusion.in/health                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Running `setup.sh` — Step by Step

```bash
cd netrotrack-one-touch/scripts
./setup.sh
```

### Phase 0 — Prerequisites check

- Verifies `gcloud`, `terraform`, `curl`, `jq` are installed
- Shows a warning (not an error) if `gh` is missing
- Verifies gcloud is authenticated

### Phase 0 (continued) — GCP account selection

Lists all accounts currently logged into gcloud:

```
  Available GCP accounts:
    [1]  personal@gmail.com
    [2]  work@netrofusion.in   (active)

  Select account [2]: _
```

Switches active account if you choose a different one.

### Phase 1 — Configuration (8 prompts, all have defaults)

```
GCP Project ID       [netro-track-prod]
GCP VM name          [netro-track-prod]
GCP Zone             [us-central1-a]
API Domain           [netro-track-api.netrofusion.in]
GitHub repository    [netrofusionlabs/NetroTrack]
GitHub env           [production]
VM OS username       [ubuntu]
SSH port             [22]
SSH key path         [~/.ssh/netrotrack_github_actions]
                      → generates a new ed25519 key pair if file doesn't exist
```

Shows a summary → asks for confirmation before proceeding.

### Phase 2 — GCS Terraform State Bucket

Checks if `gs://netrotrack-prod-terraform-state-<project_id>` exists.
- If **missing** → creates it (versioned, private, uniform access)
- If **exists** → skips silently

Resolves the bootstrap chicken-and-egg: Terraform needs the bucket to exist before `terraform init` can run.

### Phase 3 — VM Bootstrap (via `gcloud compute ssh`)

1. Fetches VM external IP from GCP
2. Injects GitHub Actions SSH public key into VM metadata (idempotent)
3. Copies `docker-compose.prod.yml` → VM `/tmp/`
4. Copies `vm-bootstrap.sh` → VM `/tmp/`
5. Runs `vm-bootstrap.sh` on the VM as root:
   - Installs **Docker CE** + Docker Compose plugin (Ubuntu, idempotent)
   - Adds VM user to `docker` group
   - Creates `/opt/netrotrack/` (owner: VM user, group: docker)
   - Creates `/opt/netrotrack/postgres/data/` (PostgreSQL volume)
   - Copies `docker-compose.yml` → `/opt/netrotrack/docker-compose.yml`
   - Creates empty `.env` placeholder (GitHub Actions overwrites on deploy)

### Phase 4 — Terraform

```
terraform init      → connects to GCS state bucket
terraform validate  → checks configuration
terraform plan      → shows what will be created/updated
                      (you review, then confirm)
terraform apply     → creates:
    ├── google_compute_instance_group   (wraps existing VM)
    ├── google_compute_firewall          (LB ranges → VM :3000)
    ├── google_compute_global_address    (static IP 8.232.197.48)
    ├── google_compute_health_check      (/health on :3000)
    ├── google_compute_backend_service   (EXTERNAL_MANAGED)
    ├── google_compute_managed_ssl_certificate  (for domain)
    ├── google_compute_url_map           (HTTPS routing)
    ├── google_compute_target_https_proxy
    ├── google_compute_global_forwarding_rule   (:443)
    ├── google_compute_url_map           (HTTP redirect)
    ├── google_compute_target_http_proxy
    └── google_compute_global_forwarding_rule   (:80 → HTTPS)
```

Outputs: `load_balancer_ip`, `api_url`, `instance_name`

### Phase 5 — GitHub Actions SSH Secrets

Shows the 4 secrets that need to exist in GitHub, then asks:

```
  How do you want to register the SSH secrets?
    [1]  Auto-register via GitHub CLI  (requires: gh auth login)
    [2]  Already added manually — skip this phase
```

**Option 1 (auto):** Uses `gh secret set` to register all 4 secrets to the `production` environment. Pauses and waits if `gh` is not yet authenticated.

**Option 2 (manual):** Prints exact values + direct GitHub URL to add them yourself.

> App secrets (DB, JWT, R2, Maps) are **never touched** — already in GitHub.

### Phase 6 — Validation

Polls `https://<domain>/health` every 10s for up to 25 minutes.

> Skip option available — recommended on first run because:
> - SSL cert takes 5–20 min to provision
> - Backend containers start only after the first `git push`

---

## 5. After Setup — First Deployment

```bash
git push origin production
```

GitHub Actions (`production.yml`) runs automatically:

1. Checks out the `production` branch
2. Logs into GHCR with `GITHUB_TOKEN`
3. Builds Docker image: `ghcr.io/netrofusionlabs/netro_track-backend:production`
4. Pushes image to GHCR
5. SSH into VM → writes `/opt/netrotrack/.env` from GitHub secrets
6. `docker compose pull backend`
7. `docker compose up -d postgres redis` → waits
8. `docker compose up -d backend`
9. Polls `http://127.0.0.1:3000/health` until 200

---

## 6. Every Subsequent Deploy

```bash
# Make your code changes, then:
git push origin production
```

That's it. No manual steps. GitHub Actions handles everything.

---

## 7. Scripts Reference

### `scripts/setup.sh` — Interactive one-touch orchestrator

```bash
./setup.sh
```

Run once per new VM/environment. Idempotent — safe to re-run.

### `scripts/vm-bootstrap.sh` — VM provisioning script

Runs automatically inside `setup.sh`. Can be re-run manually on the VM:

```bash
# Re-provision VM if needed (e.g. after VM rebuild)
gcloud compute scp scripts/vm-bootstrap.sh \
  ubuntu@netro-track-prod:/tmp/ --zone=us-central1-a
gcloud compute ssh ubuntu@netro-track-prod \
  --zone=us-central1-a -- sudo /tmp/vm-bootstrap.sh ubuntu
```

### `scripts/one-touch-deploy.sh` — Terraform-only apply

Re-runs Terraform without touching the VM:

```bash
./one-touch-deploy.sh production
```

Use this when you've changed Terraform config (not the VM or app).

---

## 8. GitHub Actions Secrets Reference

### SSH secrets (set by `setup.sh` Phase 5)

| Secret | Value | Set by |
|--------|-------|--------|
| `GCP_VM_HOST` | VM external IP (e.g. `34.x.x.x`) | `setup.sh` |
| `GCP_VM_USER` | VM OS username (e.g. `ubuntu`) | `setup.sh` |
| `GCP_VM_SSH_KEY` | Private key content from `~/.ssh/netrotrack_github_actions` | `setup.sh` |
| `GCP_VM_SSH_PORT` | SSH port (default `22`) | `setup.sh` |

### App secrets (set manually)

| Secret | Set by |
|--------|--------|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | You (manual) |
| `REDIS_PASSWORD` | You (manual) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | You (manual) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | You (manual) |
| `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | You (manual) |
| `GOOGLE_MAPS_API_KEY` | You (manual) |

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `terraform init` fails | GCS state bucket doesn't exist | Re-run `setup.sh` — Phase 2 creates it |
| SSL cert not provisioning | First-time cert takes time | Wait 5–20 min; check GCP Console → Network Services → SSL Certificates |
| Health check fails after deploy | Backend not started yet | Push to `production` branch; `docker ps` on VM |
| GitHub Actions SSH fails | SSH key not registered | Re-run `setup.sh` Phase 5, or add `GCP_VM_HOST`/`GCP_VM_SSH_KEY` manually |
| DNS not resolving domain | A record missing | Add A record: `<domain>` → `terraform output load_balancer_ip` |
| `docker: permission denied` on VM | User not in docker group | `gcloud compute ssh <vm> -- sudo usermod -aG docker ubuntu; newgrp docker` |
| `.env` file empty after deploy | GitHub secrets not set | Add app secrets to GitHub → production environment |

### Useful commands

```bash
# Check containers on VM
gcloud compute ssh netro-track-prod --zone=us-central1-a -- docker ps

# View backend logs
gcloud compute ssh netro-track-prod --zone=us-central1-a \
  -- docker compose -f /opt/netrotrack/docker-compose.yml logs backend --tail=50

# Check health endpoint
curl https://netro-track-api.netrofusion.in/health

# Re-apply Terraform only
cd netrotrack-one-touch/scripts && ./one-touch-deploy.sh production

# Check Terraform outputs
terraform -chdir=../terraform/environments/production output
```
