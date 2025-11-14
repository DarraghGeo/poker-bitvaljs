// Test specific Ace river cards that should be losses
const BitVal = require('./bitval.js');

const bitval = new BitVal();

const hero = ['Th', '7c'];
const villain = ['Qs', 'Qh'];
const board = ['As', 'Ts', 'Jc', '7d']; // 4 cards (flop + turn)

const heroMask = bitval.getBitMasked(hero);
const villainMask = bitval.getBitMasked(villain);
const boardMask = bitval.getBitMasked(board);

console.log("Testing Ace river cards that should be losses:");
console.log("Hero: Th 7c");
console.log("Villain: Qs Qh");
console.log("Board: As Ts Jc 7d");
console.log();

const aceRivers = ['Ac', 'Ad', 'Ah'];

aceRivers.forEach(aceRiver => {
  const riverMask = bitval.getBitMasked([aceRiver]);
  const completeBoard = boardMask | riverMask;
  
  const heroFullHand = heroMask | completeBoard;
  const villainFullHand = villainMask | completeBoard;
  
  const heroEval = bitval.evaluate(heroFullHand);
  const villainEval = bitval.evaluate(villainFullHand);
  
  const heroHand = bitval.getHandFromMask(heroFullHand);
  const villainHand = bitval.getHandFromMask(villainFullHand);
  
  const heroStrength = bitval.getHandStrengthFromMask(heroEval);
  const villainStrength = bitval.getHandStrengthFromMask(villainEval);
  
  console.log(`River: ${aceRiver}`);
  console.log(`  Hero hand: ${heroHand.join(' ')}`);
  console.log(`  Hero strength: ${heroStrength}`);
  console.log(`  Hero eval: ${heroEval.toString()}`);
  console.log(`  Villain hand: ${villainHand.join(' ')}`);
  console.log(`  Villain strength: ${villainStrength}`);
  console.log(`  Villain eval: ${villainEval.toString()}`);
  console.log(`  Result: ${heroEval > villainEval ? 'WIN' : heroEval < villainEval ? 'LOSE' : 'TIE'} (Expected: LOSE)`);
  console.log();
});

