const BitVal = require("../bitval.js");
const bitval = new BitVal();

console.log("=".repeat(80));
console.log("ACE KICKER DIAGNOSTIC TEST");
console.log("Testing hand evaluations with and without Ace kickers");
console.log("=".repeat(80));
console.log();

// Test cases: [hand description, cards with Ace, cards without Ace, board]
// Using varied ranks for made hands to test if Ace kicker issue is consistent
const testCases = [
  // Full House tests - varied ranks
  {
    name: "Full House (2s full of 3s) - Hero with Ace kicker",
    heroWithAce: ['As', 'Kc', '2s', '2h', '2d', '3s', '3h'],
    heroWithoutAce: ['Kc', 'Qc', '2s', '2h', '2d', '3s', '3h'],
    villain: ['8h', 'Qh', '2s', '2h', '2d', '3s', '3h'],
    board: ['2s', '2h', '2d', '3s', '3h']
  },
  {
    name: "Full House (Ks full of 5s) - Hero with Ace kicker",
    heroWithAce: ['As', 'Qc', 'Ks', 'Kh', 'Kd', '5s', '5h'],
    heroWithoutAce: ['Qc', 'Jc', 'Ks', 'Kh', 'Kd', '5s', '5h'],
    villain: ['8h', 'Jh', 'Ks', 'Kh', 'Kd', '5s', '5h'],
    board: ['Ks', 'Kh', 'Kd', '5s', '5h']
  },
  {
    name: "Full House (9s full of 6s) - Hero with Ace kicker",
    heroWithAce: ['As', 'Tc', '9s', '9h', '9d', '6s', '6h'],
    heroWithoutAce: ['Tc', '8c', '9s', '9h', '9d', '6s', '6h'],
    villain: ['7h', '8h', '9s', '9h', '9d', '6s', '6h'],
    board: ['9s', '9h', '9d', '6s', '6h']
  },
  // Trips tests - varied ranks
  {
    name: "Trips (4s) - Hero with Ace kicker",
    heroWithAce: ['As', 'Kc', '4s', '4h', '4d', '2s', '3h'],
    heroWithoutAce: ['Kc', 'Qc', '4s', '4h', '4d', '2s', '3h'],
    villain: ['8h', 'Qh', '4s', '4h', '4d', '2s', '3h'],
    board: ['4s', '4h', '4d', '2s', '3h']
  },
  {
    name: "Trips (Js) - Hero with Ace kicker",
    heroWithAce: ['As', 'Kc', 'Js', 'Jh', 'Jd', '5s', '6h'],
    heroWithoutAce: ['Kc', 'Qc', 'Js', 'Jh', 'Jd', '5s', '6h'],
    villain: ['8h', 'Qh', 'Js', 'Jh', 'Jd', '5s', '6h'],
    board: ['Js', 'Jh', 'Jd', '5s', '6h']
  },
  {
    name: "Trips (Ts) - Hero with Ace kicker",
    heroWithAce: ['As', 'Kc', 'Ts', 'Th', 'Td', '3s', '4h'],
    heroWithoutAce: ['Kc', 'Qc', 'Ts', 'Th', 'Td', '3s', '4h'],
    villain: ['8h', 'Qh', 'Ts', 'Th', 'Td', '3s', '4h'],
    board: ['Ts', 'Th', 'Td', '3s', '4h']
  },
  // Two Pair tests - varied ranks
  {
    name: "Two Pair (8s and 3s) - Hero with Ace kicker",
    heroWithAce: ['As', 'Kc', '8s', '8h', '3s', '3h', '2h'],
    heroWithoutAce: ['Kc', 'Qc', '8s', '8h', '3s', '3h', '2h'],
    villain: ['7h', 'Qh', '8s', '8h', '3s', '3h', '2h'],
    board: ['8s', '8h', '3s', '3h', '2h']
  },
  {
    name: "Two Pair (Qs and 6s) - Hero with Ace kicker",
    heroWithAce: ['As', 'Kc', 'Qs', 'Qh', '6s', '6h', '5h'],
    heroWithoutAce: ['Kc', 'Jc', 'Qs', 'Qh', '6s', '6h', '5h'],
    villain: ['9h', 'Jh', 'Qs', 'Qh', '6s', '6h', '5h'],
    board: ['Qs', 'Qh', '6s', '6h', '5h']
  },
  // Pair tests - varied ranks
  {
    name: "Pair (5s) - Hero with Ace kicker",
    heroWithAce: ['As', 'Kc', '5s', '5h', '2s', '3h', '4h'],
    heroWithoutAce: ['Kc', 'Qc', '5s', '5h', '2s', '3h', '4h'],
    villain: ['8h', 'Qh', '5s', '5h', '2s', '3h', '4h'],
    board: ['5s', '5h', '2s', '3h', '4h']
  },
  {
    name: "Pair (6s) - Hero with Ace kicker",
    heroWithAce: ['As', 'Kc', '6s', '6h', '2s', '3h', '4h'],
    heroWithoutAce: ['Kc', 'Qc', '6s', '6h', '2s', '3h', '4h'],
    villain: ['8h', 'Qh', '6s', '6h', '2s', '3h', '4h'],
    board: ['6s', '6h', '2s', '3h', '4h']
  },
  {
    name: "Pair (8s) - Hero with Ace kicker",
    heroWithAce: ['As', 'Kc', '8s', '8h', '2s', '3h', '4h'],
    heroWithoutAce: ['Kc', 'Qc', '8s', '8h', '2s', '3h', '4h'],
    villain: ['7h', 'Qh', '8s', '8h', '2s', '3h', '4h'],
    board: ['8s', '8h', '2s', '3h', '4h']
  },
  // High Card tests
  {
    name: "High Card - Hero with Ace kicker",
    heroWithAce: ['As', 'Kc', '7s', '4h', '2h', '3h', '5h'],
    heroWithoutAce: ['Kc', 'Qc', '7s', '4h', '2h', '3h', '5h'],
    villain: ['8h', 'Qh', '7s', '4h', '2h', '3h', '5h'],
    board: ['7s', '4h', '2h', '3h', '5h']
  }
];

