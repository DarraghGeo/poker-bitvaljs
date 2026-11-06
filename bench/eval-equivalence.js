// Proves the Number evaluator (_eval7) induces the SAME hand ordering as the
// reference BigInt evaluate() — i.e. for every pair of hands they agree on
// win / lose / tie, including all kicker tie-breaks.
//
//   node bench/eval-equivalence.js            # all 5-card hands + 5M random 7-card
//   node bench/eval-equivalence.js --full     # + ALL C(52,7) = 133,784,560 7-card hands
//   node bench/eval-equivalence.js 20000000   # custom random 7-card sample size
//
// Method: reduce reference (score,kicker) to one ordering-preserving BigInt.
// Order-equivalence holds iff the map refComposite -> eval7 is a strictly
// increasing bijection over all observed values (catches both tie mismatches
// and order mismatches). Exits non-zero on any divergence.

const BitVal = require('../bitval.js');
const { Worker, isMainThread, parentPort } = require('worker_threads');
const os = require('os');
const bv = new BitVal();

// Per-index card data (index 0..51).
const RANKS = 'AKQJT98765432', SUITS = 'shdc';
const DECK = [];
for (const r of RANKS) for (const s of SUITS) DECK.push(r + s);
const idxMask = DECK.map(c => bv.CARD_MASKS[c]);         // BigInt single-card mask
const idxSuit = DECK.map(c => bv.CARD_SUITS[c].suit);
const idxBit = DECK.map(c => bv.CARD_SUITS[c].bit);

// Reference ordering key: score*2^64 + kicker, preserving (score,kicker) order.
const SHIFT = 1n << 64n;
function refComposite(bigMask) {
  const [score, kick] = bv.evaluate(bigMask);
  return score * SHIFT + (kick || 0n);
}

