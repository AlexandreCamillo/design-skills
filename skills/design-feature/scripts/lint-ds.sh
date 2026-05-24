#!/usr/bin/env bash
# lint-ds — structural lint of a DS file. Pure local; no network.
# Replaces `markup-cli check --build --strict`.
# Usage: lint-ds <file.html>
# Exit:  0 = pass; 3 = lint fail; 4 = bad args / file missing.
set -euo pipefail

file="${1:-}"
if [ -z "$file" ]; then
  echo "usage: lint-ds <file.html>" >&2
  exit 4
fi
if [ ! -f "$file" ]; then
  echo "lint-ds: file not found: $file" >&2
  exit 4
fi

fail=0

# §1 — at least one .row-states block with a .state cell inside it.
if ! grep -qE 'class="[^"]*row-states[^"]*"' "$file"; then
  echo "lint-ds: §1 missing — no class=\"row-states\" block found" >&2
  fail=1
elif ! grep -qE 'class="[^"]*state[^"]*"' "$file"; then
  echo "lint-ds: §1 incomplete — row-states present but no .state cell" >&2
  fail=1
fi

# §4 — at least one <pre class="api"> with non-empty body.
if ! grep -qE '<pre[^>]*class="[^"]*api[^"]*"' "$file"; then
  echo "lint-ds: §4 missing — no <pre class=\"api\"> block found" >&2
  fail=1
else
  content=$(awk '
    /<pre[^>]*class="[^"]*api[^"]*"/ { capture = 1; sub(/.*<pre[^>]*class="[^"]*api[^"]*">/, "") }
    capture { buf = buf $0 "\n" }
    /<\/pre>/ && capture { sub(/<\/pre>.*/, "", buf); print buf; exit }
  ' "$file" | tr -d '[:space:]')
  if [ -z "$content" ]; then
    echo "lint-ds: §4 empty — <pre class=\"api\"> body is whitespace only" >&2
    fail=1
  fi
fi

# §7 — at least one <dl class="tokens">.
if ! grep -qE '<dl[^>]*class="[^"]*tokens[^"]*"' "$file"; then
  echo "lint-ds: §7 missing — no <dl class=\"tokens\"> found" >&2
  fail=1
fi

# §8 — a "Behavior" header followed by at least one <li>.
if ! awk '
  BEGIN { seen_header = 0; ok = 0 }
  /<h[1-6][^>]*>.*[Bb]ehavior.*<\/h[1-6]>/ { seen_header = 1 }
  seen_header && /<li[ >]/ { ok = 1; exit }
  END { exit (ok ? 0 : 1) }
' "$file"; then
  echo "lint-ds: §8 missing — no <li> found after a Behavior header" >&2
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  exit 3
fi
echo "lint-ds: ok ($file)"
