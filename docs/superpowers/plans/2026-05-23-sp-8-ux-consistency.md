# Sub-plan 8 — User-facing copy + iteration ergonomics

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to run this plan inline (no subagent dispatch). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the four acceptance criteria of Sub-plan 8 from the audit-followup roadmap — PT-BR audit across both SKILL.md files, "Outro" disambiguation in two menus, configurable Cloudflare tunnel timeout, and a short multi-component-features note.

**Architecture:** Pure documentation edits. No JSON/JS code changes. Two files touched, plus one tiny new subsection in Phase 1 of `design-feature/SKILL.md`. The validator (`node validate.mjs`) is run between tasks as a regression gate.

**Tech Stack:** Markdown SKILL.md files, the existing `validate.mjs` Node validator (cross-reference + compat checks).

---

## Scope ledger (what is and is NOT in this plan)

**In scope (the 4 ACs):**

1. **H1 — PT-BR audit.** Convert remaining English user-facing strings to PT-BR across both SKILL.md files. Add a "Convenção de idioma" note at the top of each SKILL.md.
2. **H2 — "Outro" disambiguation.** §0.1.5 option 8 → `"Outro stack (descreva)"`. §0.4 menu free-text option → `"Outra estratégia (descreva)"`. Existing `strategy.json` audit-trail strings are not retro-renamed; this is forward-only.
3. **B3 — Configurable tunnel timeout.** Phase 1 Cloudflare tunnel polling timeout reads `MARKUP_TUNNEL_TIMEOUT_MS` env var (default 15000). On timeout, prompt user (PT-BR) with retry / skip-tunnel / use-localhost options instead of silently falling back to localhost.
4. **B4 — Multi-component features note.** New short `### Multi-component features` subsection inside Phase 1, placed between `### Tweaker public API` and `### Phase 1 hosting — how the user opens the mockup`.

**Out of scope:**

- H3 (disclaimer one-line summary): deferred, unverifiable per audit. Do **not** touch the disclaimer template.
- Any behavioral change in Phase 2/3/4/5 logic.
- Translating PT-BR strings to English. (We only translate the other direction — and only user-facing.)
- Any change to `strategy.json` schema or to the `chosen` ID set (`custom` stays as `custom`).

---

## How to tell user-facing from agent-instruction

Per the convention this sub-plan introduces:

- **User-facing string (PT-BR):** anything that the agent prints to or solicits from the user. This includes:
  - Prose inside fenced blocks that show what the user will see (the disclaimer template, menu prompts, error refusals, gate-failure messages, `Print:` blocks, `> Resposta (1-N):` blockquotes).
  - Inline quoted text in instructions like `print "..." to the user` or `prompt: "..."`.
  - Refusal messages emitted at HARD-GATE failures (those are shown to the user even though they live inside a gate block).
- **Agent instruction (English):** anything addressed to the agent reading the SKILL.md — step descriptions, rationale paragraphs, table headers, comments inside JSON schemas, `<HARD-GATE>` conditions themselves (not their refusal messages).

When in doubt: ask "does the human read this verbatim?" If yes → PT-BR. If the agent only reads it to act on it → English.

---

## File structure

Two files modified, plus this plan document.

- `skills/design-feature/SKILL.md` — convention note (top), `§0.1.5` option 8 rename, `§0.4` menu free-text rename, Phase 1 tunnel polling section update (B3), new `### Multi-component features` subsection (B4), plus any English user-facing strings found during H1 audit.
- `skills/bootstrap-design-system/SKILL.md` — convention note (top), and any English user-facing strings found during H1 audit (notably the "Manage expectations" block, which is currently in English).
- `docs/superpowers/plans/2026-05-23-sp-8-ux-consistency.md` — this file (already written when execution starts).

Validator (`validate.mjs`) is not modified — it currently passes cleanly and Sub-plan 8 should not introduce any structural regression.

---

## Task list

### Task 1: Add language-convention note to both SKILL.md files

**Files:**

- Modify: `skills/design-feature/SKILL.md` (insert just under the H1 `# Design-Feature Workflow`)
- Modify: `skills/bootstrap-design-system/SKILL.md` (insert just under the H1 `# Bootstrap Design System`)

