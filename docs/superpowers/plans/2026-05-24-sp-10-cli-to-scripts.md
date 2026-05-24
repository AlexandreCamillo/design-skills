# Sub-plan 10 — Replace `markup-cli` with in-skill bash + PowerShell scripts + inline REST

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `markup-cli` npm-package dependency from both skills. Replace deterministic operations (auth check, mockup upload, promote, structural lint, index sync) with shell scripts shipped inside the skill directory (`*.sh` for Unix + `*.ps1` for Windows, no extra runtime dependencies). Replace chatty / read-only operations (comments triage, version check) with direct REST calls — either inline `curl`/`Invoke-RestMethod` in skill prose or thin script wrappers. The two skills continue to share the same script directory via the existing cross-skill reference pattern.

**Architecture:** The skill prose stops invoking `markup-cli <verb>` anywhere. Instead it invokes `./scripts/<op>.sh` on Unix and `pwsh ./scripts/<op>.ps1` on Windows — the OS-resolution rule is stated once at the top of `design-feature/SKILL.md` and referenced thereafter. Scripts live under `skills/design-feature/scripts/`; `bootstrap-design-system/SKILL.md` references them via `../design-feature/scripts/<op>.<ext>` (same cross-skill pattern already used for the bundled DS pattern template). Auth + server location are read from two env vars: `MARKUP_URL` and `MARKUP_TOKEN` — no persistent connect/login state, no config file. Scripts use only OS defaults (`curl`, `grep`, `sed`, POSIX `bash`; `Invoke-RestMethod`, `Select-String`, `ConvertFrom-Json` on PowerShell 5.1+) and parse JSON without `jq` (regex on Unix, native cmdlet on PowerShell). A Node mock server lives under top-level `scripts/` for smoke tests only — it is dev infrastructure, never shipped to consumers. `compat.cli` disappears from both SKILL.md frontmatters; `compat.markup` stays (it still represents an API contract). `validate.mjs` swaps its `KNOWN_CLI_COMMANDS` check for a script-existence + `.sh`/`.ps1` parity check.

**Tech Stack:** POSIX bash 3.2+ (Mac /bin/bash baseline), PowerShell 5.1+ (Windows 10 default), `curl` 7.x+ (ships on Windows 10+ as `curl.exe`, on macOS, on all modern Linux distros), GNU/BSD `grep` + `sed`. Markdown SKILL.md. Existing Node 20 toolchain for `validate.mjs`, `smoke-test.mjs`, `build-template.mjs`, and the new `scripts/mock-markup-server.mjs` (dev-only).

---

## Pre-flight (already done in this session)

Before this plan runs, the following cleanup was already applied and committed-or-uncommitted in the working tree:

- `skills/design-feature/SKILL.md` — removed full-prototype invariants (lines ~1092-1093), removed "(no sidecar)" parenthetical on Phase 5 driver line, removed "Do NOT include tasks that update QA sidecars or full-prototype files" sentence from Phase 4 plan instruction.
- `skills/bootstrap-design-system/SKILL.md` — removed disclaimer paragraph announcing "NÃO produz full-prototype", removed "(instead of creating a sidecar)" parenthetical from Step D step 3, removed `Pra montar um full-prototype: faz manual` bullet from Step E closing summary.
- `validate.mjs` — removed `'upload-prototype'` from `KNOWN_CLI_COMMANDS`.
- Validator passes: `node validate.mjs` reports `✓ Validated 2 skill(s); no issues.`

**Verification at the top of Task 1:** run `node validate.mjs` and confirm the pre-flight is intact. If it fails, fix or revert before continuing.

---

## Scope ledger (what is and is NOT in this plan)

**In scope:**

1. Replace every `markup-cli <verb>` invocation in `skills/design-feature/SKILL.md` and `skills/bootstrap-design-system/SKILL.md` with either a script invocation (`./scripts/<op>.sh` | `pwsh ./scripts/<op>.ps1`) or inline `curl` / `Invoke-RestMethod`.
2. Create the script files under `skills/design-feature/scripts/` (one pair `.sh` + `.ps1` per operation: `doctor`, `mockup-upload`, `promote`, `sync-index`, `lint-ds`, `comment`).
3. Establish OS-detection convention: stated once at the top of each SKILL.md, with `MARKUP_URL` + `MARKUP_TOKEN` env-var contract documented alongside.
4. Drop `compat.cli` from both SKILL.md frontmatters. Keep `compat.markup` (Markup-server API contract — still real). Update `validate.mjs` accordingly.
5. Overhaul `validate.mjs`: replace `KNOWN_CLI_COMMANDS` check with (a) script-existence check (every `./scripts/<x>.sh` or `pwsh ./scripts/<x>.ps1` reference in SKILL.md resolves to a real file) and (b) `.sh` ↔ `.ps1` parity check (every `.sh` has a `.ps1` neighbour and vice versa).
6. Extend `scripts/smoke-test.mjs` to spawn `scripts/mock-markup-server.mjs` on a free port and exercise each new shell script against it. Cross-OS: smoke runs bash scripts on Unix; on Windows, smoke would need a PowerShell variant — out of scope for this plan, leave a `TODO(smoke): exercise .ps1 path on Windows CI when available` note.
7. Add `scripts/mock-markup-server.mjs` — dev-only Node HTTP server with canned `/api/version`, `/api/health`, `/api/mockups`, `/api/mockups/<id>/versions`, `/api/mockups/<id>/comments`, `/api/ds/sync-index`, `/api/ds/components`, comment subresources (read/reply/react/resolve).
8. Rewrite the relevant sections of `docs/COMPAT.md` to drop `markup-cli` content and document the script-invocation contract + env vars.
9. Add a Version 2 entry to `docs/SCHEMA-CHANGELOG.md` recording the contract change (frontmatter `compat.cli` removed; script invocation contract introduced).

**Out of scope:**

- The `markup-cli` npm package itself. It continues to exist; this plan only stops the skills from depending on it. Users who already have it installed keep it; new users do not need it.
- Any change to the Markup-server REST API. This plan assumes the endpoints already exist as documented (the existing `markup-cli` already calls them). If an endpoint is missing or different, that is a Markup-server bug to track separately, not a plan failure.
- Workflow logic in Phases 0–5 beyond invocation replacement. Phase boundaries, gates, state files, and decision tables all stay identical.
- Migration of Codex CLI / Gemini CLI tool-resolution table — those table rows already mention shell invocation (`run_shell_command`, native shell), which is what the new scripts use.
- Removing the historical `markup-cli` references from old sub-plan docs (sp-1 through sp-9). Those are records of decisions and are intentionally not rewritten.
- Per-OS dispatch wrapper (e.g., a `doctor` shim that picks `.sh` or `.ps1` automatically). The skill prose handles dispatch by stating both invocations and letting the agent pick based on the harness's OS — adding a wrapper would create a third script per op without removing the underlying pair.

---

## Operation → mechanism mapping (the central decision)

The skill currently invokes `markup-cli` in ~30 places across both SKILL.md files. Each invocation maps to one of three replacement mechanisms:

