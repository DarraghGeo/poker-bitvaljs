// Proves the public simulate() (now on the Number engine) matches the reference
// BigInt engine: exhaustive (<=2 cards to come) results must be IDENTICAL;
// Monte Carlo preflop equity must match the exact preflop table within tolerance.
//
//   node bench/simulate-equivalence.js [exhaustiveScenarios]
//
// Exits non-zero on any failure.

const fs = require('fs');
const path = require('path');
const New = require('../bitval.js');
const Ref = require('./bitval-reference.js');

const nv = new New(), rv = new Ref();
const RANKS = 'AKQJT98765432', SUITS = 'shdc';
const DECK = []; for (const r of RANKS) for (const s of SUITS) DECK.push(r + s);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(0x51A1);
const deal = n => { const out = []; while (out.length < n) { const c = DECK[(rng() * 52) | 0]; if (!out.includes(c)) out.push(c); } return out; };
const k = r => `${r.win}/${r.tie}/${r.lose}`;
const eq = r => (r.win + r.tie / 2) / (r.win + r.tie + r.lose) * 100;

(async () => {
  const N = parseInt(process.argv[2], 10) || 1500;
  let fails = 0;
  console.log(`1) ${N} exhaustive simulate() scenarios (flop/turn/river, some dead cards) - must be identical`);
  for (let i = 0; i < N; i++) {
    const c = deal(9), nBoard = 3 + (i % 3);
    const board = c.slice(4, 4 + nBoard), dead = (i % 4 === 0 && nBoard < 5) ? [c[8]] : [];
    const a = nv.simulate(1000, 5, c.slice(0, 2), c.slice(2, 4), board, dead);
    const b = rv.simulate(1000, 5, c.slice(0, 2), c.slice(2, 4), board, dead);
    if (k(a) !== k(b)) { fails++; if (fails <= 5) console.log(`  FAIL ${c} board=${board} dead=${dead} new=${k(a)} ref=${k(b)}`); }
  }
  console.log(`  mismatches: ${fails}`);

  console.log('2) preflop Monte Carlo simulate() vs exact table (tolerance 0.5pp at 300k iters)');
  const table = path.join(__dirname, 'preflop-table.bin');
  if (fs.existsSync(table)) {
    const ex = new New(); ex.loadPreflopTable(fs.readFileSync(table));
    for (const [h, v] of [[['As', 'Kd'], ['Qh', 'Qc']], [['7h', '2c'], ['Ah', 'Kh']], [['Jc', 'Tc'], ['9d', '9s']], [['Ad', 'Ac'], ['Kh', 'Ks']]]) {
      const exact = eq(await ex.compareRange([h.join('')], [v.join('')]));
      const mc = eq(nv.simulate(300000, 5, h, v));
      const ok = Math.abs(mc - exact) <= 0.5;
      if (!ok) fails++;
      console.log(`  ${ok ? 'PASS' : 'FAIL'} ${h.join('')} v ${v.join('')} simulate=${mc.toFixed(2)}% exact=${exact.toFixed(2)}%`);
    }
  } else console.log('  (skipped: bench/preflop-table.bin not present)');

  console.log(`\n${fails === 0 ? 'OK - simulate() matches the reference engine' : fails + ' FAILURE(S)'}`);
  process.exit(fails === 0 ? 0 : 1);
})();
