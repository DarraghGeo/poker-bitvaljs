const BitVal = require('./bitval.js');

const bitval = new BitVal();
const suits = ['s', 'h', 'd', 'c'];
const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

function generateRandomHand() {
  const rank1 = ranks[Math.floor(Math.random() * ranks.length)];
  const rank2 = ranks[Math.floor(Math.random() * ranks.length)];
  const suit1 = suits[Math.floor(Math.random() * suits.length)];
  let suit2 = suits[Math.floor(Math.random() * suits.length)];
  if (rank1 === rank2) {
    while (suit2 === suit1) {
      suit2 = suits[Math.floor(Math.random() * suits.length)];
    }
  }
  return rank1 + suit1 + rank2 + suit2;
}

function generateRandomBoard(numCards) {
  const cards = [];
  const used = new Set();
  while (cards.length < numCards) {
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const card = rank + suit;
    if (!used.has(card)) {
      used.add(card);
      cards.push(card);
    }
  }
  return cards;
}

console.log('='.repeat(80));
console.log('PREFLOP CANONICAL KEYS (100 examples)');
console.log('='.repeat(80));
const preflopKeys = new Set();
const preflopExamples = [];
for (let i = 0; i < 100; i++) {
  const hand = generateRandomHand();
  const key = bitval._getCanonicalKey(hand, []);
  preflopKeys.add(key);
  preflopExamples.push({ hand, key });
}
for (const { hand, key } of preflopExamples) {
  console.log(`${hand.padEnd(6)} -> ${key}`);
}
console.log(`\nTotal unique keys: ${preflopKeys.size}`);
console.log(`All unique preflop keys:`, Array.from(preflopKeys).sort().join(', '));

console.log('\n' + '='.repeat(80));
console.log('FLOP CANONICAL KEYS (100 examples)');
console.log('='.repeat(80));
const flopKeys = new Set();
const flopExamples = [];
for (let i = 0; i < 100; i++) {
  const hand = generateRandomHand();
  const flop = generateRandomBoard(3);
  const key = bitval._getCanonicalKey(hand, flop, 5);
  flopKeys.add(key);
  flopExamples.push({ hand, flop, key });
}
for (const { hand, flop, key } of flopExamples) {
  console.log(`${hand.padEnd(6)} on [${flop.join(' ').padEnd(11)}] -> ${key}`);
}
console.log(`\nTotal unique keys: ${flopKeys.size}`);
console.log(`All unique flop keys:`, Array.from(flopKeys).sort().join(', '));

console.log('\n' + '='.repeat(80));
console.log('TURN CANONICAL KEYS (100 examples) - 4 board cards, 1 to come');
console.log('='.repeat(80));
const turnKeys = new Set();
const turnExamples = [];
for (let i = 0; i < 100; i++) {
  const hand = generateRandomHand();
  const turn = generateRandomBoard(4);
  const key = bitval._getCanonicalKey(hand, turn, 5);
  turnKeys.add(key);
  turnExamples.push({ hand, turn, key });
}
for (const { hand, turn, key } of turnExamples) {
  console.log(`${hand.padEnd(6)} on [${turn.join(' ').padEnd(15)}] -> ${key}`);
}
console.log(`\nTotal unique keys: ${turnKeys.size}`);
console.log(`All unique turn keys:`, Array.from(turnKeys).sort().join(', '));

