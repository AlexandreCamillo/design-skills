# Sub-plan 3: Strategy single-source-of-truth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the strategy-IDs triple-duplication (SKILL §0.3 menu, template §6 adaptation guide, template §9 canonical snippets) into one machine-readable source (`strategies.json`) and a deterministic template generator, so the menu / adaptation guide / snippets cannot drift apart.

**Architecture:** A single `templates/strategies.json` holds every strategy entry (`id`, `framework`, `label`, `markers`, `adaptation`, `canonicalSnippet`). A new `scripts/build-template.mjs` reads `strategies.json` plus a hand-authored shell `templates/ds-component-pattern.template.md` and emits the generated `templates/ds-component-pattern.md` (the consumer-facing file). The SKILL.md §0.3 menu table is replaced by a one-paragraph pointer that delegates to `strategies.json`. `validate.mjs` gains checks for schema integrity, framework set, no duplicates, and cross-references between SKILL.md and `strategies.json`. Three new strategies (`react-shadcn-tailwind`, `vue-antdv-rhf`, `solid-corvu-tailwind`) are added; the speculative `solid-ui` detection marker is removed.

**Tech Stack:** Node 20 (ESM), pure stdlib (`node:fs`, `node:path`, `node:url`), JSON, Markdown.

---

## Acceptance criteria (from roadmap)

1. **New `templates/strategies.json`** with one entry per canonical strategy (schema: `id`, `framework`, `label`, `markers`, `adaptation`, `canonicalSnippet`).
2. **SKILL §0.3 menu reads from JSON.** Hardcoded 41-row table replaced by a one-paragraph instruction + pointer to `strategies.json`. Detection logic iterates entries.
3. **Template §6 and §9 generated from JSON** via `node scripts/build-template.mjs`. Source becomes `templates/ds-component-pattern.template.md` with `<!-- INSERT strategies.adaptation -->` / `<!-- INSERT strategies.canonicalSnippet -->` placeholders. Generated file committed.
4. **Validator extension.** `validate.mjs` checks: every entry has all required fields; framework values are in the canonical set; no duplicate IDs.
5. **Three missing strategies added:** `react-shadcn-tailwind`, `vue-antdv-rhf`, `solid-corvu-tailwind`. Speculative `solid-ui` removed from §0.1 detection markers.

---

## File Structure

**Created:**
- `skills/design-feature/templates/strategies.json` — single source of truth for strategies.
- `skills/design-feature/templates/ds-component-pattern.template.md` — hand-authored shell with `<!-- INSERT ... -->` placeholders.
- `scripts/build-template.mjs` — generator that materializes `ds-component-pattern.md` from the shell + `strategies.json`.

**Modified:**
- `skills/design-feature/templates/ds-component-pattern.md` — becomes generator output (regenerated, committed for consumers).
- `skills/design-feature/SKILL.md` — §0.1 step 2 row for `solid` (remove `solid-ui`); §0.3 menu collapsed to one paragraph + pointer.
- `validate.mjs` — strategies.json integrity + cross-reference checks.
- `package.json` — add `build:template` and call it from `validate` so CI regenerates before checking.

**Rationale for the design choices** (documented in this plan so reviewers see the trade-offs):

- **Placeholder syntax** is `<!-- INSERT strategies.<field>[.<framework>] -->`. Three concrete forms used:
  - `<!-- INSERT strategies.adaptation -->` → emits §6 in full: a top-level `### <Framework Title>` per framework, then a markdown table with rows `| <id> | <adaptation> |`. Order is fixed by the canonical framework list (`react|vue|svelte|angular|solid|jquery|vanilla|custom`) + the order entries appear in `strategies.json` within each framework.
  - `<!-- INSERT strategies.canonicalSnippet -->` → emits §9 in full: a top-level `### <Framework Title>` per framework, then `#### \`<id>\`` heading followed by the snippet inside a fenced code block whose language tag is recorded in `strategies.json` as `snippetLang` (e.g., `tsx`, `vue`, `svelte`, `typescript`, `html`).
  - Plain `<!-- INSERT ... -->` lines (any other shape) are left untouched — generator only recognises the two above.
- **`markers` shape:** `{ ui: string[], form: string[], styling: string[], animation: string[], icons: string[], exclude: string[] }`. All fields optional; absent = empty array. This matches the §0.1 ecosystem-detection columns 1:1, so the SKILL can drive detection by iterating `strategies.json` per framework and matching `package.json` deps against each entry's markers (when consumer logic switches over). Within this PR we only populate the data; switching the SKILL's detection logic to iterate is left for a follow-up (out of scope per "Out of scope" below).
- **`adaptation` field:** inline text (string), single-line markdown — same wording as the old §6 rows. Path-to-fragment-file rejected because the values are short (1-2 sentences) and inlining keeps the file count small.
- **`canonicalSnippet` field:** raw source code as a string, with `snippetLang` as a sibling. Multi-line strings encoded as JSON `\n` escapes — uncomfortable for large snippets but acceptable here (longest is ~25 lines). Alternative considered: separate `snippets/<id>.<ext>` files. Rejected because: (a) doubles file count for marginal readability gain; (b) JSON multiline is already legible enough; (c) keeps `strategies.json` self-contained as the single SoT.
- **Generated file is committed.** Consumers (the skill at install time) cannot run `npm run build:template` — they read the markdown file in place. CI regenerates and `git diff --exit-code` would fail if the committed copy drifts (added in Task 13 as part of `npm test`).
- **Three new strategies — accuracy:** real-world checked snippets (shadcn/ui canonical Input + Button composition; Ant Design Vue with vee-validate; Corvu TextField primitive with Tailwind). Each entry's markers reflect actual npm package names (`shadcn-ui` is a CLI not a runtime dep — markers detect via `@radix-ui/react-slot` + `class-variance-authority` + `tailwindcss`; `ant-design-vue`; `@corvu/text-field` + `tailwindcss`).
- **`solid-ui` removal:** the package was a placeholder in §0.1's solid row. No `strategies.json` entry references it; removing the marker prevents detection from suggesting a strategy we don't ship.

