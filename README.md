# BitVal

High-performance poker hand evaluator optimized for browser environments, using bitwise operations for rapid poker hand analysis and equity calculations.

**🌐 [Try it online - Range vs Range Evaluator](https://darraghgeo.github.io/poker-bitvaljs/)**

## Features

- **Fast hand evaluation** using four 13-bit suit lanes and plain 32-bit integers
  (no BigInt in the hot path) — ~28–70× faster than the previous BigInt engine
- **Exact range vs range equity** on the flop and turn via evaluate-once with
  counting (byte-identical to brute force, no approximation)
- **Exact, instant preflop** via an optional precomputed equity table
  (`loadPreflopTable`) — replaces Monte Carlo entirely for preflop
- **Monte Carlo** with confidence-interval early-stop for the remaining sampled
  case (preflop with dead cards)
- **Web Workers** for the Monte Carlo path
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

// Evaluate a hand (7 cards: 2 hole cards + 5 board cards)
const handMask = bitval.getBitMasked(['As', 'Ah', 'Ks', 'Qs', 'Js', 'Ts', '9s']);
const [evaluation, kickers] = bitval.evaluate(handMask);

// Returns [evaluation_score, kickers]
// Higher evaluation score = stronger hand
```

### Range vs Range Comparison

```javascript
const BitVal = require('poker-bitvaljs');
const bitval = new BitVal();

// Compare two ranges
const heroHands = ['AsAh', 'AsAd', 'AsAc', 'AhAd', 'AhAc', 'AdAc']; // All AA combinations
const villainHands = ['KsKh', 'KsKd', 'KsKc', 'KhKd', 'KhKc', 'KdKc']; // All KK combinations

const result = await bitval.compareRange(
  heroHands,
  villainHands,
  [], // board cards (empty for preflop)
  [], // dead cards
  5,  // number of board cards
  10000, // iterations
  true, // optimize (use canonical caching)
  null, // progress callback (optional)
  100, // progress interval (optional, default: 100)
  true // use workers (optional, default: true)
);

// Result: { win: 8120, tie: 30, lose: 1850 }
// Calculate equity: (win + tie/2) / (win + tie + lose) * 100
```

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

### `evaluate(handMask)`

Evaluates a poker hand represented as a BigInt bitmask.

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

Simulates a single hand vs hand matchup.

**Parameters:**
- `iterations` (Number): Number of simulations
- `numberOfBoardCards` (Number): Total board cards (default: 5)
- `hero` (Array): Hero's hole cards as bitmask
- `villain` (Array): Villain's hole cards as bitmask
- `board` (Array): Board cards as bitmask
- `deadCards` (Array): Dead cards as bitmask

**Returns:**
- `{ win, tie, lose }`: Results object

### `compareRange(heroHands, villainHands, boardCards, deadCards, numberOfBoardCards, iterations, optimize, progressCallback, progressInterval, useWorkers, mcTargetPct)`

Compares two ranges of hands.

**Parameters:**
- `heroHands` (Array): Array of hero hand strings (e.g., `['AsAh', 'AsAd']`)
- `villainHands` (Array): Array of villain hand strings
- `boardCards` (Array): Board cards as strings (default: `[]`)
- `deadCards` (Array): Dead cards as strings (default: `[]`)
- `numberOfBoardCards` (Number): Total board cards (default: `5`)
- `iterations` (Number): Monte Carlo samples per matchup (default: `10000`). Ignored on the flop/turn (exhaustive) and preflop-table paths, which are exact.
- `optimize` (Boolean): Use the optimized path (default: `true`). On the flop/turn this is **exact** (byte-identical to `optimize: false`), just much faster.
- `progressCallback` (Function): Optional callback `(current, total, message) => {}` (default: `null`)
- `progressInterval` (Number): Update progress callback every N matchups (default: `100`)
- `useWorkers` (Boolean): Use Web Workers for the Monte Carlo path (default: `true`). The exact flop/turn path runs on the main thread.
- `mcTargetPct` (Number): Monte Carlo early-stop target — stop sampling a matchup once its 95% confidence-interval half-width is within this many equity percentage points (default: `0.3`). Pass `0` to force the full `iterations`. Only affects the Monte Carlo (preflop) path.

**Returns:**
- `Promise<{ win, tie, lose }>`: Results object

### `loadPreflopTable(buffer)`

Loads the precomputed exact preflop equity table and enables the preflop fast
path in `compareRange` (empty board, no dead cards). Accepts an `ArrayBuffer`
(browser) or Node `Buffer`. Generate the table with `npm run gen:preflop`.

```javascript
// Browser
const buf = await (await fetch('./bench/preflop-table.bin')).arrayBuffer();
bitval.loadPreflopTable(buf);

// Node
const fs = require('fs');
bitval.loadPreflopTable(fs.readFileSync('bench/preflop-table.bin'));
```

Without a table loaded, preflop falls back to Monte Carlo — nothing else changes.

## Performance

- **No BigInt in the hot path** — cards are four 13-bit suit lanes evaluated with
  plain 32-bit integer ops. ~28–70× faster than the previous BigInt engine.
- **Flop/turn: exact and fast.** Each unique concrete hand is evaluated once per
  runout; wide range-vs-range is resolved by counting. No ±0.5% approximation.
- **Preflop: exact table lookup** (with `loadPreflopTable`) instead of Monte
  Carlo — effectively instant.
- **Monte Carlo** (only preflop with dead cards) uses confidence-interval
  early-stop and Web Workers.

Reproduce the benchmarks with `node bench/pre-vs-post.js` and `npm run bench`;
correctness with `npm test` (and `npm run test:full` for the exhaustive proofs).

**Test performance and benchmark online:** [https://darraghgeo.github.io/poker-bitvaljs/](https://darraghgeo.github.io/poker-bitvaljs/)

### Performance Tips

- Call `loadPreflopTable` once at startup for exact, instant preflop equity.
- Keep `optimize: true` (default) — on the flop/turn it is exact and much faster.
- Lower `mcTargetPct` (or set `0`) for higher-precision Monte Carlo; raise it for
  faster, looser preflop-with-dead-cards estimates.
- Adjust `progressInterval` to balance UI responsiveness vs. performance.

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

