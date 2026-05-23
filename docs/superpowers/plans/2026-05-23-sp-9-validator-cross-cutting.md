# Sub-plan 9 — Validator + cross-cutting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Execution mode for this plan: inline in the same session** (per the parent assignment).

**Goal:** Turn `validate.mjs` into a real safety net for the design-skills repo — cross-reference resolution, compat alignment, fixture-driven Phase 0 smoke test — plus modernize the gate references to `markup-cli check --build --strict` and ship the `docs/COMPAT.md` policy.

**Architecture:** Extend the existing Node validator (`validate.mjs`) with new check functions, add a deterministic Phase-0-detection smoke test (`scripts/smoke-test.mjs`) backed by a fixture project under `test-fixtures/`, and update both `SKILL.md` files for the gate-severity flag plus the Codex install path. New `docs/COMPAT.md` documents the policy.

**Tech Stack:** Node 20 ESM, `node:fs`/`node:path`, regex-based markdown parsing (no AST deps), JSON fixtures.

---

## Pre-flight

- [ ] **P0: Create the feature branch.**

```bash
cd /workspace/projects/design-skills/.claude/worktrees/agent-aa55ee50c265464f2
git checkout -b feat/sp-9-validator-cross-cutting
```

- [ ] **P1: Baseline `node validate.mjs` passes (sanity check).**

```bash
node validate.mjs
```
Expected: `✓ Validated 2 skill(s); no issues.`

---

## Task 1 — Cross-reference resolution (X1)

**Goal:** New validator step that parses both SKILL.md files for cross-references like `see § "Heading"` and confirms each referenced title exists as a heading in the same file (or the referenced file).

**Files:**
- Modify: `validate.mjs`

**Design note.** Cross-references in the corpus take two shapes:
1. Quoted: `see § "Manual checklist fallback"`, `see § "Chrome MCP tool resolution"` — easy to extract via a single regex anchored on `§ "..."`.
2. Bare numeric: `see §0.5 schema`, `(see §0.2.5)` — these refer to section numbers like `### 0.5 Persist the choice`. Resolvable by matching the leading number against headings.

I will support both forms. The reference target file is **the same SKILL.md** unless the reference is path-prefixed like `../design-feature/SKILL.md` (the one cross-skill reference in bootstrap line 15).

- [ ] **Step 1.1: Add the cross-reference validator function to `validate.mjs`.**

Insert after `validateGeneratedTemplateInSync` (around line 265) and before the `for (const s of skills)` loop:

```js
function collectHeadings(markdown) {
  // Returns the set of trimmed heading titles found in the body, plus a parallel
  // set of leading numeric tokens (e.g., "0.5", "0.2.5") harvested from `### N.N Title`
  // style headings.
  const titles = new Set();
  const numeric = new Set();
  const HEADING_RE = /^#{1,6}\s+(.+?)\s*$/gm;
  let m;
  while ((m = HEADING_RE.exec(markdown)) !== null) {
    const raw = m[1].trim();
    titles.add(raw);
    // Strip a `### 0.2.5 Branch check (...)` style numeric prefix and store the bare title too.
    const numMatch = raw.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
    if (numMatch) {
      numeric.add(numMatch[1]);
      titles.add(numMatch[2].trim());
    }
  }
  return { titles, numeric };
}

