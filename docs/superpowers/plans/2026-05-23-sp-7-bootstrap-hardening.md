# Sub-plan 7 — bootstrap-design-system hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply six targeted edits (I1–I6) to `skills/bootstrap-design-system/SKILL.md` so the bootstrap workflow has honest expectations, AST-prefer parsing, verbatim source snippets, tier-batched approval gates, mechanical port-status assignment, and an optional inherited-style cherry-pick — matching the Sub-plan 7 entry in `docs/superpowers/plans/2026-05-23-skills-audit-roadmap.md`.

**Architecture:** All changes are confined to a single file (`skills/bootstrap-design-system/SKILL.md`). Each acceptance criterion maps to exactly one task (one logical chunk = one commit). Between tasks we run `node validate.mjs` to confirm the file still passes the skill-validator. Convention: user-facing strings rendered to humans go in PT-BR; instructions written for the agent stay in English (as already established in the file).

**Tech Stack:** Markdown SKILL.md, Node validator (`validate.mjs`), git.

---

## File Structure

Single file changed: `skills/bootstrap-design-system/SKILL.md`.

Sections touched:
- "Manage expectations" block (~line 38–58) — I5
- Step A.1 (~line 132–135) — I1
- Step A.2 inventory preamble (~line 138 area) — I1 (limitation notice)
- Step C.3 (~line 180–183) — I6
- Step C.5 (~line 184–193) — I2
- Step D preamble (~line 196–200) — I3
- Step D body (~line 202–217) — I3 (atom auto-port behavior, batch summary for molecules)
- Step D.5 (~line 218–231) — I4

No other files are modified by this sub-plan.

---

## Task 1: I5 — Drop false-precision estimate in "Manage expectations"

**Files:**
- Modify: `skills/bootstrap-design-system/SKILL.md` — "Manage expectations" block (lines 38–58)

- [ ] **Step 1: Read the current "Manage expectations" block to confirm the exact wording.**

Run: `Read` on `skills/bootstrap-design-system/SKILL.md` lines 38–60.

- [ ] **Step 2: Replace the `~70%/~30%` paragraph with qualitative bullets.**

The current block contains (between the triple-backticks):

```
Bootstrap produces a DRAFT design system from your running app. It is NOT
finished output. Expect ~70% of components to be usable as-is and ~30% to
need manual JS porting (drag-and-drop, virtualized lists, multi-step flows,
async error states are the usual culprits).
```

Replace exactly that paragraph with this PT-BR qualitative version (preserve indentation inside the triple-backtick code block):

```
Bootstrap produces a DRAFT design system from your running app. It is NOT
finished output. What to expect:

  · Atoms (button, icon, spinner, badge) usually port cleanly.
  · Molecules with form inputs port well.
  · Async loading states, drag-and-drop, virtualized lists, and
    multi-step flows typically need manual cleanup.
  · Plan for the unexpected — every project surprises.
```

Use `Edit` with `old_string` being the entire 4-line paragraph (from "Bootstrap produces" through "are the usual culprits)." inclusive) and `new_string` the bullets above.

- [ ] **Step 3: Verify the validator still passes.**

Run: `node validate.mjs`
Expected: exits 0; no "missing" or "invalid" complaints for the bootstrap skill.

- [ ] **Step 4: Commit.**

```bash
git add skills/bootstrap-design-system/SKILL.md
git commit -m "docs(bootstrap-design-system): drop ~70%/~30% false precision (I5)"
```

---

## Task 2: I1 — AST-prefer parsing in Step A.1 + limit notice in inventory preamble

**Files:**
- Modify: `skills/bootstrap-design-system/SKILL.md` — Step A.1 (line ~134) and Step A.2 (line ~138)

- [ ] **Step 1: Re-read Step A so the exact strings are in hand.**

Run: `Read` lines 130–155 of the file.

- [ ] **Step 2: Replace Step A.1's parser sentence.**

Current line (inside the `Parse the file…` bullet):

```
- Parse the file (regex is enough; full AST is overkill) to count props, child elements, conditional branches.
```

Replace with this English agent-facing instruction (this is agent guidance, not user-facing text):

```
- Parse the file to count props, child elements, and conditional branches.
  Prefer an AST when available: if `@typescript-eslint/parser` resolves under
  cwd `node_modules` (for `.tsx`/`.jsx`/`.ts`/`.js` files) or `vue-eslint-parser`
  resolves under cwd `node_modules` (for `.vue` files), use it. Otherwise fall
  back to regex counting — record `parser: "regex-fallback"` in the per-row
  inventory note and print the limit notice (see Step A.2) once at the top of
  `inventory.md`.
```

