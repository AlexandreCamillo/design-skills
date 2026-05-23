# Sub-plan 4: Phase 4 enforcement (DS tasks + TDD) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce two structural checks on plans returned from `writing-plans` in Phase 4 (DS-edit tasks when tech spec mentions DS files; test tasks before src/ tasks for TDD), and document a Phase 4 DS-edit scope rule that distinguishes additive Phase-4 work from changes that must roll back to Phase 1.

**Architecture:** This sub-plan is pure documentation/text edits in a single skill file. We update three places in `skills/design-feature/SKILL.md`: (1) Phase 4 step 1 grows a new sub-step that runs a "post-plan checklist" (two grep-based heuristics) right after `writing-plans` returns; (2) Phase 4 gate adds a precondition about the test-task-precedence flag; (3) a new subsection "Phase 4 — DS edit scope rule" sits between Phase 4 and Phase 5 with rule statement, four worked examples (2 OK, 2 roll-back), and a single-sentence heuristic. No new files, no validator changes, no other phase changes.

**Tech Stack:** Markdown SKILL.md text edits only. Verified with `node validate.mjs`.

---

## Conventions

- **User-facing strings → PT-BR.** Anything the agent prints to the user lives in PT-BR (matches the rest of the skill).
- **Agent instructions → English.** Anything that tells future-Claude what to do stays in English.
- **No `Co-Authored-By:` trailers, no Claude Code footers** in commits.
- After each task, run `node validate.mjs` from the repo root and confirm `✓ Validated 2 skill(s); no issues.` before committing.

## Files touched

- Modify: `skills/design-feature/SKILL.md`
  - §"Phase 4 — Plan + execute" (~lines 742-748): add step 2 ("Post-plan checklist") between step 1 (invoke writing-plans) and current step 2 (which becomes step 3, execute via subagent-driven-development).
  - §"Phase 4 gate" (~lines 750-762): add a new precondition line about the post-plan checklist.
  - New §"Phase 4 — DS edit scope rule": inserted between current §"Phase 4 gate" and §"Phase 5 — Visual+behavior QA" (~line 763).

---

## Task 1: Post-plan checklist (E1 + E3)

**Files:**
- Modify: `skills/design-feature/SKILL.md` §"Phase 4 — Plan + execute"

This task adds a new sub-step that runs immediately after `writing-plans` returns. The sub-step is two heuristic grep checks the agent performs on the freshly-written plan file:

- **Check A — DS-edit task presence (E1).** If the tech spec (the file referenced in the previous step from `docs/superpowers/specs/`) mentions any path under `docs/design/design-system/`, then the plan must contain ≥1 task whose `Files:` block edits a path under `docs/design/design-system/`. If not, the agent surfaces a confirm-or-revise prompt to the user.
- **Check B — Test-task precedence (E3).** Walk the plan's task list top-to-bottom. Note the index of the first task whose step descriptions match `/test|spec|tdd/i` (the "first test task index") and the index of the first task whose `Files:` block touches any path under `src/` (or other code roots like `lib/`, `app/`, `apps/`, `packages/` — the agent uses the project's detected code root from `strategy.json:detected.codeRoot` if present, falling back to `src/`). If the first src/ task comes before the first test task, the agent surfaces "Test tasks must precede implementation tasks (TDD)." and asks the user to confirm or revise.

Both checks are heuristics, not hard refusals: the agent prints a clear flag and waits for explicit user confirmation before continuing. The Phase 4 gate (Task 2) enforces that the flag was raised and resolved before declaring implementation done.

- [ ] **Step 1: Read the current Phase 4 section**

Use the Read tool to load `skills/design-feature/SKILL.md` from approximately line 742 through line 762 (Phase 4 — Plan + execute through Phase 4 gate). Confirm the current text matches what you expect.

- [ ] **Step 2: Replace the old "Execute via subagent-driven-development" line with the new step 2 + renumbered step 3**

