// Combo weights in compareRange ('AsKs:0.5' strings and { hand, weight } objects).
//  1) Exact flop/turn: weighted optimized == weighted unoptimized == pair-by-pair
//     reference (sum of w_h*w_v * simulate() counts), exactly. Dyadic weights
//     (0.25, 0.5, 0.75, 1.5, 2) keep floating-point sums exact.
//  2) Equivalences: weight 2 == listed twice, weight 0 == removed, ':1' ==
//     unweighted, object form == string form.
//  3) Preflop table: weighted range == sum of weighted single-pair lookups.
//  4) Input validation.
//  5) (--mc) Monte Carlo with weights vs the exact table (statistical).
//
//   node bench/weights.js [scenarios] [--mc]
//
// Exits non-zero on any failure.

const fs = require('fs');
const path = require('path');
const BitVal = require('../bitval.js');
const { SQUEEZE, WIDE } = require('./scenarios.js');

const bv = new BitVal();
const RANKS = 'AKQJT98765432', SUITS = 'shdc';
const DECK = []; for (const r of RANKS) for (const s of SUITS) DECK.push(r + s);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(0x3E16);
const rint = n => (rng() * n) | 0;
const W = [0.25, 0.5, 0.75, 1, 1.5, 2];
const k = r => `${r.win}/${r.tie}/${r.lose}`;
const eq = r => (r.win + r.tie / 2) / (r.win + r.tie + r.lose) * 100;
let fails = 0, checks = 0;
const ok = (cond, label) => { checks++; if (!cond) { fails++; if (fails <= 8) console.log('  FAIL ' + label); } };

function randomHands(size, used) {
  const set = new Set();
  let guard = 0;
  while (set.size < size && guard++ < size * 50) {
    const a = DECK[rint(52)], b = DECK[rint(52)];
    if (a === b || used.has(a) || used.has(b)) continue;
    set.add(a + b);
  }
  return [...set];
}
const weigh = hands => hands.map(h => `${h}:${W[rint(W.length)]}`);
const parse = e => { const [h, w] = e.split(':'); return { h, w: w === undefined ? 1 : Number(w) }; };
// Pair-by-pair ground truth: sum over valid pairs of w_h*w_v * simulate() counts.
function reference(hero, villain, board) {
  const out = { win: 0, tie: 0, lose: 0 };
  for (const he of hero) for (const ve of villain) {
    const a = parse(he), b = parse(ve);
    const cards = [a.h.slice(0, 2), a.h.slice(2), b.h.slice(0, 2), b.h.slice(2)];
    if (new Set([...cards, ...board]).size !== 4 + board.length) continue;
    const r = bv.simulate(1, 5, cards.slice(0, 2), cards.slice(2), board, []);
    const m = a.w * b.w;
    out.win += r.win * m; out.tie += r.tie * m; out.lose += r.lose * m;
  }
  return out;
}

