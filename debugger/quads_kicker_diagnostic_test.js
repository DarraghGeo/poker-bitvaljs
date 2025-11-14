const BitVal = require("../bitval.js");

const bitval = new BitVal();

console.log("=".repeat(80));
console.log("QUADS KICKER DIAGNOSTIC TEST");
console.log("=".repeat(80));
console.log();

// Test Case 1: Quads on board with river completing quads - Hero should win with higher kicker
console.log("TEST 1: Quads on Board (9s/9d/9h) + River 9c - Hero has Ace kicker");
console.log("-".repeat(80));
const hero1 = ['As', 'Kc'];
const villain1 = ['8h', 'Qh'];
const board1 = ['2h', '9d', '9s', '9h', '9c'];

const heroMask1 = bitval.getBitMasked(hero1);
const villainMask1 = bitval.getBitMasked(villain1);
const boardMask1 = bitval.getBitMasked(board1);

const heroFull1 = heroMask1 | boardMask1;
const villainFull1 = villainMask1 | boardMask1;

const heroEval1 = bitval.evaluate(heroFull1);
const villainEval1 = bitval.evaluate(villainFull1);

console.log(`Hero: ${hero1.join(' ')}`);
console.log(`Villain: ${villain1.join(' ')}`);
console.log(`Board: ${board1.join(' ')}`);
console.log();
console.log(`Hero Hand Type: ${bitval.getHandStrengthFromMask(heroEval1)}`);
console.log(`Villain Hand Type: ${bitval.getHandStrengthFromMask(villainEval1)}`);
console.log();
console.log(`Hero Eval: ${heroEval1.toString()}`);
console.log(`Villain Eval: ${villainEval1.toString()}`);
console.log(`Hero > Villain: ${heroEval1 > villainEval1}`);
console.log(`Expected: Hero should win (Ace kicker > Queen kicker)`);
console.log();

// Debug quads evaluation
const heroQuads1 = bitval._bitQuads(heroFull1);
const villainQuads1 = bitval._bitQuads(villainFull1);
console.log(`Hero Quads Bitmask: ${heroQuads1.toString(16)}`);
console.log(`Villain Quads Bitmask: ${villainQuads1.toString(16)}`);

if (heroQuads1) {
  const QUADS_SCORE = 1n << 62n;
  const quadsRanksMask = heroQuads1 | (heroQuads1 << 1n) | (heroQuads1 << 2n) | (heroQuads1 << 3n);
  const kickersOnly = heroFull1 & ~quadsRanksMask;
  console.log(`Quads Ranks Mask: ${quadsRanksMask.toString(16)}`);
  console.log(`Kickers Only: ${kickersOnly.toString(16)}`);
  
  // Check what cards are in kickers
  console.log(`Hero kicker cards:`);
  for (const [card, mask] of Object.entries(bitval.CARD_MASKS)) {
    if (kickersOnly & mask) {
      console.log(`  ${card}`);
    }
  }
  
  // Check current evaluation
  const currentEval = heroQuads1 | QUADS_SCORE;
  console.log(`Current eval (quads only): ${currentEval.toString(16)}`);
  console.log(`Actual eval: ${heroEval1.toString(16)}`);
  console.log(`Kicker included? ${(heroEval1 & ~currentEval).toString(16) !== '0' ? 'YES' : 'NO'}`);
}

console.log();
console.log("=".repeat(80));
console.log();

// Test Case 2: Quads on board (4s/4h) + Turn 4c + River 4d
console.log("TEST 2: Quads on Board (4s/4h/4c) + River 4d - Hero should win");
console.log("-".repeat(80));
const hero2 = ['As', 'Kc'];
const villain2 = ['8h', 'Qh'];
const board2 = ['2h', '9d', '9s', '4s', '4h', '4c', '4d'];

const heroMask2 = bitval.getBitMasked(hero2);
const villainMask2 = bitval.getBitMasked(villain2);
const boardMask2 = bitval.getBitMasked(board2);

const heroFull2 = heroMask2 | boardMask2;
const villainFull2 = villainMask2 | boardMask2;

const heroEval2 = bitval.evaluate(heroFull2);
const villainEval2 = bitval.evaluate(villainFull2);

