# Scripts

Operational scripts for the deployed stack.

## deploy.sh

Brings the ec2 instance up to the latest `main`: fast-forwards the checkout, rebuilds the images, recreates
what changed, waits for every service to report healthy, then prunes dangling images and old build
cache. It's a no-op when there is nothing new.

Run it on the ec2 instance:

```sh
./scripts/deploy.sh   
./scripts/deploy.sh --force # rebuild the current commit anyway
```

## sync-db.sh

Copies a recent slice of the production archive into your local database, so dev work runs against
real data. It reaches the ec2 over ssh and reads only - the remote stack keeps running throughout.
The local archive is wiped first; this is a copy of production, not a merge.

Run it on a dev machine:

```sh
./scripts/sync-db.sh --host 1.1.1.1 --user user --key ~/.ssh/key.pem
./scripts/sync-db.sh --host host --days 30 --yes
```

## backup-db.sh

Takes a full `pg_dump` of the database and uploads it to S3. Safe to run against a live stack - the
dump reads a single transaction snapshot, so nothing needs stopping. It verifies the dump is
readable before uploading and holds a lock so a slow backup cannot overlap the next scheduled one.

```sh
./scripts/backup-db.sh                        # dump and upload to $BACKUP_S3_URI
./scripts/backup-db.sh --out /tmp/db.dump     # dump to a file, no upload
```

### Setting up

Retention lives on the bucket rather than in the script, which means the instance only ever needs
permission to upload. On AWS, once:

1. Create a bucket, and add a lifecycle rule expiring objects under the backup prefix.
2. Attach an IAM role to the instance allowing `s3:PutObject` on `arn:aws:s3:::BUCKET/PREFIX/*`.

Then on the ec2 instance:

```sh
sudo snap install aws-cli --classic
echo 'BACKUP_S3_URI=s3://BUCKET/PREFIX' >> .env
./scripts/backup-db.sh # to check if it works before scheduling
```

### Cron job

Schedule it as the same user that runs the stack - it needs to be in the `docker` group. Open the
crontab with `crontab -e` and add, for a weekly backup every Sunday at 02:00:

```
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin
0 2 * * 0 cd /path/to/crypto-datadesk && ./scripts/backup-db.sh >> ~/datadesk-backup.log 2>&1
```

The `PATH` line matters: cron's default does not include `/snap/bin`, where the aws cli lands and
the script would fail its preflight every week. Adjust the path to the checkout if it differs.
Times are in the system timezone.

Confirm it took with `crontab -l`, and check after the first run:

```sh
tail ~/datadesk-backup.log
aws s3 ls s3://BUCKET/PREFIX/
```

Each run writes two lines to that log, so it grows slowly; there is no rotation on it.

### Restoring

```sh
aws s3 cp s3://BUCKET/PREFIX/datadesk-20260817T020000Z.dump /tmp/restore.dump
docker compose exec -T db sh -c \
  'PGPASSWORD=$POSTGRES_PASSWORD pg_restore -U $POSTGRES_USER -d $POSTGRES_DB --clean --if-exists' \
  < /tmp/restore.dump
```

Worth rehearsing against a throwaway database now and then.
