# DS Component Pattern (bundled)

> This template defines the pattern for DS files produced by the design-feature skill.
> It is not Radix-specific; adapt the "Code API" section to the strategy persisted in
> `.markup-design/scratch/strategy.json`. The agent reads this file before writing or
> editing any DS file under `docs/design/design-system/`.

## Why this pattern exists

A DS file is the contract between design and implementation. When an engineer (or agent) opens a DS file, they should be able to:

1. **See the canonical visual** at the exact tokens that ship in production.
2. **Read the code** they're going to write — anchored to the strategy (`framework` + `chosen`) persisted in `.markup-design/scratch/strategy.json`.
3. **Tell which APIs are stock-lib and which are custom** without guessing — gaps are flagged explicitly.

The sections below codify the structure that satisfies all three.

## 1. File anatomy

Every DS file is a single self-contained HTML at `docs/design/design-system/NN-<slug>.html`.
No build, no imports, no JS deps — only Google Fonts (Manrope + JetBrains Mono).

`:root` with design tokens — resolve in this order:

1. **`src/styles/tokens.css` exists** → copy verbatim into `:root { … }`.
2. **`tailwind.config.{js,ts,mjs,cjs}` exists** → extract `theme.colors`, `theme.spacing`,
   `theme.fontFamily` and emit as CSS custom properties.
3. **Neither exists** → inline a safe default set: `--space-1`…`--space-8`,
   `--text-sm/base/lg`, `--motion-fast/base/slow`, `--ease-standard/spring`,
   neutral grayscale palette.

Immediately after `:root`, always include:

```css
@media (prefers-reduced-motion: reduce) {
  :root { --motion-fast: 0ms; --motion-base: 0ms; --motion-slow: 0ms; }
}
```

Page chrome classes defined in every DS file: `.page`, `.h1`, `.lede`, `.section`,
`.section-title`, `.stage`, `.caption`.

The required marker `data-ds-component="<slug>"` goes on the `.page` wrapper (see §2).

The `<script>` block is a plain IIFE — no third-party libs. Handles replay buttons
(remove `data-state` → `void el.offsetWidth` reflow → re-apply) and popover toggles.

### Skeleton

The `<style>` block is organized into these blocks, in order — each separated by a single-line `/* …  */` banner comment so an agent can locate them:

```
/* :root — tokens (verbatim from tokens.css OR derived from tailwind.config OR inline defaults) */
/* @media (prefers-reduced-motion: reduce) — zero the --motion-* tokens */
/* page chrome — .page, .h1, .lede, .section, .section-title, .stage, .caption */
/* THE COMPONENT — single recipe; [data-state] for interaction states, [data-status] for semantic status variants (see §4) */
/* demo helpers — .row-states, .state, .field-stack, .form-preview */
/* anatomy helpers — dl.tokens, table.matrix */
/* API code-block — pre.api { … } with .k .s .c .t syntax classes */
```

The `<body>` follows section types 1–8 in order. Bare skeleton:

```html
<body>
  <div class="page" data-ds-component="<slug>">
    <h1 class="h1">…</h1>
    <p class="lede">…</p>

    <section class="section"> § 1. All-states grid </section>
    <section class="section"> § 2. Per-state deep dive (1+; optional, animated states) </section>
    <section class="section"> § 3. In-context preview (optional, composes with a surface) </section>
    <section class="section"> § 4. Code API </section>
    <section class="section"> § 5. State decision matrix (table.matrix; required when ≥3 states) </section>
    <section class="section"> § 6. When to use vs siblings (optional; if a near-sibling exists) </section>
    <section class="section"> § 7. Anatomy (dl.tokens) </section>
    <section class="section"> § 8. Behavior (bullets) </section>
  </div>
  <script>(function () { /* replay buttons, popover toggles — IIFE only */ })();</script>
</body>
```

Required: §1, §4, §7, §8 — always present. Others added as applicable (see §3 Section types in order, below).

## 2. Required marker

Every DS file **must** carry `data-ds-component="<slug>"` on the outermost `.page` wrapper.
`<slug>` is kebab-case matching the filename suffix (`NN-<slug>.html`).

## 3. Section types in order

```
1. All-states grid         (.row-states with every variant labeled)
2. Per-state deep dive      (one section per non-trivial state; +replay btn if animated)
3. In-context preview       (component inside .form-preview glass surface)
4. Code API                 (pre.api, strategy-aware — see §6 of this template)
5. State decision matrix    (table: state · trigger · visual · aria)
6. When-to-use vs sibling   (table: this component · sibling component)
7. Anatomy                  (dl.tokens listing exact CSS tokens)
8. Behavior                 (bullet list of runtime contract)
```

**Required for every DS file:** sections 1, 4, 7, 8.

Add section 2 if the component has a non-default state worth showing alone; section 3 if it
composes with a surface; section 5 when there are 3+ states; section 6 when there is a
near-sibling component.

## 4. CSS conventions

**Single recipe + data attributes** — not modifier classes:

```css
.input-field[data-state="error"] input { … }   /* correct */
.input-field--error input { … }                 /* wrong  */
```

**`data-state` vs `data-status`** — use the right attribute:

Use `data-state` for interaction states (`error`, `loading`, `disabled`, `open`, `success`). Use `data-status` for semantic status variants in multi-status components like alert-banner / badge / callout (`error`, `warning`, `success`, `info`). When a component is multi-status, the hue parameterization from the Status hue table applies via `[data-status="..."]`.

**Status hue parameterization** using `oklch()`:

| Status | Hue | Alpha pair (surface / border) |
|---|---|---|
| error | 25 | 0.23 / 0.4 |
| warning | 80 | 0.23 / 0.4 |
| success | 152 | 0.23 / 0.4 |
| info | 200 | 0.23 / 0.4 |

**Motion tokens** — never hard-code durations; always reference CSS variables:

| Token | Typical value | Use |
|---|---|---|
| `--motion-fast` | 120ms | Hover, micro-interactions |
| `--motion-base` | 220ms | Focus, state transitions |
| `--motion-slow` | 380ms | Entrance / exit |
| `--ease-standard` | cubic-bezier(0.4, 0, 0.2, 1) | Default easing |
| `--ease-spring` | cubic-bezier(0.34, 1.56, 0.64, 1) | Springy feedback |

