#!/usr/bin/env bash
set -euo pipefail

# One-command deploy upload via lftp (mirror -R = local -> remote, whole
# tree, no clicking through a browser file manager). Run this yourself --
# it reads credentials from environment variables you set in your OWN
# shell, never pasted into Claude. Example:
#
#   export GYM_FTP_HOST='ftp://ftp.example.com'
#   export GYM_FTP_USER='your-ftp-user'
#   read -s GYM_FTP_PASS   # types hidden, not stored in shell history
#   export GYM_FTP_PASS
#   ./deploy/upload.sh
#
# Uploads deploy-upload/ (rebuild it first if the frontend changed --
# see README's Deploy section) to /public_html/gym-tracker/.

: "${GYM_FTP_HOST:?Set GYM_FTP_HOST first, e.g. export GYM_FTP_HOST=ftp://ftp.example.com}"
: "${GYM_FTP_USER:?Set GYM_FTP_USER first}"
: "${GYM_FTP_PASS:?Set GYM_FTP_PASS first -- use read -s to keep it out of shell history}"

cd "$(dirname "$0")/.."

if [ ! -d deploy-upload ]; then
    echo "deploy-upload/ not found -- run 'cd frontend && npm run build' first, then re-assemble it." >&2
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
mirror --reverse --verbose deploy-upload /public_html/gym-tracker
bye
EOF

echo "Upload done. Now visit deploy/check-env.php and deploy/run-migration.php in the browser (see README)."
