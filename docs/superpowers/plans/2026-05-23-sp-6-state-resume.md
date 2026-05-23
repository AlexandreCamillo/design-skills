# Sub-plan 6: Worktree-aware resume + schema versioning — Implementation Plan

> **For agentic workers:** This plan is executed inline in the parent session (per parent instructions). Steps use checkbox (`- [ ]`) syntax for tracking. Verify with `node validate.mjs` between task groups.

**Goal:** Make state survive worktree moves (G1) and version the JSON schemas so future breaks are detectable and migratable (G2).

**Architecture:**
- Add a per-user worktree registry at `~/.markup-design/registry.json`. `design-feature` writes it on §0.2.5 Option B (worktree) and reads it on skill start to surface in-flight features across worktrees of the current repo.
- Stamp every persisted JSON (`strategy.json`, per-feature `state.json`, new `registry.json`) with `schemaVersion: 1`. Skill reads treat missing `schemaVersion` as `0` and migrate inline with documented defaults.
- Add a compat policy + new `docs/SCHEMA-CHANGELOG.md`. Bumps are reserved for breaking changes; additive fields are documented in the changelog without a bump.

**Tech Stack:** Markdown skill instructions only (no runtime code in this repo — skills are doc contracts). `validate.mjs` is the lint gate.

**Decision on open question (branchCheck location):** `branchCheck` stays in `strategy.json` only. Rationale: the §0.2.5 branch decision is repo-wide and persistent across features (one strategy serves N features in the same worktree). Duplicating it into per-feature `state.json` would create two sources of truth for the same fact. Per-feature `state.json` reads `strategy.json:branchCheck` on resume (already wired by SP5). Documented as a `Rationale:` line in §"State file".

**Out of scope:** Cross-machine sync. Validator changes (SP9 owns `validate.mjs`). Phase 5 schemas — `chromeMcp` was just added by SP2; preserve it byte-for-byte.

---

### Task 1: Add `schemaVersion: 1` to `strategy.json` schema

**Files:**
- Modify: `skills/design-feature/SKILL.md` (§0.5 schema, ~lines 380-410)

- [ ] **Step 1: Edit the §0.5 strategy.json example to add `schemaVersion: 1` as the first field.**

Existing block opens with `"framework": "react",` — prepend `"schemaVersion": 1,` so the example becomes:

```json
{
  "schemaVersion": 1,
  "framework": "react",
  ...
}
```

- [ ] **Step 2: Add a one-sentence schema-version note in the §0.5 prose (right after the example) explaining what `schemaVersion` means and that missing → treated as `0` and migrated inline.**

- [ ] **Step 3: Run `node validate.mjs`** — expect `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 4: Commit.**

```bash
git add skills/design-feature/SKILL.md
git commit -m "feat(design-feature): stamp strategy.json with schemaVersion:1 (SP6 G2)"
```

---

### Task 2: Add `schemaVersion: 1` to per-feature `state.json` schema (design-feature)

**Files:**
- Modify: `skills/design-feature/SKILL.md` (§"State file", ~lines 1079-1141)

- [ ] **Step 1: Edit the §"State file" JSON example to add `"schemaVersion": 1,` as the first field.**

- [ ] **Step 2: Below the example bullets, add a new bullet:**

```
- `schemaVersion`: integer. Currently `1`. Reads treat missing `schemaVersion` as `0` and migrate inline (defaults: `chromeMcp` absent ⇒ resolve via §"Chrome MCP tool resolution"; `qaRun` absent ⇒ `null`). See `docs/SCHEMA-CHANGELOG.md` for the compat policy.
```

- [ ] **Step 3: Run `node validate.mjs`** — expect clean.

- [ ] **Step 4: Commit.**

```bash
git add skills/design-feature/SKILL.md
git commit -m "feat(design-feature): stamp state.json with schemaVersion:1 (SP6 G2)"
```

---

### Task 3: Add `schemaVersion: 1` to bootstrap-design-system `state.json` schema

**Files:**
- Modify: `skills/bootstrap-design-system/SKILL.md` (~lines 396-410)

- [ ] **Step 1: Edit the bootstrap state.json example to add `"schemaVersion": 1,` as the first field.**

- [ ] **Step 2: Add a bullet under the field list:**

```
- `schemaVersion`: integer. Currently `1`. Missing ⇒ treated as `0` and migrated inline. See `docs/SCHEMA-CHANGELOG.md`.
```

- [ ] **Step 3: Run `node validate.mjs`** — expect clean.

- [ ] **Step 4: Commit.**

```bash
git add skills/bootstrap-design-system/SKILL.md
git commit -m "feat(bootstrap-design-system): stamp state.json with schemaVersion:1 (SP6 G2)"
```

---

### Task 4: Document the `branchCheck` location decision in §"State file"

**Files:**
- Modify: `skills/design-feature/SKILL.md` (§"State file" prose, just under the field bullets)

- [ ] **Step 1: Append a short subsection:**

```
**`branchCheck` lives only in `strategy.json`, not `state.json`.** Rationale: the §0.2.5 branch decision is repo-wide and persistent across features (one strategy → N features in the same worktree). Duplicating it per-feature would create two sources of truth for the same fact. Per-feature `state.json` reads `strategy.json:branchCheck` on resume (see §0.6 Branch-check reuse).
```

- [ ] **Step 2: `node validate.mjs`** — expect clean.

- [ ] **Step 3: Commit.**

```bash
git add skills/design-feature/SKILL.md
git commit -m "docs(design-feature): document branchCheck single-source rationale (SP6)"
```

---

### Task 5: Create `docs/SCHEMA-CHANGELOG.md` with the compat policy + initial entry

**Files:**
- Create: `docs/SCHEMA-CHANGELOG.md`

- [ ] **Step 1: Write the changelog with:**

```markdown
# Schema changelog