**Animations state-driven** — fired by `data-state` attribute change, not by JS animation
calls. Replay = remove attribute + `void el.offsetWidth` reflow + re-apply attribute.

**Demo helpers:**

| Class | Purpose |
|---|---|
| `.row-states` | Flex row presenting every variant side by side |
| `.state` | Individual cell inside `.row-states` |
| `.field-stack` | Vertical stack for multiple form fields |
| `.form-preview` | Glass-surface card for in-context preview (section 3) |

**Anatomy helpers:**

| Element | Purpose |
|---|---|
| `dl.tokens` | Definition list of every CSS token the component uses |
| `table.matrix` | State decision matrix (state · trigger · visual · aria) |

**Code API block** — `pre.api` with syntax classes `.k` (keyword) `.s` (string) `.c`
(comment) `.t` (type). Must show real import paths and real prop names — not pseudo-code.

## 5. Gap documentation

A "gap" is any state the DS file defines that the chosen library does not provide natively.
Document every gap in **three places**:

1. **`table.matrix` row** — mark the "Visual" cell `(custom)`.
2. **`pre.api` comment** — explain the gap and workaround inline.
3. **CSS comment above the rule:**

```css
/* SUCCESS — not provided by antd: antd's <Form.Item validateStatus> has
   no "success" affirmative state. Use this when you want explicit
   affirmative feedback after an async check. */
.input-field[data-state="success"] input { … }
```

### Worked examples

The point of the gap-documentation format is to let a reader see *why* the gap exists, not just *that* it exists. Two patterns to imitate:

**Success state when the lib's "valid" is passive.** Most form libs expose a passive "no errors" state (e.g., antd's `Form.Item` clears `validateStatus`; Radix Form exposes `[data-valid]` as a resting state; native `:valid`). None of those produce an *affirmative* visual — they just remove the error. Showing a green ✓ on every untouched input is noise. So *success* is a **custom DS state**: `[data-state="success"]` on the wrapper, set manually after an async confirmation (name availability, code redeemed, link verified). Visual: success border + 3px success ring + ✓ trailing icon (pop-in) + ✓ green help text. Aria: SR-friendly help text announces the affirmative.

**Action slot on an inline banner.** Toast libs (`@radix-ui/react-toast`, `react-toastify`, antd `notification`, Vuetify `<v-snackbar>`, etc.) ship a built-in action slot — but an inline banner is *not* a toast: it doesn't auto-dismiss, doesn't slide in from a region. The banner mirrors the Action API anyway (label + onClick handler). Strategy-specific composition: Radix consumers expose `asChild` + `Slot` for the action; antd/MUI/Chakra accept a render prop or named slot; Vue/Svelte expose a named `<slot name="action">`; vanilla accepts a `<button>` child. Visual: pill button on the right side, in the status hue. Document this in DS-file §5 (one matrix row per slot variant) and as a bullet in DS-file §4 explaining the parallel-to-Toast intent.

## 6. Strategy adaptation guide for "Code API" section

The lookup key is the tuple `(framework, chosen)` from `.markup-design/scratch/strategy.json`.

### React (`framework: "react"`)

| Strategy ID | How to write "Code API" |
|---|---|
| `react-antd-max` | `import { Form, Input, Button } from 'antd'`. Map each `data-state` to the matching antd prop (`validateStatus`, `status`, `loading`, `disabled`). |
| `react-antd-rhf` | `import { Controller, useForm } from 'react-hook-form'` + antd controls inside `<Controller>`. |
| `react-radix-primitives` | `import * as Form from '@radix-ui/react-form'` + compound primitives + `asChild` slot. |
| `react-mui-max` | `import { TextField, Button } from '@mui/material'` + MUI props. |
| `react-mui-rhf` | MUI controls wrapped in `<Controller>`. |
| `react-chakra-max` | `import { Input, FormControl, FormLabel } from '@chakra-ui/react'`. |
| `react-mantine-max` | `import { TextInput, Button } from '@mantine/core'`. |
| `react-headlessui-tailwind` | `@headlessui/react` for behavior + Tailwind utility classes. |
| `react-bootstrap-max` | `import { Form, Button } from 'react-bootstrap'` + Bootstrap classes. Validation via `isInvalid` prop + `<Form.Control.Feedback>`. |
| `react-vanilla-tailwind` | Native HTML + Tailwind utilities; no UI lib imports. |
| `react-vanilla` | Native HTML + BEM classes; no UI lib imports. |

### Vue (`framework: "vue"`)

| Strategy ID | How to write "Code API" |
|---|---|
| `vue-vuetify-max` | `<v-text-field>`, `<v-btn>`, `<v-form>` with Vuetify props. `<script setup>` syntax. |
| `vue-vuetify-vee` | Vuetify controls inside `<Field>` from `vee-validate` (`useForm` + `useField`). |
| `vue-element-plus-max` | `<el-input>`, `<el-button>`, `<el-form>` with Element Plus props. |
| `vue-naive-max` | `<n-input>`, `<n-button>`, `<n-form>` with Naive UI props. |
| `vue-primevue-max` | `<InputText>`, `<Button>` from PrimeVue. |
| `vue-quasar-max` | `<q-input>`, `<q-btn>`, `<q-form>` from Quasar. |
| `vue-vanilla-tailwind` | Native `<input>` + Tailwind utilities in `<template>`. |
| `vue-vanilla` | Native SFC `<template>` + scoped `<style>`. |

### Svelte (`framework: "svelte"`)

| Strategy ID | How to write "Code API" |
|---|---|
| `svelte-skeleton-max` | Skeleton components + Tailwind utility classes. |
| `svelte-flowbite-max` | `import { Input, Button } from 'flowbite-svelte'`. |
| `svelte-sveltestrap-max` | `import { Input, Button } from 'sveltestrap'`. |
| `svelte-melt-tailwind` | Melt UI builders (`createCombobox`, `createDialog`) + Tailwind classes. |
| `svelte-vanilla-tailwind` | Native `<input>` + Tailwind utility classes. |
| `svelte-vanilla` | Native `<input>` + `<style>` scoped. |

