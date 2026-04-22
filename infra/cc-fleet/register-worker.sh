#!/usr/bin/env bash
# register-worker.sh N [capabilities…]
# Inserts/upserts the cc_workers row for worker-N via Supabase Management API.
# Blueprint: memory/project_cc_dual_account_architecture.md (v2 N-ready)
#
# Requires env:
#   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (from /srv/shared/secrets/cc-fleet.env)
#
# Usage:
#   ./register-worker.sh 1                          # default caps (scout,content,refactor,cron,fix)
#   ./register-worker.sh 2 ui feature debug         # custom caps
#
# This does NOT start the worker. systemctl enable is an explicit subsequent step.

set -euo pipefail

N="${1:-}"
if [[ -z "$N" || ! "$N" =~ ^[0-9]+$ ]]; then
  echo "usage: $0 <N> [cap1 cap2 …]"
  exit 1
fi
shift || true

CAPS=("$@")
if [[ ${#CAPS[@]} -eq 0 ]]; then
  CAPS=(scout content refactor cron fix)
fi

# Build JSON array for capabilities
CAPS_JSON=$(printf '"%s",' "${CAPS[@]}"); CAPS_JSON="[${CAPS_JSON%,}]"

SECRETS_FILE="/srv/shared/secrets/cc-fleet.env"
if [[ -f "$SECRETS_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$SECRETS_FILE"
fi

: "${SUPABASE_URL:?missing SUPABASE_URL (put it in $SECRETS_FILE)}"
: "${SUPABASE_SERVICE_ROLE_KEY:?missing SUPABASE_SERVICE_ROLE_KEY}"

WORKER_ID="worker-$N"
PAYLOAD=$(cat <<JSON
{
  "id": "$WORKER_ID",
  "display_name": "Worker #$N (autonomous)",
  "kind": "autonomous",
  "capabilities": $CAPS_JSON,
  "quota_plan": "max_20x",
  "night_eligible": true,
  "max_concurrent_tickets": 2,
  "home_path": "/home/cc-worker-$N",
  "killswitch_file": "/srv/shared/PAUSE_WORKER_$N",
  "systemd_unit": "cc-worker@$N.service",
  "gh_author_email": "cc-worker-$N@anthropic.com",
  "state": "offline"
}
JSON
)

echo "==> Upserting cc_workers row for $WORKER_ID"
curl -sS -X POST "$SUPABASE_URL/rest/v1/cc_workers" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "$PAYLOAD" | head -200

echo
echo "==> Done. To activate (⚠ goes live):"
echo "     systemctl enable --now cc-worker@$N"
echo "     Watch logs: journalctl -u cc-worker@$N -f"