Use the Edit tool. Replace this exact block:

```markdown
2. **Execute via `subagent-driven-development`** (or `executing-plans` — ask the user). Unlike Phase 1, parallel subagents are useful here because plan tasks usually touch independent files.

### Phase 4 gate
```

with this new block (note: the **new** step 2 is the post-plan checklist; what was step 2 becomes step 3):

```markdown
2. **Post-plan checklist (run on the file `writing-plans` just wrote, before invoking execution).** Two heuristic grep-based checks. Both run; surface any flag to the user and wait for explicit confirm-or-revise before advancing to step 3.

   - **Check A — DS-edit task presence.** Grep the tech spec at `docs/superpowers/specs/<date>-<slug>-tech-spec.md` for the substring `docs/design/design-system/`. If at least one match exists, grep the freshly-written plan for tasks whose `Files:` blocks reference a path under `docs/design/design-system/`. If the spec mentions DS paths but the plan has zero DS-edit tasks, print:

     > ⚠ O tech spec referencia arquivos em `docs/design/design-system/`, mas o plano não tem nenhuma tarefa que edita esses arquivos. Confirme se isso é intencional (ex.: a feature só consome o DS sem alterar) ou revise o plano para incluir as edições de DS necessárias.

     Wait for the user to confirm "ok, sem alterações de DS" (or equivalent) or to ask for a revision. If the user asks for a revision, re-invoke `writing-plans` with the spec's DS-path list explicitly enumerated in the seed.

   - **Check B — Test-task precedence (TDD).** Walk the plan's task list top-to-bottom. For each task, inspect both the step descriptions and the `Files:` block. Compute:
     - `firstTestTaskIndex` = index of the first task whose step descriptions match the regex `/test|spec|tdd/i` (case-insensitive) OR whose `Files:` block lists a path matching `/\b(test|tests|spec|specs|__tests__)\b/i`.
     - `firstSrcTaskIndex` = index of the first task whose `Files:` block lists a path under the project's code root. The code root is `strategy.json:detected.codeRoot` when set; otherwise fall back to `src/`, then `lib/`, then `app/`, then `apps/`, then `packages/` (first that appears in any task's `Files:` block).

     If `firstSrcTaskIndex < firstTestTaskIndex` (or `firstTestTaskIndex` is unset while `firstSrcTaskIndex` is set), print:

     > ⚠ Test tasks must precede implementation tasks (TDD). O plano tem tarefa de implementação (`<path-do-firstSrcTask>`) antes de qualquer tarefa de teste. Confirme se a feature genuinamente não precisa de testes novos (e justifique) ou revise o plano para incluir as tarefas de teste antes das de implementação.

     Wait for the user to confirm "ok, sem testes novos por <razão>" or to ask for a revision.

   Record the outcome of both checks in `state.json:phase4.postPlanChecklist = { dsTasks: "ok" | "confirmed-no-ds" | "revised", testPrecedence: "ok" | "confirmed-no-tests" | "revised" }`. This is what the Phase 4 gate reads.

3. **Execute via `subagent-driven-development`** (or `executing-plans` — ask the user). Unlike Phase 1, parallel subagents are useful here because plan tasks usually touch independent files.

### Phase 4 gate
```

- [ ] **Step 3: Run validator**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 4: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "feat(design-feature): post-plan checklist for Phase 4 (DS tasks + TDD)"
```

---

## Task 2: Phase 4 gate update

**Files:**
- Modify: `skills/design-feature/SKILL.md` §"Phase 4 gate"

The gate gains one precondition: the post-plan checklist (Task 1) ran and any flag it raised was resolved.

- [ ] **Step 1: Replace the Phase 4 gate block**

Use the Edit tool. Replace this exact block:

```markdown
<HARD-GATE>
Do NOT declare implementation done until:
  - The verification-before-completion skill has been invoked, AND
  - Its evidence (test command output, type-check output, etc.) has been printed in
    this transcript, AND
  - If any DS file under docs/design/design-system/ was modified during Phase 4,
    `markup-cli check --build` exited 0 (or the manual structural review was
    confirmed by the user when CLI is absent).
