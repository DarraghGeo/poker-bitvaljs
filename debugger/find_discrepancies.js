const BitVal = require("../bitval.js");
const evaluator = require("poker-evaluator");
const fs = require("fs");
const path = require("path");

// Initialize BitVal
const bitval = new BitVal();

// Constants
const CSV_FILE = path.join(__dirname, "discrepancies.csv");
const KICKER_MASK = ((1n << 26n) - 1n) & ~((1n << 13n) - 1n); // bits 13-25

// Parse command line arguments
function parseArgs() {
  const args = {
    preflops: 1000,
    flops: 5000,
    flopsExplicit: false, // Track if --flops was explicitly provided
    tolerance: 1.5,
    retest: null,
    retestClean: false,
    dissect: null,
    list: null,
    help: false
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--preflops" && i + 1 < process.argv.length) {
      args.preflops = parseInt(process.argv[++i], 10);
    } else if (arg === "--flops" && i + 1 < process.argv.length) {
      args.flops = parseInt(process.argv[++i], 10);
      args.flopsExplicit = true;
    } else if (arg === "--tolerance" && i + 1 < process.argv.length) {
      args.tolerance = parseFloat(process.argv[++i]);
    } else if (arg === "--retest") {
      // --retest can be used with or without an argument
      if (i + 1 < process.argv.length && !process.argv[i + 1].startsWith('--')) {
        args.retest = process.argv[++i];
      } else {
        args.retest = "all"; // Default to all if no argument provided
      }
    } else if (arg === "--clean") {
      // --clean flag for retest mode
      args.retestClean = true;
    } else if (arg === "--dissect" && i + 1 < process.argv.length) {
      args.dissect = parseInt(process.argv[++i], 10);
    } else if (arg === "--list") {
      // --list can be used with or without an argument
      if (i + 1 < process.argv.length && !process.argv[i + 1].startsWith('--')) {
        args.list = process.argv[++i];
      } else {
        args.list = ""; // Empty string means use default (first 25)
      }
    }
  }

  return args;
}

// Get all 52 cards
function getAllCards() {
  const cards = [];
  const suits = ['s', 'h', 'd', 'c'];
  const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  for (const rank of ranks) {
    for (const suit of suits) {
      cards.push(rank + suit);
    }
  }
  return cards;
}

// Shuffle array using Fisher-Yates algorithm
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate random hero/villain hands
function generateRandomHand() {
  const deck = shuffleArray(getAllCards());
  return {
    hero: [deck[0], deck[1]],
    villain: [deck[2], deck[3]]
  };
}

// Get available cards (excluding dead cards)
function getAvailableCards(deadCards) {
  const allCards = getAllCards();
  return allCards.filter(card => !deadCards.includes(card));
}

// Generate random flops
function generateRandomFlops(hero, villain, board, numFlops) {
  const deadCards = [...hero, ...villain, ...board];
  const availableCards = getAvailableCards(deadCards);
  const flops = [];

  while (flops.length < numFlops) {
    const shuffledDeck = shuffleArray(availableCards);
    const cardsPerFlop = 3;
    const maxFlopsFromDeck = Math.floor(shuffledDeck.length / cardsPerFlop);
    const flopsNeeded = numFlops - flops.length;
    const flopsToDeal = Math.min(maxFlopsFromDeck, flopsNeeded);

    for (let i = 0; i < flopsToDeal; i++) {
      const startIdx = i * cardsPerFlop;
      flops.push([
        shuffledDeck[startIdx],
        shuffledDeck[startIdx + 1],
        shuffledDeck[startIdx + 2]
      ]);
    }
  }

  return flops;
}

// Get all possible turn cards
function getAllTurns(hero, villain, board) {
  const deadCards = [...hero, ...villain, ...board];
  return getAvailableCards(deadCards);
}

// Get all possible river cards
function getAllRivers(hero, villain, board, turn) {
  const deadCards = [...hero, ...villain, ...board, turn];
  return getAvailableCards(deadCards);
}

// Calculate equity using bitval (exhaustive for small boards, simulation for pre-flop)
function calculateEquityBitval(hero, villain, board, iterations = 1) {
  // For complete boards (5 cards), use direct evaluation
  if (board.length === 5) {
    const heroFullHand = bitval.getBitMasked([...hero, ...board]);
    const villainFullHand = bitval.getBitMasked([...villain, ...board]);
    const [heroEval, heroKickers] = bitval.evaluate(heroFullHand);
    const [villainEval, villainKickers] = bitval.evaluate(villainFullHand);
    
    // Compare evaluations (including kickers if needed)
    let heroValue = heroEval;
    let villainValue = villainEval;
    
    if (heroEval === villainEval && heroKickers && villainKickers) {
      heroValue = heroKickers;
      villainValue = villainKickers;
    }
    
    if (heroValue > villainValue) {
      return 100.0;
    } else if (villainValue > heroValue) {
      return 0.0;
    } else {
      return 50.0;
    }
  }
  
  // For flops (3 cards), use exhaustive enumeration (need 2 more cards = turn + river)
  if (board.length === 3) {
    const remainingCards = getAvailableCards([...hero, ...villain, ...board]);
    let heroWins = 0;
    let villainWins = 0;
    let ties = 0;
    let total = 0;
    
    // Enumerate all turn + river combinations
    for (let i = 0; i < remainingCards.length; i++) {
      for (let j = i + 1; j < remainingCards.length; j++) {
        const turn = remainingCards[i];
        const river = remainingCards[j];
        const fullBoard = [...board, turn, river];
        
        const heroFullHand = bitval.getBitMasked([...hero, ...fullBoard]);
        const villainFullHand = bitval.getBitMasked([...villain, ...fullBoard]);
        const [heroEval, heroKickers] = bitval.evaluate(heroFullHand);
        const [villainEval, villainKickers] = bitval.evaluate(villainFullHand);
        
        // Compare evaluations (including kickers if needed)
        let heroValue = heroEval;
        let villainValue = villainEval;
        
        if (heroEval === villainEval && heroKickers && villainKickers) {
          heroValue = heroKickers;
          villainValue = villainKickers;
        }
        
        if (heroValue > villainValue) {
          heroWins++;
        } else if (villainValue > heroValue) {
          villainWins++;
        } else {
          ties++;
        }
        total++;
      }
    }
    
    const equity = ((heroWins + ties / 2) / total) * 100;
    return equity;
  }
  
  // For turns (4 cards), use exhaustive enumeration (need 1 more card = river)
  if (board.length === 4) {
    const remainingCards = getAvailableCards([...hero, ...villain, ...board]);
    let heroWins = 0;
    let villainWins = 0;
    let ties = 0;
    let total = 0;
    
    // Enumerate all river cards
    for (const river of remainingCards) {
      const fullBoard = [...board, river];
      
      const heroFullHand = bitval.getBitMasked([...hero, ...fullBoard]);
      const villainFullHand = bitval.getBitMasked([...villain, ...fullBoard]);
      const [heroEval, heroKickers] = bitval.evaluate(heroFullHand);
      const [villainEval, villainKickers] = bitval.evaluate(villainFullHand);
      
      // Compare evaluations (including kickers if needed)
      let heroValue = heroEval;
      let villainValue = villainEval;
      
      if (heroEval === villainEval && heroKickers && villainKickers) {
        heroValue = heroKickers;
        villainValue = villainKickers;
      }
      
      if (heroValue > villainValue) {
        heroWins++;
      } else if (villainValue > heroValue) {
        villainWins++;
      } else {
        ties++;
      }
      total++;
    }
    
    const equity = ((heroWins + ties / 2) / total) * 100;
    return equity;
  }
  
  // For pre-flop (0 cards), use simulation with reduced iterations for speed
  // Pre-flop needs 5 cards, so exhaustive would be too slow
  // Default to 1 iteration for fastest screening (just a quick check)
  const result = bitval.simulate(iterations, 5, hero, villain, board, []);
  const equity = ((result.win + result.tie / 2) / (result.win + result.lose + result.tie)) * 100;
  return equity;
}

