# design-skills compatibility policy

This document defines the versioning semantics for the `design-feature` and `bootstrap-design-system` skills (collectively, "design-skills"), the rules that govern a breaking change, the deprecation cycle, and the severity model for the `markup-cli check` gates that both skills rely on.

> Both SKILL.md files MUST declare the same `compat.cli` and `compat.markup` ranges in their YAML frontmatter — `validate.mjs` enforces this.

## Semver semantics

design-skills follows semver:

- **Patch** (`x.y.Z`) — bug fixes in the SKILL.md text, validator improvements, doc clarifications. No user-visible behavior change.
- **Minor** (`x.Y.0`) — additive features (new Phase step, new strategy in `strategies.json`, new optional field in a state schema). No required changes for existing consumers.
- **Major** (`X.0.0`) — breaking change (definition below).

## What counts as a breaking change

A change is **breaking** if any of the following hold:

1. Raising the lower bound of `compat.cli` or `compat.markup` in either SKILL.md frontmatter (e.g., `>=0.1.0` → `>=0.2.0`).
2. Removing a strategy ID from `templates/strategies.json` (downstream `strategy.json` files reference these IDs).
3. Bumping the `VERSION` constant in `templates/tweaker.html` (the tweaker JSON payload shape is part of the contract; agents reject `version > VERSION` on paste).
4. Renaming a field in `state.json` / `strategy.json` schemas, or changing the semantic meaning of an existing field. Additive fields are NOT breaking.
5. Removing or renaming a phase, a HARD-GATE clause, or any cross-referenced heading. The `validate.mjs` cross-reference check enforces internal consistency, but external consumers (other plugins, runbooks) may also link to these headings.

## Deprecation cycle

Before a breaking change ships:

- **One minor release** lands the deprecation notice in CHANGELOG + the relevant SKILL.md section (e.g., "DEPRECATED in 0.4.x — removed in 0.5.0: <field>").
- The next major may then remove the deprecated surface.

Exception: security or correctness fixes may bypass the cycle. When that happens, the changelog calls it out and a migration note ships alongside.

## markup-cli check semantics

Throughout both SKILL.md files, gates that read

> `markup-cli check --build`

invoke the `markup-cli` linter. The default exit semantics are:

- **Exit 0** — pass. The gate advances.
- **Non-zero exit** — fail. The gate refuses.
- **Warnings on stderr** — printed but do **not** affect exit code by default. The gate still advances.

For tighter enforcement, both SKILL.md files reference the gate as `markup-cli check --build --strict`. With `--strict`:

- **Exit 0** — pass, with **no** warnings on stderr.
- **Non-zero exit OR any warning on stderr** — fail. The gate refuses.

Both modes are valid. The skill uses `--strict` everywhere as the canonical reference because it removes ambiguity about whether the gate genuinely passed. Consumers may relax to plain `--build` locally during exploratory work, but CI and the documented gates always use `--strict`.

If `markup-cli` is not installed on the current harness, the skill falls back to the manual structural-review prompt printed in-line at the gate site. The `--strict` flag is irrelevant in the fallback.

## Frontmatter compat blocks

Each SKILL.md must declare:

```yaml
compat:
  cli: ">=0.1.0"
  markup: ">=0.2.0"
```

Both ranges use semver `>=` shape (no `^`, no `~`, no exact pin). The lower bound is the oldest CLI / Markup-server version this skill has been verified against. `validate.mjs` enforces that both SKILL.md files declare identical ranges so the two skills can never drift against each other within a release.

## Internal references to this document

`docs/COMPAT.md` is referenced from:

- `skills/design-feature/SKILL.md` — soft-dependency checks (`compat.cli` / `compat.markup` semver compare).
- `skills/bootstrap-design-system/SKILL.md` — precondition 2 (markup-cli install + recommended version).
- `validate.mjs` — the cross-cutting validator implements the rules described above.