| # | Current command | Replacement | Why |
|---|---|---|---|
| 1 | `markup-cli --version` | `./scripts/doctor.sh` (Unix) / `pwsh ./scripts/doctor.ps1` (Windows) — same call as #2; doctor includes a self-version field | Single entry point removes the redundant "is the CLI here" question |
| 2 | `markup-cli doctor --json` | `./scripts/doctor.{sh,ps1}` → `GET ${MARKUP_URL}/api/version` + auth probe | Deterministic; one HTTP call; same JSON shape as before |
| 3 | `markup-cli connect <url>` | (removed) — replaced by `MARKUP_URL` + `MARKUP_TOKEN` env vars | Token storage no longer the skill's problem |
| 4 | `markup-cli mockup new <slug>` | `./scripts/mockup-upload.{sh,ps1} <file> <slug>` → `POST ${MARKUP_URL}/api/mockups` with `Content-Type: text/html` | Multipart upload becomes raw body PUT — server distinguishes new vs. version by slug uniqueness |
| 5 | `markup-cli mockup version <file>` | `./scripts/mockup-upload.{sh,ps1} <file>` (slug auto-derived from existing mockup record) | Same script as #4; second positional arg optional |
| 6 | `markup-cli comments list <file> --status open --json` | inline `curl -sS -H "Authorization: Bearer $MARKUP_TOKEN" "$MARKUP_URL/api/mockups/<id>/comments?status=open"` | One-line read; not worth a script |
| 7 | `markup-cli comments read <id> --json` | inline `curl -sS -H "Authorization: Bearer $MARKUP_TOKEN" "$MARKUP_URL/api/comments/<id>"` | Same |
| 8 | `markup-cli comments reply --body <text>` | inline `curl -sS -X POST -H "Authorization: Bearer $MARKUP_TOKEN" -H "Content-Type: application/json" -d '{"body":"<text>"}' "$MARKUP_URL/api/comments/<id>/replies"` | Same |
| 9 | `markup-cli comments react <id> --emoji <e>` | inline `curl -sS -X POST ...` (same shape as #8) | Same |
| 10 | `markup-cli comments resolve <id> --body <text>` | inline `curl -sS -X POST ...` (same shape) | Same |
| 11 | `markup-cli promote <file> --component <slug>` | `./scripts/promote.{sh,ps1} <file> <slug>` → copy file to `docs/design/design-system/NN-<slug>.html`, enforce `data-ds-component` marker, `POST ${MARKUP_URL}/api/ds/components` | Multi-step local file mutation — keep deterministic |
| 12 | `markup-cli sync-index` | `./scripts/sync-index.{sh,ps1}` → `POST ${MARKUP_URL}/api/ds/sync-index` | One HTTP call; script wrapper gives standard error handling + exit code semantics |
| 13 | `markup-cli check --build --strict` | `./scripts/lint-ds.{sh,ps1} <file>` — pure-local structural lint; exit 0 on pass, non-zero on fail | The `--build` side became dead the moment the full-prototype mechanism was removed; what remains is HTML structural lint matching the Phase 2.3 checklist (§1, §4, §7, §8). No network call. |
| 14 | `markup-cli bootstrap snapshot <slug>` | (removed from user-facing prose) — re-run `bootstrap-design-system` skill for incremental re-snapshot | The CLI subcommand was a thin wrapper around Chrome MCP work the skill already does; without the CLI, the skill itself is the entry point |

Items 6-10 (comments family) consolidate into ONE optional helper script `./scripts/comment.{sh,ps1}` with subcommands (`list`, `read`, `reply`, `react`, `resolve`) — agents may invoke either the script or the raw curl. The plan adds the script because shell escaping of JSON bodies in inline prose is fragile; the script wraps the escaping.

---

## File structure

**New files:**

- `skills/design-feature/scripts/doctor.sh` — bash version check + reachability probe.
- `skills/design-feature/scripts/doctor.ps1` — PowerShell mirror.
- `skills/design-feature/scripts/mockup-upload.sh` — bash mockup upload (new or version).
- `skills/design-feature/scripts/mockup-upload.ps1` — PowerShell mirror.
- `skills/design-feature/scripts/promote.sh` — bash promote (copy + marker + POST).
- `skills/design-feature/scripts/promote.ps1` — PowerShell mirror.
- `skills/design-feature/scripts/sync-index.sh` — bash POST /api/ds/sync-index.
- `skills/design-feature/scripts/sync-index.ps1` — PowerShell mirror.
- `skills/design-feature/scripts/lint-ds.sh` — bash structural lint (grep-based).
- `skills/design-feature/scripts/lint-ds.ps1` — PowerShell mirror.
- `skills/design-feature/scripts/comment.sh` — bash subcommand dispatcher (list/read/reply/react/resolve).
- `skills/design-feature/scripts/comment.ps1` — PowerShell mirror.
- `skills/design-feature/scripts/README.md` — env-var contract, OS-resolution rule, exit-code semantics. Single source of truth for script consumers (the skills + dev contributors).
- `scripts/mock-markup-server.mjs` — dev-only Node HTTP server for smoke tests.
- `test-fixtures/ds-lint/good.html` — minimal DS file that passes `lint-ds`.
- `test-fixtures/ds-lint/bad-missing-grid.html` — DS file missing §1 `.row-states`.
- `test-fixtures/ds-lint/bad-empty-api.html` — DS file with empty §4 `pre.api`.
- `test-fixtures/ds-lint/bad-missing-tokens.html` — DS file missing §7 `dl.tokens`.
- `test-fixtures/ds-lint/bad-empty-behavior.html` — DS file with empty §8.

**Modified files:**

- `skills/design-feature/SKILL.md` — frontmatter (drop `compat.cli`); §"Cross-harness tool reference" section gains an OS-detection + env-var contract block (or that block is its own new section); §"Soft dependencies" entry 1 + 2 rewritten; §"Disclaimer template" CLI lines rewritten; §"Phase 1 hosting" mockup + comments invocations rewritten; §"Phase 1 approval gate" `comments resolve` rewritten; §"Phase 2" steps 1, 4, 5 rewritten; §"Phase 2 gate" `markup-cli check` reference rewritten; §"Phase 4" plan instruction rewritten; §"Invariants" `check --build --strict` reference rewritten.
- `skills/bootstrap-design-system/SKILL.md` — frontmatter (drop `compat.cli`); §"Hard preconditions" entry 2 rewritten; §"Soft dependency" rewritten; §"Step C" item 6 rewritten; §"Step E" items 1 + 2 rewritten; §"Step E" closing summary `markup-cli bootstrap snapshot` line rewritten.
- `validate.mjs` — drop `KNOWN_CLI_COMMANDS` + `cmdPattern` checks; add new `validateScriptInvocations()` (extract `./scripts/<x>.sh` and `pwsh ./scripts/<x>.ps1` references, confirm `skills/design-feature/scripts/<x>.sh` and `<x>.ps1` both exist); add `validateScriptParity()` (every `.sh` has matching `.ps1`); update `compat:` block check to no longer require `cli:`.
- `scripts/smoke-test.mjs` — keep existing Phase 0 detection assertions; add a new top-level section that spawns `scripts/mock-markup-server.mjs` and invokes each new shell script (Unix path only; Windows path noted as TODO).
- `docs/COMPAT.md` — rewrite §"markup-cli check semantics" → §"Script invocation contract"; remove §"Frontmatter compat blocks" `cli:` line; update §"What counts as a breaking change" to drop markup-cli items, add script-invocation items.
- `docs/SCHEMA-CHANGELOG.md` — add Version 2 entry describing the breaking contract change.
- `package.json` — `scripts.test` is currently `node validate.mjs && node scripts/smoke-test.mjs`. No structural change needed; smoke-test.mjs itself absorbs the new behavior. Keep the dev-only dep set empty (no new runtime deps).

**Untouched (intentionally):**

- All `docs/superpowers/plans/2026-05-23-sp-*.md` historical plans.
- `skills/design-feature/templates/*` — bundled tweaker, DS pattern, strategies.
- `skills/bootstrap-design-system/SKILL.md` lines 17, 34 cross-references to `../design-feature/...` (the pattern this plan reuses).
- `test-fixtures/sample-react-app/` (existing Phase 0 fixture).

---

## Task list

### Task 0: Verify pre-flight + branch

**Files:**
- Read-only: `validate.mjs`, both `SKILL.md`.

- [ ] **Step 1: Confirm pre-flight cleanup is present**

Run: `node validate.mjs`
Expected output: `✓ Validated 2 skill(s); no issues.`

Run: `grep -rn -iE "full[- ]?prototype|_template\.html|_glue\.js|upload-prototype|\.qa\.js|sidecar" skills/ validate.mjs`
Expected output: (empty — no matches in current skill files or validator).

If either check fails: stop. Re-apply the pre-flight cleanup documented at the top of this plan before continuing.

- [ ] **Step 2: Create a working branch**

Run:
```bash
git checkout -b sp-10-cli-to-scripts
```

- [ ] **Step 3: Commit baseline (optional)**

If `git status` shows the pre-flight edits as uncommitted, commit them first:
```bash
git add validate.mjs skills/design-feature/SKILL.md skills/bootstrap-design-system/SKILL.md
git commit -m "docs(skills): remove full-prototype residual mentions (pre-SP10)"
```

---

### Task 1: Drop `compat.cli` from both SKILL.md frontmatters + relax validator

**Files:**
- Modify: `skills/design-feature/SKILL.md` (frontmatter, lines 1-9)
- Modify: `skills/bootstrap-design-system/SKILL.md` (frontmatter, lines 1-7)
- Modify: `validate.mjs` (frontmatter check ~lines 90-110)

- [ ] **Step 1: Remove `cli:` line from `design-feature` frontmatter**

Find:
```yaml
compat:
  cli: ">=0.1.0"
  markup: ">=0.2.0"
```
Replace with:
```yaml
compat:
  markup: ">=0.2.0"
```

- [ ] **Step 2: Remove `cli:` line from `bootstrap-design-system` frontmatter**

Same replacement in `skills/bootstrap-design-system/SKILL.md`.

- [ ] **Step 3: Relax `validate.mjs` to no longer require `compat.cli`**

In `validate.mjs`, find the block (~line 100):
```js
    if (!cliRange) issues.push({ skill: name, message: 'frontmatter missing `compat.cli` (expected a semver range like ">=0.1.0")' });
    if (!markupRange) issues.push({ skill: name, message: 'frontmatter missing `compat.markup` (expected a semver range like ">=0.2.0")' });
    // Cheap range-shape check: must start with one of: >=, >, <=, <, ^, ~, =, or a bare digit
    const rangeShape = /^(?:>=|<=|>|<|\^|~|=|\d)/;
    if (cliRange && !rangeShape.test(cliRange[1].trim())) {
      issues.push({ skill: name, message: `compat.cli "${cliRange[1]}" is not a recognizable semver range (expected like ">=0.1.0")` });
    }
    if (markupRange && !rangeShape.test(markupRange[1].trim())) {
      issues.push({ skill: name, message: `compat.markup "${markupRange[1]}" is not a recognizable semver range (expected like ">=0.2.0")` });
    }
```
Replace with:
```js
    if (!markupRange) issues.push({ skill: name, message: 'frontmatter missing `compat.markup` (expected a semver range like ">=0.2.0")' });
    // Cheap range-shape check: must start with one of: >=, >, <=, <, ^, ~, =, or a bare digit
    const rangeShape = /^(?:>=|<=|>|<|\^|~|=|\d)/;
    if (markupRange && !rangeShape.test(markupRange[1].trim())) {
      issues.push({ skill: name, message: `compat.markup "${markupRange[1]}" is not a recognizable semver range (expected like ">=0.2.0")` });
    }
```

Also in `validate.mjs`, find `function validateCompatAlignment` (~line 388) and remove the `compat.cli` alignment block:
```js
  // 1. Both skills must declare the same compat.cli and compat.markup.
  if (designCompat.cli && bootstrapCompat.cli && designCompat.cli !== bootstrapCompat.cli) {
    issues.push({
      skill: 'cross-cutting',
      message: `compat.cli mismatch: design-feature="${designCompat.cli}" vs bootstrap-design-system="${bootstrapCompat.cli}" — both SKILL.md files must declare the same range`,
    });
  }
  if (designCompat.markup && bootstrapCompat.markup && designCompat.markup !== bootstrapCompat.markup) {
```
becomes:
```js
  // Both skills must declare the same compat.markup.
  if (designCompat.markup && bootstrapCompat.markup && designCompat.markup !== bootstrapCompat.markup) {
```

And remove the entire "2. bootstrap precondition 2 wording's version must be >= compat.cli lower bound" block at the bottom of `validateCompatAlignment` (the `precondMatch` logic) — that wording will be rewritten in Task 9 to no longer mention a CLI version.

- [ ] **Step 4: Verify**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 5: Commit**

```bash
git add skills/design-feature/SKILL.md skills/bootstrap-design-system/SKILL.md validate.mjs
git commit -m "refactor(skills): drop compat.cli — markup-cli no longer required (SP10 T1)"
```

---

### Task 2: Add `scripts/mock-markup-server.mjs` (dev-only test infrastructure)

**Files:**
- Create: `scripts/mock-markup-server.mjs`

- [ ] **Step 1: Write the mock server**

Create `scripts/mock-markup-server.mjs`:

```js
#!/usr/bin/env node
// Minimal HTTP mock of the Markup-server API used by SP10 shell-script smoke tests.
// Listens on the port given by argv[2] (or assigns a random free port and prints it).
// Never persists state; all responses are canned. Exits on SIGTERM.

import { createServer } from 'node:http';

const port = Number(process.argv[2] || 0);

const ROUTES = {
  'GET /api/version':           () => ({ status: 200, body: { version: '0.2.7', api: 'v1' } }),
  'GET /api/health':            () => ({ status: 200, body: { ok: true } }),
  'POST /api/mockups':          (body, headers) => ({ status: 201, body: { id: 'm_test', slug: 'mock', url: 'https://mock/markup/m_test', version: 1 } }),
  'POST /api/ds/sync-index':    () => ({ status: 200, body: { indexed: 1 } }),
  'POST /api/ds/components':    () => ({ status: 201, body: { id: 'c_test', slug: 'mock' } }),
  'GET /api/mockups/m_test/comments': () => ({ status: 200, body: { comments: [] } }),
  'GET /api/comments/c_test':   () => ({ status: 200, body: { id: 'c_test', body: 'hi', status: 'open' } }),
  'POST /api/comments/c_test/replies':  () => ({ status: 201, body: { id: 'r_1' } }),
  'POST /api/comments/c_test/reactions': () => ({ status: 201, body: { id: 'rx_1' } }),
  'POST /api/comments/c_test/resolve':   () => ({ status: 200, body: { id: 'c_test', status: 'resolved' } }),
};

const server = createServer((req, res) => {
  const key = `${req.method} ${req.url.split('?')[0]}`;
  const route = ROUTES[key];
  if (!route) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'not found', key }));
    return;
  }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    const out = route(body, req.headers);
    res.statusCode = out.status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(out.body));
  });
});

server.listen(port, () => {
  const addr = server.address();
  process.stdout.write(`listening:${addr.port}\n`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT',  () => server.close(() => process.exit(0)));
```

- [ ] **Step 2: Verify it starts**

Run: `node scripts/mock-markup-server.mjs 0 &` and wait for the `listening:<port>` line. Then `curl -sS http://localhost:<port>/api/version` should return `{"version":"0.2.7","api":"v1"}`. Kill the process.

- [ ] **Step 3: Commit**

```bash
git add scripts/mock-markup-server.mjs
git commit -m "test(scripts): add mock Markup server for SP10 smoke tests (SP10 T2)"
```

---

### Task 3: Add `scripts/README.md` documenting the env-var + OS-resolution contract

**Files:**
- Create: `skills/design-feature/scripts/README.md`

- [ ] **Step 1: Write the README**

Create `skills/design-feature/scripts/README.md`:

````markdown
# design-feature scripts

In-skill scripts invoked by `design-feature/SKILL.md` and `bootstrap-design-system/SKILL.md`. Ship as part of the skill — no `npm install`, no external runtime dependencies beyond what the host OS already provides.

## OS resolution

Every operation has a `.sh` (Unix bash) and a `.ps1` (Windows PowerShell) variant. The skill prose dispatches to the right one based on the host OS:

| Host                | Invocation                                  |
|---------------------|---------------------------------------------|
| Linux, macOS, WSL   | `./scripts/<op>.sh [args]`                  |
| Windows (native)    | `pwsh ./scripts/<op>.ps1 [args]`            |

(WSL counts as Linux — `.sh` runs there.) The agent reading the SKILL.md detects the OS from the harness's environment metadata; no auto-detect wrapper script ships with the pair.

## Env vars

| Var            | Required | Meaning                                                          |
|----------------|----------|------------------------------------------------------------------|
| `MARKUP_URL`   | yes      | Base URL of the Markup server, no trailing slash. `https://markup.example.com`. |
| `MARKUP_TOKEN` | yes      | Bearer token. Sent as `Authorization: Bearer $MARKUP_TOKEN` on every request. |

If either is unset, the scripts exit non-zero with a clear error before making any network call. The skill's pre-Phase-0 doctor step is the first place this is checked.

## Exit codes

| Code | Meaning                                                   |
|------|-----------------------------------------------------------|
| 0    | Success.                                                  |
| 1    | Generic failure (network error, bad response, etc.).      |
| 2    | Missing env var (`MARKUP_URL` or `MARKUP_TOKEN`).         |
| 3    | Structural lint failure (`lint-ds` only) — file invalid.  |
| 4    | Bad arguments (wrong number, file not found).             |

On any non-zero exit, the script writes a human-readable error to stderr. Successful runs print structured output to stdout (JSON for `doctor`, `mockup-upload`, `sync-index`, `comment list/read`; a one-line OK message for `promote`, `sync-index`, `lint-ds`).

## Op index

| Script           | Purpose                                                          |
|------------------|------------------------------------------------------------------|
| `doctor`         | GET /api/version + reachability probe. Replaces `markup-cli doctor --json`. |
| `mockup-upload`  | POST a mockup HTML file (new mockup or new version of existing). Replaces `markup-cli mockup new/version`. |
| `promote`        | Copy a mockup to `docs/design/design-system/NN-<slug>.html`, enforce the `data-ds-component` marker, POST to /api/ds/components. Replaces `markup-cli promote`. |
| `sync-index`     | POST /api/ds/sync-index. Replaces `markup-cli sync-index`.       |
| `lint-ds`        | Structural lint of a DS file (§1 grid, §4 Code API, §7 tokens, §8 Behavior — all non-empty). Pure local. Replaces `markup-cli check --build --strict`. |
| `comment`        | Subcommand dispatcher (`list`, `read`, `reply`, `react`, `resolve`) for the comments REST endpoints. Optional — inline curl in skill prose works too. |
````

- [ ] **Step 2: Commit**

```bash
mkdir -p skills/design-feature/scripts
git add skills/design-feature/scripts/README.md
git commit -m "docs(scripts): document env vars + OS resolution for in-skill scripts (SP10 T3)"
```

---

### Task 4: Add `scripts/doctor.sh` + `doctor.ps1` + smoke test

**Files:**
- Create: `skills/design-feature/scripts/doctor.sh`
- Create: `skills/design-feature/scripts/doctor.ps1`

- [ ] **Step 1: Write `doctor.sh`**

```bash
#!/usr/bin/env bash
# doctor — version check + reachability probe. Replaces `markup-cli doctor --json`.
# Output: JSON to stdout matching the legacy schema's `markup` block.
# Exit:   0 = reachable; 1 = network error; 2 = missing env var.
set -euo pipefail

: "${MARKUP_URL:?MARKUP_URL not set (e.g., https://markup.example.com)}"
: "${MARKUP_TOKEN:?MARKUP_TOKEN not set}"

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
```

- [ ] **Step 2: Write `doctor.ps1`**

```powershell
#!/usr/bin/env pwsh
# doctor — version check + reachability probe. Replaces `markup-cli doctor --json`.
# Output: JSON to stdout matching the legacy schema's `markup` block.
# Exit:   0 = reachable; 1 = network error; 2 = missing env var.
$ErrorActionPreference = 'Stop'
if (-not $env:MARKUP_URL)   { [Console]::Error.WriteLine('MARKUP_URL not set');   exit 2 }
if (-not $env:MARKUP_TOKEN) { [Console]::Error.WriteLine('MARKUP_TOKEN not set'); exit 2 }

$headers = @{ Authorization = "Bearer $($env:MARKUP_TOKEN)" }
try {
  $resp = Invoke-RestMethod -Uri "$($env:MARKUP_URL)/api/version" `
    -Headers $headers -TimeoutSec 5 -ErrorAction Stop
  $payload = @{ markup = @{ configured = $true; url = $env:MARKUP_URL; actual = $resp.version; api = 'v1'; ok = $true } }
  $payload | ConvertTo-Json -Compress -Depth 4
  exit 0
} catch {
  $payload = @{ markup = @{ configured = $true; url = $env:MARKUP_URL; ok = $false; error = 'unreachable' } }
  $payload | ConvertTo-Json -Compress -Depth 4
  exit 1
}
```

- [ ] **Step 3: chmod the bash script**

```bash
chmod +x skills/design-feature/scripts/doctor.sh
```

- [ ] **Step 4: Smoke test against the mock server (Unix only)**

```bash
node scripts/mock-markup-server.mjs 0 > /tmp/mock-port 2>&1 &
MOCK_PID=$!
sleep 0.5
PORT=$(grep -oE 'listening:[0-9]+' /tmp/mock-port | cut -d: -f2)
MARKUP_URL=http://localhost:$PORT MARKUP_TOKEN=test-token ./skills/design-feature/scripts/doctor.sh
kill $MOCK_PID
```

Expected stdout (formatted): `{"markup":{"configured":true,"url":"http://localhost:<port>","actual":"0.2.7","api":"v1","ok":true}}` and exit 0.

- [ ] **Step 5: Commit**

```bash
git add skills/design-feature/scripts/doctor.sh skills/design-feature/scripts/doctor.ps1
git commit -m "feat(scripts): add doctor.{sh,ps1} replacing markup-cli doctor (SP10 T4)"
```

---

### Task 5: Add `scripts/sync-index.sh` + `sync-index.ps1` + smoke test

**Files:**
- Create: `skills/design-feature/scripts/sync-index.sh`
- Create: `skills/design-feature/scripts/sync-index.ps1`

- [ ] **Step 1: Write `sync-index.sh`**

```bash
#!/usr/bin/env bash
# sync-index — regenerate the DS index on the Markup server.
# Replaces `markup-cli sync-index`.
# Exit: 0 = ok; 1 = network error; 2 = missing env var.
set -euo pipefail

