#!/bin/bash
# The only command the GitHub Actions key is allowed to run.
set -euo pipefail
case "${SSH_ORIGINAL_COMMAND:-}" in
  publish)
    exec sudo -n /usr/local/sbin/zera-deploy
    ;;
  rollback)
    exec sudo -n /usr/local/sbin/zera-rollback
    ;;
  *)
    echo "Denied. Allowed commands: publish, rollback." >&2
    exit 1
    ;;
esac
