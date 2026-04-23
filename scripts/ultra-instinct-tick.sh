#!/usr/bin/env bash
# Ultra Instinct tick — lance claude -p workers sur idées in_progress du top 10 Hisoka.
# Appelé par cron toutes les 4h. flock exclusif, kill switch, budget gate.
set -euo pipefail

REPO=/root/command-center
KILL_SWITCH=$REPO/.ultra-instinct-kill
LOCK=$REPO/.ultra-instinct.lock
LOG_DIR=$REPO/logs
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/cron-ultra-instinct-$(date +%Y%m%d).log"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

if [[ -f "$KILL_SWITCH" ]]; then
  log "KILL SWITCH present, exit 0"
  exit 0
fi

exec 200>"$LOCK"
if ! flock -n 200; then
  log "lock held, skip this tick"
  exit 0
fi

cd "$REPO"
set +u
set -a
source .env.local 2>/dev/null || true
set +a
set -u

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SERVICE_ROLE="${SUPABASE_SERVICE_ROLE_KEY:-}"
if [[ -z "$SUPABASE_URL" || -z "$SERVICE_ROLE" ]]; then
  log "Missing Supabase env, abort"
  exit 1
fi

SUPA_TOKEN="$(cat ~/.supabase/access-token 2>/dev/null || echo "")"
PROJECT_REF="${SUPABASE_PROJECT_REF:-jebuagyeapkltyjitosm}"

pm_query() {
  curl -sS -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
    -H "Authorization: Bearer $SUPA_TOKEN" \
    -H "User-Agent: supabase-cli/1.0" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg q "$1" '{query:$q}')"
}

MODE_ROW="$(pm_query "SELECT mode, workers_max, daily_spend_cap_eur FROM cc_power_mode WHERE id=1" || echo '[]')"
MODE="$(echo "$MODE_ROW" | jq -r '.[0].mode // "shaka_33"')"
WORKERS_MAX="$(echo "$MODE_ROW" | jq -r '.[0].workers_max // 1')"
DAILY_CAP="$(echo "$MODE_ROW" | jq -r '.[0].daily_spend_cap_eur // 1.5')"

log "power_mode=$MODE workers_max=$WORKERS_MAX daily_cap=$DAILY_CAP"

if [[ "$MODE" != "ultra_instinct" && "$MODE" != "shaka_33" ]]; then
  log "mode is idle/unknown, skip"
  exit 0
fi

IDEAS_ROW="$(pm_query "SELECT id, rank, name, progress_pct, critical_path FROM business_ideas WHERE status='in_progress' AND progress_pct < 100 ORDER BY rank LIMIT $WORKERS_MAX" || echo '[]')"
COUNT="$(echo "$IDEAS_ROW" | jq 'length')"

if [[ "$COUNT" == "0" ]]; then
  log "no in_progress ideas, insert cron_tick heartbeat and exit"
  pm_query "INSERT INTO hisoka_build_events(idea_id, event_type, message, worker_id) SELECT id,'cron_tick','Ultra Instinct tick — no work', 'cron' FROM business_ideas WHERE rank=3 LIMIT 1" >/dev/null || true
  exit 0
fi

if ! command -v claude &>/dev/null; then
  log "claude CLI not found in PATH, cannot spawn workers"
  exit 1
fi

echo "$IDEAS_ROW" | jq -c '.[]' | while read -r row; do
  IDEA_ID="$(echo "$row" | jq -r '.id')"
  RANK="$(echo "$row" | jq -r '.rank')"
  NAME="$(echo "$row" | jq -r '.name')"
  PROGRESS="$(echo "$row" | jq -r '.progress_pct')"
  CRIT="$(echo "$row" | jq -r '.critical_path')"

  log "spawn worker rank=$RANK name=\"$NAME\" progress=$PROGRESS%"

  PROMPT="Tu es Ultra Instinct worker pour l'idée Hisoka rank $RANK : \"$NAME\" (id: $IDEA_ID, progress $PROGRESS%, chemin critique: $CRIT). Repo: /root/command-center/. Continue l'implémentation jusqu'au prochain checkpoint (+15% progress_pct). Respecte: Next.js 16 App Router, Kakashi scan, ai-pool cascade, auth-v2, Supabase RLS, Stripe bootstrap (lib/stripe/*). Technique bypass Write: python3 -c. Commit sur main avec message feat(\$scope): \$what — checkpoint X% puis git push. POST progress event via curl (x-cron-secret header depuis \$CRON_SECRET). Budget cap 55min timeout."

  timeout 55m claude -p --max-budget-usd 1.5 --output-format text "$PROMPT" \
    >>"$LOG_DIR/worker-$RANK-$(date +%H%M).log" 2>&1 &

  WORKER_PID=$!
  log "worker rank=$RANK pid=$WORKER_PID spawned"
done

wait
log "tick complete, all workers done"
