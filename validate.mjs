#!/usr/bin/env node
// Validate that every SKILL.md in skills/ has the required frontmatter,
// non-empty body, and references that point at real CLI commands.
// Also validates the strategies.json single-source-of-truth and that the
// generated ds-component-pattern.md is in sync with it.

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = resolve(here, 'skills');

const KNOWN_CLI_COMMANDS = new Set([
  'init', 'doctor', 'build', 'sync-index', 'check', 'where',
  'connect', 'mockup', 'mockup new', 'mockup version', 'mockup list', 'mockup archive',
  'promote', 'upload-prototype',
  'comments', 'comments list', 'comments read', 'comments reply', 'comments react',
  'comments resolve', 'comments region',
  'sync-queue',
  'bootstrap', 'bootstrap snapshot',
]);

const issues = [];

function validate(skillDir) {
  const name = skillDir;
  const path = join(SKILLS_DIR, skillDir, 'SKILL.md');
  if (!existsSync(path)) {
    issues.push({ skill: name, message: `missing SKILL.md at ${path}` });
    return;
  }
  const raw = readFileSync(path, 'utf8');

  // 1. Frontmatter present?
  if (!raw.startsWith('---\n')) {
    issues.push({ skill: name, message: 'SKILL.md must start with YAML frontmatter (---)' });
    return;
  }
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) {
    issues.push({ skill: name, message: 'SKILL.md frontmatter is not closed with --- on its own line' });
    return;
  }
  const frontmatter = raw.slice(4, end);
  const body = raw.slice(end + 5);

  // 2. Frontmatter has name + description.
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*"?([^"\n]+)"?$/m);
  if (!nameMatch) issues.push({ skill: name, message: 'frontmatter missing `name:` field' });
  if (!descMatch) issues.push({ skill: name, message: 'frontmatter missing `description:` field' });
  if (nameMatch && nameMatch[1].trim() !== name) {
    issues.push({ skill: name, message: `frontmatter name "${nameMatch[1].trim()}" does not match directory "${name}"` });
  }
  if (descMatch && descMatch[1].trim().length < 40) {
    issues.push({ skill: name, message: 'description is too short (< 40 chars); make it discoverable' });
  }

  // 3. Body non-empty.
  if (body.trim().length < 200) {
    issues.push({ skill: name, message: 'body is too short (< 200 chars); skills need real content' });
  }

  // 4. CLI command references resolve.
  // Look for `markup-cli <command>` and verify the command is known.
  // Skip flag forms (`--foo`) and tokens that are clearly placeholders
  // (single letter, or appear next to a version literal).
  const cmdPattern = /markup-cli\s+([a-z][a-z-]*(?:\s+[a-z][a-z-]*)?)/g;
  let m;
  const referenced = new Set();
  while ((m = cmdPattern.exec(body)) !== null) {
    const cmd = m[1];
    // Skip placeholder-like tokens that are followed by a digit (version literals).
    const followIdx = m.index + m[0].length;
    if (body[followIdx] && /[0-9.]/.test(body[followIdx])) continue;
    // Skip single-letter tokens (likely placeholder like "v" in "vX.Y.Z").
    if (cmd.length <= 1) continue;
    referenced.add(cmd);
  }
  for (const cmd of referenced) {
    if (KNOWN_CLI_COMMANDS.has(cmd)) continue;
    const parent = cmd.split(' ')[0];
    if (KNOWN_CLI_COMMANDS.has(parent)) continue;
    issues.push({ skill: name, message: `unknown CLI command reference: \`markup-cli ${cmd}\`` });
  }
  // Built-in commander flags (--version, --help) are not commands; skip them.

  // 5. Frontmatter has compat.cli + compat.markup as semver ranges.
  // Block captures indented lines under `compat:`; last line may not have trailing \n
  // (since the frontmatter substring is sliced right before `\n---\n`).
  const compatBlock = frontmatter.match(/^compat:\s*\n((?:[ \t]+.+(?:\n|$))+)/m);
  if (!compatBlock) {
    issues.push({ skill: name, message: 'frontmatter missing `compat:` block (expected compat.cli and compat.markup)' });
  } else {
    const block = compatBlock[1];
    const cliRange = block.match(/^[ \t]+cli:\s*["']?([^"'\n]+?)["']?\s*$/m);
    const markupRange = block.match(/^[ \t]+markup:\s*["']?([^"'\n]+?)["']?\s*$/m);
    if (!cliRange) issues.push({ skill: name, message: 'frontmatter missing `compat.cli` (expected a semver range like ">=0.1.0")' });
    if (!markupRange) issues.push({ skill: name, message: 'frontmatter missing `compat.markup` (expected a semver range like ">=0.2.0")' });
    // Cheap range-shape check: must start with one of: >=, >, <=, <, ^, ~, =, or a bare digit
    const rangeShape = /^(?:>=|<=|>|<|\^|~|=|\d)/;
    if (cliRange && !rangeShape.test(cliRange[1].trim())) {
      issues.push({ skill: name, message: `compat.cli "${cliRange[1]}" is not a recognizable semver range (expected like ">=0.1.0")` });
    }
    if (markupRange && !rangeShape.test(markupRange[1].trim())) {
      issues.push({ skill: name, message: `compat.markup "${markupRange[1]}" is not a recognizable semver range (expected like ">=0.2.0")` });
    }
  }
}