testCases.forEach((testCase, index) => {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`TEST ${index + 1}: ${testCase.name}`);
  console.log("=".repeat(80));
  
  const boardMask = bitval.getBitMasked(testCase.board);
  
  // Test with Ace
  if (testCase.heroWithAce) {
    console.log("\n--- WITH ACE KICKER ---");
    const heroMask = bitval.getBitMasked(testCase.heroWithAce);
    const villainMask = bitval.getBitMasked(testCase.villain);
    const heroFullHand = heroMask | boardMask;
    const villainFullHand = villainMask | boardMask;
    
    const [heroEval, heroTiebreaker] = bitval.evaluate(heroFullHand);
    const [villainEval, villainTiebreaker] = bitval.evaluate(villainFullHand);
    
    bitval.debug(heroFullHand, villainFullHand, heroEval, villainEval);
  }
  
  // Test without Ace
  if (testCase.heroWithoutAce) {
    console.log("\n--- WITHOUT ACE KICKER ---");
    const heroMask = bitval.getBitMasked(testCase.heroWithoutAce);
    const villainMask = bitval.getBitMasked(testCase.villain);
    const heroFullHand = heroMask | boardMask;
    const villainFullHand = villainMask | boardMask;
    
    const [heroEval, heroTiebreaker] = bitval.evaluate(heroFullHand);
    const [villainEval, villainTiebreaker] = bitval.evaluate(villainFullHand);
    
    bitval.debug(heroFullHand, villainFullHand, heroEval, villainEval);
  }
  
  // Test villain with Ace if applicable
  if (testCase.villainWithAce) {
    console.log("\n--- VILLAIN WITH ACE KICKER ---");
    const heroMask = bitval.getBitMasked(testCase.hero);
    const villainMask = bitval.getBitMasked(testCase.villainWithAce);
    const heroFullHand = heroMask | boardMask;
    const villainFullHand = villainMask | boardMask;
    
    const [heroEval, heroTiebreaker] = bitval.evaluate(heroFullHand);
    const [villainEval, villainTiebreaker] = bitval.evaluate(villainFullHand);
    
    bitval.debug(heroFullHand, villainFullHand, heroEval, villainEval);
  }
  
  // Test villain without Ace if applicable
  if (testCase.villainWithoutAce) {
    console.log("\n--- VILLAIN WITHOUT ACE KICKER ---");
    const heroMask = bitval.getBitMasked(testCase.hero);
    const villainMask = bitval.getBitMasked(testCase.villainWithoutAce);
    const heroFullHand = heroMask | boardMask;
    const villainFullHand = villainMask | boardMask;
    
    const [heroEval, heroTiebreaker] = bitval.evaluate(heroFullHand);
    const [villainEval, villainTiebreaker] = bitval.evaluate(villainFullHand);
    
    bitval.debug(heroFullHand, villainFullHand, heroEval, villainEval);
  }
});

console.log("\n" + "=".repeat(80));
console.log("DIAGNOSTIC COMPLETE");
console.log("=".repeat(80));

