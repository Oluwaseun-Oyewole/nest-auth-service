#!/bin/bash
set -euo pipefail

LOG_FILE="/var/log/provision.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Starting provisioning at $(date) ==="

# --- System Updates ---
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git unzip awscli jq

# --- Node.js 20 LTS via NVM ---
export NVM_DIR="/root/.nvm"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
nvm alias default 20


npm install -g pm2 typescript ts-node

# --- Create app user ---
useradd -m -s /bin/bash appuser
mkdir -p /var/log/nestapp
chown appuser:appuser /var/log/nestapp

# --- PM2 startup ---
pm2 startup systemd -u appuser --hp /home/appuser
systemctl enable pm2-appuser

# redis
apt-get install -y redis-server
systemctl enable redis-server
systemctl start redis-server


echo "=== Provisioning complete at $(date) ==="

