# design-skills

Keep your **Design System and your code in sync** as you build features. design-skills is a pair of agent skills that wrap the loop your coding agent already runs — brainstorm, mockup, promote, plan, execute, QA — so the DS file and the implementation never drift apart.

## Quickstart

Install design-skills in your harness: [Claude Code](#claude-code), [Codex CLI](#codex-cli), [Gemini CLI](#gemini-cli), [Other harnesses](#other-harnesses).

Then ask your agent to design or build a feature with a visible UI — the `design-feature` skill takes over from there.

## How it works

You ask the agent for a new feature. The skill takes over.

It **detects the framework + ecosystem** of the project (React + antd + react-hook-form, Vue + Vuetify, jQuery + Bootstrap, …) and asks you which strategy to use for the "Code API" of every component. That choice is persisted and binding for the rest of the feature. Greenfield projects (empty / no `package.json`) get a separate prompt to pick the stack manually.

It then **brainstorms the design**. The agent's `brainstorming` skill writes a spec; `frontend-design` produces a single self-contained HTML mockup. Every meaningful design decision (variant, density, accent, copy variant, …) becomes a knob on a draggable tweaker panel inlined in the mockup. You iterate visually; the panel exports your locked choices as JSON.

When you approve, it **promotes the mockup into a canonical DS file** under `docs/design/design-system/`, baking the locked choices as attributes/CSS-vars and reformatting the file to a pattern that includes a State decision matrix and a Code API section adapted to your strategy.

Then it **plans + executes the implementation** via the agent's `writing-plans` + `subagent-driven-development` skills, with DS-file edits as first-class tasks.

Finally, it **QAs the live route against the DS file** via Chrome MCP — opening both side-by-side, applying the triggers from the State decision matrix, and reporting deltas until parity (or a documented exception).

If a session ends mid-loop, the skill resumes from `.markup-design/scratch/<slug>/state.json` after a context reset.

For projects that already have shipped code, the **`bootstrap-design-system`** skill extracts a draft DS from the running UI before the design loop begins.

## Installation

Installation differs by harness. If you use more than one, install design-skills separately for each.

### Claude Code

design-skills ships as a single-plugin marketplace.

- Register the marketplace and install:

  ```bash
  claude plugin marketplace add AlexandreCamillo/design-skills
  claude plugin install design-skills
  ```

- Restart Claude Code. The skills appear in the available-skills list.

- To pin a tag: `AlexandreCamillo/design-skills@v0.5.0`.

### Codex CLI

Codex ships a native `skill-installer` skill (from [`openai/skills`](https://github.com/openai/skills)).

- Tell Codex in chat:

  > Use skill-installer to install `design-feature` and `bootstrap-design-system` from `AlexandreCamillo/design-skills` (paths `skills/design-feature` and `skills/bootstrap-design-system`).

- The skills install into `~/.codex/skills/` and become discoverable on the next restart. Add `--ref v0.5.0` to the request to pin a tag.

- Fallback for older Codex versions without `skill-installer`:

  ```bash
  git clone https://github.com/AlexandreCamillo/design-skills ~/.codex/skills/design-skills
  ```

### Gemini CLI

- Install the extension:

  ```bash
  gemini extensions install AlexandreCamillo/design-skills
  ```

- The skills become discoverable via `activate_skill('design-feature')` and `activate_skill('bootstrap-design-system')`.

### Other harnesses

Each `SKILL.md` is plain Markdown with YAML frontmatter — drop it wherever your harness loads skills (OpenCode, Cursor, Copilot CLI). The cross-harness tool reference at the top of each `SKILL.md` covers Claude Code, Gemini CLI, and Codex CLI explicitly; for others, the model translates using the harness's own docs.

## Browser automation setup (per harness)

Phase 5 visual QA in `design-feature` and Step C snapshot in `bootstrap-design-system` need the agent to drive a real browser. Each harness has its own preferred path.

### Claude Code — Claude for Chrome extension (preferred)

1. Install the [Claude for Chrome extension](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn) (Chrome Web Store, v1.0.36+).
2. Launch with `claude --chrome`, or run `/chrome` inside an existing session. Toggle "Enabled by default" if you want it always on (uses more context).
3. The skill auto-detects tools under `mcp__claude-in-chrome__*` and uses them for Phase 5.

Requires Claude Code 2.0.73+; Chrome or Edge (Brave/Arc/WSL not supported). Fallback for unsupported environments:

```bash
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest
```

### Gemini CLI

```bash
gemini mcp add chrome-devtools npx chrome-devtools-mcp@latest
```

Gemini CLI v0.37+ also exposes a `@browser_agent` shortcut on top of the same server — the skill doesn't depend on it, but you can use it directly from the prompt.

### Codex CLI

```bash
codex mcp add chrome-devtools -- npx chrome-devtools-mcp@latest
```

(Writes to `~/.codex/config.toml`.) Codex's own Chrome extension is currently a Codex-app-only feature and is not exposed to the CLI — `chrome-devtools-mcp` is the only path for the CLI today.

## The 6-phase workflow

1. **Discovery + framework + strategy.** Detect `package.json`, agent guidelines, project docs. Present a framework-aware strategy menu. Persist to `.markup-design/scratch/strategy.json`. Greenfield projects get a separate manual-pick prompt.
2. **Design brainstorm + ideia mockup.** `brainstorming` (FASTPATH) + `frontend-design`. Mockup gets the bundled tweaker panel. Iterates via Markup comments or the companion server. Gate: user approves + pastes tweaker JSON.
3. **Promote.** Bake locked tweaker choices into the mockup, strip the tweaker scaffolding, reformat into a DS file under `docs/design/design-system/`. Gate: `markup-cli check --build` passes.
4. **Technical brainstorm.** `brainstorming` scoped to implementation, seeded with the DS files affected and the target code. Gate: tech spec approved + branch is not main/master.
5. **Plan + execute.** `writing-plans` (DS edits as first-class tasks) + `subagent-driven-development`. Gate: tests pass + `verification-before-completion` invoked + any DS edits re-validated.
6. **Visual + behavior QA.** Chrome MCP opens the live route + DS file side-by-side. Scenarios derive from the DS file's State decision matrix. Gate: zero drift or a documented exception.

Each gate writes `state.json` so the workflow resumes cleanly after a context reset.

## What's inside

| Skill | Purpose |
|---|---|
| [`design-feature`](./skills/design-feature/SKILL.md) | The 6-phase workflow above. Use when designing or building a feature with a visible UI. |
| [`bootstrap-design-system`](./skills/bootstrap-design-system/SKILL.md) | One-shot DS extraction from a running app's UI, for projects that already have code. |

Bundled templates the skills read at runtime:

- `templates/tweaker.html` — inlined into every ideia mockup; provides the draggable tweaker panel + Copy JSON button.
- `templates/ds-component-pattern.md` — the pattern every DS file follows after promotion; includes a framework × strategy adaptation guide for the "Code API" section.

## Dependencies

Hard dependency: the **[superpowers](https://github.com/obra/superpowers)** plugin. The skills invoke `brainstorming`, `frontend-design`, and `writing-plans`. If superpowers is not detected, design-skills refuses to run.

Soft dependencies (skill degrades gracefully):

- **[`markup-cli`](https://github.com/AlexandreCamillo/markup-cli)** — for build, sync-index, mockup uploads, comment iteration. Without it, the skill walks the user through manual equivalents.
- **A connected [Markup](https://markup.alego.cloud) instance** — for hosted mockups + comment iteration. Without it, the companion server serves mockups over HTTP locally (with optional Cloudflare quick tunnel).
- **Chrome MCP** (Claude for Chrome on Claude Code; `chrome-devtools-mcp` elsewhere). Without it, `design-feature` Phase 5 prints a manual checklist; `bootstrap-design-system` refuses to run unless the user opts into a code-only fallback.

### Compatibility

Each skill declares its minimum supported `markup-cli` and Markup server versions in SKILL.md frontmatter:

```yaml
compat:
  cli: ">=0.1.0"
  markup: ">=0.2.0"
```

| design-skills tag | Min markup-cli | Min Markup |
|---|---|---|
| v0.5.0 | 0.1.0 | 0.2.0 |

At startup the skill runs `markup-cli doctor --json` and refuses to proceed if `cli.version` is below `compat.cli`. The Markup-server version is enforced softer (degrade-with-warning) so the offline flows remain available against an out-of-date server.

## Contributing

Validate skills before sending a PR:

```bash
node validate.mjs
# or: npm test
```

The validator checks frontmatter shape (including `compat.cli` + `compat.markup` semver ranges), body content, that every `markup-cli <cmd>` reference resolves to a real CLI command, and that bundled templates are present.

## Distribution model

These skills are distributed via the GitHub repo, not npm. Each harness's plugin manager pulls the repo directly: Claude Code via `claude plugin install`, Gemini CLI via `gemini extensions install`, Codex CLI via the native `skill-installer`. There is no `design-skills` npm package — skills don't import code; they read instructions, so npm adds nothing over a tagged git ref.

## License

MIT