(async () => {
  const N = parseInt(process.argv[2], 10) || 60;
  const MC = process.argv.includes('--mc');

  console.log(`1) ${N} weighted flop/turn scenarios: optimized == unoptimized == pair-by-pair reference`);
  for (let i = 0; i < N; i++) {
    const used = new Set(), board = [];
    while (board.length < 3 + (i % 2)) { const c = DECK[rint(52)]; if (!used.has(c)) { used.add(c); board.push(c); } }
    const big = i % 3 !== 0; // exercise both the counting (>=16 per side) and direct-pair kernels
    const hero = weigh(randomHands(big ? 16 + rint(14) : 1 + rint(5), used));
    const villain = weigh(randomHands(big ? 16 + rint(14) : 1 + rint(5), used));
    const opt = await bv.compareRange(hero, villain, board, [], 5, 1, true, null, 100, false);
    const unopt = await bv.compareRange(hero, villain, board, [], 5, 1, false, null, 100, false);
    ok(k(opt) === k(unopt), `opt vs unopt board=${board} opt=${k(opt)} unopt=${k(unopt)}`);
    if (i % 4 === 0) { const ref = reference(hero, villain, board); ok(k(opt) === k(ref), `opt vs reference board=${board} opt=${k(opt)} ref=${k(ref)}`); }
  }

  console.log('2) equivalences (flop, both kernels)');
  for (const [hs, vs] of [[SQUEEZE.slice(0, 20), WIDE.slice(0, 40)], [SQUEEZE.slice(0, 3), WIDE.slice(0, 5)]]) {
    const board = ['Ks', '9d', '2c'];
    const h = hs.filter(x => !board.some(c => x.includes(c))), v = vs.filter(x => !board.some(c => x.includes(c)));
    const base = await bv.compareRange(h, v, board, [], 5, 1, true, null, 100, false);
    const twice = await bv.compareRange([...h, h[0]], v, board, [], 5, 1, true, null, 100, false);
    const w2 = await bv.compareRange([`${h[0]}:2`, ...h.slice(1)], v, board, [], 5, 1, true, null, 100, false);
    ok(k(twice) === k(w2), `weight 2 vs listed twice: ${k(w2)} vs ${k(twice)}`);
    const w0 = await bv.compareRange(h.concat(`${v[0]}:0`), v, board, [], 5, 1, true, null, 100, false);
    ok(k(w0) === k(base), `weight 0 vs removed: ${k(w0)} vs ${k(base)}`);
    const ones = await bv.compareRange(h.map(x => x + ':1'), v.map(x => ({ hand: x, weight: 1 })), board, [], 5, 1, true, null, 100, false);
    ok(k(ones) === k(base), `':1' / weight 1 vs unweighted: ${k(ones)} vs ${k(base)}`);
    const hw = weigh(h), vw = weigh(v);
    const str = await bv.compareRange(hw, vw, board, [], 5, 1, true, null, 100, false);
    const obj = await bv.compareRange(hw.map(e => ({ hand: parse(e).h, weight: parse(e).w })), vw.map(e => ({ hand: parse(e).h, weight: parse(e).w })), board, [], 5, 1, true, null, 100, false);
    ok(k(str) === k(obj), `string vs object form: ${k(str)} vs ${k(obj)}`);
  }

  const table = path.join(__dirname, 'preflop-table.bin');
  const ex = new BitVal();
  if (fs.existsSync(table)) {
    ex.loadPreflopTable(fs.readFileSync(table));
    console.log('3) preflop table: weighted range == sum of weighted single-pair lookups');
    for (let i = 0; i < 6; i++) {
      const hero = weigh(randomHands(5 + rint(20), new Set())), villain = weigh(randomHands(5 + rint(40), new Set()));
      const r = await ex.compareRange(hero, villain);
      const sum = { win: 0, tie: 0, lose: 0 };
      for (const he of hero) for (const ve of villain) {
        const a = parse(he), b = parse(ve);
        const cards = [a.h.slice(0, 2), a.h.slice(2), b.h.slice(0, 2), b.h.slice(2)];
        if (new Set(cards).size !== 4) continue;
        const p = await ex.compareRange([a.h], [b.h]), m = a.w * b.w;
        sum.win += p.win * m; sum.tie += p.tie * m; sum.lose += p.lose * m;
      }
      ok(k(r) === k(sum), `preflop weighted ${k(r)} vs ${k(sum)}`);
    }
  } else console.log('3) skipped: bench/preflop-table.bin not present');

  console.log('4) input validation');
  for (const bad of [['AsKs:-1'], ['AsKs:abc'], [{ hand: 'AsK' }], [{ hand: 'AsKs', weight: Infinity }], [42]]) {
    let threw = false;
    try { await bv.compareRange(bad, ['QhQd'], ['2c', '7d', '9h']); } catch (e) { threw = true; }
    ok(threw, `should reject ${JSON.stringify(bad)}`);
  }

  if (MC && ex._pfSlot) {
    console.log('5) Monte Carlo with weights vs the exact table (tolerance: shared 0.5pp, per-matchup 1.0pp)');
    for (let i = 0; i < 6; i++) {
      const hero = weigh(randomHands(5 + rint(40), new Set())), villain = weigh(randomHands(10 + rint(120), new Set()));
      const exact = eq(await ex.compareRange(hero, villain));
      const sb = new BitVal(); sb.mcSharedBoards = true;
      const s = eq(await sb.compareRange(hero, villain, [], [], 5, 200000, true, null, 100, false));
      const d = eq(await new BitVal().compareRange(hero, villain, [], [], 5, 20000, true, null, 100, false));
      ok(Math.abs(s - exact) <= 0.5, `shared MC ${s.toFixed(2)} vs exact ${exact.toFixed(2)}`);
      ok(Math.abs(d - exact) <= 1.0, `per-matchup MC ${d.toFixed(2)} vs exact ${exact.toFixed(2)}`);
      console.log(`  ${hero.length}x${villain.length}: exact ${exact.toFixed(2)}%  shared ${s.toFixed(2)}%  per-matchup ${d.toFixed(2)}%`);
    }
  }

  console.log(`\n  checks: ${checks}, failures: ${fails}`);
  console.log(fails === 0 ? 'OK - combo weights are exact and consistent' : `${fails} FAILURE(S)`);
  process.exit(fails === 0 ? 0 : 1);
})();
