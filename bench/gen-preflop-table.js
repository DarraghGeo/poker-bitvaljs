// Generates the EXACT preflop equity table: for every suit-isomorphic
// hero-vs-villain matchup, the (win, tie) counts over all C(48,5) boards.
// Parallelized across CPU cores. Output is a compact binary keyed by canonical
// matchup, consumed by BitVal's preflop fast path.
//
//   node bench/gen-preflop-table.js [--limit N] [--out path] [--workers N]
//
// card index c (0..51) = rankIndex*4 + suitIndex; rankIndex 0..12 = 2..A.

const { Worker } = require('worker_threads');
const os = require('os');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const getArg = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const LIMIT = parseInt(getArg('--limit', '0'), 10) || 0;
const OUT = getArg('--out', path.join(__dirname, 'preflop-table.bin'));
const NWORKERS = parseInt(getArg('--workers', String(Math.max(1, (os.cpus() || []).length - 1))), 10);
const TOTAL_BOARDS = 1712304; // C(48,5)

// 24 suit permutations.
function perms(a) { if (a.length <= 1) return [a]; const out = []; for (let i = 0; i < a.length; i++) { const rest = a.slice(0, i).concat(a.slice(i + 1)); for (const p of perms(rest)) out.push([a[i], ...p]); } return out; }
const S4 = perms([0, 1, 2, 3]);

// Canonical key for a hero-vs-villain matchup under suit isomorphism.
// Hero and villain roles are preserved (equity is hero's perspective).
function canonKey(h1, h2, v1, v2) {
  let best = Infinity;
  for (let pi = 0; pi < 24; pi++) {
    const p = S4[pi];
    const mh1 = (h1 & ~3) | p[h1 & 3], mh2 = (h2 & ~3) | p[h2 & 3];
    const mv1 = (v1 & ~3) | p[v1 & 3], mv2 = (v2 & ~3) | p[v2 & 3];
    const a = mh1 < mh2 ? mh1 : mh2, b = mh1 < mh2 ? mh2 : mh1;
    const c = mv1 < mv2 ? mv1 : mv2, d = mv1 < mv2 ? mv2 : mv1;
    const key = ((a * 52 + b) * 52 + c) * 52 + d;
    if (key < best) best = key;
  }
  return best;
}

// Enumerate distinct canonical matchups (representative card indices per key).
console.log('enumerating canonical matchups...');
const repMap = new Map(); // canonKey -> [h1,h2,v1,v2]
for (let h1 = 0; h1 < 52; h1++) for (let h2 = h1 + 1; h2 < 52; h2++)
  for (let v1 = 0; v1 < 52; v1++) for (let v2 = v1 + 1; v2 < 52; v2++) {
    if (v1 === h1 || v1 === h2 || v2 === h1 || v2 === h2) continue;
    const key = canonKey(h1, h2, v1, v2);
    if (!repMap.has(key)) repMap.set(key, [h1, h2, v1, v2]);
  }
let keys = [...repMap.keys()];
if (LIMIT) keys = keys.slice(0, LIMIT);
const M = keys.length;
console.log(`distinct canonical matchups: ${repMap.size.toLocaleString()}${LIMIT ? ` (limited to ${M})` : ''}`);

// Flatten representatives to an Int32Array for the workers.
const reps = new Int32Array(M * 4);
for (let i = 0; i < M; i++) { const r = repMap.get(keys[i]); reps[i * 4] = r[0]; reps[i * 4 + 1] = r[1]; reps[i * 4 + 2] = r[2]; reps[i * 4 + 3] = r[3]; }

// Split across workers and run.
const nw = Math.min(NWORKERS, M);
const per = Math.ceil(M / nw);
const winByKey = new Uint32Array(M), tieByKey = new Uint32Array(M);
let doneWorkers = 0, doneMatchups = 0;
const t0 = Date.now();
console.log(`computing on ${nw} workers (${TOTAL_BOARDS.toLocaleString()} boards each)...`);

for (let w = 0; w < nw; w++) {
  const start = w * per, end = Math.min(M, start + per);
  if (start >= end) { doneWorkers++; continue; }
  const slice = reps.slice(start * 4, end * 4);
  const worker = new Worker(path.join(__dirname, '_preflop-worker.js'), { workerData: { matchups: slice } });
  let localDoneBase = 0;
  worker.on('message', (msg) => {
    if (msg.progress !== undefined) {
      doneMatchups = doneMatchups - localDoneBase + msg.progress; localDoneBase = msg.progress; return;
    }
    if (msg.done) {
      const res = msg.res; const cnt = res.length / 2;
      for (let i = 0; i < cnt; i++) { winByKey[start + i] = res[i * 2]; tieByKey[start + i] = res[i * 2 + 1]; }
      doneMatchups += (end - start) - localDoneBase;
      doneWorkers++;
      const pct = (doneWorkers / nw * 100) | 0;
      console.log(`  worker ${w} done (${end - start} matchups). ${doneWorkers}/${nw} workers, ${((Date.now() - t0) / 1000).toFixed(0)}s elapsed`);
      if (doneWorkers === nw) finish();
    }
  });
  worker.on('error', (e) => { console.error('worker error', e); process.exit(1); });
}

function finish() {
  // Binary layout: [u32 magic][u32 count][u32 totalBoards] then count * (u32 key, u32 win, u32 tie).
  const buf = Buffer.alloc(12 + M * 12);
  buf.writeUInt32LE(0x50464551, 0); // 'PFEQ'
  buf.writeUInt32LE(M, 4);
  buf.writeUInt32LE(TOTAL_BOARDS, 8);
  for (let i = 0; i < M; i++) {
    const o = 12 + i * 12;
    buf.writeUInt32LE(keys[i], o);
    buf.writeUInt32LE(winByKey[i], o + 4);
    buf.writeUInt32LE(tieByKey[i], o + 8);
  }
  fs.writeFileSync(OUT, buf);
  console.log(`\nwrote ${OUT} (${(buf.length / 1024 / 1024).toFixed(2)} MB, ${M} matchups) in ${((Date.now() - t0) / 1000 / 60).toFixed(1)} min`);
  process.exit(0);
}