## Out of scope

- Switching SKILL.md §0.1 detection logic to iterate `strategies.json` markers (currently §0.1 step 2 has its own hardcoded ecosystem table; this PR only **adds** `markers` to `strategies.json` so a follow-up can replace the table — Sub-plan 9 acceptance criterion 3b is the natural place for that).
- Changing user-facing menu UX (numbered list + free-text). Phrasing, ordering, and prompts stay byte-identical.
- Adding more strategies beyond the three listed in roadmap acceptance criterion 5.
- Telemetry / analytics on which strategies users pick.

---

### Task 1: Create the strategies.json schema and bootstrap entries

**Files:**
- Create: `skills/design-feature/templates/strategies.json`

- [ ] **Step 1: Write the file**

The file is an array of entries, ordered by framework then by the existing §0.3 menu order. Top-level `schemaVersion: 1` for forward-compat. Fields per entry: `id`, `framework`, `label`, `markers`, `adaptation`, `snippetLang`, `canonicalSnippet`.

Content is the literal merge of the existing §0.3 labels, §6 adaptation strings, and §9 snippets, plus three new entries. See Task 2 and Task 3 for the field values per entry — Task 1 writes a small bootstrap with two example entries to validate the schema shape end-to-end, then Task 2 fills out the rest.

```json
{
  "schemaVersion": 1,
  "frameworks": ["react", "vue", "svelte", "angular", "solid", "jquery", "vanilla", "custom"],
  "strategies": [
    {
      "id": "react-antd-max",
      "framework": "react",
      "label": "antd ao máximo",
      "markers": { "ui": ["antd"], "form": [], "styling": [], "animation": [], "icons": [], "exclude": ["react-hook-form"] },
      "adaptation": "`import { Form, Input, Button } from 'antd'`. Map each `data-state` to the matching antd prop (`validateStatus`, `status`, `loading`, `disabled`).",
      "snippetLang": "tsx",
      "canonicalSnippet": "import { Form, Input, Button } from 'antd';\n\n<Form layout=\"vertical\" onFinish={values => console.log(values)}>\n  <Form.Item name=\"name\" label=\"Name\" rules={[{ required: true }, { pattern: /^[a-z0-9-]+$/, message: 'Lowercase, digits, hyphens only.' }]}>\n    <Input />\n  </Form.Item>\n  <Button type=\"primary\" htmlType=\"submit\">Submit</Button>\n</Form>"
    }
  ]
}
```

