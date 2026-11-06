// byCard / byRunout rows from compareRangeHands(Sync).
//  1) Optimized rows == optimize:false reference (every pair, every runout), exactly,
//     on random flops and turns (dyadic weights, dead cards, small + large fields);
//     sync == async; totals unchanged.
//  2) Each row == a separate compareRangeHands call on the board plus that card /
//     runout (turn byCard, flop byCard = turn view, flop byRunout).
//  3) Sums: byRunout and turn byCard sum to the hand's totals; flop byCard to 2x.
//  4) NaN exactly on board / dead / own cards (and clashing hands' whole rows);
//     a hand blocked by every opposing combo is exactly 0/0/0 on live cards.
//  5) Throws when the call isn't exact flop/turn enumeration.
//
//   node bench/by-card.js [scenarios]
//
// Exits non-zero on any failure.

const BitVal = require('../bitval.js');
const bv = new BitVal();
const RANKS = 'AKQJT98765432', SUITS = 'shdc';
const DECK = []; for (const r of RANKS) for (const s of SUITS) DECK.push(r + s);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(0xB1CA2D);
const rint = n => (rng() * n) | 0;
const DY = [0.25, 0.5, 0.75, 1, 1.5, 2];
let fails = 0, checks = 0;
const ok = (cond, label) => { checks++; if (!cond) { fails++; if (fails <= 8) console.log('  FAIL ' + label); } };
const F = ['win', 'tie', 'lose'];
const sameArr = (a, b) => a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
const sameRows = (x, y) => F.every(f => sameArr(x[f], y[f]));
function randomHands(size, used) {
  const set = new Set(); let guard = 0;
  while (set.size < size && guard++ < size * 50) {
    const a = DECK[rint(52)], b = DECK[rint(52)];
    if (a === b || used.has(a) || used.has(b)) continue;
    set.add(a + b);
  }
  return [...set];
}
const OPT = { byCard: true, byRunout: true };

