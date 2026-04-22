#!/usr/bin/env bash
# setup-cc-worker.sh N
# Idempotent provisioning of Linux user cc-worker-N, worktrees, Claude Code, systemd unit.
# Blueprint: memory/project_cc_dual_account_architecture.md (v2 N-ready)
#
# Prerequisites:
#   - Running as root
#   - /srv/shared exists
#   - The Nth Claude Code Max 20× account is provisioned (login/token available)
#   - gh CLI installed
#
# What this does NOT do:
#   - It does NOT register the worker row in Supabase (use register-worker.sh for that)
#   - It does NOT run the worker (enable/start is explicit, after register-worker.sh)
#
# Exit codes: 0 ok, 1 bad args, 2 not root, 3 missing deps

set -euo pipefail

N="${1:-}"
if [[ -z "$N" || ! "$N" =~ ^[0-9]+$ ]]; then
  echo "usage: $0 <N>  (positive integer)"
  exit 1
fi
if [[ "$EUID" -ne 0 ]]; then
  echo "must run as root" ; exit 2
fi

for cmd in useradd git tmux systemctl; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "missing dep: $cmd" ; exit 3 ; }
done

USER_NAME="cc-worker-$N"
HOME_DIR="/home/$USER_NAME"
WORKSPACE="$HOME_DIR/workspace"
CLAUDE_DIR="$HOME_DIR/.claude"
SECRETS_DIR="/srv/shared/secrets"
SECRETS_FILE="$SECRETS_DIR/$USER_NAME.env"
KILLSWITCH="/srv/shared/PAUSE_WORKER_$N"

echo "==> Provisioning $USER_NAME (N=$N)"

# 1. User + HOME
if ! id -u "$USER_NAME" >/dev/null 2>&1; then
  useradd --create-home --home-dir "$HOME_DIR" --shell /bin/bash "$USER_NAME"
  echo "  + user created"
else
  echo "  = user already exists"
fi

# 2. Dirs
install -d -o "$USER_NAME" -g "$USER_NAME" -m 0755 "$WORKSPACE"
install -d -o "$USER_NAME" -g "$USER_NAME" -m 0755 "$CLAUDE_DIR"
install -d -o root -g root -m 0755 "$SECRETS_DIR"
touch "$SECRETS_FILE"
chown root:"$USER_NAME" "$SECRETS_FILE"
chmod 0640 "$SECRETS_FILE"

# 3. CLAUDE.md for this worker (contextualized)
CLAUDE_MD_SRC="$(dirname "$(readlink -f "$0")")/CLAUDE.md.tmpl"
if [[ -f "$CLAUDE_MD_SRC" ]]; then
  sed "s/{{N}}/$N/g; s/{{USER_NAME}}/$USER_NAME/g" "$CLAUDE_MD_SRC" > "$CLAUDE_DIR/CLAUDE.md"
  chown "$USER_NAME":"$USER_NAME" "$CLAUDE_DIR/CLAUDE.md"
  echo "  + CLAUDE.md installed"
else
  echo "  ! CLAUDE.md.tmpl not found next to this script (skipping)"
fi

# 4. Git worktrees — one per active project. Source repos live at /root or /var/www.
# We DON'T clone fresh; we reuse the existing .git via `git worktree add`.
# Branch name for worker: w<N>/placeholder (will be replaced by dispatcher per ticket).
declare -A REPOS=(
  [ftg]="/var/www/feel-the-gap"
  [ofa]="/root/one-for-all"
  [cc]="/root/command-center"
  [estate]="/var/www/the-estate"
)
# shift and other repos can be added here when they exist.

for alias in "${!REPOS[@]}"; do
  src="${REPOS[$alias]}"
  dst="$WORKSPACE/$alias"
  if [[ ! -d "$src/.git" ]]; then
    echo "  ! source repo missing for $alias at $src (skipping)"
    continue
  fi
  if [[ -d "$dst/.git" ]] || [[ -f "$dst/.git" ]]; then
    echo "  = worktree $alias exists"
    continue
  fi
  (
    cd "$src"
    # Create a long-lived branch w<N>/base; dispatcher rebases per ticket.
    git fetch origin main >/dev/null 2>&1 || true
    git worktree add -B "w$N/base" "$dst" origin/main
  )
  chown -R "$USER_NAME":"$USER_NAME" "$dst"
  echo "  + worktree $alias added"
done

# 5. Killswitch path (file doesn't exist = running). Ensure dir writable by root only.
install -d -o root -g root -m 0755 /srv/shared

# 6. Worker loop script (minimal stub — real loop comes from dispatcher polling).
cat > "$WORKSPACE/worker-loop.sh" <<'LOOP'
#!/usr/bin/env bash
# Placeholder worker loop. Real implementation = Claude Code claiming tickets from minato_tickets.
# For now: sleep + heartbeat + respect killswitch. Ship dispatcher glue later.
set -euo pipefail
N="${CC_WORKER_ID:-unknown}"
KS_ALL="/srv/shared/PAUSE_ALL"
KS_ME="/srv/shared/PAUSE_WORKER_${N#worker-}"
while true; do
  if [[ -f "$KS_ALL" ]] || [[ -f "$KS_ME" ]]; then
    echo "[$(date -Iseconds)] paused (killswitch)"
    sleep 30
    continue
  fi
  echo "[$(date -Iseconds)] idle tick (no dispatcher wired yet)"
  sleep 60
done
LOOP
chown "$USER_NAME":"$USER_NAME" "$WORKSPACE/worker-loop.sh"
chmod 0755 "$WORKSPACE/worker-loop.sh"

# 7. systemd template unit — install once, not per-worker (idempotent).
UNIT_SRC="$(dirname "$(readlink -f "$0")")/cc-worker@.service"
UNIT_DST="/etc/systemd/system/cc-worker@.service"
if [[ -f "$UNIT_SRC" ]]; then
  install -o root -g root -m 0644 "$UNIT_SRC" "$UNIT_DST"
  systemctl daemon-reload
  echo "  + systemd unit installed"
else
  echo "  ! cc-worker@.service not found next to this script"
fi

echo
echo "==> Done. Next steps (NOT automated — explicit activation):"
echo "  1. Fill $SECRETS_FILE with the worker's env vars (CC token, gh token, etc.)"
echo "  2. Run:  ./infra/cc-fleet/register-worker.sh $N"
echo "     → inserts cc_workers row in Supabase."
echo "  3. When ready to start (DANGER — goes live):"
echo "     systemctl enable --now cc-worker@$N"
echo "  4. Killswitch if anything smells bad:"
echo "     touch $KILLSWITCH    # pauses just this worker"
echo "     touch /srv/shared/PAUSE_ALL  # pauses ALL workers"
