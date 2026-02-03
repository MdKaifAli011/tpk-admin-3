#!/bin/bash
# Run the visit-stats cron endpoint (for VPS crontab).
# Requires CRON_SECRET in .env. Optional: CRON_BASE_URL (default http://localhost:3000).
# Usage:
#   ./scripts/run-update-visit-stats.sh           # production run (only runs at 3 AM server time)
#   ./scripts/run-update-visit-stats.sh test       # test run (runs anytime, add ?test=1)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Load .env (optional; cron may already have CRON_SECRET in environment)
if [ -f .env ]; then
  set -a
  source .env 2>/dev/null || true
  set +a
fi

if [ -z "$CRON_SECRET" ]; then
  echo "CRON_SECRET is not set (set it in .env or environment)" >&2
  exit 1
fi

BASE_URL="${CRON_BASE_URL:-http://localhost:3000}"
PATH_SUFFIX="/self-study/api/cron/update-visit-stats"
if [ "$1" = "test" ]; then
  PATH_SUFFIX="${PATH_SUFFIX}?test=1"
fi

curl -s -S -H "Authorization: Bearer $CRON_SECRET" "$BASE_URL$PATH_SUFFIX"