const DESIGN_FEATURE_TEMPLATES = [
  { file: 'tweaker.html', hint: 'required by skill body' },
  { file: 'ds-component-pattern.md', hint: 'required by Phase 2 step 3 and Phase 4 plan seed' },
];

function validateDesignFeatureTemplate() {
  const skillMdPath = join(SKILLS_DIR, 'design-feature', 'SKILL.md');
  const skillBody = existsSync(skillMdPath) ? readFileSync(skillMdPath, 'utf8') : null;
  for (const { file, hint } of DESIGN_FEATURE_TEMPLATES) {
    const fullPath = join(SKILLS_DIR, 'design-feature', 'templates', file);
    if (!existsSync(fullPath)) {
      issues.push({
        skill: 'design-feature',
        message: `missing bundled template at templates/${file} (${hint})`,
      });
    }
    if (skillBody !== null && !skillBody.includes(`templates/${file}`)) {
      issues.push({
        skill: 'design-feature',
        message: `SKILL.md does not reference templates/${file} — agent will not find it`,
      });
    }
  }
}

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

function validateStrategyCrossReferences(strategies) {
  if (!strategies || !Array.isArray(strategies.strategies)) return;
  const idSet = new Set(strategies.strategies.map(s => s.id));
  // `custom` is a legitimate special-case ID handled in code (Phase 0.4 free-text path),
  // intentionally NOT present in strategies.json.
  idSet.add('custom');
  const skillPath = join(SKILLS_DIR, 'design-feature', 'SKILL.md');
  if (!existsSync(skillPath)) return;
  const skillBody = readFileSync(skillPath, 'utf8');
  // Strategy IDs share a recognizable shape: framework prefix + at least one of these
  // terminal suffixes (`-max`, `-rhf`, `-primitives`, `-tailwind`, `-vanilla`, `-vee`,
  // `-html`). Restricting to this shape avoids false positives on npm package names
  // (`react-bootstrap`, `react-hook-form`, `solid-js`, `jquery-ui`, etc.) that share
  // a framework prefix but are not strategy IDs. If a new strategy is added whose ID
  // does not end in one of these tokens, extend this list.
  const STRATEGY_SUFFIX_RE = /-(max|rhf|primitives|tailwind|vanilla|vee|html)$/;
  const codeSpanRe = /`([a-z]+(?:-[a-z0-9]+)+)`/g;
  let m;
  const refs = new Set();
  while ((m = codeSpanRe.exec(skillBody)) !== null) {
    const tok = m[1];
    if (!/^(react|vue|svelte|angular|solid|jquery|vanilla)-/.test(tok)) continue;
    if (!STRATEGY_SUFFIX_RE.test(tok)) continue;
    refs.add(tok);
  }
  for (const r of refs) {
    if (!idSet.has(r)) {
      issues.push({ skill: 'design-feature', message: `SKILL.md references strategy ID \`${r}\` but it is missing from strategies.json` });
    }
  }
}

