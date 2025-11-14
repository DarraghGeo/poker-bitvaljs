const BitVal = require("../bitval.js");
const BitValDebugger = require("./BitValDebugger.js");
const testCases = require("./bitval_test_cases.js");

// Initialize BitVal and Debugger
const bitval = new BitVal();
const bitvalDebugger = new BitValDebugger(bitval);

// Example 1: Run a single test case with verbose output (incremental mode)
console.log("EXAMPLE 1: Single Test Case (Verbose, Incremental)");
console.log("=".repeat(80));
const testCase = testCases[0];
const results = bitvalDebugger.compare(
  testCase.hero,
  testCase.villain,
  testCase.board,
  testCase.deadCards,
  { overallEquity: testCase.overallEquity, ...testCase.referenceData },
  true,  // verbose = true
  false  // comprehensive = false (incremental mode)
);

// Example 2: Run a single test case with comprehensive mode
console.log("\n\n");
console.log("EXAMPLE 2: Single Test Case (Comprehensive Mode)");
console.log("=".repeat(80));
const results2 = bitvalDebugger.compare(
  testCase.hero,
  testCase.villain,
  testCase.board,
  testCase.deadCards,
  { overallEquity: testCase.overallEquity, ...testCase.referenceData },
  true,  // verbose = true
  true   // comprehensive = true (test everything)
);

// Example 3: Iterate through all test cases
console.log("\n\n");
console.log("EXAMPLE 3: Running All Test Cases (Incremental Mode)");
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
    { overallEquity: testCase.overallEquity, ...testCase.referenceData },
    false,  // verbose = false
    false   // comprehensive = false (incremental mode)
  );

  // Print overall equity result
  if (results.overall) {
    if (results.overall.expected !== null && results.overall.expected !== undefined) {
      const tolerance = testCase.board.length === 0 ? 1.5 : 0;
      const diff = Math.abs(results.overall.difference);
      const roundedDiff = Math.round(diff * 100) / 100;
      const status = roundedDiff <= tolerance ? '✓' : '✗';
      const GREEN = '\x1b[32m';
      const BRIGHT_RED = '\x1b[91m';
      const RESET = '\x1b[0m';
      const lineColor = status === '✓' ? GREEN : BRIGHT_RED;
      console.log(`${lineColor}Overall Equity: ${results.overall.actual.toFixed(2)}% (Expected: ${results.overall.expected.toFixed(2)}%, Diff: ${results.overall.difference >= 0 ? '+' : ''}${results.overall.difference.toFixed(2)}%, Tol: ${tolerance.toFixed(2)}%)${RESET}`);
    } else {
      console.log(`Overall Equity: ${results.overall.actual.toFixed(2)}% (no reference data)`);
    }
  }

  // Print flop/turn/river summary
  if (results.summary) {
    if (results.summary.flopsFailed > 0 || results.summary.turnsFailed > 0 || results.summary.riversFailed > 0) {
      console.log(`⚠ Failures - Flops: ${results.summary.flopsFailed}, Turns: ${results.summary.turnsFailed}, Rivers: ${results.summary.riversFailed}`);
    }
  }
});

// Example 4: Custom test case with hierarchical structure
console.log("\n\n");
console.log("EXAMPLE 4: Custom Test Case (Hierarchical Structure)");
console.log("=".repeat(80));

const customReferenceData = {
  overallEquity: 15.16,
  "As Jc Ts": [16.06, {
    '7d': [72.73, {
      '2c': [100.0],
      '2d': [100.0]
    }],
    'Tc': [86.36, {}]
  }]
};

const customResults = bitvalDebugger.compare(
  ['Th', '7c'],
  ['Qs', 'Qh'],
  [],
  [],
  customReferenceData,
  true,
  false  // incremental mode
);
