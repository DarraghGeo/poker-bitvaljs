const BitVal = require('./bitval.js');
const { performance } = require('perf_hooks');

class OptimizeTester {
  constructor() {
    this.bitval = new BitVal();
    this.seedRandom();
    this.startupTests = [
      { hero: ['As', '2s'], villain: ['8h', '9c'], expectedEquity: 57.76 },
      { hero: ['As', '2s'], villain: ['Kh', '9c'], expectedEquity: 61.17 },
      { hero: ['As', 'Ks'], villain: ['5d', '6d'], expectedEquity: 60.38 },
      { hero: ['As', 'Ks'], villain: ['6c', '6d'], expectedEquity: 47.88 },
      { hero: ['As', 'Ah'], villain: ['Kc', 'Kd'], expectedEquity: 81.97, enumerateRange: true }
    ];
    this.iterations = 100000;
    this.tolerance = 0.5;
  }

  seedRandom() {
    const seed = Date.now() + Math.floor(Math.random() * 1000000);
    this.randomSeed = (seed % 2147483647) || 1;
  }

  calculateEquity(result) {
    const total = result.win + result.lose + result.tie;
    return total > 0 ? ((result.win + result.tie / 2) / total) * 100 : 0;
  }

  handToCanonical(hand) {
    return hand[0] + hand[1] + hand[2] + hand[3];
  }

  getAllCombinations(rank) {
    const suits = ['c', 'd', 'h', 's'];
    const combos = [];
    for (let i = 0; i < suits.length; i++) {
      for (let j = i + 1; j < suits.length; j++) {
        combos.push(rank + suits[i] + rank + suits[j]);
      }
    }
    return combos;
  }

  async testPreflop(hero, villain, expectedEquity, enumerateRange = false) {
    let heroHands, villainHands;
    
    if (enumerateRange) {
      // For Test 5 (AA vs KK), enumerate all valid combinations
      // Extract just the rank character (first character of first card)
      const heroRank = hero[0][0];
      const villainRank = villain[0][0];
      heroHands = this.getAllCombinations(heroRank);
      villainHands = this.getAllCombinations(villainRank);
    } else {
      // Single hand comparison
      heroHands = [this.handToCanonical(hero)];
      villainHands = [this.handToCanonical(villain)];
    }
    
    this.seedRandom();
    const optimizedStart = performance.now();
    const optimizedResult = await this.bitval.compareRange(heroHands, villainHands, [], [], 5, this.iterations, true);
    const optimizedTime = performance.now() - optimizedStart;
    
    this.seedRandom();
    const unoptimizedStart = performance.now();
    const unoptimizedResult = await this.bitval.compareRange(heroHands, villainHands, [], [], 5, this.iterations, false);
    const unoptimizedTime = performance.now() - unoptimizedStart;
    
    this.seedRandom();
    const simulateStart = performance.now();
    const simulateResult = this.bitval.simulate(this.iterations, 5, hero, villain, [], []);
    const simulateTime = performance.now() - simulateStart;
    
    const optimizedEquity = this.calculateEquity(optimizedResult);
    const unoptimizedEquity = this.calculateEquity(unoptimizedResult);
    const simulateEquity = this.calculateEquity(simulateResult);
    const optimizedDiff = Math.abs(optimizedEquity - expectedEquity);
    const unoptimizedDiff = Math.abs(unoptimizedEquity - expectedEquity);
    const simulateDiff = Math.abs(simulateEquity - expectedEquity);
    const optimizedPassed = optimizedDiff <= this.tolerance;
    const unoptimizedPassed = unoptimizedDiff <= this.tolerance;
    const simulatePassed = simulateDiff <= this.tolerance;
    return { 
      expectedEquity, 
      optimizedEquity, 
      unoptimizedEquity,
      simulateEquity,
      optimizedDiff, 
      unoptimizedDiff,
      simulateDiff,
      optimizedPassed, 
      unoptimizedPassed,
      simulatePassed,
      optimizedTime,
      unoptimizedTime,
      simulateTime
    };
  }

  async testFlop(hero, villain, flop) {
    const heroHand = this.handToCanonical(hero);
    const villainHand = this.handToCanonical(villain);
    this.seedRandom();
    const optimizedResult = await this.bitval.compareRange([heroHand], [villainHand], flop, [], 5, this.iterations, true);
    this.seedRandom();
    const unoptimizedResult = await this.bitval.compareRange([heroHand], [villainHand], flop, [], 5, this.iterations, false);
    const optimizedEquity = this.calculateEquity(optimizedResult);
    const unoptimizedEquity = this.calculateEquity(unoptimizedResult);
    const diff = Math.abs(optimizedEquity - unoptimizedEquity);
    const passed = diff <= this.tolerance;
    return { optimizedEquity, unoptimizedEquity, diff, passed };
  }