- [ ] **Step 1: Add convention note to `design-feature/SKILL.md`**

Find this block at the top:

```
# Design-Feature Workflow

This skill orchestrates the end-to-end lifecycle of a user-visible feature, ...
```

Insert (between the H1 and the existing intro paragraph):

```
> **Convenção de idioma:** strings printadas/prompted ao usuário → PT-BR. Instruções ao agente → English.
```

- [ ] **Step 2: Add convention note to `bootstrap-design-system/SKILL.md`**

Same pattern under the H1 `# Bootstrap Design System`. Insert the same blockquote.

- [ ] **Step 3: Run validator**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 4: Commit**

```bash
git add skills/design-feature/SKILL.md skills/bootstrap-design-system/SKILL.md
git commit -m "docs(skills): add PT-BR / English language convention note (SP8 H1)"
```

---

### Task 2: H2 — Rename "Outro" options in `design-feature/SKILL.md`

**Files:**

- Modify: `skills/design-feature/SKILL.md` (`§0.1.5` empty-project menu, `§0.4` strategy menu, `§0.3` composition rules that mention `Outro (descreva)`, plus any references throughout that mention the old wording verbatim).

- [ ] **Step 1: Rename §0.1.5 option 8**

Find inside the §0.1.5 empty-project flow block:

```
  7. Vanilla (HTML + CSS puro, sem framework JS)
  8. Outro (descreva)

Resposta (1-8):
```

Replace option 8 with:

```
  8. Outro stack (descreva)
```

Also update the prose right below that fenced block — the line currently reading:

```
- **Option 8 ("Outro"):** follow up with `Descreva o stack (ex.: "Qwik + qwik-ui"):`. ...
```

Becomes:

```
- **Option 8 ("Outro stack"):** follow up with `Descreva o stack (ex.: "Qwik + qwik-ui"):`. ...
```

- [ ] **Step 2: Rename §0.3 + §0.4 free-text option**

§0.3 has two mentions of the literal `Outro (descreva)` token:

  - In the construction rule: *"Always include `Outro (descreva)` as a free-text escape hatch as the last option."* → `Outra estratégia (descreva)`.
  - In step 5 of the menu-composition algorithm: *"Always append `Outro (descreva)` as the last numbered option, with strategy ID `custom`..."* → `Outra estratégia (descreva)`.

§0.4 has the literal in both the React-example fenced block and the jQuery-example fenced block:

```
  4. Native HTML/JSX + CSS
  5. Outro (descreva)
```

```
  3. jQuery puro + CSS
  4. Outro (descreva)
```

Both become `Outra estratégia (descreva)`.

Also: §0.4 prose `If the user picks "Outro" (custom), follow up with: 'Descreva a estratégia em texto livre...'`. Update the quoted "Outro" to `"Outra estratégia"` (the parenthetical `(custom)` and the strategy-ID `custom` are unchanged — those are agent-internal).

