---
name: design-feature
description: "Orchestrates the full feature-development workflow: design brainstorm + ideia mockup → promotion → tech brainstorm → plan + execute → visual+behavior QA. Keeps the Design System and code implementation in sync. Use when the user asks to design, brainstorm, or build a new feature that has a visible UI surface."
compat:
  cli: ">=0.1.0"
  markup: ">=0.2.0"
---

# Design-Feature Workflow

This skill orchestrates the end-to-end lifecycle of a user-visible feature, keeping the Design System and the code implementation rigorously in sync. It composes other skills (`brainstorming`, `frontend-design`, `writing-plans`) rather than replacing them.

## Cross-harness tool reference

The instructions below are written using Claude Code tool names (`Read`, `Write`, `Edit`, `Bash`, `Skill`, MCP tools prefixed `mcp__<server>__<tool>`, agent guidelines in `CLAUDE.md`). The skill also runs on **Gemini CLI** and **Codex CLI** — translate the Claude Code names using the table below as you execute each step.

| Action | Claude Code | Gemini CLI | Codex CLI |
|---|---|---|---|
| Read a file | `Read` | `read_file` | native file tool |
| Write a file | `Write` | `write_file` | native file tool |
| Edit a file | `Edit` | `replace` | native file tool |
| Run a shell command | `Bash` | `run_shell_command` | native shell tool |
| Background process | `Bash` with `run_in_background: true` | `run_shell_command` then `&` + log file (no native background flag) | native shell tool with `&` + log file |
| Search file content | `Grep` | `grep_search` | native search |
| Find files by name | `Glob` | `glob` | native glob |
| Invoke a sub-skill | `Skill: <plugin>:<skill>` (via the Skill tool) | `activate_skill('<plugin>:<skill>')` | no `Skill` tool — open the SKILL.md inline and follow it as the active instruction set |
| Dispatch subagent | `Task` / `Explore` agent | `@generalist` (or named: `@code-reviewer`) | `spawn_agent` (requires `multi_agent = true` in `~/.codex/config.toml`) |
| Track tasks | `TaskCreate` / `TaskUpdate` | `write_todos` | `update_plan` |

### Chrome MCP across harnesses

Phase 5 visual+behavior QA depends on Chrome MCP. The same server (`chrome-devtools-mcp`, from Google) runs on all three harnesses; Anthropic also ships its own `claude-in-chrome` plugin on Claude Code. Tool-name prefixes differ:

| Harness | How to install Chrome MCP | Tool reference in this skill |
|---|---|---|
| Claude Code | Anthropic's plugin (`mcp__claude-in-chrome__*`) **or** `claude mcp add chrome-devtools npx chrome-devtools-mcp@latest` (`mcp__chrome-devtools__*`) | `mcp__<server>__<tool>` |
| Gemini CLI | `gemini mcp add chrome-devtools npx chrome-devtools-mcp@latest` | tools registered by the `chrome-devtools` MCP server (no `mcp__` prefix) |
| Codex CLI | `codex mcp add chrome-devtools -- npx chrome-devtools-mcp@latest` (adds to `~/.codex/config.toml`) | tools registered by the `chrome_devtools` MCP server |

If no Chrome MCP server is registered on the current harness, the skill **skips Phase 5 automatically** and prints the manual checklist (see § "Manual checklist fallback").

### Sub-skill availability across harnesses

This skill composes `brainstorming`, `frontend-design`, `writing-plans` from the **superpowers** plugin. Distribution today:

- **Claude Code**: install via `claude plugin install obra/superpowers` (loads `Skill` tool entries).
- **Gemini CLI**: install via `gemini extensions install obra/superpowers` (exposes `activate_skill`).
- **Codex CLI**: superpowers does not ship a Codex-native plugin; clone the repo and read each SKILL.md from `~/.codex/superpowers/skills/<name>/SKILL.md` when prompted to "invoke" it.

If a required sub-skill cannot be loaded, the Hard preconditions block below applies.

### Agent guidelines file across harnesses

During Phase 0.2 the skill reads a project-level agent guidelines file. It looks for the first present at cwd root, in priority order: **`AGENTS.md` → `CLAUDE.md` → `GEMINI.md`**. The captured one-line summary is recorded under `agentRules` in `.markup-design/scratch/strategy.json` along with which file produced it.

## Hard preconditions (refuse if missing)

This skill is a hard-fail wrapper unless the following are present:

1. **superpowers plugin installed** — the skill calls `brainstorming`, `frontend-design`, `writing-plans` via the Skill tool. If any of these three skills are not loadable, abort with:

   > ❌ HARD: superpowers plugin not detected. Install: https://github.com/obra/superpowers

   Do not perform any other action. Do not write files. Do not pretend to start.

## Soft dependencies (degrade gracefully, surface a disclaimer)

After the hard check passes, detect optional dependencies and surface a one-block disclaimer **before any other action**:

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

3. **Chrome MCP server** — check whether any Chrome MCP tools are registered. On **Claude Code**, look for `mcp__claude-in-chrome__*` (Anthropic's plugin) or `mcp__chrome-devtools__*` (Google's `chrome-devtools-mcp`). On **Gemini CLI**, look for tools under the `chrome-devtools` server registered via `gemini mcp add`. On **Codex CLI**, look for tools under the `chrome_devtools` server defined in `~/.codex/config.toml`. If no Chrome MCP server is registered on the current harness, the Phase 5 visual+behavior QA falls back to the manual checklist printed for the user.

4. **`cloudflared` on PATH** — `command -v cloudflared`. Only relevant when (2) is absent. Used to expose the local companion server publicly so users on a remote harness (VPS, mobile remote-control) can open the mockup.

### Disclaimer template

