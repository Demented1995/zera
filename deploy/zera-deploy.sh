#!/bin/bash
# Publishes the approved Git revision. Does not touch product photos or drop the database.
set -euo pipefail

APP_DIR=/opt/zera
BRANCH=cursor/zera-stage7-1-product-photos-ec75
MEDIA_DIR=/var/lib/zera/media

cd "$APP_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

npm ci
npx prisma migrate deploy
npm run build

chown -R zera:zera "$APP_DIR"
chmod -R u+rwX,g+rX "$APP_DIR"
install -d -o zera -g zera -m 750 "$MEDIA_DIR"

systemctl restart zera
systemctl is-active zera