### Angular (`framework: "angular"`)

| Strategy ID | How to write "Code API" |
|---|---|
| `angular-material-max` | `<mat-form-field>` + `matInput` + `<button mat-button>`. ReactiveForms (`FormControl`, `FormGroup`) wired via `formControlName`. |
| `angular-primeng-max` | `<p-inputText>`, `<p-button>` + ReactiveForms. |
| `angular-ngbootstrap-max` | NG Bootstrap directives + Bootstrap classes + ReactiveForms. |
| `angular-taiga-max` | `<tui-input>`, `<button tuiButton>` + ReactiveForms. |
| `angular-vanilla-tailwind` | Native `<input>` + Tailwind utility classes + ReactiveForms. |
| `angular-vanilla` | Native `<input>` + component CSS + ReactiveForms. |

### Solid (`framework: "solid"`)

| Strategy ID | How to write "Code API" |
|---|---|
| `solid-kobalte-tailwind` | `import { TextField } from '@kobalte/core/text-field'` + Tailwind classes. |
| `solid-hope-max` | `import { Input, Button } from '@hope-ui/solid'`. |
| `solid-vanilla-tailwind` | Native JSX `<input>` + Tailwind utility classes. |
| `solid-vanilla` | Native JSX `<input>` + CSS modules. |

### jQuery (`framework: "jquery"`)

| Strategy ID | How to write "Code API" |
|---|---|
| `jquery-ui-bootstrap` | Bootstrap markup (`<input class="form-control">`) + jQuery UI initializers (`.datepicker()`, `.autocomplete()`). Wire validation with `jquery-validation`. |
| `jquery-bootstrap-max` | Bootstrap markup + plain jQuery event handlers (`$('#x').on('click', ...)`); no jQuery UI widgets. |
| `jquery-vanilla` | Plain HTML + jQuery selectors + `.on()` event handlers; CSS classes hand-rolled. |

### Vanilla (`framework: "vanilla"`)

| Strategy ID | How to write "Code API" |
|---|---|
| `vanilla-html-tailwind` | Native HTML + Tailwind utility classes + plain `<script>` (`document.querySelector`, `addEventListener`). |
| `vanilla-html` | Native HTML + BEM classes + plain `<script>`. |

### Custom (`chosen: "custom"`)

Best-effort interpretation of the `freeText` field in `strategy.json`. If the agent is not confident in the syntax for the described stack, it MUST ask the user before writing the Code API section.

## 6b. Common gaps per strategy (pre-populated catalog)

When the agent generates a DS file, it should pre-populate `(custom)` rows in §5 State decision matrix for any state the chosen strategy is known not to cover natively. This catalog is the seed; the agent confirms each by checking the actual lib API before writing.

**Shortcut for fully-custom strategies.** Any strategy whose ID ends in `-vanilla` or `-vanilla-tailwind`, plus the headless families `react-headlessui-tailwind`, `svelte-melt-tailwind`, and `solid-kobalte-tailwind` — treat **every** state as custom (no native lib bindings). Skip the per-row lookup below and mark every state in §5 as `(custom)`. The per-row entries for these strategies are included only for completeness.

**React strategies:**

| Strategy | Known gaps → flag as `(custom)` |
|---|---|
| `react-antd-max`, `react-antd-rhf` | (a) `Form.Item validateStatus="success"` renders a green border, but the affirmative ✓ icon only appears when `hasFeedback` is also set on `Form.Item` — easy to miss. Flag missing-`hasFeedback` as the gap. (b) `Input.TextArea` has no built-in `loading` prop (single-line `Input` does, since antd 5.x). (c) No inline-banner with both header + action button — `Alert` is close but lacks an `Action` slot. |
| `react-radix-primitives` | (a) No Button primitive — use native `<button>`. (b) No Input/TextField primitive — use native `<input>` inside `Form.Control asChild`. (c) No inline-banner / callout — custom compound. (d) No affirmative success state beyond passive `[data-valid]` (which is set on `Form.Message match="valid"`, not on the field wrapper). |
| `react-mui-max`, `react-mui-rhf` | (a) `TextField` has no `loading` state (use `disabled` + `<CircularProgress>`). (b) `Alert` does not auto-dismiss — for that use `Snackbar`, but a single component that does both inline + auto-dismiss is custom. (c) No success affirmative state on form fields beyond `error`/no-error. |
| `react-chakra-max` | (a) `FormControl` shows error via `isInvalid` but no success state. (b) Inline banner is `Alert` — minimal action-slot composition; tracking action handlers is custom. |
| `react-mantine-max` | (a) Inputs support `error` prop but no `success` prop. (b) `Notification` is the toast surface — inline banner with `action` slot is custom. |
| `react-headlessui-tailwind` | Headless means *all* visual state is custom — Tailwind classes are arbitrary, so every state (`hover`, `focus`, `disabled`, `error`, `success`, `loading`) is "(custom)" in the sense that there's no lib mapping. Document each via `data-*` attribute conventions you choose. |
| `react-bootstrap-max` | (a) `Form.Control isValid` renders Bootstrap's green border + ✓ icon (CSS `background-image` SVG); the gap is the missing ARIA live region announcing success — adding `aria-live="polite"` or an `sr-only` live region is custom. `<Form.Control.Feedback type="valid">` covers the success-text case if used. (b) No native toast/snackbar primitive beyond `Toast` (manually positioned). |
| `react-vanilla-tailwind`, `react-vanilla` | All states are custom — no lib to inherit from. |

**Vue strategies:**

| Strategy | Known gaps |
|---|---|
| `vue-vuetify-max`, `vue-vuetify-vee` | (a) `<v-text-field>` HAS native `success` + `success-messages` props in Vuetify 3 — do NOT flag as custom; use the native props. (b) `<v-alert>` has 4 status types — `action` slot is supported but motion preset is custom. |
| `vue-element-plus-max` | (a) `<el-input>` has no `success` state. (b) `<el-alert>` is dismissible but no action button slot. |
| `vue-naive-max` | (a) `<n-input>` supports `status` prop (values: `"error"`, `"warning"`, `"success"`) — affirmative success IS native — flag only loading/in-progress as custom. Note: the prop is `status`, not `validation-status` (deprecated pre-2.27). |
| `vue-primevue-max` | (a) Form components require manual `p-invalid` class for error state — success is custom. |
| `vue-quasar-max` | (a) Inputs support `error` + `error-message` but no `success` analog. |
| `vue-vanilla-tailwind`, `vue-vanilla` | All states custom. |

