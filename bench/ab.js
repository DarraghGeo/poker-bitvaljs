// A/B timing: current bitval.js (under optimization) vs the frozen 1.4.0
// baseline (bench/bitval-baseline.js). Reports speedup per scenario.
//
//   node bench/ab.js [runs]
//
// Correctness is covered separately by test:differential / test:full — this
// file is timing only. Snapshot bench/bitval-baseline.js was taken at v1.4.0.

const Cur = require('../bitval.js');
const Base = require('./bitval-baseline.js');
const { SCENARIOS } = require('./scenarios.js');

const RUNS = parseInt(process.argv[2], 10) || 4;
const eq = r => (r.win + r.tie / 2) / (r.win + r.tie + r.lose) * 100;

async function best(make, s, runs) {
  const bv = new make();
  let b = Infinity, last;
  for (let i = 0; i < runs; i++) {
    const t = process.hrtime.bigint();
    last = await bv.compareRange(s.hero, s.villain, s.board, [], 5, s.iters, true, null, 100, false);
    b = Math.min(b, Number(process.hrtime.bigint() - t) / 1e6);
  }
  return { ms: b, result: last };
}

(async () => {
  console.log(`A/B: current vs baseline(1.4.0), best-of-${RUNS}, single-threaded\n`);
  console.log('  scenario              baseline    current    speedup   equity(cur/base)');
  console.log('  ' + '-'.repeat(72));
  for (const s of SCENARIOS) {
    const base = await best(Base, s, RUNS);
    const cur = await best(Cur, s, RUNS);
    const sp = (base.ms / cur.ms).toFixed(2) + 'x';
    console.log(`  ${s.name.padEnd(20)} ${base.ms.toFixed(1).padStart(8)}  ${cur.ms.toFixed(1).padStart(8)}   ${sp.padStart(7)}   ${eq(cur.result).toFixed(2)}/${eq(base.result).toFixed(2)}`);
  }
})();
