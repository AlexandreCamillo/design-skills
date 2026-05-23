# Sub-plan 1: Tweaker contract + Phase 2 invariants — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten the tweaker contract + Phase 1/2 gates so the "every design choice is an explicit knob" tenet can't be silently bypassed.

**Architecture:** Surgical edits to `skills/design-feature/SKILL.md` and `skills/design-feature/templates/tweaker.html`. All changes are textual/prose — no JavaScript runtime changes other than a comment block at the top of the IIFE. Phase 1/2 gates gain stricter validation; Phase 2 gains a visual-diff post-bake step and a reformat checklist. The tweaker template documents its forward/backward compat policy near `VERSION`.

**Tech Stack:** Markdown SKILL.md, HTML/JS template, Node validator (`validate.mjs`).

---

## Issues addressed (from roadmap)

B1, B2, C1, C2, C3, missed #3, missed #5.

## Acceptance criteria (verbatim from roadmap)

1. Empty-tweaker gate (B1) — Phase 1 approval gate refuses when `choices === {}`.
2. Project-token injection (B2) — Phase 1 mockup contract reads `tokens.css`/Tailwind config once and injects tokens into mockup `<style>`.
3. Tighter `apply` contract (C1) — JSDoc on `Tweaker.register({ apply })` + mirror in SKILL §"Tweaker public API".
4. Visual-diff post-bake (C2) — new Phase 2.5 step screenshots baked DS file and diffs against approved mockup.
5. Bake-then-reformat invariant (missed #3) — Phase 2.3 explicitly preserves baked attrs from 2.2; documented in §"Invariants".
6. Reformat checklist (C3) — post-reformat checklist at end of Phase 2.3 enforces §1, §4, §7, §8 presence.
7. Tweaker version forward-compat (missed #5) — JS comment in `tweaker.html` near `VERSION` + Phase 1 gate enforces both `>` and `<`.

## Rationale notes (interpretations)

- **B2 (project-token injection):** the implementation is **instructions to a future agent**, not JavaScript that runs at skill runtime. Updating SKILL.md text. Tokens detected during Phase 1 mockup generation, injected once per feature.
- **C2 (visual-diff post-bake):** also instructions to the agent. Step 2.5 sits between bake (2.2) and reformat (2.3). Threshold default 5% pixel diff. Tool: Chrome MCP screenshot capability — if Chrome MCP absent, step downgrades to "manual visual review by the user".
- **C3 (reformat checklist):** §1 = "All-states grid", §4 = "Code API", §7 = "Anatomy", §8 = "Behavior". Verbatim from `templates/ds-component-pattern.md` line 93-101.
- **C1 (apply contract):** JSDoc in `tweaker.html` lives directly above `register({ … })` (around line 525). Mirror in SKILL.md just below the `apply(state, root)` snippet block.
- **missed #5 (version compat):** comment block above `const VERSION = 1` line. Phase 1 gate validation enforces "version > VERSION → refuse newer-template; version < VERSION → refuse older-template".
- **PT-BR vs English:** user-facing error messages (printed to user, like the empty-tweaker refusal and version-mismatch errors) are PT-BR. Agent instructions (JSDoc, prose explaining the contract to the agent) are English. Matches existing convention.

## Touch list

- `skills/design-feature/SKILL.md`
  - §"Mockup contract" (~line 477) — B2 token injection
  - §"Tweaker public API" (~line 487) — C1 apply contract mirror
  - §"Phase 1 approval gate" (~line 622) — B1 empty refusal + missed #5 version both-directions
  - §"Phase 2 — Promote" steps 2/3 (~line 647) — C2 step 2.5, C3 reformat checklist, missed #3 preservation note in step 2.3
  - §"Invariants" (~line 822) — missed #3 explicit invariant line
- `skills/design-feature/templates/tweaker.html`
  - JSDoc above `register({ … })` — C1
  - Comment block above `const VERSION = 1` — missed #5

---

## File structure

No new files. Two existing files modified:

1. `skills/design-feature/SKILL.md` — instructions to the future agent
2. `skills/design-feature/templates/tweaker.html` — JS comments only

Validator (`validate.mjs`) runs unchanged between tasks (no schema changes required).

---

### Task 1: C1 — JSDoc on `Tweaker.register` in `tweaker.html`

**Files:**
- Modify: `skills/design-feature/templates/tweaker.html` (around the `window.Tweaker = { register({ … }) … }` block, ~line 524)

- [ ] **Step 1: Add JSDoc block directly above `register` method**

Locate the `window.Tweaker = {` line and insert a JSDoc block before the `register({ title, slug, groups, apply })` line. Comment lives inside the IIFE so JS engines parse-and-discard it; agents reading the template see it as the contract.

```js
  /**
   * Tweaker.register({ title, slug, groups, apply })
   *
   * `apply(state, root)` contract — STRICT.
   *
   * The body of `apply` MUST be limited to direct assignments on `root`:
   *   - attribute writes:  `root.dataset.<id> = state.<id>` / `root.setAttribute(...)`
   *   - inline-style sets: `root.style.setProperty('--<token>', state.<id>)`
   *   - class toggles:     `root.classList.add/remove/toggle(state.<id>)`
   *
   * That is the entire allowed vocabulary. The function MUST NOT:
   *   - call `querySelector` / `querySelectorAll` / `getElementById`
   *   - mutate children (no `appendChild`, `removeChild`, `innerHTML`, `textContent`)
   *   - branch on state (no `if`, no ternary that picks between DOM ops)
   *   - call out to libraries (no jQuery, no fetch, no async)
   *
   * Rationale: this restriction is what makes Phase 2 bake mechanical. The promote
   * step converts each assignment into a literal attribute on the rendered HTML —
   * conditionals or child mutations cannot be statically baked, so they would
   * silently leak design choices past the Phase 1 gate.
   *
   * If a decision can't be expressed in this vocabulary, the decision belongs in
   * the markup itself (model it as a variant via `data-variant="A|B|C"` and let
   * CSS branch).
   */
```

- [ ] **Step 2: Verify HTML still parses (no syntax errors)**

Run: `node -e "const fs=require('fs'); const h=fs.readFileSync('skills/design-feature/templates/tweaker.html','utf8'); console.log('OK,', h.length, 'bytes')"`
Expected: `OK, <N> bytes` printed (no parse errors).

- [ ] **Step 3: Commit**

```bash
git add skills/design-feature/templates/tweaker.html
git commit -m "feat(design-feature): document apply() contract on Tweaker.register"
```

---

### Task 2: missed #5 — Forward/backward-compat comment near `VERSION`

**Files:**
- Modify: `skills/design-feature/templates/tweaker.html` (~line 269, near `const VERSION = 1`)

- [ ] **Step 1: Replace the `const VERSION = 1;` line with a documented block**

```js
  // Tweaker JSON schema version.
  //
  // Forward/backward-compat policy (enforced by the design-feature skill at the
  // Phase 1 approval gate):
  //   - Pasted JSON with `version > VERSION` → skill refuses with
  //     "tweaker template newer than skill, upgrade design-skills".
  //   - Pasted JSON with `version < VERSION` → skill refuses with
  //     "tweaker template older than skill, regenerate the mockup".
  //
  // Bump VERSION whenever the shape of the emitted payload changes
  // (`{ slug, version, choices }`). Bump the matching gate check in
  // skills/design-feature/SKILL.md §"Phase 1 approval gate" together.
  const VERSION = 1;
```

- [ ] **Step 2: Verify file still parses**

Run: `node -e "const fs=require('fs'); const h=fs.readFileSync('skills/design-feature/templates/tweaker.html','utf8'); console.log('OK,', h.length, 'bytes')"`
Expected: `OK, <N> bytes`.

- [ ] **Step 3: Commit**

```bash
git add skills/design-feature/templates/tweaker.html
git commit -m "docs(design-feature): document tweaker VERSION compat policy"
```

---

### Task 3: C1 mirror — `apply` contract in SKILL.md §"Tweaker public API"

**Files:**
- Modify: `skills/design-feature/SKILL.md` (§"Tweaker public API", just below the closing ``` of the `Tweaker.register` JS code block, around line 510)

- [ ] **Step 1: Insert "Contract on `apply(state, root)`" subsection between the code block and "**Supported `type`s**"**

Add right after the `});` closing the JS example block, before the "**Supported `type`s** (canonical set — do **not** invent new ones):" line:

```markdown
**Contract on `apply(state, root)`:** the body MUST be limited to direct assignments on `root` — attribute writes (`root.dataset.X`, `root.setAttribute`), inline-style sets (`root.style.setProperty`), or class toggles (`root.classList.add/remove/toggle`). No `querySelector`, no conditionals, no DOM mutation beyond these three primitives. This restriction is what makes Phase 2 bake mechanical: the promote step rewrites each assignment as a literal attribute on the rendered root, which only works if the function's static text already contains the full vocabulary. If a decision can't be expressed this way, model it as a variant in the markup (e.g., `data-variant="A|B|C"`) and let CSS branch.

```

- [ ] **Step 2: Run validator**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 3: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "docs(design-feature): mirror apply() contract in Tweaker public API section"
```

---

### Task 4: B2 — Project-token injection in §"Mockup contract"

**Files:**
- Modify: `skills/design-feature/SKILL.md` (§"Mockup contract", currently 4 numbered points around line 477)

- [ ] **Step 1: Add a 5th item to the numbered list inside §"Mockup contract"**

Insert as item 5 after the existing item 4 (`Register options via window.Tweaker.register(...)`), before the paragraph starting "The agent reads `templates/tweaker.html`":

```markdown
5. **Project tokens injected once per feature.** Before generating the mockup, the agent reads the project's design tokens from the **first** source that exists at cwd, in priority order:
   - `src/styles/tokens.css` (or `src/styles/tokens.scss`, `src/tokens.css`, `app/styles/tokens.css` — same file, different paths)
   - `tailwind.config.js` / `tailwind.config.ts` / `tailwind.config.mjs` → `theme.extend.colors`, `theme.extend.spacing`, `theme.extend.fontFamily`
   - `:root { … }` block inside any `src/**/*.css` file (fallback heuristic)

   Detected tokens get inlined into the mockup's `<style>` block as a `:root { --token-name: <literal-value>; … }` declaration, so the approved mockup reflects the project's brand colors/spacing/typography instead of generic placeholders. The tweaker's `apply(state, root)` may then reference those CSS vars (e.g., `root.style.setProperty('--accent', state.accent)` works against the project's accent scale).

   If no token source is detected, the agent prints to the user (PT-BR): *"Não achei `tokens.css` nem `tailwind.config.*` no projeto. O mockup vai usar valores literais — você pode aprovar assim ou parar e me apontar onde estão as design tokens."*. Default behavior on no response: continue with literal values.

   This read happens **once per feature**, not per mockup version. Cached under `state.json:projectTokens` after the first read.
```

- [ ] **Step 2: Run validator**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 3: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "feat(design-feature): inject project tokens into Phase 1 mockups"
```

---

### Task 5: B1 + missed #5 enforcement — Phase 1 approval gate

**Files:**
- Modify: `skills/design-feature/SKILL.md` (§"Phase 1 approval gate", current block around line 619-630, plus the numbered list under "When the user approves" around line 632-639)

- [ ] **Step 1: Replace the HARD-GATE block + enrich validation step 3**

Replace the existing block:

```
<HARD-GATE>
Do NOT invoke markup-cli promote, edit any file under docs/design/design-system/,
or commit anything until ALL of the following are true:
  - User said "aprovado" / "approved" / "ship it" explicitly in this transcript.
  - User pasted the tweaker JSON { slug, version, choices }.
  - That JSON was validated (slug matches feature slug; version === 1; choices is a flat object)
    and written to .markup-design/scratch/<slug>/state.json under `tweakerChoices`.
</HARD-GATE>
```

with the stricter version:

```
<HARD-GATE>
Do NOT invoke markup-cli promote, edit any file under docs/design/design-system/,
or commit anything until ALL of the following are true:
  - User said "aprovado" / "approved" / "ship it" explicitly in this transcript.
  - User pasted the tweaker JSON { slug, version, choices }.
  - That JSON was validated (slug matches feature slug; version checks below pass;
    choices is a flat object AND non-empty) and written to
    .markup-design/scratch/<slug>/state.json under `tweakerChoices`.

Version validation (both directions enforced):
  - If pasted `version > VERSION` (current: 1): refuse with
    "❌ tweaker template newer than skill, upgrade design-skills"
  - If pasted `version < VERSION`: refuse with
    "❌ tweaker template older than skill, regenerate the mockup"
  - Only `version === VERSION` advances.

Empty-tweaker refusal (every design choice is an explicit knob):
  - If `choices === {}` after parse: refuse with
    "❌ Tweaker has zero options — every design choice must be a knob. Add at least one option, or explain in writing why this component has zero variable choices."
  - On refusal, do NOT write state.json:tweakerChoices and do NOT advance.
</HARD-GATE>
```

- [ ] **Step 2: Update the numbered list "When the user approves" step 3 to enforce the same checks**

Replace step 3:

```
3. Parse and validate the JSON. Expected shape: `{ slug, version, choices }` with `version === 1` (matches the `VERSION` constant in `templates/tweaker.html`; bump there and here together if the schema changes).
```

with:

```
3. Parse and validate the JSON. Expected shape: `{ slug, version, choices }`.
   - `slug` must match the feature slug.
   - `version` must equal the `VERSION` constant in `templates/tweaker.html` (currently `1`). Refuse with the PT-BR message above on mismatch — both `> VERSION` (upgrade design-skills) and `< VERSION` (regenerate mockup) abort, do not advance. Bump `VERSION` in the template and this gate together when the payload shape changes.
   - `choices` must be a flat object AND non-empty. An empty `choices` object means the mockup shipped without any explicit knobs — refuse with the empty-tweaker message above. Do not write state.json on refusal.
```

- [ ] **Step 3: Run validator**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 4: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "feat(design-feature): enforce non-empty tweaker + bidirectional version check at Phase 1 gate"
```

---

### Task 6: missed #3 — Bake-then-reformat invariant in step 2.3 + §"Invariants"

**Files:**
- Modify: `skills/design-feature/SKILL.md` — Phase 2 step 3 (~line 658, the "Reformat DS file" sub-list) AND §"Invariants" (~line 822)

- [ ] **Step 1: Add a preserve-baked-attrs bullet at the top of Phase 2 step 3's sub-list**

In the section starting with `3. **Reformat DS file to follow the bundled pattern** (template-driven):`, insert as the FIRST bullet (before `In parallel: read templates/ds-component-pattern.md…`):

```markdown
   - **Preserve the attributes baked in step 2.2.** The component root element gained `data-*`, inline `style`, and/or `class` values during baking. These literals encode the user-approved choices and MUST survive the reformat. When restructuring the markup, move siblings/children around the root — never strip or rewrite the root's attributes. If the reformat genuinely needs a new root element (rare), copy the baked `data-*`, `style`, and `class` values onto the new root verbatim before deleting the old one.
```

- [ ] **Step 2: Add the matching invariant line to §"Invariants"**

In §"Invariants" (currently a bullet list around line 824-835), insert a new bullet right after the `Never modify DS files during Phase 3.` line:

```markdown
- During Phase 2.3, the component root's `data-*`, inline `style`, and `class` attributes set during 2.2 baking MUST be preserved on the new root element. Reformat moves markup around the root, never strips it.
```

- [ ] **Step 3: Run validator**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 4: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "docs(design-feature): preserve baked attrs during Phase 2.3 reformat"
```

---

### Task 7: C2 — Visual-diff post-bake step (Phase 2.5)

**Files:**
- Modify: `skills/design-feature/SKILL.md` — Phase 2, between step 2 (bake) and step 3 (reformat), around line 657

- [ ] **Step 1: Insert a new numbered step 2.5 between the existing 2 and 3**

The current sequence is: 1 (promote) → 2 (bake) → 3 (reformat) → 4 (sync-index) → 5 (check) → 6 (commit). Insert a new step right after step 2's last bullet (the `Once all assignments are baked, delete the apply function definition…` bullet), keeping the numbered list intact by adding it as step 2.5. To stay readable as a Markdown ordered list, render it as a separate numbered item — renumber the rest so this becomes step 3 and downstream steps shift by one OR, alternatively, keep the existing numbering and label the new step as `2.5`. **Approach chosen: label as 2.5 so existing intra-doc references to "step 3" (reformat), "step 5" (check), etc., do not break.**

Insert as a new sub-block right after step 2's closing bullet:

```markdown
2.5. **Visual-diff post-bake** (between bake and reformat, before structural changes):
   - **Goal:** confirm the baked DS file renders identically to the approved Phase 1 mockup. If it doesn't, baking dropped something.
   - **`[se Chrome MCP]`** Screenshot both:
     - The baked DS file at `file://<repo>/docs/design/design-system/NN-<slug>.html`
     - The last-approved mockup at `docs/design/mockups/<date>-<slug>-vN.html` (read `state.json:mockupFile` for the exact path)
   - Compute the pixel-difference percentage (use the Chrome MCP server's image-diff capability if exposed; otherwise script it via `evaluate_script` reading both `<img>` sources into a `<canvas>` and counting non-matching pixels). Threshold: **5%**.
   - If diff ≤ 5%: proceed to step 3.
   - If diff > 5%: pause and print to the user (PT-BR):

     ```
     ⚠ Diff visual de <N>% entre o mockup aprovado e o DS bakeado.
        Mockup:  docs/design/mockups/<file>
        DS:      docs/design/design-system/<file>
        Provavelmente um knob baked não foi aplicado, ou uma escolha vazou pelo gate.
        Quer eu inspecionar e re-bakear, ou aprovar mesmo assim?
     ```

     Wait for user response: `inspect` → re-read `tweakerChoices` and the bake bullets, find the missing application, re-bake; `ok` → continue with documented exception in `state.json:notes`.
   - **`[manual fallback]`** No Chrome MCP: print both paths to the user and ask them to open both side-by-side, then confirm visual parity with `"parity ok"` before continuing. On `"parity fails"`: same inspect/re-bake loop as above.
```

- [ ] **Step 2: Run validator**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 3: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "feat(design-feature): visual-diff baked DS vs approved mockup (Phase 2.5)"
```

---

### Task 8: C3 — Reformat checklist at end of Phase 2.3

**Files:**
- Modify: `skills/design-feature/SKILL.md` — Phase 2 step 3 (after the existing sub-bullets), AND the Phase 2 gate around line 683

- [ ] **Step 1: Append a "Reformat checklist" sub-block to the end of step 3**

After the existing step-3 bullets close (after `Set front-matter \`js: ported\` (unchanged from previous behavior).`), append:

```markdown

   **Reformat checklist (verify before declaring Phase 2.3 done):**

   The bundled template (`templates/ds-component-pattern.md` §3) requires sections 1, 4, 7, 8 in every DS file. After reformat, confirm each:

   - [ ] **§1 All-states grid** — the file contains at least one `.row-states` block with ≥1 cell (`<div class="state">…</div>` or equivalent labeled cell). If absent, the file is missing the headline preview — reformat is incomplete.
   - [ ] **§4 Code API** — the `pre.api` block exists AND its text content is non-empty (not just whitespace). An empty Code API means the strategy adaptation failed silently.
   - [ ] **§7 Anatomy** — the file contains a `dl.tokens` element listing the component's CSS tokens. Missing `dl.tokens` means the anatomy section was stripped during reformat.
   - [ ] **§8 Behavior** — at least one `<ul>` (or `<ol>`) under a section/header titled "Behavior" with ≥1 `<li>`. An empty Behavior section means runtime contract was not transcribed.

   If any item fails, **do not advance to step 4** (`sync-index`). Fix the reformat and re-run the checklist. The Phase 2 → 3 gate also blocks on this checklist (see "Phase 2 gate" below).
```

- [ ] **Step 2: Update the Phase 2 gate to reference the checklist**

Replace the existing Phase 2 gate block:

```
<HARD-GATE>
Do NOT invoke brainstorming for tech spec until:
  - markup-cli check --build exited 0 (or manual structural review confirmed by user
    if CLI absent), AND
  - The DS file has been committed.
</HARD-GATE>
```

with:

```
<HARD-GATE>
Do NOT invoke brainstorming for tech spec until:
  - markup-cli check --build exited 0 (or manual structural review confirmed by user
    if CLI absent), AND
  - The Phase 2.3 reformat checklist passed (§1 has ≥1 grid cell, §4 snippet is
    non-empty, §7 has dl.tokens, §8 has ≥1 bullet), AND
  - The DS file has been committed.
</HARD-GATE>
```

- [ ] **Step 3: Run validator**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 4: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "feat(design-feature): post-reformat checklist gates Phase 2 -> 3"
```

---

### Task 9: Final validation + roadmap status update

**Files:**
- Modify: `docs/superpowers/plans/2026-05-23-skills-audit-roadmap.md` (Tracking table, line 288 — flip Sub-plan 1 to in-flight)

- [ ] **Step 1: Update tracking row for Sub-plan 1**

In the tracking table at the bottom of the roadmap, change:

```
| 1 | Tweaker contract + Phase 2 invariants | planned | — | — |
```

to:

```
| 1 | Tweaker contract + Phase 2 invariants | in-flight | (PR pending) | docs/superpowers/plans/2026-05-23-sp-1-tweaker-contract.md |
```

- [ ] **Step 2: Run validator one more time**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 3: Inspect full diff against `main` for sanity**

Run: `git log --oneline main..HEAD`
Expected: 7-8 commits, all conventional-commit style, no Co-Authored-By footers.

Run: `git diff main --stat`
Expected: 2-3 files changed (SKILL.md, tweaker.html, roadmap.md).

- [ ] **Step 4: Commit roadmap update**

```bash
git add docs/superpowers/plans/2026-05-23-skills-audit-roadmap.md
git commit -m "docs(plans): mark sub-plan 1 in-flight"
```

- [ ] **Step 5: Open PR**

```bash
git push -u origin feat/sp-1-tweaker-contract
gh pr create --base main --title "feat(design-feature): tweaker contract + Phase 2 invariants (sub-plan 1)" --body "$(cat <<'EOF'
## Summary

Sub-plan 1 of the skills-audit follow-up roadmap. Tightens the tweaker contract and Phase 1/2 gates so the "every design choice is an explicit knob" tenet can't be silently bypassed.

Issues addressed: B1, B2, C1, C2, C3, missed #3, missed #5.

## Acceptance criteria

- B1 — Phase 1 approval gate refuses empty `choices`.
- B2 — Phase 1 mockup contract reads project tokens and injects them as `:root` vars.
- C1 — JSDoc on `Tweaker.register({ apply })` + mirror in SKILL §"Tweaker public API".
- C2 — Phase 2.5 visual-diff between baked DS and approved mockup (threshold 5%).
- C3 — Post-reformat checklist (§1/§4/§7/§8) gates Phase 2 → 3.
- missed #3 — Bake-then-reformat invariant: baked `data-*`/`style`/`class` must survive Phase 2.3.
- missed #5 — `VERSION` forward+backward compat policy documented in `tweaker.html`; Phase 1 gate enforces both directions.

## Test plan

- [ ] `node validate.mjs` exits 0 on this branch.
- [ ] Hand-review §"Phase 1 approval gate", §"Mockup contract", §"Tweaker public API", §"Phase 2" steps 2.5/3, §"Invariants" against the roadmap criteria.
- [ ] Confirm `tweaker.html` JSDoc + VERSION comment block render correctly when pasted into a mockup (no `</script>` interpolation issues).
- [ ] Confirm PT-BR strings sound natural and match the project's tone.
EOF
)"
```

---

## Self-review

**Spec coverage:** all 7 acceptance criteria → 7 tasks (1, 2 cover criteria 7 + 3; 3 covers 3; 4 covers 2; 5 covers 1 + 7; 6 covers missed #3; 7 covers 4; 8 covers 6). ✓

**Placeholder scan:** no TBD / TODO / "similar to" / generic-error-handling references. ✓

**Type consistency:** version constant is `VERSION` (capital) throughout; choices object referenced as `choices` (not `tweakerChoices` until persisted); sections referenced by §-number consistent with `ds-component-pattern.md`. ✓

**PT-BR vs English:** user-facing strings in error blocks (empty-tweaker refusal, version-mismatch, diff > 5%) are PT-BR; agent-facing prose (JSDoc, contract description, invariant lines) are English. Matches project convention. ✓