**Svelte / Angular / Solid / jQuery / Vanilla strategies:**

| Strategy family | Generalization |
|---|---|
| `svelte-*` (skeleton, flowbite, sveltestrap, melt, vanilla) | Skeleton + Flowbite ship error/success on form fields; Sveltestrap (Bootstrap) is success-only via class; Melt is headless (all custom). |
| `angular-material-max`, `angular-primeng-max`, `angular-ngbootstrap-max`, `angular-taiga-max` | Angular Material `<mat-form-field>` has no affirmative success state; PrimeNG `p-inputText` requires manual `p-invalid` / `p-success` class management; NG Bootstrap inherits Bootstrap's validation classes (success = green border, no icon). |
| `angular-vanilla-*` | All states custom. |
| `solid-kobalte-tailwind`, `solid-hope-max`, `solid-vanilla-*` | Kobalte is headless (all custom); Hope UI has `invalid` prop but no affirmative success. |
| `jquery-ui-bootstrap`, `jquery-bootstrap-max`, `jquery-vanilla` | `jquery-validation` writes `valid` / `invalid` classes — affirmative success is opt-in via custom rules. Inline banners are pure Bootstrap classes — action slot is custom. |
| `vanilla-html-tailwind`, `vanilla-html` | Native form validation = pattern/required/min/max attributes + `:valid` / `:invalid` pseudo-classes. Affirmative success is always custom. |

**Usage:** Before writing §5 State decision matrix, the agent reads this catalog for the `(framework, chosen)` tuple, then for each gap listed: (a) confirm it's actually relevant to the component being designed (a button rarely needs a success state; an input often does), (b) if relevant, add a row to §5 marked `(custom)` with the gap noted in the trigger column, (c) add the corresponding bullet to §4 Code API and CSS comment per the gap-documentation format.

This catalog seeds the workflow — it does not constrain it. New gaps encountered in practice should be added here (single bundled template = single source of truth).

## 7. Anatomy section

The anatomy section of every DS file must contain a `dl.tokens` listing every CSS custom
property the component reads from `:root` or declares itself. Include shared motion tokens,
color tokens, and any component-specific variables.

Rules:
- List every token the component **reads**, even shared ones from `:root`.
- Omit tokens defined in `:root` but never referenced by this component.
- If a token is a gap workaround (§5), add a note: `(custom — not from <chosen-lib>)`.

## 8. Things to avoid

1. **Hard-coded colors outside `:root`.** Every color must trace to a CSS custom property.
   Raw literals (`#abc`, `rgb()`, `oklch()`) are only permitted inside `:root`.

2. **Multiple files per component.** Status variants are the same component styled via
   `[data-status]`. Never create `input-error.html`, `input-warning.html`, etc.

3. **Hiding the API.** The `pre.api` block must show the real import path and real prop
   names. Do not abbreviate, omit required props, or show only a subset of states.

4. **Mock data pretending to be the API.** If the chosen lib requires a `<FormProvider>`
   or `useForm()` hook, show it. Do not write simplified demo-only wrappers.

5. **Variant chips inside the DS file.** That is the *ideia* pattern with the tweaker.
   DS files show all states simultaneously in `.row-states` — never add `<select>` or radio
   toggles to switch variants inside the DS file itself.

## 9. Examples by strategy

One canonical snippet per strategy ID. The agent uses these as the literal reference when writing section 4 ("Code API") of a DS file.

### React

#### `react-antd-max`
```tsx
import { Form, Input, Button } from 'antd';

<Form layout="vertical" onFinish={values => console.log(values)}>
  <Form.Item name="name" label="Name" rules={[{ required: true }, { pattern: /^[a-z0-9-]+$/, message: 'Lowercase, digits, hyphens only.' }]}>
    <Input />
  </Form.Item>
  <Button type="primary" htmlType="submit">Submit</Button>
</Form>
```

#### `react-antd-rhf`
```tsx
import { Controller, useForm } from 'react-hook-form';
import { Form, Input } from 'antd';

const { control } = useForm();

<Form layout="vertical">
  <Controller
    name="name"
    control={control}
    rules={{ required: 'Required', pattern: { value: /^[a-z0-9-]+$/, message: 'Lowercase, digits, hyphens only.' } }}
    render={({ field, fieldState }) => (
      <Form.Item label="Name" validateStatus={fieldState.invalid ? 'error' : ''} help={fieldState.error?.message}>
        <Input {...field} />
      </Form.Item>
    )}
  />
</Form>
```

#### `react-radix-primitives`
```tsx
import * as Form from '@radix-ui/react-form';

<Form.Root onSubmit={e => { e.preventDefault(); }}>
  <Form.Field name="name">
    <Form.Label>Name</Form.Label>
    <Form.Control asChild>
      <input required pattern="[a-z0-9-]+" />
    </Form.Control>
    <Form.Message match="valueMissing">Required.</Form.Message>
    <Form.Message match="patternMismatch">Lowercase, digits, hyphens only.</Form.Message>
  </Form.Field>
  <Form.Submit>Submit</Form.Submit>
</Form.Root>
```

#### `react-mui-max`
```tsx
import { TextField, Button } from '@mui/material';
import { useState } from 'react';

const [name, setName] = useState('');
const error = name && !/^[a-z0-9-]+$/.test(name);

<form onSubmit={e => e.preventDefault()}>
  <TextField label="Name" value={name} onChange={e => setName(e.target.value)}
    required error={!!error} helperText={error ? 'Lowercase, digits, hyphens only.' : ''} />
  <Button type="submit" variant="contained">Submit</Button>
</form>
```