Tracks changes to the persisted JSON schemas of `design-feature` and `bootstrap-design-system`:

- `strategy.json` (repo-wide, at `.markup-design/scratch/strategy.json`)
- `state.json` (per-feature, at `.markup-design/scratch/<slug>/state.json` for design-feature; per-bootstrap at `.markup-design/bootstrap/state.json`)
- `registry.json` (per-user, at `~/.markup-design/registry.json`)

## Compat policy

- Each file carries a top-level `schemaVersion` integer.
- **Bump** `schemaVersion` only on **breaking** changes: field rename, removal, or semantic shift of an existing field.
- **Do not bump** for additive changes (new optional field). Document them here under "Additive — no bump".
- Skill reads treat **missing** `schemaVersion` as `0` and migrate inline with safe defaults (see field-level docs in each SKILL.md).

## Version 1 (2026-05-23) — Sub-plan 6

Initial versioning. Establishes `schemaVersion: 1` baseline for all three files. Pre-SP6 files (no `schemaVersion`) are treated as version `0` and migrated inline:

- `strategy.json`: `bootstrappedFromEmpty` defaults to `false` when absent; `branchCheck` may be `undefined` for files written before SP5 — Phase 3 gate degrades to "branch check skipped, original branch unknown".
- `state.json` (design-feature): `chromeMcp` absent ⇒ resolve via §"Chrome MCP tool resolution"; `qaRun` absent ⇒ `null`.
- `state.json` (bootstrap): no migration needed (no additive fields pre-SP6).
- `registry.json`: did not exist pre-SP6; treated as empty on first read.

## Additive — no bump

(none yet — log future additive changes here with date + sub-plan reference)
```

- [ ] **Step 2: `node validate.mjs`** — expect clean.

- [ ] **Step 3: Commit.**

```bash
git add docs/SCHEMA-CHANGELOG.md
git commit -m "docs: add SCHEMA-CHANGELOG with compat policy (SP6 G2)"
```

---

### Task 6: Define the worktree registry schema in `design-feature` SKILL.md

**Files:**
- Modify: `skills/design-feature/SKILL.md` (insert a new top-level section `## Worktree registry` between `## State file` and `## Resuming an in-flight feature`)

- [ ] **Step 1: Insert the new section:**