: "${MARKUP_URL:?MARKUP_URL not set}"
: "${MARKUP_TOKEN:?MARKUP_TOKEN not set}"

resp=$(curl -sS -f -X POST --max-time 10 \
  -H "Authorization: Bearer ${MARKUP_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "${MARKUP_URL}/api/ds/sync-index") || {
  echo "sync-index: server error or unreachable" >&2
  exit 1
}
echo "$resp"
```

- [ ] **Step 2: Write `sync-index.ps1`**

```powershell
#!/usr/bin/env pwsh
# sync-index — regenerate the DS index on the Markup server.
# Replaces `markup-cli sync-index`. Exit: 0 ok, 1 net error, 2 missing env.
$ErrorActionPreference = 'Stop'
if (-not $env:MARKUP_URL)   { [Console]::Error.WriteLine('MARKUP_URL not set');   exit 2 }
if (-not $env:MARKUP_TOKEN) { [Console]::Error.WriteLine('MARKUP_TOKEN not set'); exit 2 }
try {
  Invoke-RestMethod -Method Post -Uri "$($env:MARKUP_URL)/api/ds/sync-index" `
    -Headers @{ Authorization = "Bearer $($env:MARKUP_TOKEN)"; 'Content-Type' = 'application/json' } `
    -Body '{}' -TimeoutSec 10 | ConvertTo-Json -Compress -Depth 4
  exit 0
} catch {
  [Console]::Error.WriteLine('sync-index: server error or unreachable')
  exit 1
}
```

- [ ] **Step 3: chmod**

```bash
chmod +x skills/design-feature/scripts/sync-index.sh
```

- [ ] **Step 4: Smoke test**

Spawn mock server (same pattern as Task 4). Then:
```bash
MARKUP_URL=http://localhost:$PORT MARKUP_TOKEN=test ./skills/design-feature/scripts/sync-index.sh
```
Expected: `{"indexed":1}` to stdout, exit 0.

- [ ] **Step 5: Commit**

```bash
git add skills/design-feature/scripts/sync-index.sh skills/design-feature/scripts/sync-index.ps1
git commit -m "feat(scripts): add sync-index.{sh,ps1} replacing markup-cli sync-index (SP10 T5)"
```

---

### Task 6: Add `scripts/mockup-upload.sh` + `mockup-upload.ps1` + smoke test

**Files:**
- Create: `skills/design-feature/scripts/mockup-upload.sh`
- Create: `skills/design-feature/scripts/mockup-upload.ps1`

- [ ] **Step 1: Write `mockup-upload.sh`**

```bash
#!/usr/bin/env bash
# mockup-upload — POST a mockup HTML file. Replaces `markup-cli mockup new/version`.
# Usage:   mockup-upload <file.html> [<slug>]
# Output:  JSON from server (includes hosted URL) to stdout.
# Exit:    0 ok; 1 net error; 2 missing env; 4 bad args / file missing.
set -euo pipefail

: "${MARKUP_URL:?MARKUP_URL not set}"
: "${MARKUP_TOKEN:?MARKUP_TOKEN not set}"

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
```

- [ ] **Step 2: Write `mockup-upload.ps1`**

```powershell
#!/usr/bin/env pwsh
# mockup-upload — POST a mockup HTML file. Replaces `markup-cli mockup new/version`.
$ErrorActionPreference = 'Stop'
param([Parameter(Mandatory=$true)][string]$File, [string]$Slug)

if (-not $env:MARKUP_URL)   { [Console]::Error.WriteLine('MARKUP_URL not set');   exit 2 }
if (-not $env:MARKUP_TOKEN) { [Console]::Error.WriteLine('MARKUP_TOKEN not set'); exit 2 }
if (-not (Test-Path $File)) { [Console]::Error.WriteLine("file not found: $File"); exit 4 }

$headers = @{
  Authorization  = "Bearer $($env:MARKUP_TOKEN)"
  'Content-Type' = 'text/html'
}
if ($Slug) { $headers['X-Mockup-Slug'] = $Slug }

try {
  Invoke-RestMethod -Method Post -Uri "$($env:MARKUP_URL)/api/mockups" `
    -Headers $headers -InFile $File -TimeoutSec 30 | ConvertTo-Json -Compress -Depth 4
  exit 0
} catch {
  [Console]::Error.WriteLine('mockup-upload: upload failed')
  exit 1
}
```

> Note on PowerShell `param`: in script files (`.ps1`) the `param(...)` block must be the FIRST statement (after any `#requires` lines). The order shown above — `$ErrorActionPreference` then `param` — is wrong. Use this correct shape instead:
>
> ```powershell
> #!/usr/bin/env pwsh
> param([Parameter(Mandatory=$true)][string]$File, [string]$Slug)
> $ErrorActionPreference = 'Stop'
> # ... rest
> ```

- [ ] **Step 3: chmod**

```bash
chmod +x skills/design-feature/scripts/mockup-upload.sh
```

- [ ] **Step 4: Smoke test**

```bash
echo '<html><body>mock</body></html>' > /tmp/mock.html
MARKUP_URL=http://localhost:$PORT MARKUP_TOKEN=test ./skills/design-feature/scripts/mockup-upload.sh /tmp/mock.html mock
```
Expected: JSON containing `"id":"m_test"` and `"url":"https://mock/markup/m_test"`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add skills/design-feature/scripts/mockup-upload.sh skills/design-feature/scripts/mockup-upload.ps1
git commit -m "feat(scripts): add mockup-upload.{sh,ps1} replacing markup-cli mockup new/version (SP10 T6)"
```

---

### Task 7: Add `scripts/lint-ds.sh` + `lint-ds.ps1` + fixtures + smoke test

**Files:**
- Create: `skills/design-feature/scripts/lint-ds.sh`
- Create: `skills/design-feature/scripts/lint-ds.ps1`
- Create: `test-fixtures/ds-lint/good.html`
- Create: `test-fixtures/ds-lint/bad-missing-grid.html`
- Create: `test-fixtures/ds-lint/bad-empty-api.html`
- Create: `test-fixtures/ds-lint/bad-missing-tokens.html`
- Create: `test-fixtures/ds-lint/bad-empty-behavior.html`

- [ ] **Step 1: Write `lint-ds.sh`**

The structural lint mirrors the Phase 2.3 reformat checklist:
- §1: ≥1 `class="row-states"` block with ≥1 `class="state"` cell.
- §4: ≥1 `<pre class="api">` block whose text content is non-empty.
- §7: ≥1 `<dl class="tokens">` element.
- §8: a header containing "Behavior" followed (within the same section) by a `<ul>` or `<ol>` with ≥1 `<li>`.

```bash
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

# §4 — at least one <pre class="api"> with non-empty body. We use perl-style multiline
# match if available, otherwise a two-pass grep-and-awk that handles single-line cases.
if ! grep -qE '<pre[^>]*class="[^"]*api[^"]*"' "$file"; then
  echo "lint-ds: §4 missing — no <pre class=\"api\"> block found" >&2
  fail=1
else
  # Extract content between <pre class="api">...</pre> via awk; strip whitespace; non-empty?
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

# §8 — a "Behavior" header followed by at least one <li>. We check that some <li> appears
# AFTER a header containing "Behavior" (case-insensitive). Simple, brittle but adequate
# for the structural smoke.
if ! awk '
  BEGIN { seen_header = 0; ok = 0 }
  /<h[1-6][^>]*>.*[Bb]ehavior.*<\/h[1-6]>/ { seen_header = 1; next }
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
```

- [ ] **Step 2: Write `lint-ds.ps1`**

```powershell
#!/usr/bin/env pwsh
# lint-ds — structural lint of a DS file. Pure local; no network.
param([Parameter(Mandatory=$true)][string]$File)
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $File)) { [Console]::Error.WriteLine("lint-ds: file not found: $File"); exit 4 }

$body = Get-Content -Raw -Path $File
$fail = $false

