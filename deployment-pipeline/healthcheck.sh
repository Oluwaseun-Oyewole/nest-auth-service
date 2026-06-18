#!/bin/bash
set -euo pipefail

MAX_RETRIES=10
RETRY_DELAY=5
URL="${HEALTHCHECK_URL:-http://localhost:3000/api/v1/health/live}"
APP_USER="${APP_USER:-appuser}"
APP_DIR="${APP_DIR:-/home/appuser/app}"
NVM_INIT='export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"'

for i in $(seq 1 $MAX_RETRIES); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
  if [ "$STATUS" = "200" ]; then
    echo "App is healthy (attempt $i)"
    exit 0
  fi
  echo "Attempt $i/$MAX_RETRIES: got $STATUS, retrying in ${RETRY_DELAY}s..."
  sleep "$RETRY_DELAY"
done

echo "Health check failed after $MAX_RETRIES attempts. Triggering rollback..."
sudo -u "$APP_USER" -H bash -c "
  set -euo pipefail
  $NVM_INIT
  cd $APP_DIR
  pm2 reload ecosystem.config.js --env production --update-env || pm2 start ecosystem.config.js --env production
  pm2 save
"
exit 1