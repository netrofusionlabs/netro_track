#!/usr/bin/env bash
# =============================================================================
# NetroTrack — Interactive One-Touch Setup
# =============================================================================
# Usage: ./setup.sh
#
# What this script does:
#   Phase 0 — Checks prerequisites (gcloud, terraform, gh, curl, jq)
#   Phase 1 — Collects infra config interactively (VM, zone, domain, SSH key)
#             NOTE: App secrets (DB, JWT, R2) live in GitHub Actions — not collected here
#   Phase 2 — Bootstraps the GCS Terraform state bucket if it doesn't exist
#   Phase 3 — Provisions the GCP VM (Docker CE, /opt/netrotrack/, docker-compose.yml)
#   Phase 4 — Runs Terraform (init → validate → plan → apply)
#   Phase 5 — Registers GitHub Actions SSH secrets (GCP_VM_HOST, GCP_VM_USER, GCP_VM_SSH_KEY)
#   Phase 6 — Polls HTTPS health endpoint for end-to-end validation
# =============================================================================
set -euo pipefail
IFS=$'\n\t'

# ─── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ONE_TOUCH_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${ONE_TOUCH_DIR}/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
BOOTSTRAP_SCRIPT="${SCRIPT_DIR}/vm-bootstrap.sh"

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

TOTAL_PHASES=6

# ─── Helpers ──────────────────────────────────────────────────────────────────
phase() {
  echo -e "\n${BOLD}${BLUE}[Phase $1/${TOTAL_PHASES}] $2${RESET}"
  echo -e "${DIM}──────────────────────────────────────────────────────${RESET}"
}

ok()   { echo -e "  ${GREEN}✔${RESET}  $1"; }
info() { echo -e "  ${CYAN}→${RESET}  $1"; }
warn() { echo -e "  ${YELLOW}⚠${RESET}  $1"; }
die()  { echo -e "\n  ${RED}✖  ERROR: $1${RESET}\n" >&2; exit 1; }

prompt() {
  local var_name="$1"
  local question="$2"
  local default="${3:-}"
  local value

  if [[ -n "$default" ]]; then
    echo -ne "  ${BOLD}${question}${RESET} ${DIM}[${default}]${RESET}: "
  else
    echo -ne "  ${BOLD}${question}${RESET}: "
  fi
  read -r value
  value="${value:-$default}"
  [[ -z "$value" ]] && die "${question} is required."
  printf -v "$var_name" '%s' "$value"
}

confirm() {
  local question="$1"
  local default="${2:-Y}"
  local answer
  echo -ne "\n  ${BOLD}${question}${RESET} ${DIM}[${default}/n]${RESET}: "
  read -r answer
  answer="${answer:-$default}"
  [[ "${answer}" =~ ^[Nn] ]] && return 1
  return 0
}

# ─── Banner ───────────────────────────────────────────────────────────────────
clear
echo -e "${BOLD}${CYAN}"
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║   NetroTrack — One-Touch Backend Setup               ║"
echo "  ║   Infrastructure + VM Provisioning                   ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo -e "${RESET}"
echo -e "  ${DIM}Provisions GCP VM, wires Load Balancer via Terraform,${RESET}"
echo -e "  ${DIM}and registers GitHub Actions SSH secrets for CI/CD.${RESET}"
echo
echo -e "  ${YELLOW}App secrets (DB, JWT, R2, Maps) already live in GitHub Actions${RESET}"
echo -e "  ${YELLOW}— this script does NOT ask for them.${RESET}"
echo

# ─── Phase 0: Prerequisites ───────────────────────────────────────────────────
phase 0 "Checking prerequisites"

check_tool() {
  local tool="$1"
  local hint="$2"
  if command -v "${tool}" &>/dev/null; then
    ok "${tool} — found"
  else
    die "${tool} is required but not installed.\n  ${hint}"
  fi
}

check_tool gcloud    "Install: https://cloud.google.com/sdk/docs/install"
check_tool terraform "Install: https://developer.hashicorp.com/terraform/install"
check_tool curl      "Install via your package manager"
check_tool jq        "Install: brew install jq"

# gh is optional — only needed in Phase 5 if user wants auto-register
if command -v gh &>/dev/null; then
  ok "gh (GitHub CLI) — found  ${DIM}(needed for auto-registering secrets in Phase 5)${RESET}"
else
  warn "gh (GitHub CLI) not found — you can still add secrets manually in Phase 5"
  warn "  Install: https://cli.github.com"
fi