# §1 — row-states block with at least one .state cell.
if ($body -notmatch 'class="[^"]*row-states[^"]*"') {
  [Console]::Error.WriteLine('lint-ds: §1 missing — no class="row-states" block found'); $fail = $true
} elseif ($body -notmatch 'class="[^"]*state[^"]*"') {
  [Console]::Error.WriteLine('lint-ds: §1 incomplete — row-states present but no .state cell'); $fail = $true
}

# §4 — non-empty <pre class="api">.
$apiMatch = [regex]::Match($body, '<pre[^>]*class="[^"]*api[^"]*"[^>]*>(.*?)</pre>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
if (-not $apiMatch.Success) {
  [Console]::Error.WriteLine('lint-ds: §4 missing — no <pre class="api"> block found'); $fail = $true
} elseif (([regex]::Replace($apiMatch.Groups[1].Value, '\s', '')) -eq '') {
  [Console]::Error.WriteLine('lint-ds: §4 empty — <pre class="api"> body is whitespace only'); $fail = $true
}

# §7 — <dl class="tokens">.
if ($body -notmatch '<dl[^>]*class="[^"]*tokens[^"]*"') {
  [Console]::Error.WriteLine('lint-ds: §7 missing — no <dl class="tokens"> found'); $fail = $true
}

# §8 — a Behavior header followed somewhere by a <li>.
$idx = [regex]::Match($body, '<h[1-6][^>]*>[^<]*[Bb]ehavior[^<]*</h[1-6]>')
if (-not $idx.Success) {
  [Console]::Error.WriteLine('lint-ds: §8 missing — no Behavior header found'); $fail = $true
} else {
  $rest = $body.Substring($idx.Index + $idx.Length)
  if ($rest -notmatch '<li[ >]') {
    [Console]::Error.WriteLine('lint-ds: §8 missing — no <li> after Behavior header'); $fail = $true
  }
}

if ($fail) { exit 3 }
Write-Output "lint-ds: ok ($File)"
```

- [ ] **Step 3: Write `test-fixtures/ds-lint/good.html`**

```html
<!DOCTYPE html>
<html><head><title>good</title></head>
<body data-ds-component="sample">
  <section><div class="row-states"><div class="state">default</div></div></section>
  <section><pre class="api">DS.sample.init(root, opts)</pre></section>
  <section><dl class="tokens"><dt>--accent</dt><dd>blue</dd></dl></section>
  <section><h2>Behavior</h2><ul><li>opens on click</li></ul></section>
</body></html>
```

- [ ] **Step 4: Write the four bad-* fixtures**

`bad-missing-grid.html`: same as good.html with the entire `.row-states` `<section>` deleted.

`bad-empty-api.html`: same as good.html but `<pre class="api"></pre>` (empty).

`bad-missing-tokens.html`: same as good.html with the `<dl class="tokens">` `<section>` deleted.

`bad-empty-behavior.html`: same as good.html with the `<ul>` deleted — the `<h2>Behavior</h2>` header remains, but no `<li>` follows.

- [ ] **Step 5: chmod + smoke test**

```bash
chmod +x skills/design-feature/scripts/lint-ds.sh
./skills/design-feature/scripts/lint-ds.sh test-fixtures/ds-lint/good.html
echo $?  # expect: 0
./skills/design-feature/scripts/lint-ds.sh test-fixtures/ds-lint/bad-missing-grid.html
echo $?  # expect: 3
./skills/design-feature/scripts/lint-ds.sh test-fixtures/ds-lint/bad-empty-api.html
echo $?  # expect: 3
./skills/design-feature/scripts/lint-ds.sh test-fixtures/ds-lint/bad-missing-tokens.html
echo $?  # expect: 3
./skills/design-feature/scripts/lint-ds.sh test-fixtures/ds-lint/bad-empty-behavior.html
echo $?  # expect: 3
```

All five must produce the expected exit codes.

- [ ] **Step 6: Commit**

```bash
git add skills/design-feature/scripts/lint-ds.sh skills/design-feature/scripts/lint-ds.ps1 test-fixtures/ds-lint/
git commit -m "feat(scripts): add lint-ds.{sh,ps1} replacing markup-cli check --build --strict (SP10 T7)"
```

---

### Task 8: Add `scripts/promote.sh` + `promote.ps1` + smoke test

**Files:**
- Create: `skills/design-feature/scripts/promote.sh`
- Create: `skills/design-feature/scripts/promote.ps1`

Behavior:
1. Determine the next `NN` prefix by listing `docs/design/design-system/*.html` and finding the max two-digit prefix + 1 (or `01` if empty).
2. Copy the source mockup file to `docs/design/design-system/<NN>-<slug>.html`.
3. Ensure the copied file has a `data-ds-component="<slug>"` attribute on its primary content element. If absent on the root `<body>` or on the first element with class containing `page`, inject it on the `<body>`.
4. POST the file to `${MARKUP_URL}/api/ds/components` with `X-Component-Slug: <slug>` and `Content-Type: text/html`.
5. Print the new local path on success.

- [ ] **Step 1: Write `promote.sh`**

```bash
#!/usr/bin/env bash
# promote — copy mockup to DS folder, enforce marker, POST to server.
# Replaces `markup-cli promote <file> --component <slug>`.
# Usage: promote <file.html> <slug>
# Exit:  0 ok; 1 net error; 2 missing env; 4 bad args / file missing.
set -euo pipefail

: "${MARKUP_URL:?MARKUP_URL not set}"
: "${MARKUP_TOKEN:?MARKUP_TOKEN not set}"

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

ds_dir="docs/design/design-system"
mkdir -p "$ds_dir"

# Compute next NN.
max=0
for f in "$ds_dir"/[0-9][0-9]-*.html; do
  [ -e "$f" ] || continue
  base=$(basename "$f")
  n=$(printf '%s' "$base" | sed -E 's/^([0-9]{2})-.*/\1/')
  if [ "${n#0}" -gt "$max" ] 2>/dev/null; then
    max=${n#0}
  fi
done
next=$(printf '%02d' $((max + 1)))
dest="${ds_dir}/${next}-${slug}.html"

cp "$src" "$dest"

# Enforce marker. If `data-ds-component="<slug>"` is already present anywhere, do nothing.
if ! grep -qE "data-ds-component=\"${slug}\"" "$dest"; then
  # Inject on the <body> tag. Portable sed (no in-place flag differences on macOS): write to a temp.
  tmp=$(mktemp)
  sed -E "s|<body([^>]*)>|<body\\1 data-ds-component=\"${slug}\">|" "$dest" > "$tmp"
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
```

- [ ] **Step 2: Write `promote.ps1`**

```powershell
#!/usr/bin/env pwsh
param([Parameter(Mandatory=$true)][string]$File,
      [Parameter(Mandatory=$true)][string]$Slug)
$ErrorActionPreference = 'Stop'

if (-not $env:MARKUP_URL)   { [Console]::Error.WriteLine('MARKUP_URL not set');   exit 2 }
if (-not $env:MARKUP_TOKEN) { [Console]::Error.WriteLine('MARKUP_TOKEN not set'); exit 2 }
if (-not (Test-Path $File)) { [Console]::Error.WriteLine("promote: source file not found: $File"); exit 4 }

$dsDir = 'docs/design/design-system'
New-Item -ItemType Directory -Force -Path $dsDir | Out-Null

$max = 0
Get-ChildItem -Path $dsDir -Filter '[0-9][0-9]-*.html' -ErrorAction SilentlyContinue | ForEach-Object {
  if ($_.Name -match '^(\d{2})-') {
    $n = [int]$Matches[1]
    if ($n -gt $max) { $max = $n }
  }
}
$next = '{0:D2}' -f ($max + 1)
$dest = Join-Path $dsDir "$next-$Slug.html"

Copy-Item -Path $File -Destination $dest

$content = Get-Content -Raw -Path $dest
if ($content -notmatch "data-ds-component=`"$Slug`"") {
  $content = [regex]::Replace($content, '<body([^>]*)>', "<body`$1 data-ds-component=`"$Slug`">", 1)
  Set-Content -Path $dest -Value $content -NoNewline
}

try {
  $resp = Invoke-RestMethod -Method Post -Uri "$($env:MARKUP_URL)/api/ds/components" `
    -Headers @{ Authorization = "Bearer $($env:MARKUP_TOKEN)"; 'Content-Type' = 'text/html'; 'X-Component-Slug' = $Slug } `
    -InFile $dest -TimeoutSec 30
  Write-Output "promote: ok — wrote $dest, server resp: $($resp | ConvertTo-Json -Compress -Depth 4)"
  exit 0
} catch {
  [Console]::Error.WriteLine("promote: upload failed (local file written: $dest)")
  exit 1
}
```

- [ ] **Step 3: chmod + smoke test**

```bash
chmod +x skills/design-feature/scripts/promote.sh
# Setup a throwaway repo dir to avoid polluting real docs/.
TEST_DIR=$(mktemp -d)
pushd "$TEST_DIR"
cp /path/to/skills/design-feature/scripts/promote.sh ./   # or just invoke via absolute path
echo '<html><body>hello</body></html>' > /tmp/in.html
MARKUP_URL=http://localhost:$PORT MARKUP_TOKEN=test /abs/path/to/promote.sh /tmp/in.html mockslug
ls docs/design/design-system/  # expect: 01-mockslug.html
grep -q 'data-ds-component="mockslug"' docs/design/design-system/01-mockslug.html && echo "marker OK"
popd
rm -rf "$TEST_DIR"
```

Expected: file `docs/design/design-system/01-mockslug.html` exists with the marker attribute on `<body>`, exit 0, stdout contains `"id":"c_test"`.

- [ ] **Step 4: Commit**

```bash
git add skills/design-feature/scripts/promote.sh skills/design-feature/scripts/promote.ps1
git commit -m "feat(scripts): add promote.{sh,ps1} replacing markup-cli promote (SP10 T8)"
```

---

### Task 9: Add `scripts/comment.sh` + `comment.ps1` + smoke test

**Files:**
- Create: `skills/design-feature/scripts/comment.sh`
- Create: `skills/design-feature/scripts/comment.ps1`

Subcommand surface:
- `comment list <mockup-id> [--status open]` → `GET /api/mockups/<id>/comments[?status=open]`
- `comment read <comment-id>` → `GET /api/comments/<comment-id>`
- `comment reply <comment-id> <body-text>` → `POST /api/comments/<id>/replies`
- `comment react <comment-id> <emoji>` → `POST /api/comments/<id>/reactions`
- `comment resolve <comment-id> [<body-text>]` → `POST /api/comments/<id>/resolve`

- [ ] **Step 1: Write `comment.sh`**

```bash
#!/usr/bin/env bash
# comment — REST wrapper around the Markup comments endpoints.
# Subcommands: list <mockup-id> [--status <s>] | read <id> | reply <id> <body> |
#              react <id> <emoji> | resolve <id> [<body>]
# Exit: 0 ok; 1 net error; 2 missing env; 4 bad args.
set -euo pipefail

: "${MARKUP_URL:?MARKUP_URL not set}"
: "${MARKUP_TOKEN:?MARKUP_TOKEN not set}"

auth=(-H "Authorization: Bearer ${MARKUP_TOKEN}")
ct=(-H "Content-Type: application/json")

# JSON-escape an arbitrary string. Handles backslash, quote, control chars; emits a
# JSON string literal (with surrounding quotes).
json_escape() {
  printf '%s' "$1" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null \
    || node -e 'process.stdout.write(JSON.stringify(require("fs").readFileSync(0,"utf8")))' \
    || { echo "comment: need python3 or node on PATH to escape JSON bodies" >&2; exit 1; }
}

sub="${1:-}"; shift || true
case "$sub" in
  list)
    id="${1:-}"; [ -z "$id" ] && { echo "usage: comment list <mockup-id> [--status <s>]" >&2; exit 4; }
    qs=""
    if [ "${2:-}" = "--status" ] && [ -n "${3:-}" ]; then qs="?status=$3"; fi
    curl -sS -f "${auth[@]}" "${MARKUP_URL}/api/mockups/${id}/comments${qs}" ;;
  read)
    id="${1:-}"; [ -z "$id" ] && { echo "usage: comment read <id>" >&2; exit 4; }
    curl -sS -f "${auth[@]}" "${MARKUP_URL}/api/comments/${id}" ;;
  reply)
    id="${1:-}"; body="${2:-}"
    [ -z "$id" ] || [ -z "$body" ] && { echo "usage: comment reply <id> <body>" >&2; exit 4; }
    body_json=$(json_escape "$body")
    curl -sS -f -X POST "${auth[@]}" "${ct[@]}" \
      -d "{\"body\":${body_json}}" "${MARKUP_URL}/api/comments/${id}/replies" ;;
  react)
    id="${1:-}"; emoji="${2:-}"
    [ -z "$id" ] || [ -z "$emoji" ] && { echo "usage: comment react <id> <emoji>" >&2; exit 4; }
    emoji_json=$(json_escape "$emoji")
    curl -sS -f -X POST "${auth[@]}" "${ct[@]}" \
      -d "{\"emoji\":${emoji_json}}" "${MARKUP_URL}/api/comments/${id}/reactions" ;;
  resolve)
    id="${1:-}"; body="${2:-}"
    [ -z "$id" ] && { echo "usage: comment resolve <id> [<body>]" >&2; exit 4; }
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
```

- [ ] **Step 2: Write `comment.ps1`**

```powershell
#!/usr/bin/env pwsh
param(
  [Parameter(Mandatory=$true)][ValidateSet('list','read','reply','react','resolve')][string]$Sub,
  [Parameter(Position=1)][string]$Arg1,
  [Parameter(Position=2)][string]$Arg2,
  [Parameter(Position=3)][string]$Arg3,
  [Parameter(Position=4)][string]$Arg4
)
$ErrorActionPreference = 'Stop'
if (-not $env:MARKUP_URL)   { [Console]::Error.WriteLine('MARKUP_URL not set');   exit 2 }
if (-not $env:MARKUP_TOKEN) { [Console]::Error.WriteLine('MARKUP_TOKEN not set'); exit 2 }

