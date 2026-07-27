// Timing benchmark for the optimized compareRange path (single-threaded, to
// match the deterministic exhaustive scenarios). Reports best-of-N wall time
// and hero equity per scenario.
//
//   node bench/bench.js [runs]
//
// Prints a table; paste it into bench/RESULTS.md for the branch under test.

const BitVal = require('../bitval.js');
const { SCENARIOS } = require('./scenarios.js');

const RUNS = parseInt(process.argv[2], 10) || 3;
const eq = r => (r.win + r.tie / 2) / (r.win + r.tie + r.lose) * 100;

async function timeBest(fn, runs) {
  let best = Infinity, last;
  for (let i = 0; i < runs; i++) {
    const t = process.hrtime.bigint();
    last = await fn();
    best = Math.min(best, Number(process.hrtime.bigint() - t) / 1e6);
  }
  return { ms: best, result: last };
}

(async () => {
  const bv = new BitVal();
  console.log(`bench: optimized compareRange, best-of-${RUNS}, single-threaded\n`);
  console.log('  scenario              time(ms)   equity');
  console.log('  ' + '-'.repeat(44));
  for (const s of SCENARIOS) {
    const { ms, result } = await timeBest(
      () => bv.compareRange(s.hero, s.villain, s.board, [], 5, s.iters, true, null, 100, false),
      RUNS
    );
    console.log(`  ${s.name.padEnd(20)} ${ms.toFixed(0).padStart(8)}   ${eq(result).toFixed(2)}%`);
  }
})();
