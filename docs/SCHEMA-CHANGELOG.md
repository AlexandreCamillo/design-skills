# Schema changelog

Tracks changes to the persisted JSON schemas of `design-feature` and `bootstrap-design-system`:

- `strategy.json` (repo-wide, at `.markup-design/scratch/strategy.json`)
- `state.json` (per-feature, at `.markup-design/scratch/<slug>/state.json` for design-feature; per-bootstrap at `.markup-design/bootstrap/state.json`)
- `registry.json` (per-user, at `~/.markup-design/registry.json`)

## Compat policy

- Each file carries a top-level `schemaVersion` integer.
- **Bump** `schemaVersion` only on **breaking** changes: field rename, removal, or semantic shift of an existing field.
- **Do not bump** for additive changes (new optional field). Document them here under "Additive — no bump".
- Skill reads treat **missing** `schemaVersion` as `0` and migrate inline with safe defaults (see field-level docs in each SKILL.md).

## Version 1 (2026-05-23) — Sub-plan 6

Initial versioning. Establishes `schemaVersion: 1` baseline for all three files. Pre-SP6 files (no `schemaVersion`) are treated as version `0` and migrated inline:

- `strategy.json`: `bootstrappedFromEmpty` defaults to `false` when absent; `branchCheck` may be `undefined` for files written before SP5 — Phase 3 gate degrades to "branch check skipped, original branch unknown".
- `state.json` (design-feature): `chromeMcp` absent ⇒ resolve via §"Chrome MCP tool resolution"; `qaRun` absent ⇒ `null`.
- `state.json` (bootstrap): no field migration needed (no additive fields pre-SP6).
- `registry.json`: did not exist pre-SP6; treated as empty (`{ "schemaVersion": 1, "repos": {} }`) on first read.

## Additive — no bump

_(none yet — log future additive changes here with date + sub-plan reference)_
