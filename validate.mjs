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

const skills = readdirSync(SKILLS_DIR);
for (const s of skills) {
  validate(s);
}

validateDesignFeatureTemplate();
const strategiesData = validateStrategies();
validateStrategyCrossReferences(strategiesData);
validateGeneratedTemplateInSync();

if (issues.length === 0) {
  console.log(`✓ Validated ${skills.length} skill(s); no issues.`);
  process.exit(0);
}

for (const i of issues) {
  console.error(`✗ [${i.skill}] ${i.message}`);
}
console.error(`\n${issues.length} issue(s) found.`);
process.exit(1);