echo
info "Checking gcloud authentication..."
if ! gcloud auth print-access-token &>/dev/null; then
  die "gcloud is not authenticated.\n  Run: gcloud auth login && gcloud auth application-default login"
fi

# List all available accounts and let the user pick one
echo
echo -e "  ${BOLD}Available GCP accounts:${RESET}"
ACCOUNTS=()
ACTIVE_ACCOUNT=""
ACCOUNT_NUM=1

while IFS= read -r line; do
  # Format: "  email@domain.com  ACTIVE" or "  email@domain.com"
  ACCT=$(echo "${line}" | awk '{print $1}')
  IS_ACTIVE=$(echo "${line}" | grep -c "ACTIVE" || true)
  ACCOUNTS+=("${ACCT}")
  if [[ "${IS_ACTIVE}" -gt 0 ]]; then
    ACTIVE_ACCOUNT="${ACCT}"
    printf "  ${GREEN}  [%d]${RESET}  %-45s ${GREEN}(active)${RESET}\n" "${ACCOUNT_NUM}" "${ACCT}"
  else
    printf "  ${DIM}  [%d]${RESET}  %-45s\n" "${ACCOUNT_NUM}" "${ACCT}"
  fi
  (( ACCOUNT_NUM++ ))
done < <(gcloud auth list --format="value(account,status)" 2>/dev/null)

TOTAL_ACCOUNTS="${#ACCOUNTS[@]}"

if [[ "${TOTAL_ACCOUNTS}" -eq 0 ]]; then
  die "No authenticated GCP accounts found.\n  Run: gcloud auth login"
elif [[ "${TOTAL_ACCOUNTS}" -eq 1 ]]; then
  SELECTED_ACCOUNT="${ACCOUNTS[0]}"
  ok "Using account: ${SELECTED_ACCOUNT}"
else
  echo
  # Find the index of the active account to use as default
  DEFAULT_IDX=1
  for idx in "${!ACCOUNTS[@]}"; do
    if [[ "${ACCOUNTS[$idx]}" == "${ACTIVE_ACCOUNT}" ]]; then
      DEFAULT_IDX=$(( idx + 1 ))
      break
    fi
  done

  echo -ne "  ${BOLD}Select account${RESET} ${DIM}[${DEFAULT_IDX}]${RESET}: "
  read -r ACCT_CHOICE
  ACCT_CHOICE="${ACCT_CHOICE:-${DEFAULT_IDX}}"

  if ! [[ "${ACCT_CHOICE}" =~ ^[0-9]+$ ]] || \
     [[ "${ACCT_CHOICE}" -lt 1 ]] || \
     [[ "${ACCT_CHOICE}" -gt "${TOTAL_ACCOUNTS}" ]]; then
    die "Invalid selection '${ACCT_CHOICE}'. Enter a number between 1 and ${TOTAL_ACCOUNTS}."
  fi

  SELECTED_ACCOUNT="${ACCOUNTS[$(( ACCT_CHOICE - 1 ))]}"
fi

# Activate the selected account for this session
if [[ "${SELECTED_ACCOUNT}" != "${ACTIVE_ACCOUNT}" ]]; then
  info "Switching active account to ${SELECTED_ACCOUNT}..."
  gcloud config set account "${SELECTED_ACCOUNT}" --quiet
fi
ok "Using GCP account: ${SELECTED_ACCOUNT}"


[[ -f "${COMPOSE_FILE}" ]] || die "docker-compose.prod.yml not found at ${COMPOSE_FILE}"
ok "docker-compose.prod.yml found"

[[ -f "${BOOTSTRAP_SCRIPT}" ]] || die "vm-bootstrap.sh not found at ${BOOTSTRAP_SCRIPT}"
ok "vm-bootstrap.sh found"

# ─── Phase 1: Configuration ───────────────────────────────────────────────────
phase 1 "Configuration"
echo -e "  ${DIM}Press Enter to accept defaults shown in [brackets].${RESET}"
echo -e "  ${DIM}App secrets (DB, JWT, R2, Maps) already in GitHub Actions — not collected here.${RESET}\n"

echo -e "  ${BOLD}— GCP Infrastructure —${RESET}"
prompt GCP_PROJECT_ID  "GCP Project ID"           "netro-track-prod"
prompt GCP_VM_NAME     "GCP VM name"               "netro-track-prod"
prompt GCP_ZONE        "GCP Zone"                  "us-central1-a"