```
design-feature ready. Capability matrix:

  ✓ HARD: superpowers <version> detected
  {cli line:        ✓ markup-cli vX.Y.Z (satisfies compat.cli <range>)
                    |  ✗ markup-cli vX.Y.Z below compat.cli <range>
                                                ↳ upgrade: npm i -g markup-cli@latest (or git+https install)
                                                ↳ refusing to proceed
                    |  ✗ binary missing from PATH
                                                ↳ install: `npm i -g markup-cli` (public phase) or git-based install while private
                                                ↳ without it: manual builds + uploads}
  {markup online:   ✓ connected to <url> @ <X.Y.Z> (satisfies compat.markup <range>)
                    |  ⚠ connected to <url> @ <X.Y.Z>, below compat.markup <range>
                                                ↳ degrading: many commands still work; upgrade the Markup server or pin this skill to an older tag
                    |  ⚠ connected to <url>, /api/version returned unknown
                                                ↳ degrading: server is too old to advertise its version
                    |  ✗ markup online not connected
                                                ↳ run: markup-cli connect <url>
                                                ↳ without it: companion-server hosting}
  {chrome:          ✓ Chrome MCP available (server: <server-name>)  |  ✗ no Chrome MCP server registered
                                              ↳ install on Claude Code: `claude mcp add chrome-devtools npx chrome-devtools-mcp@latest` (or Anthropic's claude-in-chrome plugin)
                                              ↳ install on Gemini CLI:  `gemini mcp add chrome-devtools npx chrome-devtools-mcp@latest`
                                              ↳ install on Codex CLI:   `codex mcp add chrome-devtools -- npx chrome-devtools-mcp@latest`
                                              ↳ without it: Phase 5 falls back to manual checklist}
  {cloudflared:     ✓ cloudflared available  |  — not installed
                                              ↳ install: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
                                              ↳ optional: expose the companion server publicly}
  {strategy:        ✓ react / antd visual + react-hook-form (saved 2026-05-21)
                                              ↳ type "change strategy" to re-pick
                    |  — first run: Phase 0 will run to pick a framework + strategy}

Repository: https://github.com/AlexandreCamillo/markup-cli-toolkit
```

Then proceed.

## Phase 0 — Project discovery + framework + strategy choice

Runs **once per feature**, after the capability matrix disclaimer and before Phase 1. Skipped on resume if `.markup-design/scratch/strategy.json` already exists for the current cwd and the user does not type `change strategy`.

### 0.1 Detect framework, then tooling

Read `package.json` at cwd. Collect `dependencies` + `devDependencies` into a single set.

**Step 1 — Framework detection (in priority order):**

| Marker in deps | Framework |
|---|---|
| `@angular/core` | `angular` |
| `react` | `react` |
| `vue` | `vue` |
| `svelte` | `svelte` |
| `solid-js` | `solid` |
| `jquery` | `jquery` |
| (nothing above) | `vanilla` |

If 2+ markers match (e.g., `react` + `jquery` in a legacy migration), prompt the user:

> Detectei múltiplos frameworks: `react`, `jquery`. Qual é o primary pra essa feature? (react / jquery)

**Step 2 — Ecosystem detection (scoped to the chosen framework):**

| Framework | UI libs | Form libs | Styling | Animation | Icons |
|---|---|---|---|---|---|
| `react` | `antd`, `@radix-ui/react-*`, `@mui/material`, `@chakra-ui/*`, `@mantine/*`, `react-bootstrap`, `@headlessui/react` | `react-hook-form`, `formik`, `@radix-ui/react-form` | `tailwindcss`, `styled-components`, `@emotion/*`, `sass`/`scss` | `framer-motion`, `motion`, `@motionone/*` | `lucide-react`, `@phosphor-icons/react`, `react-icons`, `@radix-ui/react-icons` |
| `vue` | `vuetify`, `naive-ui`, `element-plus`, `primevue`, `quasar`, `@nuxt/ui` | `vee-validate`, `@vuelidate/core`, `@formkit/vue` | `tailwindcss`, `sass`/`scss` | `@vueuse/motion`, `gsap` | `@iconify/vue`, `lucide-vue-next`, `@phosphor-icons/vue` |
| `svelte` | `@skeletonlabs/skeleton`, `flowbite-svelte`, `sveltestrap`, `bits-ui`, `@melt-ui/svelte` | `sveltekit-superforms`, `felte`, `formsnap` | `tailwindcss`, `sass`/`scss` | (svelte built-ins: `svelte/animate`, `svelte/motion`) | `lucide-svelte`, `@iconify/svelte` |
| `angular` | `@angular/material`, `primeng`, `@ng-bootstrap/ng-bootstrap`, `@taiga-ui/core`, `@ionic/angular` | (built-in: `@angular/forms`) | `tailwindcss`, `sass`/`scss` | (built-in: `@angular/animations`) | `@angular/material/icon`, `@iconify/angular` |
| `solid` | `@kobalte/core`, `@hope-ui/solid`, `solid-ui` | `@modular-forms/solid` | `tailwindcss`, `solid-styled-components` | (Solid transitions built-in) | `solid-icons`, `@iconify-icon/solid` |
| `jquery` | `jquery-ui`, `bootstrap`, `foundation-sites`, `semantic-ui` | `jquery-validation`, `parsleyjs` | `bootstrap`, `foundation-sites`, plain CSS, `sass`/`scss` | (`jQuery.animate`, `gsap`) | `font-awesome`, Bootstrap icons |
| `vanilla` | (nenhum esperado) | (native `<form>` validation) | `tailwindcss` (se houver), plain CSS, `sass`/`scss` | (CSS animations, Web Animations API) | `font-awesome`, custom SVG |

Record version strings as printed in `package.json`.

### 0.2 Detect project rules

