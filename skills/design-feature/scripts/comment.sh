#!/usr/bin/env bash
# comment — REST wrapper around the Markup comments endpoints.
# Subcommands: list <mockup-id> [--status <s>] | read <id> | reply <id> <body> |
#              react <id> <emoji> | resolve <id> [<body>]
# Exit: 0 ok; 1 net error; 2 missing env; 4 bad args.
set -euo pipefail

if [ -z "${MARKUP_URL:-}" ];   then echo "MARKUP_URL not set" >&2;   exit 2; fi
if [ -z "${MARKUP_TOKEN:-}" ]; then echo "MARKUP_TOKEN not set" >&2; exit 2; fi

auth=(-H "Authorization: Bearer ${MARKUP_TOKEN}")
ct=(-H "Content-Type: application/json")

# JSON-escape an arbitrary string. Uses python3, falls back to node.
json_escape() {
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$1" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'
  elif command -v node >/dev/null 2>&1; then
    printf '%s' "$1" | node -e 'process.stdout.write(JSON.stringify(require("fs").readFileSync(0,"utf8")))'
  else
    echo "comment: need python3 or node on PATH to escape JSON bodies" >&2
    exit 1
  fi
}

sub="${1:-}"
shift || true
case "$sub" in
  list)
    id="${1:-}"
    if [ -z "$id" ]; then echo "usage: comment list <mockup-id> [--status <s>]" >&2; exit 4; fi
    qs=""
    if [ "${2:-}" = "--status" ] && [ -n "${3:-}" ]; then qs="?status=$3"; fi
    curl -sS -f "${auth[@]}" "${MARKUP_URL}/api/mockups/${id}/comments${qs}" ;;
  read)
    id="${1:-}"
    if [ -z "$id" ]; then echo "usage: comment read <id>" >&2; exit 4; fi
    curl -sS -f "${auth[@]}" "${MARKUP_URL}/api/comments/${id}" ;;
  reply)
    id="${1:-}"
    body="${2:-}"
    if [ -z "$id" ] || [ -z "$body" ]; then echo "usage: comment reply <id> <body>" >&2; exit 4; fi
    body_json=$(json_escape "$body")
    curl -sS -f -X POST "${auth[@]}" "${ct[@]}" \
      -d "{\"body\":${body_json}}" "${MARKUP_URL}/api/comments/${id}/replies" ;;
  react)
    id="${1:-}"
    emoji="${2:-}"
    if [ -z "$id" ] || [ -z "$emoji" ]; then echo "usage: comment react <id> <emoji>" >&2; exit 4; fi
    emoji_json=$(json_escape "$emoji")
    curl -sS -f -X POST "${auth[@]}" "${ct[@]}" \
      -d "{\"emoji\":${emoji_json}}" "${MARKUP_URL}/api/comments/${id}/reactions" ;;
  resolve)
    id="${1:-}"
    body="${2:-}"
    if [ -z "$id" ]; then echo "usage: comment resolve <id> [<body>]" >&2; exit 4; fi
    if [ -n "$body" ]; then
      body_json=$(json_escape "$body")
      payload="{\"body\":${body_json}}"
    else
      payload="{}"
    fi
    curl -sS -f -X POST "${auth[@]}" "${ct[@]}" \
      -d "$payload" "${MARKUP_URL}/api/comments/${id}/resolve" ;;
  *)
    echo "usage: comment <list|read|reply|react|resolve> [args...]" >&2
    exit 4 ;;
esac
