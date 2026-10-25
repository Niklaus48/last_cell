#!/usr/bin/env bash
# Publishes the current feature branch: commits pending work, then pushes.
#
# Policy for this repo: every feature is developed on its own `feature/<slug>`
# branch and pushed there; `main` is never published to directly.
#
# Usage:
#   ./scripts/publish.sh                       # commit with a generated message
#   ./scripts/publish.sh "feat: timed choices" # commit with a given message
set -euo pipefail

branch="$(git rev-parse --abbrev-ref HEAD)"

if [ "$branch" = "main" ] || [ "$branch" = "master" ] || [ "$branch" = "HEAD" ]; then
  echo "error: refusing to publish from '$branch'." >&2
  echo "       create a feature branch first: ./scripts/new-feature.sh <slug>" >&2
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "error: no git remote named 'origin'." >&2
  echo "       add one with: git remote add origin <repo-url>" >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  message="${1:-wip($branch): checkpoint}"
  git add -A
  git commit -q -m "$message"
  echo "committed: $message"
else
  echo "nothing to commit"
fi

git push -u origin "$branch"

echo "pushed $branch → $(git remote get-url origin)"