- **Agent guidelines file** — check, in priority order, for `AGENTS.md` → `CLAUDE.md` → `GEMINI.md` at cwd root. Use the **first one present**; ignore the others (their content is usually a copy/symlink). Extract section headers matching `/UI|UX|design|frontend|styling|render/i`. Capture the first 1-2 lines under each matching header for the strategy-prompt context. Don't try to render the whole file — just produce a one-line summary like `"client-side rendering only (AGENTS.md §17)"`, naming whichever file you actually read.
- If `docs/INDEX.md` exists → read it. List linked docs whose titles match `/UI|UX|design|frontend|component|style/i`. Don't auto-read those — list them to the user with an offer "want me to read these before proposing strategy?"
- If neither exists → skip silently. The strategy menu still works; it just has less context.

### 0.3 Compose the strategy menu (framework-aware)

The menu is dynamically generated based on the detected framework and ecosystem packages. Construction rules:

1. **Always include** a framework-appropriate "vanilla / minimal" baseline as the second-to-last option.
2. **Always include** `Outro (descreva)` as a free-text escape hatch as the last option.
3. For each detected ecosystem UI lib in the framework's column, add one canonical strategy option. If a matching form lib is also detected, add a second option that combines them.
4. If only Tailwind is detected (no UI lib): add `Headless + Tailwind utilities` ahead of the vanilla baseline.

Strategy IDs are framework-prefixed for uniqueness and clarity. Canonical IDs:

| Framework | Label | Strategy ID |
|---|---|---|
| `react` | antd ao máximo | `react-antd-max` |
| `react` | antd visual + react-hook-form | `react-antd-rhf` |
| `react` | Compor primitives @radix-ui | `react-radix-primitives` |
| `react` | MUI primitives nativamente | `react-mui-max` |
| `react` | MUI visual + react-hook-form | `react-mui-rhf` |
| `react` | Chakra primitives | `react-chakra-max` |
| `react` | Mantine primitives | `react-mantine-max` |
| `react` | Headless UI + Tailwind | `react-headlessui-tailwind` |
| `react` | react-bootstrap | `react-bootstrap-max` |
| `react` | Tailwind only (sem UI lib) | `react-vanilla-tailwind` |
| `react` | Native HTML/JSX + CSS | `react-vanilla` |
| `vue` | Vuetify ao máximo | `vue-vuetify-max` |
| `vue` | Vuetify + vee-validate | `vue-vuetify-vee` |
| `vue` | Element Plus | `vue-element-plus-max` |
| `vue` | Naive UI | `vue-naive-max` |
| `vue` | PrimeVue | `vue-primevue-max` |
| `vue` | Quasar | `vue-quasar-max` |
| `vue` | Tailwind only | `vue-vanilla-tailwind` |
| `vue` | Native SFC + CSS | `vue-vanilla` |
| `svelte` | Skeleton (Tailwind-based) | `svelte-skeleton-max` |
| `svelte` | Flowbite Svelte | `svelte-flowbite-max` |
| `svelte` | Sveltestrap (Bootstrap) | `svelte-sveltestrap-max` |
| `svelte` | Melt UI + Tailwind | `svelte-melt-tailwind` |
| `svelte` | Tailwind only | `svelte-vanilla-tailwind` |
| `svelte` | Native .svelte + CSS | `svelte-vanilla` |
| `angular` | Angular Material | `angular-material-max` |
| `angular` | PrimeNG | `angular-primeng-max` |
| `angular` | NG Bootstrap | `angular-ngbootstrap-max` |
| `angular` | Taiga UI | `angular-taiga-max` |
| `angular` | Tailwind only | `angular-vanilla-tailwind` |
| `angular` | Native template + CSS | `angular-vanilla` |
| `solid` | Kobalte + Tailwind | `solid-kobalte-tailwind` |
| `solid` | Hope UI | `solid-hope-max` |
| `solid` | Tailwind only | `solid-vanilla-tailwind` |
| `solid` | Native JSX + CSS | `solid-vanilla` |
| `jquery` | jQuery UI + Bootstrap | `jquery-ui-bootstrap` |
| `jquery` | Bootstrap + jQuery (sem jQuery UI) | `jquery-bootstrap-max` |
| `jquery` | jQuery puro + CSS | `jquery-vanilla` |
| `vanilla` | HTML + Tailwind | `vanilla-html-tailwind` |
| `vanilla` | HTML + plain CSS | `vanilla-html` |
| (any) | Outro (free-text) | `custom` |

For each invocation, only the rows whose framework matches `detected.framework` (plus the `(any)` row) are presented to the user. The menu typically shows 3-5 numbered options.

### 0.4 Present the menu

Format the prompt to the user as (React example):

```
Detectei o seguinte:
  · Framework:      react 18.3.1
  · UI libs:        antd 5.18.0
  · Forms:          react-hook-form 7.x
  · Styling:        styled-components 6.x
  · Animation:      framer-motion 11.x
  · Icons:          lucide-react 0.x
  · Project rules:  AGENTS.md menciona "client-side rendering only" (linha ~17)

Como você quer que eu modele a seção "Code API" dos DS files?

  1. antd ao máximo (Form.Item + Input + Button)
  2. antd visual + react-hook-form (Controller + antd Input)
  3. Tailwind only (sem UI lib)
  4. Native HTML/JSX + CSS
  5. Outro (descreva)

Resposta (1-5):
```

jQuery example:

```
Detectei o seguinte:
  · Framework:      jquery 3.7.x
  · UI libs:        bootstrap 5.x, jquery-ui 1.13.x
  · Forms:          jquery-validation 1.x
  · Styling:        sass

Como você quer que eu modele a seção "Code API" dos DS files?

  1. jQuery UI + Bootstrap (full kit)
  2. Bootstrap + jQuery (sem jQuery UI)
  3. jQuery puro + CSS
  4. Outro (descreva)

Resposta (1-4):
```

