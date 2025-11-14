if (typeof require !== 'undefined') {
  const BitVal = require("./bitval.js");
}

class BitValDebugger {
  constructor(bitvalInstance) {
    this.bitval = bitvalInstance;
  }

  compare(hero, villain, board, deadCards = [], referenceData = {}, verbose = true) {
    if (board.length < 3) {
      throw new Error("Board must have at least 3 cards (flop)");
    }

    const results = {
      overall: null,
      turn: { tested: 0, discrepancies: [], summary: null },
      river: { tested: 0, discrepancies: [], summary: null }
    };

    if (verbose) {
      console.log("=".repeat(80));
      console.log("BITVAL DEBUGGER COMPARISON");
      console.log("=".repeat(80));
      console.log();
      console.log(`Hero: ${hero.join(' ')}`);
      console.log(`Villain: ${villain.join(' ')}`);
      console.log(`Board: ${board.join(' ')}`);
      if (deadCards.length > 0) {
        console.log(`Dead Cards: ${deadCards.join(' ')}`);
      }
      console.log();
    }

    // Test overall equity from flop
    if (referenceData.expectedOverallEquity !== undefined) {
      results.overall = this._testOverallEquity(hero, villain, board, deadCards, referenceData.expectedOverallEquity, verbose);
    }

    // Test turn cards
    if (referenceData.turn) {
      results.turn = this._testTurnCards(hero, villain, board, deadCards, referenceData.turn, verbose);
    }

    // Test river combinations
    if (referenceData.river) {
      results.river = this._testRiverCombinations(hero, villain, board, deadCards, referenceData.river, verbose);
    }

    return results;
  }

  _testOverallEquity(hero, villain, board, deadCards, expectedEquity, verbose) {
    if (verbose) {
      console.log("=".repeat(80));
      console.log("OVERALL EQUITY FROM FLOP");
      console.log("=".repeat(80));
      console.log();
    }

    const result = this.bitval.simulate(1000000, 5, hero, villain, board, deadCards);
    const actualEquity = this._calculateEquity(result);
    const difference = actualEquity - expectedEquity;

    if (verbose) {
      console.log(`Our Overall Equity: ${actualEquity.toFixed(2)}% (Expected: ${expectedEquity.toFixed(2)}%)`);
      console.log(`Difference: ${difference >= 0 ? '+' : ''}${difference.toFixed(2)}%`);
      console.log();
    }

    return {
      actual: actualEquity,
      expected: expectedEquity,
      difference: difference
    };
  }

  _testTurnCards(hero, villain, board, deadCards, turnData, verbose) {
    if (verbose) {
      console.log("=".repeat(80));
      console.log("COMPARING EACH POSSIBLE TURN CARD");
      console.log("=".repeat(80));
      console.log();
    }

    const allCards = this.bitval.ALL_HANDS;
    const usedCards = new Set([...hero, ...villain, ...board, ...deadCards]);

    let totalDiscrepancy = 0;
    let testedCards = 0;
    let maxDiscrepancy = 0;
    let maxDiscrepancyCard = '';
    const discrepancies = [];

    for (const card of allCards.sort()) {
      if (usedCards.has(card)) continue;

      const expectedEquity = turnData[card];
      if (expectedEquity === null || expectedEquity === undefined) continue;

      // Create board with turn card
      const boardWithTurn = [...board, card];

      // Simulate with exhaustive combinations for the river (1 card left)
      const result = this.bitval.simulate(1000000, 5, hero, villain, boardWithTurn, deadCards);
      const total = result.win + result.lose + result.tie;
      const actualEquity = total > 0 ? this._calculateEquity(result) : 0;

      const difference = actualEquity - expectedEquity;
      const absDifference = Math.abs(difference);

      if (absDifference > maxDiscrepancy) {
        maxDiscrepancy = absDifference;
        maxDiscrepancyCard = card;
      }

      totalDiscrepancy += absDifference;
      testedCards++;

      if (absDifference > 0.1) {
        discrepancies.push({
          card: card,
          actual: actualEquity,
          expected: expectedEquity,
          difference: difference
        });
      }

      if (verbose || absDifference > 0.1) {
        const diffStr = difference >= 0 ? `+${difference.toFixed(3)}` : difference.toFixed(3);
        const status = absDifference < 0.5 ? '✓' : absDifference < 1.0 ? '⚠' : '✗';
        console.log(`${card}: ${actualEquity.toFixed(3)}% (Expected: ${expectedEquity.toFixed(3)}%, Diff: ${diffStr}%) ${status}`);
      }
    }

    const summary = {
      tested: testedCards,
      averageDiscrepancy: testedCards > 0 ? (totalDiscrepancy / testedCards) : 0,
      maxDiscrepancy: maxDiscrepancy,
      maxDiscrepancyCard: maxDiscrepancyCard
    };

    if (verbose) {
      console.log();
      console.log("=".repeat(80));
      console.log("TURN CARDS SUMMARY");
      console.log("=".repeat(80));
      console.log(`Cards Tested: ${testedCards}`);
      console.log(`Average Discrepancy: ${summary.averageDiscrepancy.toFixed(3)}%`);
      console.log(`Max Discrepancy: ${maxDiscrepancy.toFixed(3)}% (Card: ${maxDiscrepancyCard})`);
      console.log();
    }

    return {
      tested: testedCards,
      discrepancies: discrepancies,
      summary: summary
    };
  }

