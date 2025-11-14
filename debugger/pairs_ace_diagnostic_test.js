const BitVal = require("../bitval.js");

const bitval = new BitVal();

console.log("=".repeat(80));
console.log("PAIRS ACE DETECTION DIAGNOSTIC TEST");
console.log("=".repeat(80));
console.log();

// Test Case 1: Single Ace (should NOT detect pair)
console.log("TEST 1: Single Ace - Should NOT detect pair");
console.log("-".repeat(80));
const hand1 = ['As', 'Kc', '9d', '9s', '4s', '4h', '2h'];
const hand1Mask = bitval.getBitMasked(hand1);

console.log("Hand:", hand1.join(' '));
console.log();

const pairs1 = bitval._bitPairs(hand1Mask);
console.log("Pairs bitmask:", pairs1.toString(16));
console.log("Pairs bitmask (binary):", pairs1.toString(2).padStart(64, '0'));
console.log();

// Check which ranks have pairs
const rankNames = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'];
const detectedPairs1 = [];
for (let i = 0n; i <= 12n; i++) {
  if (pairs1 & (1n << i)) {
    detectedPairs1.push(rankNames[i]);
    console.log(`  Rank ${i} (${rankNames[i]}) detected as pair`);
  }
}

console.log();
console.log("Expected pairs: Nine, Four");
console.log("Detected pairs:", detectedPairs1.join(', '));
console.log("Has incorrect Ace pair?", detectedPairs1.includes('Ace') ? "YES - BUG!" : "NO");
console.log();

// Debug: Check what cards are in the hand
console.log("Cards in hand:");
for (const [card, mask] of Object.entries(bitval.CARD_MASKS)) {
  if (hand1Mask & mask) {
    console.log(`  ${card}: 0x${mask.toString(16)}`);
  }
}

console.log();
console.log("=".repeat(80));
console.log();

// Test Case 2: Two Aces (SHOULD detect pair)
console.log("TEST 2: Two Aces - SHOULD detect pair");
console.log("-".repeat(80));
const hand2 = ['As', 'Ah', '9d', '9s', '4s', '4h', '2h'];
const hand2Mask = bitval.getBitMasked(hand2);

console.log("Hand:", hand2.join(' '));
console.log();

const pairs2 = bitval._bitPairs(hand2Mask);
console.log("Pairs bitmask:", pairs2.toString(16));
console.log("Pairs bitmask (binary):", pairs2.toString(2).padStart(64, '0'));
console.log();

const detectedPairs2 = [];
for (let i = 0n; i <= 12n; i++) {
  if (pairs2 & (1n << i)) {
    detectedPairs2.push(rankNames[i]);
    console.log(`  Rank ${i} (${rankNames[i]}) detected as pair`);
  }
}

console.log();
console.log("Expected pairs: Ace, Nine, Four");
console.log("Detected pairs:", detectedPairs2.join(', '));
console.log("Has Ace pair?", detectedPairs2.includes('Ace') ? "YES - CORRECT" : "NO - BUG!");
console.log();

console.log("=".repeat(80));
console.log();

// Test Case 3: No Aces (baseline)
console.log("TEST 3: No Aces - Baseline");
console.log("-".repeat(80));
const hand3 = ['Ks', 'Qc', '9d', '9s', '4s', '4h', '2h'];
const hand3Mask = bitval.getBitMasked(hand3);

console.log("Hand:", hand3.join(' '));
console.log();

const pairs3 = bitval._bitPairs(hand3Mask);
console.log("Pairs bitmask:", pairs3.toString(16));
console.log("Pairs bitmask (binary):", pairs3.toString(2).padStart(64, '0'));
console.log();

const detectedPairs3 = [];
for (let i = 0n; i <= 12n; i++) {
  if (pairs3 & (1n << i)) {
    detectedPairs3.push(rankNames[i]);
    console.log(`  Rank ${i} (${rankNames[i]}) detected as pair`);
  }
}

console.log();
console.log("Expected pairs: Nine, Four");
console.log("Detected pairs:", detectedPairs3.join(', '));
console.log("Result:", detectedPairs3.length === 2 && detectedPairs3.includes('Nine') && detectedPairs3.includes('Four') ? "PASS" : "FAIL");
console.log();

console.log("=".repeat(80));
console.log();

// Test Case 4: Single Ace with different suits
console.log("TEST 4: Single Ace (different suit) - Should NOT detect pair");
console.log("-".repeat(80));
const hand4 = ['Ah', 'Kc', '9d', '9s', '4s', '4h', '2h'];
const hand4Mask = bitval.getBitMasked(hand4);

console.log("Hand:", hand4.join(' '));
console.log();