#### `react-mui-rhf`
```tsx
import { Controller, useForm } from 'react-hook-form';
import { TextField, Button } from '@mui/material';

const { control, handleSubmit } = useForm();

<form onSubmit={handleSubmit(console.log)}>
  <Controller name="name" control={control}
    rules={{ required: 'Required', pattern: { value: /^[a-z0-9-]+$/, message: 'Lowercase, digits, hyphens only.' } }}
    render={({ field, fieldState }) => (
      <TextField {...field} label="Name" required error={!!fieldState.error} helperText={fieldState.error?.message} />
    )} />
  <Button type="submit" variant="contained">Submit</Button>
</form>
```

#### `react-chakra-max`
```tsx
import { Input, FormControl, FormLabel, FormErrorMessage, Button } from '@chakra-ui/react';
import { useState } from 'react';

const [name, setName] = useState('');
const isInvalid = name !== '' && !/^[a-z0-9-]+$/.test(name);

<form onSubmit={e => e.preventDefault()}>
  <FormControl isRequired isInvalid={isInvalid}>
    <FormLabel>Name</FormLabel>
    <Input value={name} onChange={e => setName(e.target.value)} />
    <FormErrorMessage>Lowercase, digits, hyphens only.</FormErrorMessage>
  </FormControl>
  <Button type="submit" mt={4} colorScheme="blue">Submit</Button>
</form>
```

#### `react-mantine-max`
```tsx
import { TextInput, Button } from '@mantine/core';
import { useForm } from '@mantine/form';

const form = useForm({
  initialValues: { name: '' },
  validate: { name: v => /^[a-z0-9-]+$/.test(v) ? null : 'Lowercase, digits, hyphens only.' },
});

<form onSubmit={form.onSubmit(console.log)}>
  <TextInput label="Name" required {...form.getInputProps('name')} />
  <Button type="submit" mt="sm">Submit</Button>
</form>
```

#### `react-headlessui-tailwind`
```tsx
import { Field, Label, Input } from '@headlessui/react';
import { useState } from 'react';

const [name, setName] = useState('');
const error = name !== '' && !/^[a-z0-9-]+$/.test(name);

<form onSubmit={e => e.preventDefault()} className="flex flex-col gap-4">
  <Field>
    <Label className="text-sm font-medium">Name</Label>
    <Input value={name} onChange={e => setName(e.target.value)} required
      className="mt-1 block w-full rounded border px-3 py-2 data-[invalid]:border-red-500" data-invalid={error || undefined} />
    {error && <p className="mt-1 text-xs text-red-600">Lowercase, digits, hyphens only.</p>}
  </Field>
  <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">Submit</button>
</form>
```

#### `react-bootstrap-max`
```tsx
import { useState } from 'react';
import { Form, Button } from 'react-bootstrap';

const [name, setName] = useState('');
const invalid = name !== '' && !/^[a-z0-9-]+$/.test(name);

<Form noValidate>
  <Form.Group className="mb-3">
    <Form.Label>Name</Form.Label>
    <Form.Control type="text" value={name} onChange={e => setName(e.target.value)}
      required pattern="[a-z0-9-]+" isInvalid={invalid} />
    <Form.Control.Feedback type="invalid">Lowercase, digits, hyphens only.</Form.Control.Feedback>
  </Form.Group>
  <Button type="submit" variant="primary">Submit</Button>
</Form>
```

#### `react-vanilla-tailwind`
```tsx
import { useState } from 'react';

const [name, setName] = useState('');
const error = name !== '' && !/^[a-z0-9-]+$/.test(name);

<form onSubmit={e => e.preventDefault()} className="flex flex-col gap-4">
  <label className="flex flex-col gap-1 text-sm font-medium">
    Name
    <input value={name} onChange={e => setName(e.target.value)} required
      className={`rounded border px-3 py-2 ${error ? 'border-red-500' : 'border-gray-300'}`} />
    {error && <span className="text-xs text-red-600">Lowercase, digits, hyphens only.</span>}
  </label>
  <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">Submit</button>
</form>
```

#### `react-vanilla`
```tsx
import { useState } from 'react';

const [name, setName] = useState('');
const error = name !== '' && !/^[a-z0-9-]+$/.test(name);

<form onSubmit={e => e.preventDefault()} className="form">
  <label className="form__label">
    Name
    <input value={name} onChange={e => setName(e.target.value)} required
      className={`form__input${error ? ' form__input--error' : ''}`} />
    {error && <span className="form__error">Lowercase, digits, hyphens only.</span>}
  </label>
  <button type="submit" className="form__submit">Submit</button>
</form>
```

### Vue

#### `vue-vuetify-max`
```vue
<script setup>
import { ref } from 'vue';
const name = ref('');
const rules = [v => !!v || 'Required', v => /^[a-z0-9-]+$/.test(v) || 'Lowercase, digits, hyphens only.'];
</script>

<template>
  <v-form @submit.prevent>
    <v-text-field v-model="name" label="Name" :rules="rules" required />
    <v-btn type="submit" color="primary">Submit</v-btn>
  </v-form>
</template>
```

#### `vue-vuetify-vee`
```vue
<script setup>
import { useForm, useField } from 'vee-validate';
const { handleSubmit } = useForm();
const { value: name, errorMessage } = useField('name', v =>
  /^[a-z0-9-]+$/.test(v) ? true : 'Lowercase, digits, hyphens only.'
);
</script>

<template>
  <v-form @submit.prevent="handleSubmit">
    <v-text-field v-model="name" label="Name" :error-messages="errorMessage" />
    <v-btn type="submit">Submit</v-btn>
  </v-form>
</template>
```

#### `vue-element-plus-max`
```vue
<script setup>
import { ref, reactive } from 'vue';
const form = reactive({ name: '' });
const rules = { name: [{ required: true, message: 'Required' }, { pattern: /^[a-z0-9-]+$/, message: 'Lowercase, digits, hyphens only.' }] };
</script>

<template>
  <el-form :model="form" :rules="rules" label-position="top" @submit.prevent>
    <el-form-item label="Name" prop="name">
      <el-input v-model="form.name" />
    </el-form-item>
    <el-button type="primary" native-type="submit">Submit</el-button>
  </el-form>
</template>
```

