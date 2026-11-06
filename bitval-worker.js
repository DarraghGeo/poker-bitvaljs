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

// Worker message handler: per-matchup Monte Carlo batches, or exact-kernel
// batches (type: 'kernel').
self.onmessage = async function(e) {
  try {
    // Exact kernel over a batch of runouts / sampled boards
    // (BitVal._runKernelBatches): exact flop/turn and shared-board Monte Carlo.
    if (e.data.type === 'kernel') {
      const { work, boards } = e.data;
      if (work.perHand) { // compareRangeHands: per-hand arrays, transferred back
        const r = _bitval._runExhaustiveHands(work, boards, 0, boards.length >> 2);
        const transfer = [r.hw.buffer, r.ht.buffer, r.hl.buffer, r.vw.buffer, r.vt.buffer, r.vl.buffer];
        if (r.rows) { // byCard / byRunout rows for this batch of runouts
          for (const side of [r.rows.hero, r.rows.vill]) {
            side.cur = null;
            for (const g of [side.T, side.C]) if (g) transfer.push(g.win.buffer, g.tie.buffer, g.lose.buffer);
          }
        }
        self.postMessage({ success: true, result: r }, transfer);
      } else {
        self.postMessage({ success: true, result: _bitval._runExhaustive(work, boards, 0, boards.length >> 2) });
      }
      return;
    }

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

