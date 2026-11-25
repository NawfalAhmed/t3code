#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: bash scripts/sync-fork.sh [--repo OWNER/REPO] [--dry-run]

Sync a GitHub fork's default branch with its parent's default branch, keeping
fork-modified files and this script, and removing all GitHub Actions workflows.
Seeds a temporary clone from the local checkout when available, then fetches
the latest remote commits. Your checkout and local branches are left alone.

Requires git, bash, network access, and gh authenticated with push access.
--repo defaults to the origin repository of the checkout containing this script.
--dry-run prepares the sync and prints its changes without pushing.
EOF
}

fail() {
  printf 'sync-fork: %s\n' "$1" >&2
  exit 1
}

repository=
dry_run=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      [[ $# -ge 2 && -n "$2" && "$2" != -* ]] || fail '--repo requires OWNER/REPO'
      repository="$2"
      shift 2
      ;;
    --dry-run) dry_run=true; shift ;;
    --help|-h) usage; exit 0 ;;
    *) usage >&2; fail "Unknown argument: $1" ;;
  esac
done

command -v git >/dev/null || fail 'git is required'
command -v gh >/dev/null || fail 'gh is required; install it and run gh auth login'

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
script_source="${script_dir}/$(basename -- "${BASH_SOURCE[0]}")"
export GIT_TERMINAL_PROMPT=0 GH_PROMPT_DISABLED=1 VITE_GIT_HOOKS=0
export GIT_LITERAL_PATHSPECS=1

# Keep hooks, signing, and credentials independent of the scheduler's git config.
git() {
  command git --no-pager -c core.hooksPath=/dev/null -c commit.gpgSign=false \
    -c credential.helper= -c 'credential.helper=!gh auth git-credential' "$@"
}

local_repo="$(git -C "$script_dir" rev-parse --show-toplevel 2>/dev/null || true)"

if [[ -z "$repository" ]]; then
  origin="$(git -C "$script_dir" remote get-url origin)" || fail 'Pass --repo OWNER/REPO when running outside a checkout'
  repository="$(gh repo view "$origin" --json nameWithOwner --jq '.nameWithOwner')"
fi

metadata="$(gh api "repos/${repository}" --jq '[.clone_url, .default_branch, .parent.clone_url, .parent.default_branch] | @tsv')"
IFS=$'\t' read -r fork_url default_branch upstream_url upstream_branch <<< "$metadata"
[[ -n "$fork_url" && -n "$default_branch" ]] || fail 'Could not resolve the fork repository'
[[ -n "$upstream_url" && -n "$upstream_branch" ]] || fail "${repository} has no upstream fork parent"

temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/t3-sync-fork.XXXXXX")"
trap 'rm -rf -- "$temp_dir"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
cp -- "$script_source" "${temp_dir}/sync-fork.sh"

printf 'Syncing %s (%s) from %s (%s)\n' "$repository" "$default_branch" "$upstream_url" "$upstream_branch"
if [[ -n "$local_repo" ]]; then
  git clone --local --no-checkout --no-tags -- "$local_repo" "${temp_dir}/repo"
  git -C "${temp_dir}/repo" remote set-url origin "$fork_url"
else
  git clone --no-checkout --no-tags --single-branch --branch "$default_branch" -- "$fork_url" "${temp_dir}/repo"
fi
cd -- "${temp_dir}/repo"
git fetch --no-tags origin "+refs/heads/${default_branch}:refs/remotes/origin/${default_branch}"
fork_head="$(git rev-parse "refs/remotes/origin/${default_branch}")"
git fetch --no-tags -- "$upstream_url" "refs/heads/${upstream_branch}"
upstream_head="$(git rev-parse FETCH_HEAD)"
fork_base="$(git merge-base "$fork_head" "$upstream_head")"

# Disable rename detection so both the old path's deletion and new path survive.
git diff --no-renames --name-only -z "$fork_base" "$fork_head" > "${temp_dir}/paths"
git checkout --detach "$upstream_head"
while IFS= read -r -d '' path; do
  if git cat-file -e "${fork_head}:${path}" 2>/dev/null; then
    git restore --source="$fork_head" --staged --worktree -- "$path"
  else
    git rm -r -f --ignore-unmatch -- "$path"
  fi
done < "${temp_dir}/paths"

git rm -r -f --ignore-unmatch -- .github/workflows
mkdir -p scripts
cp -- "${temp_dir}/sync-fork.sh" scripts/sync-fork.sh
chmod +x scripts/sync-fork.sh
git add -- scripts/sync-fork.sh

if git merge-base --is-ancestor "$upstream_head" "$fork_head" && git diff --cached --quiet "$fork_head"; then
  printf 'Fork is already synced.\n'
  exit 0
fi

git diff --cached --stat "$fork_head"
if "$dry_run"; then
  printf 'Dry run: would update %s; nothing was pushed.\n' "$default_branch"
  exit 0
fi

if ! git diff --cached --quiet; then
  git -c user.name='Fork Sync' -c user.email='fork-sync@localhost' \
    commit -m 'chore: sync upstream while preserving fork changes'
fi

git push --force-with-lease="refs/heads/${default_branch}:${fork_head}" \
  origin "HEAD:refs/heads/${default_branch}"
printf 'Synced %s (%s).\n' "$repository" "$default_branch"
