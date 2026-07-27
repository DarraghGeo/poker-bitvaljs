// Proves the optimized exhaustive path (#3c: evaluate-once + counting with
// card-conflict correction) is EXACT — byte-identical to the unoptimized
// (per-pair) computation — across many randomized range-vs-range scenarios.
// This exercises both the direct (small field) and sorted-counting (large
// field) branches, with and without dead cards.
//
//   node bench/exact-optimize.js [scenarios]
//
// Exits non-zero on any mismatch.

const BitVal = require('../bitval.js');
const bv = new BitVal();

const RANKS = 'AKQJT98765432', SUITS = 'shdc';
const DECK = []; for (const r of RANKS) for (const s of SUITS) DECK.push(r + s);
const RVAL = {}; RANKS.split('').forEach((r, i) => RVAL[r] = 12 - i);

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(0x5EED42);
const rint = n => (rng() * n) | 0;

// Build a random range of `size` distinct combos avoiding `used` cards.
function randomRange(size, used) {
  const set = new Set(), out = [];
  let guard = 0;
  while (out.length < size && guard++ < size * 40) {
    const a = rint(52), b = rint(52);
    if (a === b) continue;
    const c1 = DECK[a], c2 = DECK[b];
    if (used.has(c1) || used.has(c2)) continue;
    const combo = RVAL[c1[0]] >= RVAL[c2[0]] ? c1 + c2 : c2 + c1;
    if (set.has(combo)) continue;
    set.add(combo); out.push(combo);
  }
  return out;
}
const k = r => `${r.win}/${r.tie}/${r.lose}`;

(async () => {
  const N = parseInt(process.argv[2], 10) || 400;
  let fails = 0, comparisons = 0;
  console.log(`exact-optimize: ${N} randomized range-vs-range scenarios (opt=true must == opt=false)\n`);
  for (let i = 0; i < N; i++) {
    const used = new Set();
    const nBoard = 3 + rint(2);              // flop or turn (exhaustive)
    const board = [];
    while (board.length < nBoard) { const c = DECK[rint(52)]; if (!used.has(c)) { used.add(c); board.push(c); } }
    const dead = [];
    if (rng() < 0.3) { const c = DECK[rint(52)]; if (!used.has(c)) { used.add(c); dead.push(c); } }
    const hSize = 1 + rint(30), vSize = 1 + rint(30); // mix of small (direct) and large (counting) fields
    const hero = randomRange(hSize, used);
    const villain = randomRange(vSize, used);
    if (hero.length === 0 || villain.length === 0) continue;

    const opt = await bv.compareRange(hero, villain, board, dead, 5, 1e9, true, null, 100, false);
    const ref = await bv.compareRange(hero, villain, board, dead, 5, 1e9, false, null, 100, false);
    comparisons += opt.win + opt.tie + opt.lose;
    if (k(opt) !== k(ref)) {
      fails++;
      if (fails <= 5) console.log(`  FAIL board=${board} dead=${dead} hero=${hero.join(',')} villain=${villain.join(',')}\n     opt=${k(opt)} ref=${k(ref)}`);
    }
  }
  console.log(`  scenarios: ${N}, mismatches: ${fails}, total hand comparisons: ${comparisons.toLocaleString()}`);
  console.log(`\n${fails === 0 ? 'OK - optimized exhaustive path is exact' : fails + ' MISMATCH(ES)'}`);
  process.exit(fails === 0 ? 0 : 1);
})();