console.log(`Hero: ${hero2.join(' ')}`);
console.log(`Villain: ${villain2.join(' ')}`);
console.log(`Board: ${board2.join(' ')}`);
console.log();
console.log(`Hero Hand Type: ${bitval.getHandStrengthFromMask(heroEval2)}`);
console.log(`Villain Hand Type: ${bitval.getHandStrengthFromMask(villainEval2)}`);
console.log();
console.log(`Hero Eval: ${heroEval2.toString()}`);
console.log(`Villain Eval: ${villainEval2.toString()}`);
console.log(`Hero > Villain: ${heroEval2 > villainEval2}`);
console.log(`Expected: Hero should win (Ace kicker > Queen kicker)`);
console.log();

// Debug quads evaluation
const heroQuads2 = bitval._bitQuads(heroFull2);
const villainQuads2 = bitval._bitQuads(villainFull2);
console.log(`Hero Quads Bitmask: ${heroQuads2.toString(16)}`);
console.log(`Villain Quads Bitmask: ${villainQuads2.toString(16)}`);

if (heroQuads2) {
  const QUADS_SCORE = 1n << 62n;
  const quadsRanksMask = heroQuads2 | (heroQuads2 << 1n) | (heroQuads2 << 2n) | (heroQuads2 << 3n);
  const kickersOnly = heroFull2 & ~quadsRanksMask;
  console.log(`Quads Ranks Mask: ${quadsRanksMask.toString(16)}`);
  console.log(`Kickers Only: ${kickersOnly.toString(16)}`);
  
  console.log(`Hero kicker cards:`);
  for (const [card, mask] of Object.entries(bitval.CARD_MASKS)) {
    if (kickersOnly & mask) {
      console.log(`  ${card}`);
    }
  }
  
  // Find highest kicker
  let highestKicker = 0n;
  for (let i = 12n; i >= 0n; i--) {
    let rankMask = bitval.RANK_MASKS[i];
    if (kickersOnly & rankMask) {
      highestKicker = 1n << i;
      console.log(`Highest kicker found: rank ${i}, value ${highestKicker.toString()}`);
      break;
    }
  }
  
  const currentEval = heroQuads2 | QUADS_SCORE;
  const withKicker = currentEval | highestKicker;
  console.log(`Current eval: ${currentEval.toString(16)}`);
  console.log(`With kicker: ${withKicker.toString(16)}`);
  console.log(`Actual eval: ${heroEval2.toString(16)}`);
}

console.log();
console.log("=".repeat(80));
console.log();

// Test Case 3: Check current evaluate() implementation for quads
console.log("TEST 3: Current evaluate() implementation for quads");
console.log("-".repeat(80));
const hand3 = bitval.getBitMasked(['As', 'Kc', '9d', '9s', '9h', '9c', '2h']);
const quads3 = bitval._bitQuads(hand3);
const QUADS_SCORE = 1n << 62n;

console.log(`Hand: As Kc 9d 9s 9h 9c 2h`);
console.log(`Quads bitmask: ${quads3.toString(16)}`);
console.log(`Current evaluate() returns: ${(quads3 | QUADS_SCORE).toString(16)}`);
console.log(`Kicker should be included but isn't!`);
console.log();

// Test Case 4: Compare with trips (which includes kicker)
console.log("TEST 4: Compare with trips evaluation (includes kicker)");
console.log("-".repeat(80));
const hand4 = bitval.getBitMasked(['As', 'Kc', '9d', '9s', '9h', '4c', '2h']);
const trips4 = bitval._bitTrips(hand4);
const TRIPS_SCORE = 1n << 58n;

console.log(`Hand: As Kc 9d 9s 9h 4c 2h`);
console.log(`Trips bitmask: ${trips4.toString(16)}`);
const tripsEval = (trips4 | TRIPS_SCORE) | bitval.normalize(hand4);
console.log(`Trips eval includes kicker: ${tripsEval.toString(16)}`);
console.log(`Trips uses normalize() to include kickers`);

console.log();
console.log("=".repeat(80));
console.log("SUMMARY");
console.log("=".repeat(80));
console.log("Test 1 (Quads 9s):", heroEval1 > villainEval1 ? "PASS" : "FAIL - Kicker not included");
console.log("Test 2 (Quads 4s):", heroEval2 > villainEval2 ? "PASS" : "FAIL - Kicker not included");
console.log();
console.log("ISSUE: evaluate() for quads returns (quads | QUADS_SCORE) without kicker");
console.log("FIX: Should include highest kicker, similar to trips: (quads | QUADS_SCORE) | highestKicker");

