# design-skills audit follow-up — Roadmap

> **For agentic workers:** This is a **master roadmap**, not an executable bite-sized plan. Each sub-plan below MUST be detailed via `superpowers:writing-plans` in its own session before execution. Track sub-plan status (planned / in-flight / merged) inline here as work progresses.

**Goal:** Address the 36 actionable findings from the 2026-05-23 skill-audit second-opinion review (29 valid/partial from the audit + 5 issues the auditor missed; 4 false-positives and unverifiable items deferred).

**Architecture:** Findings cluster into 9 thematic sub-plans across 3 priority tiers. Sub-plans are loosely coupled — order is by impact, not strict dependency. Each sub-plan ships as one PR.

**Tech Stack:** Markdown SKILL.md files, YAML frontmatter, JSON state (`strategy.json`, `state.json`), HTML templates (`tweaker.html`), bundled pattern (`ds-component-pattern.md`), Node validator (`validate.mjs`).

---

## How to read this

Each sub-plan entry has:

- **Issues addressed:** audit IDs (Ax, Bx, …) + missed-issue numbers from the second-opinion review
- **Scope:** what's in / what's out
- **Acceptance criteria:** measurable, verifiable
- **Touch list:** files/sections affected
- **Size:** S (1-2h, ≤200 LOC diff) · M (2-6h, 200-600) · L (6h+, 600+)
- **Dependencies:** sub-plans that must merge first
- **Risk:** semantic risk of breaking existing user flows

---

## Tier 1 — Core integrity (do first)

### Sub-plan 1: Tweaker contract + Phase 2 invariants

**Issues addressed:** B1, B2, C1, C2, C3, missed #3, missed #5

**Scope:** In: tighten the tweaker contract + Phase 1/2 gates so the "every design choice is an explicit knob" tenet can't be silently bypassed. Out: tweaker visual restyling (already done in commit `1e33662`).

**Acceptance criteria:**

