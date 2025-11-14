if (typeof require !== 'undefined') {
  const BitVal = require("../bitval.js");
}

class BitValDebugger {
  constructor(bitvalInstance) {
    this.bitval = bitvalInstance;
  }

  _getLineColor(status, roundedAbsDiff, tolerance) {
    const RESET = '\x1b[0m';
    const GREEN = '\x1b[32m';  // Medium green
    const BRIGHT_RED = '\x1b[91m';  // Bright red
    const YELLOW = '\x1b[33m';  // Yellow for warning

    if (status === '✓') {
      return GREEN;
    } else if (status === '✗') {
      return BRIGHT_RED;
    } else if (status === '⚠') {
      return YELLOW;
    }
    return '';
  }

  _normalizeFlopKey(cards) {
    // Sort cards alphabetically and join with space
    return [...cards].sort().join(' ');
  }

  _shouldDrillDown(actual, expected, tolerance, comprehensive) {
    if (comprehensive) return true;
    const diff = Math.abs(actual - expected);
    const roundedDiff = Math.round(diff * 100) / 100;
    return roundedDiff > tolerance;
  }

  compare(hero, villain, board = [], deadCards = [], referenceData = {}, verbose = true, comprehensive = false, toleranceFlop = 0, toleranceNoBoard = 1.5) {
    const results = {
      overall: null,
      flops: {},
      summary: {
        flopsTested: 0,
        flopsFailed: 0,
        turnsTested: 0,
        turnsFailed: 0,
        riversTested: 0,
        riversFailed: 0
      }
    };

    // Header removed - all outputs are single line
    // Extract test description if provided (for run_tests.js context)
    let testDescription = '';
    if (referenceData.testDescription) {
      testDescription = `${referenceData.testDescription} - `;
      delete referenceData.testDescription; // Remove so it doesn't interfere with flop detection
    }

    // Level 0: Overall Equity (pre-flop)
    const overallEquity = referenceData.overallEquity;
    if (overallEquity !== undefined && overallEquity !== null) {
      const tolerance = toleranceNoBoard;
      const result = this.bitval.simulate(1000000, 5, hero, villain, [], deadCards);
      const actualEquity = this._calculateEquity(result);
      const difference = actualEquity - overallEquity;
      const absDifference = Math.abs(difference);
      const roundedAbsDiff = Math.round(absDifference * 100) / 100;
      const status = roundedAbsDiff <= tolerance ? '✓' : roundedAbsDiff <= tolerance * 2 ? '⚠' : '✗';
      const lineColor = this._getLineColor(status, roundedAbsDiff, tolerance);

      // Always show overall equity (single line) - this is the base level
      const RESET = '\x1b[0m';
      console.log(`${lineColor}${testDescription}${actualEquity.toFixed(2)}% (Expected: ${overallEquity.toFixed(2)}%, Diff: ${difference >= 0 ? '+' : ''}${difference.toFixed(2)}%, Tol: ${tolerance.toFixed(2)}%)${RESET}`);

      results.overall = {
        actual: actualEquity,
        expected: overallEquity,
        difference: difference
      };

      // Level 1: Test flops only if overall equity fails or comprehensive mode
      const shouldTestFlops = comprehensive || this._shouldDrillDown(actualEquity, overallEquity, tolerance, comprehensive);
      
      // Check if referenceData has flop structure (keys are flop strings)
      const hasFlopStructure = Object.keys(referenceData).length > 0 && 
        Object.values(referenceData).some(v => Array.isArray(v) && v.length >= 1 && typeof v[0] === 'number');
      
      if (shouldTestFlops && hasFlopStructure) {
        
        for (const [flopKey, flopData] of Object.entries(referenceData)) {
          // Skip if not an array or doesn't match flop structure
          if (!Array.isArray(flopData) || flopData.length < 1 || typeof flopData[0] !== 'number') continue;
          
          const [expectedFlopEquity, turnData] = flopData;
          const flopCards = flopKey.split(' ');
          
          const flopResult = this._testFlop(hero, villain, flopCards, deadCards, expectedFlopEquity, toleranceFlop, verbose, comprehensive);
          results.flops[flopKey] = flopResult;
          results.summary.flopsTested++;
          if (flopResult.failed) {
            results.summary.flopsFailed++;
          }

          // Level 2: Test turns only if flop fails or comprehensive mode
          const shouldTestTurns = comprehensive || flopResult.failed;
          
          if (shouldTestTurns && turnData && typeof turnData === 'object' && Object.keys(turnData).length > 0) {
            for (const [turnCard, turnCardData] of Object.entries(turnData)) {
              if (!Array.isArray(turnCardData) || turnCardData.length < 1) continue;
              
              const [expectedTurnEquity, riverData] = turnCardData;
              
              const turnResult = this._testTurn(hero, villain, flopCards, turnCard, deadCards, expectedTurnEquity, toleranceFlop, verbose, comprehensive, flopKey);
              if (!flopResult.turns) flopResult.turns = {};
              flopResult.turns[turnCard] = turnResult;
              results.summary.turnsTested++;
              if (turnResult.failed) {
                results.summary.turnsFailed++;
              }

              // Level 3: Test rivers only if turn fails or comprehensive mode
              const shouldTestRivers = comprehensive || turnResult.failed;
              
              if (shouldTestRivers && riverData && typeof riverData === 'object' && Object.keys(riverData).length > 0) {
                for (const [riverCard, riverEquity] of Object.entries(riverData)) {
                  if (!Array.isArray(riverEquity) || riverEquity.length < 1) continue;
                  
                  const [expectedRiverEquity] = riverEquity;
                  
                  const riverResult = this._testRiver(hero, villain, flopCards, turnCard, riverCard, deadCards, expectedRiverEquity, toleranceFlop, verbose, flopKey, turnCard);
                  if (!turnResult.rivers) turnResult.rivers = {};
                  turnResult.rivers[riverCard] = riverResult;
                  results.summary.riversTested++;
                  if (riverResult.failed) {
                    results.summary.riversFailed++;
                  }
                }
              }
            }
          }
        }
      }
    } else {
      // No overall equity specified, just calculate and display
      const result = this.bitval.simulate(1000000, 5, hero, villain, board, deadCards);
      const actualEquity = this._calculateEquity(result);
      
      if (verbose) {
        console.log(`${actualEquity.toFixed(2)}%`);
      }
      
      results.overall = {
        actual: actualEquity,
        expected: null,
        difference: null
      };
    }

    // Summary removed - only show individual test results

    return results;
  }