#### `vue-naive-max`
```vue
<script setup>
import { ref } from 'vue';
const formValue = ref({ name: '' });
const rules = { name: { required: true, trigger: 'blur', validator: (rule, v) => /^[a-z0-9-]+$/.test(v) ? Promise.resolve() : Promise.reject('Lowercase, digits, hyphens only.') } };
</script>

<template>
  <n-form :model="formValue" :rules="rules">
    <n-form-item label="Name" path="name">
      <n-input v-model:value="formValue.name" placeholder="Enter name" />
    </n-form-item>
    <n-button type="primary" attr-type="submit">Submit</n-button>
  </n-form>
</template>
```

#### `vue-primevue-max`
```vue
<script setup>
import { ref } from 'vue';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
const name = ref('');
const error = ref('');
function validate() { error.value = /^[a-z0-9-]+$/.test(name.value) ? '' : 'Lowercase, digits, hyphens only.'; }
</script>

<template>
  <form @submit.prevent="validate" class="flex flex-col gap-3">
    <label class="flex flex-col gap-1">Name
      <InputText v-model="name" required :class="{ 'p-invalid': error }" />
      <small class="p-error">{{ error }}</small>
    </label>
    <Button type="submit" label="Submit" />
  </form>
</template>
```

#### `vue-quasar-max`
```vue
<script setup>
import { ref } from 'vue';
const name = ref('');
const nameRules = [v => !!v || 'Required', v => /^[a-z0-9-]+$/.test(v) || 'Lowercase, digits, hyphens only.'];
</script>

<template>
  <q-form @submit.prevent>
    <q-input v-model="name" label="Name" :rules="nameRules" lazy-rules />
    <q-btn type="submit" color="primary" label="Submit" />
  </q-form>
</template>
```

#### `vue-vanilla-tailwind`
```vue
<script setup>
import { ref, computed } from 'vue';
const name = ref('');
const error = computed(() => name.value && !/^[a-z0-9-]+$/.test(name.value) ? 'Lowercase, digits, hyphens only.' : '');
</script>

<template>
  <form @submit.prevent class="flex flex-col gap-4">
    <label class="flex flex-col gap-1 text-sm font-medium">Name
      <input v-model="name" required :class="['rounded border px-3 py-2', error ? 'border-red-500' : 'border-gray-300']" />
      <span v-if="error" class="text-xs text-red-600">{{ error }}</span>
    </label>
    <button type="submit" class="rounded bg-blue-600 px-4 py-2 text-white">Submit</button>
  </form>
</template>
```

#### `vue-vanilla`
```vue
<script setup>
import { ref, computed } from 'vue';
const name = ref('');
const error = computed(() => name.value && !/^[a-z0-9-]+$/.test(name.value) ? 'Lowercase, digits, hyphens only.' : '');
</script>

<template>
  <form @submit.prevent class="form">
    <label class="form__label">Name
      <input v-model="name" required :class="['form__input', { 'form__input--error': error }]" />
      <span v-if="error" class="form__error">{{ error }}</span>
    </label>
    <button type="submit" class="form__submit">Submit</button>
  </form>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 1rem; }
.form__label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem; }
.form__input { border: 1px solid #d1d5db; border-radius: 4px; padding: 0.5rem 0.75rem; }
.form__input--error { border-color: #ef4444; }
.form__error { color: #ef4444; font-size: 0.75rem; }
</style>
```

### Svelte

#### `svelte-skeleton-max`
```svelte
<script>
  import { InputChip } from '@skeletonlabs/skeleton';
  let name = '';
  let error = '';
  function validate() { error = /^[a-z0-9-]+$/.test(name) ? '' : 'Lowercase, digits, hyphens only.'; }
</script>

<form on:submit|preventDefault={validate} class="flex flex-col gap-4">
  <label class="label"><span>Name</span>
    <input class="input" class:input-error={error} bind:value={name} required />
    {#if error}<span class="text-error-500 text-xs">{error}</span>{/if}
  </label>
  <button type="submit" class="btn variant-filled-primary">Submit</button>
</form>
```

#### `svelte-flowbite-max`
```svelte
<script>
  import { Input, Button, Label, Helper } from 'flowbite-svelte';
  let name = '';
  let error = '';
  function validate() { error = /^[a-z0-9-]+$/.test(name) ? '' : 'Lowercase, digits, hyphens only.'; }
</script>

<form on:submit|preventDefault={validate} class="flex flex-col gap-4">
  <Label>Name
    <Input bind:value={name} required color={error ? 'red' : 'base'} />
    {#if error}<Helper color="red">{error}</Helper>{/if}
  </Label>
  <Button type="submit">Submit</Button>
</form>
```

#### `svelte-sveltestrap-max`
```svelte
<script>
  import { FormGroup, Input, Label, Button, FormFeedback } from 'sveltestrap';
  let name = '';
  let dirty = false;
  $: invalid = dirty && !/^[a-z0-9-]+$/.test(name);
</script>

<form on:submit|preventDefault={() => (dirty = true)}>
  <FormGroup>
    <Label>Name</Label>
    <Input type="text" bind:value={name} {invalid} required />
    <FormFeedback>Lowercase, digits, hyphens only.</FormFeedback>
  </FormGroup>
  <Button type="submit" color="primary">Submit</Button>
</form>
```

#### `svelte-melt-tailwind`
```svelte
<script>
  import { createLabel } from '@melt-ui/svelte';
  let name = '';
  let error = '';
  const { elements: { root: label } } = createLabel();
  function validate() { error = /^[a-z0-9-]+$/.test(name) ? '' : 'Lowercase, digits, hyphens only.'; }
</script>

<form on:submit|preventDefault={validate} class="flex flex-col gap-4">
  <div class="flex flex-col gap-1">
    <label use:label class="text-sm font-medium">Name</label>
    <input bind:value={name} required class="rounded border px-3 py-2 {error ? 'border-red-500' : 'border-gray-300'}" />
    {#if error}<span class="text-xs text-red-600">{error}</span>{/if}
  </div>
  <button type="submit" class="rounded bg-blue-600 px-4 py-2 text-white">Submit</button>
</form>
```

