// Accuracy of the opt-in shared-board Monte Carlo (bitval.mcSharedBoards).
//  1) No dead cards: vs the EXACT preflop table, over many range pairs.
//  2) With dead cards: vs the per-pair unoptimized Monte Carlo (optimize=false).
//
//   node bench/mc-shared-board.js [pairs]
//
// Exits non-zero if any equity is off by more than the tolerance.

const fs = require('fs');
const path = require('path');
const BitVal = require('../bitval.js');
const { SQUEEZE, WIDE } = require('./scenarios.js');

const RANKS = 'AKQJT98765432', SUITS = 'shdc';
const DECK = []; for (const r of RANKS) for (const s of SUITS) DECK.push(r + s);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(0xB0A2D5);
const rint = n => (rng() * n) | 0;
function randomRange(size, used = new Set()) {
  const set = new Set();
  while (set.size < size) {
    const a = DECK[rint(52)], b = DECK[rint(52)];
    if (a === b || used.has(a) || used.has(b)) continue;
    set.add(a + b);
  }
  return [...set];
}
const eq = r => (r.win + r.tie / 2) / (r.win + r.tie + r.lose) * 100;

(async () => {
  const N = parseInt(process.argv[2], 10) || 16;
  const TOL = 0.5;
  let fails = 0, sumAbs = 0, n = 0;

  const mc = new BitVal(); mc.mcSharedBoards = true;
  const table = path.join(__dirname, 'preflop-table.bin');
  if (fs.existsSync(table)) {
    const ex = new BitVal(); ex.loadPreflopTable(fs.readFileSync(table));
    console.log(`1) ${N + 3} range pairs, no dead cards: shared-board MC vs exact table (tol ${TOL}pp)`);
    const pairs = [[SQUEEZE, WIDE], [WIDE, WIDE], [['AhJh'], SQUEEZE]];
    for (let i = 0; i < N; i++) pairs.push([randomRange(1 + rint(60)), randomRange(1 + rint(200))]);
    for (const [h, v] of pairs) {
      const exact = eq(await ex.compareRange(h, v));
      const t = Date.now();
      const est = eq(await mc.compareRange(h, v, [], [], 5, 200000, true, null, 100, false, 0.3));
      const d = est - exact; sumAbs += Math.abs(d); n++;
      const ok = Math.abs(d) <= TOL; if (!ok) fails++;
      console.log(`  ${ok ? 'PASS' : 'FAIL'} ${String(h.length).padStart(4)}x${String(v.length).padEnd(4)} exact=${exact.toFixed(2)}% mc=${est.toFixed(2)}% d=${d.toFixed(2)}  ${Date.now() - t}ms`);
    }
  } else console.log('1) skipped: bench/preflop-table.bin not present');

  console.log(`2) ${Math.max(4, N >> 2)} dead-card cases: shared-board MC vs per-pair MC (optimize=false)`);
  const ref = new BitVal();
  for (let i = 0; i < Math.max(4, N >> 2); i++) {
    const dead = [DECK[rint(52)], DECK[rint(52)]].filter((c, j, a) => a.indexOf(c) === j);
    const used = new Set(dead);
    const h = randomRange(1 + rint(3), used), v = randomRange(2 + rint(4), used);
    const r = eq(await ref.compareRange(h, v, [], dead, 5, 300000, false, null, 100, false, 0));
    const est = eq(await mc.compareRange(h, v, [], dead, 5, 300000, true, null, 100, false, 0));
    const d = est - r; sumAbs += Math.abs(d); n++;
    const ok = Math.abs(d) <= TOL; if (!ok) fails++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'} ${h.length}x${v.length} dead=${dead.join('')} per-pair=${r.toFixed(2)}% shared=${est.toFixed(2)}% d=${d.toFixed(2)}`);
  }

  console.log(`\n  mean |error|: ${(sumAbs / n).toFixed(3)}pp over ${n} cases`);
  console.log(`${fails === 0 ? 'OK - shared-board Monte Carlo is accurate' : fails + ' FAILURE(S)'}`);
  process.exit(fails === 0 ? 0 : 1);
})();
