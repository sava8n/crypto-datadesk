#!/usr/bin/env bash
#
# Copy a recent slice of the remote archive into the local database.
# Runs on a dev machine and reaches the ec2 over ssh:
#
#     ./scripts/sync-db.sh --host 1.1.1.1 --user ubuntu --key ~/.ssh/key.pem
#     ./scripts/sync-db.sh --host host --days 30 --yes
#
# The local archive is wiped first - this is a copy of production, not a merge.
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/shared/lib.sh"

readonly REMOTE_CONTAINER="datadesk-db"
readonly DEFAULT_DAYS=10
readonly DEFAULT_SSH_USER="ubuntu"
# parents before children: contract and cm_metric reference snapshot.id
readonly TABLES=(snapshot contract cm_metric trade expiry_outcome market_report)

# taking credentials from that container's own environment, 
# so the two ends need not share a user or a password
readonly PSQL='PGPASSWORD=$POSTGRES_PASSWORD psql -q -v ON_ERROR_STOP=1 -U $POSTGRES_USER -d $POSTGRES_DB'

# --- helpers ---

usage() {
  cat >&2 <<'EOF'
usage: sync-db.sh --host HOST [--user USER] [--key KEYFILE] [--days N] [--yes]

  --host HOST     ec2 address or ~/.ssh/config alias (required)
  --user USER     ssh user (default: ubuntu)
  --key KEYFILE   identity file; omit to use the agent or ~/.ssh/config
  --days N        how far back to copy (default: 10)
  --yes           skip the confirmation prompt
EOF
  exit 1
}

remote_psql() {
  ssh "${ssh_opts[@]}" "$ssh_target" "docker exec -i $REMOTE_CONTAINER sh -c '$PSQL $*'"
}

local_psql() {
  docker compose exec -T db sh -c "$PSQL $*"
}

# the row filter for each table, all against the same frozen bounds
table_filter() {
  local recent="(select id from snapshot where as_of >= '$cutoff' and id <= $ceiling)"
  case "$1" in
    snapshot) printf "as_of >= '%s' and id <= %s" "$cutoff" "$ceiling" ;;
    contract | cm_metric) printf 'snapshot_id in %s' "$recent" ;;
    trade) printf "ts >= '%s'" "$cutoff" ;;
    expiry_outcome) printf "expiry >= '%s'" "$cutoff" ;;
    market_report) printf "generated_at >= '%s'" "$cutoff" ;;
    *) die "no filter defined for table '$1'" ;;
  esac
}

# One table, streamed straight from the remote database into the local one. The \copy
# command goes in over ssh's stdin, which keeps it out of nested shell quoting.
sync_table() {
  local table="$1"
  printf '\\copy (select * from %s where %s) to stdout\n' "$table" "$(table_filter "$table")" |
    ssh "${ssh_opts[@]}" "$ssh_target" \
      "docker exec -i $REMOTE_CONTAINER sh -c '$PSQL' | gzip" |
    gunzip |
    docker compose exec -T db sh -c "$PSQL -c '\\copy $table from stdin'"
  log "copied $table"
}

# --- arguments ---

host=""
ssh_user="$DEFAULT_SSH_USER"
key=""
days="$DEFAULT_DAYS"
assume_yes=false

while (($#)); do
  case "$1" in
    --host) host="${2:-}" && shift 2 || usage ;;
    --user) ssh_user="${2:-}" && shift 2 || usage ;;
    --key) key="${2:-}" && shift 2 || usage ;;
    --days) days="${2:-}" && shift 2 || usage ;;
    --yes) assume_yes=true && shift ;;
    -h | --help) usage ;;
    *) die "unknown argument '$1' (try --help)" ;;
  esac
done

[[ -n "$host" ]] || usage
[[ -n "$ssh_user" ]] || die "--user cannot be empty"
[[ "$days" =~ ^[1-9][0-9]*$ ]] || die "--days must be a positive integer, got '$days'"
[[ -z "$key" || -f "$key" ]] || die "identity file '$key' does not exist"

ssh_target="$ssh_user@$host"
ssh_opts=(-o ConnectTimeout=10)
if [[ -n "$key" ]]; then
  ssh_opts+=(-i "$key")
fi

# --- preflight ---

cd_repo_root

require_commands ssh gzip gunzip
require_docker
require_env_file

log "checking $ssh_target"
ssh "${ssh_opts[@]}" "$ssh_target" \
  "docker inspect --format '{{.State.Status}}' $REMOTE_CONTAINER" |
  grep -qx running || die "'$REMOTE_CONTAINER' is not running on $host"

if [[ "$assume_yes" == false ]]; then
  read -r -p "[$TAG] this wipes the local archive and replaces it with $days days from $host. continue? [y/N] " reply
  [[ "$reply" == [yY] ]] || die "aborted"
fi

# --- local database ---

log "starting the local db"
docker compose up -d --wait db

log "migrating the local schema to head"
docker compose run --rm --no-deps core alembic upgrade head

# the local tape recorder polls every 60s and would write into the tables being loaded;
# the remote one keeps running, the sync only reads from it
core_was_running=false
if [[ -n "$(docker compose ps --status running -q core)" ]]; then
  core_was_running=true
  log "stopping core for the duration of the sync"
  docker compose stop core
fi

# --- copy ---

# Both bounds are read before the first copy and reused by every filter, so all six queries
# see one fixed set of snapshots. The remote recorder keeps running: without the ceiling, a
# snapshot committed between the snapshot and contract copies would contribute contract rows
# whose parent was never copied, and the local load would fail on the foreign key.
# `at time zone 'utc'` makes the cutoff a timestamptz, so the literal carries an offset and
# the filters do not depend on the server's TimeZone setting.
cutoff="$(remote_psql -At <<<"select (date_trunc('day', now() at time zone 'utc') - interval '$days days') at time zone 'utc';")"
cutoff="${cutoff%$'\r'}"
[[ -n "$cutoff" ]] || die "could not read the cutoff timestamp from $host"

ceiling="$(remote_psql -At <<<"select coalesce(max(id), 0) from snapshot;")"
ceiling="${ceiling%$'\r'}"
[[ "$ceiling" =~ ^[0-9]+$ ]] || die "could not read the snapshot id ceiling from $host"

log "copying everything at or after $cutoff"

local_psql <<<"truncate $(
  IFS=,
  echo "${TABLES[*]}"
) restart identity cascade;"

for table in "${TABLES[@]}"; do
  sync_table "$table"
done

# COPY inserts explicit ids without advancing the sequence behind them, so the next
# locally recorded snapshot would collide
local_psql <<'SQL'
select setval(pg_get_serial_sequence('snapshot', 'id'), coalesce(max(id), 1), max(id) is not null)
  from snapshot;
select setval(pg_get_serial_sequence('market_report', 'id'), coalesce(max(id), 1), max(id) is not null)
  from market_report;
analyze;
SQL

# --- report ---

local_psql <<'SQL'
select 'snapshot' as archive, count(*) as n, min(as_of)::text as earliest, max(as_of)::text as latest
  from snapshot
union all select 'contract', count(*), null, null from contract
union all select 'cm_metric', count(*), null, null from cm_metric
union all select 'trade', count(*), min(ts)::text, max(ts)::text from trade
union all select 'expiry_outcome', count(*), null, null from expiry_outcome
union all select 'market_report', count(*), null, null from market_report;
SQL

if [[ "$core_was_running" == true ]]; then
  log "restarting core"
  docker compose start core
fi

log "done"