function validateCrossReferences() {
  const targets = [
    { skill: 'design-feature',          path: join(SKILLS_DIR, 'design-feature', 'SKILL.md') },
    { skill: 'bootstrap-design-system', path: join(SKILLS_DIR, 'bootstrap-design-system', 'SKILL.md') },
  ];
  const headingsBySkill = new Map();
  for (const t of targets) {
    if (!existsSync(t.path)) continue;
    headingsBySkill.set(t.skill, collectHeadings(readFileSync(t.path, 'utf8')));
  }
  // Match `§ "Title"` (with or without leading "see"/"See"), curly or straight quotes.
  // Group 1 captures the title.
  const QUOTED_RE = /§\s*["“]([^"”\n]+?)["”]/g;
  // Match bare numeric refs like `§0.5`, `§ 0.2.5`. Group 1 captures the number.
  const NUMERIC_RE = /§\s*(\d+(?:\.\d+)+)/g;
  for (const t of targets) {
    if (!existsSync(t.path)) continue;
    const body = readFileSync(t.path, 'utf8');
    const ownHeadings = headingsBySkill.get(t.skill);
    let m;
    while ((m = QUOTED_RE.exec(body)) !== null) {
      const title = m[1].trim();
      // Cross-file refs use a relative path mention nearby; the simplest heuristic
      // is to look at the 80 chars before the match for `../<skill>/SKILL.md` and
      // resolve against that file's headings if matched.
      const ctx = body.slice(Math.max(0, m.index - 120), m.index);
      const crossFile = ctx.match(/\.\.\/(design-feature|bootstrap-design-system)\/SKILL\.md/);
      const targetHeadings = crossFile ? headingsBySkill.get(crossFile[1]) : ownHeadings;
      if (!targetHeadings) continue;
      if (!targetHeadings.titles.has(title)) {
        issues.push({
          skill: t.skill,
          message: `cross-reference § "${title}" does not match any heading${crossFile ? ` in ${crossFile[1]}/SKILL.md` : ''}`,
        });
      }
    }
    while ((m = NUMERIC_RE.exec(body)) !== null) {
      const num = m[1];
      if (!ownHeadings.numeric.has(num)) {
        issues.push({
          skill: t.skill,
          message: `cross-reference §${num} does not match any numbered heading`,
        });
      }
    }
  }
}
```

Then call it after `validateGeneratedTemplateInSync()`:

```js
validateCrossReferences();
```

- [ ] **Step 1.2: Run validator.**

```bash
node validate.mjs
```
Expected: still `✓ Validated 2 skill(s); no issues.` — the existing corpus's cross-references all resolve. If anything breaks, the failing reference points at a real bug — fix the reference (or the heading) before continuing.

- [ ] **Step 1.3: Add a regression test by temporarily breaking a reference, verify the validator catches it, then revert.**

Temporarily edit `skills/design-feature/SKILL.md` line ~40 (`see § "Manual checklist fallback"`) → change the quoted title to `see § "Bogus Section That Does Not Exist"`. Run `node validate.mjs`. Expected output includes a line containing `cross-reference § "Bogus Section That Does Not Exist" does not match`. Revert the edit. Re-run validator — back to `✓ ... no issues.`

- [ ] **Step 1.4: Commit.**

```bash
git add validate.mjs
git commit -m "feat(validate): resolve cross-references (§ \"...\" and §N.N) against SKILL.md headings (X1)"
```

---

## Task 2 — Compat alignment + missed #2 fix

**Goal:** Acceptance criterion 3 — validator catches mismatches between the bootstrap precondition-2 wording and the frontmatter `compat.cli`, and across the two SKILL.md files' compat blocks. Then fix the actual contradiction (`>=0.0.3` text vs `>=0.1.0` frontmatter).

**Files:**
- Modify: `validate.mjs`
- Modify: `skills/bootstrap-design-system/SKILL.md` (line 30)

- [ ] **Step 2.1: Fix the precondition-2 wording in bootstrap (missed #2).**

Edit `skills/bootstrap-design-system/SKILL.md` line 30 — change:

```
2. **`markup-cli` CLI installed.** Used for build, sync-index, check. Recommended (not strictly required) is `>=0.0.3` which has the `bootstrap` sub-commands.
```

to:

```
2. **`markup-cli` CLI installed.** Used for build, sync-index, check. Recommended (not strictly required) is `>=0.1.0` which has the `bootstrap` sub-commands.
```

Rationale: aligns with the frontmatter `compat.cli: ">=0.1.0"`. The frontmatter wins for hard checks.

- [ ] **Step 2.2: Add the compat-alignment validator function to `validate.mjs`.**

Insert after `validateCrossReferences()`:

```js
function parseFrontmatter(raw) {
  if (!raw.startsWith('---\n')) return null;
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) return null;
  return raw.slice(4, end);
}

function extractCompat(frontmatter) {
  const cli = frontmatter.match(/^[ \t]+cli:\s*["']?([^"'\n]+?)["']?\s*$/m);
  const markup = frontmatter.match(/^[ \t]+markup:\s*["']?([^"'\n]+?)["']?\s*$/m);
  return {
    cli: cli ? cli[1].trim() : null,
    markup: markup ? markup[1].trim() : null,
  };
}

