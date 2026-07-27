// Shared scenarios and ranges for benchmarking / correctness checks.
// Kept dependency-free so it can be required from both node and workers.

const SUITS = ['s', 'h', 'd', 'c'];
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

// All concrete combos for a rank pairing.
function combosFor(r1, r2, suited) {
  const out = [];
  if (r1 === r2) {
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) out.push(r1 + SUITS[i] + r2 + SUITS[j]);
  } else if (suited) {
    for (const s of SUITS) out.push(r1 + s + r2 + s);
  } else {
    for (const a of SUITS) for (const b of SUITS) if (a !== b) out.push(r1 + a + r2 + b);
  }
  return out;
}

// The app's "squeeze" preset: TT+, ATs+, KJs+, QJs, AQo+ (82 combos).
const SQUEEZE = [
  'ThTs', 'TdTs', 'TcTs', 'TdTh', 'TcTh', 'TcTd', 'JhJs', 'JdJs', 'JcJs', 'JdJh', 'JcJh', 'JcJd',
  'QhQs', 'QdQs', 'QcQs', 'QdQh', 'QcQh', 'QcQd', 'KhKs', 'KdKs', 'KcKs', 'KdKh', 'KcKh', 'KcKd',
  'AhAs', 'AdAs', 'AcAs', 'AdAh', 'AcAh', 'AcAd', 'AsTs', 'AhTh', 'AdTd', 'AcTc', 'AsJs', 'AhJh',
  'AdJd', 'AcJc', 'AsQs', 'AhQh', 'AdQd', 'AcQc', 'AsKs', 'AhKh', 'AdKd', 'AcKc', 'KsJs', 'KhJh',
  'KdJd', 'KcJc', 'KsQs', 'KhQh', 'KdQd', 'KcQc', 'QsJs', 'QhJh', 'QdJd', 'QcJc', 'AsQh', 'AsQd',
  'AsQc', 'AhQs', 'AhQd', 'AhQc', 'AdQs', 'AdQh', 'AdQc', 'AcQs', 'AcQh', 'AcQd', 'AsKh', 'AsKd',
  'AsKc', 'AhKs', 'AhKd', 'AhKc', 'AdKs', 'AdKh', 'AdKc', 'AcKs', 'AcKh', 'AcKd'
];

// A wide range: all pocket pairs + all broadway suited & offsuit (238 combos).
function wideRange() {
  const out = [];
  const bw = ['A', 'K', 'Q', 'J', 'T'];
  for (const r of RANKS) out.push(...combosFor(r, r, false));
  for (let i = 0; i < bw.length; i++) {
    for (let j = i + 1; j < bw.length; j++) {
      out.push(...combosFor(bw[i], bw[j], true));
      out.push(...combosFor(bw[i], bw[j], false));
    }
  }
  return out;
}

const WIDE = wideRange();

// Standard benchmark scenarios. iterations 1e9 forces exhaustive enumeration
// (2 cards to come) so results are deterministic.
// `gate: true` marks fast, deterministic, suit-critical scenarios used by the
// correctness gate (their unoptimized reference is cheap to compute).
const SCENARIOS = [
  { name: 'narrow-monotone', hero: ['AhJh'], villain: SQUEEZE, board: ['Ad', '8d', '7d'], iters: 1e9, gate: true },
  { name: 'narrow-rainbow', hero: ['AhJh'], villain: SQUEEZE, board: ['Ad', '8c', '7s'], iters: 1e9, gate: true },
  { name: 'narrow-twotone', hero: ['AhKh'], villain: SQUEEZE, board: ['Ad', '8d', '2c'], iters: 1e9, gate: true },
  { name: 'wide-238x238-flop', hero: WIDE, villain: WIDE, board: ['Ks', '9d', '2c'], iters: 1e9 },
  { name: 'preflop-mc', hero: ['AhJh'], villain: SQUEEZE, board: [], iters: 100000 },
];

module.exports = { SUITS, RANKS, combosFor, wideRange, SQUEEZE, WIDE, SCENARIOS };
