# README redesign — design spec

**Date:** 2026-05-26
**Author:** brainstorming session (AlexandreCamillo)
**Status:** approved for implementation planning

## Goal

Rewrite `README.md` to be **simpler to understand**, **more visual**, and **clearer about the value proposition** of `design-feature`. The current README opens with a dense paragraph and spends ~40% of its content on installation across multiple harnesses. Popular skill/plugin READMEs (Continue, Cline, Aider, Prettier) converge on a different shape: hero with a single visual, 3 value bullets, compact install, narrative "How it works", everything else collapsed.

## Research findings (one-line summary)

A research pass over 10 READMEs (addyosmani/agent-skills, anthropics/skills, obra/superpowers, anthropics/claude-plugins-official, daymade/claude-code-skills, Aider, Cline, Continue, Prettier, OpenHands) found three winning patterns: **(1)** tight centered hero with one visual; **(2)** "show don't tell" via a concrete artifact above the fold; **(3)** compact install with secondary harnesses collapsed. Closest structural model: **Continue**. Reference notes are in the conversation transcript that produced this spec.

## Target structure (in order)

| # | Section | Notes |
|---|---|---|
| 1 | Hero | name + tagline + 3 badges + **visual A** (before/after PNG) |
| 2 | Value bullets | 3 bullets, problem-first voice (Voice B) |
| 3 | Quickstart | Claude Code visible, Codex/Gemini in `<details>` |
| 4 | How it works | 3 numbered paragraphs + **diagram D** (3-panel composite PNG/SVG) |
| 5 | The two skills | `design-feature` + `bootstrap-design-system` as paragraphs (no table) |
| 6 | Stack & deps | `<details>` block: superpowers + frontend-design + Markup + Chrome MCP |
| 7 | Footer | Compatibility (collapsed) · Contributing · License |

Target length: **~700 words**, **~1.5 screen-scrolls**. Sections 6 and 7 are collapsed by default.

## Section 1 — Hero