echo
echo -e "  ${BOLD}— Application —${RESET}"
prompt DOMAIN          "API Domain"                "netro-track-api.netrofusion.in"
# Sanitize domain (remove http://, https://, and trailing slashes)
DOMAIN=$(echo "${DOMAIN}" | sed -E 's|https?://||g' | sed 's|/.*||')

echo
echo -e "  ${BOLD}— GitHub & Environment —${RESET}"
prompt GH_REPO         "GitHub repository"         "netrofusionlabs/netro_track"
prompt GH_ENV          "Environment Name (e.g. production, test, staging)" "production"

# Set up isolated Terraform directory for this environment
TF_DIR="${ONE_TOUCH_DIR}/terraform/environments/${GH_ENV}"
if [[ ! -d "${TF_DIR}" ]]; then
  info "Environment '${GH_ENV}' doesn't exist yet. Creating from production template..."
  mkdir -p "${TF_DIR}"
  # Copy .tf files but NOT state files or .terraform directories
  cp "${ONE_TOUCH_DIR}/terraform/environments/production/"*.tf "${TF_DIR}/" 2>/dev/null || true
  ok "Created Terraform directory: ${TF_DIR}"
fi

echo
echo -e "  ${BOLD}— VM SSH Access —${RESET}"
prompt VM_USER         "VM OS username"            "ubuntu"
prompt SSH_PORT        "SSH port"                  "22"

# SSH Key setup
echo
echo -e "  ${BOLD}— GitHub Actions SSH Key —${RESET}"
echo -e "  ${DIM}This key lets GitHub Actions SSH into the VM to deploy containers.${RESET}"
DEFAULT_KEY="${HOME}/.ssh/netrotrack_github_actions"
prompt SSH_KEY_PATH "Private key path (Enter to generate new)" "${DEFAULT_KEY}"

if [[ -f "${SSH_KEY_PATH}" ]]; then
  ok "Using existing key: ${SSH_KEY_PATH}"
  [[ -f "${SSH_KEY_PATH}.pub" ]] || die "Public key not found: ${SSH_KEY_PATH}.pub"
else
  info "Generating new ed25519 key pair at ${SSH_KEY_PATH}..."
  ssh-keygen -t ed25519 -C "netrotrack-github-actions@$(date +%Y%m%d)" \
    -f "${SSH_KEY_PATH}" -N "" -q
  ok "Key pair generated"
fi

SSH_PUBLIC_KEY="$(cat "${SSH_KEY_PATH}.pub")"
SSH_PRIVATE_KEY="$(cat "${SSH_KEY_PATH}")"

# Derive region
GCP_REGION="${GCP_ZONE%-*}"

# Terraform state bucket name (isolated by environment)
STATE_BUCKET="netrotrack-${GH_ENV}-tfstate-${GCP_PROJECT_ID}"


# Summary
echo
echo -e "  ${BOLD}━━━━━━━━━━━━━━ Configuration Summary ━━━━━━━━━━━━━━━${RESET}"
printf "  %-24s %s\n" "GCP Project:" "${GCP_PROJECT_ID}"
printf "  %-24s %s (%s)\n" "VM:" "${GCP_VM_NAME}" "${GCP_ZONE}"
printf "  %-24s %s\n" "Domain:" "${DOMAIN}"
printf "  %-24s %s  (env: ${GH_ENV})\n" "GitHub repo:" "${GH_REPO}"
printf "  %-24s %s (port ${SSH_PORT})\n" "VM user:" "${VM_USER}"
printf "  %-24s %s\n" "SSH key:" "${SSH_KEY_PATH}"
printf "  %-24s gs://%s\n" "State bucket:" "${STATE_BUCKET}"
echo -e "  ${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

confirm "Proceed with this configuration?" || { echo "Aborted."; exit 0; }

# ─── Phase 2: GCS State Bucket ────────────────────────────────────────────────
phase 2 "GCS Terraform State Bucket"

info "Checking bucket: gs://${STATE_BUCKET}..."

if gcloud storage buckets describe "gs://${STATE_BUCKET}" \
    --project="${GCP_PROJECT_ID}" &>/dev/null 2>&1; then
  ok "Bucket already exists"
else
  info "Creating state bucket..."
  gcloud storage buckets create "gs://${STATE_BUCKET}" \
    --project="${GCP_PROJECT_ID}" \
    --location="US" \
    --uniform-bucket-level-access \
    --public-access-prevention
  gcloud storage buckets update "gs://${STATE_BUCKET}" --versioning
  ok "Created: gs://${STATE_BUCKET} (versioned, private)"
fi

