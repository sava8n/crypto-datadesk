#!/usr/bin/env bash
#
# Deploy the latest main onto this host: fast-forward, rebuild, restart, prune.
# Runs on the ec2:
#
#     ./scripts/deploy.sh            # no-op when already at origin/main
#     ./scripts/deploy.sh --force    # rebuild the current commit anyway
#
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/shared/lib.sh"

readonly BRANCH="main"
readonly SERVICES=(db core dashboard)
# the dashboard image runs npm ci + vite build, which is slow
readonly HEALTH_TIMEOUT_SECONDS=300
readonly BUILD_CACHE_MAX_AGE="168h"

# --- helpers ---

container_state() {
  docker inspect --format \
    '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1"
}

wait_healthy() {
  local service="$1" cid state deadline
  cid="$(docker compose ps -q "$service")"
  [[ -n "$cid" ]] || die "service '$service' has no container - did the build fail?"

  deadline=$(( SECONDS + HEALTH_TIMEOUT_SECONDS ))
  while :; do
    state="$(container_state "$cid")"
    case "$state" in
      healthy | running)
        log "$service is $state"
        return 0
        ;;
      starting) ;;
      *) break ;;
    esac
    (( SECONDS < deadline )) || break
    sleep 3
  done

  log "$service did not come up (state: $state), last 50 log lines:"
  docker compose logs --tail 50 "$service" >&2 || true
  die "the new build is running but '$service' is not healthy"
}

# --- preflight ---

cd_repo_root

force=false
case "${1:-}" in
  "") ;;
  --force) force=true ;;
  *) die "unknown argument '$1' (expected --force)" ;;
esac

require_commands git
require_docker
require_env_file

branch="$(git symbolic-ref --quiet --short HEAD || true)"
[[ "$branch" == "$BRANCH" ]] || die "HEAD is on '${branch:-a detached commit}', expected '$BRANCH'"

[[ -z "$(git status --porcelain --untracked-files=no)" ]] ||
  die "tracked files have local changes - commit, stash or discard them before deploying"

# --- pull ---

log "fetching origin/$BRANCH"
git fetch --quiet origin "$BRANCH"

local_sha="$(git rev-parse HEAD)"
remote_sha="$(git rev-parse FETCH_HEAD)"

if [[ "$local_sha" == "$remote_sha" ]]; then
  if [[ "$force" == false ]]; then
    log "already at ${local_sha:0:7}, nothing to deploy (--force rebuilds anyway)"
    exit 0
  fi
  log "already at ${local_sha:0:7}, rebuilding anyway (--force)"
else
  git merge-base --is-ancestor HEAD FETCH_HEAD ||
    die "local $BRANCH has diverged from origin - resolve it by hand"

  log "new commits:"
  git log --oneline "$local_sha..$remote_sha"
  git pull --quiet --ff-only origin "$BRANCH"
  log "pulled ${local_sha:0:7} -> ${remote_sha:0:7}"
fi

# --- rebuild and restart ---

log "building images and recreating changed containers"
docker compose up -d --build

for service in "${SERVICES[@]}"; do
  wait_healthy "$service"
done

# dangling images and the build cache
log "pruning dangling images and build cache older than $BUILD_CACHE_MAX_AGE"
docker image prune -f >/dev/null
docker builder prune -f --filter "until=$BUILD_CACHE_MAX_AGE" >/dev/null

log "deployed $(git rev-parse --short HEAD)"
docker compose ps
