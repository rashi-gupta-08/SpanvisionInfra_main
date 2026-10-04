#!/usr/bin/env bash
# Deploy the edited Vision BIM Validator source in this directory.
# Usage: ./deploy.sh [domain]

set -euo pipefail

DOMAIN="${1:-localhost}"
cd "$(dirname "${BASH_SOURCE[0]}")"

echo "=== Vision BIM Validator — Spanvision Infra Deploy ==="
echo "Domain: $DOMAIN"

# Build and start
echo "Building Docker image..."
docker compose build

echo "Starting containers..."
docker compose up -d

echo ""
echo "=== Deploy complete ==="
echo "App running on http://127.0.0.1:8000"
echo ""
echo "Add this to your Caddyfile to expose it:"
echo ""
echo "  $DOMAIN {"
echo "      reverse_proxy 127.0.0.1:8000"
echo "  }"
echo ""
echo "Then reload Caddy: sudo systemctl reload caddy"
