// compareRangeHands: per-hand win/tie/lose for both sides from one call.
//  1) Exact flop/turn (unweighted + dyadic weights, small + large ranges):
//     optimized per-hand arrays == optimize:false per-pair reference, exactly;
//     totals == compareRange; totals == sum(weight * per-hand).
//  2) Each hand's row == compareRange of that hand alone against the other range.
//  3) Preflop table per-hand == single-pair lookups.
//  4) Fully blocked hands (non-dyadic weights) are exactly 0/0/0.
//  5) (--mc) Shared-board Monte Carlo per-hand equity vs the exact table.
//
//   node bench/hands.js [scenarios] [--mc]
//
// Exits non-zero on any failure.

const fs = require('fs');
const path = require('path');
const BitVal = require('../bitval.js');

const bv = new BitVal();
const RANKS = 'AKQJT98765432', SUITS = 'shdc';
const DECK = []; for (const r of RANKS) for (const s of SUITS) DECK.push(r + s);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(0x4A2D5);
const rint = n => (rng() * n) | 0;
const DY = [0.25, 0.5, 0.75, 1, 1.5, 2];
let fails = 0, checks = 0;
const ok = (cond, label) => { checks++; if (!cond) { fails++; if (fails <= 8) console.log('  FAIL ' + label); } };
const k = r => `${r.win}/${r.tie}/${r.lose}`;
const row = (side, i) => `${side.win[i]}/${side.tie[i]}/${side.lose[i]}`;
const sameSide = (a, b) => ['win', 'tie', 'lose'].every(f => a[f].length === b[f].length && a[f].every((x, i) => x === b[f][i]));
function randomHands(size, used) {
  const set = new Set(); let guard = 0;
  while (set.size < size && guard++ < size * 50) {
    const a = DECK[rint(52)], b = DECK[rint(52)];
    if (a === b || used.has(a) || used.has(b)) continue;
    set.add(a + b);
  }
  return [...set];
}
function invariants(r, label) {
  let w = 0, t = 0, l = 0, vw = 0, vt = 0, vl = 0;
  r.hero.hands.forEach((_, i) => { const m = r.hero.weights[i]; w += m * r.hero.win[i]; t += m * r.hero.tie[i]; l += m * r.hero.lose[i]; });
  r.villain.hands.forEach((_, j) => { const m = r.villain.weights[j]; vw += m * r.villain.win[j]; vt += m * r.villain.tie[j]; vl += m * r.villain.lose[j]; });
  const near = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
  ok(near(w, r.win) && near(t, r.tie) && near(l, r.lose), `${label}: hero rows don't sum to totals`);
  ok(near(vw, r.lose) && near(vt, r.tie) && near(vl, r.win), `${label}: villain rows don't mirror totals`);
}

