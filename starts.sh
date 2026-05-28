#!/usr/bin/env bash
# =============================================================================
# start.sh — EC2 Deployment Script for NestJS Auth Service
# Usage: chmod +x start.sh && sudo ./start.sh
# =============================================================================

set -euo pipefail
IFS=$'\n\t'

# ─── Colour helpers ──────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()     { echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✗] ERROR: $*${NC}" >&2; exit 1; }
section() { echo -e "\n${BOLD}${BLUE}══════════════════════════════════════${NC}"; \
            echo -e "${BOLD}${BLUE}  $*${NC}"; \
            echo -e "${BOLD}${BLUE}══════════════════════════════════════${NC}\n"; }

# ─── Configuration — edit these before running ───────────────────────────────
APP_DIR="/opt/auth-service"         # Where your app lives on the server
REPO_URL="https://github.com/Oluwaseun-Oyewole/nest-auth-service"                      
BRANCH="main"
APP_USER="appuser"                   # Non-root OS user that runs the app
NODE_VERSION="20"                    # Node.js major version

# Redis config (local container; adjust if you use ElastiCache)
REDIS_PORT=6379
REDIS_CONTAINER_NAME="auth-redis"

# Docker image name (used when building locally)
IMAGE_NAME="auth-service"
IMAGE_TAG="latest"

# .env file — must exist at this path before running the script
ENV_FILE="/etc/auth-service.env"

# ─── Preflight checks ────────────────────────────────────────────────────────
section "Pre-flight Checks"

[[ $EUID -ne 0 ]] && error "Run this script as root or with sudo."

if [[ -z "$REPO_URL" ]]; then
  error "REPO_URL is not set. Edit start.sh and set your repository URL."
fi

if [[ ! -f "$ENV_FILE" ]]; then
  warn ".env file not found at $ENV_FILE"
  warn "Creating a template — fill it in and re-run this script."
  mkdir -p "$(dirname "$ENV_FILE")"
  cat > "$ENV_FILE" <<'ENVTEMPLATE'

# ── Application ──────────────────────────────────────────────────────────────
NODE_ENV=production
PORT=8000

# ── Database (AWS RDS PostgreSQL) ─────────────────────────────────────────────
DB_HOST=
DB_PORT=5432
DB_NAME=auth_db
DB_USER=postgres
DB_PASSWORD=
DB_SSL=true

# ── Redis ─────────────────────────────────────────────────────────────────────
# Use 127.0.0.1 for a local container; use your ElastiCache endpoint if applicable
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# ── JWT ───────────────────────────────────────────────────────────────────────
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES=
JWT_REFRESH_EXPIRES=7d

ENVTEMPLATE
  error ".env template created at $ENV_FILE. Fill it in and re-run."
fi

success "Pre-flight checks passed."

# ─── System dependencies ─────────────────────────────────────────────────────
section "Installing System Dependencies"

export DEBIAN_FRONTEND=noninteractived

log "Updating package lists…"
apt-get update -qq

log "Installing essential packages…"
apt-get install -y -qq \
  curl wget git unzip \
  ca-certificates gnupg lsb-release \
  ufw fail2ban \
  > /dev/null

success "System packages installed."

# ─── Docker ──────────────────────────────────────────────────────────────────
section "Setting Up Docker"

if command -v docker &>/dev/null; then
  success "Docker already installed: $(docker --version)"
else
  log "Installing Docker…"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin > /dev/null
  systemctl enable docker
  systemctl start docker
  success "Docker installed."
fi

# ─── Node.js ─────────────────────────────────────────────────────────────────
section "Setting Up Node.js $NODE_VERSION"

if command -v node &>/dev/null && node -v | grep -q "^v${NODE_VERSION}"; then
  success "Node.js already installed: $(node -v)"
else
  log "Installing Node.js $NODE_VERSION via NodeSource…"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs > /dev/null
  success "Node.js installed: $(node -v)"
fi

if ! command -v pm2 &>/dev/null; then
  log "Installing PM2…"
  npm install -g pm2 --silent
  pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" || true
fi
success "PM2 ready: $(pm2 --version)"

