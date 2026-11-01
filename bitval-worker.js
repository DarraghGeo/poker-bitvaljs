// Web Worker for parallel matchup evaluation
// Loads bitval.js to access BitVal class and dependencies
importScripts('./bitval.js');

/**
 * Deserializes setup data from main thread (converts string BigInts back to BigInt)
 */
function deserializeSetup(setupData) {
  const setup = {
    ...setupData,
    boardMask: BigInt(setupData.boardMask),
    deadCardsMask: BigInt(setupData.deadCardsMask),
    comboArray: setupData.comboArray ? setupData.comboArray.map(s => BigInt(s)) : null,
    // Keep other properties as-is
    boardCards: setupData.boardCards,
    numberOfBoardCards: setupData.numberOfBoardCards,
    iterations: setupData.iterations,
    isExhaustive: setupData.isExhaustive,
    numberOfCardsToDeal: setupData.numberOfCardsToDeal
  };
  return setup;
}

/**
 * Deserializes matchup data (converts string BigInt masks back to BigInt)
 */
function deserializeMatchup(matchupData) {
  return {
    ...matchupData,
    heroMask: BigInt(matchupData.heroMask),
    villainMask: BigInt(matchupData.villainMask)
  };
}

// Reused BitVal instance (holds the lookup tables; cheap to keep around).
const _bitval = new BitVal();

// Worker message handler. Workers handle the Monte Carlo path only; the
// exhaustive exact path runs on the main thread (see BitVal._compareRangeOptimized).
self.onmessage = async function(e) {
  try {
    const { matchups, setupData, workerId } = e.data;
    const setup = deserializeSetup(setupData);
    const results = [];

    for (const matchupData of matchups) {
      const matchup = deserializeMatchup(matchupData);
      // Same synchronous loop as the main thread (BitVal._evaluateMatchupSync).
      const result = _bitval._evaluateMatchupSync(matchup.heroMask, matchup.villainMask, setup);
      results.push({ key: matchup.key, validCount: matchup.validCount, ...result });
    }
    
    // Send results back to main thread
    self.postMessage({
      workerId,
      results,
      success: true
    });
  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      workerId: e.data.workerId,
      error: error.message,
      success: false
    });
  }
};

