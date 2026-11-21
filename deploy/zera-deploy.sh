#!/bin/bash
# Publishes the approved revision. Never deletes photos or resets the database.
set -euo pipefail

export GIT_CONFIG_COUNT=1
export GIT_CONFIG_KEY_0=safe.directory
export GIT_CONFIG_VALUE_0=/opt/zera

APP_DIR=/opt/zera
BRANCH=cursor/zera-stage7-1-product-photos-ec75
MEDIA_DIR=/var/lib/zera/media
STATE=/var/lib/zera-backup
PREVIOUS="$STATE/previous-release"

if [ ! -d "$MEDIA_DIR" ]; then
  echo "Photo directory is missing. Publish was refused." >&2
  exit 1
fi

count_files() {
  find "$MEDIA_DIR" -type f | wc -l | tr -d ' '
}

count_orders() {
  sudo -u postgres psql -d zera -tAc 'SELECT count(*) FROM "CustomerOrder";' | tr -d '[:space:]'
}

photos_before=$(count_files)
orders_before=$(count_orders)

echo "Backing up the database and photos before publish."
/usr/local/sbin/zera-backup

cd "$APP_DIR"
current=$(git rev-parse HEAD)
install -d -m 700 "$STATE"
printf '%s\n' "$current" > "$PREVIOUS"

restoring=0
restore_previous() {
  if [ "$restoring" -eq 1 ]; then
    exit 1
  fi
  restoring=1
  echo "Publish failed. Restoring the previous revision." >&2
  git checkout --force "$current"
  npm ci
  npm run build
  chown -R zera:zera "$APP_DIR"
  chmod -R u+rwX,g+rX "$APP_DIR"
  install -d -o zera -g zera -m 750 "$MEDIA_DIR"
  systemctl restart zera
  exit 1
}
database_url=$(sed -n 's/^DATABASE_URL=//p' /etc/zera.env | head -n 1)
database_url=${database_url%\"}
database_url=${database_url#\"}
if [ -z "$database_url" ]; then
  echo "Database address is missing. Publish was refused." >&2
  exit 1
fi
export DATABASE_URL=$database_url

trap restore_previous ERR

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
systemctl is-active --quiet zera

ready=0
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS -o /dev/null --max-time 5 http://127.0.0.1:3000/; then
    ready=1
    break
  fi
  sleep 2
done
if [ "$ready" -ne 1 ]; then
  echo "The site did not answer after publish." >&2
  exit 1
fi

photos_after=$(count_files)
orders_after=$(count_orders)
if [ "$photos_after" -lt "$photos_before" ] || [ "$orders_after" -lt "$orders_before" ]; then
  echo "Live photos or orders decreased. The previous revision is being restored." >&2
  exit 1
fi

trap - ERR
install -m 755 "$APP_DIR/deploy/zera-deploy.sh" /usr/local/sbin/zera-deploy
install -m 755 "$APP_DIR/deploy/zera-rollback.sh" /usr/local/sbin/zera-rollback
echo "PUBLISH_OK $(git rev-parse --short HEAD) photos=$photos_after orders=$orders_after"
