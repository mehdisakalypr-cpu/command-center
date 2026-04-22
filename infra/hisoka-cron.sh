#!/usr/bin/env bash
# Hisoka discovery cron — daily 02:00 France. Hits cc-dashboard with CRON_SECRET.
# Runs before AAM cron (03h) so AAM has fresh 0.75-0.89 ideas to forge.
set -euo pipefail
source /root/command-center/.env.local
ENDPOINT="https://cc-dashboard.vercel.app/api/business-hunter/run-cron"
LOG_DIR=/root/monitor/logs
mkdir -p "$LOG_DIR"
TS=$(date +%FT%H:%M:%S)
echo "[$TS] Hisoka discovery cron firing" >> "$LOG_DIR/hisoka-cron.log"
curl -s -X POST "$ENDPOINT" -H "x-cron-secret: ${CRON_SECRET}" --max-time 300 | tee -a "$LOG_DIR/hisoka-cron.log"
echo "" >> "$LOG_DIR/hisoka-cron.log"
