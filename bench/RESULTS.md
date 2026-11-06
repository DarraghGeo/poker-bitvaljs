# Optimization benchmark results

## Headline: shipped (v1.5.0) vs the pre-optimization BigInt engine

`node bench/pre-vs-post.js` — shipped `bitval.js` vs `bench/bitval-reference.js`
(the original BigInt evaluator), single-threaded, best-of-3, optimize=true:

| scenario | pre (BigInt) | post (shipped) | speedup |
|---|--:|--:|--:|
| narrow flop (monotone) | 68 ms | 1.6 ms | **43×** |
| narrow flop (rainbow) | 45 ms | 1.6 ms | **28×** |
| narrow flop (two-tone) | 72 ms | 1.6 ms | **45×** |
| wide 238×238 flop | 2964 ms | 43 ms | **69×** |
| preflop (single vs range) | 4649 ms | 0.2 ms | **~29,500×** |

Flop/turn also went from a ±0.5% approximation to **exact**; preflop went from
Monte Carlo to an **exact table lookup**.

## 1.13.0 — byCard / byRunout rows

The per-hand kernels keep each runout's per-hand counts (already computed
before being summed): a per-runout buffer (`cur`) is flushed into a 64-runout
runout-major block, transposed into the hand-major output as each block fills
(no full-size temporary), and added into card-major per-card totals.

Node, median, compareRangeHandsSync: turn 300 x 300: plain 2.5 ms, +byCard
4.5, +byRunout 3.5, both 4.1 (48 per-card calls: ~15 ms). Flop 470 x 470:
plain ~48-53 ms, +byCard ~60, +byRunout ~72-74, both ~80-85 (1,176
per-runout calls: 0.5-0.6 s). Full 1176 x 1176 flop: plain 66, both 181 ms.
Chromium (4 cores) flop 470 x 470: main thread plain 57 / byCard 78 /
byRunout 86 / both 104 ms; workers both ~90 ms. The remaining byRunout cost is
mostly writing ~13 MB of fresh Float64 rows per side (page faults + one
transpose); byCard's is the per-card additions.
`bench/by-card.js` (13,965 checks): rows == optimize:false reference exactly,
each row == a separate call on board + card/runout, sums == totals (flop
byCard 2x), NaN placement, blocked hands 0/0/0, sync == async; Chromium:
workers == sync, broken-worker fallback == sync.

## 1.12.0 — fewer evaluations, class-level ordering, preflop per-pattern keys (+ compareRangeHandsSync)

- **Rank-class evaluation reuse** (`_evalRunout`, all four kernels): the 5
  community cards have at most one suit with >= 3 cards; a hand that can't
  reach 5 of it scores the same as every hand with its two ranks (the
  non-flush branch of the evaluator depends only on rank multiplicities), so
  one evaluation per rank class is reused. Full range on a flop: 99
  (rainbow) to 283 (two-tone) evaluations per runout instead of 1,176.
- **Class-level ordering**: radix-sort one item per class plus one per
  flush-capable hand, then expand classes into hands (the sweep only needs
  equal values adjacent).
- **Preflop**: the minimizing suit-permutation set depends only on the hero
  hand's suit pattern, so each villain's minimized key is computed once per
  pattern and each matchup is one array load + the table lookup.

Node, 1.11.0 → 1.12.0 (best-of): flop rainbow full vs full compareRange
63.5 → 40.5 ms, compareRangeHands 83.1 → 61.4 ms; two-tone 63.9 → 42.8 /
81.5 → 64.0; monotone 65.0 → 48.3 / 82.0 → 66.6; squeeze vs wide 12.4 → 8.7 /
16.6 → 12.2; 1 vs squeeze 2.1 → 1.3 / 2.1 → 1.4; turn full vs full 3.3 → 2.3 /
3.9 → 2.9; preflop table full vs full 38.8 → 27.9 / 52.7 → 41.8; shared-board
MC 50k boards 593 → 459 / 797 → 609. Results byte-identical to 1.11.0 for
unweighted and dyadic weights (non-dyadic: equal to ~1e-15 relative, as the
order of additions within tie groups changed); 320 randomized identity
checks. Chromium, 4 workers: worker split still pays from ~250k
(unique hands x runouts), threshold kept at 300k; full vs full flop 47 → 25 ms
(compareRange) and 68 → 42 ms (compareRangeHands) with workers.

## 1.11.0 — compareRangeHands (per-hand results)

