#!/bin/bash
# Restores the previously published code. Does not drop the database or delete photos.
set -euo pipefail

export GIT_CONFIG_COUNT=1
export GIT_CONFIG_KEY_0=safe.directory
export GIT_CONFIG_VALUE_0=/opt/zera

APP_DIR=/opt/zera
MEDIA_DIR=/var/lib/zera/media
PREVIOUS=/var/lib/zera-backup/previous-release

if [ ! -s "$PREVIOUS" ]; then
  echo "There is no previous revision to restore." >&2
  exit 1
fi
if [ ! -d "$MEDIA_DIR" ]; then
  echo "Photo directory is missing. Rollback was refused." >&2
  exit 1
fi

target=$(tr -d '[:space:]' < "$PREVIOUS")
photos_before=$(find "$MEDIA_DIR" -type f | wc -l | tr -d ' ')

cd "$APP_DIR"
git fetch origin
git checkout --force "$target"
npm ci
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
  echo "The site did not answer after rollback." >&2
  exit 1
fi

photos_after=$(find "$MEDIA_DIR" -type f | wc -l | tr -d ' ')
if [ "$photos_after" -lt "$photos_before" ]; then
  echo "Photo count decreased during rollback." >&2
  exit 1
fi

echo "ROLLBACK_OK $target photos=$photos_after"