// Calculate equity using poker-evaluator (exhaustive enumeration)
function calculateEquityReference(heroCards, villainCards, boardCards) {
  const remainingCards = [];
  const suits = ['s', 'h', 'd', 'c'];
  const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

  for (const rank of ranks) {
    for (const suit of suits) {
      const card = rank + suit;
      if (!heroCards.includes(card) && !villainCards.includes(card) && !boardCards.includes(card)) {
        remainingCards.push(card);
      }
    }
  }

  let heroWins = 0;
  let villainWins = 0;
  let ties = 0;
  let total = 0;

  const cardsNeeded = 5 - boardCards.length;
  if (cardsNeeded === 0) {
    // Board is complete, just compare hands
    const heroHand = evaluator.evalHand(heroCards.concat(boardCards));
    const villainHand = evaluator.evalHand(villainCards.concat(boardCards));

    if (heroHand.value > villainHand.value) {
      return 100.0;
    } else if (villainHand.value > heroHand.value) {
      return 0.0;
    } else {
      return 50.0;
    }
  } else if (cardsNeeded === 1) {
    // Need 1 card (river)
    for (let i = 0; i < remainingCards.length; i++) {
      const river = remainingCards[i];
      const fullBoard = [...boardCards, river];

      const heroHand = evaluator.evalHand(heroCards.concat(fullBoard));
      const villainHand = evaluator.evalHand(villainCards.concat(fullBoard));

      if (heroHand.value > villainHand.value) {
        heroWins++;
      } else if (villainHand.value > heroHand.value) {
        villainWins++;
      } else {
        ties++;
      }
      total++;
    }
  } else if (cardsNeeded === 2) {
    // Need 2 cards (turn and river)
    for (let i = 0; i < remainingCards.length; i++) {
      for (let j = i + 1; j < remainingCards.length; j++) {
        const turn = remainingCards[i];
        const river = remainingCards[j];
        const fullBoard = [...boardCards, turn, river];

        const heroHand = evaluator.evalHand(heroCards.concat(fullBoard));
        const villainHand = evaluator.evalHand(villainCards.concat(fullBoard));

        if (heroHand.value > villainHand.value) {
          heroWins++;
        } else if (villainHand.value > heroHand.value) {
          villainWins++;
        } else {
          ties++;
        }
        total++;
      }
    }
  } else {
    // Need 3+ cards (flop, turn, river)
    for (let i = 0; i < remainingCards.length; i++) {
      for (let j = i + 1; j < remainingCards.length; j++) {
        for (let k = j + 1; k < remainingCards.length; k++) {
          const flop = [remainingCards[i], remainingCards[j], remainingCards[k]];
          const remainingAfterFlop = remainingCards.filter(c => !flop.includes(c));

          for (let m = 0; m < remainingAfterFlop.length; m++) {
            for (let n = m + 1; n < remainingAfterFlop.length; n++) {
              const turn = remainingAfterFlop[m];
              const river = remainingAfterFlop[n];

              const fullBoard = [...flop, turn, river];
              const heroHand = evaluator.evalHand(heroCards.concat(fullBoard));
              const villainHand = evaluator.evalHand(villainCards.concat(fullBoard));

              if (heroHand.value > villainHand.value) {
                heroWins++;
              } else if (villainHand.value > heroHand.value) {
                villainWins++;
              } else {
                ties++;
              }
              total++;
            }
          }
        }
      }
    }
  }

  const heroEquity = ((heroWins + ties / 2) / total) * 100;
  return heroEquity;
}

// Round equity to 2 decimal places
function roundEquity(equity) {
  return Math.round(equity * 100) / 100;
}

// Get hand ranking from bitval
function evaluateHandRankingBitval(heroCards, villainCards, boardCards) {
  const heroFullHand = bitval.getBitMasked([...heroCards, ...boardCards]);
  const villainFullHand = bitval.getBitMasked([...villainCards, ...boardCards]);
  const [heroEval, heroKickers] = bitval.evaluate(heroFullHand);
  const [villainEval, villainKickers] = bitval.evaluate(villainFullHand);
  
  return {
    hero: {
      eval: heroEval,
      kickers: heroKickers || 0n,
      strength: bitval.getHandStrengthFromMask(heroEval)
    },
    villain: {
      eval: villainEval,
      kickers: villainKickers || 0n,
      strength: bitval.getHandStrengthFromMask(villainEval)
    }
  };
}

// Get hand ranking from poker-evaluator
function evaluateHandRankingReference(heroCards, villainCards, boardCards) {
  const heroHand = evaluator.evalHand(heroCards.concat(boardCards));
  const villainHand = evaluator.evalHand(villainCards.concat(boardCards));
  
  // Map poker-evaluator hand types to bitval hand strengths
  const handTypeMap = {
    1: "High Card",
    2: "Pair",
    3: "Two Pair",
    4: "Trips",
    5: "Straight",
    6: "Flush",
    7: "Full House",
    8: "Quads",
    9: "Straight Flush"
  };

  return {
    hero: {
      value: heroHand.value,
      handType: heroHand.handType,
      strength: handTypeMap[heroHand.handType] || "Unknown"
    },
    villain: {
      value: villainHand.value,
      handType: villainHand.handType,
      strength: handTypeMap[villainHand.handType] || "Unknown"
    }
  };
}

// Compare hand rankings
function compareHandRankings(bitvalRanking, referenceRanking) {
  // Compare hand strengths (type)
  const heroStrengthMatch = bitvalRanking.hero.strength === referenceRanking.hero.strength;
  const villainStrengthMatch = bitvalRanking.villain.strength === referenceRanking.villain.strength;
  
  // Compare winner (who wins) - need to consider kickers if evals are equal
  let bitvalHeroValue = bitvalRanking.hero.eval;
  let bitvalVillainValue = bitvalRanking.villain.eval;
  
  // If evals are equal, use kickers
  if (bitvalRanking.hero.eval === bitvalRanking.villain.eval) {
    const heroKickers = bitvalRanking.hero.kickers || 0n;
    const villainKickers = bitvalRanking.villain.kickers || 0n;
    if (heroKickers || villainKickers) {
      bitvalHeroValue = heroKickers;
      bitvalVillainValue = villainKickers;
    }
  }
  
  const bitvalHeroWins = bitvalHeroValue > bitvalVillainValue;
  const bitvalTie = bitvalHeroValue === bitvalVillainValue;
  
  const referenceHeroWins = referenceRanking.hero.value > referenceRanking.villain.value;
  const referenceTie = referenceRanking.hero.value === referenceRanking.villain.value;
  
  const winnerMatch = (bitvalHeroWins === referenceHeroWins) && (bitvalTie === referenceTie);
  
  return {
    heroStrengthMatch,
    villainStrengthMatch,
    winnerMatch,
    match: heroStrengthMatch && villainStrengthMatch && winnerMatch
  };
}

// Determine failure type
function determineFailureType(equityDiff, rankingMatch, tolerance) {
  const equityFails = Math.abs(equityDiff) > tolerance;
  const rankingFails = !rankingMatch;
  
  if (equityFails && rankingFails) {
    return "both";
  } else if (rankingFails) {
    return "ranking";
  } else if (equityFails) {
    return "equity";
  }
  return "";
}

// Read CSV file
function readCSV() {
  if (!fs.existsSync(CSV_FILE)) {
    return [];
  }

  const content = fs.readFileSync(CSV_FILE, 'utf-8');
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(',');
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((header, idx) => {
      let value = values[idx] || '';
      value = value.trim().replace(/^"|"$/g, '');
      
      // Parse specific types
      if (header === 'hand_id') {
        row[header] = parseInt(value, 10);
      } else if (header === 'pass') {
        row[header] = value === 'true';
      } else if (['preflop_diff', 'max_flop_diff', 'max_turn_diff', 'max_river_diff', 'total_discrepancies'].includes(header)) {
        row[header] = parseFloat(value) || 0;
      } else if (['flop_count', 'turn_count', 'river_count'].includes(header)) {
        row[header] = parseInt(value, 10) || 0;
      } else {
        row[header] = value;
      }
    });
    rows.push(row);
  }

  return rows;
}