- [ ] **Step 3: Update Step A.2's inventory.md preamble template to include the regex-fallback notice.**

Current block (inside Step A.2):

```markdown
   # Bootstrap inventory — review and edit

   For each row, set `action` to one of: `keep`, `skip`, `merge:<existing-slug>`.
```

Replace with:

```markdown
   # Bootstrap inventory — review and edit

   For each row, set `action` to one of: `keep`, `skip`, `merge:<existing-slug>`.

   <!-- The preamble below is printed only when at least one row used the
        regex fallback parser; omit it when every row was parsed via AST. -->

   > ⚠ Parser fallback em uso: `@typescript-eslint/parser` (ou
   > `vue-eslint-parser`) não foi encontrado em `node_modules`. As contagens
   > de props, filhos e branches abaixo vêm de heurísticas regex e podem
   > subestimar JSX/template aninhado, spread props, ou ternários encadeados.
   > Instale o parser apropriado e re-rode o Step A pra contagens fiéis.
```

- [ ] **Step 4: Verify the validator still passes.**

Run: `node validate.mjs`
Expected: exits 0.

- [ ] **Step 5: Commit.**

```bash
git add skills/bootstrap-design-system/SKILL.md
git commit -m "feat(bootstrap-design-system): prefer AST parser with regex fallback (I1)"
```

---

## Task 3: I6 — Global-style cherry-pick in Step C.3

**Files:**
- Modify: `skills/bootstrap-design-system/SKILL.md` — Step C.3 (line ~180)

- [ ] **Step 1: Re-read Step C.3 to anchor the edit.**

Run: `Read` lines 174–195.

- [ ] **Step 2: Extend the Step C.3 capture instruction to optionally include `getComputedStyle(document.body)` declarations.**

Current bullet (inside Step C, step 3, `Capture:`):

```
   - **Subtree HTML + Computed CSS in one "run JavaScript" call** (the Chrome MCP server's `javascript_tool` / `evaluate_script` tool) — return a single JSON object `{ html: document.querySelector(selector).outerHTML, styles: <recursive getComputedStyle walk> }`. The two captures are independent; batching saves one Chrome MCP round-trip per component.
```

Replace with (adds the body-style capture as an additional field on the same JS call):

```
   - **Subtree HTML + Computed CSS + Body inherited styles in one "run JavaScript" call** (the Chrome MCP server's `javascript_tool` / `evaluate_script` tool) — return a single JSON object:
     ```js
     {
       html: document.querySelector(selector).outerHTML,
       styles: <recursive getComputedStyle walk on the subtree>,
       bodyInherited: pick(getComputedStyle(document.body), [
         "font-family", "font-size", "line-height", "color",
         "background-color", "font-weight", "letter-spacing", "word-spacing"
       ])
     }
     ```
     The three captures are independent; batching saves Chrome MCP round-trips. The `bodyInherited` block feeds Step C.5's `:root` reset (see below).
```

- [ ] **Step 3: Add a new sub-step "C.3.a" describing how `bodyInherited` is emitted into the DS file's `<style>`.**

Insert immediately after the modified `Capture:` block in Step C, step 3 (before step 4 "CSS rewrite pass"):

```markdown
3a. **Emit `:root` inherited-style reset.** Convert the `bodyInherited` map into a `:root { … }` block at the top of the DS file's `<style>`:

   ```css
   :root {
     font-family: <captured>;
     font-size: <captured>;
     line-height: <captured>;
     color: <captured>;
     background-color: <captured>;
     font-weight: <captured>;
     letter-spacing: <captured>;
     word-spacing: <captured>;
   }
   ```

   This catches **default inheritance** from the running app (so the DS file renders with the same baseline as the live route). It does NOT capture specific overrides on descendant elements — those still need manual cleanup. If a declaration's value is the browser default (e.g., `color: rgb(0, 0, 0)` and the app explicitly sets only one of the eight), prefer to omit that line rather than bake a default into the reset. Document the reset in §7 (Anatomy) with the note: *"baseline herdado capturado do `<body>` da rota fonte; pode precisar de limpeza manual."*
```

- [ ] **Step 4: Verify the validator still passes.**

Run: `node validate.mjs`
Expected: exits 0.

- [ ] **Step 5: Commit.**

```bash
git add skills/bootstrap-design-system/SKILL.md
git commit -m "feat(bootstrap-design-system): cherry-pick inherited body styles into DS :root (I6)"
```

---

## Task 4: I2 — Verbatim source snippet + `<details>` strategy-mismatch note in Step C.5

