#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ ! "${1:-}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Penggunaan: bash scripts/deploy.sh <SHA commit lengkap>"
  exit 1
fi

export IMAGE_TAG="$1"

compose=(
  docker compose
  -f compose.yaml
  -f compose.deploy.yaml
)

echo "Mengunduh image versi $IMAGE_TAG..."
"${compose[@]}" pull api

echo "Memperbarui container API..."
"${compose[@]}" up -d --no-build api

echo "Memeriksa kesiapan API..."
for ((attempt = 1; attempt <= 15; attempt++)); do
  if curl --fail --silent --show-error \
    --max-time 3 http://localhost:3001/ready; then
    if grep -q '^IMAGE_TAG=' .env; then
      sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$IMAGE_TAG/" .env
    else
      printf '\nIMAGE_TAG=%s\n' "$IMAGE_TAG" >> .env
    fi

    printf '\nDeployment berhasil: %s\n' "$IMAGE_TAG"
    exit 0
  fi

  sleep 2
done

echo "Deployment belum siap. Log API:"
"${compose[@]}" logs --tail=50 api
exit 1