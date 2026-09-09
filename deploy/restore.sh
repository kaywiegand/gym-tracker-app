#!/usr/bin/env bash
set -euo pipefail

# Apply a backup-restore JSON to the live database, for hosts without SSH.
#
#   ./deploy/restore.sh uploads/gym-update-20260910.json
#
# Backs up first (the same guard deploy.sh uses -- "die Daten sind unser
# Gold"), uploads deploy/run-restore.php with a FRESH one-time token plus the
# JSON, calls it, and deletes both from the server again whatever the outcome.
# The trigger writes to the live database, so it must never stay there.
#
# Restores are idempotent -- every row carries its id -- so a second run
# updates the same rows instead of duplicating them.

cd "$(dirname "$0")/.."

FILE="${1:?usage: ./deploy/restore.sh <backup.json>}"
[ -f "$FILE" ] || { echo "Not found: $FILE" >&2; exit 1; }
python3 -c "import json,sys; d=json.load(open(sys.argv[1])); assert isinstance(d.get('tables'), dict)" "$FILE" \
    || { echo "Not a backup file: $FILE" >&2; exit 1; }

if [ -f deploy/env ]; then
    while IFS='=' read -r key value; do
        case "$key" in ''|\#*) continue ;; esac
        eval "current=\${$key-}"
        [ -n "$current" ] || export "$key=$value"
    done < deploy/env
fi
: "${GYM_FTP_HOST:?GYM_FTP_HOST fehlt -- trage ihn in deploy/env ein}"
: "${GYM_FTP_USER:?GYM_FTP_USER fehlt -- trage ihn in deploy/env ein}"
: "${GYM_FTP_PASS:?GYM_FTP_PASS fehlt -- trage das FTP-Passwort in deploy/env ein}"
: "${GYM_APP_URL:?GYM_APP_URL fehlt -- trage die App-URL in deploy/env ein}"
command -v lftp >/dev/null || { echo "lftp missing -- brew install lftp" >&2; exit 1; }

echo "==> [1/4] backup"
./deploy/backup.sh >/dev/null || { echo "Backup failed -- not touching the live data." >&2; exit 1; }
echo "    ok"

echo "==> [2/4] upload"
TOKEN=$(openssl rand -hex 16)
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
NAME="restore-$(date -u +%Y%m%d-%H%M%S).json"
cp "$FILE" "$STAGE/$NAME"
sed "s/^\$TOKEN = '.*';/\$TOKEN = '$TOKEN';/" deploy/run-restore.php > "$STAGE/run-restore.php"
grep -q "$TOKEN" "$STAGE/run-restore.php" || { echo "ERROR: could not inject a fresh token." >&2; exit 1; }

lftp -u "$GYM_FTP_USER,$GYM_FTP_PASS" "$GYM_FTP_HOST" <<EOF
set ftp:ssl-allow true
set ssl:verify-certificate no
set cmd:fail-exit yes
mkdir -f deploy
put -O deploy "$STAGE/run-restore.php" -o run-restore.php
put -O deploy "$STAGE/$NAME" -o "$NAME"
bye
EOF
echo "    ok"

echo "==> [3/4] restore"
STATUS=0
OUT=$(curl -fsSL --max-time 300 "${GYM_APP_URL%/}/deploy/run-restore.php?token=$TOKEN&file=$NAME" 2>&1) || STATUS=1
echo "$OUT" | sed 's/^/    /'

echo "==> [4/4] remove the trigger"
lftp -u "$GYM_FTP_USER,$GYM_FTP_PASS" "$GYM_FTP_HOST" <<EOF
set ftp:ssl-allow true
set ssl:verify-certificate no
rm -f deploy/run-restore.php
rm -f "deploy/$NAME"
bye
EOF
echo "    ok"

if [ "$STATUS" -ne 0 ]; then
    echo "!! Restore failed -- the live data is unchanged and the backup from step 1 stands." >&2
    exit 1
fi
echo
echo "Done."
