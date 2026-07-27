// End-to-end proof that the Number engine (bitval.js) produces the SAME results
// as the reference BigInt engine (bench/bitval-reference.js, a snapshot of the
// pre-opt/4 code). For deterministic (exhaustive, <=2 cards to come) scenarios
// the win/tie/lose counts must match EXACTLY; for preflop Monte Carlo, equity
// must match within statistical tolerance.
//
//   node bench/engine-differential.js [flopScenarios] [turnScenarios]
//
// Defaults run thousands of randomized scenarios (millions of hand comparisons).
// Exits non-zero on any exact-match failure.

const New = require('../bitval.js');
const Ref = require('../bench/bitval-reference.js');
const { WIDE, SQUEEZE } = require('./scenarios.js');

const nv = new New(), rv = new Ref();
const RANKS = 'AKQJT98765432', SUITS = 'shdc';
const DECK = []; for (const r of RANKS) for (const s of SUITS) DECK.push(r + s);

// Deterministic RNG so failures are reproducible.
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(0xC0FFEE);

function dealDistinct(n) {
  const out = [], used = new Set();
  while (out.length < n) { const i = (rng() * 52) | 0; if (!used.has(i)) { used.add(i); out.push(DECK[i]); } }
  return out;
}
const k = r => `${r.win}/${r.tie}/${r.lose}`;
const eq = r => (r.win + r.tie / 2) / (r.win + r.tie + r.lose) * 100;

let exactChecks = 0, exactFails = 0, handComparisons = 0;

async function assertExact(hero, villain, board, dead, optimize, label) {
  const n = await nv.compareRange(hero, villain, board, dead, 5, 1e9, optimize, null, 100, false);
  const r = await rv.compareRange(hero, villain, board, dead, 5, 1e9, optimize, null, 100, false);
  exactChecks++;
  handComparisons += n.win + n.tie + n.lose;
  if (k(n) !== k(r)) {
    exactFails++;
    if (exactFails <= 5) console.log(`  FAIL ${label} opt=${optimize}: new=${k(n)} ref=${k(r)}  hero=${hero} villain=${villain} board=${board} dead=${dead}`);
  }
}

(async () => {
  const flopN = parseInt(process.argv[2], 10) || 2500;
  const turnN = parseInt(process.argv[3], 10) || 1500;

  // 1) Randomized single-hand vs single-hand, random flop, exhaustive+exact.
  console.log(`1) ${flopN} random single-vs-single flops (exact)...`);
  for (let i = 0; i < flopN; i++) {
    const c = dealDistinct(7);
    await assertExact([c[0] + c[1]], [c[2] + c[3]], [c[4], c[5], c[6]], [], true, 'flop');
  }

  // 2) Randomized single-hand vs single-hand, random turn (1 to come), exact.
  console.log(`2) ${turnN} random single-vs-single turns (exact)...`);
  for (let i = 0; i < turnN; i++) {
    const c = dealDistinct(8);
    await assertExact([c[0] + c[1]], [c[2] + c[3]], [c[4], c[5], c[6], c[7]], [], true, 'turn');
  }

  // 3) Randomized single-vs-single flops WITH dead cards, both optimize modes.
  console.log('3) 400 random flops with dead cards, optimize true+false (exact)...');
  for (let i = 0; i < 400; i++) {
    const c = dealDistinct(9);
    const hero = [c[0] + c[1]], villain = [c[2] + c[3]], board = [c[4], c[5], c[6]], dead = [c[7], c[8]];
    await assertExact(hero, villain, board, dead, true, 'flop+dead');
    await assertExact(hero, villain, board, dead, false, 'flop+dead-unopt');
  }

  // 4) Wide range vs range on structured boards (exact), both modes.
  console.log('4) wide range-vs-range on structured boards, both modes (exact)...');
  const boards = [['Ad', '8d', '7d'], ['Ks', '9d', '2c'], ['Qs', 'Qd', '7h'], ['Ts', '9s', '8s'], ['Ad', 'Kd', '7c', '2s'], ['5h', '5d', '5c', '9s']];
  for (const board of boards) {
    for (const optimize of [true, false]) {
      await assertExact(SQUEEZE, WIDE, board, [], optimize, `wide board=${board.join('')}`);
    }
  }

  console.log(`\nExact checks: ${exactChecks}, failures: ${exactFails}, total hand comparisons: ${handComparisons.toLocaleString()}`);

  // 5) Preflop Monte Carlo: RNG differs between engines, so compare equity within tolerance.
  console.log('\n5) preflop Monte Carlo (statistical, tolerance 1.0pp on 300k iters)...');
  let mcFails = 0;
  const mcCases = [[['AhKh'], ['QsQd']], [['AsAd'], SQUEEZE.slice(0, 20)], [['7h2c'], ['AsKs']]];
  for (const [hero, villain] of mcCases) {
    const n = await nv.compareRange(hero, villain, [], [], 5, 300000, true, null, 100, false);
    const r = await rv.compareRange(hero, villain, [], [], 5, 300000, true, null, 100, false);
    const d = Math.abs(eq(n) - eq(r));
    const ok = d <= 1.0;
    if (!ok) mcFails++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'} hero=${hero} new=${eq(n).toFixed(2)}% ref=${eq(r).toFixed(2)}% Δ=${d.toFixed(2)}`);
  }

  const allOk = exactFails === 0 && mcFails === 0;
  console.log(`\n${allOk ? 'OK - Number engine matches the reference engine' : 'FAILURE'}`);
  process.exit(allOk ? 0 : 1);
})();
