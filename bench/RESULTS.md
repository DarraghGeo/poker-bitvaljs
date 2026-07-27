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
| `main` (v1.2.1, string key) — **baseline** | 92 | 57 | 94 | 3373 | 6681 |
| `opt/1-remove` | **67** | **45** | **72** | **2943** | **4633** |
| `opt/1-numeric-cap` | _tbd_ | | | | |
| `opt/3-worker-pool` | n/a — worker path not exercised by the single-threaded harness | | | | |
| `opt/4-number-evaluator` | _tbd_ | | | | |

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