**Format:** centered, no logo (we don't ship one). Tagline split over two lines: main line + secondary line in muted color.

**Copy (final):**

```
# design-skills

Stop fixing the UI in PR review.
A design loop for Claude Code, Codex, and Gemini CLI.

[v0.6.0]  [Cross-harness]  [MIT]
```

**Visual A — before/after PNG.** Split image, ~830×280px. Left panel: a short feature request in monospace ("Add a settings page with theme toggle and notification preferences."). Arrow. Right panel: a wireframe-fidelity mockup of that page, with a small visible tweaker panel in the corner. Intent: communicate the input/output of the skill in one glance, like Prettier's input/output code block does.

**Asset to produce:** `docs/img/hero-before-after.png` (or .svg). Style: GitHub-native palette (#1f2328 text, #59636e secondary, #d0d7de borders, #ddf4ff/#dcffe4 accents). Width 1660px @2x for retina. Fallback inline alt text describing the same idea.

## Section 2 — Value bullets

**Format:** plain unordered list, bold lead-in + one-sentence support.

**Copy (final):**

- **Catch UI decisions in design, not in review.** "Less padding", "softer accent", "different copy" — those round-trips belong in a mockup, not a PR comment.
- **One mockup, every variant.** The tweaker panel exposes every design knob, so you compare alternatives in seconds — no regeneration required.
- **The Design System is the contract.** Approved mockups become DS files. Implementation references them. Visual QA checks the live page against the same file.

## Section 3 — Quickstart

**Format:** Claude Code block visible by default (primary ecosystem), Codex CLI and Gemini CLI inside `<details>` blocks. "Other harnesses" gets one paragraph at the bottom of this section linking to a (new or existing) section/page about manual installation.

**Copy:**

````markdown
## Quickstart

Install design-skills in Claude Code:

```bash
claude plugin marketplace add AlexandreCamillo/design-skills
claude plugin install design-skills
```

Restart Claude Code. Then ask your agent to design or build any feature with a visible UI — the `design-feature` skill takes over.

<details>
<summary><b>Codex CLI</b></summary>

```md
Use skill-installer to install `design-feature` and `bootstrap-design-system` from https://github.com/AlexandreCamillo/design-skills
```
</details>

<details>
<summary><b>Gemini CLI</b></summary>

```bash
gemini extensions install AlexandreCamillo/design-skills
```
</details>

<details>
<summary><b>Other harnesses (OpenCode, Cursor, Copilot CLI)</b></summary>

Drop each `SKILL.md` wherever your harness loads skills. The cross-harness tool reference at the top of each SKILL.md covers Claude Code, Gemini CLI, and Codex CLI explicitly; for others, the model translates using your harness's own docs.
</details>
````

Pin a tag with `AlexandreCamillo/design-skills@v0.6.0`.

## Section 4 — How it works

**Format:** **diagram D** (composite PNG/SVG with 3 panels) first, then 3 numbered paragraphs below.

**Diagram D — asset to produce:** `docs/img/how-it-works.png` (or .svg). Three panels, equal width, ~280px each, total ~840×260px. Each panel: small numbered circle (1/2/3) top-left, short title, mini-mockup of that step.

- Panel 1 — "Brainstorm UI + behavior": chat bubbles (user prompt + agent clarifying questions about density / accent / empty state)
- Panel 2 — "Tweak the mockup": miniature mockup card with a corner tweaker panel
- Panel 3 — "Ship the code": snippet of code referencing the DS file with the locked variants

Style consistent with hero visual A. Same color palette.

**Copy (final, below the diagram):**

```markdown
### How it works

![How it works](docs/img/how-it-works.png)

**1. Brainstorm the UI, not just the code.**
The skill runs a design-only conversation: what variants, what densities, what empty states, what error states. It produces a self-contained HTML mockup with a tweaker panel inlined — every meaningful decision becomes a knob.

**2. Iterate by tweaking, not regenerating.**
You flip variants, density, accent, copy directly on the mockup. The skill hosts it via [Markup](https://markup.alego.cloud) (comments, version history, DS components navigation) when configured, or falls back to the superpowers visual-companion for a quick view without that overhead. When you approve, locked choices get baked into a Design System file under `docs/design/design-system/`.

**3. Implement against the DS file. QA against the DS file.**
A technical brainstorm + plan + execute follows, with DS edits as first-class tasks. After implementation, the skill drives Chrome to compare the live route to the DS file's state matrix and reports drift until parity (or a documented exception).
```

A small "→ See the full 6-phase workflow" link at the end of this section points to `docs/workflow.md` (a new file extracted from the current README's "The 6-phase workflow" section — see the migration plan).

## Section 5 — The two skills

**Format:** two paragraphs (no table). Each leads with the trigger phrasing ("Use when…").

**Copy:**

```markdown
## The two skills

**[`design-feature`](./skills/design-feature/SKILL.md)** — Use when designing or building any feature with a visible UI. Drives the full design loop above. This is the primary entry point.

**[`bootstrap-design-system`](./skills/bootstrap-design-system/SKILL.md)** — Use once on existing projects that already have shipped code. Extracts a draft Design System from the running UI so the design loop has a starting point.
```

## Section 6 — Stack & deps (collapsed)

**Format:** single `<details>` block consolidating today's "Dependencies", "Browser automation setup", and "Compatibility" sections. Inside: short paragraph framing how design-skills *orchestrates* superpowers + frontend-design (it's not a competitor — it's the glue), then compact subsections for each dep.

**Outline:**

```markdown
<details>
<summary><b>Stack and dependencies</b></summary>

design-skills orchestrates two existing skill plugins and one external service. It refuses to run without the two hard dependencies; soft dependencies degrade to manual flows.

### Hard dependencies

- **[superpowers](https://github.com/obra/superpowers)** — provides `brainstorming`, `writing-plans`, `subagent-driven-development`, and the visual-companion fallback. (install commands per harness)
- **[frontend-design](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design)** — Anthropic's official skill for the mockup generation. (install commands per harness)

### Soft dependencies

- **[Markup](https://markup.alego.cloud)** instance — hosted mockups + comment iteration + DS navigation. Without `MARKUP_URL`/`MARKUP_TOKEN`, the skill walks the user through manual equivalents (and uses the superpowers visual-companion as a lightweight viewer — no comments, no history, no DS navigation).
- **Chrome MCP** (Claude for Chrome on Claude Code; `chrome-devtools-mcp` elsewhere) — required for Phase 5 visual QA and `bootstrap-design-system`'s snapshot step. Without it, Phase 5 prints a manual checklist.

### Compatibility

| design-skills tag | Min Markup server |
|---|---|
| v0.6.0 | 0.2.0 |

</details>
```

The current README's per-harness Chrome MCP installation commands move into this collapsed block.

## Section 7 — Footer

```markdown
## Contributing

Validate skills before sending a PR:

```bash
node validate.mjs
# or: npm test
```

## License

MIT
```

## Mermaid usage in this README

Per the format decision, the **README itself uses zero Mermaid diagrams**. Diagram D is a static PNG/SVG. Mermaid is reserved for `docs/workflow.md` (the full 6-phase flowchart, extracted from the current README) and any future deep-dive doc that needs a flow.

Rationale: the research found Mermaid in a hero or "How it works" position reads as dated/template-y. A handcrafted SVG/PNG that matches the hero feels more polished. Mermaid still earns its place in long-form docs where the audience is reading for understanding, not for first impressions.

## Migration plan

**Delete from current README:**
- Today's "How it works" prose section (replaced by Section 4 above)
- "Installation" subsections beyond Claude Code (folded into Section 3 `<details>`)
- "Browser automation setup (per harness)" section (folded into Section 6)
- "The 6-phase workflow" numbered list (extracted to `docs/workflow.md`)
- "What's inside" table (replaced by Section 5 paragraphs)
- "Dependencies" section as-is (folded into Section 6)
- "Compatibility" section as-is (folded into Section 6)

**Extract to a new file:**
- `docs/workflow.md` — full 6-phase workflow with its gates, scripts/state.json contract, and an optional Mermaid flowchart of the loop. Linked from Section 4.

**Add:**
- `docs/img/hero-before-after.png` (or .svg) — Section 1 hero visual
- `docs/img/how-it-works.png` (or .svg) — Section 4 diagram D

**Keep verbatim (copy from current README):**
- Quickstart `claude plugin marketplace add` / `claude plugin install` commands
- Per-harness install commands for hard dependencies (superpowers, frontend-design) inside Section 6
- Per-harness Chrome MCP setup commands inside Section 6
- `validate.mjs` / `npm test` contributing snippet
- MIT license line

## Open questions for the implementation plan

These do not block this design but the plan must answer them:

1. **Asset tooling** — produce the two PNG/SVG hero/diagram assets by hand (Figma export, Sketch, etc.) or generate via the same `design-feature` skill (dogfooding the tool, exporting via the tweaker)?
2. **`docs/workflow.md` content** — straight extraction of the current 6-phase list, or rewrite to match the new tone?
3. **Plugin version bump** — does swapping the README + extracting `docs/workflow.md` warrant a 0.6.0 → 0.6.1 patch bump? (Per the memory `feedback_plugin_version_bump`: evaluate after content edits.)
4. **`.superpowers/` gitignore entry** — add it before committing the spec so the brainstorm session files don't leak.

## Non-goals

- No restructuring of the skills themselves
- No changes to validate.mjs or the templates
- No changes to the install URLs, marketplace registration, or compatibility ranges
- No rewrite of `SKILL.md` files
