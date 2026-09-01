#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-production}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="$ROOT/terraform/environments/$ENVIRONMENT"

if [[ ! -d "$TF_DIR" ]]; then
  echo "Unknown environment: $ENVIRONMENT"
  exit 1
fi

echo "==> Terraform init"
terraform -chdir="$TF_DIR" init

echo "==> Terraform validate"
terraform -chdir="$TF_DIR" validate

echo "==> Terraform plan"
terraform -chdir="$TF_DIR" plan -out=tfplan

echo "==> Terraform apply"
terraform -chdir="$TF_DIR" apply -auto-approve tfplan

echo "==> Infrastructure verification"
IP="$(terraform -chdir="$TF_DIR" output -raw load_balancer_ip)"
DOMAIN="$(terraform -chdir="$TF_DIR" output -raw api_url)"

echo "Load balancer IP: $IP"
echo "API URL: $DOMAIN"

echo "Waiting for HTTPS health endpoint..."
for i in {1..30}; do
  if curl -fsS "$DOMAIN/health"; then
    echo
    echo "Infrastructure is ready. Application images are deployed by GitHub Actions."
    exit 0
  fi
  sleep 10
done

echo "Deployment completed but health verification timed out."
exit 2