- [ ] **Step 3: Run validator**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 4: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "docs(design-feature): disambiguate 'Outro' menus — stack vs strategy (SP8 H2)"
```

---

### Task 3: B3 — Configurable Cloudflare tunnel timeout

**Files:**

- Modify: `skills/design-feature/SKILL.md` — the Phase 1 hosting section, specifically the "Optional Cloudflare quick tunnel" step 2 (`Poll <log> for a line ...`). The current line ends with: `Timeout 15s. If no URL appears: read the PID from <pid-file> and kill it; print a warning; fall back to localhost.`

- [ ] **Step 1: Replace the polling step**

Find this paragraph in the §"Phase 1 hosting — how the user opens the mockup" / §"Companion server fallback" / "Optional Cloudflare quick tunnel" subsection, step 2 of the `If s:` branch:

```
2. Poll `<log>` for a line matching `https://[a-z0-9-]+\.trycloudflare\.com` (on Claude Code: use the `Monitor` tool against the background bash if you started it via `Bash` with `run_in_background: true`; on Gemini CLI / Codex CLI: poll with `tail -n +1 -f <log>` until the regex matches, capped by timeout). Timeout 15s. If no URL appears: read the PID from `<pid-file>` and `kill` it; print a warning; fall back to localhost.
```

Replace with:

```
2. Poll `<log>` for a line matching `https://[a-z0-9-]+\.trycloudflare\.com` (on Claude Code: use the `Monitor` tool against the background bash if you started it via `Bash` with `run_in_background: true`; on Gemini CLI / Codex CLI: poll with `tail -n +1 -f <log>` until the regex matches, capped by timeout). **Timeout** is `MARKUP_TUNNEL_TIMEOUT_MS` if set in the environment (in milliseconds — read via the harness's shell tool, e.g. `printenv MARKUP_TUNNEL_TIMEOUT_MS`), otherwise `15000` (15 seconds). If no URL appears within the timeout: read the PID from `<pid-file>`, `kill` it, then prompt the user (PT-BR):

   > Tunnel não respondeu em `<N>`s. Tentar de novo / pular tunnel / usar localhost? (padrão: localhost)

   - `tentar de novo` (or `r` / `retry`): re-spawn `cloudflared` with the same arguments, reset the log file, and re-poll with the same timeout. After two retries that both time out, fall through to `usar localhost` automatically and print: `Tunnel falhou duas vezes — caindo pra localhost.`
   - `pular tunnel` (or `s` / `skip`): same as `usar localhost` (the tunnel was a Cloudflare exposure, the only fallback is localhost) — kept as a distinct option so the user can phrase the decision either way.
   - `usar localhost` (or empty input — default): continue with the local URL only; print: `Seguindo só com localhost: http://localhost:<port>.`
```

(The `<N>` placeholder in the prompt is replaced with the actual timeout in seconds at runtime — `Math.round(MARKUP_TUNNEL_TIMEOUT_MS / 1000)` or `15`.)

- [ ] **Step 2: Run validator**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 3: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "feat(design-feature): MARKUP_TUNNEL_TIMEOUT_MS env + retry prompt on tunnel timeout (SP8 B3)"
```

---

### Task 4: B4 — New "Multi-component features" subsection

**Files:**

- Modify: `skills/design-feature/SKILL.md` — insert a new `### Multi-component features` subsection in Phase 1, immediately after `### Tweaker public API` (which ends with the "Why the type set is closed" content + the closing paragraph about the copy-JSON button) and immediately before `### Phase 1 hosting — how the user opens the mockup`.

- [ ] **Step 1: Insert the new subsection**

The exact insertion point: find the line `### Phase 1 hosting — how the user opens the mockup` and insert ABOVE it the following:

```
### Multi-component features

O tweaker é vinculado a um único `data-ds-component`. Se sua feature combina N componentes (filtro + lista, sidebar + main, etc.), trate como N features encadeadas — uma passada do skill por componente, na ordem em que dependem. O tech spec da Phase 3 amarra a integração entre eles.

```

(Note the trailing blank line so the next heading starts cleanly.)

- [ ] **Step 2: Run validator**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 3: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "docs(design-feature): add Multi-component features note in Phase 1 (SP8 B4)"
```

---

### Task 5: H1 — PT-BR audit, `bootstrap-design-system/SKILL.md`

Walk the file from top to bottom and translate user-facing English strings to PT-BR. The biggest concentration is the "Manage expectations" fenced block which is currently fully English. Other touch points: the `Found existing strategy.json` print block in §0.1, the Step E "Print a summary" fenced block (which is already mostly PT-BR — verify), and the `Continue? (say "yes" to proceed)` line.

**Files:**

- Modify: `skills/bootstrap-design-system/SKILL.md`

- [ ] **Step 1: Translate the "Manage expectations" block**

Find the fenced block under `## Manage expectations (print at start, BEFORE any other action)`:

```
Bootstrap produces a DRAFT design system from your running app. It is NOT
finished output. What to expect:

  · Atoms (button, icon, spinner, badge) usually port cleanly.
  · Molecules with form inputs port well.
  · Async loading states, drag-and-drop, virtualized lists, and
    multi-step flows typically need manual cleanup.
  · Plan for the unexpected — every project surprises.

For ~25 components and ~7 complex ones, expect ~1 day of wall-clock time:
3-6h of agent work + 2-3h of your gate-keeping.

Components are processed in tier order — atoms auto-port, molecules get a
batch summary review, organisms get a per-item gate. You can pause and resume.

This skill does NOT produce a full-prototype (an assembled page mixing all
components). It produces individual DS files only. If you want a full-prototype,
assemble it manually after bootstrap completes.

Repository: https://github.com/AlexandreCamillo/markup-cli-toolkit

Continue? (say "yes" to proceed)
```

Replace with PT-BR:

```
Bootstrap gera um Design System DRAFT a partir do app rodando. NÃO é
saída final. O que esperar:

  · Atoms (button, icon, spinner, badge) costumam portar limpo.
  · Molecules com inputs de formulário portam bem.
  · Estados de loading assíncrono, drag-and-drop, listas virtualizadas e
    fluxos multi-step geralmente precisam de limpeza manual.
  · Conte com o imprevisto — todo projeto surpreende.

Pra ~25 componentes (~7 deles complexos), conte com ~1 dia de wall-clock:
3-6h de trabalho do agente + 2-3h de gate-keeping seu.

Componentes são processados em ordem de tier — atoms portam automaticamente,
molecules recebem revisão em batelada, organisms passam por gate por item.
Você pode pausar e retomar.

Esta skill NÃO produz full-prototype (página assemblada misturando todos os
componentes). Produz apenas DS files individuais. Se quiser um full-prototype,
monte manualmente depois do bootstrap terminar.

Repositório: https://github.com/AlexandreCamillo/markup-cli-toolkit

Continuar? (responda "sim" pra prosseguir)
```

Also update the line just below the fenced block:

```
Wait for explicit "yes" before proceeding.
```

→

```
Wait for explicit `"sim"` (case-insensitive) before proceeding. Accept `yes` as a synonym for backwards compatibility with users who already saw the previous English prompt.
```

(The wait-instruction itself remains English — it's addressed to the agent, not the user. We update only the literal token the user types.)

- [ ] **Step 2: Translate the §0.1 "Found existing strategy.json" block**

Find:

```
   Found existing strategy.json from a previous design-feature run:
     framework: <framework>
     chosen:    <chosen> (<label>)
     saved:     <chosenAt>

   Reuse this strategy for bootstrap? (sim / change / inspect)
```

Replace with:

```
   Estratégia salva: encontrei `strategy.json` de um run anterior do design-feature:
     framework: <framework>
     chosen:    <chosen> (<label>)
     saved:     <chosenAt>

   Reusar essa estratégia pro bootstrap? (sim / change / inspect)
```

(The CLI tokens `sim / change / inspect` are unchanged — they're the same shape design-feature uses in §0.6.)

- [ ] **Step 3: Sweep the rest of the file for English user-facing strings**

Scan for these patterns and translate the ones that are user-facing:

  - The Step E "Print a summary" block (already PT-BR — verify and leave alone).
  - The Step D batch-summary prompt (already PT-BR — verify).
  - The Step D "Próximos passos" block (already PT-BR — verify).
  - The Step A inventory file's header `# Bootstrap inventory — review and edit` — this is the **first line of a file the user opens in their editor**, so it's user-facing. Translate to:

    ```
    # Bootstrap inventory — revise e edite
    ```

    And the line right under it:

    ```
    For each row, set `action` to one of: `keep`, `skip`, `merge:<existing-slug>`.
    ```

    →

    ```
    Pra cada linha, defina `action` como: `keep`, `skip`, ou `merge:<slug-existente>`.
    ```

  - Hard precondition 4 refusal message (lives in agent text but emitted to the user on hard-fail). The English `❌ HARD: design-feature template not found at templates/ds-component-pattern.md. Reinstall design-skills` is the refusal **printed to the user**. Translate to:

    ```
    ❌ HARD: template do design-feature não encontrado em `templates/ds-component-pattern.md`. Reinstale design-skills
    ```

  - The "Resuming a partial bootstrap" / on-resume prompts (`Bootstrap was started under framework "<old>"; project is now "<new>". Continue with the original ("<old>"), or restart Step 0 to re-pick strategy?`) — these are printed to the user. Translate to:

    ```
    Bootstrap começou com framework "<old>"; o projeto agora é "<new>". Continuar com o original ("<old>") ou refazer o Step 0 pra re-escolher a estratégia?
    ```

    And the strategy variant:

    ```
    Bootstrap was started under strategy "<old>"; current default is "<new>". Continue with bootstrap's original ("<old>"), or migrate to current ("<new>")?
    ```

    →

    ```
    Bootstrap começou com estratégia "<old>"; o padrão atual é "<new>". Continuar com o original do bootstrap ("<old>") ou migrar pro atual ("<new>")?
    ```

  - The Step C strategy-fit `<details>` blocks — already PT-BR (verify; only "Strategy fit" / "Strategy mismatch" `<summary>` labels remain English by design as headings; their bodies are PT-BR; leave the summary labels as-is since they're inline within a `<details>` HTML widget and short labels mirror Markup convention. **However** — if the audit reveals they're rendered to the user verbatim and need to be PT-BR, translate "Strategy fit" → "Estratégia bate" and "⚠ Strategy mismatch" → "⚠ Estratégia diverge". Decision: **translate**, since these are visible to anyone opening the DS file).

  - The `js: stub` / `js: ported` / `js: partial` literals are front-matter values, not user-facing prose — leave them.

  - Markdown table headers and code-block tokens are agent-instruction context — leave them.

- [ ] **Step 4: Run validator**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 5: Commit**

```bash
git add skills/bootstrap-design-system/SKILL.md
git commit -m "docs(bootstrap-design-system): PT-BR audit of user-facing strings (SP8 H1)"
```

---

### Task 6: H1 — PT-BR audit, `design-feature/SKILL.md`

Same sweep on the larger file. Most user-facing strings are already PT-BR (the file has been audited multiple times during SP1-SP7), but newer additions from SP2/SP5/SP6/SP9 may have introduced English. Walk top-to-bottom.

**Files:**

- Modify: `skills/design-feature/SKILL.md`

- [ ] **Step 1: Audit pass — top to bottom**

Look for English user-facing strings in these likely-affected sections (introduced or modified by later sub-plans):

  - **Disclaimer template** (line ~93-126): the labels (`✓ HARD`, `✓ markup-cli vX.Y.Z`, `connected to <url>`, `Chrome MCP available`, `cloudflared available`, `not installed`, `first run: Phase 0 will run to pick a framework + strategy`, etc.) — these are **printed verbatim to the user** but they're mostly status labels with English keywords (`HARD`, `markup-cli`, `Chrome MCP`, `cloudflared`) that are intentional technical terms. **Decision:** leave label keywords English (`HARD`, tool names) but translate full English sentences in the same block.

    Specifically scan for:
      - `↳ refusing to proceed` — translate to `↳ recusando prosseguir`.
      - `↳ without it: manual builds + uploads` — translate to `↳ sem ele: builds + uploads manuais`.
      - `↳ degrading: many commands still work; upgrade the Markup server or pin this skill to an older tag` → `↳ degradando: muitos comandos ainda funcionam; suba o servidor Markup ou pin esta skill numa tag mais antiga`.
      - `↳ degrading: server is too old to advertise its version` → `↳ degradando: servidor velho demais pra anunciar a versão`.
      - `↳ without it: companion-server hosting` → `↳ sem ele: hosting via companion-server`.
      - `↳ optional: expose the companion server publicly` → `↳ opcional: expor o servidor companion publicamente`.
      - `↳ install on Claude Code (preferred): Claude for Chrome extension + `claude --chrome` (Chrome/Edge, Claude Code 2.0.73+)` → `↳ instalar no Claude Code (preferido): extensão Claude for Chrome + `claude --chrome` (Chrome/Edge, Claude Code 2.0.73+)`.
      - `fallback: `claude mcp add chrome-devtools npx chrome-devtools-mcp@latest` (WSL/Brave/Arc)` → `fallback: `claude mcp add chrome-devtools npx chrome-devtools-mcp@latest` (WSL/Brave/Arc)`.
      - `↳ install on Gemini CLI:` → `↳ instalar no Gemini CLI:`.
      - `↳ install on Codex CLI:` → `↳ instalar no Codex CLI:`.
      - `(Codex Chrome extension is web-app-only)` → `(extensão Chrome do Codex é web-app-only)`.
      - `↳ without it: Phase 5 falls back to manual checklist` → `↳ sem ele: Phase 5 cai pro checklist manual`.
      - `↳ install: https://developers.cloudflare.com/...` → `↳ instalar: https://developers.cloudflare.com/...`.
      - `type "change strategy" to re-pick` → `digite "change strategy" pra re-escolher`.
      - `↳ first run: Phase 0 will run to pick a framework + strategy` → `↳ primeira execução: Phase 0 vai rodar pra escolher framework + estratégia`.

  - **Refusal messages embedded in HARD-GATEs** — these are emitted to the user. Audit:
      - The empty-tweaker refusal `❌ Tweaker has zero options — every design choice must be a knob. Add at least one option, or explain in writing why this component has zero variable choices.` → `❌ O tweaker tem zero opções — toda escolha de design tem que ser uma knob. Adicione ao menos uma opção, ou explique por escrito por que esse componente não tem nenhuma escolha variável.`
      - The version-newer refusal `❌ tweaker template newer than skill, upgrade design-skills` → `❌ template do tweaker é mais novo que a skill, atualize design-skills`.
      - The version-older refusal `❌ tweaker template older than skill, regenerate the mockup` → `❌ template do tweaker é mais antigo que a skill, regenere o mockup`.

  - **Phase 1 step prompts:**
      - `Aprovado. Clique 📋 Copy JSON no tweaker do mockup atual e cole aqui pra eu travar as escolhas.` — already PT-BR. Leave.
      - The `[se Markup online]` instruction `Re-pause with the checkpoint pattern: 'Mockup uploaded as <url>. Comment on Markup, then say "continue" when you want me to process the feedback.'` — the quoted checkpoint pattern is user-facing. Translate the quoted part: `'Mockup hospedado em <url>. Comente no Markup, e diga "continue" quando quiser que eu processe o feedback.'`. (The "Re-pause with the checkpoint pattern:" prose is the agent instruction — leave English.)

  - **Phase 5 summary block** — already in PT-BR (`Phase 5 QA — <slug>` etc.). Verify.

  - **Manual checklist fallback block** — already PT-BR. Verify.

  - **`Is this a new DS component, a variant of an existing one, or composition of existing components? If new, what slug?`** — printed to the user in Phase 1 step 6 (after writing state.json). Translate: `É um novo componente do DS, uma variante de um existente, ou composição de existentes? Se novo, qual o slug?`

  - **The Phase 2.5 visual-diff prompt** — already PT-BR. Verify.

  - **Phase 3 gate refusal `❌ Tech spec falta seção '## DS components touched'. Adicione a lista (ou "none — <razão>") antes de aprovar.`** — already PT-BR. Verify.

  - **Phase 4 post-plan checklist prompts** — already PT-BR (`⚠ O tech spec referencia arquivos em ...`). Verify.

  - **Phase 4 DS edit scope rule rollback message** — already PT-BR. Verify.

  - **`Continuando em <branch> — não recomendado.`** — PT-BR. Verify.

  - **Worktree registry messages** — `Registrado worktree em ~/.markup-design/registry.json` is PT-BR. The `Features em outros worktreesdeste repo:` block is PT-BR. The `Pra retomar uma delas, faça cd <worktree-path> e re-invoque a skill.` line is PT-BR. The `⚠ worktree <path> registrado mas não encontrado — removendo do registry` is PT-BR. Verify.

  - **`This feature was started under framework "<old>"; project is now "<new>"`** prompt in §"Resuming an in-flight feature" — translate to PT-BR:

    ```
    This feature was started under framework "<old>"; project is now "<new>". Continue with the original ("<old>"), or restart Phase 0 to re-pick strategy?
    ```

    →

    ```
    Essa feature começou com framework "<old>"; o projeto agora é "<new>". Continuar com o original ("<old>") ou refazer a Phase 0 pra re-escolher a estratégia?
    ```

    And the strategy variant:

    ```
    This feature was started under strategy "<old>"; current default is "<new>". Continue with feature's original ("<old>"), or migrate to current ("<new>")?
    ```

    →

    ```
    Essa feature começou com estratégia "<old>"; o padrão atual é "<new>". Continuar com o original da feature ("<old>") ou migrar pro atual ("<new>")?
    ```

  - **Resume mechanic prompt** in §0.6 — already PT-BR (`Estratégia salva: ...`). Verify.

- [ ] **Step 2: Run validator**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 3: Commit**

```bash
git add skills/design-feature/SKILL.md
git commit -m "docs(design-feature): PT-BR audit of user-facing strings (SP8 H1)"
```

---

### Task 7: Final sanity check

- [ ] **Step 1: Re-run validator from a clean state**

Run: `node validate.mjs`
Expected: `✓ Validated 2 skill(s); no issues.`

- [ ] **Step 2: Re-read both SKILL.md files end-to-end and confirm**

  - All four ACs land per the scope ledger above.
  - No regressions in cross-references (validator catches `§ "..."` and `§N.N` references against headings — covered by the validator pass).
  - No accidental edits to the disclaimer one-liner / H3 territory.
  - Convention note is the first content under each H1.

- [ ] **Step 3: Push the branch and open a PR**

```bash
git push -u origin feat/sp-8-ux-consistency
gh pr create --base main --title "Sub-plan 8: UX consistency (B3, B4, H1, H2)" --body "$(cat <<'EOF'
## Summary

Sub-plan 8 from the audit-followup roadmap — user-facing copy + iteration ergonomics. Four acceptance criteria, no behavioral changes beyond what each AC scopes.

- **H1.** PT-BR audit of user-facing strings across both SKILL.md files; convention note added at the top of each.
- **H2.** Disambiguates "Outro" between framework-stack picker (§0.1.5 option 8 → "Outro stack") and strategy menu (§0.4 → "Outra estratégia").
- **B3.** Cloudflare quick-tunnel polling timeout is now configurable via `MARKUP_TUNNEL_TIMEOUT_MS` (default 15000 ms); on timeout, the user is prompted with retry / skip / use-localhost instead of a silent fallback.
- **B4.** New short subsection in Phase 1 — "Multi-component features" — flagging that the tweaker binds to one `data-ds-component` at a time, so multi-component features are N chained passes of the skill.

Files touched:
- `skills/design-feature/SKILL.md`
- `skills/bootstrap-design-system/SKILL.md`
- `docs/superpowers/plans/2026-05-23-sp-8-ux-consistency.md` (new)

## Test plan

- [ ] `node validate.mjs` exits 0 (no cross-reference breakage; no compat-shape regression).
- [ ] Manual diff review: confirm no English user-facing string remains (reviewer's call on the disclaimer technical-label edge cases — those are documented as intentional in this PR's commit messages).
- [ ] Manual diff review: confirm the H2 rename does not collide with any other "Outro" string the audit might have missed.

EOF
)"
```

(The `gh pr create` invocation runs once at the end; the branch name is `feat/sp-8-ux-consistency` per the worktree assignment.)

---

## Self-review checklist (run before finishing)

- **Spec coverage:**
  - AC 1 (H1) → Tasks 1, 5, 6.
  - AC 2 (H2) → Task 2.
  - AC 3 (B3) → Task 3.
  - AC 4 (B4) → Task 4.

- **Placeholders:** None introduced. Every translation is concrete text, every rename is a literal find-and-replace.

- **Cross-reference safety:** No headings are renamed or removed. The new `### Multi-component features` subsection in Task 4 introduces a new heading — no existing cross-reference targets that title, so it cannot break the validator.

- **Type / token consistency:** The `Outro (descreva)` → `Outra estratégia (descreva)` rename is consistent across §0.3 (construction rule + algorithm step) and §0.4 (React + jQuery example menus + prose). The strategy ID `custom` is unchanged, so `strategy.json` payloads and template generator remain valid.

- **B3 timeout shape:** `MARKUP_TUNNEL_TIMEOUT_MS` is in milliseconds (matches `MARKUP_QA_SWEEP` convention of an `MARKUP_<DOMAIN>_<KNOB>` env var); default `15000` matches the prior hardcoded value, so users not setting the env get identical behavior except for the prompt-on-timeout (instead of silent fallback).

- **B4 placement:** Inserted between `### Tweaker public API` and `### Phase 1 hosting — how the user opens the mockup`. Confirmed by reading the file: the "Why the type set is closed" block ends the Tweaker public API subsection, and the next heading is currently `### Phase 1 hosting`. New subsection lands cleanly between them.