#### `svelte-vanilla-tailwind`
```svelte
<script>
  let name = '';
  let error = '';
  function validate() { error = /^[a-z0-9-]+$/.test(name) ? '' : 'Lowercase, digits, hyphens only.'; }
</script>

<form on:submit|preventDefault={validate} class="flex flex-col gap-4">
  <label class="flex flex-col gap-1 text-sm font-medium">Name
    <input bind:value={name} required class="rounded border px-3 py-2 {error ? 'border-red-500' : 'border-gray-300'}" />
    {#if error}<span class="text-xs text-red-600">{error}</span>{/if}
  </label>
  <button type="submit" class="rounded bg-blue-600 px-4 py-2 text-white">Submit</button>
</form>
```

#### `svelte-vanilla`
```svelte
<script>
  let name = '';
  let error = '';
  function validate() { error = /^[a-z0-9-]+$/.test(name) ? '' : 'Lowercase, digits, hyphens only.'; }
</script>

<form on:submit|preventDefault={validate} class="form">
  <label class="form__label">Name
    <input bind:value={name} required class="form__input" class:form__input--error={error} />
    {#if error}<span class="form__error">{error}</span>{/if}
  </label>
  <button type="submit" class="form__submit">Submit</button>
</form>

<style>
  .form { display: flex; flex-direction: column; gap: 1rem; }
  .form__label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem; }
  .form__input { border: 1px solid #d1d5db; border-radius: 4px; padding: 0.5rem 0.75rem; }
  .form__input--error { border-color: #ef4444; }
  .form__error { color: #ef4444; font-size: 0.75rem; }
</style>
```

### Angular

#### `angular-material-max`
```typescript
// signup.component.ts
import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="form.valid && onSubmit()">
      <mat-form-field appearance="outline">
        <mat-label>Name</mat-label>
        <input matInput formControlName="name" required />
        <mat-error>Lowercase, digits, hyphens only.</mat-error>
      </mat-form-field>
      <button mat-raised-button color="primary" type="submit">Submit</button>
    </form>`,
})
export class SignupComponent {
  form = new FormGroup({ name: new FormControl('', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]) });
  onSubmit() { console.log(this.form.value); }
}
```

#### `angular-primeng-max`
```typescript
// signup.component.ts
import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, InputTextModule, ButtonModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="form.valid && onSubmit()" class="flex flex-col gap-3">
      <label class="flex flex-col gap-1 text-sm">Name
        <input pInputText formControlName="name" required [class.ng-invalid]="form.controls.name.invalid && form.controls.name.dirty" />
        <small *ngIf="form.controls.name.errors?.['pattern']" class="text-red-500">Lowercase, digits, hyphens only.</small>
      </label>
      <p-button type="submit" label="Submit" />
    </form>`,
})
export class SignupComponent {
  form = new FormGroup({ name: new FormControl('', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]) });
  onSubmit() { console.log(this.form.value); }
}
```

#### `angular-ngbootstrap-max`
```typescript
// signup.component.ts
import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, NgbModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="form.valid && onSubmit()">
      <div class="mb-3">
        <label class="form-label">Name</label>
        <input class="form-control" formControlName="name" required
          [class.is-invalid]="form.controls.name.invalid && form.controls.name.dirty" />
        <div class="invalid-feedback">Lowercase, digits, hyphens only.</div>
      </div>
      <button type="submit" class="btn btn-primary">Submit</button>
    </form>`,
})
export class SignupComponent {
  form = new FormGroup({ name: new FormControl('', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]) });
  onSubmit() { console.log(this.form.value); }
}
```

#### `angular-taiga-max`
```typescript
// signup.component.ts
import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { TuiInputModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TuiButton } from '@taiga-ui/core';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, TuiInputModule, TuiTextfieldControllerModule, TuiButton],
  template: `
    <form [formGroup]="form" (ngSubmit)="form.valid && onSubmit()" class="flex flex-col gap-4">
      <tui-input formControlName="name">Name
        <input tuiTextfieldLegacy required />
      </tui-input>
      <button tuiButton type="submit" appearance="primary">Submit</button>
    </form>`,
})
export class SignupComponent {
  form = new FormGroup({ name: new FormControl('', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]) });
  onSubmit() { console.log(this.form.value); }
}
```

#### `angular-vanilla-tailwind`
```typescript
// signup.component.ts
import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="form.valid && onSubmit()" class="flex flex-col gap-4">
      <label class="flex flex-col gap-1 text-sm font-medium">Name
        <input formControlName="name" required class="rounded border px-3 py-2"
          [class.border-red-500]="form.controls.name.invalid && form.controls.name.dirty" />
        <span *ngIf="form.controls.name.errors?.['pattern']" class="text-xs text-red-600">Lowercase, digits, hyphens only.</span>
      </label>
      <button type="submit" class="rounded bg-blue-600 px-4 py-2 text-white">Submit</button>
    </form>`,
})
export class SignupComponent {
  form = new FormGroup({ name: new FormControl('', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]) });
  onSubmit() { console.log(this.form.value); }
}
```

#### `angular-vanilla`
```typescript
// signup.component.ts
import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule],
  styles: [`.form{display:flex;flex-direction:column;gap:1rem}.form__label{display:flex;flex-direction:column;gap:.25rem;font-size:.875rem}.form__input{border:1px solid #d1d5db;border-radius:4px;padding:.5rem .75rem}.form__input.ng-invalid.ng-dirty{border-color:#ef4444}.form__error{color:#ef4444;font-size:.75rem}`],
  template: `
    <form [formGroup]="form" (ngSubmit)="form.valid && onSubmit()" class="form">
      <label class="form__label">Name
        <input formControlName="name" required class="form__input" />
        <span *ngIf="form.controls.name.errors?.['pattern'] && form.controls.name.dirty" class="form__error">Lowercase, digits, hyphens only.</span>
      </label>
      <button type="submit" class="form__submit">Submit</button>
    </form>`,
})
export class SignupComponent {
  form = new FormGroup({ name: new FormControl('', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]) });
  onSubmit() { console.log(this.form.value); }
}
```

### Solid

#### `solid-kobalte-tailwind`
```tsx
import { TextField } from '@kobalte/core/text-field';
import { createSignal } from 'solid-js';

const [name, setName] = createSignal('');
const error = () => name() && !/^[a-z0-9-]+$/.test(name()) ? 'Lowercase, digits, hyphens only.' : '';

