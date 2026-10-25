#!/usr/bin/env bash
# Starts a new feature branch from an up-to-date main.
# Usage: ./scripts/new-feature.sh phase-2-chapter-1
set -euo pipefail

slug="${1:-}"
if [ -z "$slug" ]; then
  echo "usage: $0 <feature-slug>   e.g. $0 phase-2-chapter-1" >&2
  exit 64
fi

branch="feature/$slug"

if git show-ref --verify --quiet "refs/heads/$branch"; then
  echo "error: branch $branch already exists" >&2
  exit 1
fi

current="$(git rev-parse --abbrev-ref HEAD)"
if [ "$current" != "main" ]; then
  echo "switching to main (was on $current)"
  git checkout main
fi

if git remote get-url origin >/dev/null 2>&1; then
  git fetch origin main 2>/dev/null || true
  git pull --ff-only origin main 2>/dev/null || true
fi

git checkout -b "$branch"
echo "on $branch — commit there, then run ./scripts/publish.sh"
