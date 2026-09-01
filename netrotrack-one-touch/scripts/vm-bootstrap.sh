#!/usr/bin/env bash
# =============================================================================
# NetroTrack — VM Bootstrap
# =============================================================================
# Run ON the GCP VM as root:
#   sudo ./vm-bootstrap.sh <app_user>
#
# What this does (all idempotent):
#   1. Installs Docker CE + Docker Compose plugin (Ubuntu)
#   2. Adds <app_user> to the docker group
#   3. Creates /opt/netrotrack/ with correct ownership
#   4. Copies /tmp/docker-compose.yml → /opt/netrotrack/docker-compose.yml
#   5. Creates empty .env placeholder (GitHub Actions writes real values on deploy)
#
# This script does NOT:
#   - Write application secrets (.env is written by GitHub Actions on first push)
#   - Start containers (GitHub Actions does this)
#   - Configure Nginx or any other reverse proxy (GCP LB handles TLS termination)
# =============================================================================
set -euo pipefail

APP_USER="${1:-ubuntu}"
APP_DIR="/opt/netrotrack"

# ─── Colors ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

ok()   { echo -e "  ${GREEN}✔${RESET}  $1"; }
info() { echo -e "  ${CYAN}→${RESET}  $1"; }
warn() { echo -e "  ${YELLOW}⚠${RESET}  $1"; }

echo
echo -e "${BOLD}NetroTrack — VM Bootstrap${RESET}"
echo -e "────────────────────────────────────────"
echo -e "  App user: ${APP_USER}"
echo -e "  App dir:  ${APP_DIR}"
echo

# ─── 1. Install Docker CE ─────────────────────────────────────────────────────
if command -v docker &>/dev/null; then
  ok "Docker already installed: $(docker --version)"
else
  info "Installing Docker CE..."

  # Detect OS
  if [[ -f /etc/os-release ]]; then
    # shellcheck source=/dev/null
    . /etc/os-release
    OS_ID="${ID}"
  else
    OS_ID="ubuntu"
  fi

  apt-get update -qq
  apt-get install -y -qq \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

  # Add Docker's official GPG key
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${OS_ID}/gpg" \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  # Add Docker repository
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/${OS_ID} \
    $(lsb_release -cs) stable" \
    | tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -qq
  apt-get install -y -qq \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

  systemctl enable docker
  systemctl start docker

  ok "Docker installed: $(docker --version)"
  ok "Docker Compose: $(docker compose version)"
fi

# ─── 2. Add app user to docker group ─────────────────────────────────────────
if id -nG "${APP_USER}" | grep -qw docker; then
  ok "${APP_USER} already in docker group"
else
  info "Adding ${APP_USER} to docker group..."
  usermod -aG docker "${APP_USER}"
  ok "${APP_USER} added to docker group"
fi

# ─── 3. Create application directory ─────────────────────────────────────────
info "Creating ${APP_DIR}/..."

# Main app directory
install -d -m 0750 "${APP_DIR}"
chown "${APP_USER}:docker" "${APP_DIR}"

# Postgres data volume directory
install -d -m 0750 "${APP_DIR}/postgres"
install -d -m 0750 "${APP_DIR}/postgres/data"
chown -R "${APP_USER}:docker" "${APP_DIR}/postgres"

ok "Directory structure created:"
ok "  ${APP_DIR}/"
ok "  ${APP_DIR}/postgres/data/  (PostgreSQL volume)"

# ─── 4. Copy docker-compose.yml ──────────────────────────────────────────────
if [[ -f /tmp/docker-compose.yml ]]; then
  info "Copying docker-compose.yml..."
  cp /tmp/docker-compose.yml "${APP_DIR}/docker-compose.yml"
  chown "${APP_USER}:docker" "${APP_DIR}/docker-compose.yml"
  chmod 640 "${APP_DIR}/docker-compose.yml"
  ok "docker-compose.yml → ${APP_DIR}/docker-compose.yml"
else
  warn "/tmp/docker-compose.yml not found — skipped."
  warn "Run 'gcloud compute scp docker-compose.prod.yml ...' manually."
fi

# ─── 5. Create .env placeholder ──────────────────────────────────────────────
if [[ -f "${APP_DIR}/.env" ]]; then
  ok ".env already exists — leaving untouched (GitHub Actions manages this)"
else
  info "Creating empty .env placeholder..."
  # Create a placeholder; real values are written by GitHub Actions on deploy
  cat > "${APP_DIR}/.env" << 'EOF'
# =============================================================================
# NetroTrack Production Environment
# =============================================================================
# This file is written and overwritten by GitHub Actions on every deployment.
# Do NOT edit manually — your changes will be lost on the next deploy.
#
# To update secrets:
#   1. Go to GitHub → Repository → Settings → Environments → production
#   2. Update the secret value
#   3. Push to the 'production' branch to trigger a redeploy
# =============================================================================
EOF
  chown "${APP_USER}:docker" "${APP_DIR}/.env"
  chmod 600 "${APP_DIR}/.env"
  ok ".env placeholder created (GitHub Actions writes real values on first push)"
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
echo
echo -e "${BOLD}${GREEN}VM Bootstrap Complete!${RESET}"
echo -e "────────────────────────────────────────"
echo -e "  App directory:   ${APP_DIR}/"
echo -e "  Docker:          $(docker --version)"
echo -e "  Docker Compose:  $(docker compose version)"
echo -e "  App user:        ${APP_USER} (in docker group)"
echo
echo -e "  ${YELLOW}Next steps:${RESET}"
echo -e "  1. Terraform will wire the Load Balancer"
echo -e "  2. GitHub secrets will be registered"
echo -e "  3. Push to 'production' branch to start containers"
echo
