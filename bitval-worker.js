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

/**
 * Evaluates a single matchup in the worker context
 * Similar to _evaluateMatchup but without progress callbacks
 */
async function evaluateMatchupInWorker(heroMask, villainMask, setup, evalCache, cacheInfo, bitval) {
  let win = 0, tie = 0, lose = 0;
  const deadMask = heroMask | villainMask | setup.deadCardsMask;
  
  // Initialize random number generator for Monte Carlo (not needed for exhaustive)
  if (!setup.isExhaustive) {
    bitval.xorShift = new XorShift32();
  }
  
  // Prepare for exhaustive enumeration if applicable
  let comboArray = null;
  let iterations = setup.iterations;
  if (setup.isExhaustive) {
    // Use comboArray from setup if available, otherwise compute it
    if (setup.comboArray && setup.comboArray.length > 0) {
      comboArray = setup.comboArray;
      iterations = comboArray.length;
    } else {
      // Compute comboArray if not provided
      const availableMasks = bitval._getAvailableCardMasksByLookUp(deadMask);
      comboArray = bitval._getCombinations(availableMasks, setup.numberOfCardsToDeal);
      iterations = comboArray.length;
    }
  }
  
  // Main evaluation loop
  for (let i = 0; i < iterations; i++) {
    // Generate board: use pre-computed combo for exhaustive, or deal randomly
    const board = setup.isExhaustive 
      ? setup.boardMask | comboArray[i]
      : bitval.deal(setup.boardMask, deadMask, setup.numberOfCardsToDeal) | setup.boardMask;
    
    // Evaluate both hands
    let hEval, hKick, vEval, vKick;
    if (cacheInfo && evalCache) {
      [hEval, hKick] = bitval._getCachedEvaluation(cacheInfo.heroKey, cacheInfo.heroHand, board, evalCache);
      [vEval, vKick] = bitval._getCachedEvaluation(cacheInfo.villainKey, cacheInfo.villainHand, board, evalCache);
    } else {
      [hEval, hKick] = bitval.evaluate(heroMask | board);
      [vEval, vKick] = bitval.evaluate(villainMask | board);
    }
    
    // Compare and accumulate results
    if (hEval > vEval || (hEval === vEval && hKick > vKick)) {
      win++;
    } else if (vEval > hEval || (vEval === hEval && vKick > hKick)) {
      lose++;
    } else {
      tie++;
    }
  }
  
  return { matchupWin: win, matchupTie: tie, matchupLose: lose };
}

// Worker message handler
self.onmessage = async function(e) {
  try {
    const { matchups, setupData, workerId } = e.data;
    
    // Deserialize setup
    const setup = deserializeSetup(setupData);
    
    // Create BitVal instance and cache for this worker (reused for all matchups)
    const bitval = new BitVal();
    const evalCache = new FastestAutoClearingCache(16000000);
    
    const results = [];
    
    // Evaluate each matchup in the batch
    for (const matchupData of matchups) {
      const matchup = deserializeMatchup(matchupData);
      
      // Prepare cache info if available
      const cacheInfo = matchup.heroKey ? {
        heroKey: matchup.heroKey,
        heroHand: matchup.heroHand,
        villainKey: matchup.villainKey,
        villainHand: matchup.villainHand
      } : null;
      
      // Evaluate matchup
      const result = await evaluateMatchupInWorker(
        matchup.heroMask,
        matchup.villainMask,
        setup,
        evalCache,
        cacheInfo,
        bitval
      );
      
      results.push({
        key: matchup.key,
        validCount: matchup.validCount,
        ...result
      });
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

