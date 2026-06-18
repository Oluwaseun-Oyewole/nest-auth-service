#!/bin/bash
MAX_RETRIES=10
RETRY_DELAY=5
URL="http://localhost:3000/health"

for i in $(seq 1 $MAX_RETRIES); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
  if [ "$STATUS" = "200" ]; then
    echo "✅ App is healthy (attempt $i)"
    exit 0
  fi
  echo "⏳ Attempt $i/$MAX_RETRIES — got $STATUS, retrying in ${RETRY_DELAY}s..."
  sleep "$RETRY_DELAY"
done

echo "❌ Health check failed after $MAX_RETRIES attempts. Triggering rollback..."
pm2 reload nestapp --update-env   # or restore previous build
exit 1