# BitVal

High-performance poker hand evaluator optimized for browser environments, using bitwise operations for rapid poker hand analysis and equity calculations.

**🌐 [Try it online - Range vs Range Evaluator](https://darraghgeo.github.io/poker-bitvaljs/)**

## Features

- **Fast hand evaluation** (`evaluateSuits` / `evaluateCards`, ~20–100 ns per
  hand) using four 13-bit suit lanes and plain 32-bit integers, no BigInt
- **Exact range vs range equity on the flop and turn**: every hand is
  evaluated once per runout and all matchups are counted at once — identical
  to brute force, no approximation
- **Exact, instant preflop equity** from a precomputed table that ships with
  the package (`loadPreflopTable`)
- **Monte Carlo** for everything else with 3+ cards to come (preflop with dead
  cards, 1–2 card boards, or no table loaded), with confidence-interval
  early-stop and an opt-in [shared-board mode](#shared-board-monte-carlo-opt-in)
  that is typically 25–100× faster for range vs range
- **[Combo weights](#combo-weights)**: `'KsKc:0.5'` or `{ hand, weight }`
  range entries (PioSolver / GTO+ style)
- **Web Workers** for Monte Carlo and large exact queries, falling back to the
  main thread when workers aren't available
- **Progress callbacks** with configurable update intervals
- **Browser and Node.js compatible**

## Installation

```bash
npm install poker-bitvaljs
```

## Usage

### Basic Hand Evaluation

```javascript
const BitVal = require('poker-bitvaljs');
const bitval = new BitVal();

// Evaluate a hand (5-7 cards, e.g. 2 hole cards + 5 board cards)
const a = bitval.evaluateCards(['As', 'Ah', 'Kd', 'Qs', 'Js', 'Ts', '2c']);
const b = bitval.evaluateCards(['Kc', 'Kh', 'Ks', 'Qs', 'Js', 'Ts', '9s']);

// Higher value = stronger hand; equal values tie
a > b;                    // false: a is an ace-high straight, b a straight flush
bitval.handCategory(a);   // 'Straight'
bitval.handCategory(b);   // 'Straight Flush'
```

See [Fast evaluation](#fast-evaluation) for the fastest form and the value format.

### Range vs Range Comparison

```javascript
const fs = require('fs');
const BitVal = require('poker-bitvaljs');
const bitval = new BitVal();

// Optional but recommended: exact, instant preflop equity (table ships with the package)
bitval.loadPreflopTable(fs.readFileSync(require.resolve('poker-bitvaljs/bench/preflop-table.bin')));

const heroHands = ['AsAh', 'AsAd', 'AsAc', 'AhAd', 'AhAc', 'AdAc']; // all AA combos
const villainHands = ['KsKh', 'KsKd', 'KsKc', 'KhKd', 'KhKc', 'KdKc']; // all KK combos

const result = await bitval.compareRange(
  heroHands,
  villainHands,
  [],    // board cards (empty for preflop)
  [],    // dead cards
  5,     // number of board cards
  10000, // Monte Carlo iterations (only used when the answer isn't exact)
  true,  // optimize (default; exact on the flop/turn and much faster)
  null,  // progress callback (optional)
  100,   // progress interval (optional, default: 100)
  true   // use Web Workers (optional, default: true)
);

// result is { win, tie, lose }: matchup outcomes counted over all valid pairs
const equity = (result.win + result.tie / 2) / (result.win + result.tie + result.lose) * 100;
```

Ranges can also carry per-combo weights, e.g. `['KsKc:0.5', 'KhKd']` — see
[Combo weights](#combo-weights).

### In the Browser

```html
<script src="node_modules/poker-bitvaljs/bitval.js"></script>
<script>
  const bitval = new BitVal(); // also available as window.BitVal
  fetch('node_modules/poker-bitvaljs/bench/preflop-table.bin')
    .then(r => r.arrayBuffer())
    .then(buf => bitval.loadPreflopTable(buf));
</script>
```

`bitval-worker.js` is loaded from next to `bitval.js` for Web Workers; if you
bundle or move the files, set `bitval.workerUrl`. Workers need an `http(s)`
origin (see [Testing Locally](#testing-locally)).

### With Progress Callback

```javascript
const result = await bitval.compareRange(
  heroHands,
  villainHands,
  [],
  [],
  5,
  100000,
  true,
  (current, total, message) => {
    console.log(`${Math.round((current/total)*100)}% - ${message}`);
  },
  100, // Update progress every 100 matchups
  true // Use Web Workers for parallelization
);
```

### With Web Workers Disabled

```javascript
// Disable Web Workers (useful for debugging or when workers aren't supported)
const result = await bitval.compareRange(
  heroHands,
  villainHands,
  [],
  [],
  5,
  10000,
  true,
  null,
  100,
  false // Disable Web Workers, use sequential execution
);
```

### With Board Cards (Postflop)

With 3 or 4 board cards every runout is enumerated, so the result is exact and
`iterations` is ignored.

```javascript
// Compare ranges on a flop
const boardCards = ['As', 'Ks', 'Qs'];
const result = await bitval.compareRange(
  heroHands,
  villainHands,
  boardCards,
  [],
  5,
  10000,
  true
);
```

## API

### `new BitVal()`

Creates a new BitVal instance.

### Fast evaluation

`evaluateSuits` is the evaluator the library itself uses (~20 ns per hand). It
takes the hand as four 13-bit rank masks, one per suit, so you can build the
hole-card masks once and OR in each board:

```javascript
const [s, h, d, c] = bitval.toSuitMasks(['As', 'Kd']);        // hole cards, once
const [bs, bh, bd, bc] = bitval.toSuitMasks(['Qs', 'Js', 'Ts', '2c', '7h']);
const value = bitval.evaluateSuits(s | bs, h | bh, d | bd, c | bc);
bitval.handCategory(value);  // 'Straight'
```

- **`evaluateSuits(s, h, d, c)`**: masks in the order spades, hearts,
  diamonds, clubs; bit 0 = deuce … bit 12 = ace. For 5–7 distinct cards.
- **`evaluateCards(cards)`**: the same value from card strings (~100 ns).
- **`toSuitMasks(cards)`**: card strings → `[s, h, d, c]`.
- **`handCategory(value)`**: `'High Card'`, `'Pair'`, `'Two Pair'`, `'Trips'`,
  `'Straight'`, `'Flush'`, `'Full House'`, `'Quads'` or `'Straight Flush'`.
  `BitVal.HAND_CATEGORIES` lists them by index.

The value is an integer in `[0, 2^24)`: higher beats lower and equal values
tie. `value >>> 20` is the category index (0 high card … 8 straight flush), and
the lower 20 bits rank hands within a category. This format is stable across
versions. Hands are ordered exactly as `evaluate()` orders them.

`_eval7` (used by some integrations before this was public) is the same
function as `evaluateSuits` and keeps working.

| Method (Node, per 7-card hand) | Time |
|---|--:|
| `evaluateSuits` on prebuilt masks | ~21 ns |
| `evaluateCards` | ~85–110 ns |
| `toSuitMasks` + `evaluateSuits` | ~130 ns |
| `evaluate` on a prebuilt BigInt mask (legacy) | ~800 ns |
| `getBitMasked` + `evaluate` (legacy) | ~1,200 ns |

### `evaluate(handMask)`

The original BigInt API, kept for compatibility: it returns BigInt
`[score, kickers]` for a mask from `getBitMasked`. Nothing in the library
uses it any more; prefer `evaluateSuits` / `evaluateCards`, which order hands
identically and are much faster.

**Parameters:**
- `handMask` (BigInt): Bitmask representing 5-7 cards

**Returns:**
- `[evaluation, kickers]` (Array): Evaluation score and kicker bits

### `getBitMasked(cards)`

Converts an array of card strings to a BigInt bitmask.

**Parameters:**
- `cards` (Array): Array of card strings (e.g., `['As', 'Kh', 'Qd']`)

**Returns:**
- `BigInt`: Bitmask representing the cards

### `simulate(iterations, numberOfBoardCards, hero, villain, board, deadCards)`

Simulates a single hand vs hand matchup. With 2 or fewer cards to come every
runout is enumerated (exact; `iterations` is ignored); otherwise it samples.

```javascript
const r = bitval.simulate(100000, 5, ['As', 'Kd'], ['Qh', 'Qc'], [], []);
```

**Parameters:**
- `iterations` (Number): Number of Monte Carlo samples
- `numberOfBoardCards` (Number): Total board cards (default: 5)
- `hero` (Array): Hero's hole cards as card strings (e.g. `['As', 'Kd']`)
- `villain` (Array): Villain's hole cards as card strings
- `board` (Array): Board cards as card strings (default: `[]`)
- `deadCards` (Array): Dead cards as card strings (default: `[]`)

**Returns:**
- `{ win, tie, lose, ... }`: Results object (it also has legacy hand-strength
  fields such as `"Flush"`, which are always `0`)

### `compareRange(heroHands, villainHands, boardCards, deadCards, numberOfBoardCards, iterations, optimize, progressCallback, progressInterval, useWorkers, mcTargetPct)`

Compares two ranges of hands.

**Parameters:**
- `heroHands` (Array): Hero hands. Each entry is a hand string (`'AsAh'`), or a weighted hand (`'AsAh:0.5'` or `{ hand: 'AsAh', weight: 0.5 }`) — see [Combo weights](#combo-weights)
- `villainHands` (Array): Villain hands, same formats
- `boardCards` (Array): Board cards as strings (default: `[]`)
- `deadCards` (Array): Dead cards as strings (default: `[]`)
- `numberOfBoardCards` (Number): Total board cards (default: `5`)
- `iterations` (Number): Monte Carlo samples per matchup, or the maximum number of boards with `mcSharedBoards` (default: `10000`). Ignored on the flop/turn (exhaustive) and preflop-table paths, which are exact.
- `optimize` (Boolean): Use the optimized path (default: `true`). On the flop/turn this is **exact** (byte-identical to `optimize: false`), just much faster.
- `progressCallback` (Function): Optional callback `(current, total, message) => {}` (default: `null`)
- `progressInterval` (Number): Update progress callback every N matchups (default: `100`)
- `useWorkers` (Boolean): Use Web Workers (default: `true`) for Monte Carlo and for large exact flop/turn queries; small exact queries stay on the main thread.
- `mcTargetPct` (Number): Monte Carlo early-stop target — stop sampling once the 95% confidence-interval half-width is within this many equity percentage points (default: `0.3`): per matchup by default, or for the aggregate equity with `mcSharedBoards`. Pass `0` to force the full `iterations`. Only affects Monte Carlo cases.

**Returns:**
- `Promise<{ win, tie, lose }>`: Results object. With combo weights these are weighted sums and can be fractional.

### Instance options

- `bitval.mcSharedBoards` (Boolean, default `false`): use
  [shared-board Monte Carlo](#shared-board-monte-carlo-opt-in).
- `bitval.workerUrl` (String): where to load `bitval-worker.js` from (defaults
  to next to `bitval.js`).
- `bitval.terminateWorkerPool()`: stop the Web Workers this instance created
  (they are kept between calls for speed).

### `loadPreflopTable(buffer)`

Loads the precomputed exact preflop equity table and enables the preflop fast
path in `compareRange` (empty board, no dead cards). Accepts an `ArrayBuffer`
(browser) or Node `Buffer`. The table (~1 MB) ships with the npm package at
`poker-bitvaljs/bench/preflop-table.bin`; regenerate it with `npm run gen:preflop`.

```javascript
// Browser (serve the file from wherever you host the package)
const buf = await (await fetch('./node_modules/poker-bitvaljs/bench/preflop-table.bin')).arrayBuffer();
bitval.loadPreflopTable(buf);

// Node
const fs = require('fs');
bitval.loadPreflopTable(fs.readFileSync(require.resolve('poker-bitvaljs/bench/preflop-table.bin')));
```

Without a table loaded, preflop falls back to Monte Carlo — nothing else changes.

### Combo weights

Any range entry can carry a weight — how often that combo is in the range
(e.g. KsKc played 50% of the time). Use the `'hand:weight'` form that solvers
such as PioSolver and GTO+ export, or an object:

```javascript
const hero = ['KsKc:0.5', 'KhKd', { hand: 'AsKs', weight: 0.25 }];
const villain = ['QsQh:0.75', 'JcJd'];
const r = await bitval.compareRange(hero, villain, ['2c', '7d', '9h']);
const equity = (r.win + r.tie / 2) / (r.win + r.tie + r.lose);
```

- A plain `'KhKd'` has weight `1`; weights are any finite number `>= 0`, and
  `0` removes the hand. Listing a hand twice adds its weights.
- Each valid hero/villain pair counts `heroWeight × villainWeight` times, so
  `win`/`tie`/`lose` are weighted sums (fractional when weights are). Equity
  is computed from them exactly as before.
- Works on every path: exact flop/turn, the preflop table, both Monte Carlo
  modes, Web Workers and `optimize: false`. Unweighted calls are unchanged.

### Shared-board Monte Carlo (opt-in)

Monte Carlo is used whenever 3 or more board cards are still to come and the
preflop table can't answer: preflop with dead cards, preflop with no table
loaded, or a partial board of 1–2 cards. By default each matchup samples its
own boards.
Setting `mcSharedBoards` samples boards once and evaluates every hand on each
board, counting all valid pairs at once — typically 25–100× faster for
range-vs-range (e.g. squeeze vs wide on a `Ks` board: ~79 s → ~80 ms), with
no canonical-grouping approximation:

```javascript
const bitval = new BitVal();
bitval.mcSharedBoards = true;
const r = await bitval.compareRange(heroRange, villainRange, [], ['2c'], 5, 100000);
```

In this mode `iterations` is the maximum number of **boards** sampled (shared by
all matchups), `mcTargetPct` applies to the aggregate equity, and the returned
`win`/`tie`/`lose` are summed over valid pairs × boards. Equity percentages are
directly comparable to the default mode; raw counts are not.

## Changes in 1.9.0

- The fast evaluator is public: [`evaluateSuits`, `evaluateCards`,
  `toSuitMasks`, `handCategory`](#fast-evaluation). `_eval7` still works (same
  function). `evaluate()` is unchanged and documented as the legacy BigInt API.

## Changes in 1.8.0

- [Combo weights](#combo-weights): `'AsKs:0.5'` or `{ hand, weight }` range
  entries, on every calculation path. Unweighted results are unchanged.

## Changes in 1.7.0

- Opt-in shared-board Monte Carlo (`mcSharedBoards`, above).
- Large exact flop/turn queries are split across Web Workers.
- Faster exact flop/turn kernel (radix sort), faster preflop table load and
  lookup (~4.5× for full range vs full range). Results are unchanged.

## Changes in 1.6.0

- **Flop/turn correctness fix:** exhaustive `compareRange` no longer counts
  runouts that deal a player's own hole card. Flop/turn equities from earlier
  versions were slightly off (typically 0–3 percentage points) and will change.
- Large range-vs-range flop/turn is ~10–100× faster; `simulate()` is ~45×
  faster; the preflop table ships with the package.

## Performance

- **No BigInt in the hot path** — cards are four 13-bit suit lanes evaluated with
  plain 32-bit integer ops. ~28–70× faster than the previous BigInt engine.
- **Flop/turn: exact and fast.** Each unique concrete hand is evaluated once per
  runout; wide range-vs-range is resolved by counting. No ±0.5% approximation.
- **Preflop: exact table lookup** (with `loadPreflopTable`) instead of Monte
  Carlo — effectively instant.
- **Monte Carlo** (3+ cards to come without a table answer: preflop with dead
  cards, 1–2 card boards, or no table) uses confidence-interval early-stop and
  Web Workers; `mcSharedBoards` makes range vs range typically 25–100× faster.
- **Web Workers** also split large exact flop/turn queries across CPU cores;
  small queries stay on the main thread, where they're faster.

Reproduce the benchmarks with `node bench/pre-vs-post.js` and `npm run bench`;
correctness with `npm test` (and `npm run test:full` for the exhaustive proofs).

**Test performance and benchmark online:** [https://darraghgeo.github.io/poker-bitvaljs/](https://darraghgeo.github.io/poker-bitvaljs/)

### Performance Tips

- Call `loadPreflopTable` once at startup for exact, instant preflop equity.
- Keep `optimize: true` (default) — on the flop/turn it is exact and much faster.
- Lower `mcTargetPct` (or set `0`) for higher-precision Monte Carlo; raise it for
  faster, looser preflop-with-dead-cards estimates.
- Adjust `progressInterval` to balance UI responsiveness vs. performance.
- For Monte Carlo cases (preflop with dead cards, or a 1–2 card board), set
  `bitval.mcSharedBoards = true` (see above).
- Web Workers load `bitval-worker.js` from next to `bitval.js` (resolved from
  the `<script>` tag's URL). If you bundle or relocate the files, set
  `bitval.workerUrl = '/path/to/bitval-worker.js'`. If workers can't start,
  `compareRange` falls back to the main thread.

## Testing Locally

When testing locally, Web Workers require a proper HTTP origin. If you open `index.html` directly from the file system (`file://` protocol), workers will fail with a `SecurityError`.

**Solution: Use a local web server**

```bash
# Python 3
python3 -m http.server 8000

# Node.js (if you have npx)
npx http-server -p 8000

# PHP (if installed)
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser. The application will automatically fall back to sequential execution if workers are unavailable.

## License

MIT

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

