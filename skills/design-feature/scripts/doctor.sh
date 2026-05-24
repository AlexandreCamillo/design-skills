#!/usr/bin/env bash
# doctor — version check + reachability probe. Replaces `markup-cli doctor --json`.
# Output: JSON to stdout matching the legacy schema's `markup` block.
# Exit:   0 = reachable; 1 = network error; 2 = missing env var.
set -euo pipefail

if [ -z "${MARKUP_URL:-}" ]; then
  printf 'MARKUP_URL not set (e.g., https://markup.example.com)\n' >&2
  exit 2
fi
if [ -z "${MARKUP_TOKEN:-}" ]; then
  printf 'MARKUP_TOKEN not set\n' >&2
  exit 2
fi

resp=$(curl -sS -f --max-time 5 \
  -H "Authorization: Bearer ${MARKUP_TOKEN}" \
  "${MARKUP_URL}/api/version" 2>/dev/null) || {
  printf '{"markup":{"configured":true,"url":"%s","ok":false,"error":"unreachable"}}\n' "${MARKUP_URL}"
  exit 1
}

# Extract "version":"X.Y.Z" without jq. Fall back to "unknown" if absent.
actual=$(printf '%s' "$resp" | grep -oE '"version"[[:space:]]*:[[:space:]]*"[^"]+"' | head -n1 | sed -E 's/.*"([^"]+)"$/\1/')
[ -z "$actual" ] && actual="unknown"

printf '{"markup":{"configured":true,"url":"%s","actual":"%s","api":"v1","ok":true}}\n' "${MARKUP_URL}" "${actual}"
