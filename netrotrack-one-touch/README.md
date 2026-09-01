# NetroTrack One-Touch Deployment

Terraform + Docker + GitHub Actions deployment blueprint for NetroTrack on Google Cloud.

## Target architecture

- An existing GCP Compute Engine VM
- Docker Compose
- PostgreSQL 16 on the VM
- Redis 7
- Global External Application Load Balancer
- Static global IP
- Google-managed TLS certificate
- HTTP → HTTPS redirect
- Private Google Cloud Storage bucket for Terraform state
- Unmanaged instance group for the single VM
- Health check: `/health`
- GHCR for application images

This uses an existing VM with PostgreSQL and Redis, fronted by a global external Application Load Balancer.

## Important design choice

Terraform does not create, replace, configure, or store secrets for the VM. It reads the existing VM, creates an unmanaged instance group for it, restricts port 3000 to Google load-balancer probes/proxies, and provisions the load balancer plus its private Terraform-state bucket.

Before applying, remove any pre-existing broad ingress rule that exposes TCP 3000 to the internet; Terraform cannot safely delete a firewall rule it does not own.

GitHub Actions owns application build/publish and deploys to the VM over SSH. Runtime secrets stay in GitHub Environment secrets and are written only to `/opt/netrotrack/.env` during deployment.

Do **not** put application secrets or database passwords directly into Terraform variables. Use Secret Manager or a protected deployment mechanism.

## Quick start

```bash
cd netrotrack-one-touch/terraform/environments/production
cp terraform.tfvars.example terraform.tfvars
# edit values
terraform init
terraform plan
terraform apply
```

Then create an A record for the configured domain that points to the Terraform `load_balancer_ip` output. Google-managed TLS becomes active only after DNS resolves to that IP.

For a normal application deployment, push to the `production` branch. The existing workflow builds the image, deploys it to the existing VM, and checks the local health endpoint.

For infrastructure changes:

```bash
netrotrack-one-touch/scripts/one-touch-deploy.sh production
```

See `docs/ONE-TOUCH-DEPLOYMENT.md`.