# Update bucket name in main.tf if it differs
TF_MAIN="${TF_DIR}/main.tf"
CURRENT_BUCKET=$(grep -oE 'bucket\s*=\s*"[^"]+"' "${TF_MAIN}" | grep -oE '"[^"]+"' | tr -d '"' | head -1 || true)
if [[ -n "${CURRENT_BUCKET}" && "${CURRENT_BUCKET}" != "${STATE_BUCKET}" ]]; then
  info "Updating state bucket in main.tf: \"${CURRENT_BUCKET}\" → \"${STATE_BUCKET}\""
  # Use Python to avoid sed special-character issues with $ { } in old bucket name
  python3 - "${TF_MAIN}" "${CURRENT_BUCKET}" "${STATE_BUCKET}" <<'PYEOF'
import sys, re
filepath, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
with open(filepath, 'r') as f:
    content = f.read()
updated = content.replace(f'bucket = "{old}"', f'bucket = "{new}"')
with open(filepath, 'w') as f:
    f.write(updated)
PYEOF
  ok "main.tf backend bucket updated"
elif [[ -z "${CURRENT_BUCKET}" ]]; then
  warn "Could not find existing bucket = \"...\" line in main.tf — please verify manually"
else
  ok "main.tf backend bucket already correct"
fi

# ─── Phase 3: VM Bootstrap ────────────────────────────────────────────────────
phase 3 "VM Bootstrap"

info "Fetching VM external IP from GCP..."
VM_EXTERNAL_IP=$(gcloud compute instances describe "${GCP_VM_NAME}" \
  --project="${GCP_PROJECT_ID}" \
  --zone="${GCP_ZONE}" \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)" 2>/dev/null || true)

[[ -n "${VM_EXTERNAL_IP}" ]] || \
  die "Could not fetch external IP for VM '${GCP_VM_NAME}'.\n  Does it exist and have an external IP in zone ${GCP_ZONE}?"
ok "VM external IP: ${VM_EXTERNAL_IP}"

# Add GitHub Actions public key to VM metadata (idempotent)
info "Injecting GitHub Actions SSH public key into VM metadata..."
EXISTING_KEYS=$(gcloud compute instances describe "${GCP_VM_NAME}" \
  --project="${GCP_PROJECT_ID}" \
  --zone="${GCP_ZONE}" \
  --format="value(metadata.ssh-keys)" 2>/dev/null || echo "")

if echo "${EXISTING_KEYS}" | grep -qF "${SSH_PUBLIC_KEY}" 2>/dev/null; then
  ok "SSH key already present in VM metadata"
else
  NEW_KEY_ENTRY="${VM_USER}:${SSH_PUBLIC_KEY}"
  if [[ -n "${EXISTING_KEYS}" ]]; then
    MERGED_KEYS="${EXISTING_KEYS}"$'\n'"${NEW_KEY_ENTRY}"
  else
    MERGED_KEYS="${NEW_KEY_ENTRY}"
  fi
  gcloud compute instances add-metadata "${GCP_VM_NAME}" \
    --project="${GCP_PROJECT_ID}" \
    --zone="${GCP_ZONE}" \
    --metadata="ssh-keys=${MERGED_KEYS}"
  ok "SSH key injected into VM metadata"
fi

# Copy files to VM
info "Copying docker-compose.prod.yml to VM..."
gcloud compute scp \
  "${COMPOSE_FILE}" \
  "${VM_USER}@${GCP_VM_NAME}:/tmp/docker-compose.yml" \
  --project="${GCP_PROJECT_ID}" \
  --zone="${GCP_ZONE}" \
  --quiet

info "Copying vm-bootstrap.sh to VM..."
gcloud compute scp \
  "${BOOTSTRAP_SCRIPT}" \
  "${VM_USER}@${GCP_VM_NAME}:/tmp/vm-bootstrap.sh" \
  --project="${GCP_PROJECT_ID}" \
  --zone="${GCP_ZONE}" \
  --quiet

info "Running VM bootstrap (may take 2–3 min if Docker needs installation)..."
gcloud compute ssh "${VM_USER}@${GCP_VM_NAME}" \
  --project="${GCP_PROJECT_ID}" \
  --zone="${GCP_ZONE}" \
  --command="chmod +x /tmp/vm-bootstrap.sh && sudo /tmp/vm-bootstrap.sh '${VM_USER}'" \
  --quiet

ok "VM bootstrap complete"
ok "Docker installed + /opt/netrotrack/ ready"
ok "docker-compose.yml deployed to VM"

# ─── Phase 4: Terraform ───────────────────────────────────────────────────────
phase 4 "Terraform — Load Balancer, Firewall & SSL"