// Write CSV file
function writeCSV(rows) {
  if (rows.length === 0) {
    return;
  }

  const headers = ['hand_id', 'hero', 'villain', 'board', 'pass', 'failure_type', 'preflop_diff', 'max_flop_diff', 'max_turn_diff', 'max_river_diff', 'flop_count', 'turn_count', 'river_count', 'total_discrepancies'];
  const lines = [headers.join(',')];

  for (const row of rows) {
    const values = headers.map(header => {
      const value = row[header] !== undefined ? row[header] : '';
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    lines.push(values.join(','));
  }

  fs.writeFileSync(CSV_FILE, lines.join('\n') + '\n');
}

// Append to CSV file
function appendToCSV(row) {
  const fileExists = fs.existsSync(CSV_FILE);
  const headers = ['hand_id', 'hero', 'villain', 'board', 'pass', 'failure_type', 'preflop_diff', 'max_flop_diff', 'max_turn_diff', 'max_river_diff', 'flop_count', 'turn_count', 'river_count', 'total_discrepancies'];
  
  if (!fileExists) {
    fs.writeFileSync(CSV_FILE, headers.join(',') + '\n');
  }

  const values = headers.map(header => {
    const value = row[header] !== undefined ? row[header] : '';
    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  });

  fs.appendFileSync(CSV_FILE, values.join(',') + '\n');
}

// Update CSV row by hand_id
function updateCSVRow(handId, updates) {
  const rows = readCSV();
  const index = rows.findIndex(row => row.hand_id === handId);
  
  if (index >= 0) {
    Object.assign(rows[index], updates);
    writeCSV(rows);
    return true;
  }
  
  return false;
}

// Delete CSV row by hand_id
function deleteCSVRow(handId) {
  const rows = readCSV();
  const filtered = rows.filter(row => row.hand_id !== handId);
  
  if (filtered.length < rows.length) {
    writeCSV(filtered);
    return true;
  }
  
  return false;
}

// Get next hand_id
function getNextHandId() {
  const rows = readCSV();
  if (rows.length === 0) {
    return 1;
  }
  return Math.max(...rows.map(row => row.hand_id)) + 1;
}

// Parse hand_id range
function parseIdRange(idStr) {
  if (idStr === 'all') {
    return null; // null means all
  }
  
  if (idStr.includes('-')) {
    const [start, end] = idStr.split('-').map(n => parseInt(n, 10));
    return { start, end };
  }
  
  return { start: parseInt(idStr, 10), end: parseInt(idStr, 10) };
}

// Test a single hand through all phases
function testHand(hero, villain, preflopTolerance, flopTolerance, numFlops, verbose = false, progressCallback = null) {
  const results = {
    preflopDiff: 0,
    maxFlopDiff: 0,
    maxTurnDiff: 0,
    maxRiverDiff: 0,
    flopCount: 0,
    turnCount: 0,
    riverCount: 0,
    totalDiscrepancies: 0,
    failureType: "",
    discrepantRivers: [],
    earlyExit: false, // Flag for early exit
    // Track totals tested
    flopsTested: 0,
    turnsTested: 0,
    riversTested: 0,
    // Track total differences for average calculation
    flopTotalDiff: 0,
    turnTotalDiff: 0,
    riverTotalDiff: 0
  };

  // Phase 1: Pre-flop testing
  if (verbose) console.log(`  Testing pre-flop...`);
  // Use minimal iterations for pre-flop screening (fastest possible - just a quick check)
  // Reduced to 1 for fastest screening - we only need to detect if there's a potential discrepancy
  const preflopEquityBitval = calculateEquityBitval(hero, villain, [], 1);
  const preflopEquityReference = calculateEquityReference(hero, villain, []);
  const preflopDiff = roundEquity(preflopEquityBitval - preflopEquityReference);
  results.preflopDiff = preflopDiff;

  // Pre-flop: only check equity (no ranking comparison without board)
  const preflopFailureType = Math.abs(preflopDiff) > preflopTolerance ? "equity" : "";

  if (preflopFailureType === "") {
    if (verbose) console.log(`    Pre-flop passes (${preflopEquityBitval.toFixed(2)}% vs ${preflopEquityReference.toFixed(2)}%)`);
    return null; // No discrepancy, skip this hand
  }

  if (verbose) console.log(`    Pre-flop discrepancy: ${preflopDiff.toFixed(2)}% (${preflopEquityBitval.toFixed(2)}% vs ${preflopEquityReference.toFixed(2)}%)`);
  results.failureType = preflopFailureType;

  // Phase 2: Flop testing
  if (verbose) console.log(`  Testing ${numFlops} flops...`);
  const flops = generateRandomFlops(hero, villain, [], numFlops);
  const discrepantFlops = [];
  results.flopsTested = flops.length; // Track total flops tested

  for (let flopIndex = 0; flopIndex < flops.length; flopIndex++) {
    const flop = flops[flopIndex];
    // Use exhaustive enumeration for flops (much faster than simulation)
    const flopEquityBitval = calculateEquityBitval(hero, villain, flop); // Exhaustive enumeration
    const flopEquityReference = calculateEquityReference(hero, villain, flop); // Exhaustive enumeration
    const flopDiff = roundEquity(flopEquityBitval - flopEquityReference);

    const flopRankingBitval = evaluateHandRankingBitval(hero, villain, flop);
    const flopRankingReference = evaluateHandRankingReference(hero, villain, flop);
    const flopRankingMatch = compareHandRankings(flopRankingBitval, flopRankingReference);
    const flopFailureType = determineFailureType(flopDiff, flopRankingMatch.match, flopTolerance);

    if (Math.abs(flopDiff) > flopTolerance || flopFailureType !== "") {
      results.maxFlopDiff = Math.max(results.maxFlopDiff, Math.abs(flopDiff));
      results.flopCount++;
      discrepantFlops.push(flop);
      
      // Track total flop diff for average calculation
      if (!results.flopTotalDiff) results.flopTotalDiff = 0;
      results.flopTotalDiff += Math.abs(flopDiff);
      
      // Update failure type
      if (flopFailureType === "both" || (results.failureType !== "both" && flopFailureType !== "")) {
        if (results.failureType === "" || results.failureType === flopFailureType) {
          results.failureType = flopFailureType;
        } else {
          results.failureType = "both";
        }
      }
    }
    
    // Update progress after each flop if callback provided
    if (progressCallback) {
      const shouldExit = progressCallback({
        flopsTested: flopIndex + 1,
        flopDiscrepancies: results.flopCount,
        flopTotalDiff: results.flopTotalDiff || 0,
        turnsTested: results.turnsTested || 0,
        turnDiscrepancies: results.turnCount || 0,
        turnTotalDiff: results.turnTotalDiff || 0,
        riversTested: results.riversTested || 0,
        riverDiscrepancies: results.riverCount || 0,
        riverTotalDiff: results.riverTotalDiff || 0,
        // Add current equity values
        currentEquityBitval: flopEquityBitval,
        currentEquityReference: flopEquityReference
      });
      
      // Exit early if callback indicates we should (e.g., running average matches pre-flop reference)
      if (shouldExit === true) {
        // Mark that we exited early
        results.earlyExit = true;
        results.flopsTested = flopIndex + 1;
        break;
      }
    }
  }

  if (discrepantFlops.length === 0) {
    if (verbose) console.log(`    No discrepant flops found`);
    return results;
  }

  if (verbose) console.log(`    Found ${discrepantFlops.length} discrepant flops`);

  // Phase 3: Turn testing
  for (const flop of discrepantFlops) {
    const turns = getAllTurns(hero, villain, flop);
    results.turnsTested += turns.length; // Track total turns tested
    
    for (const turn of turns) {
      // Use exhaustive enumeration for turns (4 cards, need 1 more = river)
      const turnEquityBitval = calculateEquityBitval(hero, villain, [...flop, turn]); // Exhaustive enumeration
      const turnEquityReference = calculateEquityReference(hero, villain, [...flop, turn]); // Exhaustive enumeration
      const turnDiff = roundEquity(turnEquityBitval - turnEquityReference);

      const turnRankingBitval = evaluateHandRankingBitval(hero, villain, [...flop, turn]);
      const turnRankingReference = evaluateHandRankingReference(hero, villain, [...flop, turn]);
      const turnRankingMatch = compareHandRankings(turnRankingBitval, turnRankingReference);
      const turnFailureType = determineFailureType(turnDiff, turnRankingMatch.match, flopTolerance);

      if (Math.abs(turnDiff) > flopTolerance || turnFailureType !== "") {
        results.maxTurnDiff = Math.max(results.maxTurnDiff, Math.abs(turnDiff));
        results.turnCount++;
        
        // Track total turn diff for average calculation
        if (!results.turnTotalDiff) results.turnTotalDiff = 0;
        results.turnTotalDiff += Math.abs(turnDiff);

        // Update failure type
        if (turnFailureType === "both" || (results.failureType !== "both" && turnFailureType !== "")) {
          if (results.failureType === "" || results.failureType === turnFailureType) {
            results.failureType = turnFailureType;
          } else {
            results.failureType = "both";
          }
        }

        // Phase 4: River testing
        const rivers = getAllRivers(hero, villain, flop, turn);
        results.riversTested += rivers.length; // Track total rivers tested
        
        // Update progress callback with turn stats
        if (progressCallback) {
          progressCallback({
            flopsTested: results.flopsTested || 0,
            flopDiscrepancies: results.flopCount || 0,
            flopTotalDiff: results.flopTotalDiff || 0,
            turnsTested: results.turnsTested || 0,
            turnDiscrepancies: results.turnCount || 0,
            turnTotalDiff: results.turnTotalDiff || 0,
            riversTested: results.riversTested || 0,
            riverDiscrepancies: results.riverCount || 0,
            riverTotalDiff: results.riverTotalDiff || 0
          });
        }
        
        for (const river of rivers) {
          // For complete board, use direct evaluation
          const riverEquityBitval = calculateEquityBitval(hero, villain, [...flop, turn, river]); // bitval direct eval
          const riverEquityReference = calculateEquityReference(hero, villain, [...flop, turn, river]); // reference direct eval
          const riverDiff = roundEquity(riverEquityBitval - riverEquityReference);

          const riverRankingBitval = evaluateHandRankingBitval(hero, villain, [...flop, turn, river]);
          const riverRankingReference = evaluateHandRankingReference(hero, villain, [...flop, turn, river]);
          const riverRankingMatch = compareHandRankings(riverRankingBitval, riverRankingReference);
          const riverFailureType = determineFailureType(riverDiff, riverRankingMatch.match, flopTolerance);

          if (Math.abs(riverDiff) > flopTolerance || riverFailureType !== "") {
            results.maxRiverDiff = Math.max(results.maxRiverDiff, Math.abs(riverDiff));
            results.riverCount++;
            results.totalDiscrepancies++;
            
            // Track total river diff for average calculation
            if (!results.riverTotalDiff) results.riverTotalDiff = 0;
            results.riverTotalDiff += Math.abs(riverDiff);
            
            // Store discrepant river for CSV
            results.discrepantRivers.push({
              flop,
              turn,
              river,
              diff: riverDiff,
              failureType: riverFailureType
            });

            // Update failure type
            if (riverFailureType === "both" || (results.failureType !== "both" && riverFailureType !== "")) {
              if (results.failureType === "" || results.failureType === riverFailureType) {
                results.failureType = riverFailureType;
              } else {
                results.failureType = "both";
              }
            }
            
            // Update progress callback with river stats
            if (progressCallback) {
              progressCallback({
                flopsTested: results.flopsTested || 0,
                flopDiscrepancies: results.flopCount || 0,
                flopTotalDiff: results.flopTotalDiff || 0,
                turnsTested: results.turnsTested || 0,
                turnDiscrepancies: results.turnCount || 0,
                turnTotalDiff: results.turnTotalDiff || 0,
                riversTested: results.riversTested || 0,
                riverDiscrepancies: results.riverCount || 0,
                riverTotalDiff: results.riverTotalDiff || 0
              });
            }
          }
        }
      }
    }
  }

  return results;
}

// Test a single hand through all phases, skipping pre-flop check (for retest mode)
function testHandSkipPreflop(hero, villain, preflopTolerance, flopTolerance, numFlops, verbose = false, progressCallback = null, preflopDiff) {
  const results = {
    preflopDiff: preflopDiff,
    maxFlopDiff: 0,
    maxTurnDiff: 0,
    maxRiverDiff: 0,
    flopCount: 0,
    turnCount: 0,
    riverCount: 0,
    totalDiscrepancies: 0,
    failureType: "equity", // Pre-flop already failed
    discrepantRivers: [],
    // Track totals tested
    flopsTested: 0,
    turnsTested: 0,
    riversTested: 0,
    // Track total differences for average calculation
    flopTotalDiff: 0,
    turnTotalDiff: 0,
    riverTotalDiff: 0
  };

  // Phase 2: Flop testing (skip pre-flop since we already checked it)
  if (verbose) console.log(`  Testing ${numFlops} flops...`);
  const flops = generateRandomFlops(hero, villain, [], numFlops);
  const discrepantFlops = [];
  results.flopsTested = flops.length; // Track total flops tested

  for (let flopIndex = 0; flopIndex < flops.length; flopIndex++) {
    const flop = flops[flopIndex];
    // Use exhaustive enumeration for flops (much faster than simulation)
    const flopEquityBitval = calculateEquityBitval(hero, villain, flop); // Exhaustive enumeration
    const flopEquityReference = calculateEquityReference(hero, villain, flop); // Exhaustive enumeration
    const flopDiff = roundEquity(flopEquityBitval - flopEquityReference);

    const flopRankingBitval = evaluateHandRankingBitval(hero, villain, flop);
    const flopRankingReference = evaluateHandRankingReference(hero, villain, flop);
    const flopRankingMatch = compareHandRankings(flopRankingBitval, flopRankingReference);
    const flopFailureType = determineFailureType(flopDiff, flopRankingMatch.match, flopTolerance);

    if (Math.abs(flopDiff) > flopTolerance || flopFailureType !== "") {
      results.maxFlopDiff = Math.max(results.maxFlopDiff, Math.abs(flopDiff));
      results.flopCount++;
      discrepantFlops.push(flop);
      
      // Track total flop diff for average calculation
      if (!results.flopTotalDiff) results.flopTotalDiff = 0;
      results.flopTotalDiff += Math.abs(flopDiff);
      
      // Update failure type
      if (flopFailureType === "both" || (results.failureType !== "both" && flopFailureType !== "")) {
        if (results.failureType === "" || results.failureType === flopFailureType) {
          results.failureType = flopFailureType;
        } else {
          results.failureType = "both";
        }
      }
    }
    
    // Update progress after each flop if callback provided (update after EVERY flop, not just discrepant ones)
    if (progressCallback) {
      const shouldExit = progressCallback({
        flopsTested: flopIndex + 1,
        flopDiscrepancies: results.flopCount,
        flopTotalDiff: results.flopTotalDiff || 0,
        turnsTested: results.turnsTested || 0,
        turnDiscrepancies: results.turnCount || 0,
        turnTotalDiff: results.turnTotalDiff || 0,
        riversTested: results.riversTested || 0,
        riverDiscrepancies: results.riverCount || 0,
        riverTotalDiff: results.riverTotalDiff || 0,
        // Add current equity values
        currentEquityBitval: flopEquityBitval,
        currentEquityReference: flopEquityReference
      });
      
      // Exit early if running average is within threshold
      if (shouldExit === true) {
        // Mark that we exited early
        results.earlyExit = true;
        results.flopsTested = flopIndex + 1;
        break;
      }
    }
  }

  if (discrepantFlops.length === 0) {
    if (verbose) console.log(`    No discrepant flops found`);
    return results;
  }

  if (verbose) console.log(`    Found ${discrepantFlops.length} discrepant flops`);

  // Phase 3: Turn testing
  for (const flop of discrepantFlops) {
    const turns = getAllTurns(hero, villain, flop);
    results.turnsTested += turns.length; // Track total turns tested
    
    for (const turn of turns) {
      // Use exhaustive enumeration for turns (4 cards, need 1 more = river)
      const turnEquityBitval = calculateEquityBitval(hero, villain, [...flop, turn]); // Exhaustive enumeration
      const turnEquityReference = calculateEquityReference(hero, villain, [...flop, turn]); // Exhaustive enumeration
      const turnDiff = roundEquity(turnEquityBitval - turnEquityReference);

      const turnRankingBitval = evaluateHandRankingBitval(hero, villain, [...flop, turn]);
      const turnRankingReference = evaluateHandRankingReference(hero, villain, [...flop, turn]);
      const turnRankingMatch = compareHandRankings(turnRankingBitval, turnRankingReference);
      const turnFailureType = determineFailureType(turnDiff, turnRankingMatch.match, flopTolerance);

      if (Math.abs(turnDiff) > flopTolerance || turnFailureType !== "") {
        results.maxTurnDiff = Math.max(results.maxTurnDiff, Math.abs(turnDiff));
        results.turnCount++;
        
        // Track total turn diff for average calculation
        if (!results.turnTotalDiff) results.turnTotalDiff = 0;
        results.turnTotalDiff += Math.abs(turnDiff);

        // Update failure type
        if (turnFailureType === "both" || (results.failureType !== "both" && turnFailureType !== "")) {
          if (results.failureType === "" || results.failureType === turnFailureType) {
            results.failureType = turnFailureType;
          } else {
            results.failureType = "both";
          }
        }

        // Phase 4: River testing
        const rivers = getAllRivers(hero, villain, flop, turn);
        results.riversTested += rivers.length; // Track total rivers tested
        
        // Update progress callback with turn stats
        if (progressCallback) {
          progressCallback({
            flopsTested: results.flopsTested || 0,
            flopDiscrepancies: results.flopCount || 0,
            flopTotalDiff: results.flopTotalDiff || 0,
            turnsTested: results.turnsTested || 0,
            turnDiscrepancies: results.turnCount || 0,
            turnTotalDiff: results.turnTotalDiff || 0,
            riversTested: results.riversTested || 0,
            riverDiscrepancies: results.riverCount || 0,
            riverTotalDiff: results.riverTotalDiff || 0
          });
        }
        
        for (const river of rivers) {
          // For complete board, use direct evaluation
          const riverEquityBitval = calculateEquityBitval(hero, villain, [...flop, turn, river]); // bitval direct eval
          const riverEquityReference = calculateEquityReference(hero, villain, [...flop, turn, river]); // reference direct eval
          const riverDiff = roundEquity(riverEquityBitval - riverEquityReference);

          const riverRankingBitval = evaluateHandRankingBitval(hero, villain, [...flop, turn, river]);
          const riverRankingReference = evaluateHandRankingReference(hero, villain, [...flop, turn, river]);
          const riverRankingMatch = compareHandRankings(riverRankingBitval, riverRankingReference);
          const riverFailureType = determineFailureType(riverDiff, riverRankingMatch.match, flopTolerance);

          if (Math.abs(riverDiff) > flopTolerance || riverFailureType !== "") {
            results.maxRiverDiff = Math.max(results.maxRiverDiff, Math.abs(riverDiff));
            results.riverCount++;
            results.totalDiscrepancies++;
            
            // Track total river diff for average calculation
            if (!results.riverTotalDiff) results.riverTotalDiff = 0;
            results.riverTotalDiff += Math.abs(riverDiff);
            
            // Store discrepant river for CSV
            results.discrepantRivers.push({
              flop,
              turn,
              river,
              diff: riverDiff,
              failureType: riverFailureType
            });

            // Update failure type
            if (riverFailureType === "both" || (results.failureType !== "both" && riverFailureType !== "")) {
              if (results.failureType === "" || results.failureType === riverFailureType) {
                results.failureType = riverFailureType;
              } else {
                results.failureType = "both";
              }
            }
            
            // Update progress callback with river stats
            if (progressCallback) {
              progressCallback({
                flopsTested: results.flopsTested || 0,
                flopDiscrepancies: results.flopCount || 0,
                flopTotalDiff: results.flopTotalDiff || 0,
                turnsTested: results.turnsTested || 0,
                turnDiscrepancies: results.turnCount || 0,
                turnTotalDiff: results.turnTotalDiff || 0,
                riversTested: results.riversTested || 0,
                riverDiscrepancies: results.riverCount || 0,
                riverTotalDiff: results.riverTotalDiff || 0
              });
            }
          }
        }
      }
    }
  }

  return results;
}

// Dissect mode: show detailed bitmask breakdown
function dissectHand(handId) {
  const rows = readCSV();
  const row = rows.find(r => r.hand_id === handId);
  
  if (!row) {
    console.error(`Hand ID ${handId} not found in CSV`);
    return;
  }

  // Parse hero, villain, and board from CSV
  // Hero and villain columns contain 7-card hands (2 hole + 5 board)
  const hero7Card = row.hero.split(' ');
  const villain7Card = row.villain.split(' ');
  const boardCards = row.board ? row.board.split(' ') : [];
  
  // Extract hole cards (first 2) and use board column if available, otherwise last 5
  const heroCards = hero7Card.slice(0, 2);
  const villainCards = villain7Card.slice(0, 2);
  const actualBoard = boardCards.length > 0 ? boardCards : hero7Card.slice(2);

  console.log(`\n${"=".repeat(80)}`);
  console.log(`DISSECT: Hand ID ${handId}`);
  console.log(`Hero: ${heroCards.join(' ')}`);
  console.log(`Villain: ${villainCards.join(' ')}`);
  console.log(`Board: ${actualBoard.join(' ')}`);
  console.log("=".repeat(80));

  if (actualBoard.length === 0) {
    console.log("No board cards - cannot dissect pre-flop hands");
    return;
  }

  // Evaluate hands
  const heroFullHand = bitval.getBitMasked([...heroCards, ...actualBoard]);
  const villainFullHand = bitval.getBitMasked([...villainCards, ...actualBoard]);
  const [heroEval, heroKickers] = bitval.evaluate(heroFullHand);
  const [villainEval, villainKickers] = bitval.evaluate(villainFullHand);

  // Extract kickers from result bitmask if not provided separately
  const heroKickersFromMask = heroKickers || (heroEval & KICKER_MASK);
  const villainKickersFromMask = villainKickers || (villainEval & KICKER_MASK);

  // Show debug output
  bitval.debug(heroFullHand, villainFullHand, heroEval, villainEval, heroKickersFromMask, villainKickersFromMask);

  // Show additional info
  console.log("\n" + "-".repeat(80));
  console.log("Hero Hand Strength:", bitval.getHandStrengthFromMask(heroEval));
  console.log("Villain Hand Strength:", bitval.getHandStrengthFromMask(villainEval));
  
  // Calculate equity
  const equity = calculateEquityReference(heroCards, villainCards, actualBoard);
  console.log(`Equity: ${equity.toFixed(2)}%`);
  
  // Compare with reference
  const referenceRanking = evaluateHandRankingReference(heroCards, villainCards, actualBoard);
  console.log("\nReference Evaluator:");
  console.log("Hero:", referenceRanking.hero.strength);
  console.log("Villain:", referenceRanking.villain.strength);
  
  const rankingMatch = compareHandRankings(
    { hero: { eval: heroEval, strength: bitval.getHandStrengthFromMask(heroEval) }, villain: { eval: villainEval, strength: bitval.getHandStrengthFromMask(villainEval) } },
    referenceRanking
  );
  
  console.log("\nRanking Match:", rankingMatch.match ? "✓" : "✗");
  if (!rankingMatch.match) {
    console.log("  Hero strength match:", rankingMatch.heroStrengthMatch ? "✓" : "✗");
    console.log("  Villain strength match:", rankingMatch.villainStrengthMatch ? "✓" : "✗");
    console.log("  Winner match:", rankingMatch.winnerMatch ? "✓" : "✗");
  }
}

// Update progress bar
function updateProgressBar(current, total, found, stats = {}, barLength = 40, currentEquity = null) {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * barLength);
  const empty = barLength - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  // Format street statistics with average discrepancies
  const p = stats.preflop || { found: 0, tested: 0, totalDiff: 0 };
  const f = stats.flop || { found: 0, tested: 0, totalDiff: 0 };
  const t = stats.turn || { found: 0, tested: 0, totalDiff: 0 };
  const r = stats.river || { found: 0, tested: 0, totalDiff: 0 };
  
  // Calculate average discrepancies (totalDiff / found, or 0 if no discrepancies found)
  const pAvg = p.found > 0 ? (p.totalDiff / p.found).toFixed(1) : '0.0';
  const fAvg = f.found > 0 ? (f.totalDiff / f.found).toFixed(1) : '0.0';
  const tAvg = t.found > 0 ? (t.totalDiff / t.found).toFixed(1) : '0.0';
  const rAvg = r.found > 0 ? (r.totalDiff / r.found).toFixed(1) : '0.0';
  
  const statsStr = `P: ${p.found}/${p.tested} (${pAvg}%)     F: ${f.found}/${f.tested} (${fAvg}%)     T: ${t.found}/${t.tested} (${tAvg}%)     R: ${r.found}/${r.tested} (${rAvg}%)`;
  
  // Add equity display if available (show reference vs running average)
  const equityStr = currentEquity ? ` | ${currentEquity.reference.toFixed(2)}% vs ${currentEquity.bitval.toFixed(2)}%` : '';
  
  process.stdout.write(`\r[${bar}] ${percentage}% (${current}/${total}) | Found: ${found} discrepancies | ${statsStr}${equityStr}`);
  
  // If complete, add newline
  if (current === total) {
    process.stdout.write('\n');
  }
}

// List discrepancies from CSV
function listDiscrepancies(listArg = null) {
  const rows = readCSV();
  
  if (rows.length === 0) {
    console.log("No discrepancies found in CSV file.");
    return;
  }

  // Filter to only show failed items (pass = false)
  const failedRows = rows.filter(row => row.pass === false);
  
  if (failedRows.length === 0) {
    console.log("No failed discrepancies found in CSV file.");
    return;
  }

  let handsToShow = [];
  
  // If no argument provided, default to first 25
  if (!listArg) {
    handsToShow = failedRows.slice(0, 25);
  } else if (listArg.includes('-')) {
    // Range format: X-Y
    const [start, end] = listArg.split('-').map(n => parseInt(n, 10));
    if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
      console.error(`Invalid range: ${listArg}`);
      return;
    }
    handsToShow = failedRows.filter(row => row.hand_id >= start && row.hand_id <= end);
  } else {
    // Count format: first N
    const count = parseInt(listArg, 10);
    if (isNaN(count) || count < 1) {
      console.error(`Invalid count: ${listArg}`);
      return;
    }
    handsToShow = failedRows.slice(0, count);
  }

  if (handsToShow.length === 0) {
    console.log("No hands found matching the specified criteria.");
    return;
  }

  console.log(`\n${"=".repeat(140)}`);
  console.log(`Listing ${handsToShow.length} failed discrepancy(ies):`);
  console.log("=".repeat(140));
  
  // Table header
  const header = [
    "ID",
    "Hero",
    "Villain",
    "Board",
    "Type",
    "Pre-flop",
    "Max Flop",
    "Max Turn",
    "Max River",
    "Flops",
    "Turns",
    "Rivers",
    "Total"
  ];
  
  // Calculate column widths
  const colWidths = [4, 8, 8, 20, 8, 9, 9, 9, 9, 6, 6, 7, 6];
  
  // Print header
  let headerRow = "";
  header.forEach((col, idx) => {
    headerRow += col.padEnd(colWidths[idx]) + " | ";
  });
  console.log(headerRow);
  console.log("-".repeat(140));
  
  // Print rows
  for (const row of handsToShow) {
    const heroCards = row.hero.split(' ').slice(0, 2).join(' ');
    const villainCards = row.villain.split(' ').slice(0, 2).join(' ');
    const board = (row.board || "").substring(0, 18); // Truncate long boards
    
    const values = [
      row.hand_id.toString(),
      heroCards,
      villainCards,
      board,
      row.failure_type || 'N/A',
      row.preflop_diff.toFixed(2) + '%',
      row.max_flop_diff.toFixed(2) + '%',
      row.max_turn_diff.toFixed(2) + '%',
      row.max_river_diff.toFixed(2) + '%',
      row.flop_count.toString(),
      row.turn_count.toString(),
      row.river_count.toString(),
      row.total_discrepancies.toString()
    ];
    
    let dataRow = "";
    values.forEach((val, idx) => {
      dataRow += val.padEnd(colWidths[idx]) + " | ";
    });
    console.log(dataRow);
  }
  
  console.log("=".repeat(140));
  console.log(`Total discrepancies in CSV: ${rows.length}`);
  console.log(`Failed discrepancies: ${failedRows.length}`);
}