$headers = @{ Authorization = "Bearer $($env:MARKUP_TOKEN)"; 'Content-Type' = 'application/json' }
$base = $env:MARKUP_URL

try {
  switch ($Sub) {
    'list' {
      if (-not $Arg1) { [Console]::Error.WriteLine('usage: comment list <mockup-id> [--status <s>]'); exit 4 }
      $qs = ''
      if ($Arg2 -eq '--status' -and $Arg3) { $qs = "?status=$Arg3" }
      Invoke-RestMethod -Uri "$base/api/mockups/$Arg1/comments$qs" -Headers $headers | ConvertTo-Json -Compress -Depth 6
    }
    'read' {
      if (-not $Arg1) { [Console]::Error.WriteLine('usage: comment read <id>'); exit 4 }
      Invoke-RestMethod -Uri "$base/api/comments/$Arg1" -Headers $headers | ConvertTo-Json -Compress -Depth 6
    }
    'reply' {
      if (-not $Arg1 -or -not $Arg2) { [Console]::Error.WriteLine('usage: comment reply <id> <body>'); exit 4 }
      $payload = @{ body = $Arg2 } | ConvertTo-Json -Compress
      Invoke-RestMethod -Method Post -Uri "$base/api/comments/$Arg1/replies" -Headers $headers -Body $payload | ConvertTo-Json -Compress -Depth 6
    }
    'react' {
      if (-not $Arg1 -or -not $Arg2) { [Console]::Error.WriteLine('usage: comment react <id> <emoji>'); exit 4 }
      $payload = @{ emoji = $Arg2 } | ConvertTo-Json -Compress
      Invoke-RestMethod -Method Post -Uri "$base/api/comments/$Arg1/reactions" -Headers $headers -Body $payload | ConvertTo-Json -Compress -Depth 6
    }
    'resolve' {
      if (-not $Arg1) { [Console]::Error.WriteLine('usage: comment resolve <id> [<body>]'); exit 4 }
      $payload = if ($Arg2) { @{ body = $Arg2 } | ConvertTo-Json -Compress } else { '{}' }
      Invoke-RestMethod -Method Post -Uri "$base/api/comments/$Arg1/resolve" -Headers $headers -Body $payload | ConvertTo-Json -Compress -Depth 6
    }
  }
  exit 0
} catch {
  [Console]::Error.WriteLine("comment: request failed: $($_.Exception.Message)")
  exit 1
}
```

- [ ] **Step 3: chmod + smoke test**

```bash
chmod +x skills/design-feature/scripts/comment.sh
MARKUP_URL=http://localhost:$PORT MARKUP_TOKEN=test ./skills/design-feature/scripts/comment.sh list m_test
MARKUP_URL=http://localhost:$PORT MARKUP_TOKEN=test ./skills/design-feature/scripts/comment.sh read c_test
MARKUP_URL=http://localhost:$PORT MARKUP_TOKEN=test ./skills/design-feature/scripts/comment.sh reply c_test "thanks!"
MARKUP_URL=http://localhost:$PORT MARKUP_TOKEN=test ./skills/design-feature/scripts/comment.sh react c_test "✅"
MARKUP_URL=http://localhost:$PORT MARKUP_TOKEN=test ./skills/design-feature/scripts/comment.sh resolve c_test "closed"
```

Each must exit 0 and print JSON to stdout.

- [ ] **Step 4: Commit**

```bash
git add skills/design-feature/scripts/comment.sh skills/design-feature/scripts/comment.ps1
git commit -m "feat(scripts): add comment.{sh,ps1} replacing markup-cli comments family (SP10 T9)"
```

---

### Task 10: Add OS-resolution + env-var contract block to `design-feature/SKILL.md`

**Files:**
- Modify: `skills/design-feature/SKILL.md` — new subsection at the top, immediately after the existing "Cross-harness tool reference" section.

- [ ] **Step 1: Add the new subsection**

After the "Cross-harness tool reference" section (which ends around line 47), insert:

```markdown
## In-skill scripts (no `markup-cli` required)

Deterministic operations against the Markup server are executed via shell scripts bundled with this skill at `skills/design-feature/scripts/`. The `bootstrap-design-system` skill references them through `../design-feature/scripts/`. There is no `npm install` step; the scripts use only what the host OS provides (`curl`, `bash` or PowerShell 5.1+, `grep`/`sed`/`Select-String`).

**OS dispatch.** Every operation ships as a `.sh` (Unix bash) + `.ps1` (Windows PowerShell) pair. Pick by host:

| Host                       | Invocation                                |
|----------------------------|-------------------------------------------|
| Linux, macOS, WSL          | `./scripts/<op>.sh [args]`                |
| Windows (native, no WSL)   | `pwsh ./scripts/<op>.ps1 [args]`          |

The skill prose below writes the Unix form as the canonical example; on Windows substitute the `.ps1` invocation. (The capability matrix prints which one applies to the current harness.)

**Required env vars.** Set before the skill starts:

| Var            | Required | Meaning                                                          |
|----------------|----------|------------------------------------------------------------------|
| `MARKUP_URL`   | yes      | Base URL of the Markup server, no trailing slash.                |
| `MARKUP_TOKEN` | yes      | Bearer token sent on every request.                              |

If either is unset when the skill starts, the very first `./scripts/doctor.sh` invocation in the Soft-dependency check fails with `exit 2` and a clear stderr message. The skill then refuses to advance and tells the user to set the vars.

**Op index** (full reference at `scripts/README.md`):

| Op             | Replaces                                                | Notes                                                  |
|----------------|---------------------------------------------------------|--------------------------------------------------------|
| `doctor`       | `markup-cli doctor --json`                              | GET /api/version + auth probe. Output JSON to stdout.  |
| `mockup-upload`| `markup-cli mockup new` / `markup-cli mockup version`   | POST a mockup HTML; server distinguishes new vs version |
| `promote`      | `markup-cli promote <file> --component <slug>`          | Local copy + marker + POST /api/ds/components          |
| `sync-index`   | `markup-cli sync-index`                                 | POST /api/ds/sync-index                                |
| `lint-ds`      | `markup-cli check --build --strict`                     | Pure-local structural lint; no network                 |
| `comment`      | `markup-cli comments {list,read,reply,react,resolve}`   | Subcommand dispatcher; inline `curl` is also acceptable for one-offs |
```

- [ ] **Step 2: Verify**

Run: `node validate.mjs`. Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "docs(design-feature): document in-skill scripts + env-var contract (SP10 T10)"
```

---

### Task 11: Rewrite §"Soft dependencies" + §"Disclaimer template" in `design-feature/SKILL.md`

**Files:**
- Modify: `skills/design-feature/SKILL.md` — §"Soft dependencies" (currently lines ~70-90), §"Disclaimer template" (lines ~93-127).

- [ ] **Step 1: Replace soft-dep entries 1 + 2**

Find:
```markdown
1. **`markup-cli` CLI** — run `markup-cli --version` via the harness's shell tool (`Bash` / `run_shell_command` / native shell). If absent, the skill still functions but the user has to perform repetitive operations manually. **Also compare the version against this skill's frontmatter `compat.cli`** — if below, HARD REFUSE with the upgrade message in the disclaimer template; do not proceed.

2. **Markup online connected** — run `markup-cli doctor --json` and parse the output. Schema (v0.1.0+):

   ```json
   {
     "cli":    { "version": "0.1.0", "compat": { "markup": ">=0.2.0" } },
     "markup": { "configured": true, "url": "...", "actual": "0.2.5", "api": "v1", "min": ">=0.2.0", "ok": true }
   }
   ```

   - Compare `cli.version` against this skill's frontmatter `compat.cli`. If below, HARD REFUSE (same as soft-dep 1's check; this is the structured re-check).
   - If `markup.configured === false`: comment iteration falls back to the **companion-server flow** (see Phase 1 hosting) — mockups stay local but get served over HTTP via the `brainstorming` skill's mini-server, optionally exposed via a Cloudflare quick tunnel.
   - If `markup.configured === true` but `markup.actual` does not satisfy this skill's frontmatter `compat.markup` (semver range): degrade with a ⚠ in the capability matrix — Markup-online flow is still attempted; many commands work even on slightly-old servers. Don't hard-refuse.
   - If `markup.configured === true` and `markup.actual === "unknown"` (i.e., the server is too old to expose `/api/version`): same as the previous case — degrade with warning.
```

Replace with:
```markdown
1. **Markup-server env vars set** — confirm `MARKUP_URL` and `MARKUP_TOKEN` are present (`printenv MARKUP_URL`, `printenv MARKUP_TOKEN`; on Windows, `$env:MARKUP_URL`, `$env:MARKUP_TOKEN`). If either is missing, comment iteration falls back to the **companion-server flow** (see Phase 1 hosting) — mockups stay local but get served over HTTP via the `brainstorming` skill's mini-server, optionally exposed via a Cloudflare quick tunnel. No hard refusal; the skill still functions in companion mode.

2. **Markup-server reachable** — only when soft-dep 1 passed. Run `./scripts/doctor.sh` (or `pwsh ./scripts/doctor.ps1` on Windows) and parse the output. Schema:

   ```json
   { "markup": { "configured": true, "url": "...", "actual": "0.2.5", "api": "v1", "ok": true } }
   ```

   - If `markup.ok === true` and `markup.actual` satisfies this skill's frontmatter `compat.markup` (semver range): full Markup-online flow.
   - If `markup.ok === true` but `markup.actual` does not satisfy `compat.markup`: degrade with a ⚠ in the capability matrix — Markup-online flow still attempted; many commands work on slightly-old servers. Don't hard-refuse.
   - If `markup.ok === true` and `markup.actual === "unknown"` (server too old to expose `/api/version`): same as the previous case — degrade with warning.
   - If `markup.ok === false` (network error, auth failure): fall back to companion-server flow same as if env vars were missing.
```

- [ ] **Step 2: Replace the CLI + Markup-online lines in the Disclaimer template**

Find the entire block from `  {cli line:        ✓ markup-cli vX.Y.Z ...` through `                                                ↳ sem ele: hosting via companion-server}` (~lines 98-112). Replace with:

```
  {env:             ✓ MARKUP_URL e MARKUP_TOKEN setados
                    |  ✗ MARKUP_URL e/ou MARKUP_TOKEN ausentes
                                                ↳ setar antes de invocar a skill (export MARKUP_URL=…; export MARKUP_TOKEN=…)
                                                ↳ sem eles: hosting via companion-server}
  {markup online:   ✓ ./scripts/doctor.sh reportou <url> @ <X.Y.Z> (satisfaz compat.markup <range>)
                    |  ⚠ ./scripts/doctor.sh reportou <url> @ <X.Y.Z>, abaixo de compat.markup <range>
                                                ↳ degradando: muitos comandos ainda funcionam; suba o servidor Markup ou pin esta skill numa tag mais antiga
                    |  ⚠ ./scripts/doctor.sh reportou <url>, mas /api/version retornou unknown
                                                ↳ degradando: servidor velho demais pra anunciar a versão
                    |  ✗ ./scripts/doctor.sh falhou ou env vars ausentes
                                                ↳ sem ele: hosting via companion-server}
```

