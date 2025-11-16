# BitVal

High-performance poker hand evaluator optimized for browser environments, using bitwise operations for rapid poker hand analysis and equity calculations.

**🌐 [Try it online - Range vs Range Evaluator](https://darraghgeo.github.io/poker-bitvaljs/)**

## Features

- **Fast hand evaluation** using bitwise operations
- **Range vs range equity calculations** with canonical key caching optimization
- **Monte Carlo simulation** for preflop and postflop scenarios
- **Exhaustive enumeration** for flop/turn scenarios (2 or fewer cards to come)
- **Progress callbacks** for long-running calculations
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
  null // progress callback (optional)
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
  }
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

### `compareRange(heroHands, villainHands, boardCards, deadCards, numberOfBoardCards, iterations, optimize, progressCallback)`

Compares two ranges of hands with optional optimization.

**Parameters:**
- `heroHands` (Array): Array of hero hand strings (e.g., `['AsAh', 'AsAd']`)
- `villainHands` (Array): Array of villain hand strings
- `boardCards` (Array): Board cards as strings (default: `[]`)
- `deadCards` (Array): Dead cards as strings (default: `[]`)
- `numberOfBoardCards` (Number): Total board cards (default: `5`)
- `iterations` (Number): Number of simulations per matchup (default: `10000`)
- `optimize` (Boolean): Use canonical key caching for performance (default: `true`). **Note:** Optimizations may result in a ±0.5% margin of error compared to unoptimized calculations.
- `progressCallback` (Function): Optional callback `(current, total, message) => {}`

**Returns:**
- `Promise<{ win, tie, lose }>`: Results object

## Performance

- **Optimized for browser environments** with efficient bitwise operations
- Canonical key caching reduces redundant evaluations (may introduce ±0.5% margin of error)
- Exhaustive enumeration for flop/turn (2 or fewer cards to come)
- Monte Carlo simulation for preflop and river scenarios

**Test performance and benchmark online:** [https://darraghgeo.github.io/poker-bitvaljs/](https://darraghgeo.github.io/poker-bitvaljs/)

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

