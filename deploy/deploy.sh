#!/usr/bin/env bash
#
# deploy.sh -- the ONE way to deploy. Always the same five steps:
#
#   1  build id      from git commit + timestamp, baked into the frontend
#   2  backup        live DB + uploads pulled to backups/<build-id>/  (aborts on failure)
#   3  build         frontend/dist/
#   4  assemble      deploy-upload/  -- rebuilt from scratch, never contains a database
#   5  upload        deploy-upload/ -> FTP root, without --delete
#
# Then it appends one line to DEPLOYMENTS.md.
#
# Zugangsdaten kommen aus deploy/env (gitignored, Vorlage: deploy/env.example).
#
# Usage:
#   ./deploy/deploy.sh ["was sich geändert hat"]
#
# Flags:
#   --dry-run          do steps 1-4, skip the upload (inspect deploy-upload/ by hand)
#   --with-migration   also upload deploy/check-env.php + run-migration.php with a
#                      FRESH one-time token, print the URL, then delete them from the
#                      server again. Only needed when db/schema.sql changed.
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

ROOT=$(pwd)

DRY_RUN=0
WITH_MIGRATION=0
NOTE=""
for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=1 ;;
        --with-migration) WITH_MIGRATION=1 ;;
        --*) echo "Unknown flag: $arg" >&2; exit 1 ;;
        *) NOTE="$arg" ;;
    esac
done

if [ "$DRY_RUN" -eq 0 ]; then
    : "${GYM_FTP_HOST:?GYM_FTP_HOST fehlt -- trage ihn in deploy/env ein}"
    : "${GYM_FTP_USER:?GYM_FTP_USER fehlt -- trage ihn in deploy/env ein}"
    : "${GYM_FTP_PASS:?GYM_FTP_PASS fehlt -- trage das FTP-Passwort in deploy/env ein}"
    command -v lftp >/dev/null || { echo "lftp missing -- brew install lftp" >&2; exit 1; }
fi
command -v npm >/dev/null || { echo "npm missing." >&2; exit 1; }

# ---- 1  build id -----------------------------------------------------
COMMIT=$(git rev-parse --short HEAD)
DIRTY=""
if [ -n "$(git status --porcelain)" ]; then
    DIRTY="-dirty"
    echo "WARNING: working tree has uncommitted changes -- build id gets a '-dirty' suffix."
fi
BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
BUILD_ID="$(date -u +%Y%m%d-%H%M)-${COMMIT}${DIRTY}"

echo "=========================================================="
echo " Build $BUILD_ID"
[ -n "$NOTE" ] && echo " Note:  $NOTE"
echo "=========================================================="

# ---- 2  backup FIRST -------------------------------------------------
# Before a single byte is uploaded. If this fails the deploy stops here --
# the data is worth more than the release.
if [ "$DRY_RUN" -eq 1 ]; then
    echo "==> [1/5] backup SKIPPED (--dry-run)"
else
    echo "==> [1/5] backup"
    "$ROOT/deploy/backup.sh" "$BUILD_ID"
fi

# ---- 3  build --------------------------------------------------------
echo "==> [2/5] build frontend"
(
    cd frontend
    VITE_BUILD_ID="$BUILD_ID" \
    VITE_BUILD_COMMIT="$COMMIT" \
    VITE_BUILD_TIME="$BUILD_TIME" \
        npm run build
)

# ---- 4  assemble -----------------------------------------------------
# Rebuilt from scratch every time, from an explicit whitelist. This is the
# step that protects the live data: a database file can never end up in
# deploy-upload/, so it can never be uploaded over the live one.
echo "==> [3/5] assemble deploy-upload/"
rm -rf deploy-upload
mkdir -p deploy-upload

cp -R frontend/dist/. deploy-upload/

# api/ without tests (would be publicly reachable) and without the local
# config override (that one describes YOUR machine, not the server).
rsync -a --exclude 'tests/' --exclude 'config.local.php' api/ deploy-upload/api/

# db/ without any database file -- schema + seeds only. sessions/ holds the
# local PHP session files; the server keeps its own.
rsync -a --exclude 'fitness.db' --exclude '*.db-journal' --exclude '*.sqlite' --exclude 'sessions/' db/ deploy-upload/db/

# Empty uploads/ so the directory exists on a fresh install. Real images
# live only on the server.
mkdir -p deploy-upload/uploads && touch deploy-upload/uploads/.gitkeep

# Build marker, readable without opening the app: /build.json
NOTE_JSON=$(printf '%s' "${NOTE:-}" | sed 's/\\/\\\\/g; s/"/\\"/g')
cat > deploy-upload/build.json <<EOF
{"build_id":"$BUILD_ID","commit":"$COMMIT","built_at":"$BUILD_TIME","note":"$NOTE_JSON"}
EOF