  _testFlop(hero, villain, flopCards, deadCards, expectedEquity, tolerance, verbose, comprehensive) {
    const result = this.bitval.simulate(1000000, 5, hero, villain, flopCards, deadCards);
    const actualEquity = this._calculateEquity(result);
    const difference = actualEquity - expectedEquity;
    const absDifference = Math.abs(difference);
    const roundedAbsDiff = Math.round(absDifference * 100) / 100;
    const status = roundedAbsDiff <= tolerance ? '✓' : roundedAbsDiff <= tolerance * 2 ? '⚠' : '✗';
    const lineColor = this._getLineColor(status, roundedAbsDiff, tolerance);
    const failed = roundedAbsDiff > tolerance;

    if (verbose || failed) {
      const RESET = '\x1b[0m';
      const flopKey = this._normalizeFlopKey(flopCards);
      console.log(`${lineColor}  Flop: ${flopKey} - ${actualEquity.toFixed(2)}% (Expected: ${expectedEquity.toFixed(2)}%, Diff: ${difference >= 0 ? '+' : ''}${difference.toFixed(2)}%, Tol: ${tolerance.toFixed(2)}%)${RESET}`);
    }

    return {
      actual: actualEquity,
      expected: expectedEquity,
      difference: difference,
      failed: failed,
      turns: {}
    };
  }

  _testTurn(hero, villain, flopCards, turnCard, deadCards, expectedEquity, tolerance, verbose, comprehensive, flopKey) {
    const boardWithTurn = [...flopCards, turnCard];
    const result = this.bitval.simulate(1000000, 5, hero, villain, boardWithTurn, deadCards);
    const actualEquity = this._calculateEquity(result);
    const difference = actualEquity - expectedEquity;
    const absDifference = Math.abs(difference);
    const roundedAbsDiff = Math.round(absDifference * 100) / 100;
    const status = roundedAbsDiff <= tolerance ? '✓' : roundedAbsDiff <= tolerance * 2 ? '⚠' : '✗';
    const lineColor = this._getLineColor(status, roundedAbsDiff, tolerance);
    const failed = roundedAbsDiff > tolerance;

    if (verbose || failed) {
      const RESET = '\x1b[0m';
      console.log(`${lineColor}    Turn: ${turnCard} - ${actualEquity.toFixed(2)}% (Expected: ${expectedEquity.toFixed(2)}%, Diff: ${difference >= 0 ? '+' : ''}${difference.toFixed(2)}%, Tol: ${tolerance.toFixed(2)}%)${RESET}`);
    }

    return {
      actual: actualEquity,
      expected: expectedEquity,
      difference: difference,
      failed: failed,
      rivers: {}
    };
  }

