#!/usr/bin/env node
// Validate that every SKILL.md in skills/ has the required frontmatter,
// non-empty body, and references that point at real CLI commands.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const skills = readdirSync(SKILLS_DIR);
for (const s of skills) {
  validate(s);
}

validateDesignFeatureTemplate();

if (issues.length === 0) {
  console.log(`✓ Validated ${skills.length} skill(s); no issues.`);
  process.exit(0);
}

for (const i of issues) {
  console.error(`✗ [${i.skill}] ${i.message}`);
}
console.error(`\n${issues.length} issue(s) found.`);
process.exit(1);