**Files:**
- Modify: `skills/bootstrap-design-system/SKILL.md` — Step C.5 §4 Code API bullet (line ~187)

- [ ] **Step 1: Re-read Step C.5 to anchor the edit.**

Run: `Read` lines 184–195.

- [ ] **Step 2: Replace the "translate the snippet" bullet with verbatim + `<details>` block instruction.**

Current bullet inside Step C.5:

```
   - §4 Code API: populated with the **original source snippet** read from `src/components/<file>.<ext>`. Format the snippet per the strategy adaptation guide in `templates/ds-component-pattern.md` §6 for the `(framework, chosen)` tuple from `.markup-design/scratch/strategy.json`. If the source uses a different lib than `chosen` requires, **translate the snippet to the chosen strategy** and prepend the comment `// (source uses <X>; chosen strategy is <chosen> — translated example, verify by hand)`.
```

Replace with:

```
   - §4 Code API: populated with the **original source snippet** read from `src/components/<file>.<ext>`, **preserved verbatim** — no library translation, no rewrites. After the verbatim code block, append a `<details>` block that flags the strategy fit. Two cases:

     - **Source library matches the chosen strategy** (e.g., source uses `antd` and `chosen === "react-antd-rhf"`): emit:
       ```html
       <details>
         <summary>Strategy fit</summary>
         <p>Esse snippet usa <code>&lt;source-lib&gt;</code>, que casa com a estratégia atual <code>&lt;chosen&gt;</code>. Pode ser copiado direto em features novas que tocam esse DS.</p>
       </details>
       ```
     - **Source library differs from the chosen strategy** (e.g., source uses `Mantine` but `chosen === "react-antd-rhf"`): emit:
       ```html
       <details>
         <summary>⚠ Strategy mismatch</summary>
         <p>Esse snippet usa <code>&lt;source-lib&gt;</code>. A estratégia escolhida no Phase 0 é <code>&lt;chosen&gt;</code>. Ao implementar features que tocam esse DS, adapte o snippet pra <code>&lt;chosen&gt;</code> seguindo o §6 do template empacotado (<code>templates/ds-component-pattern.md</code>). Não traduza durante o bootstrap — preserve a fonte verbatim pra rastrear de onde veio.</p>
       </details>
       ```

     The verbatim-preserve rule applies even when the source lib is unrecognized (no library detected): emit the first form with `<source-lib>` replaced by the literal string `unknown` and the prose adjusted to *"não foi possível detectar a lib do snippet"*.
```

- [ ] **Step 3: Verify the validator still passes.**

Run: `node validate.mjs`
Expected: exits 0.

- [ ] **Step 4: Commit.**

```bash
git add skills/bootstrap-design-system/SKILL.md
git commit -m "feat(bootstrap-design-system): preserve source snippet verbatim, flag strategy mismatch (I2)"
```

---

## Task 5: I3 — Tier-batched gates in Step D

**Files:**
- Modify: `skills/bootstrap-design-system/SKILL.md` — Step D preamble (line ~196) and Step D step list (line ~202–217)

- [ ] **Step 1: Re-read Step D to anchor the edit.**

Run: `Read` lines 196–235.

- [ ] **Step 2: Replace Step D's "one item at a time with a human gate at the end of each" preamble.**

Current preamble:

```
### Step D — Port JS per item

This is the most labor-intensive step. Process **one item at a time** with a human gate at the end of each.

For each component (in inventory order):
```

Replace with:

```
### Step D — Port JS per item

This is the most labor-intensive step. Process the inventory in **tier order — atoms → molecules → organisms** — with tier-batched approval gates rather than one gate per item. Rationale: atoms are largely mechanical translations and don't merit a stop-the-world prompt each; organisms warrant per-item scrutiny; molecules are the middle case (batched summary).

Gate policy per tier:

| Tier      | Gate                                                                                                                          |
|-----------|-------------------------------------------------------------------------------------------------------------------------------|
| atom      | **Auto-port.** No per-item prompt. The agent flags trouble explicitly (see "Implicit gate" below); only flagged atoms surface to the user. |
| molecule  | **Batch summary review.** After all molecules in the inventory are ported, present a single summary table; user picks `aprovar tudo` or `revisar lista: <slugs>` to drill into a subset.   |
| organism  | **Per-component gate.** Same as before — present delta to user, accept-partial / refine / postpone (mechanical mapping per Step D.5).             |

