# design-skills compatibility policy

This document defines the versioning semantics for the `design-feature` and `bootstrap-design-system` skills (collectively, "design-skills"), the rules that govern a breaking change, the deprecation cycle, and the contract for the in-skill scripts (`skills/design-feature/scripts/`) that both skills rely on.

> Both SKILL.md files MUST declare the same `compat.markup` range in their YAML frontmatter — `validate.mjs` enforces this.

## Semver semantics

design-skills follows semver:

- **Patch** (`x.y.Z`) — bug fixes in the SKILL.md text, validator improvements, doc clarifications. No user-visible behavior change.
- **Minor** (`x.Y.0`) — additive features (new Phase step, new strategy in `strategies.json`, new optional field in a state schema). No required changes for existing consumers.
- **Major** (`X.0.0`) — breaking change (definition below).

## What counts as a breaking change

A change is **breaking** if any of the following hold:

1. Raising the lower bound of `compat.markup` in either SKILL.md frontmatter (e.g., `>=0.2.0` → `>=0.3.0`).
2. Removing a strategy ID from `templates/strategies.json` (downstream `strategy.json` files reference these IDs).
3. Bumping the `VERSION` constant in `templates/tweaker.html` (the tweaker JSON payload shape is part of the contract; agents reject `version > VERSION` on paste).
4. Renaming a field in `state.json` / `strategy.json` schemas, or changing the semantic meaning of an existing field. Additive fields are NOT breaking.
5. Removing or renaming a phase, a HARD-GATE clause, or any cross-referenced heading. The `validate.mjs` cross-reference check enforces internal consistency, but external consumers (other plugins, runbooks) may also link to these headings.
6. Removing or renaming a script under `skills/design-feature/scripts/` that the SKILL.md prose invokes, OR changing the exit-code semantics, env-var contract, or stdout output schema of a script in a way that breaks an existing skill caller. Adding a new script is NOT breaking. Adding a new optional flag/arg to an existing script is NOT breaking.

## Deprecation cycle

Before a breaking change ships:

- **One minor release** lands the deprecation notice in CHANGELOG + the relevant SKILL.md section (e.g., "DEPRECATED in 0.4.x — removed in 0.5.0: <field>").
- The next major may then remove the deprecated surface.

Exception: security or correctness fixes may bypass the cycle. When that happens, the changelog calls it out and a migration note ships alongside.

## Script invocation contract

Throughout both SKILL.md files, gates that read

> `./scripts/lint-ds.sh <ds-file>` (Unix) / `pwsh ./scripts/lint-ds.ps1 <ds-file>` (Windows)

invoke the bundled structural linter. Exit semantics:

- **Exit 0** — pass. The gate advances.
- **Exit 3** — lint failure (one of §1/§4/§7/§8 invariants did not hold). The gate refuses. Stderr names the failing section.
- **Exit 4** — bad arguments or file not found. Skill prose should never trigger this; treat as a bug.
- **Any other non-zero exit** — unexpected error. The gate refuses.

Network-touching scripts (`doctor`, `mockup-upload`, `promote`, `sync-index`, `comment`) read two env vars: `MARKUP_URL` and `MARKUP_TOKEN`. If either is missing, the script exits `2` with a clear stderr message. The skill's pre-Phase-0 doctor check is the first place this matters.

If a script is missing from `skills/design-feature/scripts/` (partial install), `validate.mjs`'s `validateScriptInvocations` check fails — the skill itself does not attempt to detect this at runtime.

## Frontmatter compat blocks

Each SKILL.md must declare:

```yaml
compat:
  markup: ">=0.2.0"
```

The range uses semver `>=` shape (no `^`, no `~`, no exact pin). The lower bound is the oldest Markup-server version this skill has been verified against. `validate.mjs` enforces that both SKILL.md files declare identical `compat.markup` ranges so the two skills can never drift against each other within a release. The previously-required `compat.cli` was removed in SP10 (2026-05-24) when the skill stopped depending on the `markup-cli` npm package; see `docs/SCHEMA-CHANGELOG.md` Version 2.

## Internal references to this document

`docs/COMPAT.md` is referenced from:

- `skills/design-feature/scripts/README.md` — env-var contract + OS-resolution rule referenced from the §"Script invocation contract" section above.
- `skills/design-feature/SKILL.md` — soft-dependency checks (`compat.cli` / `compat.markup` semver compare).
- `skills/bootstrap-design-system/SKILL.md` — precondition 2 (markup-cli install + recommended version).
- `validate.mjs` — the cross-cutting validator implements the rules described above.
