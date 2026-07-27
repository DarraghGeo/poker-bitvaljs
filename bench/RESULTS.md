# Optimization benchmark results

Reproduce on any branch:

```bash
npm run bench:correct   # correctness gate (must stay PASS)
npm run bench           # timing table
```

Single-threaded (`useWorkers=false`), best-of-3, Node/V8. Absolute numbers are
machine-specific; compare **within a column across branches**. Mobile Safari/JSC
will amplify BigInt-related differences.

## Timing (ms, lower is better) — optimized `compareRange`

| branch | narrow-monotone | narrow-rainbow | narrow-twotone | wide-238×238 | preflop-mc |
|---|---|---|---|---|---|
| v1.2.1 (string key) — baseline | 92 | 57 | 94 | 3373 | 6681 |
| cache removed + worker pool (v1.3.0) | 67 | 45 | 71 | 2957 | 4625 |
| opt/4 Number evaluator (v1.4.0) | 2.4 | ~2 | ~2 | 108 | 255 (200k) |
| **opt/5-7 (tables + typed arrays + exact counting)** | **1.8** | **1.6** | **1.5** | **50** | **151** |

## opt/5-7 (this branch) — A/B vs the v1.4.0 baseline

`node bench/ab.js` (current bitval.js vs frozen `bench/bitval-baseline.js`):

| scenario | speedup vs 1.4.0 |
|---|--:|
| narrow-monotone | 1.48× |
| narrow-rainbow | 1.00× (canonical grouping already collapses this board) |
| narrow-twotone | 1.43× |
| wide-238×238 | **2.34×** |
| preflop-mc | 1.68× |

- **#1** 8K lookup tables (popcount + straight) in `_eval7`.
- **#2** typed-array data layout (flat combo suits, packed deal pool).
- **#3c** exhaustive path is now **exact evaluate-once**: each unique concrete
  hand evaluated once per runout; large range-vs-range counted via a sorted
  villain array + binary search minus card-conflict correction. This makes
  `optimize=true` **byte-identical to unoptimized** on flop/turn — the ±0.5%
  canonical-folding approximation is *removed* for exhaustive (it now applies
  only to preflop Monte Carlo).

Correctness: `bench/exact-optimize.js` — 0 mismatches over 600 randomized
range-vs-range scenarios (76M comparisons); differential 4806 checks, 0 fails;
evaluator equivalence over all 133.8M 7-card hands unchanged.

Single-threaded, best-of-3. The Number evaluator replaces the BigInt hand
evaluator and dealing in the hot loop (cards are four 13-bit suit rank masks;
`_eval7` does the work with no BigInt, no allocation).

### opt/4 measured speedup vs the BigInt engine (in-process A/B)

| scenario | Number engine | BigInt engine | speedup |
|---|--:|--:|--:|
| narrow-monotone (flop, exhaustive) | 2.4 ms | 65.2 ms | **26.6×** |
| wide-238×238 (flop, exhaustive) | 107.9 ms | 2863.2 ms | **26.5×** |
| preflop-mc (200k Monte Carlo) | 512.7 ms | 9034.7 ms | **17.6×** |

Far above the earlier ~3× spike estimate: removing BigInt from the *entire*
hot loop (board union + evaluation) eliminates per-op allocation/GC, not just
arithmetic cost.

### opt/4 correctness (see below for detail)

- `_eval7` proven **order-equivalent** to the BigInt `evaluate()` over **all**
  2,598,960 five-card hands and **all** 133,784,560 seven-card hands
  (0 reversals, 0 non-SF merges; the only differences are 30 straight-flush
  classes the old engine ranked by suit — poker-incorrect and unreachable in
  head-to-head play).
- End-to-end: **123,666,416** hand comparisons across 4,812 randomized
  exhaustive scenarios (flops/turns, dead cards, wide ranges, both optimize
  modes) — **0 mismatches** vs the reference BigInt engine.
- Worker path validated in-browser: byte-identical to the sequential path.

### Also evaluated but NOT shipped

- `opt/1-numeric-cap` — **discarded**: superseded by removing the cache entirely.

## Worker pool (opt/3) — spawn-cost proxy

`node bench/worker-spawn.js` (node worker_threads standing in for browser
Worker + importScripts):

- cold spawn + load bitval.js: **~16.5 ms/worker**
- warm round-trip to a pooled worker: **~0.04 ms/worker**

So the pool removes ~15–17 ms **per worker, per compareRange call** on this
machine (browser/mobile typically higher). Meaningful on short interactive
queries; negligible on multi-second runs. **Needs in-browser validation** — the
worker execution path can't run under node.

## Reproducing the opt/4 proofs

```bash
npm test                 # fast: correctness + determinism + 1M-hand equivalence
npm run test:differential # 4,800+ exhaustive scenarios, exact vs BigInt engine (~2.5 min)
npm run test:full         # ALL 133,784,560 7-card hands + differential (several min)
```

- `bench/eval-equivalence.js` — proves `_eval7` orders hands identically to the
  BigInt `evaluate()` (oracle = the untouched `evaluate()` in the same file).
- `bench/engine-differential.js` — proves the integrated engine equals the
  frozen pre-opt/4 engine (`bench/bitval-reference.js`) on real `compareRange`
  results.

## Correctness gate (optimize vs unoptimized, ±0.5pp)

Baseline: all PASS (monotone Δ=0.00, rainbow Δ=0.01, twotone Δ=0.48).
Every branch must keep this PASS.
