// Headline benchmark: the shipped engine vs the pre-optimization engine
// (bench/bitval-reference.js = the original BigInt evaluator, before the opt/4
// Number rewrite). Single-threaded, best-of-N, optimize=true. Preflop uses the
// shipped engine's exact table vs the reference's Monte Carlo.
//
//   node bench/pre-vs-post.js [runs]

const fs = require('fs');
const path = require('path');
const Post = require('../bitval.js');            // shipped
const Pre = require('./bitval-reference.js');    // pre-optimization BigInt engine
const { SCENARIOS } = require('./scenarios.js');

const RUNS = parseInt(process.argv[2], 10) || 3;
const eq = r => (r.win + r.tie / 2) / (r.win + r.tie + r.lose) * 100;

const post = new Post();
post.loadPreflopTable(fs.readFileSync(path.join(__dirname, 'preflop-table.bin')));
const pre = new Pre();

async function best(bv, s, runs) {
  let b = Infinity, last;
  for (let i = 0; i < runs; i++) {
    const t = process.hrtime.bigint();
    last = await bv.compareRange(s.hero, s.villain, s.board, [], 5, s.iters, true, null, 100, false);
    b = Math.min(b, Number(process.hrtime.bigint() - t) / 1e6);
  }
  return { ms: b, result: last };
}

(async () => {
  console.log(`Shipped vs pre-optimization (original BigInt engine), best-of-${RUNS}, single-threaded\n`);
  console.log('  scenario              pre (ms)    post (ms)   speedup    equity post/pre');
  console.log('  ' + '-'.repeat(70));
  for (const s of SCENARIOS) {
    const a = await best(pre, s, RUNS);
    const b = await best(post, s, RUNS);
    const sp = (a.ms / b.ms);
    const note = s.board.length === 0 ? ' (post: exact table vs pre: MC)' : '';
    console.log(`  ${s.name.padEnd(20)} ${a.ms.toFixed(1).padStart(9)}  ${b.ms.toFixed(1).padStart(10)}   ${(sp.toFixed(sp >= 100 ? 0 : 1) + 'x').padStart(8)}    ${eq(b.result).toFixed(2)}/${eq(a.result).toFixed(2)}${note}`);
  }
})();
