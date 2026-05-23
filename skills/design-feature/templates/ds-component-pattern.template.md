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

<!-- INSERT strategies.adaptation -->

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

<!-- INSERT strategies.canonicalSnippet -->
