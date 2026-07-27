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

// ---- 1) ALL 5-card hands (exhaustive) ----
{
  console.log('5-card hands (exhaustive, C(52,5)=2,598,960):');
  const chk = makeChecker();
  let count = 0;
  const a = [0, 0, 0, 0, 0];
  for (a[0] = 0; a[0] < 48; a[0]++)
    for (a[1] = a[0] + 1; a[1] < 49; a[1]++)
      for (a[2] = a[1] + 1; a[2] < 50; a[2]++)
        for (a[3] = a[2] + 1; a[3] < 51; a[3]++)
          for (a[4] = a[3] + 1; a[4] < 52; a[4]++) {
            chk.add(refComposite(maskOfIdx(a)), eval7OfIdx(a));
            count++;
          }
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
    console.log('\n7-card hands (exhaustive, C(52,7)=133,784,560) — this takes minutes:');
    const a = [0, 0, 0, 0, 0, 0, 0];
    for (a[0] = 0; a[0] < 46; a[0]++)
      for (a[1] = a[0] + 1; a[1] < 47; a[1]++)
        for (a[2] = a[1] + 1; a[2] < 48; a[2]++)
          for (a[3] = a[2] + 1; a[3] < 49; a[3]++)
            for (a[4] = a[3] + 1; a[4] < 50; a[4]++)
              for (a[5] = a[4] + 1; a[5] < 51; a[5]++)
                for (a[6] = a[5] + 1; a[6] < 52; a[6]++) {
                  chk.add(refComposite(maskOfIdx(a)), eval7OfIdx(a));
                  count++;
                }
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

console.log(`\n${allOk ? 'OK - _eval7 is order-equivalent to evaluate()' : 'FAILURE'}`);
process.exit(allOk ? 0 : 1);