# ─── App user ────────────────────────────────────────────────────────────────
section "Configuring App User"

if id "$APP_USER" &>/dev/null; then
  success "User '$APP_USER' already exists."
else
  useradd -m -s /bin/bash "$APP_USER"
  usermod -aG docker "$APP_USER"
  success "User '$APP_USER' created and added to docker group."
fi

# ─── Firewall ────────────────────────────────────────────────────────────────
section "Configuring Firewall (UFW)"

ufw --force reset > /dev/null 2>&1
ufw default deny incoming > /dev/null
ufw default allow outgoing > /dev/null
ufw allow 22/tcp  comment 'SSH'    > /dev/null
ufw allow 80/tcp  comment 'HTTP'   > /dev/null
ufw allow 443/tcp comment 'HTTPS'  > /dev/null
ufw allow 3000/tcp comment 'App'   > /dev/null
ufw --force enable > /dev/null
success "UFW firewall rules applied."

# ─── Redis container ─────────────────────────────────────────────────────────
section "Starting Redis Container"

if docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER_NAME}$"; then
  success "Redis container already running."
else
  docker rm -f "$REDIS_CONTAINER_NAME" > /dev/null 2>&1 || true
  # Load REDIS_PASSWORD from .env if set
  REDIS_PASS=$(grep '^REDIS_PASSWORD=' "$ENV_FILE" | cut -d= -f2- | tr -d '"'"'" || true)
  if [[ -n "$REDIS_PASS" ]]; then
    docker run -d \
      --name "$REDIS_CONTAINER_NAME" \
      --restart unless-stopped \
      -p 127.0.0.1:${REDIS_PORT}:6379 \
      redis:7-alpine \
      redis-server --requirepass "$REDIS_PASS" \
      --appendonly yes
  else
    docker run -d \
      --name "$REDIS_CONTAINER_NAME" \
      --restart unless-stopped \
      -p 127.0.0.1:${REDIS_PORT}:6379 \
      redis:7-alpine \
      redis-server --appendonly yes
  fi
  log "Waiting for Redis to be ready…"
  sleep 3
  docker exec "$REDIS_CONTAINER_NAME" redis-cli ping | grep -q PONG \
    && success "Redis is up." \
    || error "Redis health check failed."
fi

# ─── Clone / pull application ─────────────────────────────────────────────────
section "Deploying Application Code"

git config --global --add safe.directory "$APP_DIR" 
sudo git config --global --add safe.directory /opt/auth-service

if [[ -d "$APP_DIR/.git" ]]; then
  log "Repository exists — pulling latest from $BRANCH…"
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  log "Cloning $REPO_URL…"
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

# Symlink .env into the app directory
ln -sf "$ENV_FILE" "$APP_DIR/.env"

chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
success "Application code ready at $APP_DIR."

# ─── Build application ────────────────────────────────────────────────────────
section "Building Application"

cd "$APP_DIR"

log "Installing npm dependencies (production + devDeps for build)…"
# sudo -u "$APP_USER" npm ci --prefer-offline 2>&1 | tail -5

sudo -u "$APP_USER" npm ci --force 2>&1 | tail -5

log "Running TypeScript build…"
sudo -u "$APP_USER" npm run build 2>&1 | tail -10

success "Build complete."

# ─── RDS connectivity test ────────────────────────────────────────────────────
section "Testing RDS Connectivity"

DB_HOST=$(grep '^DB_HOST=' "$ENV_FILE" | cut -d= -f2- | tr -d '"'"'")
DB_PORT=$(grep '^DB_PORT=' "$ENV_FILE" | cut -d= -f2- | tr -d '"'"'" || echo 5432)

log "Checking TCP reachability to $DB_HOST:$DB_PORT…"
if timeout 5 bash -c "cat < /dev/null > /dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; then
  success "RDS endpoint is reachable."
else
  warn "Could not reach $DB_HOST:$DB_PORT — check your RDS Security Group and VPC settings."
  warn "The app will still start; fix connectivity separately."
fi

# ─── Run DB migrations ────────────────────────────────────────────────────────
section "Running Database Migrations"