function rangeLowerBound(range) {
  // Extracts the lower bound from a `>=X.Y.Z` style range. Returns [maj, min, patch] or null.
  const m = range && range.match(/(?:>=|>|=)?\s*(\d+)\.(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function cmpVersion(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function validateCompatAlignment() {
  const designPath = join(SKILLS_DIR, 'design-feature', 'SKILL.md');
  const bootstrapPath = join(SKILLS_DIR, 'bootstrap-design-system', 'SKILL.md');
  if (!existsSync(designPath) || !existsSync(bootstrapPath)) return;
  const designFm = parseFrontmatter(readFileSync(designPath, 'utf8'));
  const bootstrapRaw = readFileSync(bootstrapPath, 'utf8');
  const bootstrapFm = parseFrontmatter(bootstrapRaw);
  if (!designFm || !bootstrapFm) return;
  const designCompat = extractCompat(designFm);
  const bootstrapCompat = extractCompat(bootstrapFm);
  // 1. Both skills must declare the same compat.cli and compat.markup.
  if (designCompat.cli && bootstrapCompat.cli && designCompat.cli !== bootstrapCompat.cli) {
    issues.push({
      skill: 'cross-cutting',
      message: `compat.cli mismatch: design-feature="${designCompat.cli}" vs bootstrap-design-system="${bootstrapCompat.cli}" — both SKILL.md files must declare the same range`,
    });
  }
  if (designCompat.markup && bootstrapCompat.markup && designCompat.markup !== bootstrapCompat.markup) {
    issues.push({
      skill: 'cross-cutting',
      message: `compat.markup mismatch: design-feature="${designCompat.markup}" vs bootstrap-design-system="${bootstrapCompat.markup}" — both SKILL.md files must declare the same range`,
    });
  }
  // 2. bootstrap precondition 2 wording's version must be >= compat.cli lower bound.
  // The wording lives near the top of the file as "Recommended (not strictly required) is `>=X.Y.Z`".
  const precondMatch = bootstrapRaw.match(/Recommended[^`]*`(>=\s*\d+\.\d+\.\d+)`/);
  if (precondMatch && bootstrapCompat.cli) {
    const precondVer = rangeLowerBound(precondMatch[1]);
    const compatVer = rangeLowerBound(bootstrapCompat.cli);
    if (precondVer && compatVer && cmpVersion(precondVer, compatVer) < 0) {
      issues.push({
        skill: 'bootstrap-design-system',
        message: `precondition 2 wording "${precondMatch[1]}" is below frontmatter compat.cli "${bootstrapCompat.cli}" — raise the precondition text to match the frontmatter (the frontmatter wins for hard checks)`,
      });
    }
  }
}
```

And register the call after `validateCrossReferences()`:

```js
validateCompatAlignment();
```

- [ ] **Step 2.3: Run validator.**

```bash
node validate.mjs
```
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 2.4: Regression: temporarily change bootstrap frontmatter `cli:` to `">=0.2.0"`, verify mismatch fires, then revert.**

- [ ] **Step 2.5: Commit.**

```bash
git add validate.mjs skills/bootstrap-design-system/SKILL.md
git commit -m "feat(validate): align compat ranges across SKILL.md files + fix bootstrap precondition wording (X3, missed #2)"
```

---

## Task 3 — Strategy / framework coverage validator (X3 continuation)

**Goal:** `validate.mjs` confirms every framework named in §0.1 (Step 1 framework table) has ≥1 strategy in `strategies.json`. The "all strategy IDs in §0.3 exist in strategies.json" check is **already done by SP3** (`validateStrategyCrossReferences`) — verify and move on.

**Files:**
- Modify: `validate.mjs`

- [ ] **Step 3.1: Add `validateFrameworkCoverage()` to `validate.mjs`.**

Insert after `validateCompatAlignment()`:

```js
function validateFrameworkCoverage(strategies) {
  if (!strategies || !Array.isArray(strategies.strategies)) return;
  const designPath = join(SKILLS_DIR, 'design-feature', 'SKILL.md');
  if (!existsSync(designPath)) return;
  const skillBody = readFileSync(designPath, 'utf8');
  // §0.1 Step 1 framework table — the rows shaped as `| <code>marker</code> | <framework> |`.
  // The complete canonical set is harvested from the markdown table; we just read the second
  // column. Skip the legend row and the "(nothing above)" row.
  const tableSlice = skillBody.match(/\*\*Step 1 — Framework detection[\s\S]*?\n\n/);
  if (!tableSlice) return;
  const FRAMEWORK_ROW_RE = /\|\s*[^|]+\|\s*`?([a-z]+)`?\s*\|/g;
  const declared = new Set();
  let m;
  while ((m = FRAMEWORK_ROW_RE.exec(tableSlice[0])) !== null) {
    const fw = m[1];
    if (fw === 'Framework' || fw === '---') continue; // header/separator
    if (CANONICAL_FRAMEWORKS.has(fw)) declared.add(fw);
  }
  // `vanilla` is allowed to ship without any strategy in strategies.json — the menu falls back
  // to the framework's bare-baseline entry which IS in strategies.json. We still check it.
  const byFw = new Map();
  for (const s of strategies.strategies) {
    if (!s.framework) continue;
    byFw.set(s.framework, (byFw.get(s.framework) || 0) + 1);
  }
  for (const fw of declared) {
    if (!byFw.has(fw) || byFw.get(fw) === 0) {
      issues.push({
        skill: 'design-feature',
        message: `framework "${fw}" is listed in §0.1 but has zero strategies in templates/strategies.json`,
      });
    }
  }
}
```

And register the call (passing `strategiesData`):

```js
validateFrameworkCoverage(strategiesData);
```

- [ ] **Step 3.2: Run validator.**

```bash
node validate.mjs
```
Expected: `✓ Validated 2 skill(s); no issues.` (Every framework in §0.1 has strategies in `strategies.json`, per the earlier `grep`.)

- [ ] **Step 3.3: Regression — temporarily delete every `solid-*` strategy from `strategies.json` (or mark them with a different framework), verify validator fires `"solid"` framework with zero strategies, revert via `git checkout templates/strategies.json`.**

- [ ] **Step 3.4: Commit.**

```bash
git add validate.mjs
git commit -m "feat(validate): every framework in §0.1 must have ≥1 strategy in strategies.json (X3)"
```

---

## Task 4 — `docs/COMPAT.md` + `--strict` flag adoption (X2 + missed #4)

**Goal:** New `docs/COMPAT.md` documents the versioning policy and the `markup-cli check` severity model. Both SKILL.md files' ~9 gate references gain `--strict`.

**Files:**
- Create: `docs/COMPAT.md`
- Modify: `skills/design-feature/SKILL.md` (7 sites)
- Modify: `skills/bootstrap-design-system/SKILL.md` (2 sites)

- [ ] **Step 4.1: Write `docs/COMPAT.md`.**

```markdown
# design-skills compatibility policy

This document defines the versioning semantics for the `design-feature` and `bootstrap-design-system` skills (collectively, "design-skills"), the rules that govern a breaking change, the deprecation cycle, and the severity model for the `markup-cli check` gates that both skills rely on.

> Both SKILL.md files MUST declare the same `compat.cli` and `compat.markup` ranges in their YAML frontmatter — `validate.mjs` enforces this.

## Semver semantics

design-skills follows semver:

- **Patch** (`x.y.Z`) — bug fixes in the SKILL.md text, validator improvements, doc clarifications. No user-visible behavior change.
- **Minor** (`x.Y.0`) — additive features (new Phase step, new strategy in `strategies.json`, new optional field in a state schema). No required changes for existing consumers.
- **Major** (`X.0.0`) — breaking change (definition below).

## What counts as a breaking change

A change is **breaking** if any of the following hold:

1. Raising the lower bound of `compat.cli` or `compat.markup` in either SKILL.md frontmatter (e.g., `>=0.1.0` → `>=0.2.0`).
2. Removing a strategy ID from `templates/strategies.json` (downstream `strategy.json` files reference these IDs).
3. Bumping the `VERSION` constant in `templates/tweaker.html` (the tweaker JSON payload shape is part of the contract; agents reject `version > VERSION` on paste).
4. Renaming a field in `state.json` / `strategy.json` schemas, or changing the semantic meaning of an existing field. Additive fields are NOT breaking.
5. Removing or renaming a phase, a HARD-GATE clause, or any cross-referenced heading. The `validate.mjs` cross-reference check enforces internal consistency, but external consumers (other plugins, runbooks) may also link to these headings.

## Deprecation cycle

Before a breaking change ships:

- **One minor release** lands the deprecation notice in CHANGELOG + the relevant SKILL.md section (e.g., "DEPRECATED in 0.4.x — removed in 0.5.0: <field>").
- The next major may then remove the deprecated surface.

Exception: security or correctness fixes may bypass the cycle. When that happens, the changelog calls it out and a migration note ships alongside.

## markup-cli check semantics

Throughout both SKILL.md files, gates that read

> `markup-cli check --build`

invoke the `markup-cli` linter. The default exit semantics are:

- **Exit 0** — pass. The gate advances.
- **Non-zero exit** — fail. The gate refuses.
- **Warnings on stderr** — printed but do **not** affect exit code by default. The gate still advances.

For tighter enforcement, both SKILL.md files reference the gate as `markup-cli check --build --strict`. With `--strict`:

- **Exit 0** — pass, with **no** warnings on stderr.
- **Non-zero exit OR any warning on stderr** — fail. The gate refuses.

Both modes are valid. The skill uses `--strict` everywhere as the canonical reference because it removes ambiguity about whether the gate genuinely passed. Consumers may relax to plain `--build` locally during exploratory work, but CI and the documented gates always use `--strict`.

If `markup-cli` is not installed on the current harness, the skill falls back to the manual structural-review prompt printed in-line at the gate site. The `--strict` flag is irrelevant in the fallback.

## Frontmatter compat blocks

Each SKILL.md must declare:

```yaml
compat:
  cli: ">=0.1.0"
  markup: ">=0.2.0"
```

Both ranges use semver `>=` shape (no `^`, no `~`, no exact pin). The lower bound is the oldest CLI / Markup-server version this skill has been verified against. `validate.mjs` enforces that both SKILL.md files declare identical ranges so the two skills can never drift against each other within a release.

## Internal references to this document

`docs/COMPAT.md` is referenced from:

- `skills/design-feature/SKILL.md` — soft-dependency checks (`compat.cli` / `compat.markup` semver compare).
- `skills/bootstrap-design-system/SKILL.md` — precondition 2 (markup-cli install + recommended version).
- `validate.mjs` — the cross-cutting validator implements the rules described above.
```

- [ ] **Step 4.2: Update `skills/design-feature/SKILL.md` gate references to `--strict`.**

Replace each occurrence using `Edit` (one site at a time — context strings will differ). Use replace_all only inside the `Invariants` section where one line contains two occurrences.

Site list (verified via earlier grep):

1. Line 806: `Run \`markup-cli check --build\` — must exit 0.` → `Run \`markup-cli check --build --strict\` — must exit 0.`
2. Line 821: `markup-cli check --build exited 0` → `markup-cli check --build --strict exited 0`
3. Line 870: two occurrences in the same paragraph:
   - `run \`markup-cli check --build\` (or the manual structural review when CLI is absent)` → `run \`markup-cli check --build --strict\` (or the manual structural review when CLI is absent)`
   - `Any task that edits a DS file MUST be followed by \`markup-cli check --build\` in the plan` → `Any task that edits a DS file MUST be followed by \`markup-cli check --build --strict\` in the plan`
4. Line 907: `\`markup-cli check --build\` exited 0` → `\`markup-cli check --build --strict\` exited 0`
5. Line 920: `run \`markup-cli check --build\`; commit.` → `run \`markup-cli check --build --strict\`; commit.`
6. Line 1003: `roda markup-cli check --build).` → `roda markup-cli check --build --strict).`
7. Line 1070: two occurrences:
   - `Always run \`markup-cli check --build\` before declaring Phase 2 done` → `Always run \`markup-cli check --build --strict\` before declaring Phase 2 done`
   - `by \`markup-cli check --build\` as well` → `by \`markup-cli check --build --strict\` as well`

- [ ] **Step 4.3: Update `skills/bootstrap-design-system/SKILL.md` gate references.**

1. Line 255: `After all snapshots, run \`markup-cli check --build\`` → `After all snapshots, run \`markup-cli check --build --strict\``
2. Line 349: `1. **\`markup-cli check --build\`** — must pass.` → `1. **\`markup-cli check --build --strict\`** — must pass.`

- [ ] **Step 4.4: Run validator.**

```bash
node validate.mjs
```
Expected: `✓ Validated 2 skill(s); no issues.` (`--strict` is just an additional argument — the existing `check` command remains in `KNOWN_CLI_COMMANDS`.)

- [ ] **Step 4.5: Verify no `markup-cli check --build` (without `--strict`) remains in the SKILL.md files.**

```bash
grep -nE "markup-cli check --build([^ ]|$)" skills/design-feature/SKILL.md skills/bootstrap-design-system/SKILL.md
```

Expected: zero hits. (The negative-lookahead-ish character class `[^ ]|$` matches anything that isn't a space after `--build` — so it catches the bare form but not `--build --strict`.)

- [ ] **Step 4.6: Commit.**

```bash
git add docs/COMPAT.md skills/design-feature/SKILL.md skills/bootstrap-design-system/SKILL.md
git commit -m "docs(compat): add COMPAT.md + adopt --strict for markup-cli check gates (X2, missed #4)"
```

---

## Task 5 — Codex superpowers install path (X6)

**Goal:** Determine whether `skill-installer` can install `superpowers` on Codex CLI. Update `skills/design-feature/SKILL.md` line 48 accordingly.

**Files:**
- Modify: `skills/design-feature/SKILL.md` (line ~48)

- [ ] **Step 5.1: Research the question.**

Run web searches for:

1. `skill-installer codex obra superpowers install`
2. `Codex CLI install superpowers skill plugin`

Look for: an explicit Codex chat command like `Use skill-installer to install superpowers from obra/superpowers`, or documentation in obra/superpowers' README, or a Codex plugin manifest.

Record findings inline below in this plan (after running the searches):

> *(filled in during execution — see implementation notes after the task is done)*

- [ ] **Step 5.2: Update line 48 of `skills/design-feature/SKILL.md`.**

Current text:

```
- **Codex CLI**: superpowers does not ship a Codex-native plugin; clone the repo and read each SKILL.md from `~/.codex/superpowers/skills/<name>/SKILL.md` when prompted to "invoke" it.
```

If `skill-installer` works on Codex:

```
- **Codex CLI**: preferred — say `Use skill-installer to install superpowers from obra/superpowers` in the Codex chat (the `skill-installer` skill handles the clone + path wiring). Fallback if `skill-installer` is unavailable: clone the repo and read each SKILL.md from `~/.codex/superpowers/skills/<name>/SKILL.md` when prompted to "invoke" it. (Verified 2026-05-23.)
```

If it doesn't, leave the clone-only path but add a `(Verified 2026-05-23 — skill-installer does not yet support Codex.)` note at the end of the line.

- [ ] **Step 5.3: Run validator.**

```bash
node validate.mjs
```
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 5.4: Commit.**

```bash
git add skills/design-feature/SKILL.md
git commit -m "docs(design-feature): re-verify Codex superpowers install path (X6)"
```

---

## Task 6 — Fixture project + smoke test (X4)

**Goal:** A deterministic Phase 0 detection smoke test runs against a fixture `test-fixtures/sample-react-app/` and asserts the produced `strategy.json` matches the expected golden. `npm test` runs validator + smoke test.

**Files:**
- Create: `test-fixtures/sample-react-app/package.json`
- Create: `test-fixtures/sample-react-app/src/components/Button.tsx`
- Create: `test-fixtures/sample-react-app/AGENTS.md`
- Create: `test-fixtures/sample-react-app.expected/strategy.json`
- Create: `scripts/smoke-test.mjs`
- Modify: `package.json` (test script)

- [ ] **Step 6.1: Create fixture `package.json`.**

```json
{
  "name": "sample-react-app",
  "private": true,
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "antd": "^5.18.0",
    "react-hook-form": "^7.51.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 6.2: Create fixture `src/components/Button.tsx`.**

```tsx
import { Button as AntButton } from 'antd';
import type { FC, ReactNode } from 'react';

interface ButtonProps {
  variant?: 'primary' | 'ghost';
  onClick?: () => void;
  children: ReactNode;
}

export const Button: FC<ButtonProps> = ({ variant = 'primary', onClick, children }) => (
  <AntButton type={variant === 'primary' ? 'primary' : 'default'} onClick={onClick}>
    {children}
  </AntButton>
);
```

- [ ] **Step 6.3: Create fixture `AGENTS.md`.**

```markdown
# Sample app — agent guidelines

## UI conventions

- All buttons go through `src/components/Button.tsx` — never use `<button>` directly in pages.
- antd is the visual baseline; `react-hook-form` owns form state.
```

- [ ] **Step 6.4: Create the expected golden `strategy.json`.**

```json
{
  "framework": "react",
  "chosen": "react-antd-rhf",
  "label": "antd visual + react-hook-form",
  "detected": {
    "framework": "react@^18.3.1",
    "uiLibs": ["antd@^5.18.0"],
    "formLibs": ["react-hook-form@^7.51.0"],
    "styling": [],
    "animation": [],
    "icons": []
  },
  "projectRules": {
    "agentRules": {
      "source": "AGENTS.md",
      "summary": "UI conventions"
    }
  },
  "freeText": null,
  "bootstrappedFromEmpty": false,
  "featureRoot": "."
}
```

Note: `chosenAt` and `branchCheck` are intentionally absent — the smoke test asserts only the deterministic fields produced by Phase-0 detection, not the time-stamped or branch-context-dependent ones.

- [ ] **Step 6.5: Write `scripts/smoke-test.mjs`.**

Detection logic mirrors the Phase 0 rules in `skills/design-feature/SKILL.md` §0.1 and §0.3 (read pkg, detect framework + UI/form libs, pick the strategy id whose markers match). The script is intentionally compact — it is a regression harness, not a re-implementation of the skill.

```js
#!/usr/bin/env node
// Deterministic smoke test for the design-feature Phase 0 detection logic.
// Reads test-fixtures/sample-react-app/ and the strategies.json catalog,
// then asserts the computed strategy matches the expected golden.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const fixtureRoot = join(repoRoot, 'test-fixtures/sample-react-app');
const expectedPath = join(repoRoot, 'test-fixtures/sample-react-app.expected/strategy.json');
const strategiesPath = join(repoRoot, 'skills/design-feature/templates/strategies.json');

function fail(msg) {
  console.error(`✗ smoke-test: ${msg}`);
  process.exit(1);
}

if (!existsSync(fixtureRoot)) fail(`fixture missing: ${fixtureRoot}`);
if (!existsSync(expectedPath)) fail(`expected golden missing: ${expectedPath}`);
if (!existsSync(strategiesPath)) fail(`strategies.json missing: ${strategiesPath}`);

const pkg = JSON.parse(readFileSync(join(fixtureRoot, 'package.json'), 'utf8'));
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const strategies = JSON.parse(readFileSync(strategiesPath, 'utf8'));
const expected = JSON.parse(readFileSync(expectedPath, 'utf8'));

// 1. Framework detection (§0.1 step 1, priority order).
const FRAMEWORK_MARKERS = [
  ['@angular/core', 'angular'],
  ['react',         'react'],
  ['vue',           'vue'],
  ['svelte',        'svelte'],
  ['solid-js',      'solid'],
  ['jquery',        'jquery'],
];
let framework = 'vanilla';
for (const [marker, name] of FRAMEWORK_MARKERS) {
  if (marker in deps) { framework = name; break; }
}

// 2. Ecosystem detection (§0.1 step 2, react row only — sufficient for this fixture).
const ECO = {
  react: {
    uiLibs: ['antd', '@radix-ui/react-form', '@mui/material', '@chakra-ui/react', '@mantine/core', 'react-bootstrap', '@headlessui/react'],
    formLibs: ['react-hook-form', 'formik'],
    styling: ['tailwindcss', '@tailwindcss/postcss', '@tailwindcss/vite', '@tailwindcss/cli', 'styled-components', '@emotion/react', 'sass'],
    animation: ['framer-motion', 'motion'],
    icons: ['lucide-react', '@phosphor-icons/react', 'react-icons'],
  },
};
const eco = ECO[framework] || { uiLibs: [], formLibs: [], styling: [], animation: [], icons: [] };
function pick(cat) {
  return cat.filter(name => name in deps).map(name => `${name}@${deps[name]}`);
}
const detected = {
  framework: framework in deps ? `${framework}@${deps[framework]}` : `${framework}@(none)`,
  uiLibs: pick(eco.uiLibs),
  formLibs: pick(eco.formLibs),
  styling: pick(eco.styling),
  animation: pick(eco.animation),
  icons: pick(eco.icons),
};

// 3. Strategy selection — find the entry whose markers.ui ⊆ detected uiLibs AND markers.form ⊆ detected formLibs.
//    Prefer the entry with the most marker coverage (deterministic via array index as tiebreaker).
function bareName(s) { return s.split('@')[0]; }
const detectedUiNames = new Set(detected.uiLibs.map(bareName));
const detectedFormNames = new Set(detected.formLibs.map(bareName));
let best = null;
let bestScore = -1;
for (const s of strategies.strategies) {
  if (s.framework !== framework) continue;
  const ui = s.markers?.ui || [];
  const form = s.markers?.form || [];
  // Skip vanilla baselines unless nothing else matches — they have empty markers
  // by convention and would otherwise win every comparison.
  if (ui.length === 0 && form.length === 0) continue;
  const uiOk = ui.every(m => detectedUiNames.has(m));
  const formOk = form.every(m => detectedFormNames.has(m));
  if (!uiOk || !formOk) continue;
  const score = ui.length + form.length;
  if (score > bestScore) { best = s; bestScore = score; }
}
if (!best) fail('no strategy matched the fixture deps — expected react-antd-rhf');

// 4. Agent rules (§0.2) — first present of AGENTS.md / CLAUDE.md / GEMINI.md.
let agentSource = null;
let agentSummary = '';
for (const f of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) {
  const p = join(fixtureRoot, f);
  if (existsSync(p)) {
    agentSource = f;
    const body = readFileSync(p, 'utf8');
    const headerMatch = body.match(/^##\s+(.+?)$/m);
    if (headerMatch) agentSummary = headerMatch[1].trim();
    break;
  }
}

// 5. Build the actual result and compare against the golden.
const actual = {
  framework,
  chosen: best.id,
  label: best.label,
  detected,
  projectRules: {
    agentRules: { source: agentSource, summary: agentSummary },
  },
  freeText: null,
  bootstrappedFromEmpty: false,
  featureRoot: '.',
};

// Stable JSON for comparison.
const norm = obj => JSON.stringify(obj, Object.keys(obj).sort(), 2);
function deepNorm(v) {
  if (Array.isArray(v)) return v.map(deepNorm);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = deepNorm(v[k]);
    return out;
  }
  return v;
}
const a = JSON.stringify(deepNorm(actual), null, 2);
const e = JSON.stringify(deepNorm(expected), null, 2);
if (a !== e) {
  console.error('✗ smoke-test: detection result does not match the expected golden');
  console.error('--- expected ---');
  console.error(e);
  console.error('--- actual ---');
  console.error(a);
  process.exit(1);
}

console.log('✓ smoke-test: Phase 0 detection produces the expected strategy.json shape (react-antd-rhf).');
```

- [ ] **Step 6.6: Update `package.json` `test` script to run validator + smoke test.**

Replace:

```json
"test": "node validate.mjs",
```

with:

```json
"test": "node validate.mjs && node scripts/smoke-test.mjs",
```

- [ ] **Step 6.7: Run the smoke test.**

```bash
node scripts/smoke-test.mjs
```

Expected: `✓ smoke-test: Phase 0 detection produces the expected strategy.json shape (react-antd-rhf).`

If the output reports a diff, inspect the printed `--- expected ---` / `--- actual ---` blocks and update the expected golden (or the script) until they match. The expected golden is the authoritative shape; the script is the regression harness for changes to `strategies.json`.

- [ ] **Step 6.8: Run `npm test`.**

```bash
npm test
```

Expected: validator passes, then smoke test passes. No errors.

- [ ] **Step 6.9: Commit.**

```bash
git add test-fixtures/ scripts/smoke-test.mjs package.json
git commit -m "feat(test): add Phase 0 detection smoke test + sample-react-app fixture (X4)"
```

---

## Task 7 — Final sanity check

- [ ] **Step 7.1: Verify all acceptance criteria.**

```bash
npm test
grep -c "markup-cli check --build --strict" skills/design-feature/SKILL.md skills/bootstrap-design-system/SKILL.md
grep -nE "markup-cli check --build([^ ]|$)" skills/design-feature/SKILL.md skills/bootstrap-design-system/SKILL.md
ls -la docs/COMPAT.md test-fixtures/sample-react-app/ scripts/smoke-test.mjs
git log --oneline main..HEAD
```

Expected:
- `npm test` exits 0.
- `--strict` count > 0 in both files.
- No bare `markup-cli check --build` remaining.
- All new files present.
- Six commits on top of main (Tasks 1, 2, 3, 4, 5, 6).

- [ ] **Step 7.2: Push and open PR.**

```bash
git push -u origin feat/sp-9-validator-cross-cutting
gh pr create --base main --head feat/sp-9-validator-cross-cutting \
  --title "Sub-plan 9: validator + cross-cutting (X1-X6, missed #2/#4)" \
  --body "$(cat <<'EOF'
## Summary

Implements Sub-plan 9 from the audit-followup roadmap. Validator becomes a real safety net + CI gains a fixture smoke test + the compat policy + `--strict` gate severity are documented.

Issues addressed:
- X1: cross-reference resolution in `validate.mjs` (§ "..." and §N.N)
- X2: new `docs/COMPAT.md` (semver + breaking-change definition + deprecation cycle)
- X3: validator checks framework→strategy coverage + compat alignment across both SKILL.md files
- X4: deterministic Phase 0 detection smoke test against `test-fixtures/sample-react-app/`
- X6: Codex `superpowers` install path re-verified
- missed #2: bootstrap precondition 2 wording realigned with frontmatter `compat.cli`
- missed #4: all `markup-cli check --build` references updated to `--strict`; severity model documented in `docs/COMPAT.md`

Out of scope: X5 (telemetry) deferred; state.json / strategy.json schema changes belong to SP6.

## Test plan

- [ ] `npm test` runs `validate.mjs` + `scripts/smoke-test.mjs`, both exit 0
- [ ] `grep -nE "markup-cli check --build([^ ]|\$)" skills/**/SKILL.md` returns zero hits
- [ ] Temporarily break a cross-reference and confirm the validator catches it
- [ ] Temporarily mismatch `compat.cli` between the two SKILL.md files and confirm the validator catches it
EOF
)"
```

Capture the printed PR URL.

---

## Self-review checklist

- [x] Every acceptance criterion (X1-X4, X6, missed #2, missed #4) maps to a task.
- [x] No placeholders. Every code block is final text.
- [x] X5 (telemetry) is intentionally out of scope per the assignment.
- [x] State.json / strategy.json schema changes are NOT touched (SP6 owns those).
- [x] PT-BR strings only appear in user-facing prompts; internal validator output is English.
- [x] Branch name `feat/sp-9-validator-cross-cutting` is set in P0.
- [x] PR body lists all addressed issues + the test plan.