function validateGeneratedTemplateInSync() {
  const repoRoot = resolve(here);
  const dsPatternPath = join(SKILLS_DIR, 'design-feature', 'templates', 'ds-component-pattern.md');
  if (!existsSync(dsPatternPath)) return; // existence covered by validateDesignFeatureTemplate
  const generator = resolve(repoRoot, 'scripts/build-template.mjs');
  if (!existsSync(generator)) {
    issues.push({ skill: 'design-feature', message: 'scripts/build-template.mjs missing — required to regenerate ds-component-pattern.md from strategies.json' });
    return;
  }
  const before = readFileSync(dsPatternPath, 'utf8');
  const result = spawnSync(process.execPath, [generator], { encoding: 'utf8' });
  if (result.status !== 0) {
    issues.push({ skill: 'design-feature', message: `build-template.mjs failed (exit ${result.status}): ${result.stderr || result.stdout}` });
    // Restore the original bytes if the generator overwrote them in a partial way.
    writeFileSync(dsPatternPath, before);
    return;
  }
  const after = readFileSync(dsPatternPath, 'utf8');
  if (before !== after) {
    issues.push({ skill: 'design-feature', message: 'ds-component-pattern.md is out of sync with strategies.json — run `node scripts/build-template.mjs` and commit the result' });
    // Restore the committed bytes so a contributor running `npm test` locally doesn't end up
    // with an unexpected modification on disk.
    writeFileSync(dsPatternPath, before);
  }
}

function collectHeadings(markdown) {
  // Returns the set of trimmed heading titles found in the body, plus a parallel
  // set of leading numeric tokens (e.g., "0.5", "0.2.5") harvested from `### N.N Title`
  // style headings.
  const titles = new Set();
  const numeric = new Set();
  const HEADING_RE = /^#{1,6}\s+(.+?)\s*$/gm;
  let m;
  while ((m = HEADING_RE.exec(markdown)) !== null) {
    const raw = m[1].trim();
    titles.add(raw);
    // Strip a `### 0.2.5 Branch check (...)` style numeric prefix and store the bare title too.
    const numMatch = raw.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
    if (numMatch) {
      numeric.add(numMatch[1]);
      titles.add(numMatch[2].trim());
    }
  }
  return { titles, numeric };
}

function headingMatches(targetHeadings, title) {
  // Exact match wins. Otherwise, accept any heading that BEGINS with the referenced
  // title followed by either end-of-string or a parenthetical clarifier (e.g.,
  // ` (no Chrome MCP)` or ` (once per skill start)`). This mirrors how humans cite
  // sections — they elide the parenthetical aside without changing the meaning.
  if (targetHeadings.titles.has(title)) return true;
  for (const h of targetHeadings.titles) {
    if (h.startsWith(title + ' (') && h.endsWith(')')) return true;
  }
  return false;
}

function validateCrossReferences() {
  const targets = [
    { skill: 'design-feature',          path: join(SKILLS_DIR, 'design-feature', 'SKILL.md') },
    { skill: 'bootstrap-design-system', path: join(SKILLS_DIR, 'bootstrap-design-system', 'SKILL.md') },
  ];
  const headingsBySkill = new Map();
  for (const t of targets) {
    if (!existsSync(t.path)) continue;
    headingsBySkill.set(t.skill, collectHeadings(readFileSync(t.path, 'utf8')));
  }
  // Match `§ "Title"` (with or without leading "see"/"See"), curly or straight quotes.
  // Group 1 captures the title.
  const QUOTED_RE = /§\s*["“]([^"”\n]+?)["”]/g;
  // Match bare numeric refs like `§0.5`, `§ 0.2.5`. Group 1 captures the number.
  const NUMERIC_RE = /§\s*(\d+(?:\.\d+)+)/g;
  // Recognize cross-file context in the 120 chars before a `§ "..."` ref. Either:
  //   - a relative or absolute path to the other SKILL.md (`../design-feature/SKILL.md`,
  //     `skills/design-feature/SKILL.md`), OR
  //   - a bare mention of the other skill's name immediately preceding the `§` (e.g.,
  //     `` `design-feature` § "Phase 5 — ..." ``).
  const CROSS_FILE_RE = /(?:skills\/|\.\.\/)(design-feature|bootstrap-design-system)\/SKILL\.md|`?(design-feature|bootstrap-design-system)`?\s*$/;
  for (const t of targets) {
    if (!existsSync(t.path)) continue;
    const body = readFileSync(t.path, 'utf8');
    const ownHeadings = headingsBySkill.get(t.skill);
    let m;
    while ((m = QUOTED_RE.exec(body)) !== null) {
      const title = m[1].trim();
      const ctx = body.slice(Math.max(0, m.index - 120), m.index);
      const cross = ctx.match(CROSS_FILE_RE);
      let targetSkill = null;
      if (cross) {
        targetSkill = cross[1] || cross[2];
        // Don't redirect to "self" if the bare-name fallback matched our own skill —
        // this happens when the surrounding prose mentions e.g. `design-feature` while
        // we're currently scanning design-feature/SKILL.md.
        if (targetSkill === t.skill) targetSkill = null;
      }
      const targetHeadings = targetSkill ? headingsBySkill.get(targetSkill) : ownHeadings;
      if (!targetHeadings) continue;
      if (!headingMatches(targetHeadings, title)) {
        issues.push({
          skill: t.skill,
          message: `cross-reference § "${title}" does not match any heading${targetSkill ? ` in ${targetSkill}/SKILL.md` : ''}`,
        });
      }
    }
    while ((m = NUMERIC_RE.exec(body)) !== null) {
      const num = m[1];
      if (!ownHeadings.numeric.has(num)) {
        issues.push({
          skill: t.skill,
          message: `cross-reference §${num} does not match any numbered heading`,
        });
      }
    }
  }
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---\n')) return null;
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) return null;
  return raw.slice(4, end);
}

