#!/bin/bash

set -e  # exit on error

APP_DIR="/home/ubuntu/app"
REPO_URL="git@github.com:your-org/your-repo.git"
BRANCH="main"

echo ">>> Pulling latest code..."
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR" && git pull origin "$BRANCH"
else
  git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

echo ">>> Installing dependencies..."
npm ci --omit=dev  # production deps only

echo ">>> Building TypeScript..."
npm run build

echo ">>> Running DB migrations..."
npm run migration:run 

echo ">>> Restarting app with PM2..."
pm2 restart nest-app || pm2 start dist/main.js --name nest-app

pm2 save
echo ">>> Deployment complete."