#!/usr/bin/env bash
# Configures (or refreshes) the `origin` remote for this repository.
#
# Why this exists: `.git/config` is excluded from workspace snapshots, so the
# remote must be re-applied at the start of a session before pushing.
#
# Usage:
#   REPO_URL=https://github.com/<owner>/<repo>.git GITHUB_TOKEN=<pat> ./scripts/configure-remote.sh
#   ./scripts/configure-remote.sh https://github.com/<owner>/<repo>.git          # public / SSH agent
#
# The token is never echoed and never written to a file other than .git/config.
set -euo pipefail

repo_url="${1:-${REPO_URL:-}}"
if [ -z "$repo_url" ]; then
  echo "usage: REPO_URL<url> [GITHUB_TOKEN=<pat>] $0" >&2
  exit 64
fi

if [ -n "${GITHUB_TOKEN:-}" ]; then
  case "$repo_url" in
    https://github.com/*)
      # https://github.com/o/r.git -> https://x-access-token:<token>@github.com/o/r.git
      push_url="https://x-access-token:${GITHUB_TOKEN}@${repo_url#https://}"
      ;;
    *)
      echo "error: GITHUB_TOKEN only applies to https://github.com/… URLs" >&2
      exit 64
      ;;
  esac
else
  push_url="$repo_url"
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$push_url"
  echo "updated remote 'origin'"
else
  git remote add origin "$push_url"
  echo "added remote 'origin'"
fi

# Safe display form (token masked).
echo "origin -> $(git remote get-url origin | sed -E 's#//[^@/]*@#//***@#')"
