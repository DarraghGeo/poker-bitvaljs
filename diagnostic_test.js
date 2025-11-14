// diagnostic_test.js
const BitVal = require('./bitval.js');

const bitval = new BitVal();

// Test scenario: 7d on turn
const hero = ['Th', '7c'];
const villain = ['Qs', 'Qh'];
const board = ['As', 'Ts', 'Jc', '7d']; // 4 cards (flop + turn)
const deadCards = [];

console.log("=".repeat(80));
console.log("DIAGNOSTIC TEST: Verifying Exhaustive 1-Card Dealing");
console.log("=".repeat(80));
console.log();

// Step 1: Check available cards calculation
const allDeadCards = [...hero, ...villain, ...board, ...deadCards];
const deadCardsMask = bitval.getBitMasked(allDeadCards);
const availableCards = 52 - new Set(allDeadCards).size;
const numberOfCardsToDeal = 5 - board.length;

console.log("Step 1: Available Cards Calculation");
console.log("-".repeat(80));
console.log(`Hero: ${hero.join(' ')}`);
console.log(`Villain: ${villain.join(' ')}`);
console.log(`Board: ${board.join(' ')}`);
console.log(`Total dead cards: ${allDeadCards.length}`);
console.log(`Unique dead cards: ${new Set(allDeadCards).size}`);
console.log(`Available cards: ${availableCards}`);
console.log(`Cards to deal: ${numberOfCardsToDeal}`);
console.log(`Expected combinations: ${bitval.combinations(availableCards, numberOfCardsToDeal)}`);
console.log();

// Step 2: Check _getAvailableCardMasks
console.log("Step 2: Available Card Masks");
console.log("-".repeat(80));
const availableMasks = bitval._getAvailableCardMasks(deadCardsMask);
console.log(`Available masks count: ${availableMasks.length}`);
console.log(`Expected: ${availableCards}`);

// Verify no duplicates
const uniqueMasks = new Set(availableMasks.map(m => m.toString()));
console.log(`Unique masks: ${uniqueMasks.size}`);
if (availableMasks.length !== uniqueMasks.size) {
  console.log("⚠️  WARNING: Duplicate masks found!");
}

// Check if turn card (7d) is in available masks
const boardMask = bitval.getBitMasked(board);
const turnCardMask = bitval.getBitMasked(['7d']);
const turnCardInAvailable = availableMasks.some(m => (m & turnCardMask) !== 0n);
console.log(`Turn card (7d) in available masks: ${turnCardInAvailable} ${turnCardInAvailable ? '⚠️  ERROR!' : '✓'}`);
console.log();

// Step 3: Check _getCombinations for k=1
console.log("Step 3: Combination Generation (k=1)");
console.log("-".repeat(80));
const comboArray = bitval._getCombinations(availableMasks, 1);
console.log(`Combination array length: ${comboArray.length}`);
console.log(`Expected: ${availableCards}`);
if (comboArray.length !== availableCards) {
  console.log("⚠️  WARNING: Mismatch in combination count!");
}

// Verify comboArray is same as availableMasks (for k=1)
const arraysMatch = comboArray.length === availableMasks.length && 
  comboArray.every((m, i) => m === availableMasks[i]);
console.log(`Combo array matches available masks: ${arraysMatch ? '✓' : '⚠️  WARNING'}`);
console.log();

// Step 4: Manually replicate simulate() logic
console.log("Step 4: Manual Simulation Replication");
console.log("-".repeat(80));
const heroMask = bitval.getBitMasked(hero);
const villainMask = bitval.getBitMasked(villain);
const boardMaskValue = bitval.getBitMasked(board);

let manualWin = 0;
let manualLose = 0;
let manualTie = 0;
const riverResults = [];

