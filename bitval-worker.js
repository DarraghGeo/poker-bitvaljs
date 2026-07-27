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
  const matchupDeadMask = heroMask | villainMask; // Only matchup-level dead cards (excludes setup.deadCardsMask)
  
  // Initialize random number generator for Monte Carlo (not needed for exhaustive)
  if (!setup.isExhaustive) {
    bitval.xorShift = new XorShift32();
  }
  
  // BigInt-free (Number) hot loop, mirroring BitVal._evaluateMatchup. Cards are
  // four 13-bit suit rank masks; bitval._eval7 does the evaluation with no BigInt.
  let iterations = setup.iterations;
  const heroSuits = bitval._suitsFromBigMask(heroMask);
  const villainSuits = bitval._suitsFromBigMask(villainMask);
  const boardBaseSuits = bitval._suitsFromBigMask(setup.boardMask);
  const hs0 = heroSuits[0], hs1 = heroSuits[1], hs2 = heroSuits[2], hs3 = heroSuits[3];
  const vs0 = villainSuits[0], vs1 = villainSuits[1], vs2 = villainSuits[2], vs3 = villainSuits[3];
  const bb0 = boardBaseSuits[0], bb1 = boardBaseSuits[1], bb2 = boardBaseSuits[2], bb3 = boardBaseSuits[3];

  let comboSuits = null;
  let pool = null, poolLen = 0;
  const nDeal = setup.numberOfCardsToDeal;
  if (setup.isExhaustive) {
    // Use comboArray from setup if available, otherwise compute it.
    let comboArray = (setup.comboArray && setup.comboArray.length > 0)
      ? setup.comboArray
      : bitval._getCombinations(bitval._getAvailableCardMasksByLookUp(deadMask), nDeal);
    comboSuits = comboArray.map(m => bitval._suitsFromBigMask(m));
    iterations = comboSuits.length;
  } else {
    pool = bitval._availableSuitCards(deadMask);
    poolLen = pool.length;
  }

  // Main evaluation loop
  for (let i = 0; i < iterations; i++) {
    let d0, d1, d2, d3;
    if (comboSuits) {
      const cs = comboSuits[i];
      d0 = bb0 | cs[0]; d1 = bb1 | cs[1]; d2 = bb2 | cs[2]; d3 = bb3 | cs[3];
    } else {
      d0 = bb0; d1 = bb1; d2 = bb2; d3 = bb3;
      for (let kk = 0; kk < nDeal; kk++) {
        const j = kk + bitval.xorShift.next(poolLen - kk);
        const tmp = pool[kk]; pool[kk] = pool[j]; pool[j] = tmp;
        const sr = pool[kk];
        if (sr.suit === 0) d0 |= sr.bit;
        else if (sr.suit === 1) d1 |= sr.bit;
        else if (sr.suit === 2) d2 |= sr.bit;
        else d3 |= sr.bit;
      }
    }
    const hE = bitval._eval7(hs0 | d0, hs1 | d1, hs2 | d2, hs3 | d3);
    const vE = bitval._eval7(vs0 | d0, vs1 | d1, vs2 | d2, vs3 | d3);
    if (hE > vE) win++;
    else if (vE > hE) lose++;
    else tie++;
  }

  return { matchupWin: win, matchupTie: tie, matchupLose: lose };
}

// Worker message handler
self.onmessage = async function(e) {
  try {
    const { matchups, setupData, workerId } = e.data;
    
    // Deserialize setup
    const setup = deserializeSetup(setupData);
    
    // Create BitVal instance for this worker (reused for all matchups).
    // Per-eval cache removed (see BitVal._getCachedEvaluation); grouping does the work.
    const bitval = new BitVal();
    const evalCache = null;
    
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

