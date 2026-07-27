// Proxy benchmark for opt/3-worker-pool.
//
// The node harness can't run the browser Worker path, so this measures the
// fixed per-call cost the pool removes: spawning a worker and loading bitval.js
// (node worker_threads standing in for browser Worker + importScripts), versus
// a warm round-trip to an already-running pooled worker.
//
//   node bench/worker-spawn.js
//
// Browser Worker spawn is generally >= this; mobile is higher still.

const { Worker } = require('worker_threads');
const path = require('path');
const WORKER = path.join(__dirname, '_spawn-worker.js');

function spawnAndReady() {
  return new Promise((resolve, reject) => {
    const t = process.hrtime.bigint();
    const w = new Worker(WORKER);
    w.once('message', () => resolve({ ms: Number(process.hrtime.bigint() - t) / 1e6, w }));
    w.once('error', reject);
  });
}

function roundTrip(w) {
  return new Promise((resolve) => {
    const t = process.hrtime.bigint();
    w.once('message', () => resolve(Number(process.hrtime.bigint() - t) / 1e6));
    w.postMessage(1);
  });
}

(async () => {
  const N = 8;

  // Cold: spawn + load, N times (what happens today, per compareRange call).
  let coldTotal = 0;
  const live = [];
  for (let i = 0; i < N; i++) {
    const { ms, w } = await spawnAndReady();
    coldTotal += ms;
    live.push(w);
  }

  // Warm: round-trip to an already-running pooled worker (what the pool gives you).
  let warmTotal = 0;
  for (const w of live) warmTotal += await roundTrip(w);

  await Promise.all(live.map((w) => w.terminate()));

  const cold = coldTotal / N;
  const warm = warmTotal / N;
  console.log(`worker spawn+load (cold):  ${cold.toFixed(2)} ms/worker`);
  console.log(`warm round-trip (pooled):  ${warm.toFixed(2)} ms/worker`);
  console.log(`per-call cost the pool removes: ~${(cold - warm).toFixed(2)} ms/worker`);
  console.log(`\nNote: node worker_threads proxy. Browser Worker + importScripts is`);
  console.log(`typically >= this on desktop and notably higher on mobile.`);
})();
