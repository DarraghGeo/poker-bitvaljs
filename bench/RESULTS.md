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
| v1.2.1 (string key) — **baseline** | 92 | 57 | 94 | 3373 | 6681 |
| **shipped: cache removed + worker pool** | **67** | **45** | **71** | **2957** | **4625** |

Shipped on `main` = `opt/1-remove` (drop per-eval cache) + `opt/3-worker-pool`
(reuse workers). Single-threaded numbers reflect `opt/1-remove`; the worker pool
only affects the multi-threaded browser path (see spawn-cost proxy below).

### Evaluated but NOT shipped

- `opt/1-numeric-cap` (numeric key + memory cap) — **discarded**: superseded by
  removing the cache entirely, so there is no Map left to cap.
- `opt/4-number-evaluator` — **spike only**, kept on its branch. Number evaluator
  is order-equivalent to the BigInt one (0 mismatches / 300k pairs) and ~3.1×
  faster on core eval; full integration deferred (see `bench/number-eval.js`).

## Worker pool (opt/3) — spawn-cost proxy

`node bench/worker-spawn.js` (node worker_threads standing in for browser
Worker + importScripts):

- cold spawn + load bitval.js: **~16.5 ms/worker**
- warm round-trip to a pooled worker: **~0.04 ms/worker**

So the pool removes ~15–17 ms **per worker, per compareRange call** on this
machine (browser/mobile typically higher). Meaningful on short interactive
queries; negligible on multi-second runs. **Needs in-browser validation** — the
worker execution path can't run under node.

## Correctness gate (optimize vs unoptimized, ±0.5pp)

Baseline: all PASS (monotone Δ=0.00, rainbow Δ=0.01, twotone Δ=0.48).
Every branch must keep this PASS.