Per-hand counting has its own kernels (`_runExhaustiveHands`, and a direct
pair version for small fields) so `compareRange` is untouched. The counting
sweep keeps running counts for both sides, so each villain hand's result comes
from the same pass. Node, best-of, compareRange → compareRangeHands: flop
1 vs 82 2.2 → 2.2 ms; squeeze vs wide 13.1 → 16.6 ms; full vs full 64.5 →
89.7 ms; turn full vs full 3.1 → 3.8 ms; preflop table full vs full 40.8 →
51.8 ms; shared-board MC 50k boards 604 → 725 ms. Chromium: per-hand results
identical with and without workers; full vs full flop ~47 ms on 4 warm workers.
`bench/hands.js` (293 checks): optimized rows == optimize:false exactly, each
row == the hand alone, totals == compareRange, blocked hands 0/0/0, MC rows
within 0.2pp of exact.

Also includes the weighted-residue fix: the counting sweep snaps per-hero
values below half the smallest villain weight to 0 (previously a fully
blocked weighted spot could return ±1e-12 counts).

## 1.9.0 — public fast evaluator

`evaluateSuits` is the evaluator's body and `_eval7` is assigned the same
function object, so there is no wrapper call. Node, 300k random 7-card hands,
best of 7: 1.8.0 `_eval7` 20.9–21.1 ns; 1.9.0 `evaluateSuits` 20.6–20.8 ns,
`_eval7` 20.6–21.4 ns; `evaluateCards` 85–111 ns; `toSuitMasks` +
`evaluateSuits` ~128 ns; legacy `evaluate` ~800 ns (prebuilt BigInt mask),
~1,230 ns with `getBitMasked`. `npm run bench` unchanged.

## 1.8.0 — combo weights

No speed changes intended: the kernel's per-hand multiplicities became
weights (Float64), unweighted inputs take the same paths and return
byte-identical results to 1.7.0, and timings are within noise of 1.7.0
(40-run best-of: narrow ~1.8 ms, wide-238x238 ~13.6 ms, full x full flop
~68 ms). `bench/weights.js` checks weighted exactness (optimized ==
unoptimized == pair-by-pair reference, dyadic weights), equivalences,
weighted preflop table lookups, input validation and (`--mc`) weighted Monte
Carlo against the exact table.

## opt/7 (1.7.0) — radix kernel, preflop hash, kernel workers, shared-board MC

Node, single-threaded, best-of-3 (same instance; table loaded where relevant):

| scenario | 1.6.0 (ms) | 1.7.0 (ms) | speedup |
|---|--:|--:|--:|
| narrow-monotone | 4.8 | 2.9 | 1.7× |
| narrow-rainbow | 4.8 | 3.0 | 1.6× |
| narrow-twotone | 4.5 | 2.9 | 1.5× |
| wide-238×238 flop | 18.2 | 13.8 | 1.3× |
| full × full flop | 122 | 69 | 1.8× |
| full × full turn | 5.8 | 3.6 | 1.6× |
| preflop table, full × full | 293 | 60 | **4.9×** |
| `loadPreflopTable` | 11.1 (46 cold) | 2.9 | 3.9× |

Opt-in shared-board Monte Carlo (`bitval.mcSharedBoards = true`), preflop with
a dead card, 100k iterations cap, default `mcTargetPct`:

| scenario | default MC | shared-board | speedup |
|---|--:|--:|--:|
| squeeze 82 × wide 238 | 5196 ms (60.94%) | 120 ms (60.70%) | **43×** |
| wide 238 × wide 238 | 12317 ms (50.00%) | 101 ms (50.00%) | **122×** |

Chromium, 4 cores, warm worker pool: exact full × full flop 73 ms main thread →
~50 ms on workers; shared-board MC wide × wide 121 ms → 53 ms on workers.

- **Kernel**: 3-pass LSD radix sort of live hands (replaces a Float64 key sort
  per runout); hands holding a runout card are no longer evaluated. Runouts
  are built straight from card indices (no BigInt).
- **Preflop table**: open-addressing hash in typed arrays instead of `Map`;
  canonical keys only try the suit permutations that minimize the hero part.
  Full × full totals are identical to 1.6.0.
- **Workers**: new `type: 'kernel'` worker message; exact flop/turn above
  `U × runouts ≥ 300k` is split across the pool; shared-board MC hands out
  board batches dynamically and stops on the aggregate CI.
- **Shared-board MC** (opt-in): sample boards once, run the exact kernel on
  them (each hand evaluated once per board, all valid pairs counted).
  `bench/mc-shared-board.js`: mean |error| 0.06–0.07pp vs the exact table
  over 19 range pairs, and vs per-pair MC with dead cards.

## opt/6 — setup, exact kernel, simulate(), workers (vs 1.5.2)

Best-of-3, single-threaded Node (each run includes `new BitVal()`):

