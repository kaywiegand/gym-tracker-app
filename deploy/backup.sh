#!/usr/bin/env bash
#
# backup.sh -- pull the LIVE data from Hetzner into backups/<id>/.
#
# Pulls two things, and only these two:
#   db/fitness.db   the whole database (every workout, set, scan)
#   uploads/        the image files (not part of the JSON backup)
#
# Nothing is ever written to the server. Run it any time, not just before
# a deploy. deploy.sh calls it automatically and refuses to continue if it
# fails.
#
# Zugangsdaten kommen aus deploy/env (gitignored, Vorlage: deploy/env.example).
#
#   ./deploy/backup.sh [backup-id]
#
set -euo pipefail

cd "$(dirname "$0")/.."

# Zugangsdaten aus deploy/env (gitignored). Bereits gesetzte Umgebungs-
# variablen gewinnen -- so lässt sich einmalig etwas überschreiben.
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

command -v lftp >/dev/null || { echo "lftp missing -- brew install lftp" >&2; exit 1; }

BACKUP_ID="${1:-$(date -u +%Y%m%d-%H%M%S)}"
DEST="backups/$BACKUP_ID"

if [ -e "$DEST" ]; then
    echo "ERROR: $DEST already exists -- refusing to overwrite an existing backup." >&2
    exit 1
fi

echo "==> Backup $BACKUP_ID -> $DEST"
mkdir -p "$DEST"

# cmd:fail-exit makes lftp abort and exit non-zero on the FIRST failing
# command. Without it a missing remote file just prints a warning and the
# script would happily continue with an empty "backup".
lftp -u "$GYM_FTP_USER,$GYM_FTP_PASS" "$GYM_FTP_HOST" <<EOF
set ftp:ssl-allow yes
set ssl:verify-certificate no
set cmd:fail-exit yes
get db/fitness.db -o $DEST/fitness.db
mirror --verbose uploads $DEST/uploads
bye
EOF

# --- verify: a backup we cannot read is not a backup -------------------
DB="$DEST/fitness.db"
[ -s "$DB" ] || { echo "ERROR: $DB is missing or empty." >&2; exit 1; }

if [ "$(head -c 15 "$DB")" != "SQLite format 3" ]; then
    echo "ERROR: $DB is not a SQLite file (wrong remote path, or the host uses the MySQL fallback)." >&2
    exit 1
fi

if command -v sqlite3 >/dev/null; then
    CHECK=$(sqlite3 "$DB" "PRAGMA integrity_check;" 2>&1 | head -1)
    [ "$CHECK" = "ok" ] || { echo "ERROR: integrity check failed: $CHECK" >&2; exit 1; }
    SESSIONS=$(sqlite3 "$DB" "SELECT count(*) FROM sessions WHERE deleted_at IS NULL;")
    SETS=$(sqlite3 "$DB" "SELECT count(*) FROM sets WHERE deleted_at IS NULL;")
    WORKOUTS=$(sqlite3 "$DB" "SELECT count(*) FROM workouts WHERE deleted_at IS NULL;")
    SCANS=$(sqlite3 "$DB" "SELECT count(*) FROM bia_measurements WHERE deleted_at IS NULL;")
else
    SESSIONS='?'; SETS='?'; WORKOUTS='?'; SCANS='?'
fi

DB_SIZE=$(wc -c < "$DB" | tr -d ' ')
UPLOAD_FILES=$(find "$DEST/uploads" -type f 2>/dev/null | wc -l | tr -d ' ')

cat > "$DEST/manifest.txt" <<EOF
backup_id     $BACKUP_ID
pulled_at     $(date -u +%Y-%m-%dT%H:%M:%SZ)
source        $GYM_FTP_HOST (user $GYM_FTP_USER)
db_bytes      $DB_SIZE
integrity     ok
workouts      $WORKOUTS
sessions      $SESSIONS
sets          $SETS
bia_scans     $SCANS
upload_files  $UPLOAD_FILES
EOF

echo "--- backup verified ---"
cat "$DEST/manifest.txt"