log "Executing TypeORM migrations…"
sudo -u "$APP_USER" npm run migration:run 2>&1 \
  && success "Migrations applied." \
  || warn "Migration step failed or not configured — check manually."



# ========================================================================================
# 6️⃣ CONFIGURE NGINX AS A REVERSE PROXY
# ========================================================================================
echo "Configuring Nginx as a reverse proxy..."

sudo tee /etc/nginx/sites-available/auth > /dev/null <<EOT
server {
    listen 80;
    server_name http://34.201.169.72;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOT

# Enable the site (Ubuntu-specific — uses sites-enabled, not conf.d)
sudo ln -sf /etc/nginx/sites-available/auth /etc/nginx/sites-enabled/auth
sudo rm -f /etc/nginx/sites-enabled/default  # Remove default Nginx page

# ========================================================================================
# 7️⃣ RESTART NGINX
# ========================================================================================
echo "Restarting Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# ─── PM2 process management ──────────────────────────────────────────────────
section "Starting Application with PM2"

PM2_ECOSYSTEM="$APP_DIR/ecosystem.config.js"

if [[ ! -f "$PM2_ECOSYSTEM" ]]; then
  log "ecosystem.config.js not found — generating one…"
  cat > "$PM2_ECOSYSTEM" <<ECOSYSTEM
module.exports = {
  apps: [
    {
      name: 'auth-service',
      script: 'dist/main.js',
      cwd: '$APP_DIR',
      instances: 'max',           // one per CPU core
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '512M',
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
      },
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      // Logging
      error_file: '/var/log/auth-service/error.log',
      out_file:   '/var/log/auth-service/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
ECOSYSTEM
  success "ecosystem.config.js generated."
fi

mkdir -p /var/log/auth-service
chown -R "$APP_USER":"$APP_USER" /var/log/auth-service

# Stop existing PM2 process if running
sudo -u "$APP_USER" pm2 describe auth-service > /dev/null 2>&1 \
  && sudo -u "$APP_USER" pm2 delete auth-service || true

sudo -u "$APP_USER" pm2 start "$PM2_ECOSYSTEM" --env production
sudo -u "$APP_USER" pm2 save

success "Application started with PM2."

# ─── Health check ─────────────────────────────────────────────────────────────
section "Running Health Check"

APP_PORT=$(grep '^PORT=' "$ENV_FILE" | cut -d= -f2- | tr -d '"'"'" || echo 8000)
log "Waiting 8 s for app to boot…"
sleep 8

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:${APP_PORT}/health" 2>/dev/null || echo "000")

if [[ "$HTTP_STATUS" == "200" ]] || [[ "$HTTP_STATUS" == "201" ]]; then
  success "Health check passed (HTTP $HTTP_STATUS)."
else
  warn "Health endpoint returned HTTP $HTTP_STATUS — the app may still be starting."
  warn "Check logs: sudo -u $APP_USER pm2 logs auth-service"
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
section "Deployment Summary"

APP_PORT=$(grep '^PORT=' "$ENV_FILE" | cut -d= -f2- | tr -d '"'"'" || echo 3000)
PUBLIC_IP=$(curl -sf http://169.254.169.254/latest/meta-data/public-ipv4 || echo "<your-ec2-ip>")

echo -e "
${BOLD}Service Status${NC}
  App       : ${GREEN}http://${PUBLIC_IP}:${APP_PORT}${NC}
  Redis     : docker ps --filter name=${REDIS_CONTAINER_NAME}
  PM2       : sudo -u ${APP_USER} pm2 status

${BOLD}Useful Commands${NC}
  Live logs  : sudo -u ${APP_USER} pm2 logs auth-service
  Restart    : sudo -u ${APP_USER} pm2 restart auth-service
  Stop       : sudo -u ${APP_USER} pm2 stop auth-service
  Redis CLI  : docker exec -it ${REDIS_CONTAINER_NAME} redis-cli

${BOLD}Next Steps${NC}
  1. Point a domain at ${PUBLIC_IP} and install nginx + certbot for HTTPS.
  2. Enable RDS automated backups in the AWS console.
  3. Set up CloudWatch alarms for CPU, memory, and DB connections.
  4. Rotate secrets and restrict IAM roles.
"