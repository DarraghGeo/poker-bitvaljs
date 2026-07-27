// Validates the preflop exact-equity table and its runtime fast path against
// independent full-enumeration ground truth, and benchmarks it vs Monte Carlo.
//
//   node bench/preflop-validate.js [tablePath]

const fs = require('fs');
const path = require('path');
const BitVal = require('../bitval.js');

const TABLE = process.argv[2] || path.join(__dirname, 'preflop-table.bin');
const RANKS = 'AKQJT98765432', SUITS = 'shdc', DECK = [];
for (const r of RANKS) for (const s of SUITS) DECK.push(r + s);

const bv = new BitVal();
const count = bv.loadPreflopTable(fs.readFileSync(TABLE));
console.log(`loaded ${count.toLocaleString()} canonical matchups from ${path.basename(TABLE)}\n`);

// Independent exact enumeration for two specific hands.
function exact(hCards, vCards) {
  const dead = new Set([...hCards, ...vCards]);
  const rem = DECK.filter(c => !dead.has(c));
  const hs = bv._suitsOfCards(hCards), vs = bv._suitsOfCards(vCards);
  const su = rem.map(c => bv.CARD_SUITS[c].suit), bt = rem.map(c => bv.CARD_SUITS[c].bit);
  const n = rem.length; let w = 0, t = 0, l = 0;
  for (let a = 0; a < n - 4; a++) for (let b = a + 1; b < n - 3; b++) for (let c = b + 1; c < n - 2; c++) for (let d = c + 1; d < n - 1; d++) for (let e = d + 1; e < n; e++) {
    let s0 = 0, s1 = 0, s2 = 0, s3 = 0;
    for (const i of [a, b, c, d, e]) { const s = su[i], x = bt[i]; if (s === 0) s0 |= x; else if (s === 1) s1 |= x; else if (s === 2) s2 |= x; else s3 |= x; }
    const hE = bv._eval7(hs[0] | s0, hs[1] | s1, hs[2] | s2, hs[3] | s3), vE = bv._eval7(vs[0] | s0, vs[1] | s1, vs[2] | s2, vs[3] | s3);
    if (hE > vE) w++; else if (vE > hE) l++; else t++;
  }
  return { win: w, tie: t, lose: l };
}
const k = r => `${r.win}/${r.tie}/${r.lose}`;
const eq = r => (r.win + r.tie / 2) / (r.win + r.tie + r.lose) * 100;
const rint = n => (Math.random() * n) | 0;

// 1) Correctness: random single-vs-single, table == exact enumeration.
console.log('1) 500 random single-vs-single preflop matchups vs exact enumeration...');
let fails = 0;
for (let i = 0; i < 500; i++) {
  const idx = new Set(); while (idx.size < 4) idx.add(rint(52));
  const [a, b, c, d] = [...idx].map(i => DECK[i]);
  const tbl = bv._compareRangePreflopExact([a + b], [c + d]);
  const gt = exact([a, b], [c, d]);
  if (k(tbl) !== k(gt)) { fails++; if (fails <= 5) console.log(`   FAIL ${a}${b} vs ${c}${d}: table=${k(tbl)} exact=${k(gt)}`); }
}
console.log(`   mismatches: ${fails}`);

// 2) Correctness: random range-vs-range, table == summed exact enumeration.
console.log('2) 80 random range-vs-range preflop, table == summed enumeration...');
let rfails = 0;
function randRange(size) { const out = [], seen = new Set(); let g = 0; while (out.length < size && g++ < size * 30) { const a = rint(52), b = rint(52); if (a === b) continue; const c = DECK[a] < DECK[b] ? DECK[a] + DECK[b] : DECK[b] + DECK[a]; if (seen.has(c)) continue; seen.add(c); out.push(c); } return out; }
for (let i = 0; i < 80; i++) {
  const hero = randRange(1 + rint(6)), villain = randRange(1 + rint(6));
  const tbl = bv._compareRangePreflopExact(hero, villain);
  let w = 0, t = 0, l = 0;
  for (const h of hero) for (const v of villain) {
    const hc = [h.slice(0, 2), h.slice(2, 4)], vc = [v.slice(0, 2), v.slice(2, 4)];
    if (hc[0] === vc[0] || hc[0] === vc[1] || hc[1] === vc[0] || hc[1] === vc[1]) continue;
    const e = exact(hc, vc); w += e.win; t += e.tie; l += e.lose;
  }
  if (k(tbl) !== `${w}/${t}/${l}`) { rfails++; if (rfails <= 5) console.log(`   FAIL hero=${hero} villain=${villain}: table=${k(tbl)} exact=${w}/${t}/${l}`); }
}
console.log(`   mismatches: ${rfails}`);

// 3) Speed: exact table vs Monte Carlo (100k) for a wide preflop range-vs-range.
console.log('\n3) speed: exact table vs Monte Carlo...');
const { WIDE, SQUEEZE } = require('./scenarios.js');
const mc = new BitVal(); // no table -> Monte Carlo path
(async () => {
  let t = process.hrtime.bigint();
  const rTbl = bv._compareRangePreflopExact(SQUEEZE, WIDE);
  const tblMs = Number(process.hrtime.bigint() - t) / 1e6;
  t = process.hrtime.bigint();
  const rMc = await mc.compareRange(SQUEEZE, WIDE, [], [], 5, 100000, true, null, 100, false);
  const mcMs = Number(process.hrtime.bigint() - t) / 1e6;
  console.log(`   squeeze-vs-wide preflop: table ${eq(rTbl).toFixed(3)}% in ${tblMs.toFixed(1)}ms  |  MC(100k) ${eq(rMc).toFixed(3)}% in ${mcMs.toFixed(0)}ms  => ${(mcMs / tblMs).toFixed(0)}x faster (and exact)`);

  const ok = fails === 0 && rfails === 0;
  console.log(`\n${ok ? 'OK - preflop table is exact and validated' : 'FAILURE'}`);
  process.exit(ok ? 0 : 1);
})();
