#!/usr/bin/env bash
#
# Dump the whole database and upload it to S3.
# Runs unattended on the ec2, once a scheduler is installed:
#
#     ./scripts/backup-db.sh                        # dump and upload to $BACKUP_S3_URI
#     ./scripts/backup-db.sh --s3-uri s3://b/p      # override the destination
#     ./scripts/backup-db.sh --out /tmp/db.dump     # dump to a file, no upload
#
# pg_dump reads one transaction snapshot, so core keeps recording throughout - nothing
# needs stopping and the dump is still internally consistent.
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/shared/lib.sh"

readonly DB_SERVICE="db"
readonly LOCK_FILE="/var/tmp/crypto-datadesk-backup.lock"

# taking credentials from the container's own environment, so nothing has to be read
# out of .env or kept in sync with it
readonly PG_ENV='PGPASSWORD=$POSTGRES_PASSWORD'
readonly PG_ARGS='-U $POSTGRES_USER -d $POSTGRES_DB'

# --- helpers ---

usage() {
  cat >&2 <<'EOF'
usage: backup-db.sh [--s3-uri URI] [--out FILE]

  --s3-uri URI    destination prefix, e.g. s3://my-bucket/backups
                  (default: BACKUP_S3_URI from .env)
  --out FILE      write the dump to FILE and skip the upload
EOF
  exit 1
}

# --- arguments ---

s3_uri=""
out=""

while (($#)); do
  case "$1" in
    --s3-uri) s3_uri="${2:-}" && shift 2 || usage ;;
    --out) out="${2:-}" && shift 2 || usage ;;
    -h | --help) usage ;;
    *) die "unknown argument '$1' (try --help)" ;;
  esac
done

# resolved before cd_repo_root, so a relative --out means what the caller typed
if [[ -n "$out" && "$out" != /* ]]; then
  out="$PWD/$out"
fi

# --- preflight ---

cd_repo_root

if [[ -z "$out" ]]; then
  if [[ -z "$s3_uri" ]]; then
    load_env_file
    s3_uri="${BACKUP_S3_URI:-}"
  fi
  [[ -n "$s3_uri" ]] || die "no destination - set BACKUP_S3_URI in .env, or pass --s3-uri or --out"
  [[ "$s3_uri" == s3://?* ]] || die "--s3-uri must look like s3://bucket/prefix, got '$s3_uri'"
  s3_uri="${s3_uri%/}"
  require_commands aws flock
else
  [[ -d "$(dirname "$out")" ]] || die "directory '$(dirname "$out")' does not exist"
fi

require_docker
require_env_file

[[ -n "$(docker compose ps --status running -q "$DB_SERVICE")" ]] ||
  die "the '$DB_SERVICE' service is not running"

# A dump that outruns its schedule must not overlap the next one. Manual --out dumps write
# wherever they were told to and need no such guard.
if [[ -z "$out" ]]; then
  exec 9>"$LOCK_FILE"
  flock -n 9 || die "another backup is already running"
fi

# --- dump ---

start=$SECONDS

if [[ -n "$out" ]]; then
  dump="$out"
else
  dump="$(mktemp -t crypto-datadesk-backup.XXXXXX)"
  trap 'rm -f "$dump"' EXIT
fi

log "dumping $DB_SERVICE"
docker compose exec -T "$DB_SERVICE" \
  sh -c "$PG_ENV pg_dump -Fc --no-owner --no-privileges $PG_ARGS" >"$dump"

# catches a truncated file or a connection dropped mid-dump, before anything is uploaded
docker compose exec -T "$DB_SERVICE" pg_restore --list <"$dump" >/dev/null ||
  die "the dump is not readable by pg_restore - not uploading it"

size="$(du -h "$dump" | cut -f1)"

if [[ -n "$out" ]]; then
  log "wrote $out ($size) in $((SECONDS - start))s"
  exit 0
fi

# --- upload ---

# the timestamp sorts lexicographically, so `aws s3 ls` on the prefix lists in order
name="$(date -u +%Y%m%dT%H%M%SZ).dump"

log "uploading $name ($size) to $s3_uri"
aws s3 cp "$dump" "$s3_uri/$name" --only-show-errors

log "backed up $name ($size) in $((SECONDS - start))s"
