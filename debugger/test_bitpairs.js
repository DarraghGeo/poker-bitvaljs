const BitVal = require('../bitval.js');

const bv = new BitVal();

console.log("=".repeat(80));
console.log("TESTING _bitPairs");
console.log("=".repeat(80));

function testBitPairs(description, cards, expectedRank = null) {
  console.log(`\n${description}`);
  console.log(`Cards: ${cards.join(' ')}`);
  
  const hand = bv.getBitMasked(cards);
  // Call _bitPairs and also manually trace through the logic
  const pairsRaw = bv._bitPairs(hand);
  const pairsGated = pairsRaw & bv.BIT_1;
  
  console.log(`Hand bitmask: ${hand.toString(2).padStart(64, '0')}`);
  console.log(`Pairs result from _bitPairs(): ${pairsRaw.toString(2).padStart(64, '0')}`);
  console.log(`Pairs gated (BIT_1): ${pairsGated.toString(2).padStart(64, '0')}`);
  
  const RANK_NAMES = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'];
  
  if (pairsGated) {
    // Convert bit position to rank: rank = (bit_position / 4) - 1
    // But handle Ace specially (bit 0 or bit 52)
    let rank;
    if (pairsGated & 1n) {
      rank = 12; // Ace low (bit 0)
    } else if (pairsGated & (1n << 52n)) {
      rank = 12; // Ace high (bit 52)
    } else {
      // For other ranks: find the bit position and convert to rank
      const bitPos = Math.log2(Number(pairsGated));
      rank = Math.floor(bitPos / 4) - 1;
    }
    console.log(`Detected rank: ${rank} (${RANK_NAMES[rank] || 'Unknown'})`);
    if (expectedRank !== null) {
      const expectedRankName = RANK_NAMES[expectedRank] || 'Unknown';
      if (rank === expectedRank) {
        console.log(`✓ CORRECT: Expected rank ${expectedRank} (${expectedRankName})`);
      } else {
        console.log(`✗ INCORRECT: Expected rank ${expectedRank} (${expectedRankName}), got ${rank}`);
      }
    }
  } else {
    console.log(`No pairs detected`);
    if (expectedRank !== null) {
      console.log(`✗ INCORRECT: Expected rank ${expectedRank}, but no pairs detected`);
    }
  }
  
  // Show detailed pattern matching
  const BIT_1 = bv.BIT_1;
  const BIT_2 = bv.BIT_2;
  const BIT_3 = bv.BIT_3;
  const BIT_4 = bv.BIT_4;
  
  const p1 = ((BIT_1 & hand) << 1n) & (BIT_2 & hand); // 1100
  const p2 = ((BIT_1 & hand) << 2n) & (BIT_3 & hand); // 1010
  const p3 = ((BIT_1 & hand) << 3n) & (BIT_4 & hand); // 1001
  const p4 = ((BIT_2 & hand) << 1n) & (BIT_3 & hand); // 0110
  const p5 = ((BIT_2 & hand) << 2n) & (BIT_4 & hand); // 0101
  const p6 = ((BIT_3 & hand) << 1n) & (BIT_4 & hand); // 0011
  
  console.log(`Pattern 1100: ${p1.toString(2).padStart(64, '0')}`);
  console.log(`Pattern 1010: ${p2.toString(2).padStart(64, '0')}`);
  console.log(`Pattern 1001: ${p3.toString(2).padStart(64, '0')}`);
  console.log(`Pattern 0110: ${p4.toString(2).padStart(64, '0')}`);
  console.log(`Pattern 0101: ${p5.toString(2).padStart(64, '0')}`);
  console.log(`Pattern 0011: ${p6.toString(2).padStart(64, '0')}`);
  
  const pairsRawCheck = p1 | p2 | p3 | p4 | p5 | p6;
  console.log(`OR of all patterns (before shifting): ${pairsRawCheck.toString(2).padStart(64, '0')}`);
  
  if (pairsRawCheck) {
    const shifted = (pairsRawCheck >> 1n) | (pairsRawCheck >> 2n) | (pairsRawCheck >> 3n);
    console.log(`After >> 1 | >> 2 | >> 3: ${shifted.toString(2).padStart(64, '0')}`);
    const masked = shifted & BIT_1;
    console.log(`After & BIT_1: ${masked.toString(2).padStart(64, '0')}`);
    const final = masked & ~1n;
    console.log(`After & ~1n (final before Ace check): ${final.toString(2).padStart(64, '0')}`);
    
    // Check Ace condition
    if (final & (1n << 12n)) {
      const aceCount = bv.countBits(hand & bv.RANK_MASKS[12]);
      console.log(`Ace bit detected, Ace count: ${aceCount}`);
      if (aceCount < 4) {
        const afterAceCheck = final & ~(1n << 12n);
        console.log(`After Ace check (removed): ${afterAceCheck.toString(2).padStart(64, '0')}`);
        console.log(`Final matches pairsGated? ${afterAceCheck === pairsGated ? 'YES' : 'NO'}`);
      } else {
        console.log(`Ace count >= 4, keeping Ace bit`);
        console.log(`Final matches pairsGated? ${final === pairsGated ? 'YES' : 'NO'}`);
      }
    } else {
      console.log(`Final matches pairsGated? ${final === pairsGated ? 'YES' : 'NO'}`);
    }
  } else {
    console.log(`No patterns matched, pairsRaw should be 0`);
  }
}

// Test cases
testBitPairs("Test 1: Simple pair - 4s 4h", ['4s', '4h'], 2); // Rank 2 = Four
testBitPairs("Test 2: Pair with other cards - As Kc 4s 4h", ['As', 'Kc', '4s', '4h'], 2);
testBitPairs("Test 3: Pair of 7s - 7s 7h", ['7s', '7h'], 5); // Rank 5 = Seven
testBitPairs("Test 4: Pair of 7s with other cards - As Kc 7s 7h", ['As', 'Kc', '7s', '7h'], 5);
testBitPairs("Test 5: Pair of Aces - As Ah", ['As', 'Ah'], 12); // Rank 12 = Ace
testBitPairs("Test 6: Pair of Aces with other cards - Kc Qd As Ah", ['Kc', 'Qd', 'As', 'Ah'], 12);
testBitPairs("Test 7: Two pairs - 4s 4h 7s 7h", ['4s', '4h', '7s', '7h'], null); // Should detect both
testBitPairs("Test 8: Pair with trips present - As Kc 7s 7h 7d 4s 4h", ['As', 'Kc', '7s', '7h', '7d', '4s', '4h'], 2); // Should detect pair of 4s, not 7s
testBitPairs("Test 9: Just trips - 7s 7h 7d", ['7s', '7h', '7d'], null); // Should not detect pairs
testBitPairs("Test 10: Pair of 2s - 2s 2h", ['2s', '2h'], 0); // Rank 0 = Two
testBitPairs("Test 11: Pair of Kings - Ks Kh", ['Ks', 'Kh'], 11); // Rank 11 = King

console.log("\n" + "=".repeat(80));
console.log("TESTING COMPLETE");
console.log("=".repeat(80));

