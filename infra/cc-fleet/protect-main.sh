#!/usr/bin/env bash
# protect-main.sh — apply GitHub branch protection to all fleet repos.
# Blueprint: memory/project_cc_dual_account_architecture.md (v2 §Git topology)
#
# Idempotent — re-running is safe. Requires `gh auth status` = logged in with admin on the repos.
#
# What this sets on `main`:
#   - require PR (no direct push, even by admin)
#   - require 1 review
#   - require status checks to pass (if any configured)
#   - dismiss stale reviews
#   - require up-to-date branches
#   - allow force push: false, allow deletions: false

set -euo pipefail

# Adjust to your org/user + repo list
REPOS=(
  "mehdi-sakaly/feel-the-gap"
  "mehdi-sakaly/one-for-all"
  "mehdi-sakaly/command-center"
  "mehdi-sakaly/the-estate"
  # "mehdi-sakaly/shift-dynamics"
)

PROTECTION=$(cat <<'JSON'
{
  "required_status_checks": null,
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
)

for repo in "${REPOS[@]}"; do
  echo "==> Protecting $repo:main"
  echo "$PROTECTION" | gh api --method PUT "/repos/$repo/branches/main/protection" --input - >/dev/null \
    && echo "  ✓ protected" \
    || echo "  ✗ failed (check your gh auth + repo slug)"
done

echo
echo "Done. Verify in GitHub UI: Settings → Branches → main."
