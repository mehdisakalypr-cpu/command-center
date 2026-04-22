#!/usr/bin/env bash
# AAM cron — daily 03:00 France. Hits cc-dashboard endpoint with CRON_SECRET.
set -euo pipefail
source /root/command-center/.env.local
ENDPOINT="https://cc-dashboard.vercel.app/api/business-hunter/aam/cron"
LOG_DIR=/root/monitor/logs
mkdir -p "$LOG_DIR"
TS=$(date +%FT%H:%M:%S)
echo "[$TS] AAM cron firing" >> "$LOG_DIR/aam-cron.log"
curl -s -X POST "$ENDPOINT" -H "x-cron-token: ${CRON_SECRET}" | tee -a "$LOG_DIR/aam-cron.log"
echo "" >> "$LOG_DIR/aam-cron.log"
