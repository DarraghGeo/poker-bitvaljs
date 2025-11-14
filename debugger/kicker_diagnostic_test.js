const BitVal = require("../bitval.js");

const bitval = new BitVal();

console.log("=".repeat(80));
console.log("KICKER DIAGNOSTIC TEST");
console.log("=".repeat(80));
console.log();

// Test Case 1: Two Pair on Board (Current Failing Case)
console.log("TEST 1: Two Pair on Board - Kicker Comparison");
console.log("-".repeat(80));
const hero1 = ['As', 'Kc'];
const villain1 = ['8h', 'Qh'];
const board1 = ['2h', '9d', '9s', '4s', '4h'];

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

// Debug two pair evaluation
const heroPairs1 = bitval._bitPairs(heroFull1);
const villainPairs1 = bitval._bitPairs(villainFull1);
console.log(`Hero Pairs Bitmask: ${heroPairs1.toString(2)}`);
console.log(`Villain Pairs Bitmask: ${villainPairs1.toString(2)}`);
console.log(`Hero Pair Count: ${bitval.countBits(heroPairs1)}`);
console.log(`Villain Pair Count: ${bitval.countBits(villainPairs1)}`);

if (bitval.countBits(heroPairs1) > 1) {
  const pairRanksMask1 = heroPairs1 | (heroPairs1 << 1n) | (heroPairs1 << 2n) | (heroPairs1 << 3n);
  const kickersOnly1 = heroFull1 & ~pairRanksMask1;
  console.log(`Pair Ranks Mask: ${pairRanksMask1.toString(2)}`);
  console.log(`Kickers Only: ${kickersOnly1.toString(2)}`);
  
  let highestKicker1 = 0n;
  for (let i = 12n; i >= 0n; i--) {
    let rankMask = (bitval.BIT_1 << (i * 4n)) | (bitval.BIT_2 << (i * 4n)) | (bitval.BIT_3 << (i * 4n)) | (bitval.BIT_4 << (i * 4n));
    if (kickersOnly1 & rankMask) {
      highestKicker1 = 1n << i;
      console.log(`Highest Kicker Found: Rank ${i} (bit ${highestKicker1.toString(2)})`);
      break;
    }
  }
  console.log(`Hero Highest Kicker: ${highestKicker1.toString(2)}`);
  
  // Same for villain
  const pairRanksMask1v = villainPairs1 | (villainPairs1 << 1n) | (villainPairs1 << 2n) | (villainPairs1 << 3n);
  const kickersOnly1v = villainFull1 & ~pairRanksMask1v;
  let highestKicker1v = 0n;
  for (let i = 12n; i >= 0n; i--) {
    let rankMask = (bitval.BIT_1 << (i * 4n)) | (bitval.BIT_2 << (i * 4n)) | (bitval.BIT_3 << (i * 4n)) | (bitval.BIT_4 << (i * 4n));
    if (kickersOnly1v & rankMask) {
      highestKicker1v = 1n << i;
      break;
    }
  }
  console.log(`Villain Highest Kicker: ${highestKicker1v.toString(2)}`);
  console.log(`Kicker Comparison: ${highestKicker1} > ${highestKicker1v} = ${highestKicker1 > highestKicker1v}`);
}

console.log();
console.log("=".repeat(80));
console.log();

// Test Case 2: Trips on Board
console.log("TEST 2: Trips on Board - Kicker Comparison");
console.log("-".repeat(80));
const hero2 = ['As', 'Kc'];
const villain2 = ['8h', 'Qh'];
const board2 = ['9d', '9s', '9h', '4s', '2h'];

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

// Debug trips evaluation
const heroTrips2 = bitval._bitTrips(heroFull2);
const villainTrips2 = bitval._bitTrips(villainFull2);
console.log(`Hero Trips Bitmask: ${heroTrips2.toString(2)}`);
console.log(`Villain Trips Bitmask: ${villainTrips2.toString(2)}`);

if (heroTrips2) {
  const tripsRanksMask2 = heroTrips2 | (heroTrips2 << 1n) | (heroTrips2 << 2n) | (heroTrips2 << 3n);
  const kickersOnly2 = heroFull2 & ~tripsRanksMask2;
  console.log(`Trips Ranks Mask: ${tripsRanksMask2.toString(2)}`);
  console.log(`Kickers Only: ${kickersOnly2.toString(2)}`);
  
  const normalized2 = bitval.normalize(kickersOnly2);
  console.log(`Normalized Kickers: ${normalized2.toString(2)}`);
}

console.log();
console.log("=".repeat(80));
console.log();

// Test Case 3: Quads on Board
console.log("TEST 3: Quads on Board - Kicker Comparison");
console.log("-".repeat(80));
const hero3 = ['As', 'Kc'];
const villain3 = ['8h', 'Qh'];
const board3 = ['9d', '9s', '9h', '9c', '2h'];

const heroMask3 = bitval.getBitMasked(hero3);
const villainMask3 = bitval.getBitMasked(villain3);
const boardMask3 = bitval.getBitMasked(board3);