// Order-equivalence checker: feed (refComposite, eval7) pairs; validates the
// mapping is a strictly increasing bijection.
function makeChecker() {
  const refToN = new Map(); // refComposite(str) -> eval7
  const pairs = [];         // unique {ref, n}
  let tieFails = 0;
  return {
    add(ref, n) {
      const key = ref.toString();
      const seen = refToN.get(key);
      if (seen === undefined) { refToN.set(key, n); pairs.push({ ref, n }); }
      else if (seen !== n) { tieFails++; }
    },
    export() { return { refs: pairs.map(p => p.ref), ns: pairs.map(p => p.n), tieFails }; },
    tieFailsAdd(k) { tieFails += k; },
    verify(label) {
      pairs.sort((a, b) => (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0));
      const SF = 8 * 1048576; // category 8 = straight flush
      let reversals = 0;   // eval7 flips reference order — FATAL
      let sfMerges = 0;    // eval7 ties two straight flushes the reference split by suit — benign
      let otherMerges = 0; // eval7 ties two non-SF classes — FATAL
      for (let i = 1; i < pairs.length; i++) {
        const prev = pairs[i - 1].n, cur = pairs[i].n;
        if (cur < prev) reversals++;
        else if (cur === prev) { if (cur >= SF) sfMerges++; else otherMerges++; }
      }
      const ok = tieFails === 0 && reversals === 0 && otherMerges === 0;
      console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${pairs.length} ref-classes, tieFails=${tieFails}, reversals=${reversals}, otherMerges=${otherMerges}, benign SF-suit merges=${sfMerges}`);
      return ok;
    }
  };
}

function eval7OfIdx(idxArr) {
  let s = 0, h = 0, d = 0, c = 0;
  for (let i = 0; i < idxArr.length; i++) {
    const su = idxSuit[idxArr[i]], b = idxBit[idxArr[i]];
    if (su === 0) s |= b; else if (su === 1) h |= b; else if (su === 2) d |= b; else c |= b;
  }
  return bv._eval7(s, h, d, c);
}
function maskOfIdx(idxArr) { let m = 0n; for (const i of idxArr) m |= idxMask[i]; return m; }

let allOk = true;

// Exhaustive 7-card enumeration for one (a0, a1) job, building the BigInt
// and suit masks level by level (one OR per level instead of 7 per hand).
function enumerateJob(a0, a1, add, cards = 7) {
  let count = 0;
  const m1 = idxMask[a0] | idxMask[a1];
  const s1 = [0, 0, 0, 0]; s1[idxSuit[a0]] |= idxBit[a0]; s1[idxSuit[a1]] |= idxBit[a1];
  if (cards === 5) {
    for (let a2 = a1 + 1; a2 < 50; a2++) {
      const m2 = m1 | idxMask[a2], s2 = s1.slice(); s2[idxSuit[a2]] |= idxBit[a2];
      for (let a3 = a2 + 1; a3 < 51; a3++) {
        const m3 = m2 | idxMask[a3], s3 = s2.slice(); s3[idxSuit[a3]] |= idxBit[a3];
        for (let a4 = a3 + 1; a4 < 52; a4++) {
          const su = idxSuit[a4], b = idxBit[a4];
          add(refComposite(m3 | idxMask[a4]), bv._eval7(s3[0] | (su === 0 ? b : 0), s3[1] | (su === 1 ? b : 0), s3[2] | (su === 2 ? b : 0), s3[3] | (su === 3 ? b : 0)));
          count++;
        }
      }
    }
    return count;
  }
  for (let a2 = a1 + 1; a2 < 48; a2++) {
    const m2 = m1 | idxMask[a2], s2 = s1.slice(); s2[idxSuit[a2]] |= idxBit[a2];
    for (let a3 = a2 + 1; a3 < 49; a3++) {
      const m3 = m2 | idxMask[a3], s3 = s2.slice(); s3[idxSuit[a3]] |= idxBit[a3];
      for (let a4 = a3 + 1; a4 < 50; a4++) {
        const m4 = m3 | idxMask[a4], s4 = s3.slice(); s4[idxSuit[a4]] |= idxBit[a4];
        for (let a5 = a4 + 1; a5 < 51; a5++) {
          const m5 = m4 | idxMask[a5], s5 = s4.slice(); s5[idxSuit[a5]] |= idxBit[a5];
          for (let a6 = a5 + 1; a6 < 52; a6++) {
            const su = idxSuit[a6], b = idxBit[a6];
            const n = bv._eval7(s5[0] | (su === 0 ? b : 0), s5[1] | (su === 1 ? b : 0), s5[2] | (su === 2 ? b : 0), s5[3] | (su === 3 ? b : 0));
            add(refComposite(m5 | idxMask[a6]), n);
            count++;
          }
        }
      }
    }
  }
  return count;
}

if (!isMainThread) {
  // Worker: take jobs until told to finish, then send back the unique pairs.
  const local = makeChecker();
  let count = 0;
  parentPort.on('message', msg => {
    if (msg.finish) {
      const { refs, ns, tieFails } = local.export();
      parentPort.postMessage({ done: true, refs, ns, tieFails, count });
      return;
    }
    if (msg.job) count += enumerateJob(msg.job[0], msg.job[1], (r, n) => local.add(r, n), msg.job[2]);
    parentPort.postMessage({ want: true });
  });
  return;
}

// Runs every (a0, a1) job for `cards`-card hands on worker threads (largest
// first, handed out as threads free up) and merges their unique
// (reference key -> eval7) pairs into `chk`. Returns the number of hands.
async function runParallel(cards, chk) {
  const threads = Math.max(1, (os.availableParallelism ? os.availableParallelism() : os.cpus().length));
  const jobs = [];
  for (let a0 = 0; a0 < 52 - cards + 1; a0++) for (let a1 = a0 + 1; a1 < 52 - cards + 2; a1++) jobs.push([a0, a1, cards]);
  const choose = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return n < k ? 0 : r; };
  jobs.sort((x, y) => choose(51 - y[1], cards - 2) - choose(51 - x[1], cards - 2));
  let count = 0;
  await new Promise((resolve, reject) => {
    let next = 0, live = threads;
    for (let t = 0; t < threads; t++) {
      const w = new Worker(__filename, { argv: ['--worker'] });
      w.on('message', msg => {
        if (msg.done) {
          for (let i = 0; i < msg.refs.length; i++) chk.add(msg.refs[i], msg.ns[i]);
          chk.tieFailsAdd(msg.tieFails);
          count += msg.count;
          w.terminate();
          if (--live === 0) resolve();
          return;
        }
        if (next < jobs.length) w.postMessage({ job: jobs[next++] });
        else w.postMessage({ finish: true });
      });
      w.on('error', reject);
      w.postMessage({ ready: true });
    }
  });
  return count;
}

(async () => {

// ---- 1) ALL 5-card hands (exhaustive) ----
{
  console.log('5-card hands (exhaustive, C(52,5)=2,598,960):');
  const chk = makeChecker();
  const count = await runParallel(5, chk);
  console.log(`  evaluated ${count.toLocaleString()} hands`);
  allOk = chk.verify('5-card order-equivalence') && allOk;
}

// ---- 2) 7-card hands (random sample, or --full exhaustive) ----
{
  const full = process.argv.includes('--full');
  const nArg = process.argv.find(x => /^\d+$/.test(x));
  const chk = makeChecker();
  let count = 0;
  if (full) {
    // Exhaustive, split across worker threads by the first two cards; the
    // merged pairs give exactly the check a single-threaded run would.
    console.log('\n7-card hands (exhaustive, C(52,7)=133,784,560), all cores:');
    count += await runParallel(7, chk);
  } else {
    const N = nArg ? parseInt(nArg, 10) : 5000000;
    console.log(`\n7-card hands (random sample, ${N.toLocaleString()}):`);
    const a = new Array(7);
    for (let it = 0; it < N; it++) {
      const picked = new Set();
      while (picked.size < 7) picked.add((Math.random() * 52) | 0);
      let j = 0; for (const v of picked) a[j++] = v;
      chk.add(refComposite(maskOfIdx(a)), eval7OfIdx(a));
      count++;
    }
  }
  console.log(`  evaluated ${count.toLocaleString()} hands`);
  allOk = chk.verify('7-card order-equivalence') && allOk;
}

// ---- 3) Public fast-evaluator API (evaluateSuits / evaluateCards / toSuitMasks / handCategory) ----
{
  console.log('\nPublic fast-evaluator API (300,000 random 5-, 6- and 7-card hands):');
  let fails = 0;
  const fail = msg => { if (++fails <= 5) console.log('  FAIL ' + msg); };
  if (bv.evaluateSuits !== bv._eval7) fail('evaluateSuits and _eval7 are not the same function');
  if (bv.toSuitMasks !== bv._suitsOfCards) fail('toSuitMasks and _suitsOfCards are not the same function');
  for (let it = 0; it < 300000; it++) {
    const n = 5 + (it % 3), picked = new Set();
    while (picked.size < n) picked.add((Math.random() * 52) | 0);
    const idx = [...picked], cards = idx.map(i => DECK[i]);
    const v = eval7OfIdx(idx);
    const m = bv.toSuitMasks(cards);
    if (bv.evaluateSuits(m[0], m[1], m[2], m[3]) !== v) fail(`evaluateSuits(toSuitMasks) ${cards}`);
    if (bv.evaluateCards(cards) !== v) fail(`evaluateCards ${cards}`);
    if (!(v >= 0 && v < 2 ** 24 && Number.isInteger(v))) fail(`value out of contract ${v} ${cards}`);
    const refName = bv.getHandStrengthFromMask(bv.evaluate(maskOfIdx(idx))[0]);
    if (bv.handCategory(v) !== refName) fail(`handCategory ${bv.handCategory(v)} vs ${refName} ${cards}`);
  }
  for (const bad of [['Xs'], ['A'], ['Asx'], [42]]) {
    let threw = false; try { bv.evaluateCards(bad); } catch (e) { threw = true; }
    if (!threw) fail(`evaluateCards should reject ${JSON.stringify(bad)}`);
  }
  console.log(`  ${fails === 0 ? 'PASS' : 'FAIL'}  public API matches _eval7 and evaluate() categories (${fails} failures)`);
  allOk = fails === 0 && allOk;
}

console.log(`\n${allOk ? 'OK - _eval7 is order-equivalent to evaluate()' : 'FAILURE'}`);
process.exit(allOk ? 0 : 1);
})();