1. **Empty-tweaker gate (B1).** Phase 1 approval gate (line ~622) refuses with `❌ Tweaker has zero options — every design choice must be a knob. Add at least one option, or explain in writing why this component has zero variable choices.` if `choices === {}` after validation.
2. **Project-token injection (B2).** Phase 1 mockup contract reads `src/styles/tokens.css` (or `tailwind.config.*`) once per feature and injects detected tokens as `:root { --token-name: value; … }` into the mockup's `<style>` block. The mockup approval thus reflects project-brand colors/spacing.
3. **Tighter `apply` contract (C1).** `templates/tweaker.html` gains a JSDoc on `Tweaker.register({ apply })` stating: *"The `apply(state, root)` body MUST be limited to direct assignments on `root` — attribute (`root.dataset.X`, `root.setAttribute`), inline style (`root.style.setProperty`), or class (`root.classList.add/remove/toggle`). No `querySelector`, no conditionals, no DOM mutation beyond these three primitives. This contract is what makes Phase 2 bake mechanical."* SKILL §"Tweaker public API" mirrors the rule.
4. **Visual-diff post-bake (C2).** Phase 2 gains step 2.5 between bake (2.2) and reformat (2.3): screenshot the baked DS file via Chrome MCP and compare against the last approved Markup screenshot. Diff above a threshold (default 5% pixel difference) flags the agent to inspect.
5. **Bake-then-reformat invariant (missed #3).** Phase 2.3 reformat step explicitly preserves baked attrs from 2.2 — listed in §"Invariants" as: *"During Phase 2.3, the component root's `data-*`, inline `style`, and `class` attributes set during 2.2 baking MUST be preserved on the new root element. Reformat moves markup around the root, never strips it."*
6. **Reformat checklist (C3).** Phase 2.3 ends with a post-reformat checklist the agent verifies before declaring the phase done: §1 has ≥1 grid cell, §4 has non-empty snippet, §7 has `dl.tokens`, §8 has ≥1 bullet. Failures block the Phase 2 → 3 gate.
7. **Tweaker version forward-compat (missed #5).** `templates/tweaker.html` keeps `VERSION` but documents the forward-compat policy in a comment: *"Paste with `version > VERSION` → refuse with 'tweaker template newer than skill, upgrade design-skills'. Paste with `version < VERSION` → refuse with 'tweaker template older than skill, regenerate the mockup'."* Phase 1 gate validation enforces both directions.

**Touch list:**
- `skills/design-feature/SKILL.md`: §"Phase 1 approval gate" (~line 622), §"Tweaker public API" (~line 487), §"Mockup contract" (~line 477), §"Phase 2 — Promote" steps 2/3 (~line 647), §"Invariants" (~line 813)
- `skills/design-feature/templates/tweaker.html`: JSDoc on `register`, version-handling comments

**Size:** M  **Dependencies:** none  **Risk:** medium — empty-tweaker refusal will block users currently shipping mockups with the loophole; release notes must communicate.

---

### Sub-plan 2: Phase 5 QA hardening

**Issues addressed:** F1, F2, F3, F4

**Scope:** In: Phase 5 catches drift the State decision matrix misses + forces diagnosis on the "default: fix code" path. Out: rewriting the matrix format itself.

**Acceptance criteria:**

1. **Automatic state sweep (F1).** Phase 5 gains step 5 after matrix-driven QA: iterate every `[role=button]`, `input`, `select`, `[tabindex]`, `[aria-haspopup]`, `[data-state]`, and trigger hover/focus/click. For each state observed live but missing from the matrix, append a "discovered state" line to the report.
2. **Forced diagnosis (F2).** When a delta is found in either matrix-driven or auto-sweep QA, the agent MUST write a one-line `Cause: …` sentence before choosing "fix code" or "fix DS". Phase 5 prompt enforces this — agent self-prompts before invoking the edit.
3. **Chrome MCP tool resolution (F3).** Skill startup (capability matrix step) resolves Chrome MCP tool names once and stores in `state.json:chromeMcp = { evaluateJs, screenshot, click, hover, focus, type, navigate }`. All Phase 5 step instructions reference `state.json:chromeMcp.X` instead of branching by server name.
4. **Screenshot persistence (F4).** Phase 5 saves all captured screenshots to `.markup-design/qa/<feature-slug>/<YYYY-MM-DD-HHMMSS>/` with names `<scenario>-{live,ds}.png`. The Phase 5 summary printed to the user includes the relative path to the run folder.
5. **`bootstrap-design-system` Step D.4 inherits the same QA contract** — auto-sweep + forced diagnosis + screenshot persistence apply during port QA too.

**Touch list:**
- `skills/design-feature/SKILL.md`: §"Phase 5 — Visual+behavior QA" (~lines 775-815), §"State file" schema (~line 835), Disclaimer template's Chrome MCP line (~line 111)
- `skills/bootstrap-design-system/SKILL.md`: Step D.4 (~line 218)

**Size:** L  **Dependencies:** none  **Risk:** medium — auto-sweep is potentially slow on large components; document an opt-out env var (`MARKUP_QA_SWEEP=0`).

---

## Tier 2 — Drift prevention

### Sub-plan 3: Strategy single-source-of-truth

**Issues addressed:** A1, missed #1

**Scope:** In: collapse the strategy-IDs triple-duplication (SKILL §0.3 menu, template §6 adaptation guide, template §9 canonical snippets) into one machine-readable source. Out: changing menu UX.

**Acceptance criteria:**

1. **New `templates/strategies.json`.** One entry per canonical strategy:
   ```json
   {
     "id": "react-antd-rhf",
     "framework": "react",
     "label": "antd visual + react-hook-form",
     "markers": { "ui": ["antd"], "form": ["react-hook-form"], "exclude": [] },
     "adaptation": "<§6 guidance text or path to fragment file>",
     "canonicalSnippet": "<§9 example snippet, raw HTML>"
   }
   ```
2. **SKILL §0.3 menu reads from JSON.** The hardcoded 41-row table (~lines 237-279) is replaced by a one-paragraph instruction + a pointer to `strategies.json`. Detection logic iterates entries.
3. **Template §6 and §9 generated from JSON** via `node scripts/build-template.mjs` (new). Source file becomes `templates/ds-component-pattern.template.md` with `<!-- INSERT strategies.adaptation -->` and `<!-- INSERT strategies.canonicalSnippet -->` placeholders. Generated `ds-component-pattern.md` is committed (so consumers don't need to run the script).
4. **Validator extension.** `validate.mjs` checks: every entry in `strategies.json` has all required fields; framework values are in the canonical set (`react|vue|svelte|angular|solid|jquery|vanilla|custom`); no duplicate IDs.
5. **Three missing strategies added during this work:** `react-shadcn-tailwind`, `vue-antdv-rhf`, `solid-corvu-tailwind`. The speculative `solid-ui` entry (currently in detection markers) is removed or replaced.

**Touch list:**
- New: `templates/strategies.json`, `scripts/build-template.mjs`, `templates/ds-component-pattern.template.md`
- `skills/design-feature/SKILL.md`: §0.3 (~lines 237-279)
- `templates/ds-component-pattern.md` (regenerated)
- `validate.mjs`, `package.json` scripts

**Size:** L  **Dependencies:** none  **Risk:** medium — template build step adds maintenance overhead; mitigated by keeping generated file in repo.

---

### Sub-plan 4: Phase 4 enforcement (DS tasks + TDD)

**Issues addressed:** E1, E2, E3

**Scope:** In: Phase 4 acquires concrete validators for DS-task presence and test-task ordering. Out: replacing `writing-plans` or `superpowers` TDD machinery.

**Acceptance criteria:**

1. **Post-plan checklist.** After `writing-plans` returns, Phase 4 runs a programmatic check:
   - If tech spec mentioned any path under `docs/design/design-system/`, the plan must contain ≥1 task whose `Files:` block edits that path. Else flag with "DS files referenced in spec but no DS-edit task in plan — confirm or revise."
   - Plan must contain ≥1 task whose step descriptions match `/test|spec/i` BEFORE any task whose `Files:` block touches `src/`. Else flag "Test tasks must precede implementation tasks (TDD)."
2. **Phase 4 gate.** Updated to add: "no test-task-precedence violation flagged."
3. **New §"Phase 4 — DS edit scope rule".** Documents the criterion: *adding a new variant or new state in Phase 4 = OK; changing visual treatment of an existing variant = roll back to Phase 1 (re-mockup, re-bake).* Two examples each, with the heuristic *"if the change affects what a user would have approved in Phase 1, it goes back to Phase 1."*

**Touch list:**
- `skills/design-feature/SKILL.md`: §"Phase 4 — Plan + execute" (~lines 735-761), §"Phase 4 gate" (updated), new subsection "Phase 4 — DS edit scope rule" between Phase 4 and Phase 5

**Size:** M  **Dependencies:** none  **Risk:** low

---

### Sub-plan 5: Phase 0/3 detection + ordering

**Issues addressed:** A2, A3, A4, A5, D1, D2

**Scope:** In: detection robustness + earlier branch check. Out: rewriting Phase 0 from scratch.

**Acceptance criteria:**

1. **Monorepo detection (A2).** §0.1 step 1: glob `**/package.json` up to depth 3, excluding `node_modules`. If 2+ matches AND cwd's `package.json` is empty/missing, prompt the user to pick which package directory to treat as the feature's root.
2. **Tailwind v4 detection (A3).** §0.1 step 2 ecosystem detection adds `@tailwindcss/postcss`, `@tailwindcss/vite`, `@tailwindcss/cli` as v4 markers across all framework rows. Detected Tailwind is tagged with major version (`v3` / `v4`) in `detected.styling`.
3. **`(none)` thaw on resume (A4).** §0.6 resume path: when `bootstrappedFromEmpty === true` and `package.json` now has the chosen framework as a real dep, prompt *"Project agora tem `<framework>@<version>` instalado — atualizar `detected.framework` de `@(none)` pra `@<version>`?"*. Default yes.
4. **Broader agent-rules regex (A5).** §0.2 header regex extended to `/UI|UX|design|frontend|styling|render|component|hierarchy|architecture|naming/i`. If zero matches AND the agent-guidelines file exists, print *"O arquivo `<AGENTS.md|CLAUDE.md|GEMINI.md>` não tem nenhuma seção que claramente cobre convenções de UI/componente. Quer me dizer convenções relevantes antes de continuar? (ex.: 'todos os botões herdam de `<BaseButton>`', 'use BEM strict')."*.
5. **Earlier branch check (D1).** Move §"Phase 3 → 4 branch check" from after the tech-spec approval to a new §"Phase 0.2.5 — Branch check" that runs after agent-rules detection and before §0.3 strategy menu. All subsequent state writes (`strategy.json`, `state.json`, tech spec) happen in the chosen branch/worktree from the start.
6. **Tech spec enforces DS reference (D2).** Phase 3.1 brainstorming seed gains: *"the tech spec MUST contain a `## DS components touched` section listing each DS file under `docs/design/design-system/` that this feature reads, edits, or adds — or explicitly state 'none' with a one-line justification."*. Phase 3 gate refuses if the section is absent.

**Touch list:**
- `skills/design-feature/SKILL.md`: §0.1 step 1 (~line 135), step 2 all framework rows (~lines 156-162), §0.2 (~line 222), §0.6 (~line 378), branch-check section (move + edit), §"Phase 3 → 4 branch check" (now empty/redirect), §"Phase 3 — Technical brainstorm" (~lines 700-720), §"Phase 3 gate" (~line 728)

**Size:** L  **Dependencies:** none  **Risk:** medium — branch-check move alters user-visible flow; document in release notes.

---

## Tier 3 — Ops, polish, robustness

### Sub-plan 6: Worktree-aware resume + schema versioning

**Issues addressed:** G1, G2

**Scope:** In: state survives worktree moves; schemas are versioned. Out: cross-machine sync.

**Acceptance criteria:**

1. **Worktree registry (G1).** New file `~/.markup-design/registry.json`:
   ```json
   { "repos": { "<absolute-repo-path>": { "worktrees": { "<slug>": "<worktree-abs-path>" } } } }
   ```
   Skill writes on Phase 0.2.5 branch choice (option B); reads on skill start and prints in-flight features across all worktrees for the current repo.
2. **Schema versioning (G2).** Add `schemaVersion: 1` to `strategy.json` (top-level), `state.json` (per-feature), and the new `registry.json`. Skill reads handle missing `schemaVersion` as `0` and migrate inline (e.g., `bootstrappedFromEmpty` defaults to `false` when absent).
3. **Compat note in §"State file"** documents the policy: bump `schemaVersion` only on breaking changes (field rename, semantic shift); additive fields don't require a bump but should be documented in `docs/SCHEMA-CHANGELOG.md`.

**Touch list:**
- `skills/design-feature/SKILL.md`: §"State file" (~lines 825-867), new §"Cross-worktree resume"
- `skills/bootstrap-design-system/SKILL.md`: schema docs (~lines 283-305)
- New: `docs/SCHEMA-CHANGELOG.md`

**Size:** M  **Dependencies:** Sub-plan 5 (branch check moves first, then registry writes happen at the right step)  **Risk:** low

---

### Sub-plan 7: bootstrap-design-system hardening

**Issues addressed:** I1, I2, I3, I4, I5, I6

**Scope:** In: 6 specific bootstrap fixes. Out: rewriting inventory format or routing.

**Acceptance criteria:**

1. **AST-prefer parsing (I1).** Step A.1: if `@typescript-eslint/parser` or `vue-eslint-parser` is resolvable in cwd `node_modules`, use it for prop-count and conditional-branch counting. Else fall back to regex with a printed limit notice in the inventory.md preamble.
2. **Verbatim source snippet (I2).** Step C.5: source snippet is preserved **verbatim** in the §4 Code API block. The strategy-adaptation note is appended as a `<details>` block below: *"This snippet uses `<source-lib>`. The DS strategy is `<chosen>`. When implementing features that touch this DS, adapt the snippet to `<chosen>` per §6 of the bundled template."*. No automatic translation.
3. **Tier-batched gates (I3).** Step D processes the inventory in tier order: atoms → molecules → organisms. Atoms auto-port unless flagged for review. Molecules show a batch summary review (approve-all / revise-list). Organisms keep the per-component gate.
4. **Mechanical port-status criterion (I4).** Step D.5 documents: `ported` = 100% of matrix rows pass QA OR matrix is absent (component is purely visual); `partial` = 1-99% of matrix rows pass; `stub` = no port attempted (Step D5.c "postpone"). User-decision wording in the prompt narrows to either "accept partial" (which auto-computes pass rate and updates front-matter accordingly) or "refine" or "postpone".
5. **Drop false-precision estimate (I5).** "Manage expectations" block (~line 40) replaces `~70%/~30%` with qualitative bullets: *"Atoms (button, icon, spinner, badge) usually port cleanly. Molecules with form inputs port well. Async loading states, drag-and-drop, virtualized lists, multi-step flows typically need manual cleanup. Plan for the unexpected — every project surprises."*.
6. **Global-style cherry-pick (I6).** Step C.3 optionally captures `getComputedStyle(document.body)` and copies the 8-10 most inherited declarations (font-family, font-size, line-height, color, background-color, font-weight, letter-spacing, word-spacing) into a `:root` reset block at the top of the DS file's `<style>`. Documented as: "may need manual cleanup — this catches default inheritance, not specific overrides."

**Touch list:**
- `skills/bootstrap-design-system/SKILL.md`: §"Manage expectations" (~line 40), Step A.1 (~line 134), Step C.3 + C.5 (~lines 180-187), Step D.5 (~lines 218-231)

**Size:** L  **Dependencies:** none  **Risk:** low

---

### Sub-plan 8: User-facing copy + iteration ergonomics

**Issues addressed:** B3, B4, H1, H2

**Scope:** In: PT-BR consistency + 2 ergonomic improvements. Out: i18n framework, full disclaimer redesign (deferred — H3 unverifiable per audit).

**Acceptance criteria:**

1. **PT-BR audit (H1).** All user-facing strings in both SKILL.md files (printed-to-user blocks, prompts, error messages) are standardized to PT-BR. Internal instructions to the agent remain English. New convention documented at top of each SKILL.md.
2. **"Outro" disambiguation (H2).** §0.1.5 option 8 renamed `"Outro stack"`; §0.4 strategy menu's free-text option renamed `"Outra estratégia"`. Audit trail in `strategy.json` preserved.
3. **Configurable tunnel timeout (B3).** Cloudflare quick-tunnel polling reads `MARKUP_TUNNEL_TIMEOUT_MS` env var (default 15000). On timeout, prompt the user: *"Tunnel não respondeu em <N>s. retry / skip / use localhost? (default: localhost)"* instead of silent fallback.
4. **Multi-component note (B4).** New short §"Multi-component features" in Phase 1: *"O tweaker é vinculado a um `data-ds-component` único. Se sua feature combina N componentes (filtro + lista, sidebar + main, etc.), trate como N features encadeadas — uma passada do skill por componente, na ordem em que dependem. O tech spec da Phase 3 amarra a integração entre eles."*

**Touch list:**
- `skills/design-feature/SKILL.md`: convention note at top, §0.1.5 option 8 (~line 191), §0.4 menu (~line 297), Phase 1 hosting (tunnel section ~line 600), new §"Multi-component features" (between §"Tweaker public API" and §"Phase 1 hosting")
- `skills/bootstrap-design-system/SKILL.md`: user-facing strings audit

**Size:** M  **Dependencies:** none  **Risk:** low

---

### Sub-plan 9: Validator + cross-cutting

**Issues addressed:** X1, X2, X3, X4, X6, missed #2, missed #4

**Scope:** In: validator becomes a real safety net; CI gains fixture run; compat policy + Codex install instructions modernized. Out: telemetry (X5 deferred — unverifiable per audit, needs separate consent design).

**Acceptance criteria:**

1. **Cross-reference resolution (X1).** `validate.mjs` parses both SKILL.md files for cross-references like "See § '…'" and confirms each title exists as a heading. Broken references fail validation.
2. **Compat policy doc (X2).** New `docs/COMPAT.md` documents the versioning policy: semver, what counts as a breaking change (frontmatter `compat.cli` raise, removal of a strategy ID, etc.), deprecation cycle (one minor before raise).
3. **Validator additions (X3 + missed #2).** `validate.mjs` checks:
   - All strategy IDs referenced in `SKILL.md §0.3` exist in `strategies.json` (depends on Sub-plan 3).
   - Every framework listed in §0.1 has ≥1 strategy in `strategies.json`.
   - `bootstrap-design-system` precondition 2 wording's version (currently `>=0.0.3`) is ≥ frontmatter `compat.cli` (currently `>=0.1.0`); if mismatched, fail validation with a fix suggestion.
   - Both SKILL.md files' frontmatter `compat.cli` and `compat.markup` are identical.
4. **Fixture test (X4).** New `test-fixtures/sample-react-app/` with minimal `package.json` (React + antd + react-hook-form) + `src/components/Button.tsx` + `AGENTS.md`. New `scripts/smoke-test.mjs` runs a deterministic Phase 0 against the fixture (no LLM — just the detection logic) and asserts the resulting `strategy.json` matches `test-fixtures/sample-react-app.expected/strategy.json`. `npm test` runs both `validate.mjs` AND `smoke-test.mjs`.
5. **Codex superpowers install re-verified (X6).** Confirm whether `skill-installer` can install `superpowers` itself via the Codex chat command (`Use skill-installer to install superpowers from obra/superpowers`). If yes: update `skills/design-feature/SKILL.md` line 48 to recommend that path with clone as fallback. If no: leave as-is with a note that this was verified.
6. **`markup-cli check --build` severity (missed #4).** New §"markup-cli check semantics" in `docs/COMPAT.md` documenting: gates treat exit-0 as pass; warnings (stderr) do NOT advance the gate unless `--strict` is added. Update all gate references in both SKILL.md files to use `markup-cli check --build --strict` for clarity.

**Touch list:**
- `validate.mjs`, `package.json` scripts
- New: `docs/COMPAT.md`, `test-fixtures/sample-react-app/`, `test-fixtures/sample-react-app.expected/`, `scripts/smoke-test.mjs`
- `skills/design-feature/SKILL.md`: line ~48 (Codex superpowers install), gate references throughout (~7 sites)
- `skills/bootstrap-design-system/SKILL.md`: gate references (~2 sites)

**Size:** L  **Dependencies:** Sub-plan 3 (`strategies.json` must exist for X3 validation)  **Risk:** medium — CI fixture is the kind of test that breaks for legitimate reasons; budget time for maintenance.

---

## Execution order

Suggested by impact + dependency:

1. **Sub-plan 1 (Tweaker contract)** — highest-leverage; no deps.
2. **Sub-plan 2 (Phase 5 QA)** — high-impact; no deps; can parallel Sub-plan 1.
3. **Sub-plan 5 (Phase 0/3 detection + branch check move)** — unblocks Sub-plan 6.
4. **Sub-plan 3 (Strategy SSoT)** — large but isolated; unblocks Sub-plan 9.
5. **Sub-plan 4 (Phase 4 enforcement)** — small; ship anywhere after Sub-plan 1.
6. **Sub-plan 6 (State + worktree resume)** — needs Sub-plan 5.
7. **Sub-plan 7 (bootstrap hardening)** — independent.
8. **Sub-plan 8 (UX consistency)** — bundle with any merge.
9. **Sub-plan 9 (Validator + cross-cutting)** — last (needs Sub-plan 3).

Total estimated effort: ~50-70h across all 9 sub-plans. Tier 1 alone (~15h) captures the highest-leverage improvements.

---

## Out of scope (deferred — unverifiable per second-opinion review)

| ID | Reason |
|---|---|
| A6 | False positive — `(custom, custom)` row already exists at `templates/ds-component-pattern.md:266-268`. |
| B5 | Unverifiable — "iteration ceiling" needs behavior research first. |
| H3 | Unverifiable — disclaimer-density claim needs UX-research evidence. |
| X5 | Unverifiable — telemetry opt-in needs separate consent/privacy design. |

---

## Tracking

Update sub-plan status here as work progresses. Each Sub-plan gets its own bite-sized writing-plans document at `docs/superpowers/plans/2026-MM-DD-<sub-plan-slug>.md` before execution.

| # | Sub-plan | Status | PR | Detailed plan |
|---|---|---|---|---|
| 1 | Tweaker contract + Phase 2 invariants | planned | — | — |
| 2 | Phase 5 QA hardening | planned | — | — |
| 3 | Strategy single-source-of-truth | planned | — | — |
| 4 | Phase 4 enforcement | in-flight | — | docs/superpowers/plans/2026-05-23-sp-4-phase4-enforcement.md |
| 5 | Phase 0/3 detection + ordering | planned | — | — |
| 6 | Worktree-aware resume + schema versioning | planned | — | — |
| 7 | bootstrap-design-system hardening | planned | — | — |
| 8 | User-facing copy + iteration ergonomics | planned | — | — |
| 9 | Validator + cross-cutting | planned | — | — |