const heroFull3 = heroMask3 | boardMask3;
const villainFull3 = villainMask3 | boardMask3;

const heroEval3 = bitval.evaluate(heroFull3);
const villainEval3 = bitval.evaluate(villainFull3);

console.log(`Hero: ${hero3.join(' ')}`);
console.log(`Villain: ${villain3.join(' ')}`);
console.log(`Board: ${board3.join(' ')}`);
console.log();
console.log(`Hero Hand Type: ${bitval.getHandStrengthFromMask(heroEval3)}`);
console.log(`Villain Hand Type: ${bitval.getHandStrengthFromMask(villainEval3)}`);
console.log();
console.log(`Hero Eval: ${heroEval3.toString()}`);
console.log(`Villain Eval: ${villainEval3.toString()}`);
console.log(`Hero > Villain: ${heroEval3 > villainEval3}`);
console.log(`Expected: Hero should win (Ace kicker > Queen kicker)`);
console.log();

// Debug quads evaluation
const heroQuads3 = bitval._bitQuads(heroFull3);
const villainQuads3 = bitval._bitQuads(villainFull3);
console.log(`Hero Quads Bitmask: ${heroQuads3.toString(2)}`);
console.log(`Villain Quads Bitmask: ${villainQuads3.toString(2)}`);

if (heroQuads3) {
  const quadsRanksMask3 = heroQuads3 | (heroQuads3 << 1n) | (heroQuads3 << 2n) | (heroQuads3 << 3n);
  const kickersOnly3 = heroFull3 & ~quadsRanksMask3;
  console.log(`Quads Ranks Mask: ${quadsRanksMask3.toString(2)}`);
  console.log(`Kickers Only: ${kickersOnly3.toString(2)}`);
  
  const normalized3 = bitval.normalize(kickersOnly3);
  console.log(`Normalized Kickers: ${normalized3.toString(2)}`);
}

console.log();
console.log("=".repeat(80));
console.log();

// Test Case 4: Pair on Board
console.log("TEST 4: Pair on Board - Kicker Comparison");
console.log("-".repeat(80));
const hero4 = ['As', 'Kc'];
const villain4 = ['8h', 'Qh'];
const board4 = ['9d', '9s', '4h', '3s', '2h'];

const heroMask4 = bitval.getBitMasked(hero4);
const villainMask4 = bitval.getBitMasked(villain4);
const boardMask4 = bitval.getBitMasked(board4);

const heroFull4 = heroMask4 | boardMask4;
const villainFull4 = villainMask4 | boardMask4;

const heroEval4 = bitval.evaluate(heroFull4);
const villainEval4 = bitval.evaluate(villainFull4);

console.log(`Hero: ${hero4.join(' ')}`);
console.log(`Villain: ${villain4.join(' ')}`);
console.log(`Board: ${board4.join(' ')}`);
console.log();
console.log(`Hero Hand Type: ${bitval.getHandStrengthFromMask(heroEval4)}`);
console.log(`Villain Hand Type: ${bitval.getHandStrengthFromMask(villainEval4)}`);
console.log();
console.log(`Hero Eval: ${heroEval4.toString()}`);
console.log(`Villain Eval: ${villainEval4.toString()}`);
console.log(`Hero > Villain: ${heroEval4 > villainEval4}`);
console.log(`Expected: Hero should win (Ace King kickers > Queen 8 kickers)`);
console.log();

// Debug pair evaluation
const heroPairs4 = bitval._bitPairs(heroFull4);
const villainPairs4 = bitval._bitPairs(villainFull4);
console.log(`Hero Pairs Bitmask: ${heroPairs4.toString(2)}`);
console.log(`Villain Pairs Bitmask: ${villainPairs4.toString(2)}`);

if (heroPairs4 && bitval.countBits(heroPairs4) === 1) {
  const pairRanksMask4 = heroPairs4 | (heroPairs4 << 1n) | (heroPairs4 << 2n) | (heroPairs4 << 3n);
  const kickersOnly4 = heroFull4 & ~pairRanksMask4;
  console.log(`Pair Ranks Mask: ${pairRanksMask4.toString(2)}`);
  console.log(`Kickers Only: ${kickersOnly4.toString(2)}`);
  
  const normalized4 = bitval.normalize(kickersOnly4);
  console.log(`Normalized Kickers: ${normalized4.toString(2)}`);
}

console.log();
console.log("=".repeat(80));
console.log();

// Test Case 5: High Card (No Made Hand)
console.log("TEST 5: High Card - Kicker Comparison");
console.log("-".repeat(80));
const hero5 = ['As', 'Kc'];
const villain5 = ['8h', 'Qh'];
const board5 = ['9d', '7s', '4h', '3s', '2h'];

const heroMask5 = bitval.getBitMasked(hero5);
const villainMask5 = bitval.getBitMasked(villain5);
const boardMask5 = bitval.getBitMasked(board5);

const heroFull5 = heroMask5 | boardMask5;
const villainFull5 = villainMask5 | boardMask5;

const heroEval5 = bitval.evaluate(heroFull5);
const villainEval5 = bitval.evaluate(villainFull5);

