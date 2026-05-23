# Sub-plan 5: Phase 0/3 detection + ordering — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline mode). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden Phase 0 detection (monorepo, Tailwind v4, `(none)` thaw, broader agent-rules regex), move the branch check from Phase 3 → Phase 0.2.5 so all state writes land in the right worktree from the start, and gate Phase 3 tech specs on an explicit `DS components touched` section.

**Architecture:** All changes happen in `skills/design-feature/SKILL.md`. No new files. The change is documentation-as-contract — the skill is a markdown instruction set executed by an LLM agent. Validation is `node validate.mjs` (frontmatter/CLI refs/templates) plus targeted greps to confirm the new prose is present.

**Tech Stack:** Markdown, Node 20 (`validate.mjs`), `git`/`gh` for PR.

**Audit issues addressed:** A2 (monorepo detection), A3 (Tailwind v4 markers), A4 (`(none)` thaw on resume), A5 (broader agent-rules regex), D1 (branch-check move), D2 (tech spec DS reference).

---

## File Structure

- **Modify:** `skills/design-feature/SKILL.md` — all six acceptance criteria land here.
  - §0.1 step 1 (~line 135) — monorepo prompt (A2).
  - §0.1 step 2 ecosystem table (~lines 155-163) — Tailwind v4 markers (A3).
  - §0.2 (~line 222) — extended regex + zero-match fallback (A5).
  - **NEW §0.2.5** inserted between §0.2 and §0.3 — branch check (D1).
  - §0.5 (~line 329) — note that state lives in the chosen branch.
  - §0.6 (~line 362) — `(none)` thaw prompt on resume (A4).
  - Old §"Phase 3 → 4 branch check" (~line 768) — replaced with pointer to §0.2.5 (D1).
  - §"Phase 3" step 1 brainstorming seed (~line 756) — `DS components touched` directive (D2).
  - §"Phase 3 gate" (~line 793) — refuse on missing section (D2).
  - §Invariants (~line 932) and §"Resuming an in-flight feature" (~line 980) — light cross-references.

No new templates or sub-skills. No changes to Phase 1, 2, 4, 5, or the bootstrap-design-system skill.

---

## Coordination with PR #5 (open at write time)

PR #5 (Sub-plan 3) edits ONE line in §0.1 step 2 — the `solid` row marker changed `solid-ui` → `@corvu/text-field`. Task 2 below also edits the §0.1 step 2 table. When opening this PR:

1. Run `gh pr view 5 --json state -q .state`.
2. If `OPEN`: add a note in the PR body — *"Potential merge conflict with #5 on §0.1 step 2 solid row marker — preserve the `@corvu/text-field` change from #5 when reconciling"*.
3. If `MERGED`: rebase on `origin/main` first; the SP3 marker change will already be present.

Do **not** attempt to merge or rebase against `feat/sp-3-strategy-ssot` directly. That's the reviewer's call.

---

## Task 1 — A2: Monorepo detection in §0.1 step 1

**Issue:** Today §0.1 reads `package.json` at cwd only. In monorepos (Nx, Turborepo, pnpm workspaces) the cwd often has an empty root `package.json` and the real framework lives in a sub-package. Result: detection silently returns `vanilla` and the user has no chance to point us at the right package.

**Fix:** After reading the cwd `package.json`, glob `**/package.json` depth ≤ 3, exclude `node_modules`. If 2+ matches AND cwd's `package.json` is empty or missing, prompt the user to pick a package directory; treat that subdirectory as the feature root for the rest of detection.

**Files:**
- Modify: `skills/design-feature/SKILL.md` (§0.1, around the line "Read `package.json` at cwd.")

- [ ] **Step 1: Make the edit**

Replace the opening of §0.1 (the line `Read \`package.json\` at cwd. Collect \`dependencies\` + \`devDependencies\` into a single set.`) with the multi-paragraph version below. The new prose comes BEFORE the existing "**Step 1 — Framework detection**" subheader.

Old text to replace (one line):

```
Read `package.json` at cwd. Collect `dependencies` + `devDependencies` into a single set.
```

New text:

```
Read `package.json` at cwd.

**Monorepo check (before collecting deps).** Glob `**/package.json` at cwd with depth ≤ 3, excluding any path under `node_modules/`. On Claude Code: `Glob` tool with `pattern: "**/package.json"` then filter out `node_modules`. On Gemini CLI: `glob` tool. On Codex CLI: native glob.

If the glob returns 2+ matches AND the cwd's `package.json` is missing OR has empty `dependencies` and `devDependencies`, prompt the user (PT-BR):

> Detectei múltiplos `package.json` neste repositório (provavelmente um monorepo). O `package.json` da raiz está vazio/ausente, então não consigo deduzir o framework sozinho. Qual subdiretório é o "feature root" pra essa feature?
>
>   1. `<path-1>` (deps: `<top-3-deps-or-"vazio">`)
>   2. `<path-2>` (deps: `<top-3-deps-or-"vazio">`)
>   …
>   N. `<path-N>` (deps: `<top-3-deps-or-"vazio">`)
>
> Resposta (1-N):

The numbered list enumerates every glob hit, sorted by path depth ascending (shallowest first) then alphabetically. For each entry, read the `package.json` and surface the first 3 keys from `dependencies` (or `"vazio"` if empty) so the user can recognize which package is which.

When the user answers, treat the chosen path's directory as the feature root for the rest of Phase 0: every subsequent file read (`package.json`, agent guidelines, `docs/INDEX.md`, etc.) is relative to that directory, not cwd. Persist the choice into `strategy.json:featureRoot` (relative to repo root) so resume and downstream phases can rebase their reads.

If the glob returns 0 or 1 matches, OR the cwd's `package.json` has non-empty deps, no prompt — the feature root is cwd as before, and `strategy.json:featureRoot` is set to `"."`.

Collect `dependencies` + `devDependencies` from the chosen feature root's `package.json` into a single set.
```

- [ ] **Step 2: Verify with validate**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 3: Verify the prose grep matches**

Run: `grep -n "Monorepo check" skills/design-feature/SKILL.md && grep -n "featureRoot" skills/design-feature/SKILL.md | head -5`
Expected: at least one hit for `Monorepo check`, at least one hit for `featureRoot`.

- [ ] **Step 4: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "feat(design-feature): monorepo detection in Phase 0.1 (A2)"
```

---

## Task 2 — A3: Tailwind v4 markers in §0.1 step 2

**Issue:** Tailwind v4 ships as `@tailwindcss/postcss`, `@tailwindcss/vite`, or `@tailwindcss/cli` — the legacy `tailwindcss` package is no longer required (and on v4 it just points at the CLI). The ecosystem table currently lists only `tailwindcss`, so v4-only projects look like they have no styling lib.

**Fix:** Add `@tailwindcss/postcss`, `@tailwindcss/vite`, `@tailwindcss/cli` to the Styling column of every framework row that already lists `tailwindcss`. After detection, tag the detected Tailwind entry in `strategy.json:detected.styling` with major version: `v3` (legacy `tailwindcss` only) or `v4` (any of the new packages present).

**Files:**
- Modify: `skills/design-feature/SKILL.md` (§0.1 step 2 table + the line right after it about recording versions)

- [ ] **Step 1: Update each row's Styling column**

For each of the 7 framework rows in the §0.1 step 2 ecosystem table, replace `tailwindcss` (in the Styling column) with `tailwindcss`, `@tailwindcss/postcss`, `@tailwindcss/vite`, `@tailwindcss/cli`. The full Styling-column text per row becomes:

- React row: `\`tailwindcss\`, \`@tailwindcss/postcss\`, \`@tailwindcss/vite\`, \`@tailwindcss/cli\`, \`styled-components\`, \`@emotion/*\`, \`sass\`/\`scss\``
- Vue row: `\`tailwindcss\`, \`@tailwindcss/postcss\`, \`@tailwindcss/vite\`, \`@tailwindcss/cli\`, \`sass\`/\`scss\``
- Svelte row: `\`tailwindcss\`, \`@tailwindcss/postcss\`, \`@tailwindcss/vite\`, \`@tailwindcss/cli\`, \`sass\`/\`scss\``
- Angular row: `\`tailwindcss\`, \`@tailwindcss/postcss\`, \`@tailwindcss/vite\`, \`@tailwindcss/cli\`, \`sass\`/\`scss\``
- Solid row: `\`tailwindcss\`, \`@tailwindcss/postcss\`, \`@tailwindcss/vite\`, \`@tailwindcss/cli\`, \`solid-styled-components\``
- jQuery row: `\`bootstrap\`, \`foundation-sites\`, plain CSS, \`sass\`/\`scss\`` — **no change** (jQuery never plays with Tailwind in practice, and adding noise here would harm clarity).
- Vanilla row: `\`tailwindcss\` (se houver), \`@tailwindcss/postcss\`, \`@tailwindcss/vite\`, \`@tailwindcss/cli\`, plain CSS, \`sass\`/\`scss\``

