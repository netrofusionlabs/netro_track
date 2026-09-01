# NetroTrack — Zero-to-Production Setup Guide

> **Start here.** This guide takes you from a brand-new machine to a fully running
> NetroTrack backend in production — step by step, from zero.

---

## Customizable Values

Every value in this guide is a **default** — you choose your own during `setup.sh`.
Reference this table while going through the steps:

| Value | Default | Your value |
|-------|---------|------------|
| GCP Project ID | `netro-track-prod` | _____________ |
| GCP VM name | `netro-track-prod` | _____________ |
| GCP Zone | `us-central1-a` | _____________ |
| API Domain | `netro-track-api.netrofusion.in` | _____________ |
| GitHub repository | `netrofusionlabs/NetroTrack` | _____________ |
| GitHub environment | `production` | _____________ |
| VM OS username | `ubuntu` | _____________ |
| SSH port | `22` | _____________ |
| SSH key filename | `netrotrack_github_actions` | _____________ |
| Load Balancer static IP | assigned by Terraform | _____________ |

> The Load Balancer IP is **assigned by GCP** when Terraform runs (Phase 4).
> You cannot know it in advance — fill it in after Phase 4 completes.

---

## Who is this for?

Anyone setting up NetroTrack backend infrastructure for the first time, including:
- A new team member onboarding
- Re-deploying to a new GCP VM
- Setting up a staging or secondary environment
- Recovering from a VM failure

---

## What you will have at the end

```
Your machine
    │
    └── runs ./setup.sh once
              │
              ▼
         GCP VM ready
         Docker installed
         /opt/netrotrack/ created
              │
              ▼
         Load Balancer wired
         SSL cert provisioned
         Firewall configured
              │
              ▼
         GitHub Actions secrets set
              │
              └── git push origin production
                        │
                        ▼
                   Backend live at
        https://<your-api-domain>
```

---

## Pre-Conditions Checklist

Complete **every item** before running the setup script.

---

### ✅ A. Google Cloud (GCP)

> Fill in your values in the **Customizable Values** table at the top of this guide before starting.