(Windows invocation is `pwsh ./scripts/doctor.ps1` — mention this once in §"In-skill scripts" rather than every place.)

- [ ] **Step 3: Verify + commit**

```bash
node validate.mjs
git add skills/design-feature/SKILL.md
git commit -m "docs(design-feature): rewrite soft-deps + disclaimer for script invocation (SP10 T11)"
```

---

### Task 12: Migrate Phase 1 hosting (mockup upload) in `design-feature/SKILL.md`

**Files:**
- Modify: `skills/design-feature/SKILL.md` — §"Phase 1 hosting" → §"`[se Markup online]` Upload to Markup" (lines ~640-650).

- [ ] **Step 1: Replace the mockup upload step**

Find:
```markdown
1. Run `markup-cli mockup new <slug>` for the first version, or `markup-cli mockup version <file>` for iterations.
2. The CLI returns a hosted URL.
3. Print the URL to the user. Iterate via the existing Markup comments flow:
   - `markup-cli comments list <file> --status open --json`
   - `markup-cli comments read <annotationId> --json`
   - Decide: edit mockup → `markup-cli mockup version`; clarify → `markup-cli comments reply --body`; push back → `markup-cli comments reply` + `markup-cli comments react --emoji 🤔`; no change → `markup-cli comments resolve`. After applying changes: `markup-cli comments react <messageId> --emoji ✅`.
   - Re-pause with the checkpoint pattern: `Mockup hospedado em <url>. Comente no Markup, e diga "continue" quando quiser que eu processe o feedback.`
```

Replace with:
```markdown
1. Run `./scripts/mockup-upload.sh <mockup-file.html> <slug>` (Windows: `pwsh ./scripts/mockup-upload.ps1 <mockup-file.html> <slug>`). For iterations on an existing mockup, omit the `<slug>` arg — the server treats repeated POSTs of the same slug as new versions.
2. The script returns a JSON blob to stdout; read the `url` field as the hosted URL, the `id` field as the mockup ID (needed for later comment calls).
3. Print the URL to the user. Iterate via the comments flow:
   - `./scripts/comment.sh list <mockup-id> --status open` — list open threads (or `pwsh ./scripts/comment.ps1 list <id> --status open` on Windows).
   - `./scripts/comment.sh read <comment-id>` — fetch a single comment.
   - Decide: edit mockup → re-run `./scripts/mockup-upload.sh`; clarify → `./scripts/comment.sh reply <comment-id> "<body>"`; push back → reply + `./scripts/comment.sh react <comment-id> 🤔`; no change → `./scripts/comment.sh resolve <comment-id>`. After applying changes: `./scripts/comment.sh react <message-id> ✅`.
   - Re-pause with the checkpoint pattern: `Mockup hospedado em <url>. Comente no Markup, e diga "continue" quando quiser que eu processe o feedback.`
```

- [ ] **Step 2: Verify + commit**

```bash
node validate.mjs
git add skills/design-feature/SKILL.md
git commit -m "docs(design-feature): migrate Phase 1 mockup + comments to scripts (SP10 T12)"
```

---

### Task 13: Migrate Phase 1 approval gate + checkpoint references

**Files:**
- Modify: `skills/design-feature/SKILL.md` — Phase 1 gate prose (lines ~726-758).

- [ ] **Step 1: Replace `markup-cli promote` mention in the HARD-GATE**

Find:
```markdown
Do NOT invoke markup-cli promote, edit any file under docs/design/design-system/,
```
Replace with:
```markdown
Do NOT invoke ./scripts/promote.sh, edit any file under docs/design/design-system/,
```

- [ ] **Step 2: Replace `markup-cli comments resolve` in step 5**

Find:
```markdown
5. `[se Markup online]` close any still-open threads: `markup-cli comments resolve <id> --body "closed by approval"`.
```
Replace with:
```markdown
5. `[se Markup online]` close any still-open threads: `./scripts/comment.sh resolve <id> "closed by approval"`.
```

- [ ] **Step 3: Verify + commit**

```bash
node validate.mjs
git add skills/design-feature/SKILL.md
git commit -m "docs(design-feature): migrate Phase 1 gate references to scripts (SP10 T13)"
```

---

### Task 14: Migrate Phase 2 (promote + sync-index + lint-ds)

**Files:**
- Modify: `skills/design-feature/SKILL.md` — Phase 2 steps 1, 4, 5 (lines ~763-825), Phase 2 gate (lines ~833-844).

- [ ] **Step 1: Replace Phase 2 step 1 (promote)**

Find:
```markdown
1. **`[se CLI]`** Run `markup-cli promote <mockup-file> --component <slug>` — copies the mockup into `docs/design/design-system/NN-<slug>.html`, ensures the `data-ds-component` marker, uploads to the DS folder, runs `build`, calls `sync-index`.

   **`[manual fallback]`** Walk the user through: copy the file by hand to `docs/design/design-system/NN-<slug>.html` (next NN); make sure the marker is present; skip uploads if they don't have the CLI installed.
```

Replace with:
```markdown
1. Run `./scripts/promote.sh <mockup-file> <slug>` (Windows: `pwsh ./scripts/promote.ps1 <mockup-file> <slug>`). It copies the mockup into `docs/design/design-system/NN-<slug>.html` (auto-computing the next `NN`), ensures the `data-ds-component="<slug>"` marker is present on `<body>`, and uploads to the DS folder via `POST /api/ds/components`.

   **`[se Markup offline]`** When `MARKUP_URL`/`MARKUP_TOKEN` are unset OR the server is unreachable, `promote.sh` still writes the local file and the marker (exits non-zero with the upload skipped). Tell the user the local file is on disk; the server upload can be re-run later by re-invoking the same command once the env vars are set.
```

- [ ] **Step 2: Replace Phase 2 step 4 (sync-index)**

Find:
```markdown
4. **`[se CLI]`** `markup-cli sync-index`.

   **`[manual fallback]`** Tell the user the DS file is on disk and the index is stale; offer to re-run this step later if they install the CLI.
```

Replace with:
```markdown
4. Run `./scripts/sync-index.sh` (Windows: `pwsh ./scripts/sync-index.ps1`).

   **`[se Markup offline]`** Skip — tell the user the DS file is on disk and the server index is stale; the same command can be re-run later when env vars are set.
```

- [ ] **Step 3: Replace Phase 2 step 5 (lint)**

Find:
```markdown
5. **`[se CLI]`** Run `markup-cli check --build --strict` — must exit 0.

   **`[manual fallback]`** Print the structural invariants (marker present, IIFE in script, single root element, no `Tweaker.register` left) and ask the user to confirm.
```

Replace with:
```markdown
5. Run `./scripts/lint-ds.sh docs/design/design-system/NN-<slug>.html` (Windows: `pwsh ./scripts/lint-ds.ps1 ...`) — must exit 0. This is pure-local; no network or env vars required. On non-zero exit, read stderr for the failing section (§1/§4/§7/§8), fix the DS file, re-run.
```

- [ ] **Step 4: Replace Phase 2 gate reference**

Find:
```markdown
Do NOT invoke brainstorming for tech spec until:
  - markup-cli check --build --strict exited 0 (or manual structural review confirmed by user
    if CLI absent), AND
```
Replace with:
```markdown
Do NOT invoke brainstorming for tech spec until:
  - ./scripts/lint-ds.sh on the DS file exited 0, AND
```

- [ ] **Step 5: Verify + commit**

```bash
node validate.mjs
git add skills/design-feature/SKILL.md
git commit -m "docs(design-feature): migrate Phase 2 promote/sync/lint to scripts (SP10 T14)"
```

---

### Task 15: Migrate Phase 4 plan instruction + completion gate

**Files:**
- Modify: `skills/design-feature/SKILL.md` — Phase 4 plan instruction (line ~887), Phase 4 gate (line ~924).

- [ ] **Step 1: Update the Phase 4 `writing-plans` instruction**

Find:
```markdown
   > DS adjustments are first-class plan tasks. If the implementation requires changes to a DS component, include explicit tasks to edit the DS file (following `templates/ds-component-pattern.md`, with the Code API section adapted to the strategy in `.markup-design/scratch/strategy.json`), run `markup-cli check --build --strict` (or the manual structural review when CLI is absent), and commit with `feat(ds): amend <slug> (driven by <reason>)`. Any task that edits a DS file MUST be followed by `markup-cli check --build --strict` in the plan.
```
Replace with:
```markdown
   > DS adjustments are first-class plan tasks. If the implementation requires changes to a DS component, include explicit tasks to edit the DS file (following `templates/ds-component-pattern.md`, with the Code API section adapted to the strategy in `.markup-design/scratch/strategy.json`), run `./scripts/lint-ds.sh <ds-file>` (or `pwsh ./scripts/lint-ds.ps1 <ds-file>` on Windows), and commit with `feat(ds): amend <slug> (driven by <reason>)`. Any task that edits a DS file MUST be followed by `./scripts/lint-ds.sh` in the plan.
```

- [ ] **Step 2: Update the Phase 4 gate**

Find:
```markdown
    `markup-cli check --build --strict` exited 0 (or the manual structural review was
```
Replace with:
```markdown
    `./scripts/lint-ds.sh <ds-file>` exited 0 (or the manual structural review was
```

- [ ] **Step 3: Update the Phase 4 worked-example bullet**

Find (around line 937):
```markdown
1. The tech spec needs a new `size=xs` variant on the Button component that did not exist when the mockup was approved. The Phase 1 mockup did not show or exercise this size. **OK** — add the variant in Phase 4 as a DS-edit task (per Phase 4 step 1 instruction); run `markup-cli check --build --strict`; commit.
```
Replace with:
```markdown
1. The tech spec needs a new `size=xs` variant on the Button component that did not exist when the mockup was approved. The Phase 1 mockup did not show or exercise this size. **OK** — add the variant in Phase 4 as a DS-edit task (per Phase 4 step 1 instruction); run `./scripts/lint-ds.sh <ds-file>`; commit.
```

- [ ] **Step 4: Verify + commit**

```bash
node validate.mjs
git add skills/design-feature/SKILL.md
git commit -m "docs(design-feature): migrate Phase 4 references to lint-ds.sh (SP10 T15)"
```

---

### Task 16: Migrate invariants + any remaining `markup-cli` references

**Files:**
- Modify: `skills/design-feature/SKILL.md` — Invariants section (lines ~1083-1095), worked-example bullet around line 1020.

- [ ] **Step 1: Update the `Always run` invariant**

Find:
```markdown
- Always run `markup-cli check --build --strict` before declaring Phase 2 done (or the manual structural review when CLI is absent). Phase 4 completion is gated by `verification-before-completion` AND, if any DS file was edited during Phase 4, by `markup-cli check --build --strict` as well — DS edits never ship un-validated.
```
Replace with:
```markdown
- Always run `./scripts/lint-ds.sh <ds-file>` before declaring Phase 2 done. Phase 4 completion is gated by `verification-before-completion` AND, if any DS file was edited during Phase 4, by `./scripts/lint-ds.sh` as well — DS edits never ship un-validated.
```

- [ ] **Step 2: Update the worked-example bullet (~line 1020)**

Find:
```markdown
       fix DS (raro; segue o template bundled, roda markup-cli check --build --strict).
```
Replace with:
```markdown
       fix DS (raro; segue o template bundled, roda ./scripts/lint-ds.sh).
```

- [ ] **Step 3: Sweep for any remaining `markup-cli` mention**

```bash
grep -n "markup-cli" skills/design-feature/SKILL.md
```
Expected output: nothing. If any line remains (e.g., in the §"Repository:" link `https://github.com/AlexandreCamillo/markup-cli-toolkit`), leave the repo URL alone — that's a public repo name, not an invocation. Any other survivor must be migrated.

- [ ] **Step 4: Verify + commit**

```bash
node validate.mjs
git add skills/design-feature/SKILL.md
git commit -m "docs(design-feature): migrate invariants + final markup-cli sweep (SP10 T16)"
```

---

### Task 17: Migrate `bootstrap-design-system/SKILL.md` — preconditions, dep, steps

**Files:**
- Modify: `skills/bootstrap-design-system/SKILL.md` — Hard preconditions §2 (line 32), Soft dependency (line 38), Step C item 6 (line 254), Step E items 1+2 (lines 348-349), Step E closing summary (line 378).

- [ ] **Step 1: Replace Hard precondition §2**