info "Writing terraform.tfvars..."
cat > "${TF_DIR}/terraform.tfvars" <<EOF
project_id                 = "${GCP_PROJECT_ID}"
name                       = "netrotrack-${GH_ENV}"
region                     = "${GCP_REGION}"
zone                       = "${GCP_ZONE}"
existing_vm_name           = "${GCP_VM_NAME}"
domain                     = "${DOMAIN}"
firewall_name              = "netrotrack-${GH_ENV}-allow-lb"
global_address_name        = "netrotrack-${GH_ENV}-ip"
health_check_name          = "netrotrack-${GH_ENV}-health"
backend_service_name       = "netrotrack-${GH_ENV}-backend"
https_url_map_name         = "netrotrack-${GH_ENV}-https-map"
certificate_name           = "netrotrack-${GH_ENV}-cert"
https_proxy_name           = "netrotrack-${GH_ENV}-https-proxy"
https_forwarding_rule_name = "netrotrack-${GH_ENV}-https-rule"
http_redirect_url_map_name = "netrotrack-${GH_ENV}-http-map"
http_redirect_proxy_name   = "netrotrack-${GH_ENV}-http-proxy"
http_forwarding_rule_name  = "netrotrack-${GH_ENV}-http-rule"
EOF
ok "terraform.tfvars written"

info "terraform init..."
terraform -chdir="${TF_DIR}" init -input=false -reconfigure

info "terraform validate..."
terraform -chdir="${TF_DIR}" validate
ok "Configuration is valid"

info "terraform plan..."
terraform -chdir="${TF_DIR}" plan -out="${TF_DIR}/tfplan" -input=false

if confirm "Apply this Terraform plan?"; then
  info "terraform apply..."
  terraform -chdir="${TF_DIR}" apply -auto-approve "${TF_DIR}/tfplan"
  rm -f "${TF_DIR}/tfplan"

  LB_IP=$(terraform -chdir="${TF_DIR}" output -raw load_balancer_ip 2>/dev/null || echo "N/A")
  API_URL=$(terraform -chdir="${TF_DIR}" output -raw api_url 2>/dev/null || echo "https://${DOMAIN}")
  ok "Infrastructure deployed!"
  ok "Load Balancer IP: ${LB_IP}"
  ok "API URL: ${API_URL}"
else
  warn "Terraform apply skipped. Run manually when ready:"
  warn "  terraform -chdir=${TF_DIR} apply"
  LB_IP="(not applied yet)"
  API_URL="https://${DOMAIN}"
fi

# ─── Generate App Secrets ─────────────────────────────────────────────────────
info "Generating secure database secrets for ${GH_ENV}..."
POSTGRES_DB="netrotrack_db"
POSTGRES_USER="netrotrack_user"
POSTGRES_PASSWORD=$(openssl rand -hex 16)
REDIS_PASSWORD=$(openssl rand -hex 16)

# ─── Phase 5: GitHub Actions SSH Secrets ─────────────────────────────────────
phase 5 "GitHub Actions SSH Secrets"

echo -e "  The following 4 secrets need to exist in GitHub:"
echo -e "  ${DIM}(${GH_REPO} → Settings → Environments → ${GH_ENV} → Secrets)${RESET}\n"
printf "  ${BOLD}%-24s${RESET} %s\n" "GCP_VM_HOST"     "${VM_EXTERNAL_IP}"
printf "  ${BOLD}%-24s${RESET} %s\n" "GCP_VM_USER"     "${VM_USER}"
printf "  ${BOLD}%-24s${RESET} %s\n" "GCP_VM_SSH_KEY"  "(private key from ${SSH_KEY_PATH})"
printf "  ${BOLD}%-24s${RESET} %s\n" "GCP_VM_SSH_PORT" "${SSH_PORT}"
printf "  ${BOLD}%-24s${RESET} %s\n" "POSTGRES_DB"       "${POSTGRES_DB}"
printf "  ${BOLD}%-24s${RESET} %s\n" "POSTGRES_USER"     "${POSTGRES_USER}"
printf "  ${BOLD}%-24s${RESET} %s\n" "POSTGRES_PASSWORD" "${POSTGRES_PASSWORD}"
printf "  ${BOLD}%-24s${RESET} %s\n" "REDIS_PASSWORD"    "${REDIS_PASSWORD}"
echo
echo -e "  ${DIM}Other App secrets (JWT_*, R2_*, GOOGLE_MAPS_API_KEY)${RESET}"
echo -e "  ${DIM}must already exist in GitHub — this script never touches them.${RESET}"
echo
echo -e "  ${BOLD}How do you want to register the SSH secrets?${RESET}"
echo -e "  ${CYAN}  [1]${RESET}  Auto-register via GitHub CLI  ${DIM}(requires: gh auth login)${RESET}"
echo -e "  ${CYAN}  [2]${RESET}  Already added manually — skip this phase"
echo
echo -ne "  ${BOLD}Select option${RESET} ${DIM}[1]${RESET}: "
read -r SECRET_CHOICE
SECRET_CHOICE="${SECRET_CHOICE:-1}"

