#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
db="$root/data/warmups.sqlite"
remote="${DB_BACKUP_REPO:-https://github.com/0xreentrant/10pwarmups-db.git}"

if [[ ! -f "$db" ]]; then
  echo "missing $db" >&2
  exit 1
fi

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

git init -q "$work"
git -C "$work" remote add origin "$remote"
if git -C "$work" fetch --depth 1 origin main; then
  git -C "$work" checkout -q -b main origin/main
else
  git -C "$work" checkout -q -b main
fi

python3 - "$db" "$work/warmups.sqlite" <<'PY'
import sqlite3
import sys
src = sqlite3.connect(sys.argv[1])
dst = sqlite3.connect(sys.argv[2])
src.backup(dst)
dst.close()
src.close()
PY
git -C "$work" add warmups.sqlite
if git -C "$work" diff --cached --quiet; then
  echo "backup already current"
  exit 0
fi

git -C "$work" commit -q -m "Backup warmups.sqlite"
git -C "$work" push -u origin main
echo "backed up to $remote"
