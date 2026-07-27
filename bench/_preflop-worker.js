// Worker for gen-preflop-table.js. Computes EXACT preflop (win, tie) counts for
// a batch of hero-vs-villain matchups by enumerating all C(48,5) boards.
// Card index c (0..51) = rankIndex*4 + suitIndex; rankIndex 0..12 = 2..A.
const { parentPort, workerData } = require('worker_threads');
const BitVal = require('../bitval.js');
const bv = new BitVal();
const eval7 = bv._eval7.bind(bv);

const SUIT = new Int32Array(52), BIT = new Int32Array(52);
for (let c = 0; c < 52; c++) { SUIT[c] = c & 3; BIT[c] = 1 << (c >> 2); }

function equity(h1, h2, v1, v2) {
  let hs0 = 0, hs1 = 0, hs2 = 0, hs3 = 0, vs0 = 0, vs1 = 0, vs2 = 0, vs3 = 0;
  for (const c of [h1, h2]) { const s = SUIT[c], b = BIT[c]; if (s === 0) hs0 |= b; else if (s === 1) hs1 |= b; else if (s === 2) hs2 |= b; else hs3 |= b; }
  for (const c of [v1, v2]) { const s = SUIT[c], b = BIT[c]; if (s === 0) vs0 |= b; else if (s === 1) vs1 |= b; else if (s === 2) vs2 |= b; else vs3 |= b; }
  const dead = [h1, h2, v1, v2];
  const rs = new Int32Array(48), rb = new Int32Array(48);
  let n = 0;
  for (let c = 0; c < 52; c++) { if (c === h1 || c === h2 || c === v1 || c === v2) continue; rs[n] = SUIT[c]; rb[n] = BIT[c]; n++; }
  let win = 0, tie = 0;
  for (let a = 0; a < n - 4; a++) {
    const a0 = rs[a] === 0 ? rb[a] : 0, a1 = rs[a] === 1 ? rb[a] : 0, a2 = rs[a] === 2 ? rb[a] : 0, a3 = rs[a] === 3 ? rb[a] : 0;
    for (let b = a + 1; b < n - 3; b++) {
      const b0 = a0 | (rs[b] === 0 ? rb[b] : 0), b1 = a1 | (rs[b] === 1 ? rb[b] : 0), b2 = a2 | (rs[b] === 2 ? rb[b] : 0), b3 = a3 | (rs[b] === 3 ? rb[b] : 0);
      for (let c = b + 1; c < n - 2; c++) {
        const c0 = b0 | (rs[c] === 0 ? rb[c] : 0), c1 = b1 | (rs[c] === 1 ? rb[c] : 0), c2 = b2 | (rs[c] === 2 ? rb[c] : 0), c3 = b3 | (rs[c] === 3 ? rb[c] : 0);
        for (let d = c + 1; d < n - 1; d++) {
          const d0 = c0 | (rs[d] === 0 ? rb[d] : 0), d1 = c1 | (rs[d] === 1 ? rb[d] : 0), d2 = c2 | (rs[d] === 2 ? rb[d] : 0), d3 = c3 | (rs[d] === 3 ? rb[d] : 0);
          for (let e = d + 1; e < n; e++) {
            const s0 = d0 | (rs[e] === 0 ? rb[e] : 0), s1 = d1 | (rs[e] === 1 ? rb[e] : 0), s2 = d2 | (rs[e] === 2 ? rb[e] : 0), s3 = d3 | (rs[e] === 3 ? rb[e] : 0);
            const hE = eval7(hs0 | s0, hs1 | s1, hs2 | s2, hs3 | s3);
            const vE = eval7(vs0 | s0, vs1 | s1, vs2 | s2, vs3 | s3);
            if (hE > vE) win++; else if (hE === vE) tie++;
          }
        }
      }
    }
  }
  return [win, tie];
}

// workerData.matchups: Int32Array, 4 card indices per matchup (h1,h2,v1,v2).
const m = workerData.matchups, count = m.length / 4;
const res = new Uint32Array(count * 2);
for (let i = 0; i < count; i++) {
  const [w, t] = equity(m[i * 4], m[i * 4 + 1], m[i * 4 + 2], m[i * 4 + 3]);
  res[i * 2] = w; res[i * 2 + 1] = t;
  if ((i & 1023) === 0) parentPort.postMessage({ progress: i });
}
parentPort.postMessage({ done: true, res }, [res.buffer]);
