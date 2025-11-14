// Debug which cards correspond to small masks
const BitVal = require('./bitval.js');

const bitval = new BitVal();

console.log("Checking which cards correspond to small masks:");
console.log();

const smallMasks = [2n, 4n, 8n];

smallMasks.forEach(mask => {
  console.log(`Mask: ${mask.toString()} (0x${mask.toString(16)})`);
  
  // Find all cards that match this mask
  const matchingCards = bitval.ALL_HANDS.filter(card => {
    const cardMask = bitval.getBitMasked([card]);
    return (cardMask & mask) !== 0n;
  });
  
  console.log(`  Matching cards: ${matchingCards.join(', ')}`);
  
  // Find cards that EXACTLY match this mask
  const exactMatches = bitval.ALL_HANDS.filter(card => {
    const cardMask = bitval.getBitMasked([card]);
    return cardMask === mask;
  });
  
  console.log(`  Exact matches: ${exactMatches.join(', ')}`);
  console.log();
});

// Also check what the actual Ace masks are
console.log("Actual Ace masks:");
['Ac', 'Ad', 'Ah', 'As'].forEach(ace => {
  const mask = bitval.getBitMasked([ace]);
  console.log(`${ace}: ${mask.toString()} (0x${mask.toString(16)})`);
});

// Check what cards are in the first few positions of comboArray
console.log();
console.log("Testing scenario: 7d on turn");
const hero = ['Th', '7c'];
const villain = ['Qs', 'Qh'];
const board = ['As', 'Ts', 'Jc', '7d'];
const deadCards = [];
const allDeadCards = [...hero, ...villain, ...board, ...deadCards];
const deadCardsMask = bitval.getBitMasked(allDeadCards);
const availableMasks = bitval._getAvailableCardMasks(deadCardsMask);
const comboArray = bitval._getCombinations(availableMasks, 1);

console.log("All masks in comboArray (in order):");
console.log("=".repeat(80));
for (let i = 0; i < comboArray.length; i++) {
  const mask = comboArray[i];
  const matchingCards = bitval.ALL_HANDS.filter(card => {
    const cardMask = bitval.getBitMasked([card]);
    return cardMask === mask;
  });
  const maskStr = mask.toString().padStart(20);
  const binStr = mask.toString(2).padStart(64, '0');
  const cardsStr = matchingCards.length > 0 ? matchingCards.join(', ') : '(no exact match)';
  console.log(`${maskStr} ${binStr} ${cardsStr}`);
}
console.log("=".repeat(80));

