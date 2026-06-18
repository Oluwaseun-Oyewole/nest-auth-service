#!/bin/bash
set -euo pipefail

APP_DIR="/home/appuser/app"
REPO_URL="https://github.com/Oluwaseun-Oyewole/nest-auth-service"
BRANCH="${1:-main}"
APP_USER="appuser"
NVM_INIT='export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"'
echo "=== Deploying branch: $BRANCH at $(date) ==="

# --- Pull latest code ---
if [ -d "$APP_DIR" ]; then
  sudo -u "$APP_USER" bash -c "cd $APP_DIR && git fetch origin && git checkout $BRANCH && git pull origin $BRANCH"
else
  git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
  chown -R "$APP_USER:$APP_USER" "$APP_DIR"
fi

# --- Ensure .env exists ---
if [ ! -f "$APP_DIR/.env" ]; then
  echo "❌ Missing $APP_DIR/.env — create it before deploying. Aborting."
  exit 1
fi

# --- Install deps, build, then prune dev deps ---
sudo -u "$APP_USER" -H bash -c "
  set -euo pipefail
  $NVM_INIT
  cd $APP_DIR
  npm ci --force 
  npm run build
  npm prune --omit=dev
"

# --- Run DB migrations ---
sudo -u "$APP_USER" -H bash -c "
  set -euo pipefail
  $NVM_INIT
  cd $APP_DIR
  npm run migration:run:prod
"
# --- Reload PM2 (zero-downtime) ---
sudo -u "$APP_USER" -H bash -c "
  set -euo pipefail
  $NVM_INIT
  cd $APP_DIR
  pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
  pm2 save
"

echo "=== Deploy complete at $(date) ==="                                                                                                   8,67          Top


# set -e  # exit on error

# APP_DIR="/home/ubuntu/app"
# REPO_URL="git@github.com:your-org/your-repo.git"
# BRANCH="main"

# echo ">>> Pulling latest code..."
# if [ -d "$APP_DIR" ]; then
#   cd "$APP_DIR" && git pull origin "$BRANCH"
# else
#   git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
#   cd "$APP_DIR"
# fi

# echo ">>> Installing dependencies..."
# npm ci --omit=dev  # production deps only

# echo ">>> Building TypeScript..."
# npm run build

# echo ">>> Running DB migrations..."
# npm run migration:run 

# echo ">>> Restarting app with PM2..."
# pm2 restart nest-app || pm2 start dist/main.js --name nest-app

# pm2 save
# echo ">>> Deployment complete."
