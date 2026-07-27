// Correctness gate: optimize=true must agree with optimize=false (the ground
// truth) within the documented canonical-folding margin, across board textures.
// Exhaustive scenarios are deterministic, so equity should match tightly.
//
//   node bench/correctness.js
//
// Exits non-zero if any scenario exceeds TOLERANCE — use it to gate a branch.

const BitVal = require('../bitval.js');
const { SCENARIOS } = require('./scenarios.js');

const TOLERANCE = 0.5; // percentage points; matches README's ±0.5% note

const eq = r => (r.win + r.tie / 2) / (r.win + r.tie + r.lose) * 100;

(async () => {
  const bv = new BitVal();
  let failed = 0;
  console.log(`correctness: optimize=true vs unoptimized (tolerance ±${TOLERANCE}pp)\n`);
  for (const s of SCENARIOS) {
    if (!s.gate) continue; // gate scenarios are deterministic with a cheap reference
    const opt = await bv.compareRange(s.hero, s.villain, s.board, [], 5, s.iters, true, null, 100, false);
    const ref = await bv.compareRange(s.hero, s.villain, s.board, [], 5, s.iters, false, null, 100, false);
    const d = eq(opt) - eq(ref);
    const ok = Math.abs(d) <= TOLERANCE;
    if (!ok) failed++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${s.name.padEnd(20)} opt=${eq(opt).toFixed(2)}%  ref=${eq(ref).toFixed(2)}%  Δ=${d.toFixed(2)}`);
  }
  console.log(`\n${failed === 0 ? 'OK' : failed + ' FAILURE(S)'}`);
  process.exit(failed === 0 ? 0 : 1);
})();
