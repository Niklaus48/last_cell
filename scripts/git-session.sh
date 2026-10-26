#!/usr/bin/env bash
# Restores everything git needs in a fresh session — in one command, with no
# token pasted into the chat and no token written into the repository.
#
# Why this exists: `.git/config` is excluded from workspace snapshots, so the
# `origin` remote and its credentials disappear between sessions. Some sessions
# even start without a `.git` directory at all.
#
# Usage:
#   ./scripts/git-session.sh                 # restore remote + identity, show status
#   ./scripts/git-session.sh --backup        # …and write a bundle into .git-backup/
#   ./scripts/git-session.sh --save-token    # store a token (read from stdin) for later
#   ./scripts/git-session.sh --push          # restore, then push the current branch
#   GITHUB_TOKEN=… ./scripts/git-session.sh  # skip the stored token for one run
#
# Where the token lives:
#   $TOKEN_FILE, default ~/.config/last-cell/github-token (mode 0600).
#   That path is OUTSIDE the repository, so it can never be committed, and it is
#   not on the workspace exclusion list, so it survives between sessions.
#
# The token is never echoed: every message prints the masked remote at most.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
token_file="${TOKEN_FILE:-$HOME/.config/last-cell/github-token}"
url_file="${URL_FILE:-$HOME/.config/last-cell/repo-url}"
default_branch="feature/phase-2-engine-hardening"

say() { printf '%s\n' "$*"; }
fail() { printf 'error: %s\n' "$*" >&2; exit 1; }

masked() { sed -E 's#//[^@/]*@#//***@#' <<<"$1"; }

save_token() {
  local token
  IFS= read -r token || true
  [ -n "${token:-}" ] || fail "no token on stdin (usage: $0 --save-token <<< \"\$TOKEN\")"
  mkdir -p "$(dirname "$token_file")"
  chmod 700 "$(dirname "$token_file")" 2>/dev/null || true
  printf '%s\n' "$token" >"$token_file"
  chmod 600 "$token_file"
  say "stored token in $token_file (mode 600)"
}

case " ${*:-} " in
  *" --save-token "*)
    save_token
    exit 0
    ;;
esac

# ---------------------------------------------------------------- credential --
token="${GITHUB_TOKEN:-}"
if [ -z "$token" ] && [ -f "$token_file" ]; then
  token="$(tr -d '\r\n' <"$token_file")"
fi

repo_url="${REPO_URL:-}"
if [ -z "$repo_url" ] && [ -f "$url_file" ]; then
  repo_url="$(tr -d '\r\n' <"$url_file")"
fi
repo_url="${repo_url:-https://github.com/Niklaus48/last_cell.git}"

# ------------------------------------------------------------------- restore --
cd "$repo_root"

if [ ! -d .git ]; then
  say "no .git directory: recovering from $repo_url"
  [ -n "$token" ] || fail "cannot clone without a token (see --save-token)"
  tmp="$(mktemp -d)"
  authenticated="https://x-access-token:${token}@${repo_url#https://}"
  if ! git clone --quiet "$authenticated" "$tmp/clone"; then
    rm -rf "$tmp"
    fail "clone failed — the token may be expired or lack 'Contents: read'"
  fi
  # The clone only contributes history/metadata: the working files already on
  # disk are left exactly as they are, so nothing local can be lost.
  mv "$tmp/clone/.git" .git
  rm -rf "$tmp"

  # Point HEAD at the work branch without checking anything out: moving the
  # branch ref and resetting *only* the index keeps every working file on disk.
  target="${WORK_BRANCH:-$default_branch}"
  if git rev-parse --verify --quiet "refs/remotes/origin/$target" >/dev/null; then
    git branch --force "$target" "refs/remotes/origin/$target" >/dev/null
    git symbolic-ref HEAD "refs/heads/$target"
    git reset --quiet
    say "restored history from origin, HEAD → $target (working files untouched)"
  else
    git reset --quiet
    say "restored history from origin (branch origin/$target not found; staying on default)"
  fi
fi

if [ -n "$token" ]; then
  REPO_URL="$repo_url" GITHUB_TOKEN="$token" "$repo_root/scripts/configure-remote.sh" >/dev/null
else
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "$repo_url"
  say "no token available: remote is public-only (push will fail)"
fi

# Safety: the credential must never be a tracked file.
if git ls-files --error-unmatch "$token_file" >/dev/null 2>&1; then
  fail "$token_file is tracked by git — untrack it before going further"
fi

# Deterministic identity for commits made from this workspace.
git config user.name "Arena Agent"
git config user.email "agent@arena.ai"
# The snapshot drops executable bits; this keeps `git status` honest about it.
git config core.fileMode false
# Never let a stray credential live inside the repository.
git config --unset-all credential.helper >/dev/null 2>&1 || true

# -------------------------------------------------------------------- report --
say "remote   $(masked "$(git remote get-url origin)")"
say "branch   $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '(none)')"
say "head     $(git log --oneline -1 2>/dev/null || echo '(no commits)')"
dirty="$(git status --porcelain | wc -l | tr -d ' ')"
say "tree     $([ "$dirty" = 0 ] && echo clean || echo "$dirty changed file(s)")"

if [ -n "$token" ]; then
  if git ls-remote --heads origin >/dev/null 2>&1; then
    say "auth     OK (remote reachable)"
  else
    say "auth     FAILED — token expired or insufficient (needs Contents: read/write)"
  fi
fi

case " ${*:-} " in
  *" --backup "*)
    mkdir -p .git-backup
    out=".git-backup/$(date +%Y%m%d-%H%M%S)-$(git rev-parse --abbrev-ref HEAD).bundle"
    git bundle create "$out" "$(git rev-parse --abbrev-ref HEAD)" >/dev/null 2>&1 &&
      say "backup   $out" || say "backup   skipped (no commits yet)"
    ;;
esac

case " ${*:-} " in
  *" --push "*)
    branch="$(git rev-parse --abbrev-ref HEAD)"
    [ "$branch" != "main" ] && [ "$branch" != "master" ] || fail "refusing to push to $branch"
    git push -u origin "$branch"
    ;;
esac

say ""
say "done. usual flow: ./scripts/git-session.sh --push   (or git push origin <branch>)"