**Important — coordinate with PR #5.** PR #5 also touches §0.1 step 2 (the Solid UI-lib marker changed `solid-ui` → `@corvu/text-field`). Touch only the Styling column on the Solid row; leave the UI-libs column alone so the SP3 change is preserved on rebase.

- [ ] **Step 2: Extend the "Record version strings" line**

Locate the line:

```
Record version strings as printed in `package.json`.
```

(immediately after the table, around line 165). Replace it with:

```
Record version strings as printed in `package.json`. For Tailwind specifically, tag the detected entry in `strategy.json:detected.styling` with a major-version suffix: if any of `@tailwindcss/postcss`, `@tailwindcss/vite`, `@tailwindcss/cli` is present, tag `tailwindcss@v4` (regardless of the version literal — those packages are v4-only). Otherwise, if `tailwindcss@^3.x` or `tailwindcss@~3.x` or any explicit `3.x` is present, tag `tailwindcss@v3`. The version major drives downstream choices in Phase 4 plans (config file location, directive syntax, plugin shape).
```

- [ ] **Step 3: Verify**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

Run: `grep -c "@tailwindcss/postcss" skills/design-feature/SKILL.md`
Expected: at least 6 (5 rows + the version-tagging paragraph).

Run: `grep -n "tailwindcss@v4\|tailwindcss@v3" skills/design-feature/SKILL.md`
Expected: at least one match.

