#!/usr/bin/env bash
# Deploy Cloudflare pipeline Workers.
# Run: pnpm run infra:deploy [--env dev|staging|prod]
# @see docs/features/14-cloudflare-infra-management.md

ENV="${ENV:-dev}"
for arg in "$@"; do
  case "$arg" in
    --env=*) ENV="${arg#*=}" ;;
  esac
done

echo "Deploying pipeline Workers (env: $ENV)..."

# Use --env="" for default/top-level, otherwise specify env
if [ "$ENV" = "default" ] || [ "$ENV" = "base" ]; then
  pnpm exec wrangler deploy --env=""
else
  pnpm exec wrangler deploy --env "$ENV"
fi

echo "Deploy complete."