</HARD-GATE>
```

with:

```markdown
<HARD-GATE>
Do NOT declare implementation done until:
  - The post-plan checklist (Phase 4 step 2) ran, AND any flag it raised was
    resolved by either an explicit user confirmation or a plan revision (i.e.
    `state.json:phase4.postPlanChecklist.dsTasks` and `.testPrecedence` are both
    set, and neither is in an unresolved state), AND
  - The verification-before-completion skill has been invoked, AND
  - Its evidence (test command output, type-check output, etc.) has been printed in
    this transcript, AND
  - If any DS file under docs/design/design-system/ was modified during Phase 4,
    `markup-cli check --build` exited 0 (or the manual structural review was
    confirmed by the user when CLI is absent).
</HARD-GATE>
```

- [ ] **Step 2: Run validator**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 3: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "feat(design-feature): Phase 4 gate enforces post-plan checklist"
```

---

## Task 3: DS edit scope rule (E2)

**Files:**
- Modify: `skills/design-feature/SKILL.md` — insert new subsection between current §"Phase 4 gate" and §"Phase 5 — Visual+behavior QA".

A new subsection that documents when a DS change can happen during Phase 4 versus when it must roll back to Phase 1. The rule, examples, and heuristic are agent-facing English (so future-Claude can grep for the criterion); the example *prompts* the agent prints to the user are PT-BR.

- [ ] **Step 1: Insert the new subsection**

Use the Edit tool. Find this exact anchor (end of Phase 4 gate, before Phase 5):

```markdown
</HARD-GATE>
```

(making sure to pick the one immediately followed by `## Phase 5 — Visual+behavior QA`) and replace it with:

```markdown
</HARD-GATE>
```

### Phase 4 — DS edit scope rule

Phase 4 implementation may touch DS files, but only under a narrow rule. Apply this before opening any DS file for edit during Phase 4:

**Rule.** Adding a new variant or a new state to an existing DS component during Phase 4 is allowed. Changing the visual treatment of an existing variant — anything a user would have signed off on during Phase 1 mockup approval — is not. If the change is in the second category, roll back to Phase 1: re-mockup the affected component, re-promote, re-bake, then return to Phase 4 with a new plan.

**Examples — additive, stay in Phase 4:**

1. The tech spec needs a new `size=xs` variant on the Button component that did not exist when the mockup was approved. The Phase 1 mockup did not show or hide-show this size. **OK** — add the variant in Phase 4 as a DS-edit task (per Phase 4 step 1 instruction); run `markup-cli check --build`; commit.
2. The tech spec needs a new `loading` state on the Form component (spinner over a disabled form) that the Phase 1 mockup did not exercise. **OK** — add the state row to the State decision matrix and add the visual to the all-states grid in Phase 4; the user's Phase 1 approval covered the rest of the form's visuals, which are unchanged.

**Examples — non-additive, roll back to Phase 1:**

1. While implementing the tech spec, you notice the approved Button's `primary` variant looks heavier than the rest of the page and want to lighten its weight or tint. **Roll back.** The user approved `primary`'s exact visual in Phase 1. Re-mockup, re-approve, re-bake. Do not silently re-tweak in Phase 4.
2. The approved Form layout uses a two-column grid, but during Phase 4 you decide a single-column layout fits the real data better. **Roll back.** Layout is what the user signed off on. Open a Phase 1 cycle to remockup the form.

**Heuristic.** If the change affects what a user would have approved in Phase 1, it goes back to Phase 1.

When you detect a non-additive change is needed mid-Phase-4, stop the current plan execution, print to the user:

> ⚠ Mudança detectada que afeta visual já aprovado na Phase 1 (`<componente>`, `<o que muda>`). Por regra de escopo da Phase 4, isso volta pra Phase 1: re-mockup → re-promover → re-bake → novo plano. Pausando a execução do plano atual. Confirma o rollback?

Wait for the user to confirm before re-entering Phase 1.

## Phase 5 — Visual+behavior QA
```

(Note: the replacement keeps the closing `</HARD-GATE>` line of the Phase 4 gate intact and appends the new subsection plus the original `## Phase 5 — Visual+behavior QA` heading. The Edit tool's `old_string` is the seven-line block from `</HARD-GATE>\n\`\`\`\n\n## Phase 5 — Visual+behavior QA` — see Step 1 for exact anchor.)

For uniqueness, the actual `old_string` should be:

```
</HARD-GATE>
```

## Phase 5 — Visual+behavior QA
```

and the `new_string` should be the same lines but with the entire DS-edit-scope-rule subsection inserted between the closing fence and the `## Phase 5` heading.

- [ ] **Step 2: Run validator**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 3: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "feat(design-feature): Phase 4 DS edit scope rule"
```

---

## Task 4: Tracking-table refresh

**Files:**
- Modify: `docs/superpowers/plans/2026-05-23-skills-audit-roadmap.md` — update the Sub-plan 4 row in the tracking table at the bottom.

- [ ] **Step 1: Read the bottom of the roadmap**

Use the Read tool on `docs/superpowers/plans/2026-05-23-skills-audit-roadmap.md` starting around line 280.

- [ ] **Step 2: Update the Sub-plan 4 status row**

Use the Edit tool. Replace:

```markdown
| 4 | Phase 4 enforcement | planned | — | — |
```

with:

```markdown
| 4 | Phase 4 enforcement | in-flight | — | docs/superpowers/plans/2026-05-23-sp-4-phase4-enforcement.md |
```

(The PR URL is filled in after `gh pr create` returns.)

- [ ] **Step 3: Run validator**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-05-23-skills-audit-roadmap.md docs/superpowers/plans/2026-05-23-sp-4-phase4-enforcement.md
git commit -m "docs(plans): track sub-plan 4 (Phase 4 enforcement)"
```

---

## Final verification

Before opening the PR, run from the repo root:

```bash
node validate.mjs
git log --oneline main..HEAD
```

Expected:
- Validator prints `✓ Validated 2 skill(s); no issues.`
- The log shows 4 commits (one per task), none containing `Co-Authored-By` or `Claude Code` footers.

Then verify the three acceptance criteria by re-reading the changed sections of `skills/design-feature/SKILL.md`:

1. **AC1 (post-plan checklist):** §"Phase 4 — Plan + execute" has step 2 with Check A (DS-edit task presence) and Check B (test-task precedence).
2. **AC2 (Phase 4 gate):** §"Phase 4 gate" lists the post-plan checklist among its preconditions.
3. **AC3 (DS edit scope rule):** new §"Phase 4 — DS edit scope rule" exists between Phase 4 gate and Phase 5, with rule + 2 additive examples + 2 roll-back examples + the one-sentence heuristic.

## Self-review

- **Spec coverage:** All 3 acceptance criteria from the roadmap (E1 post-plan checklist, E2 DS edit scope rule, E3 test-task precedence) map to Tasks 1-3. The roadmap mentions E3 is folded into the post-plan checklist (same task) and that the Phase 4 gate update is its own enforcement — that maps to Task 2. ✓
- **Placeholder scan:** No TBDs; every code block contains the literal text to write. ✓
- **Type consistency:** State key naming consistent (`state.json:phase4.postPlanChecklist.{dsTasks,testPrecedence}`); regex shapes match between Task 1 step 2 and gate language. ✓
- **Scope:** No edits to other phases' gates, no validator changes. Touch list is exactly `skills/design-feature/SKILL.md` plus a one-line roadmap tracking update plus this plan file. ✓