case "${SECRET_CHOICE}" in
  1)
    SKIP_GH=0
    while ! gh auth status &>/dev/null; do
      warn "GitHub CLI is not authenticated."
      echo -e "\n  ${YELLOW}⚠ IMPORTANT: Make sure you log in with your Netrofusion GitHub account!${RESET}"
      echo -ne "  ${BOLD}Run 'gh auth login' in another terminal, then press Enter (or type 'skip' to skip)${RESET}: "
      read -r GH_RETRY
      if [[ "${GH_RETRY}" == "skip" ]]; then
        info "Skipping GitHub secret registration."
        SKIP_GH=1
        break
      fi
    done
    
    if [[ "${SKIP_GH}" == "1" ]]; then
      # Do not execute the gh secret set commands below if skipped
      true
    else
    ok "gh CLI authenticated"
    echo

    set_gh_secret() {
      local name="$1"
      local value="$2"
      info "Setting ${name}..."
      printf '%s' "${value}" | gh secret set "${name}" \
        --repo="${GH_REPO}" \
        --env="${GH_ENV}"
      ok "${name} ✔"
    }

    set_gh_secret "GCP_VM_HOST"     "${VM_EXTERNAL_IP}"
    set_gh_secret "GCP_VM_USER"     "${VM_USER}"
    set_gh_secret "GCP_VM_SSH_KEY"  "${SSH_PRIVATE_KEY}"
    set_gh_secret "GCP_VM_SSH_PORT" "${SSH_PORT}"
    
    set_gh_secret "POSTGRES_DB"       "${POSTGRES_DB}"
    set_gh_secret "POSTGRES_USER"     "${POSTGRES_USER}"
    set_gh_secret "POSTGRES_PASSWORD" "${POSTGRES_PASSWORD}"
    set_gh_secret "REDIS_PASSWORD"    "${REDIS_PASSWORD}"
    
    ok "SSH Secrets registered for environment: ${GH_ENV}"
    fi
    ;;
  2)
    warn "Skipped — secrets NOT registered by this script."
    echo
    echo -e "  ${BOLD}Add these manually at:${RESET}"
    echo -e "  ${CYAN}  https://github.com/${GH_REPO}/settings/environments${RESET}"
    echo -e "  ${DIM}  → Select '${GH_ENV}' → Secrets → Add secret${RESET}\n"
    printf "  ${BOLD}%-24s${RESET}  %s\n" "GCP_VM_HOST"     "${VM_EXTERNAL_IP}"
    printf "  ${BOLD}%-24s${RESET}  %s\n" "GCP_VM_USER"     "${VM_USER}"
    printf "  ${BOLD}%-24s${RESET}  (paste content of ${SSH_KEY_PATH})\n" "GCP_VM_SSH_KEY"
    printf "  ${BOLD}%-24s${RESET}  %s\n" "GCP_VM_SSH_PORT" "${SSH_PORT}"
    echo
    printf "  ${BOLD}%-24s${RESET}  %s\n" "POSTGRES_DB"       "${POSTGRES_DB}"
    printf "  ${BOLD}%-24s${RESET}  %s\n" "POSTGRES_USER"     "${POSTGRES_USER}"
    printf "  ${BOLD}%-24s${RESET}  %s\n" "POSTGRES_PASSWORD" "${POSTGRES_PASSWORD}"
    printf "  ${BOLD}%-24s${RESET}  %s\n" "REDIS_PASSWORD"    "${REDIS_PASSWORD}"
    ;;
  *)
    warn "Invalid option '${SECRET_CHOICE}' — skipping Phase 5."
    warn "Add secrets manually at: https://github.com/${GH_REPO}/settings/environments"
    ;;
esac