(async () => {
  const N = parseInt(process.argv[2], 10) || 24;

  console.log(`1) ${N} random flops/turns: optimized rows == optimize:false, sync == async`);
  for (let s = 0; s < N; s++) {
    const used = new Set(), board = [];
    while (board.length < 3 + (s % 2)) { const c = DECK[rint(52)]; if (!used.has(c)) { used.add(c); board.push(c); } }
    const dead = s % 3 === 2 ? [DECK.find(c => !used.has(c))] : [];
    const big = s % 4 !== 0, flop = board.length === 3;
    let hero = randomHands(big ? (flop ? 16 + rint(10) : 20 + rint(40)) : 1 + rint(4), new Set());
    let villain = randomHands(big ? (flop ? 16 + rint(12) : 20 + rint(40)) : 2 + rint(4), new Set());
    if (s % 2) { hero = hero.map(h => `${h}:${DY[rint(DY.length)]}`); villain = villain.map(h => `${h}:${DY[rint(DY.length)]}`); }
    const opt = bv.compareRangeHandsSync(hero, villain, board, dead, 5, 1, true, OPT);
    const ref = bv.compareRangeHandsSync(hero, villain, board, dead, 5, 1, false, OPT);
    const asy = await bv.compareRangeHands(hero, villain, board, dead, 5, 1, true, OPT);
    const plain = bv.compareRangeHandsSync(hero, villain, board, dead);
    for (const side of ['hero', 'villain']) {
      ok(sameRows(opt[side].byCard, ref[side].byCard), `scenario ${s} ${side}.byCard != optimize:false`);
      ok(sameRows(opt[side].byRunout, ref[side].byRunout), `scenario ${s} ${side}.byRunout != optimize:false`);
      ok(sameRows(opt[side].byCard, asy[side].byCard) && sameRows(opt[side].byRunout, asy[side].byRunout), `scenario ${s} ${side}: sync != async`);
      ok(F.every(f => sameArr(opt[side][f], plain[side][f])), `scenario ${s} ${side}: per-hand totals changed by the rows option`);
      // 3) sums
      const n = opt.runouts.length / opt.runoutSize, mult = flop ? 2 : 1;
      for (let i = 0; i < opt[side].hands.length; i++) for (const f of F) {
        let sr = 0, sc = 0;
        for (let k = 0; k < n; k++) { const x = opt[side].byRunout[f][i * n + k]; if (!Number.isNaN(x)) sr += x; }
        for (let c = 0; c < 52; c++) { const x = opt[side].byCard[f][i * 52 + c]; if (!Number.isNaN(x)) sc += x; }
        ok(sr === opt[side][f][i], `scenario ${s} ${side} hand ${i}: byRunout ${f} sum ${sr} != ${opt[side][f][i]}`);
        ok(sc === mult * opt[side][f][i], `scenario ${s} ${side} hand ${i}: byCard ${f} sum ${sc} != ${mult}x ${opt[side][f][i]}`);
      }
    }
    ok(opt.win === plain.win && opt.tie === plain.tie && opt.lose === plain.lose, `scenario ${s}: totals changed`);
  }

  console.log('2) rows == separate calls on board + card / runout');
  {
    const board = ['Ks', '9d', '2c'];
    const hero = randomHands(30, new Set(board)).map((h, i) => `${h}:${DY[i % DY.length]}`), villain = randomHands(40, new Set(board));
    const r = bv.compareRangeHandsSync(hero, villain, board, [], 5, 1, true, OPT);
    const n = r.runouts.length / 2;
    for (let t = 0; t < 6; t++) { // flop byRunout rows
      const k = rint(n), cards = [bv.cardString(r.runouts[2 * k]), bv.cardString(r.runouts[2 * k + 1])];
      const one = bv.compareRangeHandsSync(hero, villain, [...board, ...cards]);
      for (let i = 0; i < r.hero.hands.length; i++) {
        const own = cards.some(c => r.hero.hands[i].includes(c));
        ok(own ? Number.isNaN(r.hero.byRunout.win[i * n + k]) : F.every(f => r.hero.byRunout[f][i * n + k] === one.hero[f][i]), `flop byRunout ${cards} hand ${r.hero.hands[i]}`);
      }
      for (let j = 0; j < r.villain.hands.length; j++) {
        const own = cards.some(c => r.villain.hands[j].includes(c));
        ok(own || F.every(f => r.villain.byRunout[f][j * n + k] === one.villain[f][j]), `flop villain byRunout ${cards} ${r.villain.hands[j]}`);
      }
    }
    for (let t = 0; t < 6; t++) { // flop byCard = the turn view (all rivers after turn c)
      const c = DECK.filter(x => !board.includes(x))[rint(49)], ci = bv.cardIndex(c);
      const one = bv.compareRangeHandsSync(hero, villain, [...board, c]);
      for (let i = 0; i < r.hero.hands.length; i++) {
        const own = r.hero.hands[i].includes(c);
        ok(own ? Number.isNaN(r.hero.byCard.win[i * 52 + ci]) : F.every(f => r.hero.byCard[f][i * 52 + ci] === one.hero[f][i]), `flop byCard ${c} hand ${r.hero.hands[i]}`);
      }
    }
    const tb = ['Ks', '9d', '2c', '7h'];
    const rt = bv.compareRangeHandsSync(hero.filter(h => !h.includes('7h')), villain.filter(h => !h.includes('7h')), tb, [], 5, 1, true, OPT);
    for (let t = 0; t < 6; t++) { // turn byCard (= river)
      const c = DECK.filter(x => !tb.includes(x))[rint(48)], ci = bv.cardIndex(c);
      const one = bv.compareRangeHandsSync(rt.hero.hands.map((h, i) => `${h}:${rt.hero.weights[i]}`), rt.villain.hands, [...tb, c]);
      for (let i = 0; i < rt.hero.hands.length; i++) {
        if (rt.hero.hands[i].includes(c)) continue;
        ok(F.every(f => rt.hero.byCard[f][i * 52 + ci] === one.hero[f][i]), `turn byCard ${c} hand ${rt.hero.hands[i]}`);
      }
    }
  }

  console.log('4) NaN placement; blocked hand 0/0/0');
  {
    const board = ['2c', '7d', '9h', 'Js'], dead = ['3s'];
    const ND = [0.1, 0.3, 0.7, 0.2, 0.9];
    const hero = ['AsAh:0.1', 'Kc9c', ...randomHands(20, new Set([...board, ...dead, 'As', 'Ah'])).map((h, i) => `${h}:${ND[i % 5]}`)];
    const villain = DECK.filter(c => ![...board, ...dead].includes(c) && c !== 'As' && c !== 'Ah').slice(0, 24).map((c, j) => `${j % 2 ? 'As' : 'Ah'}${c}:${ND[j % 5]}`);
    const r = bv.compareRangeHandsSync(hero, villain, board, dead, 5, 1, true, OPT);
    const nanAt = new Set([...board, ...dead, 'As', 'Ah'].map(c => bv.cardIndex(c)));
    let okNaN = true, okZero = true;
    for (let c = 0; c < 52; c++) {
      const x = r.hero.byCard.win[c];
      if (nanAt.has(c)) okNaN = okNaN && Number.isNaN(x) && Number.isNaN(r.hero.byCard.tie[c]) && Number.isNaN(r.hero.byCard.lose[c]);
      else okZero = okZero && F.every(f => r.hero.byCard[f][c] === 0);
    }
    ok(okNaN, 'AsAh: byCard NaN exactly on board, dead and own cards');
    ok(okZero, 'AsAh (blocked by every villain combo): live cards exactly 0/0/0');
    const clash = r.hero.hands.indexOf('Kc9c'); // shares no board card -> fine; build a clashing one explicitly
    const r2 = bv.compareRangeHandsSync(['Js9s', 'AhKh'], ['QcQd'], board, [], 5, 1, true, OPT);
    ok(r2.hero.byCard.win.slice(0, 52).every(Number.isNaN) && r2.hero.byRunout.win.slice(0, r2.runouts.length).every(Number.isNaN), 'board-clashing hand rows all NaN');
    ok(clash >= 0, 'sanity');
  }

  console.log('5) throws when not exact flop/turn');
  for (const [label, args] of [['preflop', [[], []]], ['river', [['2c', '7d', '9h', 'Js', 'Qd'], []]], ['1-card board (Monte Carlo)', [['2c'], []]]]) {
    let threw = false;
    try { bv.compareRangeHandsSync(['AsKs'], ['QhQd'], args[0], args[1], 5, 1000, true, { byCard: true }); } catch (e) { threw = /byCard \/ byRunout/.test(e.message); }
    ok(threw, `${label}: should throw`);
  }

  console.log(`\n  checks: ${checks}, failures: ${fails}`);
  console.log(fails === 0 ? 'OK - byCard / byRunout rows are exact and consistent' : `${fails} FAILURE(S)`);
  process.exit(fails === 0 ? 0 : 1);
})();