  _testRiver(hero, villain, flopCards, turnCard, riverCard, deadCards, expectedEquity, tolerance, verbose, flopKey, turnCardKey) {
    const completeBoard = [...flopCards, turnCard, riverCard];
    const completeBoardMask = this.bitval.getBitMasked(completeBoard);
    const heroMask = this.bitval.getBitMasked(hero);
    const villainMask = this.bitval.getBitMasked(villain);

    // Evaluate directly (board is complete)
    const heroFullHand = heroMask | completeBoardMask;
    const villainFullHand = villainMask | completeBoardMask;
    const heroEval = this.bitval.evaluate(heroFullHand);
    const villainEval = this.bitval.evaluate(villainFullHand);

    // Determine winner
    let actualEquity;
    if (heroEval > villainEval) {
      actualEquity = 100.0;
    } else if (heroEval < villainEval) {
      actualEquity = 0.0;
    } else {
      actualEquity = 50.0; // Tie
    }

    const difference = actualEquity - expectedEquity;
    const absDifference = Math.abs(difference);
    const roundedAbsDiff = Math.round(absDifference * 100) / 100;
    const status = roundedAbsDiff <= tolerance ? '✓' : roundedAbsDiff <= tolerance * 2 ? '⚠' : '✗';
    const lineColor = this._getLineColor(status, roundedAbsDiff, tolerance);
    const failed = roundedAbsDiff > tolerance;

    if (verbose || failed) {
      const RESET = '\x1b[0m';
      console.log(`${lineColor}      River: ${riverCard} - ${actualEquity.toFixed(2)}% (Expected: ${expectedEquity.toFixed(2)}%, Diff: ${difference >= 0 ? '+' : ''}${difference.toFixed(2)}%, Tol: ${tolerance.toFixed(2)}%)${RESET}`);
      
      // Show bitmasks when test fails
      if (failed) {
        const heroHandStr = `[${[...hero, ...completeBoard].join(' ')}]`;
        const villainHandStr = `[${[...villain, ...completeBoard].join(' ')}]`;
        const heroEvalStr = this._formatBitmask(heroEval);
        const villainEvalStr = this._formatBitmask(villainEval);
        
        // Align bitmasks by padding the hand strings to the same length
        const maxHandLen = Math.max(heroHandStr.length, villainHandStr.length);
        const paddedHeroHand = heroHandStr.padEnd(maxHandLen);
        const paddedVillainHand = villainHandStr.padEnd(maxHandLen);
        
        console.log(`\x1b[37m${paddedHeroHand} ${heroEvalStr}\x1b[0m`);
        console.log(`\x1b[37m${paddedVillainHand} ${villainEvalStr}\x1b[0m`);
      }
    }

    return {
      actual: actualEquity,
      expected: expectedEquity,
      difference: difference,
      failed: failed
    };
  }

  /**
   * Format bitmask with spaces every 4 bits for readability
   * @param {BigInt|Array} bitmask - The bitmask to format (may be array [eval, tiebreaker] or BigInt)
   * @returns {string} - Formatted bitmask string with spaces every 4 bits, padded to 64 bits
   */
  _formatBitmask(bitmask) {
    // Handle array return from evaluate() [eval, tiebreaker]
    const evalValue = Array.isArray(bitmask) ? bitmask[0] : bitmask;
    
    // Convert to binary and pad to 64 bits for full display
    const binary = evalValue.toString(2);
    const padded = binary.padStart(64, '0');
    
    // Split into groups of 4 and join with spaces
    return padded.match(/.{1,4}/g).join(' ');
  }

  _calculateEquity(result) {
    const total = result.win + result.lose + result.tie;
    if (total === 0) return 0;
    // Pokercruncher convention: ties divided by 2 and added to wins
    return ((result.win + result.tie / 2) / total * 100);
  }
}

if (typeof module !== 'undefined') module.exports = BitValDebugger;