- [ ] **Step 4: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "feat(design-feature): detect Tailwind v4 markers + tag major (A3)"
```

---

## Task 3 — A5: Broader agent-rules regex in §0.2

**Issue:** §0.2 today extracts `AGENTS.md`/`CLAUDE.md`/`GEMINI.md` headers matching `/UI|UX|design|frontend|styling|render/i`. That misses sections titled `Components`, `Component hierarchy`, `Architecture`, `Naming conventions`, all of which routinely carry the UI constraints we need.

**Fix:** Widen the regex to `/UI|UX|design|frontend|styling|render|component|hierarchy|architecture|naming/i`. When zero headers match AND the agent-guidelines file exists, ask the user to volunteer UI conventions before continuing.

**Files:**
- Modify: `skills/design-feature/SKILL.md` (§0.2, around line 222)

- [ ] **Step 1: Update the regex + add fallback prompt**

Replace the entire §0.2 first bullet (the one starting with `**Agent guidelines file**`) with this expanded version:

```
- **Agent guidelines file** — check, in priority order, for `AGENTS.md` → `CLAUDE.md` → `GEMINI.md` at cwd root. Use the **first one present**; ignore the others (their content is usually a copy/symlink). Extract section headers matching `/UI|UX|design|frontend|styling|render|component|hierarchy|architecture|naming/i`. Capture the first 1-2 lines under each matching header for the strategy-prompt context. Don't try to render the whole file — just produce a one-line summary like `"client-side rendering only (AGENTS.md §17)"`, naming whichever file you actually read.

  **Zero-match fallback.** If the chosen agent-guidelines file exists but **no** header matches the regex above, the file probably uses domain-specific names for UI conventions (or doesn't cover UI at all). Don't silently skip — prompt the user (PT-BR):

  > O arquivo `<AGENTS.md|CLAUDE.md|GEMINI.md>` não tem nenhuma seção que claramente cobre convenções de UI/componente. Quer me dizer convenções relevantes antes de continuar? (ex.: *"todos os botões herdam de `<BaseButton>`"*, *"use BEM strict"*, *"ícones só do `lucide-react`"*)
  >
  > Resposta livre (ou "skip" pra continuar sem):

  Capture any non-empty answer under `strategy.json:projectRules.agentRules.userFreeText`. The auto-extracted `summary` stays empty in this branch. `skip` (or empty input) leaves `userFreeText` null and continues.
```

- [ ] **Step 2: Verify**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

Run: `grep -n "hierarchy|architecture|naming" skills/design-feature/SKILL.md`
Expected: at least one match (the new regex line).

Run: `grep -n "Zero-match fallback" skills/design-feature/SKILL.md`
Expected: at least one match.

- [ ] **Step 3: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "feat(design-feature): widen agent-rules regex + zero-match fallback (A5)"
```

---

## Task 4 — D1: Move branch check from Phase 3 → Phase 0.2.5

**Issue:** Today the branch check runs right before Phase 4 (after tech-spec approval). By then we've already written `strategy.json` (Phase 0.5), `state.json` and `tweakerChoices` (Phase 1 approval), the tech-spec (Phase 3 output) — all on the wrong branch. If the user picks worktree (option B), those files don't follow them to the new worktree, and the resume mechanic gets confused. Moving the check to Phase 0.2.5 means every write hits the chosen branch/worktree from the first commit.

**Fix:** Insert a new §0.2.5 between §0.2 and §0.3 carrying the branch-check prompt prose (slightly adapted — `<slug>` doesn't exist yet at Phase 0.2.5 because we don't even know the feature name; the prompt uses `<repo-name>-feature` as a generic worktree suffix and notes that the user will be re-prompted for a real slug after feature scoping). Replace the old §"Phase 3 → 4 branch check" with a one-line pointer to §0.2.5. Update §0.5, §0.6, and Phase 3 gate prose to reflect the new ordering.

**Files:**
- Modify: `skills/design-feature/SKILL.md`
  - Insert new §0.2.5 right after §0.2 (and before §0.3 strategy menu).
  - Replace old §"Phase 3 → 4 branch check" content (around line 768) with a redirect.
  - Update §0.5, §0.6, Phase 3 gate, and the ASCII workflow diagram.

- [ ] **Step 1: Insert §0.2.5**

After §0.2's closing line (the bullet starting `If neither exists → skip silently…`), insert this new section before the `### 0.3 Compose the strategy menu` heading:

```
### 0.2.5 Branch check (moved from Phase 3)

This check runs **before** §0.3 strategy menu so every subsequent write — `strategy.json`, `state.json`, mockups, the DS file, the tech spec, plan, and code — lands on the chosen branch/worktree from the start. Previously this check sat at Phase 3 → 4, which caused state to be born on `main`/`master` and then orphaned if the user picked worktree.

1. Run `git rev-parse --abbrev-ref HEAD` to learn the current branch.
2. Run `git rev-parse --show-toplevel` to learn the repo root and derive `<repo-name>` (basename).
3. Run `git status --porcelain` to detect a dirty tree.
4. **If current branch is `main` or `master`:**

   Print (PT-BR):

   > Você está em `<branch>`. Esta skill grava `strategy.json`, `state.json`, mockups e (mais tarde) tech spec, plano e código. Recomendo não fazer isso direto na branch principal. Escolha:
   >
   > **A**. Criar branch `feature/design-<repo-name>` aqui mesmo
   > **B**. Criar worktree em `../<repo-name>-design/` e executar lá
   > **C**. Seguir mesmo assim na branch atual (não recomendado)
   >
   > [se tree sujo] ⚠ Working tree tem mudanças não commitadas — recomendo commitar ou stashar antes de A/B.

   - **A**: `git checkout -b feature/design-<repo-name>` → continue in same cwd.
   - **B**: prefer invoking the `using-git-worktrees` sub-skill if available — Claude Code: `Skill: superpowers:using-git-worktrees`; Gemini CLI: `activate_skill('superpowers:using-git-worktrees')`; Codex CLI: read `~/.codex/superpowers/skills/using-git-worktrees/SKILL.md` inline. If the sub-skill is unavailable, fall back to direct shell: `git worktree add ../<repo-name>-design -b feature/design-<repo-name>`. Change cwd to the new worktree path before continuing.
   - **C**: continue on current branch, print `Continuando em <branch> — não recomendado.`

5. **If current branch is anything else:** print `Executando em \`<branch>\`. ✓` and continue.

**Why the branch name is generic at this point.** Phase 0.2.5 runs before the user has named the feature (that happens in Phase 1 via `brainstorming`). The branch is named after the repo (`feature/design-<repo-name>`), not the feature, so it's stable across multiple features that share Phase 0 state. Sub-plan 6 (worktree registry) tracks per-feature worktrees with finer-grained naming on top of this base branch.

**Gate.** Subsequent Phase 0 steps (0.3 strategy menu, 0.4 prompt, 0.5 persist, 0.6 resume) and every later phase MUST write into the branch/worktree picked here. Any tool that writes outside of cwd (e.g., absolute paths) must be re-rooted to the chosen worktree.
```

- [ ] **Step 2: Replace old §"Phase 3 → 4 branch check" with a pointer**

Locate the section heading `### Phase 3 → 4 branch check` (around line 768) and the entire numbered block under it (steps 1-5, ending right before `### Phase 3 gate`). Replace the entire block (heading + body) with:

```
### Phase 3 → 4 branch check

**Moved to §0.2.5.** The branch check now runs before §0.3 strategy menu, so every Phase 0+ write lands on the chosen branch/worktree from the start. By the time Phase 3 finishes, the working tree is already on `feature/design-<repo-name>` (option A) or inside the worktree (option B). No re-check is needed here.
```

- [ ] **Step 3: Update the Phase 3 gate prose**

Locate the `### Phase 3 gate` block. The current gate says:

```
<HARD-GATE>
Do NOT invoke writing-plans until BOTH of the following are true:
  - User explicitly approved the tech spec at docs/superpowers/specs/<date>-<slug>-tech-spec.md.
  - Branch check ran: if HEAD was main/master, user picked A/B/C from the branch prompt;
    if A or B, the branch/worktree was created and cwd is in the right place.
</HARD-GATE>
```

Replace the second bullet so the gate references §0.2.5 instead:

```
<HARD-GATE>
Do NOT invoke writing-plans until BOTH of the following are true:
  - User explicitly approved the tech spec at docs/superpowers/specs/<date>-<slug>-tech-spec.md.
  - Branch check from §0.2.5 already ran (it runs at Phase 0, so by Phase 3 this is
    confirmed by checking `strategy.json:branchCheck` is set — see §0.5 schema).
</HARD-GATE>
```

- [ ] **Step 4: Extend §0.5 to record the branch-check outcome**

In §0.5 the example `strategy.json` payload currently does not have a `branchCheck` field. Add one. Locate the example JSON block in §0.5 (starts with `Write \`.markup-design/scratch/strategy.json\`:` and the JSON block right after). Edit the JSON to add `branchCheck` between `bootstrappedFromEmpty` and the closing brace. The closing of the JSON block currently looks like:

```
  "freeText": null,
  "bootstrappedFromEmpty": false
}
```

Replace with:

```
  "freeText": null,
  "bootstrappedFromEmpty": false,
  "branchCheck": {
    "ranAt": "2026-05-21T...",
    "originalBranch": "main",
    "choice": "B",
    "resultingBranch": "feature/design-myrepo",
    "worktreePath": "../myrepo-design"
  }
}
```

Then, right after the JSON block, add a new paragraph:

```
`branchCheck` records the outcome of §0.2.5. `originalBranch` is whatever `git rev-parse --abbrev-ref HEAD` returned at the moment the check ran. `choice` is `A`, `B`, or `C` (the user's pick from the §0.2.5 menu) or `null` if the original branch was already a non-default branch and no prompt was shown. `worktreePath` is `null` when `choice` is `A` or `C`. Phase 3 gate reads `strategy.json:branchCheck` to confirm the check happened.
```

- [ ] **Step 5: Update §0.6 to note that state lives in the chosen branch**

In §0.6 ("Resume mechanic"), after the existing block that handles `bootstrappedFromEmpty`, append a new paragraph (right before the `### 0.7 Phase 0 → Phase 1 gate` heading):

```
**Branch-check reuse.** Because the branch check ran at §0.2.5 (not §3), resume always picks up inside the branch/worktree that the original Phase 0 run chose. If the user has somehow moved out of that branch (e.g., manually checked out `main` mid-feature), prompt: *"O `strategy.json` foi gravado em `<originalBranch-or-worktree>`, mas você está em `<current>`. Volto pra lá ou seguimos aqui?"*. Default: jump back to `branchCheck.resultingBranch` (or `worktreePath` if set).
```

- [ ] **Step 6: Update the ASCII workflow diagram**

Locate the ASCII box `Phase 0: Discovery + framework + strategy`. Its body currently reads:

```
detect package.json + agent rules + docs;
present strategy menu; persist to
.markup-design/scratch/strategy.json
gate: strategy.json has framework + chosen
```

Replace with:

```
detect package.json + agent rules + branch;
present strategy menu; persist to
.markup-design/scratch/strategy.json
gate: strategy.json has framework + chosen
      + branchCheck.ranAt
```

In the Phase 3 box, change the gate line from `gate: tech-spec approved + branch check` to `gate: tech-spec approved + DS components touched`.

- [ ] **Step 7: Update §0.7 Phase 0 → Phase 1 gate**

The gate currently requires `framework` + `chosen` + `freeText` (if custom). Add a `branchCheck.ranAt` clause. Locate the gate block:

```
<HARD-GATE>
Do NOT invoke Phase 1 (brainstorming) until:
  - .markup-design/scratch/strategy.json exists, AND
  - It contains a non-null `framework` field, AND
  - It contains a non-null `chosen` field, AND
  - If `chosen === "custom"`, the `freeText` field is non-empty.
</HARD-GATE>
```

Replace with:

```
<HARD-GATE>
Do NOT invoke Phase 1 (brainstorming) until:
  - .markup-design/scratch/strategy.json exists, AND
  - It contains a non-null `framework` field, AND
  - It contains a non-null `chosen` field, AND
  - If `chosen === "custom"`, the `freeText` field is non-empty, AND
  - It contains a `branchCheck` object with a non-null `ranAt` (proves §0.2.5 ran).
</HARD-GATE>
```

- [ ] **Step 8: Verify**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

Run: `grep -n "0.2.5\|Branch check (moved from Phase 3)" skills/design-feature/SKILL.md`
Expected: matches showing the new §0.2.5 section exists.

Run: `grep -n "Moved to §0.2.5" skills/design-feature/SKILL.md`
Expected: at least one match (the pointer at old location).

Run: `grep -n "branchCheck" skills/design-feature/SKILL.md`
Expected: 4+ matches (schema, Phase 3 gate, §0.6 resume, §0.7 gate).

- [ ] **Step 9: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "feat(design-feature): move branch check from Phase 3 to Phase 0.2.5 (D1)"
```

---

## Task 5 — A4: `(none)` thaw on resume in §0.6

**Issue:** When `bootstrappedFromEmpty === true` (user picked a framework manually in an empty project via §0.1.5), `detected.framework` ends up as `react@(none)` etc. If on a later session the user has actually installed the framework, `detected.framework` is stale — but the resume mechanic just continues. The user has to remember to type `change` to refresh detection.

**Fix:** On resume, when `bootstrappedFromEmpty === true` AND the current `package.json` now has the chosen framework as a real dep, prompt the user to update `detected.framework` from `@(none)` to `@<version>`. Default yes.

**Files:**
- Modify: `skills/design-feature/SKILL.md` (§0.6, around line 362)

- [ ] **Step 1: Insert the thaw prompt into §0.6**

In §0.6, immediately after the existing `bootstrappedFromEmpty === true` pendant paragraph (the one that appends to the saved-strategy line and ends with the example `framework escolhido manualmente em projeto vazio`), insert a new paragraph **before** the bullet list (`sim` / `change` / `inspect`):

```
**Thaw `(none)` when the framework lands in `package.json`.** Still inside §0.6, before printing the `sim / change / inspect` prompt: if `bootstrappedFromEmpty === true`, re-read the feature root's `package.json` (using `strategy.json:featureRoot` if set, otherwise cwd). If the chosen `framework` (e.g., `react`) is now a real `dependencies` or `devDependencies` entry, ask the user (PT-BR):

> Project agora tem `<framework>@<version>` instalado — atualizar `detected.framework` de `@(none)` pra `@<version>`? (S/n)

Default `S` (empty input or `s`/`sim`/`y`/`yes`):
- Update `strategy.json:detected.framework` from `<framework>@(none)` to `<framework>@<version>`.
- Re-run §0.1 step 2 (ecosystem detection) on the now-populated deps so `detected.uiLibs`, `detected.formLibs`, `detected.styling`, etc. get refreshed (the previous values were all `[]` from the empty-project run).
- Leave `bootstrappedFromEmpty: true` as historical context — it's an audit field, not a live flag.
- Print: `✓ detected.framework atualizado pra <framework>@<version>; ecossistema re-detectado (<N> libs encontradas).`

`n` / `no`: skip the thaw, continue with the stale value, print: `Mantendo @(none); rode "change" pra forçar a re-detecção completa.`

If `bootstrappedFromEmpty !== true`, or the chosen framework still isn't installed, skip this prompt entirely.
```

- [ ] **Step 2: Verify**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

Run: `grep -n "Thaw \`(none)\`\|Project agora tem" skills/design-feature/SKILL.md`
Expected: at least 2 matches (the heading and the prompt line).

- [ ] **Step 3: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "feat(design-feature): thaw @(none) on resume when framework installed (A4)"
```

---

## Task 6 — D2: Tech spec MUST contain `## DS components touched`

**Issue:** Phase 3 tech specs today don't explicitly enumerate the DS files the feature reads, edits, or adds. The Phase 4 post-plan checklist (Sub-plan 4, already merged) greps the spec for `docs/design/design-system/` paths — if the spec doesn't list any, that check is silent even when the feature does touch DS files. Worse, the spec author may genuinely not know which DS files matter; making this an explicit section forces the discovery.

**Fix:** Phase 3 step 1 brainstorming seed gets a new directive requiring the spec to contain `## DS components touched`. Phase 3 gate refuses if the section is absent (or, if "none" is claimed, requires a one-line justification).

**Files:**
- Modify: `skills/design-feature/SKILL.md` (§"Phase 3 — Technical brainstorm" step 1 seed + Phase 3 gate)

- [ ] **Step 1: Add the directive to the Phase 3 step 1 brainstorming seed**

Locate Phase 3 step 1 (the bulleted list starting `**Invoke \`brainstorming\`** scoped to *implementation*. Seed it with:`). Add a new top-level bullet after the existing `STRATEGY-CONTEXT` bullet, so the seed list ends with:

```
   - `STRATEGY-CONTEXT`: chosen strategy is `<chosen>` (framework: `<framework>`). Reflect this in arch/data/risks discussion (no custom date pickers if `<framework>`'s lib ships one, etc.).
   - `DS-REFERENCE`: the tech spec MUST contain a `## DS components touched` section listing each DS file under `docs/design/design-system/` that this feature reads, edits, or adds — or explicitly state "none" with a one-line justification (e.g., *"none — this feature is a backend job with no UI surface"*, or *"none — only touches existing components without modifying them"*). The section format is one Markdown list item per file: `- \`docs/design/design-system/NN-<slug>.html\` — <reads | edits | adds> — <one-line why>`. This list feeds the Phase 4 post-plan DS-edit-task check; an empty or missing section makes that check unreliable.
```

- [ ] **Step 2: Update Phase 3 step 2 to also surface the requirement**

Locate Phase 3 step 2 (`**Output:** \`docs/superpowers/specs/<date>-<slug>-tech-spec.md\`. This must NOT re-design UI/UX…`). Append one sentence at the end of that paragraph:

```
**Output:** `docs/superpowers/specs/<date>-<slug>-tech-spec.md`. This must NOT re-design UI/UX — Phase 1 + Phase 2 settled that. If during Phase 3 a technical reality forces a design change, surface it explicitly and confirm with the user before going back to Phase 1. The spec MUST contain a `## DS components touched` section per the `DS-REFERENCE` directive in step 1 — without it, the Phase 3 gate refuses to advance.
```

- [ ] **Step 3: Extend the Phase 3 gate**

Locate the `### Phase 3 gate` block (already edited in Task 4). The current state after Task 4:

```
<HARD-GATE>
Do NOT invoke writing-plans until BOTH of the following are true:
  - User explicitly approved the tech spec at docs/superpowers/specs/<date>-<slug>-tech-spec.md.
  - Branch check from §0.2.5 already ran (it runs at Phase 0, so by Phase 3 this is
    confirmed by checking `strategy.json:branchCheck` is set — see §0.5 schema).
</HARD-GATE>
```

Replace with (third bullet added):

```
<HARD-GATE>
Do NOT invoke writing-plans until ALL of the following are true:
  - User explicitly approved the tech spec at docs/superpowers/specs/<date>-<slug>-tech-spec.md.
  - Branch check from §0.2.5 already ran (it runs at Phase 0, so by Phase 3 this is
    confirmed by checking `strategy.json:branchCheck` is set — see §0.5 schema).
  - The tech spec contains a `## DS components touched` section (case-sensitive header
    match). If the section body is just "none" or "(none)", a one-line justification
    MUST follow on the same line or the next bullet. The gate greps the spec for
    `^##\s+DS components touched\s*$`; missing → refuse with:

      ❌ Tech spec falta seção `## DS components touched`. Adicione a lista (ou
         "none — <razão>") antes de aprovar.
