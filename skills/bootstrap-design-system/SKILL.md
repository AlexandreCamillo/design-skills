---
name: bootstrap-design-system
description: "One-shot bootstrap that extracts a Design System from an existing app's running UI, so the design-feature workflow can be adopted on a project that already has code. Uses Chrome MCP to snapshot rendered components, then ports JSX/Vue/Svelte behavior to vanilla JS micro-apps. Manage expectations: this is a draft generator, not a finished DS — every item needs human curation."
compat:
  cli: ">=0.1.0"
  markup: ">=0.2.0"
---

# Bootstrap Design System

This skill is a **one-shot bootstrap** that produces a draft Design System from an existing application's running UI. Run it once per project, before the first use of the `design-feature` skill.

## Cross-harness tool reference

This skill uses Claude Code tool names (`Read`, `Write`, `Edit`, `Bash`, `Skill`, `mcp__<server>__<tool>`). For the explicit equivalents on **Gemini CLI** and **Codex CLI** — including how to install Chrome MCP on each harness, how each harness invokes a sub-skill, and the agent-guidelines-file lookup priority (`AGENTS.md` → `CLAUDE.md` → `GEMINI.md`) — see § "Cross-harness tool reference" at the top of `../design-feature/SKILL.md`. The two skills share the same tool-mapping conventions.

**Chrome MCP**: this skill **refuses to run** when no Chrome MCP server is registered on the current harness (precondition 3) unless the user explicitly opts into the code-only fallback. Install Chrome MCP on the active harness before invoking the skill.

## What this skill produces

When the bootstrap completes:

- `docs/design/design-system/01-<slug>.html` ... `NN-<slug>.html` — one HTML file per identified component, marked `js: stub`, `js: partial`, or `js: ported` based on how successfully the original JSX/template was translated to vanilla JS.
- `docs/design/index.md` — catalog with a "Bootstrap status" table.
- `.markup-design/bootstrap/{inventory.md, routes.json, screenshots/}` — auxiliary artifacts the user can inspect and re-run individual steps against.

## Hard preconditions