# Setup scripts stay OFF the server by default -- run-migration.php can
# re-run migrations with a hardcoded token, so it must never sit there.
if [ "$WITH_MIGRATION" -eq 1 ]; then
    FRESH_TOKEN=$(openssl rand -hex 16)
    mkdir -p deploy-upload/deploy
    cp deploy/check-env.php deploy-upload/deploy/
    sed "s/^\$TOKEN = '.*';/\$TOKEN = '$FRESH_TOKEN';/" deploy/run-migration.php > deploy-upload/deploy/run-migration.php
    grep -q "$FRESH_TOKEN" deploy-upload/deploy/run-migration.php \
        || { echo "ERROR: could not inject a fresh migration token." >&2; exit 1; }
fi

# Last line of defence: assert no database slipped into the tree.
if find deploy-upload -name '*.db' -o -name '*.sqlite' | grep -q .; then
    echo "ERROR: a database file ended up in deploy-upload/ -- aborting before upload." >&2
    find deploy-upload -name '*.db' -o -name '*.sqlite' >&2
    exit 1
fi
echo "    $(find deploy-upload -type f | wc -l | tr -d ' ') files, no database present"

# ---- 5  upload -------------------------------------------------------
if [ "$DRY_RUN" -eq 1 ]; then
    echo "==> [4/5] upload SKIPPED (--dry-run) -- inspect deploy-upload/"
    echo "==> [5/5] log SKIPPED (--dry-run)"
    exit 0
fi

echo "==> [4/5] upload"
# No --delete, on purpose: deploy-upload/ has no fitness.db and no images,
# so a mirroring delete would erase the live database and every uploaded
# file on every single deploy.
lftp -u "$GYM_FTP_USER,$GYM_FTP_PASS" "$GYM_FTP_HOST" <<EOF
set ftp:ssl-allow yes
set ssl:verify-certificate no
set cmd:fail-exit yes
mirror --reverse --verbose deploy-upload /
bye
EOF

if [ "$WITH_MIGRATION" -eq 1 ]; then
    echo
    if [ -n "${GYM_APP_URL:-}" ]; then
        # Non-interactive path: call the trigger ourselves so a deploy never
        # depends on somebody being at the keyboard, and the setup scripts are
        # guaranteed to be removed in the same run.
        MIGRATION_URL="${GYM_APP_URL%/}/deploy/run-migration.php?token=$FRESH_TOKEN"
        echo "  Running migration: ${GYM_APP_URL%/}/deploy/run-migration.php"
        MIGRATION_OUT=$(curl -fsSL --max-time 120 "$MIGRATION_URL" 2>&1) || MIGRATION_FAILED=1
        echo "$MIGRATION_OUT" | sed 's/^/    /'
        if [ -n "${MIGRATION_FAILED:-}" ]; then
            echo "  !! Migration failed. The setup scripts are still on the server --" >&2
            echo "     fix the cause, re-run, and do not leave them there." >&2
        fi
    else
        echo "  Run the migration now, in a browser:"
        echo "    ${GYM_APP_URL:-https://<domain>}/deploy/run-migration.php?token=$FRESH_TOKEN"
        echo "    (add &password=<app-password> only if this install has none yet)"
        echo
        read -r -p "  Press Enter once it finished -- the setup scripts get deleted from the server. " || true
    fi

    # Always remove them, even after a failed migration -- a token-guarded
    # migration trigger must not stay live. It gets re-uploaded with a fresh
    # token on the next --with-migration run.
    lftp -u "$GYM_FTP_USER,$GYM_FTP_PASS" "$GYM_FTP_HOST" <<EOF
set ftp:ssl-allow yes
set ssl:verify-certificate no
rm -f deploy/run-migration.php
rm -f deploy/check-env.php
rmdir deploy
bye
EOF
    echo "  Setup scripts removed from the server."
    [ -z "${MIGRATION_FAILED:-}" ] || exit 1
fi

# ---- log -------------------------------------------------------------
echo "==> [5/5] log"
[ -f DEPLOYMENTS.md ] || printf '# DEPLOYMENTS.md — deployment log\n\nOne line per deploy, newest at the bottom. Written by `deploy/deploy.sh`.\n\n| Build ID | Commit | Deployed (UTC) | Backup | Note |\n| :--- | :--- | :--- | :--- | :--- |\n' > DEPLOYMENTS.md
printf '| `%s` | `%s` | %s | `backups/%s/` | %s |\n' \
    "$BUILD_ID" "$COMMIT" "$BUILD_TIME" "$BUILD_ID" "${NOTE:-—}" >> DEPLOYMENTS.md

echo
echo "Done. Build $BUILD_ID is live. Backup in backups/$BUILD_ID/."
echo "Verify: Settings -> About shows build $BUILD_ID."
