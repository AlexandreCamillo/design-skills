#!/usr/bin/env node
// Deterministic smoke test for the design-feature Phase 0 detection logic.
// Reads test-fixtures/sample-react-app/ and the strategies.json catalog,
// then asserts the computed strategy matches the expected golden.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const fixtureRoot = join(repoRoot, 'test-fixtures/sample-react-app');
const expectedPath = join(repoRoot, 'test-fixtures/sample-react-app.expected/strategy.json');
const strategiesPath = join(repoRoot, 'skills/design-feature/templates/strategies.json');

function fail(msg) {
  console.error(`✗ smoke-test: ${msg}`);
  process.exit(1);
}

if (!existsSync(fixtureRoot)) fail(`fixture missing: ${fixtureRoot}`);
if (!existsSync(expectedPath)) fail(`expected golden missing: ${expectedPath}`);
if (!existsSync(strategiesPath)) fail(`strategies.json missing: ${strategiesPath}`);

const pkg = JSON.parse(readFileSync(join(fixtureRoot, 'package.json'), 'utf8'));
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const strategies = JSON.parse(readFileSync(strategiesPath, 'utf8'));
const expected = JSON.parse(readFileSync(expectedPath, 'utf8'));

// 1. Framework detection (§0.1 step 1, priority order).
const FRAMEWORK_MARKERS = [
  ['@angular/core', 'angular'],
  ['react',         'react'],
  ['vue',           'vue'],
  ['svelte',        'svelte'],
  ['solid-js',      'solid'],
  ['jquery',        'jquery'],
];
let framework = 'vanilla';
for (const [marker, name] of FRAMEWORK_MARKERS) {
  if (marker in deps) { framework = name; break; }
}

// 2. Ecosystem detection (§0.1 step 2). Per-framework marker columns — full set is
//    documented in skills/design-feature/SKILL.md; this script covers the react row
//    in full and ships a minimal stub for other frameworks (extend when adding
//    fixtures for other stacks).
const ECO = {
  react: {
    uiLibs: ['antd', '@radix-ui/react-form', '@mui/material', '@chakra-ui/react', '@mantine/core', 'react-bootstrap', '@headlessui/react'],
    formLibs: ['react-hook-form', 'formik'],
    styling: ['tailwindcss', '@tailwindcss/postcss', '@tailwindcss/vite', '@tailwindcss/cli', 'styled-components', '@emotion/react', 'sass'],
    animation: ['framer-motion', 'motion'],
    icons: ['lucide-react', '@phosphor-icons/react', 'react-icons'],
  },
};
const eco = ECO[framework] || { uiLibs: [], formLibs: [], styling: [], animation: [], icons: [] };
function pick(cat) {
  return cat.filter(name => name in deps).map(name => `${name}@${deps[name]}`);
}
const detected = {
  framework: framework in deps ? `${framework}@${deps[framework]}` : `${framework}@(none)`,
  uiLibs: pick(eco.uiLibs),
  formLibs: pick(eco.formLibs),
  styling: pick(eco.styling),
  animation: pick(eco.animation),
  icons: pick(eco.icons),
};

// 3. Strategy selection — pick the strategies.json entry whose markers.ui ⊆ detected
//    uiLibs AND markers.form ⊆ detected formLibs, with the highest total marker
//    coverage. Empty-marker baselines (`*-vanilla`) are skipped unless nothing else
//    matches — they would otherwise win every comparison via vacuous truth.
function bareName(s) { return s.split('@')[0]; }
const detectedUiNames = new Set(detected.uiLibs.map(bareName));
const detectedFormNames = new Set(detected.formLibs.map(bareName));
let best = null;
let bestScore = -1;
for (const s of strategies.strategies) {
  if (s.framework !== framework) continue;
  const ui = s.markers?.ui || [];
  const form = s.markers?.form || [];
  if (ui.length === 0 && form.length === 0) continue;
  const uiOk = ui.every(m => detectedUiNames.has(m));
  const formOk = form.every(m => detectedFormNames.has(m));
  if (!uiOk || !formOk) continue;
  const score = ui.length + form.length;
  if (score > bestScore) { best = s; bestScore = score; }
}
if (!best) fail('no strategy matched the fixture deps — expected react-antd-rhf');

// 4. Agent rules (§0.2) — first present of AGENTS.md / CLAUDE.md / GEMINI.md.
let agentSource = null;
let agentSummary = '';
for (const f of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) {
  const p = join(fixtureRoot, f);
  if (existsSync(p)) {
    agentSource = f;
    const body = readFileSync(p, 'utf8');
    const headerMatch = body.match(/^##\s+(.+?)$/m);
    if (headerMatch) agentSummary = headerMatch[1].trim();
    break;
  }
}

// 5. Build the actual result and compare against the golden.
const actual = {
  framework,
  chosen: best.id,
  label: best.label,
  detected,
  projectRules: {
    agentRules: { source: agentSource, summary: agentSummary },
  },
  freeText: null,
  bootstrappedFromEmpty: false,
  featureRoot: '.',
};

function deepNorm(v) {
  if (Array.isArray(v)) return v.map(deepNorm);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = deepNorm(v[k]);
    return out;
  }
  return v;
}
const a = JSON.stringify(deepNorm(actual), null, 2);
const e = JSON.stringify(deepNorm(expected), null, 2);
if (a !== e) {
  console.error('✗ smoke-test: detection result does not match the expected golden');
  console.error('--- expected ---');
  console.error(e);
  console.error('--- actual ---');
  console.error(a);
  process.exit(1);
}

console.log('✓ smoke-test: Phase 0 detection produces the expected strategy.json shape (react-antd-rhf).');