Find:
```markdown
2. **`markup-cli` CLI installed.** Used for build, sync-index, check. Recommended (not strictly required) is `>=0.1.0` which has the `bootstrap` sub-commands.
```
Replace with:
```markdown
2. **In-skill scripts present.** The skill invokes `../design-feature/scripts/{doctor,promote,sync-index,lint-ds}.{sh,ps1}`. They ship with the `design-skills` plugin and require no installation. If the `scripts/` directory is missing (i.e., a partial install), abort with `❌ HARD: scripts ausentes em ../design-feature/scripts/. Reinstale design-skills`.
```

- [ ] **Step 2: Replace the Soft dependency block**

Find:
```markdown
## Soft dependency

- **Markup online** — optional. Bootstrap can complete entirely locally. If connected, you can run `markup-cli promote <slug>` manually after curation; the skill itself does not invoke it.
```
Replace with:
```markdown
## Soft dependency

- **Markup-server reachable** — optional (`MARKUP_URL` + `MARKUP_TOKEN` env vars set; `../design-feature/scripts/doctor.sh` exits 0). Bootstrap can complete entirely locally. If connected, you can run `../design-feature/scripts/promote.sh <file> <slug>` manually after curation; the skill itself does not invoke it.
```

- [ ] **Step 3: Replace Step C item 6 (the `check --build --strict` run)**

Find:
```markdown
6. After all snapshots, run `markup-cli check --build --strict` and ensure the structure passes (BEM prefix linter, marker uniqueness, etc.). Fix anything broken before advancing.
```
Replace with:
```markdown
6. After all snapshots, run `../design-feature/scripts/lint-ds.sh <ds-file>` (Windows: `pwsh ../design-feature/scripts/lint-ds.ps1 <ds-file>`) on each generated DS file and ensure each exits 0. Fix any structural failure before advancing.
```

- [ ] **Step 4: Replace Step E items 1 + 2**

Find:
```markdown
1. **`markup-cli check --build --strict`** — must pass.
2. **`markup-cli sync-index`** — regenerate `index.md`.
```
Replace with:
```markdown
1. **`../design-feature/scripts/lint-ds.sh <ds-file>`** for each DS file — must pass.
2. **`../design-feature/scripts/sync-index.sh`** — regenerate the server index. Local `docs/design/index.md` is updated by step 3 below.
```

- [ ] **Step 5: Replace the closing-summary `bootstrap snapshot` line**

Find:
```markdown
     · Re-rodar snapshots individuais depois de mudanças de design via:
         markup-cli bootstrap snapshot <slug>
```
Replace with:
```markdown
     · Re-rodar snapshots individuais depois de mudanças de design: invoque a
       `bootstrap-design-system` skill novamente — ela detecta DS files existentes e
       oferece re-snapshot incremental por item.
```

- [ ] **Step 6: Sweep for any remaining `markup-cli` mention in bootstrap**

```bash
grep -n "markup-cli" skills/bootstrap-design-system/SKILL.md
```
Expected: only the repo URL on line ~63 (https://github.com/AlexandreCamillo/markup-cli-toolkit) — leave that alone. Anything else must be migrated.

- [ ] **Step 7: Verify + commit**

```bash
node validate.mjs
git add skills/bootstrap-design-system/SKILL.md
git commit -m "docs(bootstrap-design-system): migrate to scripts + drop markup-cli refs (SP10 T17)"
```

---

### Task 18: Overhaul `validate.mjs` — script-existence + parity checks

**Files:**
- Modify: `validate.mjs`

- [ ] **Step 1: Remove the markup-cli command-reference check**

In `validate.mjs`, delete the entire block from `const KNOWN_CLI_COMMANDS = new Set([` (line 15) through the closing `]);` (line 23). Delete the `// 4. CLI command references resolve.` block in `function validate()` (lines ~66-87).

- [ ] **Step 2: Add a script-invocation existence check**

After the existing per-skill `validate()` function, add a new top-level function:

```js
function validateScriptInvocations() {
  // Patterns the skill prose uses to invoke scripts. We look for:
  //   ./scripts/<name>.sh           — Unix bash invocation
  //   pwsh ./scripts/<name>.ps1     — Windows PowerShell invocation
  //   ../design-feature/scripts/<name>.{sh,ps1} — cross-skill ref from bootstrap
  // For every referenced script, both the .sh AND .ps1 variants must exist on disk.
  const SCRIPTS_DIR = join(SKILLS_DIR, 'design-feature', 'scripts');
  const targets = [
    { skill: 'design-feature',          path: join(SKILLS_DIR, 'design-feature', 'SKILL.md'),         prefix: './scripts/' },
    { skill: 'bootstrap-design-system', path: join(SKILLS_DIR, 'bootstrap-design-system', 'SKILL.md'), prefix: '../design-feature/scripts/' },
  ];
  const SCRIPT_RE = (prefix) => new RegExp(prefix.replace(/[./]/g, '\\$&') + '([a-z][a-z0-9-]*)\\.(sh|ps1)\\b', 'g');
  const referenced = new Set();
  for (const t of targets) {
    if (!existsSync(t.path)) continue;
    const body = readFileSync(t.path, 'utf8');
    let m;
    const re = SCRIPT_RE(t.prefix);
    while ((m = re.exec(body)) !== null) {
      referenced.add(m[1]); // bare script name without extension
    }
  }
  for (const name of referenced) {
    const sh = join(SCRIPTS_DIR, name + '.sh');
    const ps1 = join(SCRIPTS_DIR, name + '.ps1');
    if (!existsSync(sh))  issues.push({ skill: 'design-feature/scripts', message: `referenced script "${name}.sh" not found at ${sh}` });
    if (!existsSync(ps1)) issues.push({ skill: 'design-feature/scripts', message: `referenced script "${name}.ps1" not found at ${ps1}` });
  }
}

function validateScriptParity() {
  // Every .sh in the scripts dir must have a .ps1 sibling and vice versa.
  const SCRIPTS_DIR = join(SKILLS_DIR, 'design-feature', 'scripts');
  if (!existsSync(SCRIPTS_DIR)) return;
  const entries = readdirSync(SCRIPTS_DIR);
  const stems = new Map(); // stem -> { sh: bool, ps1: bool }
  for (const f of entries) {
    const m = f.match(/^(.+)\.(sh|ps1)$/);
    if (!m) continue;
    const stem = m[1];
    const ext = m[2];
    if (!stems.has(stem)) stems.set(stem, { sh: false, ps1: false });
    stems.get(stem)[ext] = true;
  }
  for (const [stem, present] of stems) {
    if (!present.sh)  issues.push({ skill: 'design-feature/scripts', message: `script "${stem}.sh" missing (parity with ${stem}.ps1)` });
    if (!present.ps1) issues.push({ skill: 'design-feature/scripts', message: `script "${stem}.ps1" missing (parity with ${stem}.sh)` });
  }
}
```

- [ ] **Step 3: Wire the new checks into the main flow**

Find the call block near the bottom of `validate.mjs`:
```js
validateDesignFeatureTemplate();
const strategiesData = validateStrategies();
validateStrategyCrossReferences(strategiesData);
validateGeneratedTemplateInSync();
validateCrossReferences();
validateCompatAlignment();
validateFrameworkCoverage(strategiesData);
```
Add immediately after:
```js
validateScriptInvocations();
validateScriptParity();
```

- [ ] **Step 4: Verify**

```bash
node validate.mjs
```
Expected: `✓ Validated 2 skill(s); no issues.`

If any "referenced script ... not found" issue appears, the SKILL.md migration in Tasks 11–17 left a typo. Fix the SKILL.md.

- [ ] **Step 5: Commit**

```bash
git add validate.mjs
git commit -m "test(validate): swap markup-cli check for script-existence + parity check (SP10 T18)"
```

---

### Task 19: Extend `scripts/smoke-test.mjs` to exercise the new shell scripts

**Files:**
- Modify: `scripts/smoke-test.mjs`

- [ ] **Step 1: Add the mock-server spawn + script invocations**

At the bottom of `scripts/smoke-test.mjs`, after the existing `console.log('✓ smoke-test: Phase 0 detection ...')` line, add:

```js
// SP10 — Exercise the shell scripts against the mock Markup server. Unix only;
// the .ps1 variants would need a Windows CI step (TODO: when available, mirror
// these assertions through pwsh).
import { spawnSync, spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const SCRIPTS_DIR = join(repoRoot, 'skills/design-feature/scripts');

function startMock() {
  const child = spawn(process.execPath, [join(repoRoot, 'scripts/mock-markup-server.mjs'), '0'], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return new Promise((resolve, reject) => {
    let buf = '';
    const t = setTimeout(() => reject(new Error('mock server failed to announce port within 3s')), 3000);
    child.stdout.on('data', (d) => {
      buf += d.toString();
      const m = buf.match(/listening:(\d+)/);
      if (m) { clearTimeout(t); resolve({ child, port: Number(m[1]) }); }
    });
  });
}

function runScript(scriptPath, args, env) {
  return spawnSync(scriptPath, args, { encoding: 'utf8', env: { ...process.env, ...env } });
}

async function smokeScripts() {
  if (process.platform === 'win32') {
    console.log('⚠ smoke-test: SP10 script smoke skipped on Windows (TODO: pwsh variant).');
    return;
  }
  const { child, port } = await startMock();
  const baseEnv = { MARKUP_URL: `http://localhost:${port}`, MARKUP_TOKEN: 'test-token' };
  try {
    // doctor
    let r = runScript(join(SCRIPTS_DIR, 'doctor.sh'), [], baseEnv);
    if (r.status !== 0) fail(`doctor.sh exited ${r.status}: ${r.stderr}`);
    if (!/"actual":"0\.2\.7"/.test(r.stdout)) fail(`doctor.sh stdout missing version: ${r.stdout}`);

    // sync-index
    r = runScript(join(SCRIPTS_DIR, 'sync-index.sh'), [], baseEnv);
    if (r.status !== 0) fail(`sync-index.sh exited ${r.status}: ${r.stderr}`);

    // mockup-upload
    const tmp = mkdtempSync(join(tmpdir(), 'sp10-'));
    const mockFile = join(tmp, 'm.html');
    writeFileSync(mockFile, '<html><body>x</body></html>');
    r = runScript(join(SCRIPTS_DIR, 'mockup-upload.sh'), [mockFile, 'mock'], baseEnv);
    if (r.status !== 0) fail(`mockup-upload.sh exited ${r.status}: ${r.stderr}`);
    if (!/"id":"m_test"/.test(r.stdout)) fail(`mockup-upload.sh stdout missing id: ${r.stdout}`);

    // lint-ds — good + bad
    for (const fix of ['good.html']) {
      r = runScript(join(SCRIPTS_DIR, 'lint-ds.sh'), [join(repoRoot, 'test-fixtures/ds-lint', fix)], {});
      if (r.status !== 0) fail(`lint-ds.sh ${fix} exited ${r.status}: ${r.stderr}`);
    }
    for (const fix of ['bad-missing-grid.html', 'bad-empty-api.html', 'bad-missing-tokens.html', 'bad-empty-behavior.html']) {
      r = runScript(join(SCRIPTS_DIR, 'lint-ds.sh'), [join(repoRoot, 'test-fixtures/ds-lint', fix)], {});
      if (r.status === 0) fail(`lint-ds.sh ${fix} unexpectedly passed`);
    }

    // comment — list + read + reply + react + resolve
    for (const sub of [['list', 'm_test'], ['read', 'c_test'], ['reply', 'c_test', 'hi'], ['react', 'c_test', '✅'], ['resolve', 'c_test', 'done']]) {
      r = runScript(join(SCRIPTS_DIR, 'comment.sh'), sub, baseEnv);
      if (r.status !== 0) fail(`comment.sh ${sub.join(' ')} exited ${r.status}: ${r.stderr}`);
    }

    rmSync(tmp, { recursive: true, force: true });
  } finally {
    child.kill('SIGTERM');
  }
  console.log('✓ smoke-test: SP10 shell scripts pass against mock Markup server.');
}

await smokeScripts();
```

> Note: this file is already an ES module (`type: module` in package.json). Top-level `await` works on Node 20.

> Skipped: the `promote.sh` smoke test would require changing into a temp working directory because the script writes under `docs/design/design-system/`. The existing smoke test runs from repo root and would pollute `docs/`. Add a TODO comment in the smoke test instead of including a promote assertion — Task 22 covers a manual exercise of promote.

- [ ] **Step 2: Verify**

```bash
node scripts/smoke-test.mjs
```
Expected: original Phase 0 assertion passes, then SP10 script assertions print `✓ smoke-test: SP10 shell scripts pass against mock Markup server.`. Exit 0.

- [ ] **Step 3: Commit**

```bash
git add scripts/smoke-test.mjs
git commit -m "test(smoke): exercise SP10 shell scripts against mock Markup server (SP10 T19)"
```

---

### Task 20: Rewrite `docs/COMPAT.md` — drop markup-cli, add script contract

**Files:**
- Modify: `docs/COMPAT.md`

- [ ] **Step 1: Replace `## markup-cli check semantics` section**