</HARD-GATE>
```

- [ ] **Step 4: Verify**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

Run: `grep -n "DS components touched" skills/design-feature/SKILL.md`
Expected: 3+ matches (seed bullet, step 2 paragraph, gate).

Run: `grep -n "DS-REFERENCE" skills/design-feature/SKILL.md`
Expected: at least 1 match.

- [ ] **Step 5: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "feat(design-feature): require DS components touched section in tech spec (D2)"
```

---

## Task 7 — Final verification + PR

- [ ] **Step 1: Re-run validate once more**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 2: Sanity grep for all six criteria markers**

Run:
```bash
grep -c "Monorepo check" skills/design-feature/SKILL.md         # A2 ≥ 1
grep -c "@tailwindcss/postcss" skills/design-feature/SKILL.md   # A3 ≥ 6
grep -c "Thaw" skills/design-feature/SKILL.md                   # A4 ≥ 1
grep -c "hierarchy|architecture|naming" skills/design-feature/SKILL.md  # A5 ≥ 1
grep -c "0.2.5" skills/design-feature/SKILL.md                  # D1 ≥ 3
grep -c "DS components touched" skills/design-feature/SKILL.md  # D2 ≥ 3
```

Expected: all counts pass the lower bound noted.

- [ ] **Step 3: Push and open PR**