**Implicit gate (atoms only):** the agent escalates an atom from auto-port to per-item review when any of the following hold:
  - QA pass rate < 100% on the matrix (any row fails).
  - Source file imports a library not covered by the chosen strategy.
  - The source uses any of: `useReducer`, `useContext`, `useImperativeHandle`, `forwardRef`, portals, `useEffect` cleanups with subscriptions.
  - Source file exceeds 150 lines.
Otherwise the atom is silently committed with the QA-derived status (Step D.5).

**Batch summary table (molecules):** after the last molecule, print to the user:

```
Resumo da batelada — molecules (8 items):

  Slug              JS status   Matrix    Notes
  ----------------  ----------  --------  ------------------------------------
  text-input        ported      3/3       —
  search-bar        ported      2/2       —
  dropdown          partial     2/3       hover fires on DS but not live
  ...

aprovar tudo / revisar lista: <slugs separados por espaço>
```

If the user picks `revisar lista`, drop into the per-component organism flow for each named slug.

For each component (in inventory tier order):
```

- [ ] **Step 3: Update the body of Step D to reflect the tier-aware behavior.**

Find the existing numbered list `1. Read the source file.` through `7. Commit each item separately:`. Leave steps 1, 2, 3, 4, 6, 7 verbatim. Replace step 5 (the user-prompt block — full match below) with the new mechanical+tiered version specified in Task 6 (I4). Task 6 handles the rewrite; this task only adds the preamble and tier policy.

Add one sentence at the end of step 7 (before the closing of Step D):

```
For atoms in auto-port, batch the commits — one commit per tier rather than one per slug — using the message `feat(ds): bootstrap port <tier> tier (N items)`. Per-item commits are still required for molecules surfaced via `revisar lista` and for all organisms.
```

- [ ] **Step 4: Verify the validator still passes.**

Run: `node validate.mjs`
Expected: exits 0.

- [ ] **Step 5: Commit.**

```bash
git add skills/bootstrap-design-system/SKILL.md
git commit -m "feat(bootstrap-design-system): tier-batched approval gates in Step D (I3)"
```

---

## Task 6: I4 — Mechanical port-status criterion in Step D.5

**Files:**
- Modify: `skills/bootstrap-design-system/SKILL.md` — Step D.5 (line ~218–231)

- [ ] **Step 1: Re-read Step D.5 to anchor the edit.**

Run: `Read` lines 218–235.

- [ ] **Step 2: Replace Step D.5's user-prompt block with a mechanical mapping + narrowed prompt.**

Current block (Step D step 5):

```
5. **Present the delta to the user:**

   ```
   sidebar:
     ✓ collapse toggle (matrix row "collapsed")
     ✓ item select (matrix row "selected")
     ✗ drag-n-drop (matrix row "reordering"): DS file does not fire 'dragend' that live route fires
        → looks like missing pointer-events plumbing in the port
   ```

   The user picks one of:
   - "accept partial" — front-matter `js: partial`; the gap is documented as a "(custom)" annotation on the matrix row + bullet in §8 of the DS file.
   - "refine" — agent iterates (more `Read` on source, more `Write` on DS file, re-run QA).
   - "postpone" — front-matter stays `js: stub`; the component is shipped as a visual reference only.
```

Replace with:

```
5. **Compute port-status mechanically from QA pass rate, then prompt only for what's left to humans.**

   After the QA run in step 4, compute:

   - `passRate = passingMatrixRows / totalMatrixRows` (where "passing" means visual+state delta within threshold; "matrix absent" is treated as `passRate = 1.0` for purely-visual components — see Step C.5 — so they go straight to `ported`).
   - `attempted = true` once the agent has written non-stub code into `init(...)`. If the agent never attempted a port (matrix not exercised, init still TODO), `attempted = false`.

   Mechanical mapping (no user prompt for the status field itself):

   | Condition                                | Front-matter `js:` value |
   |------------------------------------------|--------------------------|
   | `attempted === false`                    | `stub`                   |
   | `attempted && passRate === 1.0`          | `ported`                 |
   | `attempted && 0 < passRate < 1.0`        | `partial`                |
   | `attempted && passRate === 0`            | `partial` (with a "(custom)" annotation on every matrix row) |

   The agent writes the resulting value into the DS file's front-matter without asking. For atoms in auto-port (Step D tier policy), this assignment is silent and the component is committed in the tier batch. For molecules and organisms, the agent then presents the delta and prompts only:

   ```
   sidebar — passRate = 2/3 = 67% → js: partial

   Próximos passos:
     1. aceitar como partial (committa, segue pra próximo)
     2. refinar agora (mais Read na fonte + Write no DS file + re-roda QA)
     3. adiar (deixa como partial, marca pra revisitar depois — sem refinar)
   ```

   The user picks one of `aceitar`, `refinar`, `adiar`:
   - `aceitar` — commit with the computed `js:` value. The "(custom)" annotations on failing matrix rows + the §8 bullets stay as-is.
   - `refinar` — agent iterates (more `Read` on source, more `Write` on DS file, re-run QA from step 4). After re-QA, recompute `passRate` and re-enter step 5. Status may flip from `partial` to `ported` or stay `partial`.
   - `adiar` — commit with the computed `js:` value. Append `<!-- TODO: bootstrap port follow-up — passRate <X>% -->` at the top of the DS file's `<style>` block so future passes find it. Update inventory `Notes` with "adiado".

   Note: `stub` is no longer a user-selectable outcome — it's the implicit value when no port was attempted (the agent skipped the component entirely from step 1). To opt out of porting a component, the user does so in the inventory (`action: skip` in Step A), not in step 5.