If the user picks "Outro" (custom), follow up with: `Descreva a estratégia em texto livre (ex.: "usar nossa lib interna @empresa/ui"):` and store the free-text under `freeText` in the JSON (with `chosen: "custom"`).

### 0.5 Persist the choice

Write `.markup-design/scratch/strategy.json`:

```json
{
  "framework": "react",
  "chosen": "react-antd-rhf",
  "label": "antd visual + react-hook-form",
  "detected": {
    "framework": "react@18.3.1",
    "uiLibs": ["antd@5.18.0"],
    "formLibs": ["react-hook-form@7.x"],
    "styling": ["styled-components@6.x"],
    "animation": ["framer-motion@11.x"],
    "icons": ["lucide-react@0.x"]
  },
  "projectRules": {
    "agentRules": { "source": "AGENTS.md", "summary": "exists; key rule: client-side rendering only" },
    "indexMd": "present; UI docs: frontend/INDEX.md"
  },
  "chosenAt": "2026-05-21T...",
  "freeText": null
}
```

`framework` is always set (even if `vanilla`). `chosen` is the framework-prefixed strategy ID. The two together resolve uniquely to one row in the §6 strategy-adaptation matrix of the bundled template.

Ensure `.markup-design/` is in `.gitignore` (existing behavior already covers this).

### 0.6 Resume mechanic

On subsequent skill invocations in the same cwd, if `.markup-design/scratch/strategy.json` exists, print:

```
Estratégia salva: antd visual + react-hook-form (escolhida 2026-05-21).
Continuar com ela? (sim / change / inspect)
```

- `sim` (or empty input or `y`) → skip Phase 0; proceed to feature setup.
- `change` → re-run 0.1-0.5; overwrite `strategy.json`.
- `inspect` → print the JSON contents and re-ask.

### 0.7 Phase 0 → Phase 1 gate

```
<HARD-GATE>
Do NOT invoke Phase 1 (brainstorming) until:
  - .markup-design/scratch/strategy.json exists, AND
  - It contains a non-null `framework` field, AND
  - It contains a non-null `chosen` field, AND
  - If `chosen === "custom"`, the `freeText` field is non-empty.
</HARD-GATE>
```

## The 6-phase workflow

State for each feature lives at `.markup-design/scratch/<feature-slug>/state.json` so a session can resume after a context reset. On invocation, ask whether to resume any in-flight feature or start fresh.

```
                ┌─────────────────────────────────────────────┐
                │  Phase 0: Discovery + framework + strategy  │
                │  detect package.json + agent rules + docs;  │
                │  present strategy menu; persist to          │
                │  .markup-design/scratch/strategy.json       │
                │  gate: strategy.json has framework + chosen │
                └─────────────────────┬───────────────────────┘
                                      │
                                      ▼
                ┌─────────────────────────────────────────────┐
                │  Phase 1: Design brainstorm + ideia mockup  │
                │  brainstorming (FASTPATH) + frontend-design │
                │  mockup gets the bundled tweaker panel      │
                │  iterates via Markup comments OR companion  │
                │  gate: user "aprovado" + tweaker JSON       │
                └─────────────────────┬───────────────────────┘
                                      │
                ┌─────────────────────▼───────────────────────┐
                │  Phase 2: Promote (bake + strip + reformat)  │
                │  ideia → DS file; tweaker scaffolding        │
                │  removed; locked choices baked literal;      │
                │  reformatted to bundled DS pattern           │
                │  gate: markup-cli check passes            │
                └─────────────────────┬───────────────────────┘
                                      │
                ┌─────────────────────▼───────────────────────┐
                │  Phase 3: Technical brainstorm               │
                │  brainstorming (arch/data/risks focus)       │
                │  pre-load: DS files affected, target code    │
                │  gate: tech-spec approved + branch check     │
                └─────────────────────┬───────────────────────┘
                                      │
                ┌─────────────────────▼───────────────────────┐
                │  Phase 4: Plan + execute                     │
                │  writing-plans (DS edits = first-class tasks)│
                │  + subagent-driven-development               │
                │  gate: tests pass, verification skill ok     │
                └─────────────────────┬───────────────────────┘
                                      │
                ┌─────────────────────▼───────────────────────┐
                │  Phase 5: Visual+behavior QA (optional)      │
                │  Chrome MCP: scenarios from State decision   │
                │  matrix table in the DS file vs live route   │
                │  loop fixes until parity (or documented      │
                │   exception)                                 │
                │  gate: parity reached                        │
                └─────────────────────┬───────────────────────┘
                                      │
                                      ▼
                                   DONE
```

## Phase 1 — Design brainstorm + ideia mockup (FASTPATH)

The intent of this phase is to produce a single self-contained HTML mockup that the user iterates on visually. Because the output is one file, parallel subagents are wasted overhead. The skill threads a `FASTPATH-DESIGN-PHASE` directive through every sub-skill invocation in this phase.

### Compose order

```
brainstorming  →  writing-plans  →  executing-plans  →  frontend-design
       │                │                  │                    │
       │                │                  │                    └─ produces mockup HTML with bundled tweaker
       │                │                  └─ runs INLINE (no subagent dispatch)
       │                └─ writes plan, no review pause
       └─ writes spec, asks design questions, no spec-review pause
```

### FASTPATH directive (passed verbatim to brainstorming and writing-plans)

> `FASTPATH-DESIGN-PHASE`: write the spec/plan to disk as usual, but do NOT pause to ask the user to review the spec or the plan. Proceed straight to the next step. For `executing-plans`, run inline — do not dispatch subagents (output is a single HTML mockup file).

Clarifying questions inside `brainstorming` (about the design itself) **stay**. Only the user-gate pauses between artifacts are removed.

