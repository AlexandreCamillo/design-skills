#!/usr/bin/env bash
# sync-index — regenerate the DS index on the Markup server.
# Replaces `markup-cli sync-index`.
# Exit: 0 = ok; 1 = network error; 2 = missing env var.
set -euo pipefail

if [ -z "${MARKUP_URL:-}" ];   then echo "MARKUP_URL not set" >&2;   exit 2; fi
if [ -z "${MARKUP_TOKEN:-}" ]; then echo "MARKUP_TOKEN not set" >&2; exit 2; fi

resp=$(curl -sS -f -X POST --max-time 10 \
  -H "Authorization: Bearer ${MARKUP_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "${MARKUP_URL}/api/ds/sync-index") || {
  echo "sync-index: server error or unreachable" >&2
  exit 1
}
echo "$resp"
