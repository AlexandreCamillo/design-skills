#!/usr/bin/env node
// Materializes skills/design-feature/templates/ds-component-pattern.md
// from ds-component-pattern.template.md + strategies.json.
//
// Run: node scripts/build-template.mjs
// CI:  validate.mjs invokes this then compares the output to the committed copy.
//
// Placeholder syntax recognised in the shell template:
//   <!-- INSERT strategies.adaptation -->       -> renders §6 (per-framework adaptation tables)
//   <!-- INSERT strategies.canonicalSnippet --> -> renders §9 (per-framework snippets)
// Any other comments are left untouched.

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

function byFramework(strats, framework) {
  return strats.strategies.filter(s => s.framework === framework);
}

function renderAdaptation(strats) {
  const out = [];
  for (const fw of strats.frameworks) {
    if (fw === 'custom') continue; // 'Custom' paragraph is hand-authored in the shell template.
    const rows = byFramework(strats, fw);
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
  return out.join('\n').replace(/\n+$/, '');
}

function renderSnippets(strats) {
  const out = [];
  for (const fw of strats.frameworks) {
    if (fw === 'custom') continue;
    const rows = byFramework(strats, fw);
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
  return out.join('\n').replace(/\n+$/, '');
}

let output = shell;
output = output.replace(/<!-- INSERT strategies\.adaptation -->/g, renderAdaptation(strategies));
output = output.replace(/<!-- INSERT strategies\.canonicalSnippet -->/g, renderSnippets(strategies));

const outputPath = resolve(tplDir, 'ds-component-pattern.md');
writeFileSync(outputPath, output);
console.log(`✓ Wrote ${outputPath} (${output.length} bytes; ${strategies.strategies.length} strategies).`);
