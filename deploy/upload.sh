#!/usr/bin/env bash
set -euo pipefail

# Raw upload of deploy-upload/ via lftp. NOT the normal path -- use
# deploy/deploy.sh instead, which takes a backup first, bakes in a build id
# and assembles deploy-upload/ safely. This script is only for the very
# first install on an empty host (nothing to back up yet), or to re-push an
# already-assembled tree by hand.
#
# Reads credentials from environment variables you set in your OWN shell,
# never pasted into Claude. Example:
#
#   export GYM_FTP_HOST='ftp://ftp.example.com'
#   export GYM_FTP_USER='your-ftp-user'
#   read -s GYM_FTP_PASS   # types hidden, not stored in shell history
#   export GYM_FTP_PASS
#   ./deploy/upload.sh
#
# Uploads deploy-upload/ (assemble it with 'deploy/deploy.sh --dry-run'
# first) to the FTP root. NOTE: this assumes the FTP
# user is already chrooted to public_html/gym-tracker/ (true for Kay's
# account) -- if your FTP user's root is the whole public_html or the
# server root instead, change the remote target below to the real
# subpath, or you'll get a nested duplicate folder.

: "${GYM_FTP_HOST:?Set GYM_FTP_HOST first, e.g. export GYM_FTP_HOST=ftp://ftp.example.com}"
: "${GYM_FTP_USER:?Set GYM_FTP_USER first}"
: "${GYM_FTP_PASS:?Set GYM_FTP_PASS first -- use read -s to keep it out of shell history}"

cd "$(dirname "$0")/.."

if [ ! -d deploy-upload ]; then
    echo "deploy-upload/ not found -- run './deploy/deploy.sh --dry-run' first to assemble it." >&2
    exit 1
fi

# Deliberately NO --delete: deploy-upload/ never contains db/fitness.db or
# anything in uploads/ (those live only on the server, created by the
# running app) -- a reverse-mirror with --delete would wipe the real
# production database and any uploaded files on every re-deploy. The
# tradeoff is old content-hashed JS/CSS bundles from previous builds pile
# up in assets/ over time (harmless -- index.html always points at the
# current ones); clean those out by hand occasionally if it bothers you.
lftp -u "$GYM_FTP_USER,$GYM_FTP_PASS" "$GYM_FTP_HOST" <<EOF
set ftp:ssl-allow yes
set ssl:verify-certificate no
mirror --reverse --verbose deploy-upload /
bye
EOF

echo "Upload done. Now visit deploy/check-env.php and deploy/run-migration.php in the browser (see README)."
