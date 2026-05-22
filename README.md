# design-skills

Superpowers-compatible skills for the design-feature workflow. Distributed via this GitHub repo, not npm — your harness's plugin manager clones it directly.

This repo ships two skills:

| Skill | Purpose |
|---|---|
| [`design-feature`](./skills/design-feature/SKILL.md) | Orchestrates the full feature-development workflow: design brainstorm + ideia mockup → promotion to Design System → tech brainstorm → plan + execute → visual+behavior QA. |
| [`bootstrap-design-system`](./skills/bootstrap-design-system/SKILL.md) | One-shot bootstrap that extracts a draft Design System from an existing app's running UI, so the workflow can be adopted on projects that already have code. |

Bundled templates the `design-feature` skill reads at runtime:

- `templates/tweaker.html` — inlined into every ideia mockup; provides the draggable tweaker panel + Copy JSON button.
- `templates/ds-component-pattern.md` — the pattern every DS file follows after promotion; includes a framework × strategy adaptation guide for the "Code API" section.

## Compatibility

Each skill declares its minimum supported `markup-cli` and Markup server versions in SKILL.md frontmatter:

```yaml
compat:
  cli: ">=0.1.0"
  markup: ">=0.2.0"
```

At startup the skill runs `markup-cli doctor --json` and refuses to proceed if `cli.version` is below `compat.cli`. The Markup-server version is enforced softer (degrade-with-warning) so the offline flows of the skill remain available even against an out-of-date Markup.

| design-skills tag | Min markup-cli | Min Markup |
|---|---|---|
| v0.5.0 | 0.1.0 | 0.2.0 |

## Dependencies

Both skills are **hard-dependent on the [superpowers](https://github.com/obra/superpowers) plugin** (they invoke `brainstorming`, `frontend-design`, and `writing-plans`).

Soft dependencies (skill degrades gracefully when absent):

- **[`markup-cli`](https://github.com/AlexandreCamillo/markup-cli)** — for build, sync-index, mockup uploads, comment iteration. Without it, the skill walks the user through manual equivalents.
- **A connected [Markup](https://markup.alego.cloud) instance** — for visual mockup hosting and comment-based iteration. Without it, iteration falls back to terminal-only.
- **Chrome MCP** (`chrome-devtools-mcp` from Google or `claude-in-chrome` from Anthropic) — for visual+behavior QA. Without it, `design-feature` Phase 5 prints a manual checklist; `bootstrap-design-system` refuses to run unless the user explicitly opts into the code-only fallback.

## Install

### Claude Code

`design-skills` ships as a single-plugin marketplace. Add the marketplace and install:

```bash
claude plugin marketplace add AlexandreCamillo/design-skills
claude plugin install design-skills
```

Restart Claude Code. The skills appear in the available-skills list.

To pin to a specific tag: `AlexandreCamillo/design-skills@v0.5.0`.

### Gemini CLI

```bash
gemini extensions install AlexandreCamillo/design-skills
```

The skills become discoverable via `activate_skill('design-feature')` and `activate_skill('bootstrap-design-system')`. The skills' own cross-harness tool-mapping table (top of each `SKILL.md`) tells the model which Gemini tools (`read_file`, `write_file`, `replace`, `run_shell_command`, `grep_search`, `glob`, `@generalist`) correspond to the Claude Code names used in the body.

### Codex CLI

Codex ships a native `skill-installer` skill (from [`openai/skills`](https://github.com/openai/skills)). Tell Codex in chat:

> Use skill-installer to install `design-feature` and `bootstrap-design-system` from `AlexandreCamillo/design-skills` (paths `skills/design-feature` and `skills/bootstrap-design-system`).

Codex resolves the skill-installer, downloads both SKILL.md trees into `~/.codex/skills/`, and they become discoverable on the next restart. To pin a tag, add `--ref v0.5.0` to the request.

Each `SKILL.md` carries a cross-harness reference table that tells the model which Codex equivalents to use for `Read`/`Write`/`Edit`/`Bash` (Codex's native file/shell tools), `Skill` invocation, and subagent dispatch (`spawn_agent`, requires `multi_agent = true` in `~/.codex/config.toml`).

If your Codex version is older and doesn't have `skill-installer`, fall back to a manual clone:

```bash
git clone https://github.com/AlexandreCamillo/design-skills ~/.codex/skills/design-skills
```

### Chrome MCP setup (any harness)

For Phase 5 visual QA in `design-feature` and Step C snapshot in `bootstrap-design-system`:

```bash
# Claude Code
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest
# Gemini CLI
gemini mcp add chrome-devtools npx chrome-devtools-mcp@latest
# Codex CLI (writes to ~/.codex/config.toml)
codex mcp add chrome-devtools -- npx chrome-devtools-mcp@latest
```

### Other harnesses

Each `SKILL.md` is plain Markdown with YAML frontmatter — drop it wherever your harness loads skills (OpenCode, Cursor, Copilot CLI — see each one's docs for the expected path). The cross-harness tool reference at the top of each `SKILL.md` covers Claude Code, Gemini CLI, and Codex CLI explicitly; for other harnesses, the model should translate using the harness's own documentation.

## Validate skills (developer task)

```bash
node validate.mjs
# or: npm test (alias)
```

The validator checks frontmatter shape (including `compat.cli` + `compat.markup` semver ranges), body content, that every `markup-cli <cmd>` reference resolves to a real CLI command, and that bundled templates are present.

## Distribution model

These skills are distributed via the GitHub repo, not npm. Plugin managers in each harness clone the repo directly (Claude Code via `claude plugin install`, Gemini CLI via `gemini extensions install`, Codex CLI via `git clone`). There is no `design-skills` npm package — skills don't import code; they read instructions, so npm adds nothing over a tagged git ref.

## License

MIT
