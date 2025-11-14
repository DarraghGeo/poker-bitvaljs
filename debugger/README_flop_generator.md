# Flop Test Generator

This script generates all possible flops for a given matchup and compares equities between a reference poker evaluator (poker-evaluator npm package) and bitval.js to identify discrepancies.

## Usage

### Sample Mode (Quick Test)
```bash
node debugger/generate_flop_tests.js --sample
```
Processes the first 100 flops to quickly identify issues. Takes ~1-2 minutes.

### Full Mode (Complete Analysis)
```bash
node debugger/generate_flop_tests.js
```
Processes all 17,296 possible flops. Takes ~87 minutes.

## Features

- **Exhaustive Enumeration**: Uses reference evaluator to calculate exact equity for each flop
- **Progress Saving**: Automatically saves progress every 50 flops to `debugger/flop_test_progress.json`
- **Resume Capability**: Can resume from last saved position if interrupted
- **Discrepancy Detection**: Identifies flops where equity differs by >0.5%
- **Output Formats**: 
  - Console output with top discrepancies
  - JSON file with all discrepancies (`debugger/flop_discrepancies.json`)
  - Test case format ready for `bitval_test_cases.js`

## Current Test Case

- **Hero**: As Kc
- **Villain**: 8h Qh
- **Total Flops**: 17,296 (C(48,3) - all 3-card combinations from remaining 48 cards)

## Output Files

- `debugger/flop_test_progress.json` - Progress tracking (updated every 50 flops)
- `debugger/flop_discrepancies.json` - Complete list of all discrepancies with details

## Early Results (Sample of 100 flops)

- **Discrepancies Found**: 12 (12% of flops)
- **Extrapolated**: ~2,076 expected discrepancies out of 17,296 flops
- **Pattern**: Large discrepancies (4.55%) found with flops containing "Ad Ah" (two Aces)

## Next Steps

1. Run full analysis: `node debugger/generate_flop_tests.js`
2. Review `debugger/flop_discrepancies.json` for patterns
3. Add high-discrepancy flops to `bitval_test_cases.js` for debugging
4. Fix identified issues in `bitval.js`
5. Re-run to verify fixes

