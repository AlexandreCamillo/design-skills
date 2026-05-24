#!/usr/bin/env bash
# mockup-upload — POST a mockup HTML file. Replaces `markup-cli mockup new/version`.
# Usage:   mockup-upload <file.html> [<slug>]
# Output:  JSON from server (includes hosted URL) to stdout.
# Exit:    0 ok; 1 net error; 2 missing env; 4 bad args / file missing.
set -euo pipefail

if [ -z "${MARKUP_URL:-}" ];   then echo "MARKUP_URL not set" >&2;   exit 2; fi
if [ -z "${MARKUP_TOKEN:-}" ]; then echo "MARKUP_TOKEN not set" >&2; exit 2; fi

file="${1:-}"
slug="${2:-}"
if [ -z "$file" ]; then
  echo "usage: mockup-upload <file.html> [<slug>]" >&2
  exit 4
fi
if [ ! -f "$file" ]; then
  echo "mockup-upload: file not found: $file" >&2
  exit 4
fi

# Slug header is optional — server can derive it from filename, but explicit beats implicit.
slug_header=()
if [ -n "$slug" ]; then
  slug_header=(-H "X-Mockup-Slug: ${slug}")
fi

resp=$(curl -sS -f -X POST --max-time 30 \
  -H "Authorization: Bearer ${MARKUP_TOKEN}" \
  -H "Content-Type: text/html" \
  "${slug_header[@]}" \
  --data-binary "@${file}" \
  "${MARKUP_URL}/api/mockups") || {
  echo "mockup-upload: upload failed" >&2
  exit 1
}
echo "$resp"