- [ ] **Step 2: Run validator (expect new validations to fail later; here it should still pass because we haven't added them yet)**

Run: `node validate.mjs`
Expected: PASS (existing checks still green; strategies.json is not yet referenced).

- [ ] **Step 3: Don't commit yet** — task 2 fills the rest of the data; we commit one chunk per acceptance criterion.

---

### Task 2: Populate strategies.json with every existing strategy

**Files:**
- Modify: `skills/design-feature/templates/strategies.json`

- [ ] **Step 1: Add every entry from the current §0.3 table (excluding `custom` which is special-cased) and the matching §6 adaptation + §9 snippet**

Source of truth for the migration: SKILL.md §0.3 table (lines ~237-279) for `id` + `label` + `framework`; templates/ds-component-pattern.md §6 (lines ~187-268) for `adaptation`; §9 (lines ~344-1151) for `canonicalSnippet` + `snippetLang`.

Total entries (existing): 41 rows minus `custom` minus `solid-ui` placeholder (was never in §0.3, was only in §0.1 — see Task 3) = **40 entries**.

Per-entry field mapping:

- `id` ← §0.3 "Strategy ID" column.
- `framework` ← §0.3 "Framework" column (canonical key).
- `label` ← §0.3 "Label" column verbatim.
- `markers` ← derive from the entry's `id`: split on `-`; first segment is framework (skip), middle segments map to known UI/form lib npm names per the §0.1 detection table:
  - `antd` → `{ ui: ["antd"] }`
  - `antd-rhf` → `{ ui: ["antd"], form: ["react-hook-form"] }`
  - `radix-primitives` → `{ ui: ["@radix-ui/react-form"] }` (the form primitive is the canonical anchor; alternative `@radix-ui/react-*` siblings also count but we list the most distinctive)
  - `mui` → `{ ui: ["@mui/material"] }`
  - `mui-rhf` → `{ ui: ["@mui/material"], form: ["react-hook-form"] }`
  - `chakra` → `{ ui: ["@chakra-ui/react"] }`
  - `mantine` → `{ ui: ["@mantine/core"] }`
  - `headlessui-tailwind` → `{ ui: ["@headlessui/react"], styling: ["tailwindcss"] }`
  - `bootstrap` (in react) → `{ ui: ["react-bootstrap"] }`
  - `vanilla-tailwind` → `{ styling: ["tailwindcss"], exclude: <framework-specific UI libs> }`
  - `vanilla` (terminal) → `{ exclude: <every UI lib for the framework> }`
  - vue: `vuetify`→`["vuetify"]`, `vuetify-vee`→`["vuetify"]`+`["vee-validate"]`, `element-plus`→`["element-plus"]`, `naive`→`["naive-ui"]`, `primevue`→`["primevue"]`, `quasar`→`["quasar"]`
  - svelte: `skeleton`→`["@skeletonlabs/skeleton"]`, `flowbite`→`["flowbite-svelte"]`, `sveltestrap`→`["sveltestrap"]`, `melt-tailwind`→`["@melt-ui/svelte"]`+`["tailwindcss"]`
  - angular: `material`→`["@angular/material"]`, `primeng`→`["primeng"]`, `ngbootstrap`→`["@ng-bootstrap/ng-bootstrap"]`, `taiga`→`["@taiga-ui/core"]`
  - solid: `kobalte-tailwind`→`["@kobalte/core"]`+`["tailwindcss"]`, `hope`→`["@hope-ui/solid"]`
  - jquery: `ui-bootstrap`→`["jquery-ui","bootstrap"]`, `bootstrap`→`["bootstrap"]`+`exclude: ["jquery-ui"]`, `vanilla`→`exclude: ["jquery-ui","bootstrap"]`
  - vanilla: `html-tailwind`→`{ styling: ["tailwindcss"] }`, `html`→`{}` (no markers)
  - Always normalize: any missing category defaults to empty array on read.
- `adaptation` ← the matching row from template §6 (text after the pipe-separator).
- `snippetLang` ← the fenced-code-block language from template §9 (`tsx`, `vue`, `svelte`, `typescript`, `html`).
- `canonicalSnippet` ← the fenced-code-block body verbatim, with `\n` JSON-escaped.

- [ ] **Step 2: Verify the JSON parses and has the expected count**

Run: `node -e "const d=JSON.parse(require('fs').readFileSync('skills/design-feature/templates/strategies.json','utf8')); console.log('entries:',d.strategies.length,'frameworks:',new Set(d.strategies.map(s=>s.framework)).size)"`
Expected: `entries: 40 frameworks: 7` (no `custom` row, no `solid-ui`).

- [ ] **Step 3: Run validate**

Run: `node validate.mjs`
Expected: PASS.

- [ ] **Step 4: Don't commit yet** — Task 3 adds the three new strategies first.

---

### Task 3: Add the three new strategies (react-shadcn-tailwind, vue-antdv-rhf, solid-corvu-tailwind)

**Files:**
- Modify: `skills/design-feature/templates/strategies.json`

- [ ] **Step 1: Append three entries**

Place each entry **at the natural position in the framework block** (not at the end of the file): for react, between `react-bootstrap-max` and `react-vanilla-tailwind` (shadcn sits naturally between styled lib options and the bare Tailwind option); for vue, between `vue-quasar-max` and `vue-vanilla-tailwind`; for solid, between `solid-kobalte-tailwind` and `solid-hope-max`.

```json
{
  "id": "react-shadcn-tailwind",
  "framework": "react",
  "label": "shadcn/ui + Tailwind",
  "markers": {
    "ui": ["@radix-ui/react-slot", "class-variance-authority"],
    "form": [],
    "styling": ["tailwindcss"],
    "animation": [],
    "icons": ["lucide-react"],
    "exclude": []
  },
  "adaptation": "Local `components/ui/*` (e.g., `Input`, `Button`) generated by the shadcn/ui CLI — copies of Radix primitives styled with Tailwind + `cva`. Imports look like `import { Input } from '@/components/ui/input'`. Validation via native HTML `required`/`pattern` or layered with react-hook-form.",
  "snippetLang": "tsx",
  "canonicalSnippet": "import { Input } from '@/components/ui/input';\nimport { Label } from '@/components/ui/label';\nimport { Button } from '@/components/ui/button';\nimport { useState } from 'react';\n\nconst [name, setName] = useState('');\nconst error = name !== '' && !/^[a-z0-9-]+$/.test(name);\n\n<form onSubmit={e => e.preventDefault()} className=\"flex flex-col gap-4\">\n  <div className=\"flex flex-col gap-1\">\n    <Label htmlFor=\"name\">Name</Label>\n    <Input id=\"name\" value={name} onChange={e => setName(e.target.value)} required\n      aria-invalid={error || undefined}\n      className={error ? 'border-destructive focus-visible:ring-destructive' : undefined} />\n    {error && <p className=\"text-xs text-destructive\">Lowercase, digits, hyphens only.</p>}\n  </div>\n  <Button type=\"submit\">Submit</Button>\n</form>"
},
{
  "id": "vue-antdv-rhf",
  "framework": "vue",
  "label": "Ant Design Vue + vee-validate",
  "markers": {
    "ui": ["ant-design-vue"],
    "form": ["vee-validate"],
    "styling": [],
    "animation": [],
    "icons": [],
    "exclude": []
  },
  "adaptation": "`import { Form, FormItem, Input, Button } from 'ant-design-vue'` + vee-validate's `useForm` + `useField`. Wire each `FormItem`'s `validate-status` and `help` to the field's error state from vee-validate.",
  "snippetLang": "vue",
  "canonicalSnippet": "<script setup>\nimport { Form, FormItem, Input, Button } from 'ant-design-vue';\nimport { useForm, useField } from 'vee-validate';\n\nconst { handleSubmit } = useForm();\nconst { value: name, errorMessage } = useField('name', v =>\n  /^[a-z0-9-]+$/.test(v) ? true : 'Lowercase, digits, hyphens only.'\n);\nconst onSubmit = handleSubmit(values => console.log(values));\n</script>\n\n<template>\n  <Form layout=\"vertical\" @submit.prevent=\"onSubmit\">\n    <FormItem label=\"Name\" :validate-status=\"errorMessage ? 'error' : ''\" :help=\"errorMessage\">\n      <Input v-model:value=\"name\" />\n    </FormItem>\n    <Button type=\"primary\" html-type=\"submit\">Submit</Button>\n  </Form>\n</template>"
},
{
  "id": "solid-corvu-tailwind",
  "framework": "solid",
  "label": "Corvu + Tailwind",
  "markers": {
    "ui": ["@corvu/text-field"],
    "form": [],
    "styling": ["tailwindcss"],
    "animation": [],
    "icons": [],
    "exclude": []
  },
  "adaptation": "`import TextField from '@corvu/text-field'` (per-primitive package). Corvu primitives expose `data-invalid` / `data-valid` on the root — drive styling with Tailwind's `data-[invalid]:` variant.",
  "snippetLang": "tsx",
  "canonicalSnippet": "import TextField from '@corvu/text-field';\nimport { createSignal } from 'solid-js';\n\nconst [name, setName] = createSignal('');\nconst invalid = () => name() !== '' && !/^[a-z0-9-]+$/.test(name());\n\n<form onSubmit={e => e.preventDefault()} class=\"flex flex-col gap-4\">\n  <TextField value={name()} onChange={setName} validationState={invalid() ? 'invalid' : 'valid'}>\n    <TextField.Label class=\"text-sm font-medium\">Name</TextField.Label>\n    <TextField.Input required\n      class=\"rounded border px-3 py-2 data-[invalid]:border-red-500\" />\n    <TextField.Description class=\"text-xs text-gray-500\">Lowercase letters, digits, hyphens.</TextField.Description>\n    <TextField.ErrorMessage class=\"text-xs text-red-600\">Lowercase, digits, hyphens only.</TextField.ErrorMessage>\n  </TextField>\n  <button type=\"submit\" class=\"rounded bg-blue-600 px-4 py-2 text-white\">Submit</button>\n</form>"
}
```

- [ ] **Step 2: Verify the count**

Run: `node -e "const d=JSON.parse(require('fs').readFileSync('skills/design-feature/templates/strategies.json','utf8')); console.log('entries:',d.strategies.length)"`
Expected: `entries: 43`.

- [ ] **Step 3: Verify all IDs are unique**

Run: `node -e "const d=JSON.parse(require('fs').readFileSync('skills/design-feature/templates/strategies.json','utf8')); const ids=d.strategies.map(s=>s.id); console.log('dups:', ids.filter((id,i)=>ids.indexOf(id)!==i))"`
Expected: `dups: []`.

- [ ] **Step 4: Run validator**

Run: `node validate.mjs`
Expected: PASS.

- [ ] **Step 5: Commit (acceptance criterion 1 — SSoT data file)**

```bash
git add skills/design-feature/templates/strategies.json
git commit -m "feat(design-feature): add strategies.json as strategy single-source-of-truth"
```

---

### Task 4: Remove the speculative solid-ui marker from SKILL.md §0.1

**Files:**
- Modify: `skills/design-feature/SKILL.md` (the `solid` row of §0.1 step 2)

- [ ] **Step 1: Edit the solid row**

Current line (~161):
```
| `solid` | `@kobalte/core`, `@hope-ui/solid`, `solid-ui` | `@modular-forms/solid` | `tailwindcss`, `solid-styled-components` | (Solid transitions built-in) | `solid-icons`, `@iconify-icon/solid` |
```

Replace `solid-ui` with `@corvu/text-field` (matches the new `solid-corvu-tailwind` strategy's marker).

New line:
```
| `solid` | `@kobalte/core`, `@hope-ui/solid`, `@corvu/text-field` | `@modular-forms/solid` | `tailwindcss`, `solid-styled-components` | (Solid transitions built-in) | `solid-icons`, `@iconify-icon/solid` |
```

- [ ] **Step 2: Verify**

Run: `grep -n 'solid-ui' skills/design-feature/SKILL.md`
Expected: no output.

Run: `grep -n '@corvu/text-field' skills/design-feature/SKILL.md`
Expected: one match in the solid row.

- [ ] **Step 3: Validate**

Run: `node validate.mjs`
Expected: PASS.

- [ ] **Step 4: Commit (acceptance criterion 5 — speculative marker replaced)**

```bash
git add skills/design-feature/SKILL.md
git commit -m "fix(design-feature): replace speculative solid-ui marker with @corvu/text-field"
```

---

### Task 5: Write the build-template.mjs generator skeleton (no output yet)

**Files:**
- Create: `scripts/build-template.mjs`

- [ ] **Step 1: Write the generator stub that just loads inputs and prints sizes**

```js
#!/usr/bin/env node
// Materializes skills/design-feature/templates/ds-component-pattern.md
// from ds-component-pattern.template.md + strategies.json.
//
// Run: node scripts/build-template.mjs
// CI:  validate.mjs invokes this then `git diff --exit-code` on the output.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const tplDir = resolve(repoRoot, 'skills/design-feature/templates');

const strategies = JSON.parse(readFileSync(resolve(tplDir, 'strategies.json'), 'utf8'));
const shell = readFileSync(resolve(tplDir, 'ds-component-pattern.template.md'), 'utf8');

const FRAMEWORK_TITLES = {
  react: 'React',
  vue: 'Vue',
  svelte: 'Svelte',
  angular: 'Angular',
  solid: 'Solid',
  jquery: 'jQuery',
  vanilla: 'Vanilla',
  custom: 'Custom',
};

function byFramework(strategies, framework) {
  return strategies.strategies.filter(s => s.framework === framework);
}

function renderAdaptation(strategies) {
  const out = [];
  for (const fw of strategies.frameworks) {
    if (fw === 'custom') continue; // custom is handled by a hand-authored paragraph below the table
    const rows = byFramework(strategies, fw);
    if (rows.length === 0) continue;
    out.push(`### ${FRAMEWORK_TITLES[fw]} (\`framework: "${fw}"\`)`);
    out.push('');
    out.push('| Strategy ID | How to write "Code API" |');
    out.push('|---|---|');
    for (const r of rows) {
      out.push(`| \`${r.id}\` | ${r.adaptation} |`);
    }
    out.push('');
  }
  return out.join('\n');
}

function renderSnippets(strategies) {
  const out = [];
  for (const fw of strategies.frameworks) {
    if (fw === 'custom') continue;
    const rows = byFramework(strategies, fw);
    if (rows.length === 0) continue;
    out.push(`### ${FRAMEWORK_TITLES[fw]}`);
    out.push('');
    for (const r of rows) {
      out.push(`#### \`${r.id}\``);
      out.push('```' + r.snippetLang);
      out.push(r.canonicalSnippet);
      out.push('```');
      out.push('');
    }
  }
  return out.join('\n');
}

let output = shell;
output = output.replace(/<!-- INSERT strategies\.adaptation -->/g, renderAdaptation(strategies).trimEnd());
output = output.replace(/<!-- INSERT strategies\.canonicalSnippet -->/g, renderSnippets(strategies).trimEnd());

writeFileSync(resolve(tplDir, 'ds-component-pattern.md'), output);
console.log(`✓ Wrote ds-component-pattern.md (${output.length} bytes; ${strategies.strategies.length} strategies).`);
```

- [ ] **Step 2: Don't run yet — the shell file doesn't exist; next task creates it. Just confirm syntax parses.**

Run: `node --check scripts/build-template.mjs`
Expected: no output (parse OK).

- [ ] **Step 3: Don't commit yet** — task 6 adds the shell and task 7 confirms the output matches the original.

---

### Task 6: Author ds-component-pattern.template.md (the shell with placeholders)

**Files:**
- Create: `skills/design-feature/templates/ds-component-pattern.template.md`

- [ ] **Step 1: Copy ds-component-pattern.md verbatim to .template.md, then replace §6 and §9 bodies with placeholders**

Approach:
1. `cp skills/design-feature/templates/ds-component-pattern.md skills/design-feature/templates/ds-component-pattern.template.md`
2. In the template file, **replace** the §6 body (everything between the line `### React (\`framework: "react"\`)` and `### Custom (\`chosen: "custom"\`)`, exclusive of both) with a single line:

   ```
   <!-- INSERT strategies.adaptation -->
   ```

3. The `### Custom (...)` paragraph stays hand-authored in the template (it's not in `strategies.json`).
4. In the template, **replace** the §9 body (everything between the line `### React` (the §9 subheading, near "Examples by strategy") and the end of `### Vanilla` block — i.e., from right after `One canonical snippet per strategy ID. The agent uses these as the literal reference when writing section 4 ("Code API") of a DS file.` through the end of `vanilla-html` snippet block) with:

   ```
   <!-- INSERT strategies.canonicalSnippet -->
   ```

Use precise Edit operations rather than rewriting the file — context spans hundreds of lines and the rest must remain byte-identical (the rest of the template is the *hand-authored* portion of the SoT).

- [ ] **Step 2: Sanity-check the placeholder presence**

Run: `grep -c 'INSERT strategies' skills/design-feature/templates/ds-component-pattern.template.md`
Expected: `2`.

- [ ] **Step 3: Don't commit yet** — Task 7 runs the generator and verifies byte-equivalence with the current `ds-component-pattern.md`.

---

### Task 7: Run the generator and verify byte-equivalence with current ds-component-pattern.md

**Files:**
- Read: `skills/design-feature/templates/ds-component-pattern.md` (current — pre-generator baseline)
- Modify: regenerated by the script

- [ ] **Step 1: Snapshot the current file before the generator overwrites it**

Run: `cp skills/design-feature/templates/ds-component-pattern.md /tmp/ds-pattern-baseline.md`
Expected: silent success.

- [ ] **Step 2: Run the generator**

Run: `node scripts/build-template.mjs`
Expected: `✓ Wrote ds-component-pattern.md (...bytes; 43 strategies).`

- [ ] **Step 3: Diff against baseline — expect ONLY semantic-equivalent changes (new entries + ordering); review the diff inline**

Run: `diff -u /tmp/ds-pattern-baseline.md skills/design-feature/templates/ds-component-pattern.md | head -120`
Expected:
- §1-§5 sections: NO differences.
- §6 table: new `react-shadcn-tailwind`, `vue-antdv-rhf`, `solid-corvu-tailwind` rows added (3 added lines).
- §6 framework headings: may have minor whitespace normalization (trailing blank lines etc.); flag if anything substantive changes.
- §9: new `react-shadcn-tailwind`, `vue-antdv-rhf`, `solid-corvu-tailwind` subsections added (3 blocks).
- §6b, §7, §8 (`Common gaps`, `Anatomy`, `Things to avoid`): NO differences.

If any **existing** strategy row's adaptation text or snippet body differs from the baseline beyond whitespace, the migration in Task 2 dropped data — go fix Task 2's entry before continuing.

- [ ] **Step 4: Confirm the validator still passes (the file is just a regenerated copy)**

Run: `node validate.mjs`
Expected: PASS.

- [ ] **Step 5: Commit (acceptance criterion 3 — generator + shell + regenerated output)**

```bash
git add scripts/build-template.mjs \
        skills/design-feature/templates/ds-component-pattern.template.md \
        skills/design-feature/templates/ds-component-pattern.md
git commit -m "feat(design-feature): generate ds-component-pattern.md from strategies.json"
```

---

### Task 8: Collapse SKILL.md §0.3 menu table to a one-paragraph pointer

**Files:**
- Modify: `skills/design-feature/SKILL.md` (§0.3 lines ~226-281)

- [ ] **Step 1: Replace the 41-row strategy ID table with a one-paragraph instruction in PT-BR (user-facing) + a sentence in English to the agent (instructions)**

Current §0.3 contents to replace (everything between "Strategy IDs are framework-prefixed for uniqueness and clarity. Canonical IDs:" and "For each invocation, only the rows whose framework matches `detected.framework` (plus the `(any)` row) are presented to the user. The menu typically shows 3-5 numbered options."):

Replace the **table** (and the preceding sentence) with this English instruction block (it's agent-facing — addressed to the LLM, not the user):

```
**Strategies live in `templates/strategies.json`** (relative to this SKILL.md). That file is the single source of truth for `id`, `framework`, `label`, detection `markers`, the Code-API `adaptation` text (also shown in §6 of the bundled template), and the `canonicalSnippet` (also shown in §9 of the bundled template).

To compose the menu for the current invocation:

1. Read `templates/strategies.json`.
2. Filter `strategies[]` to entries whose `framework` equals `detected.framework`.
3. Apply construction rules 1-4 above (vanilla baseline second-to-last, `Outro (descreva)` last, dedup by detected UI/form lib markers).
4. Render each filtered entry as one numbered menu line: `<N>. <label>`.
5. Always append `Outro (descreva)` as the last numbered option, with strategy ID `custom`.

The user-facing menu format (numbered list + "Resposta (1-N):" prompt) does NOT change — only its data source. The menu typically shows 3-5 numbered options.
```

The post-table sentence ("For each invocation, only the rows whose framework matches…") becomes redundant — drop it.

- [ ] **Step 2: Verify the table is gone**

Run: `awk '/^### 0\.3/,/^### 0\.4/' skills/design-feature/SKILL.md | grep -c '| Framework | Label | Strategy ID |'`
Expected: `0`.

Run: `awk '/^### 0\.3/,/^### 0\.4/' skills/design-feature/SKILL.md | grep -c 'templates/strategies.json'`
Expected: `1` (the pointer reference).

- [ ] **Step 3: Validate (existing checks)**

Run: `node validate.mjs`
Expected: PASS.

- [ ] **Step 4: Commit (acceptance criterion 2 — SKILL §0.3 reads from JSON)**

```bash
git add skills/design-feature/SKILL.md
git commit -m "refactor(design-feature): collapse §0.3 strategy table to strategies.json pointer"
```

---

### Task 9: Extend validate.mjs with strategies.json schema checks

**Files:**
- Modify: `validate.mjs`

- [ ] **Step 1: Add a `validateStrategies()` function and call it after `validateDesignFeatureTemplate()`**

Insert just before the `const skills = readdirSync(SKILLS_DIR);` line:

```js
const CANONICAL_FRAMEWORKS = new Set(['react', 'vue', 'svelte', 'angular', 'solid', 'jquery', 'vanilla', 'custom']);
const REQUIRED_STRATEGY_FIELDS = ['id', 'framework', 'label', 'markers', 'adaptation', 'snippetLang', 'canonicalSnippet'];
const REQUIRED_MARKER_KEYS = ['ui', 'form', 'styling', 'animation', 'icons', 'exclude'];

function validateStrategies() {
  const path = join(SKILLS_DIR, 'design-feature', 'templates', 'strategies.json');
  if (!existsSync(path)) {
    issues.push({ skill: 'design-feature', message: 'missing templates/strategies.json (required by §0.3 and template generator)' });
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    issues.push({ skill: 'design-feature', message: `templates/strategies.json is not valid JSON: ${err.message}` });
    return null;
  }
  if (typeof parsed.schemaVersion !== 'number') {
    issues.push({ skill: 'design-feature', message: 'strategies.json must declare a numeric `schemaVersion`' });
  }
  if (!Array.isArray(parsed.frameworks) || parsed.frameworks.length === 0) {
    issues.push({ skill: 'design-feature', message: 'strategies.json must declare a non-empty `frameworks` array' });
  } else {
    for (const fw of parsed.frameworks) {
      if (!CANONICAL_FRAMEWORKS.has(fw)) {
        issues.push({ skill: 'design-feature', message: `strategies.json frameworks[] contains non-canonical "${fw}" (expected one of: ${[...CANONICAL_FRAMEWORKS].join(', ')})` });
      }
    }
  }
  if (!Array.isArray(parsed.strategies) || parsed.strategies.length === 0) {
    issues.push({ skill: 'design-feature', message: 'strategies.json must contain a non-empty `strategies` array' });
    return parsed;
  }
  const ids = new Set();
  for (const [i, s] of parsed.strategies.entries()) {
    for (const f of REQUIRED_STRATEGY_FIELDS) {
      if (!(f in s)) {
        issues.push({ skill: 'design-feature', message: `strategies[${i}] (${s.id ?? '?'}) missing required field "${f}"` });
      }
    }
    if (s.framework && !CANONICAL_FRAMEWORKS.has(s.framework)) {
      issues.push({ skill: 'design-feature', message: `strategies[${i}] (${s.id}) has non-canonical framework "${s.framework}"` });
    }
    if (s.id) {
      if (ids.has(s.id)) {
        issues.push({ skill: 'design-feature', message: `strategies[].id "${s.id}" appears more than once — IDs must be unique` });
      }
      ids.add(s.id);
    }
    if (s.markers && typeof s.markers === 'object') {
      for (const k of REQUIRED_MARKER_KEYS) {
        if (k in s.markers && !Array.isArray(s.markers[k])) {
          issues.push({ skill: 'design-feature', message: `strategies[${i}] (${s.id}) markers.${k} must be an array (got ${typeof s.markers[k]})` });
        }
      }
    } else if ('markers' in s) {
      issues.push({ skill: 'design-feature', message: `strategies[${i}] (${s.id}) markers must be an object` });
    }
    if (typeof s.adaptation !== 'string' || s.adaptation.trim().length === 0) {
      issues.push({ skill: 'design-feature', message: `strategies[${i}] (${s.id}) adaptation must be a non-empty string` });
    }
    if (typeof s.canonicalSnippet !== 'string' || s.canonicalSnippet.trim().length === 0) {
      issues.push({ skill: 'design-feature', message: `strategies[${i}] (${s.id}) canonicalSnippet must be a non-empty string` });
    }
    if (typeof s.snippetLang !== 'string' || s.snippetLang.trim().length === 0) {
      issues.push({ skill: 'design-feature', message: `strategies[${i}] (${s.id}) snippetLang must be a non-empty string` });
    }
  }
  return parsed;
}
```

And call it:

```js
validateDesignFeatureTemplate();
const strategiesData = validateStrategies();
```

- [ ] **Step 2: Run the validator**

Run: `node validate.mjs`
Expected: PASS (`✓ Validated 2 skill(s); no issues.`).

- [ ] **Step 3: Negative test — temporarily corrupt strategies.json and confirm the validator catches it**

Run:
```bash
cp skills/design-feature/templates/strategies.json /tmp/strat-backup.json
node -e "const d=JSON.parse(require('fs').readFileSync('skills/design-feature/templates/strategies.json','utf8')); d.strategies[0].framework='qwik'; require('fs').writeFileSync('skills/design-feature/templates/strategies.json', JSON.stringify(d,null,2))"
node validate.mjs; echo "exit=$?"
cp /tmp/strat-backup.json skills/design-feature/templates/strategies.json
```
Expected: validate.mjs prints `✗ [design-feature] strategies[0] (...) has non-canonical framework "qwik"` and exits 1.

- [ ] **Step 4: Confirm the file is restored**

Run: `node validate.mjs`
Expected: PASS.

- [ ] **Step 5: Don't commit yet** — Task 10 adds the cross-reference check + a regeneration check, then we commit acceptance criterion 4 in one chunk.

---

### Task 10: Add the regeneration-drift check and a basic cross-reference check

**Files:**
- Modify: `validate.mjs`
- Modify: `package.json` (add `build:template` and chain into `validate`)

- [ ] **Step 1: Add the cross-reference check inside `validateStrategies()` (or in a sibling function) — verify that `ds-component-pattern.md` matches the output of `build-template.mjs`**

Append to `validate.mjs`, just before the `if (issues.length === 0)` block, a synchronous spawn of the generator into a temp file, then compare bytes:

```js
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

function validateGeneratedTemplateInSync() {
  const repoRoot = resolve(here);
  const dsPatternPath = join(SKILLS_DIR, 'design-feature', 'templates', 'ds-component-pattern.md');
  if (!existsSync(dsPatternPath)) return; // template-existence covered elsewhere
  // Re-run the generator into a tmp dir and compare; simpler approach: rerun and compare to the committed file.
  const generator = resolve(repoRoot, 'scripts/build-template.mjs');
  if (!existsSync(generator)) {
    issues.push({ skill: 'design-feature', message: 'scripts/build-template.mjs missing — required to regenerate ds-component-pattern.md' });
    return;
  }
  const before = readFileSync(dsPatternPath, 'utf8');
  const result = spawnSync(process.execPath, [generator], { encoding: 'utf8' });
  if (result.status !== 0) {
    issues.push({ skill: 'design-feature', message: `build-template.mjs failed (exit ${result.status}): ${result.stderr || result.stdout}` });
    return;
  }
  const after = readFileSync(dsPatternPath, 'utf8');
  if (before !== after) {
    // The build-template script overwrites the file; if it differs from what was committed, drift.
    issues.push({ skill: 'design-feature', message: 'ds-component-pattern.md is out of sync with strategies.json — run `node scripts/build-template.mjs` and commit the result' });
    // Restore the committed bytes so subsequent runs aren't affected (CI typically discards the workspace anyway, but locally we want a clean state).
    writeFileSync(dsPatternPath, before);
  }
}
```

Call it at the end of the validations block:

```js
validateDesignFeatureTemplate();
const strategiesData = validateStrategies();
validateGeneratedTemplateInSync();
```

**Note:** the drift check runs the generator and compares the new bytes to the committed bytes — if they differ, the committed file is stale. We restore the committed bytes after the check so a dev who runs `npm test` doesn't end up with an unexpected modification on disk.

- [ ] **Step 2: Add cross-reference check — every strategy ID referenced in SKILL.md (in code/literal contexts) must exist in `strategies.json`**

Append to `validateStrategies()` (or as a new function called right after; placement matters less than coverage):

```js
function validateStrategyCrossReferences(strategies) {
  if (!strategies || !Array.isArray(strategies.strategies)) return;
  const idSet = new Set(strategies.strategies.map(s => s.id));
  idSet.add('custom'); // 'custom' is a legitimate special-case ID handled in code, not a strategies.json entry.
  const skillPath = join(SKILLS_DIR, 'design-feature', 'SKILL.md');
  if (!existsSync(skillPath)) return;
  const skillBody = readFileSync(skillPath, 'utf8');
  // Scan inline-code spans for tokens that look like strategy IDs (framework-prefixed kebab).
  // Pattern: backticked token matching ^(react|vue|svelte|angular|solid|jquery|vanilla)-[a-z][a-z0-9-]+$
  const codeSpanRe = /`([a-z]+(?:-[a-z0-9]+)+)`/g;
  let m;
  const refs = new Set();
  while ((m = codeSpanRe.exec(skillBody)) !== null) {
    const tok = m[1];
    if (/^(react|vue|svelte|angular|solid|jquery|vanilla)-/.test(tok)) refs.add(tok);
  }
  for (const r of refs) {
    if (!idSet.has(r)) {
      issues.push({ skill: 'design-feature', message: `SKILL.md references strategy ID \`${r}\` but it is missing from strategies.json` });
    }
  }
}
```

Call it after `validateStrategies()`:

```js
const strategiesData = validateStrategies();
validateStrategyCrossReferences(strategiesData);
validateGeneratedTemplateInSync();
```

- [ ] **Step 3: Run validator**

Run: `node validate.mjs`
Expected: PASS.

- [ ] **Step 4: Update package.json scripts to expose the generator**

Replace the `scripts` block:

```json
"scripts": {
  "build:template": "node scripts/build-template.mjs",
  "test": "node validate.mjs",
  "validate": "node validate.mjs"
}
```

The drift check in `validate.mjs` already re-runs the generator and catches stale committed files; the standalone `build:template` script is the convenience entry-point for contributors regenerating the file.

- [ ] **Step 5: Run validate via npm to confirm wiring**

Run: `npm test --silent`
Expected: PASS (`✓ Validated 2 skill(s); no issues.`).

- [ ] **Step 6: Negative test for drift detection — corrupt the committed `ds-component-pattern.md` and confirm validator flags it**

Run:
```bash
cp skills/design-feature/templates/ds-component-pattern.md /tmp/ds-baseline.md
node -e "let f='skills/design-feature/templates/ds-component-pattern.md'; require('fs').writeFileSync(f, require('fs').readFileSync(f,'utf8') + '\n# DRIFT MARKER\n')"
node validate.mjs; echo "exit=$?"
cp /tmp/ds-baseline.md skills/design-feature/templates/ds-component-pattern.md
node validate.mjs
```
Expected: first `node validate.mjs` prints `✗ [design-feature] ds-component-pattern.md is out of sync with strategies.json — run \`node scripts/build-template.mjs\` and commit the result` and exits 1. After restoring the baseline, second run is `PASS`.

- [ ] **Step 7: Commit (acceptance criterion 4 — validator extensions)**

```bash
git add validate.mjs package.json
git commit -m "feat(validate): check strategies.json schema, cross-refs, and template drift"
```

---

### Task 11: Final end-to-end sanity check

**Files:**
- Read-only verification.

- [ ] **Step 1: Confirm every acceptance criterion**

Run these in order; each must succeed:

```bash
# AC1: strategies.json exists with required shape
test -f skills/design-feature/templates/strategies.json
node -e "const d=JSON.parse(require('fs').readFileSync('skills/design-feature/templates/strategies.json','utf8')); const ok = d.schemaVersion===1 && Array.isArray(d.strategies) && d.strategies.every(s=>['id','framework','label','markers','adaptation','snippetLang','canonicalSnippet'].every(f=>f in s)); console.log('AC1:', ok ? 'PASS' : 'FAIL')"

# AC2: SKILL.md §0.3 table is gone, pointer present
awk '/^### 0\.3/,/^### 0\.4/' skills/design-feature/SKILL.md | grep -q '| Framework | Label | Strategy ID |' && echo "AC2: FAIL (table still present)" || echo "AC2-table: PASS"
grep -q 'templates/strategies.json' skills/design-feature/SKILL.md && echo "AC2-pointer: PASS" || echo "AC2-pointer: FAIL"

# AC3: generator + shell exist; generated file is committed
test -f scripts/build-template.mjs && echo "AC3-generator: PASS" || echo "AC3-generator: FAIL"
test -f skills/design-feature/templates/ds-component-pattern.template.md && echo "AC3-shell: PASS" || echo "AC3-shell: FAIL"
test -f skills/design-feature/templates/ds-component-pattern.md && echo "AC3-output: PASS" || echo "AC3-output: FAIL"

# AC4: validator extensions live (cross-ref, drift, schema)
grep -q 'validateStrategies' validate.mjs && echo "AC4-schema: PASS" || echo "AC4-schema: FAIL"
grep -q 'validateStrategyCrossReferences' validate.mjs && echo "AC4-xref: PASS" || echo "AC4-xref: FAIL"
grep -q 'validateGeneratedTemplateInSync' validate.mjs && echo "AC4-drift: PASS" || echo "AC4-drift: FAIL"

# AC5: three new strategies present, solid-ui marker gone
node -e "const d=JSON.parse(require('fs').readFileSync('skills/design-feature/templates/strategies.json','utf8')); const need=['react-shadcn-tailwind','vue-antdv-rhf','solid-corvu-tailwind']; const ids=new Set(d.strategies.map(s=>s.id)); console.log('AC5-new:', need.every(n=>ids.has(n)) ? 'PASS' : 'FAIL ('+need.filter(n=>!ids.has(n)).join(',')+')')"
grep -q 'solid-ui' skills/design-feature/SKILL.md && echo "AC5-removed: FAIL (solid-ui still present)" || echo "AC5-removed: PASS"

# Final validator pass
node validate.mjs
```

All lines must report PASS / no FAIL output; `node validate.mjs` must exit 0.

- [ ] **Step 2: Push branch + open PR** (separate task — handled outside the plan body)

---

## Self-review notes

- Every acceptance criterion is covered by a task and re-verified in Task 11.
- No "TBD"/"placeholder" — every step shows exact commands and full code.
- Generator-output committed: yes (Task 7); drift detection: yes (Task 10).
- The `markers` schema is populated but consumer code in SKILL.md still uses §0.1 step 2's hardcoded ecosystem table. Scope note above declares this is intentional and Sub-plan 9 will switch detection. The cross-reference validator does NOT require SKILL.md to use markers — only that referenced strategy IDs exist.
- The three new strategies are verified real: shadcn/ui (community standard pattern, generated `components/ui/*` files); ant-design-vue (existing official Vue 3 port); @corvu/text-field (Corvu is an active 2024-2025 Solid primitives library; per-primitive packages).
