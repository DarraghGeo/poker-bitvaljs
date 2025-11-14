const BitVal = require("../bitval.js");
const BitValDebugger = require("./BitValDebugger.js");
const testCases = require("./bitval_test_cases.js");

// Initialize BitVal and Debugger
const bitval = new BitVal();
const bitvalDebugger = new BitValDebugger(bitval);

// Example 1: Run a single test case with verbose output
console.log("EXAMPLE 1: Single Test Case (Verbose)");
console.log("=".repeat(80));
const testCase = testCases[0];
const results = bitvalDebugger.compare(
  testCase.hero,
  testCase.villain,
  testCase.board,
  testCase.deadCards,
  testCase.referenceData,
  true  // verbose = true
);

// Example 2: Run a single test case with non-verbose output (only discrepancies)
console.log("\n\n");
console.log("EXAMPLE 2: Single Test Case (Non-Verbose)");
console.log("=".repeat(80));
const results2 = bitvalDebugger.compare(
  testCase.hero,
  testCase.villain,
  testCase.board,
  testCase.deadCards,
  testCase.referenceData,
  false  // verbose = false
);

// Example 3: Iterate through all test cases
console.log("\n\n");
console.log("EXAMPLE 3: Running All Test Cases");
console.log("=".repeat(80));
console.log();

testCases.forEach((testCase, index) => {
  console.log(`\nTest Case ${index + 1}: ${testCase.description}`);
  console.log("-".repeat(80));
  
  const results = bitvalDebugger.compare(
    testCase.hero,
    testCase.villain,
    testCase.board,
    testCase.deadCards,
    testCase.referenceData,
    false  // Set to true for verbose output
  );

  // Print summary of discrepancies
  if (results.turn.discrepancies.length > 0) {
    console.log(`Turn Cards - ${results.turn.discrepancies.length} discrepancies found:`);
    results.turn.discrepancies.forEach(d => {
      console.log(`  ${d.card}: ${d.actual.toFixed(2)}% vs ${d.expected.toFixed(2)}% (diff: ${d.difference >= 0 ? '+' : ''}${d.difference.toFixed(2)}%)`);
    });
  }

  if (results.river.discrepancies.length > 0) {
    console.log(`River Combinations - ${results.river.discrepancies.length} discrepancies found:`);
    results.river.discrepancies.slice(0, 10).forEach(d => {  // Show first 10
      console.log(`  ${d.combo}: ${d.actual.toFixed(2)}% vs ${d.expected.toFixed(2)}% (diff: ${d.difference >= 0 ? '+' : ''}${d.difference.toFixed(2)}%)`);
    });
    if (results.river.discrepancies.length > 10) {
      console.log(`  ... and ${results.river.discrepancies.length - 10} more`);
    }
  }

  if (results.overall) {
    console.log(`Overall Equity: ${results.overall.actual.toFixed(2)}% vs ${results.overall.expected.toFixed(2)}% (diff: ${results.overall.difference >= 0 ? '+' : ''}${results.overall.difference.toFixed(2)}%)`);
  }
});

// Example 4: Custom test case (not from library)
console.log("\n\n");
console.log("EXAMPLE 4: Custom Test Case");
console.log("=".repeat(80));

const customReferenceData = {
  turn: {
    '7d': 72.73,
    '7h': 72.73,
    'Tc': 86.36,
    'Td': 86.36
  },
  river: {
    '7d 2c': 100.0,
    '7d 2d': 100.0,
    '7h 2c': 100.0,
    '7h 2d': 100.0
  }
};

const customResults = bitvalDebugger.compare(
  ['Th', '7c'],
  ['Qs', 'Qh'],
  ['As', 'Ts', 'Jc'],
  [],
  customReferenceData,
  true
);

