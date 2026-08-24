# Runbook

One-shot scripts over the archive. The service never schedules them - each is run by an
operator when there is a reason to, and each is safe to re-run or resume.

All of them run on the server, inside the running core container: it has the code, the
dependencies and the `.env` settings, and the database DSN points at the `db` hostname
that only resolves on the compose network. Deploy before running - the image must
contain these modules - and do not run `deploy.sh` mid-run: rebuilding the core
container kills the exec'd process (harmless, but avoidable).

## derived

Restores the book-derived scalars and the CM grid for snapshots where they were never
written - after a migration adds a derived column, or after a capture-time bug left
NULLs. Reads only the archived books; no upstream involved.

Run it whenever such snapshots exist; it finds them itself and exits quickly when there
is nothing to do:

```sh
docker compose exec core python -m data.storage.backfill.derived
```

Idempotent - only snapshots still missing derived data are touched.

## tape

Deepens the trade tape from Deribit's history host (`deribit_history_api_url`), which
serves full trade history where the main host only returns a recent window. The tape is
what signs dealer inventory, so its depth is the exposure charts' coverage: prints on a
contract made before the tape began are invisible, and that contract's open interest
carries less (or no) exposure. Default reach is `--days 365`, matching retention.

A full run pages for hours, so keep it alive across the ssh session and keep the
progress log:

```sh
tmux new -s tape-backfill
docker compose exec core python -m data.storage.backfill.tape 2>&1 | tee ~/tape-backfill.log
# detach with ctrl+b d, reattach with: tmux attach -t tape-backfill
```

Safe to re-run - prints deduplicate on their primary key. An interrupted run resumes
from the last timestamp the log reported:

```sh
docker compose exec core python -m data.storage.backfill.tape --from-ts 2026-05-14T00:00:00
```

## gex

Rewrites every capture's `gex_flip`, `gex_net_total` and `oi_explained_fraction` by
replaying cumulative taker flow up to each capture's `as_of` - the archived series gets
the same signing the live route serves, one meaning end to end. Captures older than the
earliest archived print get NULLs rather than a fabricated zero.

Run it after `tape`, on the same day: the nightly retention sweep (00:00 UTC) prunes
prints older than `retention_days`, and the replay should see the tape at its deepest.

```sh
docker compose exec core python -m data.storage.backfill.gex
```

Deterministic for a given tape, so re-running is safe; it rewrites all captures each
time.