Find the entire section starting with `## markup-cli check semantics` and ending immediately before `## Frontmatter compat blocks`. Replace with:

```markdown
## Script invocation contract

Throughout both SKILL.md files, gates that read

> `./scripts/lint-ds.sh <ds-file>` (Unix) / `pwsh ./scripts/lint-ds.ps1 <ds-file>` (Windows)

invoke the bundled structural linter. Exit semantics:

- **Exit 0** — pass. The gate advances.
- **Exit 3** — lint failure (one of §1/§4/§7/§8 invariants did not hold). The gate refuses. Stderr names the failing section.
- **Exit 4** — bad arguments or file not found. Skill prose should never trigger this; treat as a bug.
- **Any other non-zero exit** — unexpected error. The gate refuses.

Network-touching scripts (`doctor`, `mockup-upload`, `promote`, `sync-index`, `comment`) read two env vars: `MARKUP_URL` and `MARKUP_TOKEN`. If either is missing, the script exits `2` with a clear stderr message. The skill's pre-Phase-0 doctor check is the first place this matters.

If a script is missing from `skills/design-feature/scripts/` (partial install), `validate.mjs`'s `validateScriptInvocations` check fails — the skill itself does not attempt to detect this at runtime.
```

- [ ] **Step 2: Update `## Frontmatter compat blocks`**

Find:
```markdown
Each SKILL.md must declare:

\`\`\`yaml
compat:
  cli: ">=0.1.0"
  markup: ">=0.2.0"
\`\`\`

Both ranges use semver `>=` shape (no `^`, no `~`, no exact pin). The lower bound is the oldest CLI / Markup-server version this skill has been verified against. `validate.mjs` enforces that both SKILL.md files declare identical ranges so the two skills can never drift against each other within a release.
```

Replace with:
```markdown
Each SKILL.md must declare:

\`\`\`yaml
compat:
  markup: ">=0.2.0"
\`\`\`

The range uses semver `>=` shape (no `^`, no `~`, no exact pin). The lower bound is the oldest Markup-server version this skill has been verified against. `validate.mjs` enforces that both SKILL.md files declare identical `compat.markup` ranges so the two skills can never drift against each other within a release. The previously-required `compat.cli` was removed in SP10 (2026-05-24) when the skill stopped depending on the `markup-cli` npm package; see `docs/SCHEMA-CHANGELOG.md` Version 2.
```

- [ ] **Step 3: Update `## What counts as a breaking change`**

Find item 1:
```markdown
1. Raising the lower bound of `compat.cli` or `compat.markup` in either SKILL.md frontmatter (e.g., `>=0.1.0` → `>=0.2.0`).
```
Replace with:
```markdown
1. Raising the lower bound of `compat.markup` in either SKILL.md frontmatter (e.g., `>=0.2.0` → `>=0.3.0`).
```

Add a new item 6:
```markdown
6. Removing or renaming a script under `skills/design-feature/scripts/` that the SKILL.md prose invokes, OR changing the exit-code semantics, env-var contract, or stdout output schema of a script in a way that breaks an existing skill caller. Adding a new script is NOT breaking. Adding a new optional flag/arg to an existing script is NOT breaking.
```

- [ ] **Step 4: Update `## Internal references to this document`**

Find:
```markdown
- `validate.mjs` — the cross-cutting validator implements the rules described above.
```
Just above that, add:
```markdown
- `skills/design-feature/scripts/README.md` — env-var contract + OS-resolution rule referenced from the §"Script invocation contract" section above.
```

- [ ] **Step 5: Update the opening paragraph**

Find:
```markdown
This document defines the versioning semantics for the `design-feature` and `bootstrap-design-system` skills (collectively, "design-skills"), the rules that govern a breaking change, the deprecation cycle, and the severity model for the `markup-cli check` gates that both skills rely on.
```
Replace with:
```markdown
This document defines the versioning semantics for the `design-feature` and `bootstrap-design-system` skills (collectively, "design-skills"), the rules that govern a breaking change, the deprecation cycle, and the contract for the in-skill scripts (`skills/design-feature/scripts/`) that both skills rely on.
```

And the line beginning `> Both SKILL.md files MUST declare the same `compat.cli` and `compat.markup`...`:
```markdown
> Both SKILL.md files MUST declare the same `compat.cli` and `compat.markup` ranges in their YAML frontmatter — `validate.mjs` enforces this.
```
Becomes:
```markdown
> Both SKILL.md files MUST declare the same `compat.markup` range in their YAML frontmatter — `validate.mjs` enforces this.
```

- [ ] **Step 6: Commit**

```bash
git add docs/COMPAT.md
git commit -m "docs(compat): rewrite COMPAT.md for SP10 script-invocation contract (SP10 T20)"
```

---

### Task 21: Add Version 2 entry to `docs/SCHEMA-CHANGELOG.md`

**Files:**
- Modify: `docs/SCHEMA-CHANGELOG.md`

- [ ] **Step 1: Insert a Version 2 entry above Version 1**

Find:
```markdown
## Version 1 (2026-05-23) — Sub-plan 6
```
Insert above:
```markdown
## Version 2 (2026-05-24) — Sub-plan 10

**Breaking — frontmatter contract.** The `compat.cli` field is removed from both SKILL.md files. Skills no longer depend on the `markup-cli` npm package; deterministic operations move to in-skill scripts at `skills/design-feature/scripts/{doctor,mockup-upload,promote,sync-index,lint-ds,comment}.{sh,ps1}` (referenced via `../design-feature/scripts/` from bootstrap-design-system). Auth + server location move to env vars: `MARKUP_URL` and `MARKUP_TOKEN`.

Migration for downstream consumers: there is no consumer-side schema migration. The change is fully internal to the skills; existing `strategy.json` / `state.json` / `registry.json` files on disk remain compatible. Any external automation that parsed a SKILL.md `compat.cli` field stops finding it; the field is simply absent.

Validator changes (`validate.mjs`): `KNOWN_CLI_COMMANDS` and the markup-cli reference check are deleted; `validateScriptInvocations` and `validateScriptParity` are added; the `compat.cli` requirement in the per-skill frontmatter check is removed; the `compat.cli` alignment check in `validateCompatAlignment` is removed.

```

- [ ] **Step 2: Commit**

```bash
git add docs/SCHEMA-CHANGELOG.md
git commit -m "docs(schema): record SP10 breaking change (compat.cli dropped) (SP10 T21)"
```

---

### Task 22: Final validation + manual exercise

**Files:** read-only.

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```
Expected: `✓ Validated 2 skill(s); no issues.` followed by `✓ smoke-test: Phase 0 detection produces the expected strategy.json shape (react-antd-rhf).` followed by `✓ smoke-test: SP10 shell scripts pass against mock Markup server.` Exit 0.

- [ ] **Step 2: Manually exercise `promote.sh` end-to-end**

```bash
# Start mock server.
node scripts/mock-markup-server.mjs 0 > /tmp/mock-port 2>&1 &
MOCK_PID=$!
sleep 0.5
PORT=$(grep -oE 'listening:[0-9]+' /tmp/mock-port | cut -d: -f2)

# In a throwaway dir (promote writes under docs/design/design-system/).
TMP=$(mktemp -d)
cd "$TMP"
echo '<html><body>x</body></html>' > /tmp/mock-in.html
MARKUP_URL=http://localhost:$PORT MARKUP_TOKEN=test \
  /abs/path/to/skills/design-feature/scripts/promote.sh /tmp/mock-in.html test-slug

# Verify.
test -f docs/design/design-system/01-test-slug.html && echo "file OK"
grep -q 'data-ds-component="test-slug"' docs/design/design-system/01-test-slug.html && echo "marker OK"

# Cleanup.
cd /
rm -rf "$TMP"
kill $MOCK_PID
```

All three lines (`file OK`, `marker OK`, no errors) must appear.

- [ ] **Step 3: Final sweep — confirm no markup-cli invocations remain in skill prose**

```bash
grep -rn "markup-cli " skills/ | grep -v "markup-cli-toolkit"
```
Expected: empty. The single remaining `markup-cli-toolkit` substring is the public repo URL — leave it.

- [ ] **Step 4: Confirm both skills' frontmatters lack `compat.cli`**

```bash
grep -nE "^\s*cli:" skills/*/SKILL.md
```
Expected: empty.

- [ ] **Step 5: Open PR**

If running this plan in a worktree:
```bash
git push -u origin sp-10-cli-to-scripts
gh pr create --title "SP10: replace markup-cli with in-skill shell scripts + inline REST" --body "$(cat <<'EOF'
## Summary
- Drops the `markup-cli` npm-package dependency from both skills
- Adds shell-script pairs (`.sh` + `.ps1`) under `skills/design-feature/scripts/` for doctor, mockup upload, promote, sync-index, lint-ds, comment
- Migrates all ~30 `markup-cli <verb>` invocations across both SKILL.md files
- Drops `compat.cli` from both frontmatters; rewrites `validate.mjs` to check script existence + .sh/.ps1 parity
- Adds mock Markup server for smoke tests; extends `scripts/smoke-test.mjs`
- Rewrites `docs/COMPAT.md` for the new contract; logs the breaking change in `docs/SCHEMA-CHANGELOG.md` as Version 2

## Test plan
- [ ] `npm test` passes locally on Linux/macOS
- [ ] Manual promote exercise (Task 22 step 2) succeeds
- [ ] `grep -rn "markup-cli " skills/ | grep -v "markup-cli-toolkit"` returns empty
- [ ] No `compat.cli` field anywhere in `skills/*/SKILL.md`
- [ ] TODO: Windows CI run to exercise `.ps1` variants (out of scope for SP10)
EOF
)"
```

---

## Self-review

(Performed inline; see the checks below.)

**1. Spec coverage — every in-scope item has a task:**
- IN-1 (replace markup-cli invocations): Tasks 11-17.
- IN-2 (create script pairs): Tasks 4-9.
- IN-3 (OS-detection convention + env vars): Task 10 (SKILL.md block) + Task 3 (scripts/README.md).
- IN-4 (drop compat.cli from frontmatter): Task 1.
- IN-5 (validate.mjs overhaul): Tasks 1 (relax) + 18 (script checks).
- IN-6 (extend smoke-test.mjs): Task 19.
- IN-7 (mock server): Task 2.
- IN-8 (rewrite COMPAT.md): Task 20.
- IN-9 (SCHEMA-CHANGELOG entry): Task 21.

**2. Placeholder scan:** searched for "TBD", "TODO" (within plan body — `TODO(smoke)` and the test plan checkbox are intentional and explained), "implement later", "fill in details", "Add appropriate error handling", "similar to Task N". None found in any task body. The smoke test's PowerShell-variant note is an explicit out-of-scope acknowledgement, not a deferred plan task.

**3. Type consistency:**
- Script names: `doctor`, `mockup-upload`, `promote`, `sync-index`, `lint-ds`, `comment` — used consistently across Tasks 3 (README), 4-9 (creation), 10 (SKILL.md docs), 11-17 (SKILL.md migration), 18 (validate.mjs), 19 (smoke-test.mjs), 20 (COMPAT.md). No drift.
- Env vars: `MARKUP_URL` and `MARKUP_TOKEN` — same name in every reference (README, scripts, SKILL.md, COMPAT.md).
- Exit codes: 0/1/2/3/4 with consistent meanings across scripts/README.md, COMPAT.md, and each script body.
- Invocation form: `./scripts/<op>.sh` (Unix) and `pwsh ./scripts/<op>.ps1` (Windows) used the same way everywhere; cross-skill form `../design-feature/scripts/<op>.<ext>` only in bootstrap migration (Task 17).

**4. One issue caught + fixed during review:** Task 6 step 2 originally had `$ErrorActionPreference = 'Stop'` before `param(...)` in the PowerShell sample, which would be a syntax error (param must be first). Corrected with an inline note + the right ordering. Tasks 7, 8, 9's `.ps1` scripts have `param()` first or no `param()`, which is correct.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-24-sp-10-cli-to-scripts.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration. Best for a large plan like this; isolates per-task context.

**2. Inline Execution** — execute tasks in this session using `executing-plans`, batch execution with checkpoints for review. Better when you want to watch every commit live.

Which approach?