(async () => {
  const N = parseInt(process.argv[2], 10) || 40;
  const MC = process.argv.includes('--mc');

  console.log(`1) ${N} flop/turn scenarios: optimized per-hand == optimize:false, totals == compareRange`);
  for (let i = 0; i < N; i++) {
    const used = new Set(), board = [];
    while (board.length < 3 + (i % 2)) { const c = DECK[rint(52)]; if (!used.has(c)) { used.add(c); board.push(c); } }
    const big = i % 3 !== 0;
    let hero = randomHands(big ? 16 + rint(30) : 1 + rint(5), new Set()), villain = randomHands(big ? 16 + rint(30) : 1 + rint(6), new Set());
    if (i % 2) { hero = hero.map(h => `${h}:${DY[rint(DY.length)]}`); villain = villain.map(h => `${h}:${DY[rint(DY.length)]}`); }
    const opt = await bv.compareRangeHands(hero, villain, board, [], 5, 1, true, null, 100, false);
    const ref = await bv.compareRangeHands(hero, villain, board, [], 5, 1, false, null, 100, false);
    const agg = await bv.compareRange(hero, villain, board, [], 5, 1, true, null, 100, false);
    ok(sameSide(opt.hero, ref.hero) && sameSide(opt.villain, ref.villain), `scenario ${i}: per-hand opt != optimize:false`);
    ok(k(opt) === k(agg), `scenario ${i}: totals ${k(opt)} vs compareRange ${k(agg)}`);
    invariants(opt, `scenario ${i}`);
  }

  console.log('2) each row == that hand alone against the other range');
  {
    const board = ['Ks', '9d', '2c', '7h'];
    const hero = randomHands(20, new Set(board)), villain = randomHands(24, new Set(board)).map((h, j) => `${h}:${DY[j % DY.length]}`);
    const r = await bv.compareRangeHands(hero, villain, board);
    for (let i = 0; i < hero.length; i += 3) ok(k(await bv.compareRange([hero[i]], villain, board)) === row(r.hero, i), `hero row ${hero[i]}`);
    for (let j = 0; j < villain.length; j += 3) {
      const alone = await bv.compareRange(hero, [villain[j].split(':')[0]], board); // villain j, weight 1 ...
      ok(`${alone.lose}/${alone.tie}/${alone.win}` === row(r.villain, j), `villain row ${villain[j]}`);   // ... seen from its side
    }
  }

  const table = path.join(__dirname, 'preflop-table.bin');
  const ex = new BitVal();
  if (fs.existsSync(table)) {
    ex.loadPreflopTable(fs.readFileSync(table));
    console.log('3) preflop table: per-hand rows == single-pair lookups');
    for (let s = 0; s < 4; s++) {
      const hero = randomHands(6 + rint(10), new Set()), villain = randomHands(10 + rint(20), new Set()).map((h, j) => `${h}:${DY[j % DY.length]}`);
      const r = await ex.compareRangeHands(hero, villain);
      const agg = await ex.compareRange(hero, villain);
      ok(k(r) === k(agg), `preflop totals ${k(r)} vs ${k(agg)}`);
      invariants(r, 'preflop');
      for (let i = 0; i < hero.length; i += 2) ok(k(await ex.compareRange([hero[i]], villain)) === row(r.hero, i), `preflop hero row ${hero[i]}`);
    }
  } else console.log('3) skipped: bench/preflop-table.bin not present');

  console.log('4) fully blocked hands are exactly 0/0/0 (non-dyadic weights)');
  {
    const board = ['2c', '7d', '9h'];
    const ND = [0.1, 0.3, 0.7, 0.2, 0.9];
    const heroes = ['AsAh:0.1', ...randomHands(20, new Set([...board, 'As', 'Ah'])).map((h, i) => `${h}:${ND[i % 5]}`)];
    const villains = DECK.filter(c => !board.includes(c) && c !== 'As' && c !== 'Ah').slice(0, 24).map((c, j) => `${j % 2 ? 'As' : 'Ah'}${c}:${ND[j % 5]}`);
    const r = await bv.compareRangeHands(heroes, villains, board);
    ok(row(r.hero, 0) === '0/0/0', `AsAh (blocked by every villain) should be 0/0/0, got ${row(r.hero, 0)}`);
    ok(['win', 'tie', 'lose'].every(f => r.hero[f].every(x => x >= 0) && r.villain[f].every(x => x >= 0)), 'negative per-hand count');
    const sb = new BitVal();
    const rm = await sb.compareRangeHands(heroes, villains, [], ['2c'], 5, 20000);
    ok(row(rm.hero, 0) === '0/0/0', `Monte Carlo: AsAh should be 0/0/0, got ${row(rm.hero, 0)}`);
  }

  if (MC && ex._pfSlot) {
    console.log('5) Monte Carlo per-hand equity vs the exact table (aggregate 0.5pp, each hand 3pp)');
    const eqOf = (side, i) => (side.win[i] + side.tie[i] / 2) / (side.win[i] + side.tie[i] + side.lose[i]) * 100;
    for (let s = 0; s < 3; s++) {
      const hero = randomHands(15 + rint(20), new Set()), villain = randomHands(40 + rint(60), new Set());
      const exact = await ex.compareRangeHands(hero, villain);
      const mc = await new BitVal().compareRangeHands(hero, villain, [], [], 5, 200000, true, null, 100, false, 0);
      const e = r => (r.win + r.tie / 2) / (r.win + r.tie + r.lose) * 100;
      ok(Math.abs(e(mc) - e(exact)) <= 0.5, `MC aggregate ${e(mc).toFixed(2)} vs ${e(exact).toFixed(2)}`);
      let worst = 0;
      for (let i = 0; i < hero.length; i++) worst = Math.max(worst, Math.abs(eqOf(mc.hero, i) - eqOf(exact.hero, i)));
      for (let j = 0; j < villain.length; j++) worst = Math.max(worst, Math.abs(eqOf(mc.villain, j) - eqOf(exact.villain, j)));
      ok(worst <= 3, `MC per-hand worst error ${worst.toFixed(2)}pp`);
      console.log(`  ${hero.length}x${villain.length}: aggregate ${e(mc).toFixed(2)}% vs exact ${e(exact).toFixed(2)}%, worst per-hand error ${worst.toFixed(2)}pp`);
    }
  }

  console.log(`\n  checks: ${checks}, failures: ${fails}`);
  console.log(fails === 0 ? 'OK - per-hand results are exact and consistent' : `${fails} FAILURE(S)`);
  process.exit(fails === 0 ? 0 : 1);
})();