// Show help message
function showHelp() {
  console.log("Usage: node find_discrepancies.js [options]");
  console.log("");
  console.log("Options:");
  console.log("  --preflops N       Number of pre-flop hands to test (default: 1000)");
  console.log("  --flops N          Number of random flops to test per discrepant hand (default: 5000)");
  console.log("  --tolerance N      Pre-flop equity tolerance percentage (default: 1.5)");
  console.log("  --retest           Re-test all hands in CSV (default)");
  console.log("  --retest N         Re-test a single hand by hand_id");
  console.log("  --retest N-M       Re-test a range of hands (e.g., --retest 1-100)");
  console.log("  --retest all       Re-test all hands in CSV");
  console.log("  --retest --clean   Re-test all hands and delete passing tests from CSV");
  console.log("  --retest N --clean Re-test hand N and delete if it passes");
  console.log("  --retest --flops N Re-test hands with no boards, generating N flops per hand");
  console.log("  --list             List first 25 failed discrepancies (default)");
  console.log("  --list N           List first N failed discrepancies");
  console.log("  --list N-M         List failed discrepancies in range (e.g., --list 1-10)");
  console.log("  --dissect N        Show detailed bitmask breakdown for hand_id N");
  console.log("  --help             Show this help message");
  console.log("");
  console.log("Examples:");
  console.log("  node find_discrepancies.js");
  console.log("  node find_discrepancies.js --preflops 500 --flops 1000");
  console.log("  node find_discrepancies.js --retest");
  console.log("  node find_discrepancies.js --retest 5");
  console.log("  node find_discrepancies.js --retest 1-50");
  console.log("  node find_discrepancies.js --retest all");
  console.log("  node find_discrepancies.js --retest --clean");
  console.log("  node find_discrepancies.js --retest --flops 100000");
  console.log("  node find_discrepancies.js --list");
  console.log("  node find_discrepancies.js --list 10");
  console.log("  node find_discrepancies.js --list 1-20");
  console.log("  node find_discrepancies.js --dissect 10");
  console.log("");
  console.log("Output:");
  console.log("  Results are written to: debugger/discrepancies.csv");
}