# ─── Save setup output to file ────────────────────────────────────────────────
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
OUTPUT_DIR="${SCRIPT_DIR}/../outputs/${GH_ENV}"
mkdir -p "${OUTPUT_DIR}"
OUTPUT_FILE="${OUTPUT_DIR}/setup_${TIMESTAMP}.txt"
cat > "${OUTPUT_FILE}" <<EOF
# NetroTrack Setup Output
# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# !! This file contains sensitive values. Do NOT commit to git. !!

# ── Infrastructure ────────────────────────────────────────────────────────────
GCP_PROJECT_ID      = ${GCP_PROJECT_ID}
GCP_VM_NAME         = ${GCP_VM_NAME}
GCP_ZONE            = ${GCP_ZONE}
DOMAIN              = ${DOMAIN}
GH_REPO             = ${GH_REPO}
GH_ENV              = ${GH_ENV}

# ── VM Access ─────────────────────────────────────────────────────────────────
GCP_VM_HOST         = ${VM_EXTERNAL_IP}
GCP_VM_USER         = ${VM_USER}
GCP_VM_SSH_PORT     = ${SSH_PORT}
SSH_KEY_PATH        = ${SSH_KEY_PATH}

# Connect to VM:
#   ssh -i ${SSH_KEY_PATH} -p ${SSH_PORT} ${VM_USER}@${VM_EXTERNAL_IP}

# ── Application Secrets (Auto-generated) ──────────────────────────────────────
POSTGRES_DB         = ${POSTGRES_DB}
POSTGRES_USER       = ${POSTGRES_USER}
POSTGRES_PASSWORD   = ${POSTGRES_PASSWORD}
REDIS_PASSWORD      = ${REDIS_PASSWORD}

# ── Local Development Tunnels (Run in another terminal) ───────────────────────
# Postgres Tunnel (Localhost:5433 -> VM:5432)
#   ssh -i ${SSH_KEY_PATH} -p ${SSH_PORT} -N -L 5433:127.0.0.1:5432 ${VM_USER}@${VM_EXTERNAL_IP}
#
# Redis Tunnel (Localhost:6380 -> VM:6379)
#   ssh -i ${SSH_KEY_PATH} -p ${SSH_PORT} -N -L 6380:127.0.0.1:6379 ${VM_USER}@${VM_EXTERNAL_IP}

# ── Load Balancer (from Terraform) ────────────────────────────────────────────
LOAD_BALANCER_IP    = ${LB_IP:-"(run: terraform output load_balancer_ip)"}
API_URL             = ${API_URL:-"https://${DOMAIN}"}

# ── Action Required: DNS ──────────────────────────────────────────────────────
# You must create an A Record in your DNS provider for the SSL certificate
# to finish provisioning.
#
#   Type:  A
#   Name:  ${DOMAIN}
#   Value: ${LB_IP:-"Wait for Terraform"}
#
# ── Useful Commands / Troubleshooting (Run these from your Local Machine) ─────
# Check SSL Provisioning Status (Wait for 'ACTIVE'):
#   gcloud compute ssl-certificates describe netrotrack-${GH_ENV}-cert --global --format="get(managed.status)"
#
# Check API Health locally inside VM (bypassing DNS):
#   ssh -o StrictHostKeyChecking=no -i ${SSH_KEY_PATH} -p ${SSH_PORT} ${VM_USER}@${VM_EXTERNAL_IP} "curl -I http://127.0.0.1:3000/health"
#
# Watch Live Backend Logs:
#   ssh -o StrictHostKeyChecking=no -i ${SSH_KEY_PATH} -p ${SSH_PORT} ${VM_USER}@${VM_EXTERNAL_IP} "cd /opt/netrotrack && docker compose logs -f backend"

# ── GitHub Actions SSH Secrets ─────────────────────────────────────────────────
# Add these to: https://github.com/${GH_REPO}/settings/environments
#   → Select '${GH_ENV}' → Secrets → Add secret
#
#   Secret name       Value
#   ──────────────    ──────────────────────────────────
#   GCP_VM_HOST       ${VM_EXTERNAL_IP}
#   GCP_VM_USER       ${VM_USER}
#   GCP_VM_SSH_PORT   ${SSH_PORT}
#   GCP_VM_SSH_KEY    (see private key below)
#
# ── SSH Private Key (GCP_VM_SSH_KEY value) ────────────────────────────────────
# Paste the ENTIRE content below (including BEGIN/END lines) as the secret value
EOF

# Append private key
echo "" >> "${OUTPUT_FILE}"
cat "${SSH_KEY_PATH}" >> "${OUTPUT_FILE}"
echo "" >> "${OUTPUT_FILE}"

chmod 600 "${OUTPUT_FILE}"