  _testRiverCombinations(hero, villain, board, deadCards, riverData, verbose) {
    if (verbose) {
      console.log("=".repeat(80));
      console.log("COMPARING EACH POSSIBLE RIVER COMBINATION (TURN + RIVER)");
      console.log("=".repeat(80));
      console.log();
    }

    const allCards = this.bitval.ALL_HANDS;
    const usedCards = new Set([...hero, ...villain, ...board, ...deadCards]);
    const remainingCards = allCards.filter(card => !usedCards.has(card));

    // Generate all 2-card combinations
    const combinations = [];
    for (let i = 0; i < remainingCards.length; i++) {
      for (let j = i + 1; j < remainingCards.length; j++) {
        const comboKey = `${remainingCards[i]} ${remainingCards[j]}`;
        const altComboKey = `${remainingCards[j]} ${remainingCards[i]}`;
        combinations.push({
          key: comboKey,
          altKey: altComboKey,
          cards: [remainingCards[i], remainingCards[j]]
        });
      }
    }

    let totalDiscrepancy = 0;
    let testedCombos = 0;
    let maxDiscrepancy = 0;
    let maxDiscrepancyCombo = '';
    const discrepancies = [];

    for (const combo of combinations.sort((a, b) => a.key.localeCompare(b.key))) {
      const expectedEquity = riverData[combo.key] || riverData[combo.altKey];
      if (expectedEquity === null || expectedEquity === undefined) continue;

      // Create complete board with turn and river
      const completeBoard = [...board, ...combo.cards];
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

      if (absDifference > maxDiscrepancy) {
        maxDiscrepancy = absDifference;
        maxDiscrepancyCombo = combo.key;
      }

      totalDiscrepancy += absDifference;
      testedCombos++;

      if (absDifference > 0.1) {
        discrepancies.push({
          combo: combo.key,
          actual: actualEquity,
          expected: expectedEquity,
          difference: difference
        });
      }

      if (verbose || absDifference > 0.1) {
        const diffStr = difference >= 0 ? `+${difference.toFixed(3)}` : difference.toFixed(3);
        const status = absDifference < 0.1 ? '✓' : absDifference < 1.0 ? '⚠' : '✗';
        console.log(`${combo.key}: ${actualEquity.toFixed(3)}% (Expected: ${expectedEquity.toFixed(3)}%, Diff: ${diffStr}%) ${status}`);
      }
    }

    const summary = {
      tested: testedCombos,
      averageDiscrepancy: testedCombos > 0 ? (totalDiscrepancy / testedCombos) : 0,
      maxDiscrepancy: maxDiscrepancy,
      maxDiscrepancyCombo: maxDiscrepancyCombo
    };

    if (verbose) {
      console.log();
      console.log("=".repeat(80));
      console.log("RIVER COMBINATIONS SUMMARY");
      console.log("=".repeat(80));
      console.log(`Combinations Tested: ${testedCombos}`);
      console.log(`Average Discrepancy: ${summary.averageDiscrepancy.toFixed(3)}%`);
      console.log(`Max Discrepancy: ${maxDiscrepancy.toFixed(3)}% (Combo: ${maxDiscrepancyCombo})`);
      console.log();
    }

    return {
      tested: testedCombos,
      discrepancies: discrepancies,
      summary: summary
    };
  }

  _calculateEquity(result) {
    const total = result.win + result.lose + result.tie;
    if (total === 0) return 0;
    // Pokercruncher convention: ties divided by 2 and added to wins
    return ((result.win + result.tie / 2) / total * 100);
  }

  _formatOutput(card, actualEquity, expectedEquity, verbose) {
    if (!verbose) return;
    const difference = actualEquity - expectedEquity;
    const diffStr = difference >= 0 ? `+${difference.toFixed(3)}` : difference.toFixed(3);
    const absDifference = Math.abs(difference);
    const status = absDifference < 0.5 ? '✓' : absDifference < 1.0 ? '⚠' : '✗';
    console.log(`${card}: ${actualEquity.toFixed(3)}% (Expected: ${expectedEquity.toFixed(3)}%, Diff: ${diffStr}%) ${status}`);
  }
}

if (typeof module !== 'undefined') module.exports = BitValDebugger;

