/**
 * Generates bitval.mjs, the ES-module entry, from bitval.js: the same code with `export`s added,
 * so browsers can import poker-bitvaljs without a bundler (with an import map) and bundlers can
 * share one copy of it between packages. Runs before every pack and publish (prepack), and in
 * the tests, so the two files never drift apart.
 *
 * In a module there is no document.currentScript, so the worker file is found next to this module
 * (import.meta.url) instead.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function build() {
  const source = fs.readFileSync(path.join(root, 'bitval.js'), 'utf8');
  const marker = 'const _BITVAL_WORKER_URL = (function () {';
  if (!source.includes(marker)) throw new Error('bitval.js no longer defines _BITVAL_WORKER_URL as expected');
  const moduleSource = source.replace(marker, `const _BITVAL_WORKER_URL = (function () {
  try {
    return new URL('./bitval-worker.js', import.meta.url).href;
  } catch (e) { /* fall through */ }`);
  const out = `// Generated from bitval.js by scripts/build-esm.js: do not edit.\n${moduleSource}\nexport { BitVal };\nexport default BitVal;\n`;
  fs.writeFileSync(path.join(root, 'bitval.mjs'), out);
  return out;
}

if (require.main === module) {
  build();
  console.log('Wrote bitval.mjs');
}

module.exports = { build };