<form onSubmit={e => e.preventDefault()} class="flex flex-col gap-4">
  <TextField value={name()} onChange={setName} validationState={error() ? 'invalid' : 'valid'}>
    <TextField.Label class="text-sm font-medium">Name</TextField.Label>
    <TextField.Input required class="rounded border px-3 py-2 ui-invalid:border-red-500" />
    <TextField.ErrorMessage class="text-xs text-red-600">{error()}</TextField.ErrorMessage>
  </TextField>
  <button type="submit" class="rounded bg-blue-600 px-4 py-2 text-white">Submit</button>
</form>
```

#### `solid-hope-max`
```tsx
import { Input, Button, FormControl, FormLabel, FormErrorMessage } from '@hope-ui/solid';
import { createSignal } from 'solid-js';

const [name, setName] = createSignal('');
const error = () => name() && !/^[a-z0-9-]+$/.test(name()) ? 'Lowercase, digits, hyphens only.' : '';

<form onSubmit={e => e.preventDefault()}>
  <FormControl required invalid={!!error()}>
    <FormLabel>Name</FormLabel>
    <Input value={name()} onInput={e => setName(e.currentTarget.value)} />
    <FormErrorMessage>{error()}</FormErrorMessage>
  </FormControl>
  <Button type="submit" mt="$4" colorScheme="primary">Submit</Button>
</form>
```

#### `solid-vanilla-tailwind`
```tsx
import { createSignal } from 'solid-js';

const [name, setName] = createSignal('');
const error = () => name() && !/^[a-z0-9-]+$/.test(name()) ? 'Lowercase, digits, hyphens only.' : '';

<form onSubmit={e => e.preventDefault()} class="flex flex-col gap-4">
  <label class="flex flex-col gap-1 text-sm font-medium">Name
    <input value={name()} onInput={e => setName(e.currentTarget.value)} required
      class={`rounded border px-3 py-2 ${error() ? 'border-red-500' : 'border-gray-300'}`} />
    {error() && <span class="text-xs text-red-600">{error()}</span>}
  </label>
  <button type="submit" class="rounded bg-blue-600 px-4 py-2 text-white">Submit</button>
</form>
```

#### `solid-vanilla`
```tsx
import { createSignal } from 'solid-js';

const [name, setName] = createSignal('');
const error = () => name() && !/^[a-z0-9-]+$/.test(name()) ? 'Lowercase, digits, hyphens only.' : '';

<form onSubmit={e => e.preventDefault()} class="form">
  <label class="form__label">Name
    <input value={name()} onInput={e => setName(e.currentTarget.value)} required
      classList={{ 'form__input': true, 'form__input--error': !!error() }} />
    {error() && <span class="form__error">{error()}</span>}
  </label>
  <button type="submit" class="form__submit">Submit</button>
</form>
```

### jQuery

#### `jquery-ui-bootstrap`
```html
<form id="signup-form" class="needs-validation" novalidate>
  <div class="mb-3">
    <label class="form-label" for="name">Name</label>
    <input id="name" name="name" class="form-control" required pattern="[a-z0-9-]+">
    <div class="invalid-feedback">Lowercase, digits, hyphens only.</div>
  </div>
  <button type="submit" class="btn btn-primary">Submit</button>
</form>
<script>
  $('#signup-form').validate({
    errorClass: 'invalid-feedback d-block',
    rules: { name: { required: true, pattern: /^[a-z0-9-]+$/ } }
  });
</script>
```

#### `jquery-bootstrap-max`
```html
<form id="signup-form" class="needs-validation" novalidate>
  <div class="mb-3">
    <label class="form-label" for="name">Name</label>
    <input id="name" name="name" class="form-control" required>
    <div class="invalid-feedback">Lowercase, digits, hyphens only.</div>
  </div>
  <button type="submit" class="btn btn-primary">Submit</button>
</form>
<script>
  $('#signup-form').on('submit', function (e) {
    var val = $('#name').val();
    if (!val || !/^[a-z0-9-]+$/.test(val)) {
      e.preventDefault();
      $('#name').addClass('is-invalid');
    }
  });
  $('#name').on('input', function () { $(this).removeClass('is-invalid'); });
</script>
```

#### `jquery-vanilla`
```html
<form id="signup-form">
  <label for="name">Name</label>
  <input id="name" name="name" required>
  <span id="name-error" class="field-error" hidden>Lowercase, digits, hyphens only.</span>
  <button type="submit">Submit</button>
</form>
<script>
  $('#signup-form').on('submit', function (e) {
    var val = $('#name').val();
    var valid = !!val && /^[a-z0-9-]+$/.test(val);
    $('#name-error').prop('hidden', valid);
    if (!valid) e.preventDefault();
  });
</script>
```

### Vanilla

#### `vanilla-html-tailwind`
```html
<form id="signup-form" class="flex flex-col gap-4">
  <label class="flex flex-col gap-1 text-sm font-medium">Name
    <input id="name" name="name" required pattern="[a-z0-9-]+"
      class="rounded border border-gray-300 px-3 py-2 invalid:border-red-500" />
    <span id="name-error" class="hidden text-xs text-red-600">Lowercase, digits, hyphens only.</span>
  </label>
  <button type="submit" class="rounded bg-blue-600 px-4 py-2 text-white">Submit</button>
</form>
<script>
  document.getElementById('signup-form').addEventListener('submit', function (e) {
    var input = document.getElementById('name');
    var error = document.getElementById('name-error');
    var valid = input.validity.valid;
    error.classList.toggle('hidden', valid);
    if (!valid) e.preventDefault();
  });
</script>
```

#### `vanilla-html`
```html
<form id="signup-form" class="form">
  <label class="form__label" for="name">Name</label>
  <input id="name" name="name" required pattern="[a-z0-9-]+" class="form__input" />
  <span id="name-error" class="form__error" hidden>Lowercase, digits, hyphens only.</span>
  <button type="submit" class="form__submit">Submit</button>
</form>
<script>
  document.getElementById('signup-form').addEventListener('submit', function (e) {
    var input = document.getElementById('name');
    var error = document.getElementById('name-error');
    var valid = input.validity.valid;
    error.hidden = valid;
    if (!valid) e.preventDefault();
  });
</script>
```