### STRATEGY-CONTEXT directive (appended to brainstorming and frontend-design seeds)

> `STRATEGY-CONTEXT`: the chosen strategy is `<chosen>` (label: `<label>`, framework: `<framework>`). Consider this when proposing variants — do not propose three custom date pickers if the project already ships one via `<framework>`'s detected UI lib. The mockup is still static HTML; the strategy informs tone, variants, and affordances — not imports inside the mockup.

### Mockup contract (passed to frontend-design)

The mockup HTML must:

1. Be a self-contained file at `docs/design/mockups/<date>-<slug>-vN.html`.
2. Wrap the actual component subtree in `<div data-ds-component="<slug>">` (the tweaker uses this attribute to find the apply root).
3. Inline the bundled tweaker template verbatim — content of `templates/tweaker.html` (relative to this SKILL.md) inserted just before `</body>`.
4. Register options via `window.Tweaker.register({ title, slug, groups, apply })` where every meaningful design decision (variant, density, accent, copy variant, etc.) is exposed as an option. `apply(state, root)` maps option values to attribute/CSS-var/class assignments on the component root.

The agent reads `templates/tweaker.html` (via the harness's file-read tool — see Cross-harness tool reference at the top) and pastes it into the generated mockup. The tweaker template is one source of truth — do not regenerate it per feature.

### Tweaker public API (the mockup consumes this)

```js
window.Tweaker.register({
  title: 'Pricing Card',           // shown in tweaker header; optional
  slug: 'pricing-card',            // baked into copy-JSON output
  groups: [
    { name: 'Layout', options: [
      { id: 'variant',  label: 'Variant',  type: 'segmented',
        values: ['A','B','C'], default: 'A' },
      { id: 'density',  label: 'Density',  type: 'segmented',
        values: ['compact','comfortable'], default: 'comfortable' },
    ]},
    { name: 'Color', options: [
      { id: 'accent', label: 'Accent', type: 'color', default: '#3b82f6' },
    ]},
  ],
  apply(state, root) {
    root.dataset.variant = state.variant;
    root.dataset.density = state.density;
    root.style.setProperty('--accent', state.accent);
  },
});
```

Supported `type`s: `segmented` (one of `values`), `select` (one of `values`), `color`, `range` (with `min`/`max`/`step`), `text`, `toggle`.

The copy-JSON button at the top of the tweaker serializes the current state as:

```json
{ "slug": "<slug>", "version": 1, "choices": { ... } }
```

### Phase 1 hosting — how the user opens the mockup

#### `[se Markup online]` Upload to Markup

1. Run `markup-cli mockup new <slug>` for the first version, or `markup-cli mockup version <file>` for iterations.
2. The CLI returns a hosted URL.
3. Print the URL to the user. Iterate via the existing Markup comments flow:
   - `markup-cli comments list <file> --status open --json`
   - `markup-cli comments read <annotationId> --json`
   - Decide: edit mockup → `markup-cli mockup version`; clarify → `markup-cli comments reply --body`; push back → `markup-cli comments reply` + `markup-cli comments react --emoji 🤔`; no change → `markup-cli comments resolve`. After applying changes: `markup-cli comments react <messageId> --emoji ✅`.
   - Re-pause with the checkpoint pattern: `Mockup uploaded as <url>. Comment on Markup, then say "continue" when you want me to process the feedback.`

#### `[se Markup ausente]` Companion server fallback

Use the `brainstorming` skill's mini-server to host the mockup over HTTP.

**Once per session (before producing the first mockup):**

1. Locate `scripts/start-server.sh` by searching the harness-specific plugin path. Try each in order and use the first match:

   ```bash
   # Claude Code
   find ~/.claude/plugins -name start-server.sh -path '*brainstorming/scripts*' 2>/dev/null | head -1
   # Gemini CLI
   find ~/.gemini/extensions -name start-server.sh -path '*brainstorming/scripts*' 2>/dev/null | head -1
   # Codex CLI (no plugin manager — manual clone path)
   find ~/.codex/superpowers -name start-server.sh -path '*brainstorming/scripts*' 2>/dev/null | head -1
   ```

   If none match, invoke the brainstorming sub-skill via the harness's mechanism (Claude Code: `Skill: superpowers:brainstorming`; Gemini CLI: `activate_skill('superpowers:brainstorming')`; Codex CLI: read the SKILL.md inline) and use the printed base directory under `scripts/`.
2. Start the server in the background:

   ```bash
   <base>/scripts/start-server.sh \
     --project-dir <repo-root> \
     --host 0.0.0.0 \
     --url-host localhost
   ```

3. Read `<repo-root>/.superpowers/brainstorm/<session>/state/server-info` to recover `url`, `screen_dir`, `state_dir` if stdout was not captured. Map keys to camelCase when writing state.json: `screen_dir` → `screenDir`, `state_dir` → `stateDir`.
4. If `.superpowers/` is not already in `.gitignore`, append it.
5. Persist `{ url, screenDir, stateDir }` into `.markup-design/scratch/<slug>/state.json` under `companionServer`.

**Optional Cloudflare quick tunnel** — only when `cloudflared` is on PATH. Ask the user **before** printing the URL:

> Detectei `cloudflared` instalado. Quer expor o servidor via Cloudflare quick tunnel? Útil pra:
> - Rodar o harness numa VPS sem browser local
> - Controlar remotamente pelo celular (claude remote-control)
>
> ⚠ URL pública — não faça tunnel de mockup sensível. Quick tunnels rotacionam URL a cada restart.
>
> (s/n)

If `s`:

1. Pick a writable log path: `<repo-root>/.markup-design/scratch/<slug>/cloudflared.log`. Run `cloudflared tunnel --url http://localhost:<port> > <log> 2>&1 & echo $! > <pid-file>` so output is captured and the PID is preserved.
2. Poll `<log>` for a line matching `https://[a-z0-9-]+\.trycloudflare\.com` (on Claude Code: use the `Monitor` tool against the background bash if you started it via `Bash` with `run_in_background: true`; on Gemini CLI / Codex CLI: poll with `tail -n +1 -f <log>` until the regex matches, capped by timeout). Timeout 15s. If no URL appears: read the PID from `<pid-file>` and `kill` it; print a warning; fall back to localhost.
3. Store `tunnelUrl` into `state.json:companionServer`. Persist the `pid-file` path so a later "restart tunnel" step can locate and kill the prior process.
4. Print the tunnel URL as the **primary** link and the localhost URL as a footnote:

   > Mockup em: `https://<random>.trycloudflare.com` (tunnel ativo)
   > Local fallback: `http://localhost:<port>`

**Per mockup version:**

1. Write `docs/design/mockups/<date>-<slug>-vN.html` (canonical).
2. Write the same content to `<screenDir>/<date>-<slug>-vN.html` (server picks newest by mtime). Write the file directly — do not symlink.
3. Tell the user to refresh the URL.

**Server lifecycle:** the companion server auto-exits after 30 minutes of inactivity. Before each version write, check that `<stateDir>/server-info` exists and `<stateDir>/server-stopped` does NOT exist. If the server is gone, restart it and re-print the URL (and re-launch the tunnel if it was active).

#### `[se nem Markup nem companion]` Pure `file://` fallback

If the companion server cannot be started (e.g., the `brainstorming` skill is missing or `start-server.sh` fails), print the absolute path of the mockup HTML and tell the user to open `file://<abs-path>` in a browser, with a warning that `localStorage` may behave inconsistently under `file://`.

### Phase 1 approval gate

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

When the user approves:

1. Print: `Aprovado. Clique 📋 Copy JSON no tweaker do mockup atual e cole aqui pra eu travar as escolhas.`
2. Wait for the paste.
3. Parse and validate the JSON. Expected shape: `{ slug, version, choices }` with `version === 1` (matches the `VERSION` constant in `templates/tweaker.html`; bump there and here together if the schema changes).
4. Write `state.json` (see schema below).
5. `[se Markup online]` close any still-open threads: `markup-cli comments resolve <id> --body "closed by approval"`.
6. Ask the user: *"Is this a new DS component, a variant of an existing one, or composition of existing components? If new, what slug?"*

## Phase 2 — Promote (bake locked choices, strip tweaker)

1. **`[se CLI]`** Run `markup-cli promote <mockup-file> --component <slug>` — copies the mockup into `docs/design/design-system/NN-<slug>.html`, ensures the `data-ds-component` marker, uploads to the DS folder, runs `build`, calls `sync-index`.

   **`[manual fallback]`** Walk the user through: copy the file by hand to `docs/design/design-system/NN-<slug>.html` (next NN); make sure the marker is present; skip uploads if they don't have the CLI installed.

2. **Bake locked choices + strip tweaker** (skill-side, via the harness's file-edit tool):
   - Delete the entire `<style>...</style>` block scoped to `.mdtk-tweaker`.
   - Delete the `<div class="mdtk-tweaker" data-mdtk-tweaker>...</div>` block.
   - Delete the IIFE `<script>` that defines `window.Tweaker`.
   - Delete the `Tweaker.register({...})` call in the mockup's component script.
   - Read the original `apply(state, root)` function body. Reproduce each assignment with literal values from `state.json:tweakerChoices`. Examples:
     - `root.dataset.variant = state.variant;` with `choices.variant === 'B'` → add `data-variant="B"` to the component root element.
     - `root.style.setProperty('--accent', state.accent);` with `choices.accent === '#3b82f6'` → add `style="--accent:#3b82f6"` to the component root element (merging with any existing inline `style`).
     - `root.classList.add(state.theme);` with `choices.theme === 'dark'` → add `class="... dark"` to the component root.
   - Once all assignments are baked, delete the `apply` function definition (it is dead code without the tweaker).

3. **Reformat DS file to follow the bundled pattern** (template-driven):
   - In parallel: read `templates/ds-component-pattern.md` end-to-end (path relative to this SKILL.md) and read `.markup-design/scratch/strategy.json` to recover `framework` and `chosen`.
   - Restructure the DS file content to have the required sections (1, 4, 7, 8) and applicable optional sections (2, 3, 5, 6) as defined in the bundled template.
   - Component implemented as a single CSS recipe with state variants via `data-attrs`.
   - Section 4 ("Code API") generated using the bundled template's §6 adaptation guide for the matching `(framework, chosen)` row, and §9 example as the literal starting snippet.
   - States not natively covered by the chosen lib → flag "(custom)" in the matrix + bullet in API + comment in CSS.
   - Keep the script as an IIFE writing only to `window.DS.<slug>`.
   - Set front-matter `js: ported` (unchanged from previous behavior).

4. **`[se CLI]`** `markup-cli sync-index`.

   **`[manual fallback]`** Tell the user the DS file is on disk and the index is stale; offer to re-run this step later if they install the CLI.

5. **`[se CLI]`** Run `markup-cli check --build` — must exit 0.

   **`[manual fallback]`** Print the structural invariants (marker present, IIFE in script, single root element, no `Tweaker.register` left) and ask the user to confirm.

6. **Commit** on branch `design/<slug>` (create if needed):

   ```
   feat(ds): promote <slug> from ideia → DS (locked: <key>=<value>, <key>=<value>)
   ```

### Phase 2 gate

```
<HARD-GATE>
Do NOT invoke brainstorming for tech spec until:
  - markup-cli check --build exited 0 (or manual structural review confirmed by user
    if CLI absent), AND
  - The DS file has been committed.
</HARD-GATE>
```

## Phase 3 — Technical brainstorm

1. **Invoke `brainstorming`** scoped to *implementation*. Seed it with:
   - The DS file(s) affected (read each one).
   - The target area of the codebase (Claude Code: dispatch the `Explore` agent; Gemini CLI: `@generalist` for the search; Codex CLI: `spawn_agent` if `multi_agent = true`, otherwise direct `grep`/`glob`).
   - Existing patterns in the codebase.
   - Schema/data flow constraints.
   - Risks (concurrency, edge cases, performance).
   - `STRATEGY-CONTEXT`: chosen strategy is `<chosen>` (framework: `<framework>`). Reflect this in arch/data/risks discussion (no custom date pickers if `<framework>`'s lib ships one, etc.).

2. **Output:** `docs/superpowers/specs/<date>-<slug>-tech-spec.md`. This must NOT re-design UI/UX — Phase 1 + Phase 2 settled that. If during Phase 3 a technical reality forces a design change, surface it explicitly and confirm with the user before going back to Phase 1.

3. **Wait for explicit user approval** of the tech spec.

### Phase 3 → 4 branch check

After tech-spec approval and **before** invoking `writing-plans`:

1. Run `git rev-parse --abbrev-ref HEAD` to learn the current branch.
2. Run `git rev-parse --show-toplevel` to learn the repo root and derive `<repo-name>` (basename).
3. Run `git status --porcelain` to detect a dirty tree.
4. **If current branch is `main` or `master`:**

   Print:

   > Você está em `<branch>`. Recomendo não executar o plano direto na branch principal. Escolha:
   >
   > **A**. Criar branch `feature/<slug>` aqui mesmo
   > **B**. Criar worktree em `../<repo-name>-<slug>/` e executar lá
   > **C**. Seguir mesmo assim na branch atual (não recomendado)
   >
   > [se tree sujo] ⚠ Working tree has uncommitted changes — recomendo commitar ou stashar antes de A/B.

   - **A**: `git checkout -b feature/<slug>` → continue in same cwd.
   - **B**: prefer invoking the `using-git-worktrees` sub-skill if available — Claude Code: `Skill: superpowers:using-git-worktrees`; Gemini CLI: `activate_skill('superpowers:using-git-worktrees')`; Codex CLI: read `~/.codex/superpowers/skills/using-git-worktrees/SKILL.md` inline. If the sub-skill is unavailable, fall back to direct shell: `git worktree add ../<repo-name>-<slug> -b feature/<slug>`. Change cwd to the new worktree path before continuing.
   - **C**: continue on current branch, print `Continuando em <branch> — não recomendado.`

5. **If current branch is anything else:** print `Executando em \`<branch>\`. ✓` and continue.

### Phase 3 gate

```
<HARD-GATE>
Do NOT invoke writing-plans until BOTH of the following are true:
  - User explicitly approved the tech spec at docs/superpowers/specs/<date>-<slug>-tech-spec.md.
  - Branch check ran: if HEAD was main/master, user picked A/B/C from the branch prompt;
    if A or B, the branch/worktree was created and cwd is in the right place.
</HARD-GATE>
```

## Phase 4 — Plan + execute

1. **Invoke `writing-plans`** with extra instruction:

   > DS adjustments are first-class plan tasks. If the implementation requires changes to a DS component, include explicit tasks to edit the DS file (following `templates/ds-component-pattern.md`, with the Code API section adapted to the strategy in `.markup-design/scratch/strategy.json`), run `markup-cli check --build` (or the manual structural review when CLI is absent), and commit with `feat(ds): amend <slug> (driven by <reason>)`. Any task that edits a DS file MUST be followed by `markup-cli check --build` in the plan. Do NOT include tasks that update QA sidecars or full-prototype files — those are no longer part of the workflow.

2. **Execute via `subagent-driven-development`** (or `executing-plans` — ask the user). Unlike Phase 1, parallel subagents are useful here because plan tasks usually touch independent files.

### Phase 4 gate

```
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

## Phase 5 — Visual+behavior QA

Driven by the **State decision matrix table inside the DS file** (no sidecar).

### When Chrome MCP is available

(Chrome MCP tools are referenced below by their **capability** — the actual tool name depends on the registered server and harness; see § "Chrome MCP across harnesses" at the top of this file.)

1. **Start the dev server.** Read `.markup-design/connection.json` → `devServer.command` and `devServer.url`. Run the command in the background (Claude Code: `Bash` with `run_in_background: true`; Gemini CLI / Codex CLI: native shell with `&` + log file); poll the URL until it responds.
2. **For each affected DS component:** open two Chrome MCP tabs in parallel (the two URLs are independent):
   - Live route: `<devServer.url>/<feature-path>`
   - DS reference: `file://<repo>/docs/design/design-system/NN-<slug>.html`
3. **Extract scenarios from the State decision matrix:**
   - Parse the `<table class="matrix">` inside the DS HTML (simple regex on the file contents, **or** evaluate JS against the DS tab using the registered Chrome MCP server's "evaluate / run JavaScript" tool — `mcp__claude-in-chrome__javascript_tool` on Claude+claude-in-chrome, `evaluate_script` on `chrome-devtools-mcp` regardless of harness).
   - Each row → one scenario: `name = state column`, `trigger = trigger column`, `expectedVisual = visual column`, `expectedAria = aria column`.
   - For each scenario:
     - Apply the trigger on the live route via Chrome MCP (click, focus, type, hover — infer from the trigger text; if unclear, mark `manual: <description>` and report).
     - Apply the same trigger on the DS file (typically a "Replay" button in the "Per-state deep dive" section, if present; otherwise visual observation from the all-states grid).
     - Screenshot both. Report visual or DOM-state delta.
4. **Report drift.** For each delta:
   - "DS canonical → fix code" (default): edit code to match. Re-run.
   - "Implementation revealed DS bug → fix DS" (rare): edit the DS file (following the bundled template), run `markup-cli check --build`. No `upload-prototype`. No QA sidecar.

### Phase 5 gate

```
<HARD-GATE>
Do NOT declare the feature shipped until one of:
  - Chrome MCP QA reported zero deltas, OR
  - User said "QA passes" after the manual checklist, OR
  - User explicitly documented an accepted exception (written into the tech spec).
</HARD-GATE>
```

### Manual checklist fallback (no Chrome MCP)

Print:

\`\`\`
Chrome MCP não conectado. Visual+behavior QA é manual.

URLs pra comparar lado-a-lado:
  · Live feature:  <devServer.url>/<feature-path>
  · DS reference:  file://<repo>/docs/design/design-system/NN-<slug>.html

Pra cada linha da "State decision matrix" no DS file:
  · Aplicar o trigger no live (clique, hover, input — conforme a coluna trigger).
  · Confirmar que o visual no live bate com a coluna "visual" do DS.
  · Confirmar o aria/contract bate com a coluna "aria" do DS.

Edge cases extras (não estão na matrix mas valem checar):
  · Long text (line-clamp, overflow)
  · Empty state (se aplicável)
  · Reduced motion (DevTools → Rendering → "Emulate CSS prefers-reduced-motion")

Diga "QA passes" quando estiver satisfeito; "QA fails" + descreva o drift.
\`\`\`

## Invariants

- Never advance a phase without satisfying its `<HARD-GATE>`.
- Never modify `src/` during Phase 1-2.
- Never modify DS files during Phase 3.
- Always run `markup-cli check --build` before declaring Phase 2 done (or the manual structural review when CLI is absent). Phase 4 completion is gated by `verification-before-completion` AND, if any DS file was edited during Phase 4, by `markup-cli check --build` as well — DS edits never ship un-validated.
- Never create Markup folders/projects without user approval.
- The bundled tweaker template at `templates/tweaker.html` is the single source of truth — never regenerate it per feature; only Read+inline.
- The bundled DS pattern template at `templates/ds-component-pattern.md` is the single source of truth for DS file structure — Read it before writing or editing any DS file.
- Strategy choice persists in `.markup-design/scratch/strategy.json`. Read it before writing the "Code API" section of any DS file. Never assume a strategy from `package.json` on-the-fly — always go through Phase 0.
- Never upload prototype or write full-prototype files (no `markup-cli upload-prototype` invocation, no edits to `_template.html` / `_glue.js` / `full-prototype/index.html`).
- Never create or update `<slug>.qa.js` sidecars. The skill ignores any existing sidecars in consumer projects.
- Write `state.json` to `.markup-design/scratch/<feature-slug>/` after every gate so the workflow can resume after a context reset.

## State file

`.markup-design/scratch/<slug>/state.json`:

```json
{
  "slug": "pricing-card",
  "phase": "phase-2-promote",
  "lastUpdated": "2026-05-21T...",
  "mockupFile": "docs/design/mockups/2026-05-21-pricing-card-v3.html",
  "dsFiles": ["docs/design/design-system/21-pricing-card.html"],
  "framework": "react",
  "strategy": "react-antd-rhf",
  "tweakerChoices": { "variant": "B", "density": "compact", "accent": "#3b82f6" },
  "lockedAt": "2026-05-21T...",
  "companionServer": {
    "url": "http://localhost:52341",
    "tunnelUrl": "https://random-words.trycloudflare.com",
    "screenDir": ".superpowers/brainstorm/12345-1706000000/content",
    "stateDir": ".superpowers/brainstorm/12345-1706000000/state",
    "pidFile": ".markup-design/scratch/<slug>/cloudflared.pid"
  },
  "notes": "Phase 2 complete. Tech brainstorm next."
}
```

- `framework`: copied from `.markup-design/scratch/strategy.json:framework` at the first `state.json` write of this feature. Audit trail of which framework was active.
- `strategy`: copied from `.markup-design/scratch/strategy.json:chosen` at the first `state.json` write of this feature. Audit trail of which strategy was active.
- `tweakerChoices`: `null` before Phase 1 approval; flat object of `id → value` after.
- `companionServer`: `null` when Markup is online or before the first mockup write; populated when the local server is used.
- `companionServer.tunnelUrl`: `null` if the user declined the Cloudflare tunnel or `cloudflared` is absent.
- `companionServer.pidFile`: path to the file that holds the cloudflared background-process PID. `null` if the tunnel is not active. Used on resume to kill the prior tunnel before relaunching.

## Resuming an in-flight feature

On invocation, list any `.markup-design/scratch/*/state.json` and offer to resume. On resume:

1. Read the file. Determine the current phase from `phase`.
2. Also read `.markup-design/scratch/strategy.json`. Compare both fields:
   - If `state.json.framework ≠ strategy.json.framework`: prompt `This feature was started under framework "<old>"; project is now "<new>". Continue with the original ("<old>"), or restart Phase 0 to re-pick strategy?` Default: continue with original.
   - If `state.json.strategy ≠ strategy.json.chosen` (same framework): prompt `This feature was started under strategy "<old>"; current default is "<new>". Continue with feature's original ("<old>"), or migrate to current ("<new>")?` Default: keep the feature's original.
3. If `companionServer` is set: check `<stateDir>/server-info` exists and the URL responds. If not, restart the server. If `tunnelUrl` was set, read `pidFile`, `kill` that PID (ignore errors if the process is gone), then relaunch the tunnel and overwrite `pidFile`.
4. Tell the user where you are in the workflow and continue from the next step of that phase.

Update `state.json` after every gate via the harness's file-write tool.