```markdown
## Worktree registry

`~/.markup-design/registry.json` is a per-user index of design worktrees created by §0.2.5 Option B across all repos. It lets the skill surface in-flight features that live in a sibling worktree (the user may have cd'd into the main repo by accident and forgotten that work-in-progress lives next door).

Schema:

```json
{
  "schemaVersion": 1,
  "repos": {
    "/abs/path/to/repo": {
      "worktrees": {
        "<slug>": "/abs/path/to/repo-design"
      }
    }
  }
}
```

- `<slug>` is the basename of the worktree path (typically `<repo-name>-design`). One repo can have multiple entries if the user re-ran §0.2.5 from a different angle, but in practice it's one.
- Missing file or unreadable JSON ⇒ treat as `{ "schemaVersion": 1, "repos": {} }`. Do not crash.
- Missing `schemaVersion` ⇒ migrate inline (treat as version `0`, then bump to `1` on next write). See `docs/SCHEMA-CHANGELOG.md`.

**Write trigger.** §0.2.5 Option B (user picked "criar worktree em ../<repo-name>-design"). After `git worktree add` succeeds and cwd is changed:

1. Read `~/.markup-design/registry.json` (handle missing file).
2. Resolve `<repo-root-abs>` = `git rev-parse --show-toplevel` of the *original* repo (the source of the worktree, not the new worktree itself). The harness's invariant is that worktrees share the same `.git/` parent; the original repo's toplevel is the stable key.
3. Set `repos[<repo-root-abs>].worktrees[<slug>] = <worktree-abs-path>`.
4. Write back with `schemaVersion: 1`.
5. Print (PT-BR): `Registrado worktree em ~/.markup-design/registry.json`.

**Read trigger.** Skill start, alongside the local-cwd resume offer (see §"Resuming an in-flight feature"). For the current repo (`git rev-parse --show-toplevel`):

1. Read `~/.markup-design/registry.json` (handle missing).
2. Look up `repos[<current-repo-toplevel>].worktrees`.
3. For each registered worktree path, check whether `<worktree>/.markup-design/scratch/*/state.json` files exist. List them under a header:

```
Features em outros worktrees deste repo:
  - <slug-a> em <worktree-path> (phase: phase-2-promote)
  - <slug-b> em <worktree-path> (phase: phase-4-execute)

Para retomar uma delas, faça `cd <worktree-path>` e re-invoque a skill.
```

4. If the registry entry points at a path that no longer exists (`!fs.existsSync`), print: `⚠ worktree <path> registrado mas não encontrado — removendo do registry` and prune the entry on next write.

**Why this is per-user, not per-repo.** Multiple repos may share `~/.markup-design/` for cache/registry purposes (consistent with the existing `.markup-design/` per-repo scratch convention — different files, same prefix). The registry is intentionally not under the repo so it survives `rm -rf <repo>`.
```

- [ ] **Step 2: `node validate.mjs`** — expect clean (the section uses nested fenced code; validator should not care, but verify).

- [ ] **Step 3: Commit.**

```bash
git add skills/design-feature/SKILL.md
git commit -m "feat(design-feature): define ~/.markup-design/registry.json worktree registry (SP6 G1)"
```

---

### Task 7: Wire §0.2.5 Option B to write the registry

**Files:**
- Modify: `skills/design-feature/SKILL.md` (§0.2.5 step 4 Option B bullet, ~line 300)

- [ ] **Step 1: Edit Option B's bullet so it ends with a registry-write step:**

Existing:
```
- **B**: prefer invoking the `using-git-worktrees` sub-skill if available — ... If the sub-skill is unavailable, fall back to direct shell: `git worktree add ../<repo-name>-design -b feature/design-<repo-name>`. Change cwd to the new worktree path before continuing.
```

New (append):
```
After `cd` into the new worktree, register it: update `~/.markup-design/registry.json` per the §"Worktree registry" write trigger (set `repos[<original-repo-toplevel>].worktrees[<repo-name>-design] = <new-worktree-abs>`, stamp `schemaVersion: 1`). Print `Registrado worktree em ~/.markup-design/registry.json`.
```

- [ ] **Step 2: `node validate.mjs`** — expect clean.

- [ ] **Step 3: Commit.**

```bash
git add skills/design-feature/SKILL.md
git commit -m "feat(design-feature): §0.2.5 Option B writes worktree registry (SP6 G1)"
```

---

### Task 8: Wire skill start to read the registry alongside the local resume offer

**Files:**
- Modify: `skills/design-feature/SKILL.md` (§"Resuming an in-flight feature", ~lines 1130-1142)

- [ ] **Step 1: Prepend a short subsection at the start of §"Resuming an in-flight feature":**

```markdown
**Cross-worktree resume (G1).** Before listing local `state.json` files, read `~/.markup-design/registry.json` per the §"Worktree registry" read trigger. If the current repo has registered worktrees other than the current cwd, print the "Features em outros worktrees deste repo" block first, then continue with the local-cwd resume offer below. Users in the wrong worktree see the pointer immediately and can `cd` over before answering the resume prompt.
```

- [ ] **Step 2: `node validate.mjs`** — expect clean.

- [ ] **Step 3: Commit.**

```bash
git add skills/design-feature/SKILL.md
git commit -m "feat(design-feature): skill-start reads registry for cross-worktree resume (SP6 G1)"
```

---

### Task 9: Final verification

- [ ] **Step 1: `node validate.mjs`** — expect `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 2: `grep -n "schemaVersion" skills/design-feature/SKILL.md skills/bootstrap-design-system/SKILL.md docs/SCHEMA-CHANGELOG.md`** — confirm three independent stamps (strategy.json, state.json, bootstrap state.json) + changelog references.

- [ ] **Step 3: `grep -n "registry.json\|Worktree registry\|registry" skills/design-feature/SKILL.md`** — confirm registry section + §0.2.5 write hook + §"Resuming" read hook.

- [ ] **Step 4: Push branch `feat/sp-6-state-resume` and open PR.**

---

## Self-review checklist

1. **Spec coverage:**
   - AC1 (registry write + read) → Tasks 6, 7, 8.
   - AC2 (schemaVersion on 3 files + migration) → Tasks 1, 2, 3, plus migration defaults in Task 5.
   - AC3 (compat policy + SCHEMA-CHANGELOG.md) → Task 5.
   - Open question (branchCheck location) → Task 4 documents the decision with rationale.
2. **Placeholder scan:** no TBDs; every step shows exact text to add or exact command to run.
3. **Type consistency:** `schemaVersion` is integer everywhere; registry uses `repos[<abs>].worktrees[<slug>] = <abs>` consistently across schema doc, write trigger, and read trigger.
4. **Scope boundaries respected:** no edits to `validate.mjs` (SP9), no edits to Phase 5 `chromeMcp`/`qaRun` schemas (preserve SP2).