1. **superpowers plugin installed.** This skill invokes `brainstorming` to confirm the inventory and may call `frontend-design` for individual port refinements. Abort with the install link if missing.
2. **`markup-cli` CLI installed.** Used for build, sync-index, check. Recommended (not strictly required) is `>=0.0.3` which has the `bootstrap` sub-commands.
3. **Chrome MCP server available on the current harness.** This skill SNAPSHOTS the running app — without Chrome MCP the user would have to hand-translate each component, which is more work than starting fresh. Detect the server by looking for: `mcp__claude-in-chrome__*` or `mcp__chrome-devtools__*` on **Claude Code**; tools registered by `chrome-devtools` on **Gemini CLI**; tools registered by `chrome_devtools` on **Codex CLI**. If no Chrome MCP server is registered: refuse with a clear message giving the install path for the active harness — **Claude Code (preferred):** the [Claude for Chrome extension](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn) activated with `claude --chrome` or `/chrome` in-session (requires Claude Code 2.0.73+; Chrome/Edge only); fallback for WSL/Brave/Arc: `claude mcp add chrome-devtools npx chrome-devtools-mcp@latest`. **Gemini CLI:** `gemini mcp add chrome-devtools npx chrome-devtools-mcp@latest`. **Codex CLI:** `codex mcp add chrome-devtools -- npx chrome-devtools-mcp@latest` (Codex's Chrome extension is currently Codex-app-only, not exposed to the CLI). OR offer to fall back to a "code-only" path where the agent reads each React/Vue file and writes vanilla JS by hand. Default to refuse; only fall back if the user explicitly asks.
4. **design-feature bundled template available** — `bootstrap-design-system` reads `skills/design-feature/templates/ds-component-pattern.md` during Step C and Step D. The CLI install bundles both skills together (same `design-skills` package), so this is implicit, but if the template file is missing the bootstrap MUST abort with: `❌ HARD: design-feature template not found at templates/ds-component-pattern.md. Reinstall design-skills`.

## Soft dependency

- **Markup online** — optional. Bootstrap can complete entirely locally. If connected, you can run `markup-cli promote <slug>` manually after curation; the skill itself does not invoke it.

## Manage expectations (print at start, BEFORE any other action)

```
Bootstrap produces a DRAFT design system from your running app. It is NOT
finished output. What to expect:

  · Atoms (button, icon, spinner, badge) usually port cleanly.
  · Molecules with form inputs port well.
  · Async loading states, drag-and-drop, virtualized lists, and
    multi-step flows typically need manual cleanup.
  · Plan for the unexpected — every project surprises.

For ~25 components and ~7 complex ones, expect ~1 day of wall-clock time:
3-6h of agent work + 2-3h of your gate-keeping.

Components are processed one-by-one with a human approval gate after each.
You can pause and resume.

This skill does NOT produce a full-prototype (an assembled page mixing all
components). It produces individual DS files only. If you want a full-prototype,
assemble it manually after bootstrap completes.

Repository: https://github.com/AlexandreCamillo/markup-cli-toolkit

Continue? (say "yes" to proceed)
```

Wait for explicit "yes" before proceeding.

## The 5-step bootstrap (plus Step 0 preamble)

```
Step 0: Project discovery + strategy   → reuse strategy.json OR new menu
Step A: Inventory proposal             → user reviews → edited inventory
Step B: Routing + selectors            → user fixes  → routes.json
Step C: Snapshot per item              → automatic, gated by check; DS files follow ds-component-pattern.md
Step D: Port JS per item               → human gate per item; populates State decision matrix in DS file
Step E: Validate                       → final check + bootstrap status table (no QA column)
```

### Step 0 — Project discovery + framework + strategy choice

Runs after the user accepts the "Manage expectations" prompt and before Step A. The logic mirrors `design-feature` skill's Phase 0 — the two skills share the same `.markup-design/scratch/strategy.json` file.

**Pre-load (once per bootstrap run):** In parallel, read `skills/design-feature/SKILL.md` (the cross-referenced detection tables in 0.2–0.5 live there) and verify `skills/design-feature/templates/ds-component-pattern.md` is present (precondition 4). Keep both in context through Step C and Step D — do NOT re-read them per component. On resume, also reuse `strategy.json:projectRules` instead of re-reading the agent guidelines file (`AGENTS.md` / `CLAUDE.md` / `GEMINI.md`) or `docs/INDEX.md` (those don't change between features).

#### 0.1 Check for existing strategy.json

If `.markup-design/scratch/strategy.json` exists at cwd:

1. Read it.
2. Print:
   ```
   Found existing strategy.json from a previous design-feature run:
     framework: <framework>
     chosen:    <chosen> (<label>)
     saved:     <chosenAt>

   Reuse this strategy for bootstrap? (sim / change / inspect)
   ```
3. `sim` → skip 0.2–0.6; proceed to Step A (the existing `strategy.json` is reused as-is).
4. `change` → run 0.2–0.6; overwrite `strategy.json`.
5. `inspect` → print the JSON contents and re-ask.

#### 0.2 Detect framework, then tooling

Use the same detection rules as `design-feature` Phase 0.1 (framework priority + ecosystem tables). See `skills/design-feature/SKILL.md` § "Phase 0 — Project discovery + framework + strategy choice" subsection "0.1 Detect framework, then tooling". Do not duplicate the tables here — read them from the design-feature SKILL.md when needed.

#### 0.3 Detect project rules

Same as `design-feature` Phase 0.2 — find the first present of `AGENTS.md` → `CLAUDE.md` → `GEMINI.md`, read it together with `docs/INDEX.md` heuristically, and capture a one-line summary into `projectRules` (with `agentRules.source` naming the file that produced it).

#### 0.4 Compose the strategy menu

Same as `design-feature` Phase 0.3 — framework-aware menu with 40 framework-prefixed strategy IDs plus `custom`.

#### 0.5 Present the menu

Same as `design-feature` Phase 0.4 — numbered list of available strategies for the detected framework, plus "Outro (descreva)".

#### 0.6 Persist the choice

Write `.markup-design/scratch/strategy.json` using the canonical schema from `skills/design-feature/SKILL.md` §0.5 (do not restate the schema here). Bootstrap's only delta is a `usedBy` array set to `["bootstrap"]` on first write — this field lives in `strategy.json`, not `state.json`. A future design-feature invocation does not consume or update `usedBy`; treat it as bootstrap-local audit only.

#### 0.7 HARD-GATE

```
<HARD-GATE>
Do NOT invoke Step A until:
  - .markup-design/scratch/strategy.json exists, AND
  - It contains a non-null `framework` field, AND
  - It contains a non-null `chosen` field, AND
  - If `chosen === "custom"`, `freeText` is non-empty.
</HARD-GATE>
```

### Step A — Inventory proposal

1. **Run heuristic detection.** Glob `src/components/**/*.{tsx,jsx,vue,svelte}` (or whatever the project uses). For each file:
   - Extract the default export name → candidate slug.
   - Parse the file to count props, child elements, and conditional branches. Prefer an AST when available: if `@typescript-eslint/parser` resolves under cwd `node_modules` (for `.tsx`/`.jsx`/`.ts`/`.js` files) or `vue-eslint-parser` resolves under cwd `node_modules` (for `.vue` files), use it. Otherwise fall back to regex counting — record `parser: "regex-fallback"` in the per-row inventory note and print the limit notice (see step 2 below) once at the top of `inventory.md`.
   - Classify as **atom** (no children significant, few props), **molecule** (1-2 levels deep, few interactions), **organism** (many children, multiple interactions), **page** (top-level routes — these are NOT components).
2. **Write `.markup-design/bootstrap/inventory.md`** as an editable table:

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

   | Source                              | Tier      | Slug             | Action  | Notes                       |
   |-------------------------------------|-----------|------------------|---------|-----------------------------|
   | src/components/Button.tsx           | atom      | button           | keep    |                             |
   | src/components/IconButton.tsx       | atom      | button           | merge:button | variant=icon         |
   | src/components/Sidebar.tsx          | organism  | sidebar          | keep    | drag-n-drop, ~600L          |
   | ...                                 | ...       | ...              | ...     | ...                         |
   ```

3. **Pause.** Open the file in the user's editor if possible (`code .markup-design/bootstrap/inventory.md`). Wait for explicit "continue". Re-read the file when they're back.
4. Only items with `action=keep` (or `merge:<X>`) move forward. Merge rules are applied as additional variants of the target slug.

### Step B — Routing + selectors

For each `keep` item, the agent needs to know where in the running app the component is rendered in a "canonical" state.

1. Start the dev server. Read `.markup-design/connection.json` `devServer.command`; run it in the background — Claude Code: `Bash` with `run_in_background: true`; Gemini CLI: `run_shell_command` then `&` + log file; Codex CLI: native shell with `&` + log file.
2. For each component:
   - **Detect imports.** Grep the app to find pages that import the component. If exactly one, use that route. If multiple, prompt the user.
   - **Author a `selector`** — typically `[data-testid="..."]` if the codebase uses test IDs; otherwise the agent inspects the live page (via Chrome MCP) and picks a stable selector. Validate that the selector matches by evaluating `document.querySelector(...)` against the page through the Chrome MCP server's "run JavaScript" tool (`mcp__claude-in-chrome__javascript_tool` on Claude+claude-in-chrome; `evaluate_script` on `chrome-devtools-mcp` regardless of harness).
   - **Author `seedActions`** — a sequence of `["click"|"hover"|"type", selector, ...]` that puts the component in the canonical state (e.g., open a menu, fill a form, dismiss a tooltip).
3. **Write `.markup-design/bootstrap/routes.json`:**

   ```json
   [
     { "slug": "sidebar", "route": "/projects", "selector": "[data-testid='sidebar']", "seedActions": [] },
     { "slug": "avatar-menu", "route": "/projects", "selector": "header [aria-label='user menu']", "seedActions": [["click", "header [aria-label='user menu']"]] }
   ]
   ```

4. Pause for user review. They can edit selectors and re-run validation.

### Step C — Snapshot per item

For each item, Chrome MCP performs:

1. Navigate to `route`.
2. Run each `seedAction`.
3. Capture:
   - **Subtree HTML + Computed CSS in one "run JavaScript" call** (the Chrome MCP server's `javascript_tool` / `evaluate_script` tool) — return a single JSON object `{ html: document.querySelector(selector).outerHTML, styles: <recursive getComputedStyle walk> }`. The two captures are independent; batching saves one Chrome MCP round-trip per component.
   - **Screenshot** of the bounding box (save to `.markup-design/bootstrap/screenshots/<slug>.png`).
4. **CSS rewrite pass.** Replace each runtime hash class (e.g., `.css-1a2b3c`) with a deterministic BEM name derived from the slug plus the most-semantic class identifier in the JSX source (`.ds-<slug>__btn-primary`). For tokens (frequent literal values like `#ffffff`, `16px`), match against the project's `tailwind.config` or `tokens.css` and emit the variable reference (`var(--space-md)`).
5. **Write `docs/design/design-system/NN-<slug>.html`** following `templates/ds-component-pattern.md`:
   - Required sections present: §1 (All-states grid), §4 (Code API), §7 (Anatomy), §8 (Behavior).
   - §1 All-states grid: one cell per state captured via `seedActions` (single cell if only the default state was captured — flagged with a note that more `seedActions` would expand coverage).
   - §4 Code API: populated with the **original source snippet** read from `src/components/<file>.<ext>`. Format the snippet per the strategy adaptation guide in `templates/ds-component-pattern.md` §6 for the `(framework, chosen)` tuple from `.markup-design/scratch/strategy.json`. If the source uses a different lib than `chosen` requires, **translate the snippet to the chosen strategy** and prepend the comment `// (source uses <X>; chosen strategy is <chosen> — translated example, verify by hand)`.
   - §7 Anatomy: `dl.tokens` table populated from the CSS-rewrite pass (token references identified during the snapshot).
   - §8 Behavior: initially a placeholder bullet list (`- [populated in Step D]`); Step D fills it as JS is ported.
   - §5 State decision matrix: initially absent. Step D adds rows as it identifies interactions. If component has ≥3 states by the end of Step D, the matrix is present; otherwise the section is omitted.
   - Tokens copied verbatim from `src/styles/tokens.css` if present, else derived from `tailwind.config.*`, else inline defaults (same rule as the bundled template).
   - `data-ds-component="<slug>"` marker on `.page` wrapper (unchanged).
   - IIFE script: `window.DS.<slug> = { init(root, opts) { /* TODO: port from src/components/<file> */ } }` with `js: stub` front-matter (Step D ports this).
6. After all snapshots, run `markup-cli check --build` and ensure the structure passes (BEM prefix linter, marker uniqueness, etc.). Fix anything broken before advancing.

### Step D — Port JS per item

This is the most labor-intensive step. Process **one item at a time** with a human gate at the end of each.

For each component (in inventory order):

1. **Read the source file.** Identify:
   - `useState`/`useReducer` → variables in the IIFE closure.
   - `useEffect` setup → call inside `init()`. Cleanup → exposed `destroy()` if needed.
   - JSX event handlers (`onClick`, `onDragStart`, `onChange`, etc.) → `addEventListener` in `init()`.
   - Conditional rendering by state → DOM mutation (`element.classList.toggle(...)`, `element.style.display = ...`).
   - `useContext` consumers → opts arguments to `init()` (e.g., `init(root, { user, theme, onSelect })`).
   - Render functions / `children` props → DOM templates inside the marker subtree (the snapshot already has them).
2. **Write the vanilla JS** into the IIFE in the DS file. Strict isolation: no shared closures with other components; everything is namespaced under `window.DS.<slug>`.
3. **Populate sections 5 and 8 of the DS file** (instead of creating a sidecar):
   - For each interaction with a discernible state (hover, focus, disabled, loading, error, success, expanded, etc.), append a row to **§5 State decision matrix**: state · trigger · visual · aria.
   - For each interaction's runtime contract, append a bullet to **§8 Behavior**.
   - If the component has fewer than 3 states by the end of porting, the §5 matrix is omitted (it's not required by the bundled template at that count). §8 is still populated.
4. **Run QA via Chrome MCP** against both the DS file (`file://`) and the live route. Scenarios derive from **§5 State decision matrix** of the DS file (same approach as `design-feature` Phase 5):
   - Open both targets in separate Chrome MCP tabs in parallel (independent URLs).
   - For each matrix row: apply the trigger in both tabs in parallel, capture both screenshots in one step, then report visual / DOM-state delta.
   - If §5 is absent (fewer than 3 states), fall back to a single "snapshot in seedAction state and visual diff" — capture both targets and screenshot-diff. Tell the user: "automated interaction QA skipped — add more `seedActions` if you want broader coverage."
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
6. **Update inventory `Notes` column** with the current state.
7. **Commit each item separately:** `git commit -m "feat(ds): bootstrap port <slug>"`. Granular commits make it easy to revert individual ports.

### Step E — Validate

1. **`markup-cli check --build`** — must pass.
2. **`markup-cli sync-index`** — regenerate `index.md`.
3. **Append a `## Bootstrap status` section to `docs/design/index.md`:**

   ```markdown
   ## Bootstrap status

   Generated 2026-05-19 from existing code. `partial`/`stub` items need follow-up porting.

   | Slug          | JS status | States in matrix | Source                          |
   |---------------|-----------|------------------|---------------------------------|
   | sidebar       | partial   | 3                | src/components/Sidebar.tsx      |
   | avatar-menu   | ported    | 4                | src/components/AvatarMenu.tsx   |
   | tooltip       | partial   | 0 (matrix empty) | src/components/Tooltip.tsx      |
   | …             | …         | …                | …                               |
   ```

4. **Print a summary:**

   ```
   ✓ DS components: 24 total
     - 18 ported   (JS funcional, ≥3 states in matrix)
     -  4 partial  (JS parcial, alguns triggers falham)
     -  2 stub     (apenas referência visual)

   ⚠ Next steps:
     · Port JS for partial/stub items when you next touch them.
     · Run `design-feature` for new features going forward. Phase 0 will pick up
       the strategy you chose during bootstrap (.markup-design/scratch/strategy.json).
     · Re-run individual snapshots after design changes via:
         markup-cli bootstrap snapshot <slug>
     · If you want a full-prototype assembly: do it manually — this skill
       produces individual DS files only, not _template.html / _glue.js /
       full-prototype/index.html.
   ```

## Known limitations (document in the bootstrap status section)

- **CSS tokens duplicated** — computed styles capture resolved values, not variable references. The token-reverse-pass hits ~70%; the rest needs manual cleanup.
- **States not in the snapshot** are missing (`hover`, `focus`, `error`, `disabled` unless covered by `seedActions`).
- **Async loading states** are usually missed because snapshot captures the post-fetch DOM.
- **Portals/modals** require explicit `seedActions` (otherwise they render outside the selector subtree).
- **Virtualized lists** snapshot only the visible window.
- **CSS-in-JS** hash classes get rewritten to deterministic BEM names — works for ~80% of cases; the rest need a manual look.

## Resuming a partial bootstrap

State for bootstrap is `.markup-design/bootstrap/state.json`:

```json
{
  "step": "step-D-port-js",
  "currentSlug": "sidebar",
  "completed": ["button", "icon-button", "breadcrumb"],
  "pending": ["sidebar", "avatar-menu", "mockup-view"],
  "framework": "react",
  "strategy": "react-antd-rhf"
}
```

- `framework` — copied from `.markup-design/scratch/strategy.json:framework` after Step 0.
- `strategy` — copied from `.markup-design/scratch/strategy.json:chosen` after Step 0.

On invocation, list any `.markup-design/bootstrap/state.json` and offer to resume. On resume:

1. Read the file. Determine the current step from `step`.
2. Also read `.markup-design/scratch/strategy.json`. Compare both fields:
   - If `state.json.framework ≠ strategy.json.framework`: prompt `Bootstrap was started under framework "<old>"; project is now "<new>". Continue with the original ("<old>"), or restart Step 0 to re-pick strategy?` Default: continue with original.
   - If `state.json.strategy ≠ strategy.json.chosen`: prompt `Bootstrap was started under strategy "<old>"; current default is "<new>". Continue with bootstrap's original ("<old>"), or migrate to current ("<new>")?` Default: keep the original.
   - If `strategy.json` is absent (rare — user deleted it mid-bootstrap), recreate it from `state.json.framework` + `state.json.strategy` silently.
3. Resume from `currentSlug` rather than restart.
