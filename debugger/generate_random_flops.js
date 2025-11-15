const evaluator = require("poker-evaluator");

// Test case
const hero = ['As', 'Kc'];
const villain = ['8h', 'Qh'];
const deadCards = [...hero, ...villain];

// Get all available cards (excluding dead cards)
function getAvailableCards() {
  const allCards = [];
  const suits = ['s', 'h', 'd', 'c'];
  const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  
  for (const rank of ranks) {
    for (const suit of suits) {
      const card = rank + suit;
      if (!deadCards.includes(card)) {
        allCards.push(card);
      }
    }
  }
  
  return allCards;
}

// Shuffle array using Fisher-Yates algorithm
function shuffleArray(array) {
  const shuffled = [...array]; // Create a copy
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Deal random flops from shuffled deck
function dealRandomFlops(numFlops) {
  const availableCards = getAvailableCards();
  const flops = [];
  
  // Shuffle and deal flops, reshuffling when we run out of cards
  while (flops.length < numFlops) {
    const shuffledDeck = shuffleArray(availableCards);
    const cardsPerFlop = 3;
    const maxFlopsFromDeck = Math.floor(shuffledDeck.length / cardsPerFlop);
    const flopsNeeded = numFlops - flops.length;
    const flopsToDeal = Math.min(maxFlopsFromDeck, flopsNeeded);
    
    // Deal flops by taking 3 cards at a time from the shuffled deck
    for (let i = 0; i < flopsToDeal; i++) {
      const startIdx = i * cardsPerFlop;
      flops.push([
        shuffledDeck[startIdx],
        shuffledDeck[startIdx + 1],
        shuffledDeck[startIdx + 2]
      ]);
    }
  }
  
  return flops;
}

// Calculate equity using reference evaluator (exhaustive enumeration)
function calculateEquityReference(heroCards, villainCards, boardCards) {
  const remainingCards = [];
  const suits = ['s', 'h', 'd', 'c'];
  const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  
  for (const rank of ranks) {
    for (const suit of suits) {
      const card = rank + suit;
      if (!heroCards.includes(card) && !villainCards.includes(card) && !boardCards.includes(card)) {
        remainingCards.push(card);
      }
    }
  }
  
  let heroWins = 0;
  let villainWins = 0;
  let ties = 0;
  let total = 0;
  
  // Generate all possible turn/river combinations
  for (let i = 0; i < remainingCards.length; i++) {
    for (let j = i + 1; j < remainingCards.length; j++) {
      const turn = remainingCards[i];
      const river = remainingCards[j];
      const fullBoard = [...boardCards, turn, river];
      
      const heroHand = evaluator.evalHand(heroCards.concat(fullBoard));
      const villainHand = evaluator.evalHand(villainCards.concat(fullBoard));
      
      if (heroHand.value > villainHand.value) {
        heroWins++;
      } else if (villainHand.value > heroHand.value) {
        villainWins++;
      } else {
        ties++;
      }
      total++;
    }
  }
  
  // Poker Cruncher convention: ties divided by 2 and added to wins
  const heroEquity = ((heroWins + ties / 2) / total) * 100;
  return heroEquity;
}

// Get available cards and deal random flops
const availableCards = getAvailableCards();
console.log(`Available cards: ${availableCards.length}`);

// Deal 250 random flops from shuffled deck
const randomFlops = dealRandomFlops(250);
console.log(`Dealing ${randomFlops.length} random flops from shuffled deck...`);

console.log("\nGenerating equity for 250 random flops...\n");

const results = [];
for (const flop of randomFlops) {
  const equity = calculateEquityReference(hero, villain, flop);
  const flopKey = flop.sort().join(' ');
  results.push({
    flop: flop,
    flopKey: flopKey,
    equity: equity
  });
  console.log(`${flopKey}: ${equity.toFixed(2)}%`);
}

// Output in format for test cases
console.log("\n" + "=".repeat(80));
console.log("COPY THIS INTO bitval_test_cases.js (250 flops):");
console.log("=".repeat(80));
console.log("\n");

// Sort results by flop key for consistency
results.sort((a, b) => a.flopKey.localeCompare(b.flopKey));

for (const result of results) {
  console.log(`      "${result.flopKey}": [${result.equity.toFixed(2)}, {}],`);
}

console.log("\n" + "=".repeat(80));