```bash
git push -u origin feat/sp-5-phase03-detection-ordering
```

Check PR #5 state:

```bash
gh pr view 5 --json state -q .state
```

If `OPEN` — include the conflict note in the PR body. If `MERGED` — skip the note.

Open PR with `gh pr create --title "feat(design-feature): Phase 0/3 detection + ordering (Sub-plan 5)" --body "$(cat <<'EOF'
## Summary

Implements Sub-plan 5 from the audit roadmap. Six acceptance criteria:

- **A2** Monorepo detection — Phase 0.1 globs `**/package.json` (depth ≤ 3, excl. `node_modules`); prompts for feature root when cwd `package.json` is empty/missing and 2+ matches exist.
- **A3** Tailwind v4 detection — adds `@tailwindcss/postcss`, `@tailwindcss/vite`, `@tailwindcss/cli` markers to all relevant Styling-column rows; tags detected Tailwind with `v3`/`v4` in `strategy.json:detected.styling`.
- **A4** `(none)` thaw on resume — when `bootstrappedFromEmpty === true` and the framework now appears in `package.json`, prompts the user to update `detected.framework`. Default yes.
- **A5** Broader agent-rules regex — extends `/UI|UX|design|frontend|styling|render/i` to `/…|component|hierarchy|architecture|naming/i`; zero-match fallback prompts the user for free-text conventions.
- **D1** Branch check moved Phase 3 → §0.2.5 — all state writes now land on the chosen branch/worktree from the start. Old location in Phase 3 → 4 left as a pointer to §0.2.5. `strategy.json:branchCheck` records the outcome; §0.7 and Phase 3 gates check it.
- **D2** Tech spec must contain `## DS components touched` — Phase 3 step 1 seed gains `DS-REFERENCE` directive; Phase 3 gate refuses if the section is absent.