# Make sure it's in .gitignore
GITIGNORE="${SCRIPT_DIR}/../../.gitignore"
if [[ -f "${GITIGNORE}" ]]; then
  if ! grep -qF "netrotrack-one-touch/outputs/" "${GITIGNORE}"; then
    echo "" >> "${GITIGNORE}"
    echo "# NetroTrack setup output (contains SSH keys)" >> "${GITIGNORE}"
    echo "netrotrack-one-touch/outputs/" >> "${GITIGNORE}"
  fi
fi

echo
echo -e "  ${GREEN}${BOLD}📄 Setup output saved to:${RESET}"
echo -e "  ${CYAN}  ${OUTPUT_FILE}${RESET}"
echo -e "  ${DIM}  Contains all values + SSH private key for GitHub Actions.${RESET}"
echo -e "  ${YELLOW}  ⚠  Keep this file private — do not commit to git.${RESET}"
echo

# ─── Phase 6: Validation ──────────────────────────────────────────────────────

phase 6 "End-to-End Validation"

echo -e "  ${DIM}Polling https://${DOMAIN}/health${RESET}"
echo -e "  ${YELLOW}Note: Backend containers start on first 'production' branch push.${RESET}"
echo -e "  ${YELLOW}      SSL cert provisioning takes 5–20 min on first Terraform apply.${RESET}"
echo
echo -ne "  ${DIM}Skip health check for now? [y/N]: ${RESET}"
read -r SKIP_HEALTH
HEALTH_PASSED=false

if [[ "${SKIP_HEALTH:-N}" =~ ^[Yy] ]]; then
  warn "Health check skipped — verify after your first push to 'production':"
  warn "  curl https://${DOMAIN}/health"
else
  echo -e "  ${DIM}Polling every 10s for up to 25 minutes...${RESET}"
  for i in $(seq 1 150); do
    if curl -fsS --max-time 5 "https://${DOMAIN}/health" &>/dev/null; then
      echo
      ok "Health check passed on attempt ${i}!"
      HEALTH_PASSED=true
      break
    fi
    printf "  ${DIM}[%3d/150] not ready yet...${RESET}\r" "${i}"
    sleep 10
  done

  if [[ "${HEALTH_PASSED}" == "false" ]]; then
    warn "Health check timed out. Common causes:"
    warn "  1) SSL cert still provisioning  →  GCP Console → Network Services → SSL Certificates"
    warn "  2) Backend not deployed yet     →  git push to 'production' branch"
    warn "  3) DNS not propagated           →  dig ${DOMAIN} should return ${LB_IP}"
  fi
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
echo
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║   NetroTrack Setup Complete!                              ║${RESET}"
echo -e "${BOLD}${GREEN}╠══════════════════════════════════════════════════════════╣${RESET}"
printf "${BOLD}${GREEN}║${RESET}  %-18s ${BOLD}%s${RESET}\n"  "API URL:"    "https://${DOMAIN}"
printf "${BOLD}${GREEN}║${RESET}  %-18s %s\n"                 "LB IP:"      "${LB_IP}"
printf "${BOLD}${GREEN}║${RESET}  %-18s %s (%s)\n"            "VM:"         "${GCP_VM_NAME}" "${GCP_ZONE}"
printf "${BOLD}${GREEN}║${RESET}  %-18s %s\n"                 "App dir:"    "/opt/netrotrack/"
printf "${BOLD}${GREEN}║${RESET}  %-18s gs://%s\n"            "TF State:"   "${STATE_BUCKET}"
printf "${BOLD}${GREEN}║${RESET}  %-18s %s\n"                 "SSH key:"    "${SSH_KEY_PATH}"
echo -e "${BOLD}${GREEN}╠══════════════════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}  GitHub secrets set: GCP_VM_HOST, GCP_VM_USER,"
echo -e "${BOLD}${GREEN}║${RESET}                      GCP_VM_SSH_KEY, GCP_VM_SSH_PORT"
echo -e "${BOLD}${GREEN}╠══════════════════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}  ${BOLD}Next step:${RESET} git push to 'production' branch to deploy!"
echo -e "${BOLD}${GREEN}║${RESET}  ${DIM}GitHub Actions writes .env + starts Postgres/Redis/backend${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════╝${RESET}"
echo
echo -e "  ${DIM}Verify: curl https://${DOMAIN}/health${RESET}"
echo -e "  ${DIM}Check VM: gcloud compute ssh ${GCP_VM_NAME} --zone=${GCP_ZONE} -- docker ps${RESET}"
echo