const pairs4 = bitval._bitPairs(hand4Mask);
console.log("Pairs bitmask:", pairs4.toString(16));
console.log();

const detectedPairs4 = [];
for (let i = 0n; i <= 12n; i++) {
  if (pairs4 & (1n << i)) {
    detectedPairs4.push(rankNames[i]);
  }
}

console.log("Expected pairs: Nine, Four");
console.log("Detected pairs:", detectedPairs4.join(', '));
console.log("Has incorrect Ace pair?", detectedPairs4.includes('Ace') ? "YES - BUG!" : "NO");
console.log();

console.log("=".repeat(80));
console.log();

// Test Case 5: Debug _bitPairs internals
console.log("TEST 5: Debug _bitPairs internals for single Ace");
console.log("-".repeat(80));
const hand5Mask = bitval.getBitMasked(['As', 'Kc', '9d', '9s', '4s', '4h', '2h']);

console.log("Hand bitmask:", hand5Mask.toString(16));
console.log();

// Replicate _bitPairs logic
const BIT_1 = bitval.BIT_1;
const BIT_2 = bitval.BIT_2;
const BIT_3 = bitval.BIT_3;
const BIT_4 = bitval.BIT_4;

const pairs5 = ( 
  ((BIT_1 & hand5Mask) << 1n) & (BIT_2 & hand5Mask) | // 1100
  ((BIT_1 & hand5Mask) << 2n) & (BIT_3 & hand5Mask) | // 1010
  ((BIT_1 & hand5Mask) << 3n) & (BIT_4 & hand5Mask) | // 1001 
  ((BIT_2 & hand5Mask) << 1n) & (BIT_3 & hand5Mask) | // 0110
  ((BIT_2 & hand5Mask) << 2n) & (BIT_4 & hand5Mask) | // 0101
  ((BIT_3 & hand5Mask) << 1n) & (BIT_4 & hand5Mask)); // 0011

console.log("Intermediate pairs result:", pairs5.toString(16));
console.log("Intermediate pairs (binary):", pairs5.toString(2).padStart(64, '0'));
console.log();

const shifted = (pairs5 >> 1n | pairs5 >> 2n | pairs5 >> 3n) & BIT_1;
console.log("After shift and BIT_1 mask:", shifted.toString(16));
console.log("After shift (binary):", shifted.toString(2).padStart(64, '0'));
console.log();

const final = shifted & ~1n;
console.log("Final (after ~1n mask):", final.toString(16));
console.log("Final (binary):", final.toString(2).padStart(64, '0'));
console.log();

// Check bit 0 and bit 52
console.log("Bit 0 set?", (final & 1n) ? "YES" : "NO");
console.log("Bit 12 (Ace rank) set?", (final & (1n << 12n)) ? "YES" : "NO");
console.log("Bit 52 (high Ace) set?", (final & (1n << 52n)) ? "YES" : "NO");
console.log();

// Check what's at bit 0 in intermediate result
console.log("Bit 0 in intermediate pairs?", (pairs5 & 1n) ? "YES" : "NO");
console.log("Bit 0 in shifted result?", (shifted & 1n) ? "YES" : "NO");

console.log();
console.log("=".repeat(80));
console.log();

// Test Case 6: Check Ace dual representation
console.log("TEST 6: Ace dual representation analysis");
console.log("-".repeat(80));
console.log("Ace constant:", bitval._ACE.toString(16));
console.log("Ace constant (binary):", bitval._ACE.toString(2).padStart(64, '0'));
console.log();

const aceCards = ['As', 'Ah', 'Ad', 'Ac'];
for (const aceCard of aceCards) {
  const aceMask = bitval.CARD_MASKS[aceCard];
  console.log(`${aceCard}: 0x${aceMask.toString(16)}`);
  console.log(`  Bit 0 set? ${(aceMask & 1n) ? 'YES' : 'NO'}`);
  console.log(`  Bit 52 set? ${(aceMask & (1n << 52n)) ? 'YES' : 'NO'}`);
  console.log();
}

console.log("=".repeat(80));
console.log("SUMMARY");
console.log("=".repeat(80));
console.log("Test 1 (Single Ace):", detectedPairs1.includes('Ace') ? "FAIL - Incorrectly detects Ace pair" : "PASS");
console.log("Test 2 (Two Aces):", detectedPairs2.includes('Ace') ? "PASS - Correctly detects Ace pair" : "FAIL");
console.log("Test 3 (No Aces):", detectedPairs3.length === 2 ? "PASS" : "FAIL");
console.log("Test 4 (Single Ace different suit):", detectedPairs4.includes('Ace') ? "FAIL - Incorrectly detects Ace pair" : "PASS");

