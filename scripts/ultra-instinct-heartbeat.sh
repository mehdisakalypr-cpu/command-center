#!/usr/bin/env bash
# Ultra Instinct heartbeat — toutes les 30 min, insert cron_tick event + rotate logs.
set -euo pipefail

REPO=/root/command-center
LOG_DIR=$REPO/logs
mkdir -p "$LOG_DIR"

cd "$REPO"
set +u
set -a
source .env.local 2>/dev/null || true
set +a
set -u

SUPA_TOKEN="$(cat ~/.supabase/access-token 2>/dev/null || echo "")"
PROJECT_REF="${SUPABASE_PROJECT_REF:-jebuagyeapkltyjitosm}"
KILL=""
[[ -f "$REPO/.ultra-instinct-kill" ]] && KILL="KILL_SWITCH_ACTIVE"

MSG="heartbeat $(date -Iseconds)${KILL:+ $KILL}"

curl -sS -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $SUPA_TOKEN" \
  -H "User-Agent: supabase-cli/1.0" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg m "$MSG" '{query:("INSERT INTO hisoka_build_events(idea_id, event_type, message, worker_id) SELECT id,'\''cron_tick'\'','\''" + $m + "'\'','\''heartbeat'\'' FROM business_ideas WHERE rank=3 LIMIT 1")}')" \
  >/dev/null 2>&1 || true

find "$LOG_DIR" -name 'cron-ultra-instinct-*.log' -mtime +14 -delete 2>/dev/null || true
find "$LOG_DIR" -name 'worker-*.log' -mtime +7 -delete 2>/dev/null || true
