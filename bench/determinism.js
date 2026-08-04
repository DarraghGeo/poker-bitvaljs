// Locks in the flop/turn exhaustive-enumeration fix: with <=2 cards to come the
// engine must enumerate exhaustively regardless of the requested iteration
// count, so results are EXACT and DETERMINISTIC at any slider value.
//
//   node bench/determinism.js
//
// Exits non-zero on any failure.

const BitVal = require('../bitval.js');
const { SQUEEZE } = require('./scenarios.js');

const key = r => `${r.win}/${r.tie}/${r.lose}`;
const eq = r => (r.win + r.tie / 2) / (r.win + r.tie + r.lose) * 100;

(async () => {
  const bv = new BitVal();
  const hero = ['AhJh'];
  const villain = SQUEEZE;
  let failed = 0;
  const ok = (cond, label, extra = '') => {
    if (!cond) failed++;
    console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`);
  };

  for (const [name, board] of [['flop (2 to come)', ['Ad', '8d', '7d']], ['turn (1 to come)', ['Ad', '8d', '7d', '2s']], ['river (0 to come)', ['Ad', '8d', '7d', '2s', 'Kc']]]) {
    console.log(`\n${name}, board ${board.join(' ')}`);
    // Low iteration counts that would previously trigger Monte Carlo:
    const low = [];
    for (const iters of [1, 100, 1000]) {
      low.push(await bv.compareRange(hero, villain, board, [], 5, iters, true, null, 100, false));
    }
    const big = await bv.compareRange(hero, villain, board, [], 5, 1e9, true, null, 100, false);
    const twice = await bv.compareRange(hero, villain, board, [], 5, 1, true, null, 100, false);

    ok(low.every(r => key(r) === key(big)), 'low iteration counts match full exhaustive', `[${low.map(key).join(' | ')}] vs ${key(big)}`);
    ok(key(low[0]) === key(twice), 'repeated run is identical (deterministic)');
    const ref = await bv.compareRange(hero, villain, board, [], 5, 1e9, false, null, 100, false);
    ok(Math.abs(eq(big) - eq(ref)) <= 0.5, 'equity within +/-0.5pp of unoptimized', `opt=${eq(big).toFixed(2)}% ref=${eq(ref).toFixed(2)}%`);
  }

  console.log(`\n${failed === 0 ? 'OK' : failed + ' FAILURE(S)'}`);
  process.exit(failed === 0 ? 0 : 1);
})();
