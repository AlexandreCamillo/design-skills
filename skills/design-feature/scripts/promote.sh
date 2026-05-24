#!/usr/bin/env bash
# promote — copy mockup to DS folder, enforce marker, POST to server.
# Replaces `markup-cli promote <file> --component <slug>`.
# Usage: promote <file.html> <slug>
# Exit:  0 ok; 1 net error; 2 missing env; 4 bad args / file missing.
set -euo pipefail

if [ -z "${MARKUP_URL:-}" ];   then echo "MARKUP_URL not set" >&2;   exit 2; fi
if [ -z "${MARKUP_TOKEN:-}" ]; then echo "MARKUP_TOKEN not set" >&2; exit 2; fi

src="${1:-}"
slug="${2:-}"
if [ -z "$src" ] || [ -z "$slug" ]; then
  echo "usage: promote <file.html> <slug>" >&2
  exit 4
fi
if [ ! -f "$src" ]; then
  echo "promote: source file not found: $src" >&2
  exit 4
fi
# Slug must be kebab-case (matches the convention used everywhere in the skill).
# Constrains the value so the subsequent grep and sed patterns can interpolate
# it without regex/replacement metacharacter risk.
if [[ ! "$slug" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo "promote: slug must match ^[a-z][a-z0-9-]*$ (kebab-case): $slug" >&2
  exit 4
fi

ds_dir="docs/design/design-system"
mkdir -p "$ds_dir"

# Compute next NN by scanning existing NN-*.html files.
max=0
for f in "$ds_dir"/[0-9][0-9]-*.html; do
  [ -e "$f" ] || continue
  base=$(basename "$f")
  n=$(printf '%s' "$base" | sed -E 's/^([0-9]{2})-.*/\1/')
  # strip leading zero for arithmetic
  n_int=$((10#$n))
  if [ "$n_int" -gt "$max" ]; then
    max=$n_int
  fi
done
next=$(printf '%02d' $((max + 1)))
dest="${ds_dir}/${next}-${slug}.html"

cp "$src" "$dest"

# Enforce marker. If `data-ds-component="<slug>"` already present anywhere, skip.
if ! grep -qE "data-ds-component=\"${slug}\"" "$dest"; then
  tmp=$(mktemp)
  sed -E "s|<body([^>]*)>|<body\1 data-ds-component=\"${slug}\">|" "$dest" > "$tmp"
  mv "$tmp" "$dest"
fi

# POST to server.
resp=$(curl -sS -f -X POST --max-time 30 \
  -H "Authorization: Bearer ${MARKUP_TOKEN}" \
  -H "Content-Type: text/html" \
  -H "X-Component-Slug: ${slug}" \
  --data-binary "@${dest}" \
  "${MARKUP_URL}/api/ds/components") || {
  echo "promote: upload failed (local file written: ${dest})" >&2
  exit 1
}

echo "promote: ok — wrote ${dest}, server resp: ${resp}"