## Coordination

<!-- Reviewer note about PR #5 will be added at PR-creation time depending on its state. -->

## Test plan

- [x] `node validate.mjs` passes (frontmatter + CLI references + template presence).
- [x] Grep sweeps confirm each criterion's prose lands at the expected spot.
- [ ] Manual review: branch-check move is the most invasive change; double-check that `strategy.json` and `state.json` writes downstream of §0.2.5 no longer assume `main`/`master` cwd.
- [ ] Manual review: §0.6 thaw prompt does not fire when `bootstrappedFromEmpty !== true`.

EOF
)"`

If PR #5 is open, append the conflict note to the body before pushing.

- [ ] **Step 4: Report back**

Return: branch name, PR URL, acceptance-criteria checklist, files changed, open questions, PR #5 state at push time, time spent.

---

## Self-review checklist

- **Spec coverage.** Each of the six acceptance criteria from Sub-plan 5 maps to a numbered task above: A2 → Task 1, A3 → Task 2, A5 → Task 3, D1 → Task 4, A4 → Task 5, D2 → Task 6. Task 7 is verification + PR.
- **Placeholders.** No `TBD`, `TODO`, `implement later`. Every prose insertion shows the exact text. Every grep shows the exact pattern. Every commit shows the exact message.
- **Type consistency.** `strategy.json:featureRoot` (Task 1), `strategy.json:branchCheck` (Task 4 step 4), `strategy.json:detected.styling` Tailwind tag (Task 2 step 2), `strategy.json:projectRules.agentRules.userFreeText` (Task 3) — all named consistently across the tasks. `bootstrappedFromEmpty` is read but not renamed (existing field). `branchCheck.ranAt` is referenced both in §0.7 gate (Task 4 step 7) and Phase 3 gate (Task 4 step 3).
- **Scope.** No edits outside `skills/design-feature/SKILL.md`. No changes to Phase 1/2/4/5 prose beyond the ASCII diagram's two-line gate label tweaks in Task 4 step 6 (one for Phase 0, one for Phase 3 — both still inside this sub-plan's stated scope of "Phase 0/3 detection + ordering"). No template files touched. No new files created.
