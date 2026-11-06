#!/usr/bin/env node
/**
 * Runs test commands in parallel and reports each one as it finishes.
 *
 *   node scripts/run-tests.js "node bench/a.js" "node bench/b.js 300" ...
 *
 * The test scripts are independent, so they run up to TEST_JOBS at a time
 * (default: the number of CPU cores). Each command's output is buffered and
 * printed in one block when it finishes, so logs don't interleave. Exits
 * non-zero if any command fails (after letting the others finish).
 */
const { spawn } = require('child_process');
const os = require('os');

const cmds = process.argv.slice(2);
const jobs = Math.max(1, Number(process.env.TEST_JOBS) || (os.availableParallelism ? os.availableParallelism() : os.cpus().length));
const started = Date.now();
const results = [];
let next = 0, running = 0;

function runOne(cmd) {
  return new Promise(resolve => {
    const t0 = Date.now();
    const child = spawn(cmd, { shell: true, cwd: process.cwd(), env: process.env });
    let out = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });
    child.on('close', code => resolve({ cmd, code, out, ms: Date.now() - t0 }));
  });
}

function pump(done) {
  while (running < jobs && next < cmds.length) {
    const cmd = cmds[next++];
    running++;
    runOne(cmd).then(r => {
      running--;
      results.push(r);
      const status = r.code === 0 ? 'PASS' : `FAIL (exit ${r.code})`;
      process.stdout.write(`\n=== ${status}  ${r.cmd}  (${(r.ms / 1000).toFixed(1)} s)\n${r.out.trimEnd()}\n`);
      if (results.length === cmds.length) done(); else pump(done);
    });
  }
}

if (cmds.length === 0) { console.error('usage: node scripts/run-tests.js "<command>" ...'); process.exit(2); }
pump(() => {
  const failed = results.filter(r => r.code !== 0);
  console.log(`\n${cmds.length - failed.length}/${cmds.length} passed in ${((Date.now() - started) / 1000).toFixed(1)} s (${jobs} at a time)`);
  for (const r of failed) console.log(`  FAILED: ${r.cmd}`);
  process.exit(failed.length ? 1 : 0);
});