console.log(`Hero: ${hero5.join(' ')}`);
console.log(`Villain: ${villain5.join(' ')}`);
console.log(`Board: ${board5.join(' ')}`);
console.log();
console.log(`Hero Hand Type: ${bitval.getHandStrengthFromMask(heroEval5)}`);
console.log(`Villain Hand Type: ${bitval.getHandStrengthFromMask(villainEval5)}`);
console.log();
console.log(`Hero Eval: ${heroEval5.toString()}`);
console.log(`Villain Eval: ${villainEval5.toString()}`);
console.log(`Hero > Villain: ${heroEval5 > villainEval5}`);
console.log(`Expected: Hero should win (Ace King high > Queen 9 high)`);
console.log();

const normalized5 = bitval.normalize(heroFull5);
const normalized5v = bitval.normalize(villainFull5);
console.log(`Hero Normalized: ${normalized5.toString(2)}`);
console.log(`Villain Normalized: ${normalized5v.toString(2)}`);

console.log();
console.log("=".repeat(80));
console.log();

// Test Case 6: Two Pair on Board - Different Pair Ranks
console.log("TEST 6: Two Pair on Board - Different Pair Ranks (Higher Pair Should Win)");
console.log("-".repeat(80));
const hero6 = ['As', 'Kc'];
const villain6 = ['8h', 'Qh'];
const board6 = ['Kd', 'Ks', '4s', '4h', '2h'];

const heroMask6 = bitval.getBitMasked(hero6);
const villainMask6 = bitval.getBitMasked(villain6);
const boardMask6 = bitval.getBitMasked(board6);

const heroFull6 = heroMask6 | boardMask6;
const villainFull6 = villainMask6 | boardMask6;

const heroEval6 = bitval.evaluate(heroFull6);
const villainEval6 = bitval.evaluate(villainFull6);

console.log(`Hero: ${hero6.join(' ')}`);
console.log(`Villain: ${villain6.join(' ')}`);
console.log(`Board: ${board6.join(' ')}`);
console.log();
console.log(`Hero Hand Type: ${bitval.getHandStrengthFromMask(heroEval6)}`);
console.log(`Villain Hand Type: ${bitval.getHandStrengthFromMask(villainEval6)}`);
console.log();
console.log(`Hero Eval: ${heroEval6.toString()}`);
console.log(`Villain Eval: ${villainEval6.toString()}`);
console.log(`Hero > Villain: ${heroEval6 > villainEval6}`);
console.log(`Expected: Hero should win (Kings and 4s with Ace kicker > Kings and 4s with Queen kicker)`);
console.log();

console.log();
console.log("=".repeat(80));
console.log("BUG ANALYSIS");
console.log("=".repeat(80));
console.log();
console.log("ISSUE IDENTIFIED: Rank mask calculation in two-pair kicker extraction is incorrect.");
console.log();
console.log("Current code (line 454 in bitval.js):");
console.log("  let rankMask = (this.BIT_1 << (i * 4n)) | (this.BIT_2 << (i * 4n)) | ...");
console.log();
console.log("Problem: BIT_1, BIT_2, BIT_3, BIT_4 are repeating patterns (1111..., 2222..., etc.)");
console.log("When shifted, they create masks that are too broad and match multiple ranks.");
console.log();
console.log("Example for rank 10 (Queen):");
console.log("  Current mask: ffffffffffffff0000000000 (WRONG - matches many ranks)");
console.log("  Correct mask: f00000000000 (only matches all 4 Queen suits)");
console.log();
console.log("FIX: Use rank constants or create proper rank mask:");
console.log("  Option 1: Use rank lookup: [this._ACE, this._KING, this._QUEEN, ...][i]");
console.log("  Option 2: Create mask: (1n << (i * 4n)) | (1n << (i * 4n + 1n)) | (1n << (i * 4n + 2n)) | (1n << (i * 4n + 3n))");
console.log("  Option 3: Use: 15n << (i * 4n) (since 15 = 0b1111 represents all 4 suits)");
console.log();
console.log("NOTE: Ace requires special handling due to dual representation (bit 0 and bit 52).");
console.log();
console.log("=".repeat(80));
console.log("SUMMARY");
console.log("=".repeat(80));
console.log("Test 1 (Two Pair on Board):", heroEval1 > villainEval1 ? "PASS" : "FAIL - Rank mask bug causes wrong kicker detection");
console.log("Test 2 (Trips on Board):", heroEval2 > villainEval2 ? "PASS" : "FAIL");
console.log("Test 3 (Quads on Board):", heroEval3 > villainEval3 ? "PASS" : "FAIL - Quads don't include kickers in evaluation");
console.log("Test 4 (Pair on Board):", heroEval4 > villainEval4 ? "PASS" : "FAIL");
console.log("Test 5 (High Card):", heroEval5 > villainEval5 ? "PASS" : "FAIL");
console.log("Test 6 (Two Pair - Different Ranks):", heroEval6 > villainEval6 ? "PASS" : "FAIL");