for (let i = 0; i < comboArray.length; i++) {
  const _board = boardMaskValue | comboArray[i];
  
  const heroEval = bitval.evaluate(heroMask | _board);
  const villainEval = bitval.evaluate(villainMask | _board);
  
  // Get the river card for this iteration
  const riverCardMask = comboArray[i];
  const riverCard = bitval.ALL_HANDS.find(card => {
    const cardMask = bitval.getBitMasked([card]);
    return (cardMask & riverCardMask) !== 0n;
  });
  
  if (heroEval > villainEval) {
    manualWin++;
    riverResults.push({ card: riverCard, result: 'win' });
  } else if (heroEval < villainEval) {
    manualLose++;
    riverResults.push({ card: riverCard, result: 'lose' });
  } else {
    manualTie++;
    riverResults.push({ card: riverCard, result: 'tie' });
  }
}

const manualTotal = manualWin + manualLose + manualTie;
const manualEquity = ((manualWin + manualTie / 2) / manualTotal * 100);

console.log(`Manual simulation results:`);
console.log(`  Win: ${manualWin}`);
console.log(`  Lose: ${manualLose}`);
console.log(`  Tie: ${manualTie}`);
console.log(`  Total: ${manualTotal}`);
console.log(`  Equity: ${manualEquity.toFixed(3)}%`);
console.log();

// Step 5: Compare with simulate() results
console.log("Step 5: Compare with simulate()");
console.log("-".repeat(80));
const simulateResult = bitval.simulate(1000000, 5, hero, villain, board, deadCards);
const simulateTotal = simulateResult.win + simulateResult.lose + simulateResult.tie;
const simulateEquity = ((simulateResult.win + simulateResult.tie / 2) / simulateTotal * 100);

console.log(`simulate() results:`);
console.log(`  Win: ${simulateResult.win}`);
console.log(`  Lose: ${simulateResult.lose}`);
console.log(`  Tie: ${simulateResult.tie}`);
console.log(`  Total: ${simulateTotal}`);
console.log(`  Equity: ${simulateEquity.toFixed(3)}%`);
console.log();

console.log(`Comparison:`);
console.log(`  Manual equity: ${manualEquity.toFixed(3)}%`);
console.log(`  simulate() equity: ${simulateEquity.toFixed(3)}%`);
console.log(`  Difference: ${(simulateEquity - manualEquity).toFixed(3)}%`);
if (Math.abs(simulateEquity - manualEquity) > 0.1) {
  console.log("⚠️  WARNING: Significant difference detected!");
} else {
  console.log("✓ Results match");
}
console.log();

// Step 6: Check for ties
console.log("Step 6: Tie Analysis");
console.log("-".repeat(80));
const ties = riverResults.filter(r => r.result === 'tie');
console.log(`Number of ties: ${ties.length}`);
if (ties.length > 0) {
  console.log("Tie cards:");
  ties.forEach(t => console.log(`  ${t.card}`));
}
console.log();

// Step 7: Verify all river cards are unique
console.log("Step 7: Verify Uniqueness");
console.log("-".repeat(80));
const riverCards = riverResults.map(r => r.card);
const uniqueRiverCards = new Set(riverCards);
console.log(`Total river cards tested: ${riverCards.length}`);
console.log(`Unique river cards: ${uniqueRiverCards.size}`);
if (riverCards.length !== uniqueRiverCards.size) {
  console.log("⚠️  WARNING: Duplicate river cards found!");
  const duplicates = riverCards.filter((card, index) => riverCards.indexOf(card) !== index);
  console.log(`Duplicates: ${[...new Set(duplicates)].join(', ')}`);
} else {
  console.log("✓ All river cards are unique");
}
console.log();

// Step 8: Expected equity from Poker Cruncher
console.log("Step 8: Expected vs Actual");
console.log("-".repeat(80));
const expectedEquity = 72.73;
console.log(`Expected equity (Poker Cruncher): ${expectedEquity}%`);
console.log(`Manual equity: ${manualEquity.toFixed(3)}%`);
console.log(`simulate() equity: ${simulateEquity.toFixed(3)}%`);
console.log(`Manual difference: ${(manualEquity - expectedEquity).toFixed(3)}%`);
console.log(`simulate() difference: ${(simulateEquity - expectedEquity).toFixed(3)}%`);
console.log();