// Main execution
function main() {
  const args = parseArgs();

  // Show help if requested
  if (args.help) {
    showHelp();
    return;
  }

  // Show help if no arguments provided (only script name)
  if (process.argv.length === 2) {
    showHelp();
    return;
  }

  // List mode
  if (args.list !== null) {
    // If list is empty string, pass null to use default (first 25)
    listDiscrepancies(args.list === "" ? null : args.list);
    return;
  }

  // Dissect mode
  if (args.dissect !== null) {
    dissectHand(args.dissect);
    return;
  }

  // Re-test mode
  if (args.retest !== null) {
    const rows = readCSV();
    
    let handsToTest = [];
    if (args.retest === "all") {
      // Test all hands in CSV
      handsToTest = rows;
    } else {
      // Test specific range or single hand
      const idRange = parseIdRange(args.retest);
      if (idRange === null) {
        console.error(`Invalid retest argument: ${args.retest}`);
        return;
      }
      handsToTest = rows.filter(row => row.hand_id >= idRange.start && row.hand_id <= idRange.end);
    }

    if (handsToTest.length === 0) {
      console.error(`No hands found to re-test`);
      return;
    }

    // If --flops is explicitly specified with --retest, only retest hands with no boards (pre-flop only discrepancies)
    if (args.flopsExplicit) {
      const originalCount = handsToTest.length;
      handsToTest = handsToTest.filter(row => !row.board || row.board.trim() === "");
      if (handsToTest.length === 0) {
        console.error(`No hands with empty boards found to re-test with flops`);
        return;
      }
      console.log(`Filtered to ${handsToTest.length} hand(s) with no boards (from ${originalCount} total)`);
    } else {
      // Without --flops, only retest hands with complete boards (river situations)
      const originalCount = handsToTest.length;
      handsToTest = handsToTest.filter(row => row.board && row.board.trim() !== "");
      if (handsToTest.length === 0) {
        console.error(`No hands with complete boards found to re-test`);
        return;
      }
      if (originalCount > handsToTest.length) {
        console.log(`Filtered to ${handsToTest.length} hand(s) with complete boards (from ${originalCount} total)`);
      }
    }

    console.log(`Re-testing ${handsToTest.length} hand(s)${args.retestClean ? ' (--clean mode: will delete passing tests)' : ''}${args.flopsExplicit ? ` with ${args.flops} flops per hand` : ''}...\n`);

    let passed = 0;
    let failed = 0;
    let deleted = 0;
    
    // Track overall progress across all hands (for --flops mode)
    let totalFlopsToTest = 0;
    let totalFlopsCompleted = 0;
    let overallStats = {
      preflop: { found: 0, tested: 0, totalDiff: 0 },
      flop: { found: 0, tested: 0, totalDiff: 0 },
      turn: { found: 0, tested: 0, totalDiff: 0 },
      river: { found: 0, tested: 0, totalDiff: 0 }
    };
    
    if (args.flopsExplicit) {
      totalFlopsToTest = handsToTest.length * args.flops;
      // Initialize overall progress bar immediately
      updateProgressBar(0, totalFlopsToTest, 0, overallStats, 40, null);
    }

    for (let handIndex = 0; handIndex < handsToTest.length; handIndex++) {
      const row = handsToTest[handIndex];
      
      // Extract the complete 7-card hands from CSV
      const hero7Card = row.hero.split(' ');
      const villain7Card = row.villain.split(' ');
      const board = row.board ? row.board.split(' ') : [];
      
      // Extract hole cards (first 2) for reference evaluator
      const heroCards = hero7Card.slice(0, 2);
      const villainCards = villain7Card.slice(0, 2);
      
      // If --flops is explicitly specified and board is empty, run full test with flop generation
      if (args.flopsExplicit && (!board || board.length === 0 || board[0] === "")) {
        // Track statistics for this hand
        const handStats = {
          preflop: { found: 0, tested: 1, totalDiff: 0 },
          flop: { found: 0, tested: 0, totalDiff: 0 },
          turn: { found: 0, tested: 0, totalDiff: 0 },
          river: { found: 0, tested: 0, totalDiff: 0 }
        };
        
        // First, check pre-flop equity to see if it now matches (early exit if it does)
        // Update progress bar immediately (before blocking calculation)
        updateProgressBar(totalFlopsCompleted, totalFlopsToTest, overallStats.river.found, overallStats, 40, null);
        
        const preflopEquityBitval = calculateEquityBitval(heroCards, villainCards, [], 1);
        const preflopEquityReference = calculateEquityReference(heroCards, villainCards, []);
        const preflopDiff = roundEquity(preflopEquityBitval - preflopEquityReference);
        
        // Update progress bar with pre-flop reference (will show until flops start)
        // Show reference vs reference initially (will be replaced by running average once flops start)
        updateProgressBar(totalFlopsCompleted, totalFlopsToTest, overallStats.river.found, overallStats, 40, {
          bitval: preflopEquityReference, // Running average (starts as reference, updates as flops are tested)
          reference: preflopEquityReference // Pre-flop reference (target)
        });
        
        // Check if pre-flop now matches within tolerance
        if (Math.abs(preflopDiff) <= args.tolerance) {
          // Pre-flop equity now matches (within tolerance) - count all flops as completed
          totalFlopsCompleted += args.flops;
          overallStats.preflop.tested++;
          
          // Clear progress bar and show result
          process.stdout.write(`\r`);
          console.log(`Hand ID ${row.hand_id}:`);
          console.log(`    Pre-flop equity now matches: ${preflopEquityBitval.toFixed(2)}% vs ${preflopEquityReference.toFixed(2)}% (Diff: ${preflopDiff >= 0 ? '+' : ''}${preflopDiff.toFixed(2)}%)`);
          passed++;
          if (args.retestClean) {
            // Delete from CSV
            if (deleteCSVRow(row.hand_id)) {
              deleted++;
              console.log(`  ✓ Pre-flop equity now matches (sampling error corrected) - deleted from CSV\n`);
            }
          } else {
            // Update to mark as passing
            updateCSVRow(row.hand_id, {
              pass: true,
              failure_type: "",
              preflop_diff: 0,
              max_flop_diff: 0,
              max_turn_diff: 0,
              max_river_diff: 0,
              flop_count: 0,
              turn_count: 0,
              river_count: 0,
              total_discrepancies: 0
            });
            console.log(`  ✓ Pre-flop equity now matches (sampling error corrected)\n`);
          }
          
          // Update overall progress bar
          updateProgressBar(totalFlopsCompleted, totalFlopsToTest, overallStats.river.found, overallStats, 40, null);
          continue; // Skip to next hand
        }
        
        // Pre-flop still has discrepancy - proceed with full flop testing
        handStats.preflop.found = 1;
        handStats.preflop.totalDiff = Math.abs(preflopDiff);
        overallStats.preflop.found++;
        overallStats.preflop.tested++;
        overallStats.preflop.totalDiff += Math.abs(preflopDiff);
        
        // Track base flops completed before this hand
        const baseFlopsCompleted = totalFlopsCompleted;
        
        // Track running average of bitval flop equities for early exit check
        let runningSumBitvalEquity = 0;
        let runningCountFlops = 0;
        let shouldExitEarly = false;
        
        // Create progress callback for real-time updates
        const progressCallback = (flopStats) => {
          // Track running average of bitval flop equities
          if (flopStats.currentEquityBitval !== undefined) {
            runningSumBitvalEquity += flopStats.currentEquityBitval;
            runningCountFlops++;
            const runningAvgBitvalEquity = runningSumBitvalEquity / runningCountFlops;
            
            // Check if running average is within threshold of pre-flop reference
            const avgDiff = Math.abs(runningAvgBitvalEquity - preflopEquityReference);
            if (avgDiff <= args.tolerance && runningCountFlops >= 100) { // Require at least 100 flops for statistical significance
              shouldExitEarly = true;
            }
          }
          // Save previous hand stats before updating
          const prevFlopFound = handStats.flop.found;
          const prevFlopTotalDiff = handStats.flop.totalDiff;
          const prevTurnTested = handStats.turn.tested;
          const prevTurnFound = handStats.turn.found;
          const prevTurnTotalDiff = handStats.turn.totalDiff;
          const prevRiverTested = handStats.river.tested;
          const prevRiverFound = handStats.river.found;
          const prevRiverTotalDiff = handStats.river.totalDiff;
          
          // Update hand stats
          handStats.flop.tested = flopStats.flopsTested;
          handStats.flop.found = flopStats.flopDiscrepancies;
          handStats.flop.totalDiff = flopStats.flopTotalDiff || 0;
          handStats.turn.tested = flopStats.turnsTested || 0;
          handStats.turn.found = flopStats.turnDiscrepancies || 0;
          handStats.turn.totalDiff = flopStats.turnTotalDiff || 0;
          handStats.river.tested = flopStats.riversTested || 0;
          handStats.river.found = flopStats.riverDiscrepancies || 0;
          handStats.river.totalDiff = flopStats.riverTotalDiff || 0;
          
          // Update overall stats (subtract previous hand values, add new ones)
          overallStats.flop.tested = baseFlopsCompleted + flopStats.flopsTested;
          overallStats.flop.found = overallStats.flop.found - prevFlopFound + flopStats.flopDiscrepancies;
          overallStats.flop.totalDiff = overallStats.flop.totalDiff - prevFlopTotalDiff + (flopStats.flopTotalDiff || 0);
          overallStats.turn.tested = overallStats.turn.tested - prevTurnTested + (flopStats.turnsTested || 0);
          overallStats.turn.found = overallStats.turn.found - prevTurnFound + (flopStats.turnDiscrepancies || 0);
          overallStats.turn.totalDiff = overallStats.turn.totalDiff - prevTurnTotalDiff + (flopStats.turnTotalDiff || 0);
          overallStats.river.tested = overallStats.river.tested - prevRiverTested + (flopStats.riversTested || 0);
          overallStats.river.found = overallStats.river.found - prevRiverFound + (flopStats.riverDiscrepancies || 0);
          overallStats.river.totalDiff = overallStats.river.totalDiff - prevRiverTotalDiff + (flopStats.riverTotalDiff || 0);
          
          // Update total flops completed (base + current hand's flops)
          totalFlopsCompleted = baseFlopsCompleted + flopStats.flopsTested;
          
          // Calculate running average for display
          const runningAvgBitvalEquity = runningCountFlops > 0 ? runningSumBitvalEquity / runningCountFlops : null;
          
          // Update overall progress bar with pre-flop reference vs running average
          updateProgressBar(totalFlopsCompleted, totalFlopsToTest, overallStats.river.found, overallStats, 40,
            runningAvgBitvalEquity !== null ? {
              bitval: runningAvgBitvalEquity,
              reference: preflopEquityReference
            } : null
          );
          
          // Return early exit flag
          return shouldExitEarly;
        };
        
        // Run full test with flop generation (skip pre-flop check since we already did it)
        const results = testHandSkipPreflop(heroCards, villainCards, args.tolerance, 0.00, args.flops, false, progressCallback, preflopDiff);
        
        // Check if we exited early due to running average matching pre-flop reference
        if (results && results.earlyExit) {
          // Running average matched - mark as passed
          // Don't print anything - just update progress bar to avoid breaking the line
          passed++;
          if (args.retestClean) {
            if (deleteCSVRow(row.hand_id)) {
              deleted++;
              // Don't print - just continue to avoid breaking progress bar
            }
          } else {
            updateCSVRow(row.hand_id, {
              pass: true,
              failure_type: "",
              preflop_diff: 0,
              max_flop_diff: 0,
              max_turn_diff: 0,
              max_river_diff: 0,
              flop_count: 0,
              turn_count: 0,
              river_count: 0,
              total_discrepancies: 0
            });
            // Don't print - just continue to avoid breaking progress bar
          }
          
          // Count remaining flops as completed
          totalFlopsCompleted = baseFlopsCompleted + args.flops;
          updateProgressBar(totalFlopsCompleted, totalFlopsToTest, overallStats.river.found, overallStats, 40, null);
          continue;
        }
        
        // Final update to progress bar (ensure all flops for this hand are counted)
        if (results !== null) {
          handStats.flop.tested = results.flopsTested || args.flops;
          handStats.flop.found = results.flopCount || 0;
          handStats.flop.totalDiff = results.flopTotalDiff || 0;
          handStats.turn.tested = results.turnsTested || 0;
          handStats.turn.found = results.turnCount || 0;
          handStats.turn.totalDiff = results.turnTotalDiff || 0;
          handStats.river.tested = results.riversTested || 0;
          handStats.river.found = results.riverCount || 0;
          handStats.river.totalDiff = results.riverTotalDiff || 0;
          
          // Update overall stats with final values
          overallStats.flop.tested = baseFlopsCompleted + (results.flopsTested || args.flops);
          overallStats.flop.found += results.flopCount || 0;
          overallStats.flop.totalDiff += results.flopTotalDiff || 0;
          overallStats.turn.tested += results.turnsTested || 0;
          overallStats.turn.found += results.turnCount || 0;
          overallStats.turn.totalDiff += results.turnTotalDiff || 0;
          overallStats.river.tested += results.riversTested || 0;
          overallStats.river.found += results.riverCount || 0;
          overallStats.river.totalDiff += results.riverTotalDiff || 0;
        }
        
        // Ensure all flops for this hand are counted as completed
        totalFlopsCompleted = baseFlopsCompleted + args.flops;
        updateProgressBar(totalFlopsCompleted, totalFlopsToTest, overallStats.river.found, overallStats, 40, null);
        process.stdout.write(`\r`);
        console.log(`Hand ID ${row.hand_id}:`);
        console.log(`    Pre-flop discrepancy: ${preflopDiff.toFixed(2)}% (${preflopEquityBitval.toFixed(2)}% vs ${preflopEquityReference.toFixed(2)}%)`);
        
        // Results will never be null here since we already checked pre-flop and it failed
        // So we always proceed to save river discrepancies
        // Hand fails - save all river discrepancies
        failed++;
        
        // Delete the original pre-flop-only row
        deleteCSVRow(row.hand_id);
        
        // Save all river discrepancies as separate rows
        if (results.discrepantRivers.length > 0) {
          for (const riverDiscrepancy of results.discrepantRivers) {
            const worstBoard = [...riverDiscrepancy.flop, riverDiscrepancy.turn, riverDiscrepancy.river].join(' ');
            const hero7CardNew = [...heroCards, ...worstBoard.split(' ')].join(' ');
            const villain7CardNew = [...villainCards, ...worstBoard.split(' ')].join(' ');

            const newRow = {
              hand_id: getNextHandId(),
              hero: hero7CardNew,
              villain: villain7CardNew,
              board: worstBoard,
              pass: false,
              failure_type: riverDiscrepancy.failureType || results.failureType,
              preflop_diff: results.preflopDiff,
              max_flop_diff: results.maxFlopDiff,
              max_turn_diff: results.maxTurnDiff,
              max_river_diff: Math.abs(riverDiscrepancy.diff),
              flop_count: results.flopCount,
              turn_count: results.turnCount,
              river_count: 1,
              total_discrepancies: 1
            };

            appendToCSV(newRow);
          }
          console.log(`  ✗ Hand fails - found ${results.discrepantRivers.length} river discrepancy(ies)\n`);
        } else {
          // No river discrepancies, but pre-flop had discrepancy - keep it
          const newRow = {
            hand_id: getNextHandId(),
            hero: heroCards.join(' '),
            villain: villainCards.join(' '),
            board: "",
            pass: false,
            failure_type: results.failureType,
            preflop_diff: results.preflopDiff,
            max_flop_diff: results.maxFlopDiff,
            max_turn_diff: results.maxTurnDiff,
            max_river_diff: results.maxRiverDiff,
            flop_count: results.flopCount,
            turn_count: results.turnCount,
            river_count: results.riverCount,
            total_discrepancies: 1
          };
          appendToCSV(newRow);
          console.log(`  ✗ Hand fails (${results.failureType}) - no river discrepancies found\n`);
        }
      } else {
        // Normal retest: test the complete 7-card hands directly
        const equityBitval = calculateEquityBitval(heroCards, villainCards, board);
        const equityReference = calculateEquityReference(heroCards, villainCards, board);
        const equityDiff = roundEquity(equityBitval - equityReference);
        
        // Compare hand rankings
        const rankingBitval = evaluateHandRankingBitval(heroCards, villainCards, board);
        const rankingReference = evaluateHandRankingReference(heroCards, villainCards, board);
        const rankingMatch = compareHandRankings(rankingBitval, rankingReference);
        
        // Determine failure type
        const equityFails = Math.abs(equityDiff) > 0.00; // 0.00% tolerance for complete boards
        const rankingFails = !rankingMatch.match;
        
        let failureType = "";
        if (equityFails && rankingFails) {
          failureType = "both";
        } else if (rankingFails) {
          failureType = "ranking";
        } else if (equityFails) {
          failureType = "equity";
        }
        
        if (failureType === "") {
          // Hand passes all tests
          passed++;
          if (args.retestClean) {
            // Delete from CSV
            if (deleteCSVRow(row.hand_id)) {
              deleted++;
              console.log(`  ✓ Hand passes all tests - deleted from CSV\n`);
            }
          } else {
            // Update to mark as passing
            updateCSVRow(row.hand_id, {
              pass: true,
              failure_type: "",
              preflop_diff: 0,
              max_flop_diff: 0,
              max_turn_diff: 0,
              max_river_diff: 0,
              flop_count: 0,
              turn_count: 0,
              river_count: 0,
              total_discrepancies: 0
            });
            console.log(`  ✓ Hand passes all tests\n`);
          }
        } else {
          // Hand fails - update with new results
          failed++;
          updateCSVRow(row.hand_id, {
            pass: false,
            failure_type: failureType,
            preflop_diff: equityDiff,
            max_flop_diff: Math.abs(equityDiff),
            max_turn_diff: Math.abs(equityDiff),
            max_river_diff: Math.abs(equityDiff),
            flop_count: 0,
            turn_count: 0,
            river_count: 0,
            total_discrepancies: 1
          });
          console.log(`  ✗ Hand fails (${failureType}) - Equity: ${equityBitval.toFixed(2)}% vs ${equityReference.toFixed(2)}% (Diff: ${equityDiff >= 0 ? '+' : ''}${equityDiff.toFixed(2)}%)\n`);
        }
      }
    }

    // Final progress bar update
    if (args.flopsExplicit) {
      updateProgressBar(totalFlopsToTest, totalFlopsToTest, overallStats.river.found, overallStats, 40, null);
      console.log(); // New line after final progress bar
    }
    
    console.log("=".repeat(80));
    console.log(`Re-test complete: ${passed} passed, ${failed} failed`);
    if (args.retestClean) {
      console.log(`Deleted ${deleted} passing test(s) from CSV`);
    }
    console.log("=".repeat(80));

    return;
  }

  // Normal mode: generate new test cases
  console.log(`Finding discrepancies...`);
  console.log(`Pre-flop hands to test: ${args.preflops}`);
  console.log(`Flops per hand: ${args.flops}`);
  console.log(`Pre-flop tolerance: ${args.tolerance}%`);
  console.log(`Flop/Turn/River tolerance: 0.00%`);
  console.log("=".repeat(80));
  
  // Track statistics for each street (fresh for this run only - not from CSV or history)
  const stats = {
    preflop: { found: 0, tested: 0, totalDiff: 0 }, // totalDiff for calculating average
    flop: { found: 0, tested: 0, totalDiff: 0 },
    turn: { found: 0, tested: 0, totalDiff: 0 },
    river: { found: 0, tested: 0, totalDiff: 0 }
  };

  // Initialize progress bar IMMEDIATELY (before any slow operations like CSV reading)
  updateProgressBar(0, args.preflops, 0, stats, 40, null);

  // Now do potentially slow operations (CSV read for hand ID)
  let handId = getNextHandId();
  let tested = 0;
  let found = 0;

  while (tested < args.preflops) {
    const { hero, villain } = generateRandomHand();
    tested++;
    stats.preflop.tested++; // Every hand gets pre-flop tested
    
    // Update progress bar before starting pre-flop test (shows we're working)
    updateProgressBar(tested, args.preflops, found, stats, 40, null);

    // Track running average of bitval flop equities for this hand (for early exit check)
    let runningSumBitvalEquity = 0;
    let runningCountFlops = 0;
    let preflopEquityReference = null; // Will be calculated only if needed (when pre-flop discrepancy found)

    // Create progress callback for flop updates
    const flopBaseTested = stats.flop.tested; // Track base before this hand
    const flopBaseFound = stats.flop.found; // Track base before this hand
    const flopBaseTotalDiff = stats.flop.totalDiff; // Track base before this hand
    const progressCallback = (flopStats) => {
      // Track running average of bitval flop equities
      if (flopStats.currentEquityBitval !== undefined) {
        runningSumBitvalEquity += flopStats.currentEquityBitval;
        runningCountFlops++;
      }
      
      // Update flop stats in real-time (relative to base for this hand)
      stats.flop.tested = flopBaseTested + flopStats.flopsTested;
      stats.flop.found = flopBaseFound + flopStats.flopDiscrepancies;
      stats.flop.totalDiff = flopBaseTotalDiff + (flopStats.flopTotalDiff || 0);
      
      // Calculate running average for display
      const runningAvgBitvalEquity = runningCountFlops > 0 ? runningSumBitvalEquity / runningCountFlops : null;
      
      // Check if running average is within threshold of pre-flop reference (early exit check)
      let shouldExitEarly = false;
      if (runningAvgBitvalEquity !== null && preflopEquityReference !== null && runningCountFlops >= 100) { // Require at least 100 flops for statistical significance
        const avgDiff = Math.abs(runningAvgBitvalEquity - preflopEquityReference);
        if (avgDiff <= args.tolerance) {
          shouldExitEarly = true;
        }
      }
      
      // Update progress bar after each flop with pre-flop reference vs running average
      // Only show equity if we have both values (pre-flop reference is only calculated if discrepancy found)
      updateProgressBar(tested, args.preflops, found, stats, 40,
        (runningAvgBitvalEquity !== null && preflopEquityReference !== null) ? {
          bitval: runningAvgBitvalEquity,
          reference: preflopEquityReference
        } : null
      );
      
      // Return early exit flag
      return shouldExitEarly;
    };

    const results = testHand(hero, villain, args.tolerance, 0.00, args.flops, false, progressCallback);
    
    // If pre-flop had a discrepancy, calculate the reference for progress bar display
    if (results !== null && preflopEquityReference === null) {
      preflopEquityReference = calculateEquityReference(hero, villain, []);
    }

    // Check if we exited early due to running average matching pre-flop reference
    if (results !== null && results.earlyExit) {
      // Running average matched - this was just sampling error, don't save to CSV
      // Update stats to reflect flops tested
      stats.flop.tested = flopBaseTested + (results.flopsTested || 0);
      
      // Update progress bar (no console.log to avoid breaking the line)
      updateProgressBar(tested, args.preflops, found, stats, 40, null);
      
      // Continue to next hand (don't save to CSV)
      continue;
    }

    if (results !== null) {
      // Pre-flop had a discrepancy
      stats.preflop.found++;
      stats.preflop.totalDiff += Math.abs(results.preflopDiff);
      
      // Track flop statistics (finalize counts - callback already updated them)
      stats.flop.tested = flopBaseTested + (results.flopsTested || args.flops);
      stats.flop.found = flopBaseFound + results.flopCount;
      stats.flop.totalDiff = flopBaseTotalDiff + (results.flopTotalDiff || 0);
      
      // Track turn statistics
      stats.turn.tested += results.turnsTested || 0;
      stats.turn.found += results.turnCount;
      stats.turn.totalDiff += results.turnTotalDiff || 0;
      
      // Track river statistics
      stats.river.tested += results.riversTested || 0;
      stats.river.found += results.riverCount;
      stats.river.totalDiff += results.riverTotalDiff || 0;
    }

    // Update progress bar (update every hand for real-time feedback)
    // Show running average if available, otherwise no equity display
    const runningAvgBitvalEquity = runningCountFlops > 0 ? runningSumBitvalEquity / runningCountFlops : null;
    updateProgressBar(tested, args.preflops, found, stats, 40,
      (runningAvgBitvalEquity !== null && preflopEquityReference !== null) ? {
        bitval: runningAvgBitvalEquity,
        reference: preflopEquityReference
      } : null
    );

    if (results !== null) {
      // If there are river discrepancies, save all of them
      if (results.discrepantRivers.length > 0) {
        // Save ALL river discrepancies to CSV (one row per river discrepancy)
        for (const riverDiscrepancy of results.discrepantRivers) {
          const worstBoard = [...riverDiscrepancy.flop, riverDiscrepancy.turn, riverDiscrepancy.river].join(' ');
          const hero7Card = [...hero, ...worstBoard.split(' ')].join(' ');
          const villain7Card = [...villain, ...worstBoard.split(' ')].join(' ');

          const row = {
            hand_id: handId++,
            hero: hero7Card,
            villain: villain7Card,
            board: worstBoard,
            pass: false,
            failure_type: riverDiscrepancy.failureType || results.failureType,
            preflop_diff: results.preflopDiff,
            max_flop_diff: results.maxFlopDiff,
            max_turn_diff: results.maxTurnDiff,
            max_river_diff: Math.abs(riverDiscrepancy.diff),
            flop_count: results.flopCount,
            turn_count: results.turnCount,
            river_count: 1, // Each row represents one river discrepancy
            total_discrepancies: 1
          };

          appendToCSV(row);
          found++; // Count each river discrepancy
          // River totalDiff already tracked in results.riverTotalDiff above
        }
      } else {
        // No river discrepancies, but pre-flop had a discrepancy - save it anyway
        // Use empty board since we don't have a specific board for this discrepancy
        const hero7Card = hero.join(' ');
        const villain7Card = villain.join(' ');

        const row = {
          hand_id: handId++,
          hero: hero7Card,
          villain: villain7Card,
          board: "", // No board - pre-flop only discrepancy
          pass: false,
          failure_type: results.failureType,
          preflop_diff: results.preflopDiff,
          max_flop_diff: results.maxFlopDiff,
          max_turn_diff: results.maxTurnDiff,
          max_river_diff: results.maxRiverDiff,
          flop_count: results.flopCount,
          turn_count: results.turnCount,
          river_count: results.riverCount,
          total_discrepancies: 1
        };

        appendToCSV(row);
        found++; // Count this pre-flop discrepancy
      }
      
      // Update progress bar with new found count (no console.log output)
      updateProgressBar(tested, args.preflops, found, stats);
    }
  }

  // Final progress bar update
  updateProgressBar(tested, args.preflops, found, stats);
  console.log("\n" + "=".repeat(80));
  console.log(`Completed: ${tested} hands tested, ${found} discrepancies found`);
  console.log(`CSV file: ${CSV_FILE}`);
}

// Run main
if (require.main === module) {
  main();
}

module.exports = { testHand, dissectHand, calculateEquityBitval, calculateEquityReference };