- [ ] You have a GCP account with **Owner** or **Editor** role on your GCP project
- [ ] A GCP **project** exists — note your **Project ID** (e.g. `my-company-prod`)
- [ ] A **GCP VM** exists in your chosen zone with:
  - OS: Ubuntu 22.04 LTS (or 24.04)
  - An **external IP** (ephemeral or static — doesn't matter)
  - A **service account** attached (any default service account works)
  - VM can have any name — you enter it during `setup.sh` Phase 1
- [ ] Docker is **not yet installed** on the VM (or already installed — script is idempotent)
- [ ] **Firewall check**: No broad rule allowing TCP `:3000` from `0.0.0.0/0` to the VM
  > Terraform will create a scoped rule allowing only GCP LB health-check ranges

---

### ✅ B. DNS

- [ ] You control the DNS for your target domain
- [ ] **After Phase 4 (Terraform apply)**, add an A record:

  ```
  Type:  A
  Name:  <your-subdomain>     (e.g. api, netro-track-api, backend)
  Value: <LB_IP>              ← shown after terraform apply
  TTL:   300
  ```

  > You get the LB IP from `terraform output load_balancer_ip` after Phase 4.
  > A new LB = a new IP. The IP is NOT reused across projects or setups.

---

### ✅ C. GitHub Repository

- [ ] Your repository exists on GitHub (e.g. `netrofusionlabs/NetroTrack`)
- [ ] The `production` branch exists
- [ ] A **GitHub Environment** named `production` is created:
  ```
  GitHub → Your Repository → Settings → Environments → New environment → production
  ```

- [ ] All **app secrets** are added to the `production` environment:

  > Go to: **GitHub → Repo → Settings → Environments → production → Add secret**

  | Secret | What it is |
  |--------|-----------|
  | `POSTGRES_DB` | Database name (e.g. `netrotrack`) |
  | `POSTGRES_USER` | Database username |
  | `POSTGRES_PASSWORD` | Strong password (min 24 chars) |
  | `REDIS_PASSWORD` | Strong password (min 24 chars) |
  | `JWT_ACCESS_SECRET` | Random 64-char string |
  | `JWT_REFRESH_SECRET` | Random 64-char string (different from access) |
  | `R2_ACCOUNT_ID` | Cloudflare R2 account ID |
  | `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
  | `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret |
  | `R2_BUCKET_NAME` | R2 bucket name |
  | `R2_PUBLIC_URL` | R2 public CDN URL |
  | `GOOGLE_MAPS_API_KEY` | Google Maps Platform API key |

  Generate strong secrets with:
  ```bash
  openssl rand -base64 48   # for passwords and JWT secrets
  ```

- [ ] GitHub Actions is **enabled** on the repository
- [ ] GHCR (GitHub Container Registry) package visibility allows the runner to pull images

---

### ✅ D. Cloudflare R2

- [ ] R2 bucket exists with the name matching `R2_BUCKET_NAME`
- [ ] Bucket has public access or a custom domain set (for `R2_PUBLIC_URL`)
- [ ] R2 API token has **Object Read & Write** permissions

---

### ✅ E. Developer Machine

Install the following tools:

#### 1. Google Cloud CLI (`gcloud`)

```bash
# macOS
brew install --cask google-cloud-sdk

# Verify
gcloud --version
```

#### 2. Terraform (must be >= 1.6.0)

```bash
# macOS
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# Verify
terraform --version
```

#### 3. curl and jq

```bash
brew install curl jq

# Verify
curl --version && jq --version
```

#### 4. GitHub CLI — `gh` (optional)

Only needed if you want `setup.sh` to auto-register secrets in Phase 5.
Without it, you add 4 secrets manually on GitHub — still works fine.

```bash
brew install gh

# Verify
gh --version
```

---

### ✅ F. Authentication

#### Authenticate gcloud (required)

```bash
# Step 1: Login with your Google account
gcloud auth login

# Step 2: Set up Application Default Credentials (required by Terraform provider)
gcloud auth application-default login

# Verify — your account should appear as ACTIVE
gcloud auth list
```

#### Authenticate GitHub CLI (optional — only for auto-registering secrets)

```bash
gh auth login
# → Choose: GitHub.com
# → Choose: HTTPS
# → When prompted: paste a GitHub Personal Access Token
#   Required scopes: repo, write:packages, read:org

# Verify
gh auth status
```

Generate a GitHub PAT at:
`GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)`

---

## Running the Setup Script

Once all pre-conditions are met:

```bash
cd netrotrack-one-touch/scripts
./setup.sh
```

---

## Phase-by-Phase Walkthrough

### Phase 0 — Prerequisites check

Automatically checks `gcloud`, `terraform`, `curl`, `jq` are installed.
Shows a **warning** (not an error) if `gh` is missing.
Verifies gcloud is authenticated.

Then lists **all GCP accounts** currently logged in and asks you to pick one:

```
  Available GCP accounts:
    [1]  personal@gmail.com
    [2]  work@yourcompany.com   (active)

  Select account [2]: _
```

Switches the active account to whichever you choose.

---

### Phase 1 — Configuration

You answer 8 questions. Press **Enter** to accept the default shown in `[brackets]`,
or type your own value.

```
GCP Project ID       [netro-track-prod]:        ← your GCP project ID
GCP VM name          [netro-track-prod]:        ← your VM name (any name)
GCP Zone             [us-central1-a]:           ← zone where your VM lives
API Domain           [netro-track-api.netrofusion.in]:  ← your API domain
GitHub repository    [netrofusionlabs/NetroTrack]:      ← owner/repo
GitHub environment   [production]:              ← GH environment name
VM OS username       [ubuntu]:                  ← OS user on the VM
SSH port             [22]:                      ← SSH port on the VM
SSH key path         [~/.ssh/netrotrack_github_actions]:
                      ↳ generates a new ed25519 key pair if file doesn't exist
                      ↳ uses existing key if file already exists
```

Script shows a **summary** and asks for confirmation before doing anything.

---

### Phase 2 — GCS Terraform State Bucket

Creates the Terraform remote state bucket if it doesn't exist:

```
gs://netrotrack-prod-terraform-state-<your-project-id>
```

> If you use a different project ID, the bucket name changes accordingly.
> e.g. project `myco-prod` → bucket `netrotrack-prod-terraform-state-myco-prod`

Properties: versioned, private, uniform bucket-level access.

> Already exists → skipped silently.

---

### Phase 3 — VM Bootstrap

Connects to **your VM** via `gcloud compute ssh` and:

1. Installs **Docker CE** + Docker Compose plugin (idempotent — skipped if already installed)
2. Adds your VM user to the `docker` group
3. Creates the app directory structure:
   ```
   /opt/netrotrack/
   ├── docker-compose.yml    ← copied from your repo
   ├── .env                  ← placeholder (GitHub Actions writes real values)
   └── postgres/
       └── data/             ← PostgreSQL data volume (persistent)
   ```
4. Injects the GitHub Actions SSH public key into **your VM's** metadata

Expected output:
```
  ✔  VM bootstrap complete
  ✔  Docker installed + /opt/netrotrack/ ready
```

---

### Phase 4 — Terraform

Creates all GCP infrastructure for **your project and VM**:

```
google_compute_instance_group        ← wraps your VM into a group
google_compute_firewall              ← LB health-check ranges → your VM :3000
google_compute_global_address        ← new static IP (unique per setup)
google_compute_health_check          ← HTTP /health on :3000
google_compute_backend_service       ← EXTERNAL_MANAGED load balancer
google_compute_managed_ssl_certificate  ← auto-renewing TLS for your domain
google_compute_url_map               ← HTTPS routing
google_compute_target_https_proxy    ← TLS termination
google_compute_global_forwarding_rule   ← :443 → HTTPS proxy
google_compute_url_map (redirect)    ← HTTP redirect map
google_compute_target_http_proxy     ← HTTP redirect proxy
google_compute_global_forwarding_rule   ← :80 → HTTPS redirect
```

Script shows the plan and asks for confirmation before applying.

After apply you will see:

```
  ✔  Infrastructure deployed!
  ✔  Load Balancer IP: <YOUR_NEW_LB_IP>     ← unique to your deployment
  ✔  API URL: https://<your-api-domain>
```

> **Do this now if not done yet:**
> Add DNS A record: `<your-subdomain>` → `<YOUR_NEW_LB_IP>`

---

### Phase 5 — GitHub Actions SSH Secrets

Shows the 4 secrets that need to exist in GitHub for CI/CD to work:

```
  GCP_VM_HOST      <your-vm-external-ip>
  GCP_VM_USER      <your-vm-user>
  GCP_VM_SSH_KEY   (from ~/.ssh/<your-key-file>)
  GCP_VM_SSH_PORT  <your-ssh-port>
```

Then asks how to register them:

```
  How do you want to register the SSH secrets?
    [1]  Auto-register via GitHub CLI  (requires: gh auth login)
    [2]  Already added manually — skip this phase
```

**Option 1 — Auto:** registers all 4 secrets directly to your GitHub repo's `production` environment.

**Option 2 — Manual:** prints exact values + the GitHub URL to paste them yourself.

> App secrets (DB, JWT, R2, Maps) are **never touched** — they stay as you set them.

---

### Phase 6 — Health Check

Polls `https://<your-domain>/health` every 10 seconds.

> **Recommended: skip on first run.** Reason:
> - SSL cert takes 5–20 min to provision (DNS must resolve first)
> - Backend containers don't start until the first `git push`

---

## After Setup — First Deployment

```bash
git push origin production
```

GitHub Actions (`production.yml`) runs automatically:

```
1. Build Docker image

2. Push to GHCR

3. SSH into your VM using GCP_VM_HOST + GCP_VM_SSH_KEY
   → Write /opt/netrotrack/.env from GitHub secrets
   → docker compose pull backend
   → docker compose up -d postgres redis
   → (wait)
   → docker compose up -d backend
   → curl http://127.0.0.1:3000/health → 200 ✔

4. Done
```

---

## Verify Everything Works

Replace `<vm-name>`, `<zone>`, and `<your-domain>` with your actual values:

```bash
# 1. Check containers are running on your VM
gcloud compute ssh <vm-name> --zone=<zone> -- docker ps

# Expected:
# netrotrack-backend    Up X minutes
# netrotrack-postgres   Up X minutes (healthy)
# netrotrack-redis      Up X minutes (healthy)

# 2. Check health endpoint through the load balancer
curl https://<your-domain>/health
# Expected: HTTP 200, {"status":"ok"}

# 3. Check backend logs
gcloud compute ssh <vm-name> --zone=<zone> \
  -- docker compose -f /opt/netrotrack/docker-compose.yml logs backend --tail=30
```

---

## Subsequent Deploys

Just push code:

```bash
git push origin production
```

No manual steps. GitHub Actions does everything automatically.

---

## Common Issues

| Problem | Fix |
|---------|-----|
| `terraform init` fails with backend error | Re-run `setup.sh` — Phase 2 creates the GCS bucket |
| SSL cert stays in `PROVISIONING` state | Wait up to 20 min. DNS A record must resolve to LB IP first |
| GitHub Actions SSH: connection refused | `GCP_VM_HOST` is wrong — re-run `setup.sh` Phase 5 |
| Containers restarting on VM | `.env` is missing secrets. Push to `production` to rewrite it |
| `permission denied` running docker | User not in docker group: `sudo usermod -aG docker <user>` on VM |
| Images fail to pull from GHCR | Check GHCR package visibility settings for your org |
| Health check returns 502 | Backend starting up — wait 30s, check `docker logs netrotrack-backend` |
| Domain not resolving | DNS A record missing. `dig <your-domain>` should return your LB IP |

---

## Quick Reference Commands

Replace `<vm-name>` and `<zone>` with your values from Phase 1.

```bash
# Re-run full setup (safe to re-run, idempotent)
cd netrotrack-one-touch/scripts && ./setup.sh

# Re-apply Terraform only (no VM changes)
cd netrotrack-one-touch/scripts && ./one-touch-deploy.sh production

# Re-bootstrap VM only
gcloud compute scp scripts/vm-bootstrap.sh <user>@<vm-name>:/tmp/ --zone=<zone>
gcloud compute ssh <vm-name> --zone=<zone> -- sudo /tmp/vm-bootstrap.sh <user>

# SSH into VM
gcloud compute ssh <vm-name> --zone=<zone>

# View Terraform outputs (LB IP, API URL)
terraform -chdir=netrotrack-one-touch/terraform/environments/production output

# Tail backend logs live
gcloud compute ssh <vm-name> --zone=<zone> \
  -- docker compose -f /opt/netrotrack/docker-compose.yml logs -f backend

# Restart only backend (no DB/Redis downtime)
gcloud compute ssh <vm-name> --zone=<zone> \
  -- docker compose -f /opt/netrotrack/docker-compose.yml restart backend
```

---

## Files Reference

```
netrotrack-one-touch/
├── scripts/
│   ├── setup.sh              ← Run this. Does everything.
│   ├── vm-bootstrap.sh       ← Runs on VM. Docker install + dirs.
│   └── one-touch-deploy.sh   ← Terraform only. No VM changes.
├── terraform/
│   └── environments/
│       └── production/
│           ├── main.tf
│           ├── variables.tf
│           ├── outputs.tf
│           └── terraform.tfvars   ← Written by setup.sh with your values
└── docs/
    ├── SETUP_GUIDE.md              ← This file. Start here.
    └── ONE-TOUCH-DEPLOYMENT.md     ← Full reference and architecture docs
```

On your VM after setup:

```
/opt/netrotrack/
├── docker-compose.yml   ← Written by setup.sh Phase 3
├── .env                 ← Written by GitHub Actions on every deploy
└── postgres/
    └── data/            ← PostgreSQL data (persistent across deploys)
```
