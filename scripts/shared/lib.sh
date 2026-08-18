#!/usr/bin/env bash
#
# Helpers shared by the scripts.
# Sourced, not run:
#
#     source "$(dirname "${BASH_SOURCE[0]}")/shared/lib.sh"
#
# Log lines are tagged with the calling script's name, so nothing needs configuring.

TAG="$(basename "$0" .sh)"
readonly TAG

log() { printf '[%s] %s\n' "$TAG" "$*"; }

die() {
  printf '[%s] error: %s\n' "$TAG" "$*" >&2
  exit 1
}

# every docker compose call has to run at the root
cd_repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.."
}

require_commands() {
  local cmd
  for cmd in "$@"; do
    command -v "$cmd" >/dev/null || die "$cmd is not installed"
  done
}

require_docker() {
  require_commands docker
  docker compose version >/dev/null 2>&1 ||
    die "'docker compose' is unavailable - install the compose plugin"
  docker info >/dev/null 2>&1 ||
    die "cannot reach the docker daemon - is it running, and is this user in the docker group?"
}

require_env_file() {
  [[ -f .env ]] || die ".env is missing - copy .env.example and fill it in first"
}

# call after cd_repo_root
load_env_file() {
  require_env_file
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
}