function extractCompat(frontmatter) {
  const cli = frontmatter.match(/^[ \t]+cli:\s*["']?([^"'\n]+?)["']?\s*$/m);
  const markup = frontmatter.match(/^[ \t]+markup:\s*["']?([^"'\n]+?)["']?\s*$/m);
  return {
    cli: cli ? cli[1].trim() : null,
    markup: markup ? markup[1].trim() : null,
  };
}

function rangeLowerBound(range) {
  // Extracts the lower bound from a `>=X.Y.Z` style range. Returns [maj, min, patch] or null.
  const m = range && range.match(/(?:>=|>|=)?\s*(\d+)\.(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function cmpVersion(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function validateCompatAlignment() {
  const designPath = join(SKILLS_DIR, 'design-feature', 'SKILL.md');
  const bootstrapPath = join(SKILLS_DIR, 'bootstrap-design-system', 'SKILL.md');
  if (!existsSync(designPath) || !existsSync(bootstrapPath)) return;
  const designFm = parseFrontmatter(readFileSync(designPath, 'utf8'));
  const bootstrapRaw = readFileSync(bootstrapPath, 'utf8');
  const bootstrapFm = parseFrontmatter(bootstrapRaw);
  if (!designFm || !bootstrapFm) return;
  const designCompat = extractCompat(designFm);
  const bootstrapCompat = extractCompat(bootstrapFm);
  // 1. Both skills must declare the same compat.cli and compat.markup.
  if (designCompat.cli && bootstrapCompat.cli && designCompat.cli !== bootstrapCompat.cli) {
    issues.push({
      skill: 'cross-cutting',
      message: `compat.cli mismatch: design-feature="${designCompat.cli}" vs bootstrap-design-system="${bootstrapCompat.cli}" — both SKILL.md files must declare the same range`,
    });
  }
  if (designCompat.markup && bootstrapCompat.markup && designCompat.markup !== bootstrapCompat.markup) {
    issues.push({
      skill: 'cross-cutting',
      message: `compat.markup mismatch: design-feature="${designCompat.markup}" vs bootstrap-design-system="${bootstrapCompat.markup}" — both SKILL.md files must declare the same range`,
    });
  }
  // 2. bootstrap precondition 2 wording's version must be >= compat.cli lower bound.
  // The wording lives near the top of the file as "Recommended (not strictly required) is `>=X.Y.Z`".
  const precondMatch = bootstrapRaw.match(/Recommended[^`]*`(>=\s*\d+\.\d+\.\d+)`/);
  if (precondMatch && bootstrapCompat.cli) {
    const precondVer = rangeLowerBound(precondMatch[1]);
    const compatVer = rangeLowerBound(bootstrapCompat.cli);
    if (precondVer && compatVer && cmpVersion(precondVer, compatVer) < 0) {
      issues.push({
        skill: 'bootstrap-design-system',
        message: `precondition 2 wording "${precondMatch[1]}" is below frontmatter compat.cli "${bootstrapCompat.cli}" — raise the precondition text to match the frontmatter (the frontmatter wins for hard checks)`,
      });
    }
  }
}

const skills = readdirSync(SKILLS_DIR);
for (const s of skills) {
  validate(s);
}

validateDesignFeatureTemplate();
const strategiesData = validateStrategies();
validateStrategyCrossReferences(strategiesData);
validateGeneratedTemplateInSync();
validateCrossReferences();
validateCompatAlignment();

if (issues.length === 0) {
  console.log(`✓ Validated ${skills.length} skill(s); no issues.`);
  process.exit(0);
}

for (const i of issues) {
  console.error(`✗ [${i.skill}] ${i.message}`);
}
console.error(`\n${issues.length} issue(s) found.`);
process.exit(1);