  async testTurn(hero, villain, flop, turn) {
    const heroHand = this.handToCanonical(hero);
    const villainHand = this.handToCanonical(villain);
    const board = [...flop, turn];
    this.seedRandom();
    const optimizedResult = await this.bitval.compareRange([heroHand], [villainHand], board, [], 5, this.iterations, true);
    this.seedRandom();
    const unoptimizedResult = await this.bitval.compareRange([heroHand], [villainHand], board, [], 5, this.iterations, false);
    const optimizedEquity = this.calculateEquity(optimizedResult);
    const unoptimizedEquity = this.calculateEquity(unoptimizedResult);
    const diff = Math.abs(optimizedEquity - unoptimizedEquity);
    const passed = diff <= this.tolerance;
    return { optimizedEquity, unoptimizedEquity, diff, passed };
  }

  async testRiver(hero, villain, flop, turn, river) {
    const heroHand = this.handToCanonical(hero);
    const villainHand = this.handToCanonical(villain);
    const board = [...flop, turn, river];
    this.seedRandom();
    const optimizedResult = await this.bitval.compareRange([heroHand], [villainHand], board, [], 5, this.iterations, true);
    this.seedRandom();
    const unoptimizedResult = await this.bitval.compareRange([heroHand], [villainHand], board, [], 5, this.iterations, false);
    const optimizedEquity = this.calculateEquity(optimizedResult);
    const unoptimizedEquity = this.calculateEquity(unoptimizedResult);
    const diff = Math.abs(optimizedEquity - unoptimizedEquity);
    const passed = diff <= this.tolerance;
    return { optimizedEquity, unoptimizedEquity, diff, passed };
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  generateTestBoards(hero, villain) {
    const allCards = [];
    const suits = ['s', 'h', 'd', 'c'];
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    for (const rank of ranks) {
      for (const suit of suits) {
        const card = rank + suit;
        if (!hero.includes(card) && !villain.includes(card)) {
          allCards.push(card);
        }
      }
    }
    const shuffled = this.shuffleArray(allCards);
    return {
      flops: [
        [shuffled[0], shuffled[1], shuffled[2]],
        [shuffled[3], shuffled[4], shuffled[5]],
        [shuffled[6], shuffled[7], shuffled[8]]
      ],
      turns: [shuffled[9], shuffled[10], shuffled[11]],
      rivers: [shuffled[12], shuffled[13], shuffled[14]]
    };
  }

  async runTests() {
    console.log('='.repeat(80));
    console.log('OPTIMIZE METHOD TEST SUITE');
    console.log('='.repeat(80));
    console.log(`Iterations: ${this.iterations.toLocaleString()}`);
    console.log(`Tolerance: ${this.tolerance}%\n`);

    let preflopPassed = 0;
    let preflopFailed = 0;
    let flopPassed = 0;
    let flopFailed = 0;
    let turnPassed = 0;
    let turnFailed = 0;
    let riverPassed = 0;
    let riverFailed = 0;

    for (let i = 0; i < this.startupTests.length; i++) {
      const test = this.startupTests[i];
      console.log(`\n${'='.repeat(80)}`);
      if (test.enumerateRange) {
        const heroCombos = this.getAllCombinations(test.hero[0][0]);
        const villainCombos = this.getAllCombinations(test.villain[0][0]);
        console.log(`Test ${i + 1}: ${test.hero.join('')} vs ${test.villain.join('')} (all combinations: ${heroCombos.length} vs ${villainCombos.length})`);
      } else {
        console.log(`Test ${i + 1}: ${test.hero.join('')} vs ${test.villain.join('')}`);
      }
      console.log('='.repeat(80));

      const preflopResult = await this.testPreflop(test.hero, test.villain, test.expectedEquity, test.enumerateRange || false);
      console.log(`Preflop Results:`);
      console.log(`  Expected: ${preflopResult.expectedEquity.toFixed(2)}%`);
      console.log(`  Optimized (compareRange): ${preflopResult.optimizedEquity.toFixed(2)}% (diff: ${preflopResult.optimizedDiff.toFixed(2)}%) ${preflopResult.optimizedPassed ? '✓' : '❌'} - ${preflopResult.optimizedTime.toFixed(2)}ms`);
      console.log(`  Unoptimized (compareRange): ${preflopResult.unoptimizedEquity.toFixed(2)}% (diff: ${preflopResult.unoptimizedDiff.toFixed(2)}%) ${preflopResult.unoptimizedPassed ? '✓' : '❌'} - ${preflopResult.unoptimizedTime.toFixed(2)}ms`);
      console.log(`  Simulate: ${preflopResult.simulateEquity.toFixed(2)}% (diff: ${preflopResult.simulateDiff.toFixed(2)}%) ${preflopResult.simulatePassed ? '✓' : '❌'} - ${preflopResult.simulateTime.toFixed(2)}ms`);
      const speedupOptimized = preflopResult.unoptimizedTime / preflopResult.optimizedTime;
      const speedupSimulate = preflopResult.simulateTime / preflopResult.optimizedTime;
      console.log(`  Speedup vs Unoptimized: ${speedupOptimized.toFixed(2)}x`);
      console.log(`  Speedup vs Simulate: ${speedupSimulate.toFixed(2)}x`);
      if (preflopResult.optimizedPassed && preflopResult.unoptimizedPassed && preflopResult.simulatePassed) {
        preflopPassed++;
      } else {
        preflopFailed++;
      }

      const boards = this.generateTestBoards(test.hero, test.villain);
      
      for (let f = 0; f < boards.flops.length; f++) {
        const flop = boards.flops[f];
        const flopResult = await this.testFlop(test.hero, test.villain, flop);
        if (flopResult.passed) {
          flopPassed++;
          console.log(`✓ Flop [${flop.join(' ')}]: ${flopResult.optimizedEquity.toFixed(2)}% (diff: ${flopResult.diff.toFixed(2)}%)`);
        } else {
          flopFailed++;
          console.log(`❌ Flop [${flop.join(' ')}]: opt=${flopResult.optimizedEquity.toFixed(2)}%, unopt=${flopResult.unoptimizedEquity.toFixed(2)}% (diff: ${flopResult.diff.toFixed(2)}%)`);
        }

        for (let t = 0; t < boards.turns.length; t++) {
          const turn = boards.turns[t];
          const turnResult = await this.testTurn(test.hero, test.villain, flop, turn);
          if (turnResult.passed) {
            turnPassed++;
            console.log(`  ✓ Turn [${turn}]: ${turnResult.optimizedEquity.toFixed(2)}% (diff: ${turnResult.diff.toFixed(2)}%)`);
          } else {
            turnFailed++;
            console.log(`  ❌ Turn [${turn}]: opt=${turnResult.optimizedEquity.toFixed(2)}%, unopt=${turnResult.unoptimizedEquity.toFixed(2)}% (diff: ${turnResult.diff.toFixed(2)}%)`);
          }

          for (let r = 0; r < boards.rivers.length; r++) {
            const river = boards.rivers[r];
            const riverResult = await this.testRiver(test.hero, test.villain, flop, turn, river);
            if (riverResult.passed) {
              riverPassed++;
              console.log(`    ✓ River [${river}]: ${riverResult.optimizedEquity.toFixed(2)}% (diff: ${riverResult.diff.toFixed(2)}%)`);
            } else {
              riverFailed++;
              console.log(`    ❌ River [${river}]: opt=${riverResult.optimizedEquity.toFixed(2)}%, unopt=${riverResult.unoptimizedEquity.toFixed(2)}% (diff: ${riverResult.diff.toFixed(2)}%)`);
            }
          }
        }
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Preflop: ${preflopPassed} passed, ${preflopFailed} failed`);
    console.log(`Flop:    ${flopPassed} passed, ${flopFailed} failed`);
    console.log(`Turn:    ${turnPassed} passed, ${turnFailed} failed`);
    console.log(`River:   ${riverPassed} passed, ${riverFailed} failed`);
    const totalPassed = preflopPassed + flopPassed + turnPassed + riverPassed;
    const totalFailed = preflopFailed + flopFailed + turnFailed + riverFailed;
    console.log(`\nTotal:   ${totalPassed} passed, ${totalFailed} failed`);
    
    if (totalFailed === 0) {
      console.log('\n✓ All tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed!');
      process.exit(1);
    }
  }
}

const tester = new OptimizeTester();
tester.runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

