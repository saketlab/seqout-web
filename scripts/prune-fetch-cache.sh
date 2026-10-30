#!/usr/bin/env bash
# Once over CAP, delete the oldest entries (by mtime) down to TARGET.
# Installed by deploy.yml as a cron job for the deploy user.

set -euo pipefail

DIR="${FETCH_CACHE_DIR:-/var/www/sramap/current/.next/cache/fetch-cache}"
CAP_KB=$(( ${CAP_MB:-51200} * 1024 ))
TARGET_KB=$(( ${TARGET_MB:-40960} * 1024 ))

[[ -d "$DIR" ]] || exit 0
exec 9>/tmp/prune-fetch-cache.lock
flock -n 9 || exit 0

LIST=$(mktemp)
trap 'rm -f "$LIST"' EXIT
# entry names are hex hashes, so whitespace-split fields are safe
find "$DIR" -maxdepth 1 -type f -printf '%T@ %k %p\n' > "$LIST"
used=$(awk '{ s += $2 } END { print s + 0 }' "$LIST")
(( used > CAP_KB )) || exit 0

echo "$(date -u -Iseconds) fetch-cache ${used}KB > cap ${CAP_KB}KB, pruning to ${TARGET_KB}KB"
sort -n "$LIST" |
    awk -v over=$(( used - TARGET_KB )) 'freed >= over { exit } { freed += $2; print $3 }' |
    xargs -r rm -f --