```

- [ ] **Step 3: Verify the validator still passes.**

Run: `node validate.mjs`
Expected: exits 0.

- [ ] **Step 4: Commit.**

```bash
git add skills/bootstrap-design-system/SKILL.md
git commit -m "feat(bootstrap-design-system): mechanical port-status from QA pass rate (I4)"
```

---

## Task 7: Sanity check + PR

**Files:** none

- [ ] **Step 1: Full validator sweep.**

Run: `node validate.mjs`
Expected: exits 0; no warnings about the bootstrap skill.

- [ ] **Step 2: Re-read the whole modified SKILL.md once to confirm the six edits cohere.**

Run: `Read` on `skills/bootstrap-design-system/SKILL.md` (full file). Check:

- "Manage expectations" no longer mentions `~70%/~30%`.
- Step A.1 references `@typescript-eslint/parser` and `vue-eslint-parser`.
- Step A.2 inventory preamble has the regex-fallback notice (conditional).
- Step C.3 captures `bodyInherited` and has step "3a" for `:root` reset.
- Step C.5 §4 Code API preserves snippet verbatim and emits a `<details>` block.
- Step D preamble describes tier-order processing + per-tier gate policy + atom auto-port escalation triggers.
- Step D.5 has the mechanical `passRate` → `js:` mapping and the narrowed `aceitar/refinar/adiar` prompt.

- [ ] **Step 3: Open PR.**

```bash
gh pr create --base main --head feat/sp-7-bootstrap-hardening \
  --title "feat(bootstrap-design-system): sub-plan 7 hardening (I1–I6)" \
  --body "$(cat <<'EOF'
## Summary
- Applies the six Sub-plan 7 acceptance criteria from `docs/superpowers/plans/2026-05-23-skills-audit-roadmap.md` to `skills/bootstrap-design-system/SKILL.md`.
- I1 AST-prefer parsing · I2 verbatim snippet · I3 tier-batched gates · I4 mechanical port-status · I5 honest expectations · I6 inherited-style cherry-pick.

## Acceptance criteria
- [x] I1 — AST-prefer parsing (Step A.1) + regex-fallback notice (Step A.2)
- [x] I2 — Verbatim source snippet + `<details>` strategy-fit block (Step C.5)
- [x] I3 — Tier-batched gates: atoms auto-port (with implicit escalation), molecules batch-summary, organisms per-item (Step D preamble)
- [x] I4 — Mechanical port-status via QA `passRate` mapping; narrowed `aceitar/refinar/adiar` prompt (Step D.5)
- [x] I5 — Replaced `~70%/~30%` with qualitative bullets ("Manage expectations")
- [x] I6 — Optional `bodyInherited` capture into `:root` reset (Step C.3 + 3a)

## Test plan
- [x] `node validate.mjs` passes
- [ ] Reviewer: confirm cross-references to design-feature template (`templates/ds-component-pattern.md` §6) still resolve
EOF
)"
```

- [ ] **Step 4: Print the PR URL.**

`gh pr view --json url --jq .url`

---

## Self-Review

**1. Spec coverage:**
- I1 → Task 2
- I2 → Task 4
- I3 → Task 5
- I4 → Task 6
- I5 → Task 1
- I6 → Task 3
All six covered. No spec gaps.

**2. Placeholder scan:** No "TBD", no "fill in later". Every Edit task carries the exact `old_string` and `new_string` text.

**3. Type consistency:** No code types involved — Markdown only. The `js:` front-matter values (`stub`/`partial`/`ported`) match the existing schema in Step E. The `passRate` formulation is internally consistent across Task 5 and Task 6. The `bodyInherited` key is consistently spelled in Task 3.