| scenario | 1.5.2 (ms) | opt/6 (ms) | speedup |
|---|--:|--:|--:|
| narrow-monotone | 2.9 | 2.9 | 1.0× |
| narrow-rainbow | 2.9 | 3.0 | 1.0× |
| narrow-twotone | 2.8 | 2.8 | 1.0× |
| wide-238×238 flop | 74.9 | 23.4 | **3.2×** |
| preflop-mc | 178.6 | 159.2 | 1.1× |
| full × full flop (1176×1176) | 1497 | 121 | **12×** |
| full × full turn | 758 | 5.3 | **144×** |
| `simulate()` 100k preflop | 474 | 10.8 | **44×** |

Browser (Chromium, 4 workers, 60×N preflop with a dead card, MC): workers
~1290 → ~1080 ms; sequential ~4450 → ~3840 ms.

- **Setup**: the unused canonical-key bookkeeping (`hCanon`/`vCanon`/
  `validCounts`) is gone; the per-pair `validMatchups` list is built lazily and
  only by the paths that need it, with Number card bitsets instead of BigInt.
  The exhaustive path builds its work straight from the hand strings.
- **Exact kernel**: hero+villain hands are deduplicated into one union
  (evaluated once per runout); large fields are resolved by one sort of the
  union + a linear sweep over equal-value groups with per-card running counts
  (replaces per-hero binary searches + scanning ~95 conflicting villains).
  Duplicate hands in a range are now weighted exactly like the unoptimized
  path (1.5.2's counting path silently deduplicated them).
- **`_eval7`**: flush / high-card / pair / trips kickers via 8K lookup tables.
- **`simulate()`** runs on the Number engine (was BigInt `evaluate()` + a fresh
  BigInt deck per iteration).
- **Monte Carlo**: canonical keys computed once per hand (not per pair);
  synchronous loop with local RNG state when there's no progress callback,
  shared with the worker; workers pull small chunks dynamically instead of one
  static batch each (early-stop makes matchup cost uneven).
- **Workers**: `bitval-worker.js` is resolved next to `bitval.js` (override
  with `bitval.workerUrl`); if workers can't start or crash, the work runs on
  the main thread instead of failing.
- **Package**: `bench/preflop-table.bin` now ships in the npm package so the
  exact preflop path is usable without a 27-minute generation step.

**Correctness fix (changes flop/turn results):** `compareRange` on the flop/turn
used to enumerate every runout from the cards not on the board or dead —
including runouts that deal one of the players' own hole cards (e.g. 1176
runouts instead of 990 for one hand vs one hand on a flop). Those impossible
deals are now skipped in every exhaustive path, so flop/turn `compareRange`
agrees with `simulate()` and with a pair-by-pair reference. Equities shift
accordingly (e.g. narrow-twotone 78.30% → 81.01%, AsKs vs QhQd on 2c7d9h
21.8% → 23.9%). `bench/engine-differential.js` now checks against the reference
engine's `simulate()` (which always dealt correctly) rather than its
`compareRange()` (which shared the bug).

Correctness: `npm test` + `npm run test:full` pass (eval equivalence over all
133.8M 7-card hands; differential 4806 exact checks; exact-optimize 2000 + 250
overlap/duplicate scenarios, 0 mismatches); new `bench/simulate-equivalence.js`
(1500 exhaustive scenarios identical to the reference engine, MC within 0.5pp
of the exact table).

---

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

## opt/5 #5 — exact preflop equity table

Preflop (5 cards to come) is the only genuinely large sampling space and was the
dominant single-query cost. It is now a table lookup instead of Monte Carlo.

- `bench/gen-preflop-table.js` (+ `_preflop-worker.js`) generates, in parallel,
  the exact (win, tie) counts over all C(48,5)=1,712,304 boards for each of the
  **93,769** suit-isomorphic canonical matchups. ~27 min on 7 workers, one-time.
- Output `bench/preflop-table.bin` — **1.07 MB** (canonical key + win + tie, u32
  each). Compresses to well under 1 MB; lazy-loadable on mobile.
- Runtime: `bv.loadPreflopTable(buffer)` enables a preflop fast path in
  `compareRange` (empty board, no dead cards) that canonicalizes each matchup
  and sums the table's exact counts. No table loaded ⇒ unchanged Monte Carlo.

Measured:

| squeeze-vs-wide preflop | equity | time |
|---|--:|--:|
| exact table | 60.699% | **4.3 ms** |
| Monte Carlo (100k) | 60.864% (sampled) | 5433 ms |

→ **~1277× faster and exact.** Validation (`bench/preflop-validate.js`,
`npm run test:preflop`): 500 single-vs-single + 80 range-vs-range vs independent
full enumeration, **0 mismatches**; all 93,769 keys resolvable.

**Caveat:** exact only for preflop with no dead cards (table is over all C(48,5)
runouts). Dead-card preflop falls back to the (faster) live engine.

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