// Step 9: Detailed breakdown of wins and losses
console.log("Step 9: Detailed River Card Breakdown");
console.log("-".repeat(80));
const wins = riverResults.filter(r => r.result === 'win').map(r => r.card).sort();
const losses = riverResults.filter(r => r.result === 'lose').map(r => r.card).sort();

console.log(`Wins (${wins.length}): ${wins.join(', ')}`);
console.log();
console.log(`Losses (${losses.length}): ${losses.join(', ')}`);
console.log();

// Step 9b: Verify Ace rivers specifically
console.log("Step 9b: Verifying Ace River Cards");
console.log("-".repeat(80));
const aceRivers = ['Ac', 'Ad', 'Ah'];
aceRivers.forEach(aceRiver => {
  const result = riverResults.find(r => r.card === aceRiver);
  if (result) {
    console.log(`${aceRiver}: ${result.result} (Expected: lose)`);
    if (result.result !== 'lose') {
      console.log(`  ⚠️  ERROR: ${aceRiver} is ${result.result} but should be lose!`);
    }
  } else {
    console.log(`${aceRiver}: NOT FOUND in results`);
  }
  
  // Also verify the actual evaluation
  const riverMask = bitval.getBitMasked([aceRiver]);
  const testBoard = boardMaskValue | riverMask;
  const testHeroEval = bitval.evaluate(heroMask | testBoard);
  const testVillainEval = bitval.evaluate(villainMask | testBoard);
  const testResult = testHeroEval > testVillainEval ? 'win' : testHeroEval < testVillainEval ? 'lose' : 'tie';
  console.log(`  Direct eval: ${testResult} (Hero: ${testHeroEval.toString()}, Villain: ${testVillainEval.toString()})`);
  
  // Check if the mask is in comboArray
  const maskIndex = comboArray.findIndex(m => (m & riverMask) !== 0n && m === riverMask);
  if (maskIndex >= 0) {
    console.log(`  Mask found in comboArray at index ${maskIndex}`);
    // Check what result we got for that index
    const indexResult = riverResults[maskIndex];
    console.log(`  Result at index ${maskIndex}: ${indexResult ? indexResult.result : 'N/A'}, card: ${indexResult ? indexResult.card : 'N/A'}`);
  } else {
    console.log(`  Mask NOT found in comboArray (or found with different mask)`);
    // Try to find any mask that overlaps
    const overlappingMasks = comboArray.map((m, i) => ({ mask: m, index: i })).filter(({mask}) => (mask & riverMask) !== 0n);
    console.log(`  Overlapping masks found: ${overlappingMasks.length}`);
    overlappingMasks.forEach(({mask, index}) => {
      const indexResult = riverResults[index];
      console.log(`    Index ${index}: mask=${mask.toString(16)}, result=${indexResult ? indexResult.result : 'N/A'}, card=${indexResult ? indexResult.card : 'N/A'}`);
    });
  }
});
console.log();

// Step 10: Compare with expected (from Poker Cruncher data)
console.log("Step 10: Expected River Outcomes (from Poker Cruncher)");
console.log("-".repeat(80));
// Based on Poker Cruncher: 7d on turn should result in 72.73% equity
// That means out of 44 rivers, ~32 should be wins (72.73% of 44 = 32)
// But we're getting 35 wins, which is 3 too many
console.log(`Expected wins (72.73% of 44): ~${Math.round(expectedEquity / 100 * 44)}`);
console.log(`Actual wins: ${wins.length}`);
console.log(`Difference: ${wins.length - Math.round(expectedEquity / 100 * 44)} too many wins`);
console.log();
console.log("This suggests some river cards that should be losses are being counted as wins.");

