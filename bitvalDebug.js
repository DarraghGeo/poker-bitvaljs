const BitVal = require("../bitval.js");
const evaluator = require("poker-evaluator");
const fs = require("fs");
const path = require("path");

class BitvalDebug {
  constructor() {
    this.bitval = new BitVal();
    this.CSV_FILE = path.join(__dirname, "discrepancies.csv");
    this.KICKER_MASK = ((1n << 26n) - 1n) & ~((1n << 13n) - 1n);
    this.suits = ['s', 'h', 'd', 'c'];
    this.ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    this.lastProgressUpdate = 0;
    this.progressUpdateInterval = 50; // Update every 50ms
  }

  // ============================================================================
  // Argument Parsing
  // ============================================================================

  parseArgs() {
    const args = this.getDefaultArgs();
    this.processArgv(args);
    return args;
  }

  getDefaultArgs() {
    return {
      preflops: 1000,
      flops: 5000,
      flopsExplicit: false,
      tolerance: 1.5,
      retest: null,
      retestClean: false,
      dissect: null,
      list: null,
      help: false
    };
  }

  processArgv(args) {
    for (let i = 2; i < process.argv.length; i++) {
      const arg = process.argv[i];
      this.processArg(arg, args, i);
    }
  }

  processArg(arg, args, i) {
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--preflops") {
      args.preflops = this.getNextIntArg(i);
    } else if (arg === "--flops") {
      args.flops = this.getNextIntArg(i);
      args.flopsExplicit = true;
    } else if (arg === "--tolerance") {
      args.tolerance = this.getNextFloatArg(i);
    } else if (arg === "--retest") {
      args.retest = this.getRetestArg(i);
    } else if (arg === "--clean") {
      args.retestClean = true;
    } else if (arg === "--dissect") {
      args.dissect = this.getNextIntArg(i);
    } else if (arg === "--list") {
      args.list = this.getListArg(i);
    }
  }

  getNextIntArg(i) {
    return i + 1 < process.argv.length ? parseInt(process.argv[++i], 10) : null;
  }

  getNextFloatArg(i) {
    return i + 1 < process.argv.length ? parseFloat(process.argv[++i]) : null;
  }

  getRetestArg(i) {
    if (i + 1 < process.argv.length && !process.argv[i + 1].startsWith('--')) {
      return process.argv[++i];
    }
    return "all";
  }

  getListArg(i) {
    if (i + 1 < process.argv.length && !process.argv[i + 1].startsWith('--')) {
      return process.argv[++i];
    }
    return "";
  }

  // ============================================================================
  // Card Utilities
  // ============================================================================

  getAllCards() {
    const cards = [];
    for (const rank of this.ranks) {
      for (const suit of this.suits) {
        cards.push(rank + suit);
      }
    }
    return cards;
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  generateRandomHand() {
    const deck = this.shuffleArray(this.getAllCards());
    return {
      hero: [deck[0], deck[1]],
      villain: [deck[2], deck[3]]
    };
  }

  getAvailableCards(deadCards) {
    return this.getAllCards().filter(card => !deadCards.includes(card));
  }

  generateRandomFlops(hero, villain, board, numFlops) {
    const deadCards = [...hero, ...villain, ...board];
    const availableCards = this.getAvailableCards(deadCards);
    const flops = [];
    
    while (flops.length < numFlops) {
      const shuffled = this.shuffleArray(availableCards);
      const flopsToDeal = Math.min(3, numFlops - flops.length);
      
      for (let i = 0; i < flopsToDeal; i++) {
        flops.push([shuffled[i * 3], shuffled[i * 3 + 1], shuffled[i * 3 + 2]]);
      }
    }
    
    return flops.slice(0, numFlops);
  }

  getAllTurns(hero, villain, board) {
    return this.getAvailableCards([...hero, ...villain, ...board]);
  }

  getAllRivers(hero, villain, board, turn) {
    return this.getAvailableCards([...hero, ...villain, ...board, turn]);
  }

  // ============================================================================
  // Equity Calculations
  // ============================================================================

  calculateEquityBitval(hero, villain, board, iterations = 1) {
    if (board.length === 5) {
      return this.calculateCompleteBoardEquity(hero, villain, board);
    }
    if (board.length === 3) {
      return this.calculateFlopEquity(hero, villain, board);
    }
    if (board.length === 4) {
      return this.calculateTurnEquity(hero, villain, board);
    }
    return this.calculatePreflopEquity(hero, villain, iterations);
  }

  calculateCompleteBoardEquity(hero, villain, board) {
    const heroFullHand = this.bitval.getBitMasked([...hero, ...board]);
    const villainFullHand = this.bitval.getBitMasked([...villain, ...board]);
    const [heroEval, heroKickers] = this.bitval.evaluate(heroFullHand);
    const [villainEval, villainKickers] = this.bitval.evaluate(villainFullHand);
    return this.compareCompleteHands(heroEval, heroKickers, villainEval, villainKickers);
  }

  compareCompleteHands(heroEval, heroKickers, villainEval, villainKickers) {
    let heroValue = heroEval;
    let villainValue = villainEval;
    
    if (heroEval === villainEval && heroKickers && villainKickers) {
      heroValue = heroKickers;
      villainValue = villainKickers;
    }
    
    if (heroValue > villainValue) return 100.0;
    if (villainValue > heroValue) return 0.0;
    return 50.0;
  }

  calculateFlopEquity(hero, villain, board) {
    const remainingCards = this.getAvailableCards([...hero, ...villain, ...board]);
    let heroWins = 0, villainWins = 0, ties = 0, total = 0;
    
    for (let i = 0; i < remainingCards.length; i++) {
      for (let j = i + 1; j < remainingCards.length; j++) {
        const turn = remainingCards[i];
        const river = remainingCards[j];
        const fullBoard = [...board, turn, river];
        const result = this.evaluateBoard(hero, villain, fullBoard);
        if (result === 100) heroWins++;
        else if (result === 0) villainWins++;
        else ties++;
        total++;
      }
    }
    
    return ((heroWins + ties / 2) / total) * 100;
  }

  calculateTurnEquity(hero, villain, board) {
    const remainingCards = this.getAvailableCards([...hero, ...villain, ...board]);
    let heroWins = 0, villainWins = 0, ties = 0, total = 0;
    
    for (const river of remainingCards) {
      const fullBoard = [...board, river];
      const result = this.evaluateBoard(hero, villain, fullBoard);
      if (result === 100) heroWins++;
      else if (result === 0) villainWins++;
      else ties++;
      total++;
    }
    
    return ((heroWins + ties / 2) / total) * 100;
  }

  calculatePreflopEquity(hero, villain, iterations) {
    const result = this.bitval.simulate(iterations, 5, hero, villain, [], []);
    return ((result.win + result.tie / 2) / (result.win + result.lose + result.tie)) * 100;
  }

  evaluateBoard(hero, villain, board) {
    const heroFullHand = this.bitval.getBitMasked([...hero, ...board]);
    const villainFullHand = this.bitval.getBitMasked([...villain, ...board]);
    const [heroEval, heroKickers] = this.bitval.evaluate(heroFullHand);
    const [villainEval, villainKickers] = this.bitval.evaluate(villainFullHand);
    return this.compareCompleteHands(heroEval, heroKickers, villainEval, villainKickers);
  }

  calculateEquityReference(heroCards, villainCards, boardCards, iterations = 100000) {
    const remainingCards = this.getRemainingCards(heroCards, villainCards, boardCards);
    const cardsNeeded = 5 - boardCards.length;
    
    if (cardsNeeded === 0) {
      return this.evaluateCompleteBoardReference(heroCards, villainCards, boardCards);
    }
    if (cardsNeeded === 1) {
      return this.calculateRiverEquityReference(heroCards, villainCards, boardCards, remainingCards);
    }
    if (cardsNeeded === 2) {
      return this.calculateTurnRiverEquityReference(heroCards, villainCards, boardCards, remainingCards);
    }
    return this.calculatePreflopEquityReference(heroCards, villainCards, remainingCards, iterations);
  }

  getRemainingCards(heroCards, villainCards, boardCards) {
    const remainingCards = [];
    for (const rank of this.ranks) {
      for (const suit of this.suits) {
        const card = rank + suit;
        if (!heroCards.includes(card) && !villainCards.includes(card) && !boardCards.includes(card)) {
          remainingCards.push(card);
        }
      }
    }
    return remainingCards;
  }

  evaluateCompleteBoardReference(heroCards, villainCards, boardCards) {
    const heroHand = evaluator.evalHand(heroCards.concat(boardCards));
    const villainHand = evaluator.evalHand(villainCards.concat(boardCards));
    if (heroHand.value > villainHand.value) return 100.0;
    if (villainHand.value > heroHand.value) return 0.0;
    return 50.0;
  }

  calculateRiverEquityReference(heroCards, villainCards, boardCards, remainingCards) {
    let heroWins = 0, villainWins = 0, ties = 0, total = 0;
    
    for (const river of remainingCards) {
      const fullBoard = [...boardCards, river];
      const result = this.evaluateBoardReference(heroCards, villainCards, fullBoard);
      if (result === 100) heroWins++;
      else if (result === 0) villainWins++;
      else ties++;
      total++;
    }
    
    return ((heroWins + ties / 2) / total) * 100;
  }

  calculateTurnRiverEquityReference(heroCards, villainCards, boardCards, remainingCards) {
    let heroWins = 0, villainWins = 0, ties = 0, total = 0;
    
    for (let i = 0; i < remainingCards.length; i++) {
      for (let j = i + 1; j < remainingCards.length; j++) {
        const turn = remainingCards[i];
        const river = remainingCards[j];
        const fullBoard = [...boardCards, turn, river];
        const result = this.evaluateBoardReference(heroCards, villainCards, fullBoard);
        if (result === 100) heroWins++;
        else if (result === 0) villainWins++;
        else ties++;
        total++;
      }
    }
    
    return ((heroWins + ties / 2) / total) * 100;
  }

  calculatePreflopEquityReference(heroCards, villainCards, remainingCards, iterations) {
    let heroWins = 0, villainWins = 0, ties = 0, total = 0;
    
    for (let iter = 0; iter < iterations; iter++) {
      const indices = new Set();
      while (indices.size < 5) {
        indices.add(Math.floor(Math.random() * remainingCards.length));
      }
      const selectedCards = Array.from(indices).map(i => remainingCards[i]);
      const fullBoard = [...selectedCards];
      const result = this.evaluateBoardReference(heroCards, villainCards, fullBoard);
      if (result === 100) heroWins++;
      else if (result === 0) villainWins++;
      else ties++;
      total++;
    }
    
    return ((heroWins + ties / 2) / total) * 100;
  }

  evaluateBoardReference(heroCards, villainCards, fullBoard) {
    const heroHand = evaluator.evalHand(heroCards.concat(fullBoard));
    const villainHand = evaluator.evalHand(villainCards.concat(fullBoard));
    if (heroHand.value > villainHand.value) return 100;
    if (villainHand.value > heroHand.value) return 0;
    return 50;
  }

  roundEquity(equity) {
    return Math.round(equity * 100) / 100;
  }

  // ============================================================================
  // Hand Ranking Evaluation
  // ============================================================================

  evaluateHandRankingBitval(heroCards, villainCards, boardCards) {
    const heroFullHand = this.bitval.getBitMasked([...heroCards, ...boardCards]);
    const villainFullHand = this.bitval.getBitMasked([...villainCards, ...boardCards]);
    const [heroEval, heroKickers] = this.bitval.evaluate(heroFullHand);
    const [villainEval, villainKickers] = this.bitval.evaluate(villainFullHand);
    
    return {
      hero: { eval: heroEval, kickers: heroKickers, strength: this.bitval.getHandStrengthFromMask(heroEval) },
      villain: { eval: villainEval, kickers: villainKickers, strength: this.bitval.getHandStrengthFromMask(villainEval) }
    };
  }

  evaluateHandRankingReference(heroCards, villainCards, boardCards) {
    const heroHand = evaluator.evalHand(heroCards.concat(boardCards));
    const villainHand = evaluator.evalHand(villainCards.concat(boardCards));
    
    return {
      hero: { value: heroHand.value, strength: this.getHandStrengthFromValue(heroHand.value) },
      villain: { value: villainHand.value, strength: this.getHandStrengthFromValue(villainHand.value) }
    };
  }

  getHandStrengthFromValue(value) {
    if (value >= 6185) return "Straight Flush";
    if (value >= 3325) return "Quads";
    if (value >= 2467) return "Full House";
    if (value >= 1609) return "Flush";
    if (value >= 1599) return "Straight";
    if (value >= 322) return "Trips";
    if (value >= 166) return "Two Pair";
    if (value >= 10) return "Pair";
    return "High Card";
  }

  compareHandRankings(bitvalRanking, referenceRanking) {
    const heroStrengthMatch = bitvalRanking.hero.strength === referenceRanking.hero.strength;
    const villainStrengthMatch = bitvalRanking.villain.strength === referenceRanking.villain.strength;
    
    if (!heroStrengthMatch || !villainStrengthMatch) {
      return { match: false, heroStrengthMatch, villainStrengthMatch, winnerMatch: false };
    }
    
    const winnerMatch = this.compareWinners(bitvalRanking, referenceRanking);
    return { match: winnerMatch, heroStrengthMatch, villainStrengthMatch, winnerMatch };
  }

  compareWinners(bitvalRanking, referenceRanking) {
    const bitvalWinner = this.getWinner(bitvalRanking);
    const referenceWinner = this.getReferenceWinner(referenceRanking);
    return bitvalWinner === referenceWinner;
  }

  getWinner(bitvalRanking) {
    if (bitvalRanking.hero.eval > bitvalRanking.villain.eval) return "hero";
    if (bitvalRanking.villain.eval > bitvalRanking.hero.eval) return "villain";
    if (bitvalRanking.hero.kickers && bitvalRanking.villain.kickers) {
      if (bitvalRanking.hero.kickers > bitvalRanking.villain.kickers) return "hero";
      if (bitvalRanking.villain.kickers > bitvalRanking.hero.kickers) return "villain";
    }
    return "tie";
  }

  getReferenceWinner(referenceRanking) {
    if (referenceRanking.hero.value > referenceRanking.villain.value) return "hero";
    if (referenceRanking.villain.value > referenceRanking.hero.value) return "villain";
    return "tie";
  }

  determineFailureType(equityDiff, rankingMatch, tolerance) {
    const equityFails = Math.abs(equityDiff) > tolerance;
    const rankingFails = !rankingMatch.match;
    
    if (equityFails && rankingFails) return "both";
    if (rankingFails) return "ranking";
    if (equityFails) return "equity";
    return "";
  }

  // ============================================================================
  // CSV Operations
  // ============================================================================

  readCSV() {
    if (!fs.existsSync(this.CSV_FILE)) return [];
    const content = fs.readFileSync(this.CSV_FILE, 'utf-8');
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',');
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j];
      }
      this.parseCSVRow(row);
      rows.push(row);
    }
    
    return rows;
  }

  parseCSVRow(row) {
    row.hand_id = parseInt(row.hand_id, 10);
    row.preflop_diff = parseFloat(row.preflop_diff || 0);
    row.max_flop_diff = parseFloat(row.max_flop_diff || 0);
    row.max_turn_diff = parseFloat(row.max_turn_diff || 0);
    row.max_river_diff = parseFloat(row.max_river_diff || 0);
    row.flop_count = parseInt(row.flop_count || 0, 10);
    row.turn_count = parseInt(row.turn_count || 0, 10);
    row.river_count = parseInt(row.river_count || 0, 10);
    row.total_discrepancies = parseInt(row.total_discrepancies || 0, 10);
    row.pass = row.pass === 'true' || row.pass === true;
  }

  writeCSV(rows) {
    if (rows.length === 0) return;
    
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(',')];
    
    for (const row of rows) {
      const values = headers.map(h => row[h]);
      lines.push(values.join(','));
    }
    
    fs.writeFileSync(this.CSV_FILE, lines.join('\n') + '\n');
  }

  appendToCSV(row) {
    const fileExists = fs.existsSync(this.CSV_FILE);
    if (!fileExists) {
      const headers = Object.keys(row);
      fs.writeFileSync(this.CSV_FILE, headers.join(',') + '\n');
    }
    
    const values = Object.values(row);
    fs.appendFileSync(this.CSV_FILE, values.join(',') + '\n');
  }

  updateCSVRow(handId, updates) {
    const rows = this.readCSV();
    const index = rows.findIndex(row => row.hand_id === handId);
    if (index === -1) return false;
    
    Object.assign(rows[index], updates);
    this.writeCSV(rows);
    return true;
  }

  deleteCSVRow(handId) {
    const rows = this.readCSV();
    const filtered = rows.filter(row => row.hand_id !== handId);
    if (filtered.length === rows.length) return false;
    
    this.writeCSV(filtered);
    return true;
  }

  getNextHandId() {
    const rows = this.readCSV();
    if (rows.length === 0) return 1;
    return Math.max(...rows.map(r => r.hand_id)) + 1;
  }

  parseIdRange(idStr) {
    if (idStr.includes('-')) {
      const [start, end] = idStr.split('-').map(n => parseInt(n, 10));
      if (isNaN(start) || isNaN(end) || start < 1 || end < start) return null;
      return { start, end };
    }
    return { start: parseInt(idStr, 10), end: parseInt(idStr, 10) };
  }

  // ============================================================================
  // Hand Testing
  // ============================================================================

  testHand(hero, villain, preflopTolerance, flopTolerance, numFlops, verbose, progressCallback) {
    const results = this.createTestResults();
    const preflopResult = this.testPreflop(hero, villain, preflopTolerance, verbose);
    
    if (!preflopResult) return null;
    
    Object.assign(results, preflopResult);
    this.testFlops(hero, villain, flopTolerance, numFlops, results, verbose, progressCallback);
    return results;
  }

  createTestResults() {
    return {
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
      earlyExit: false,
      flopsTested: 0,
      turnsTested: 0,
      riversTested: 0,
      flopTotalDiff: 0,
      turnTotalDiff: 0,
      riverTotalDiff: 0
    };
  }

  testPreflop(hero, villain, preflopTolerance, verbose) {
    const preflopEquityBitval = this.calculateEquityBitval(hero, villain, [], 100000);
    const preflopEquityReference = this.calculateEquityReference(hero, villain, []);
    const preflopDiff = this.roundEquity(preflopEquityBitval - preflopEquityReference);
    
    if (verbose) {
      console.log(`  Testing pre-flop...`);
    }
    
    const preflopFailureType = Math.abs(preflopDiff) > preflopTolerance ? "equity" : "";
    
    if (preflopFailureType === "") {
      if (verbose) {
        console.log(`    Pre-flop passes (${preflopEquityBitval.toFixed(2)}% vs ${preflopEquityReference.toFixed(2)}%)`);
      }
      return null;
    }
    
    if (verbose) {
      console.log(`    Pre-flop discrepancy: ${preflopDiff.toFixed(2)}% (${preflopEquityBitval.toFixed(2)}% vs ${preflopEquityReference.toFixed(2)}%)`);
    }
    
    return {
      preflopDiff,
      preflopEquityReference,
      failureType: preflopFailureType
    };
  }

  testFlops(hero, villain, flopTolerance, numFlops, results, verbose, progressCallback) {
    if (verbose) {
      console.log(`  Testing ${numFlops} flops...`);
    }
    
    const flops = this.generateRandomFlops(hero, villain, [], numFlops);
    const discrepantFlops = [];
    results.flopsTested = flops.length;
    
    for (let flopIndex = 0; flopIndex < flops.length; flopIndex++) {
      const flop = flops[flopIndex];
      const flopResult = this.testSingleFlop(hero, villain, flop, flopTolerance, results);
      
      if (flopResult.hasDiscrepancy) {
        discrepantFlops.push(flop);
        this.updateFlopStats(results, flopResult);
      }
      
      this.updateProgress(flopIndex, flopResult, results, progressCallback);
      
      if (results.earlyExit) {
        results.flopsTested = flopIndex + 1;
        break;
      }
    }
    
    if (discrepantFlops.length === 0) {
      if (verbose) {
        console.log(`    No discrepant flops found`);
      }
      return;
    }
    
    if (verbose) {
      console.log(`    Found ${discrepantFlops.length} discrepant flops`);
    }
    
    this.testTurnsAndRivers(hero, villain, discrepantFlops, flopTolerance, results, verbose, progressCallback);
  }

  testSingleFlop(hero, villain, flop, flopTolerance, results) {
    const flopEquityBitval = this.calculateEquityBitval(hero, villain, flop);
    const flopEquityReference = this.calculateEquityReference(hero, villain, flop);
    const flopDiff = this.roundEquity(flopEquityBitval - flopEquityReference);
    
    const flopRankingBitval = this.evaluateHandRankingBitval(hero, villain, flop);
    const flopRankingReference = this.evaluateHandRankingReference(hero, villain, flop);
    const flopRankingMatch = this.compareHandRankings(flopRankingBitval, flopRankingReference);
    const flopFailureType = this.determineFailureType(flopDiff, flopRankingMatch, flopTolerance);
    
    return {
      flopEquityBitval,
      flopEquityReference,
      flopDiff,
      flopRankingMatch,
      flopFailureType,
      hasDiscrepancy: Math.abs(flopDiff) > flopTolerance || flopFailureType !== ""
    };
  }

  updateFlopStats(results, flopResult) {
    results.maxFlopDiff = Math.max(results.maxFlopDiff, Math.abs(flopResult.flopDiff));
    results.flopCount++;
    results.flopTotalDiff += Math.abs(flopResult.flopDiff);
    
    if (flopResult.flopFailureType === "both" || (results.failureType !== "both" && flopResult.flopFailureType !== "")) {
      if (results.failureType === "" || results.failureType === flopResult.flopFailureType) {
        results.failureType = flopResult.flopFailureType;
      } else {
        results.failureType = "both";
      }
    }
  }

  updateProgress(flopIndex, flopResult, results, progressCallback) {
    if (!progressCallback) return;
    
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
      currentEquityBitval: flopResult.flopEquityBitval,
      currentEquityReference: flopResult.flopEquityReference,
      preflopEquityReference: results.preflopEquityReference
    });
    
    if (shouldExit === true) {
      results.earlyExit = true;
      results.flopsTested = flopIndex + 1;
    }
  }

  testTurnsAndRivers(hero, villain, discrepantFlops, flopTolerance, results, verbose, progressCallback) {
    for (const flop of discrepantFlops) {
      const turns = this.getAllTurns(hero, villain, flop);
      results.turnsTested += turns.length;
      
      for (const turn of turns) {
        const turnResult = this.testSingleTurn(hero, villain, flop, turn, flopTolerance, results);
        
        if (turnResult.hasDiscrepancy) {
          this.updateTurnStats(results, turnResult);
          this.testRivers(hero, villain, flop, turn, flopTolerance, results, verbose, progressCallback);
        }
      }
    }
  }

  testSingleTurn(hero, villain, flop, turn, flopTolerance, results) {
    const turnEquityBitval = this.calculateEquityBitval(hero, villain, [...flop, turn]);
    const turnEquityReference = this.calculateEquityReference(hero, villain, [...flop, turn]);
    const turnDiff = this.roundEquity(turnEquityBitval - turnEquityReference);
    
    const turnRankingBitval = this.evaluateHandRankingBitval(hero, villain, [...flop, turn]);
    const turnRankingReference = this.evaluateHandRankingReference(hero, villain, [...flop, turn]);
    const turnRankingMatch = this.compareHandRankings(turnRankingBitval, turnRankingReference);
    const turnFailureType = this.determineFailureType(turnDiff, turnRankingMatch, flopTolerance);
    
    return {
      turnDiff,
      turnRankingMatch,
      turnFailureType,
      hasDiscrepancy: Math.abs(turnDiff) > flopTolerance || turnFailureType !== ""
    };
  }

  updateTurnStats(results, turnResult) {
    results.maxTurnDiff = Math.max(results.maxTurnDiff, Math.abs(turnResult.turnDiff));
    results.turnCount++;
    results.turnTotalDiff += Math.abs(turnResult.turnDiff);
    
    if (turnResult.turnFailureType === "both" || (results.failureType !== "both" && turnResult.turnFailureType !== "")) {
      if (results.failureType === "" || results.failureType === turnResult.turnFailureType) {
        results.failureType = turnResult.turnFailureType;
      } else {
        results.failureType = "both";
      }
    }
  }

  testRivers(hero, villain, flop, turn, flopTolerance, results, verbose, progressCallback) {
    const rivers = this.getAllRivers(hero, villain, flop, turn);
    results.riversTested += rivers.length;
    
    for (const river of rivers) {
      const riverResult = this.testSingleRiver(hero, villain, flop, turn, river, flopTolerance);
      
      if (riverResult.hasDiscrepancy) {
        this.updateRiverStats(results, riverResult, flop, turn, river);
      }
      
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

  testSingleRiver(hero, villain, flop, turn, river, flopTolerance) {
    const riverEquityBitval = this.calculateEquityBitval(hero, villain, [...flop, turn, river]);
    const riverEquityReference = this.calculateEquityReference(hero, villain, [...flop, turn, river]);
    const riverDiff = this.roundEquity(riverEquityBitval - riverEquityReference);
    
    const riverRankingBitval = this.evaluateHandRankingBitval(hero, villain, [...flop, turn, river]);
    const riverRankingReference = this.evaluateHandRankingReference(hero, villain, [...flop, turn, river]);
    const riverRankingMatch = this.compareHandRankings(riverRankingBitval, riverRankingReference);
    const riverFailureType = this.determineFailureType(riverDiff, riverRankingMatch, flopTolerance);
    
    return {
      riverDiff,
      riverRankingMatch,
      riverFailureType,
      hasDiscrepancy: Math.abs(riverDiff) > flopTolerance || riverFailureType !== ""
    };
  }

  updateRiverStats(results, riverResult, flop, turn, river) {
    results.maxRiverDiff = Math.max(results.maxRiverDiff, Math.abs(riverResult.riverDiff));
    results.riverCount++;
    results.riverTotalDiff += Math.abs(riverResult.riverDiff);
    
    results.discrepantRivers.push({
      flop,
      turn,
      river,
      diff: riverResult.riverDiff,
      failureType: riverResult.riverFailureType || results.failureType
    });
    
    if (riverResult.riverFailureType === "both" || (results.failureType !== "both" && riverResult.riverFailureType !== "")) {
      if (results.failureType === "" || results.failureType === riverResult.riverFailureType) {
        results.failureType = riverResult.riverFailureType;
      } else {
        results.failureType = "both";
      }
    }
  }

  testHandSkipPreflop(hero, villain, preflopTolerance, flopTolerance, numFlops, verbose, progressCallback, preflopDiff, preflopEquityReference) {
    const results = this.createTestResults();
    results.preflopDiff = preflopDiff;
    results.preflopEquityReference = preflopEquityReference;
    results.failureType = "equity";
    
    this.testFlops(hero, villain, flopTolerance, numFlops, results, verbose, progressCallback);
    return results;
  }

  // ============================================================================
  // Progress Bar
  // ============================================================================

  updateProgressBar(current, total, found, stats, barLength, currentEquity) {
    const now = Date.now();
    const shouldUpdate = (now - this.lastProgressUpdate) >= this.progressUpdateInterval || current === total;
    
    if (!shouldUpdate && current !== total) return;
    
    this.lastProgressUpdate = now;
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * barLength);
    const empty = barLength - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    
    const statsStr = this.formatStats(stats);
    const equityStr = currentEquity ? ` | ${currentEquity.reference.toFixed(2)}% vs ${currentEquity.bitval.toFixed(2)}%` : '';
    const line = `[${bar}] ${percentage}% (${current}/${total}) | Found: ${found} | ${statsStr}${equityStr}`;
    
    process.stdout.write('\r');
    process.stdout.write('\x1b[K');
    process.stdout.write(line);
    
    if (current === total) {
      process.stdout.write('\n');
    }
  }

  formatStats(stats) {
    const p = stats.preflop || { found: 0, tested: 0, totalDiff: 0 };
    const f = stats.flop || { found: 0, tested: 0, totalDiff: 0 };
    const t = stats.turn || { found: 0, tested: 0, totalDiff: 0 };
    const r = stats.river || { found: 0, tested: 0, totalDiff: 0 };
    
    const pAvg = p.found > 0 ? (p.totalDiff / p.found).toFixed(1) : '0.0';
    const fAvg = f.found > 0 ? (f.totalDiff / f.found).toFixed(1) : '0.0';
    const tAvg = t.found > 0 ? (t.totalDiff / t.found).toFixed(1) : '0.0';
    const rAvg = r.found > 0 ? (r.totalDiff / r.found).toFixed(1) : '0.0';
    
    return `P:${p.found}/${p.tested}(${pAvg}%) F:${f.found}/${f.tested}(${fAvg}%) T:${t.found}/${t.tested}(${tAvg}%) R:${r.found}/${r.tested}(${rAvg}%)`;
  }

  // ============================================================================
  // List and Dissect
  // ============================================================================

  listDiscrepancies(listArg) {
    const rows = this.readCSV();
    if (rows.length === 0) {
      console.log("No discrepancies found in CSV file.");
      return;
    }
    
    const failedRows = rows.filter(row => row.pass === false);
    if (failedRows.length === 0) {
      console.log("No failed discrepancies found in CSV file.");
      return;
    }
    
    const handsToShow = this.getHandsToShow(listArg, failedRows);
    if (handsToShow.length === 0) {
      console.log("No hands found matching the specified criteria.");
      return;
    }
    
    this.printDiscrepancyTable(handsToShow, rows, failedRows);
  }

  getHandsToShow(listArg, failedRows) {
    if (!listArg) {
      return failedRows.slice(0, 25);
    }
    if (listArg.includes('-')) {
      return this.getHandsByRange(listArg, failedRows);
    }
    return this.getHandsByCount(listArg, failedRows);
  }

  getHandsByRange(listArg, failedRows) {
    const [start, end] = listArg.split('-').map(n => parseInt(n, 10));
    if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
      console.error(`Invalid range: ${listArg}`);
      return [];
    }
    return failedRows.filter(row => row.hand_id >= start && row.hand_id <= end);
  }

  getHandsByCount(listArg, failedRows) {
    const count = parseInt(listArg, 10);
    if (isNaN(count) || count < 1) {
      console.error(`Invalid count: ${listArg}`);
      return [];
    }
    return failedRows.slice(0, count);
  }

  printDiscrepancyTable(handsToShow, rows, failedRows) {
    console.log(`\n${"=".repeat(140)}`);
    console.log(`Listing ${handsToShow.length} failed discrepancy(ies):`);
    console.log("=".repeat(140));
    
    const header = ["ID", "Hero", "Villain", "Board", "Type", "Pre-flop", "Max Flop", "Max Turn", "Max River", "Flops", "Turns", "Rivers", "Total"];
    const colWidths = [4, 8, 8, 20, 8, 9, 9, 9, 9, 6, 6, 7, 6];
    
    this.printTableHeader(header, colWidths);
    this.printTableRows(handsToShow, colWidths);
    this.printTableFooter(rows, failedRows);
  }

  printTableHeader(header, colWidths) {
    let headerRow = "";
    for (let i = 0; i < header.length; i++) {
      headerRow += header[i].padEnd(colWidths[i]) + (i < header.length - 1 ? " | " : "");
    }
    console.log(headerRow);
    console.log("-".repeat(140));
  }

  printTableRows(handsToShow, colWidths) {
    for (const row of handsToShow) {
      const dataRow = this.formatTableRow(row, colWidths);
      console.log(dataRow);
    }
  }

  formatTableRow(row, colWidths) {
    const formatDiff = (diff) => {
      const val = parseFloat(diff || 0);
      return (val >= 0 ? '+' : '') + val.toFixed(2) + '%';
    };
    
    const values = [
      row.hand_id.toString(),
      (row.hero || '').substring(0, 7),
      (row.villain || '').substring(0, 7),
      (row.board || '').substring(0, 19),
      row.failure_type || 'equity',
      formatDiff(row.preflop_diff),
      formatDiff(row.max_flop_diff),
      formatDiff(row.max_turn_diff),
      formatDiff(row.max_river_diff),
      (row.flop_count || 0).toString(),
      (row.turn_count || 0).toString(),
      (row.river_count || 0).toString(),
      (row.total_discrepancies || 0).toString()
    ];
    
    let dataRow = "";
    for (let i = 0; i < values.length; i++) {
      dataRow += values[i].padEnd(colWidths[i]) + (i < values.length - 1 ? " | " : "");
    }
    return dataRow;
  }

  printTableFooter(rows, failedRows) {
    console.log("=".repeat(140));
    console.log(`Total discrepancies in CSV: ${rows.length}`);
    console.log(`Failed discrepancies: ${failedRows.length}`);
  }

  dissectHand(handId) {
    const rows = this.readCSV();
    const row = rows.find(r => r.hand_id === handId);
    
    if (!row) {
      console.log(`Hand ID ${handId} not found in CSV file.`);
      return;
    }
    
    this.printDissectHeader(handId, row);
    this.printDissectContent(row);
  }

  printDissectHeader(handId, row) {
    const heroCards = row.hero.split(' ');
    const villainCards = row.villain.split(' ');
    const board = row.board ? row.board.split(' ') : [];
    
    console.log(`\n${"=".repeat(80)}`);
    console.log(`DISSECT: Hand ID ${handId}`);
    console.log(`Hero: ${heroCards.join(' ')}`);
    console.log(`Villain: ${villainCards.join(' ')}`);
    console.log(`Board: ${board.join(' ')}`);
    console.log("=".repeat(80));
  }

  printDissectContent(row) {
    if (!row.board || row.board.trim() === "") {
      console.log("No board cards - cannot dissect pre-flop hands");
      return;
    }
    
    const heroCards = row.hero.split(' ');
    const villainCards = row.villain.split(' ');
    const board = row.board.split(' ');
    
    const heroFullHand = this.bitval.getBitMasked([...heroCards, ...board]);
    const villainFullHand = this.bitval.getBitMasked([...villainCards, ...board]);
    const [heroEval, heroKickers] = this.bitval.evaluate(heroFullHand);
    const [villainEval, villainKickers] = this.bitval.evaluate(villainFullHand);
    
    const equity = this.calculateEquityBitval(heroCards, villainCards, board);
    const rankingBitval = this.evaluateHandRankingBitval(heroCards, villainCards, board);
    const rankingReference = this.evaluateHandRankingReference(heroCards, villainCards, board);
    const rankingMatch = this.compareHandRankings(rankingBitval, rankingReference);
    
    this.printDissectDetails(heroEval, heroKickers, villainEval, villainKickers, equity, rankingBitval, rankingReference, rankingMatch, heroFullHand, villainFullHand);
  }

  printDissectDetails(heroEval, heroKickers, villainEval, villainKickers, equity, rankingBitval, rankingReference, rankingMatch, heroFullHand, villainFullHand) {
    this.printDissectHeaderDetails(heroEval, villainEval, equity, rankingReference);
    this.printDissectKickers(heroKickers, villainKickers, heroFullHand, villainFullHand, heroEval, villainEval);
    this.printDissectRankingMatch(rankingMatch);
  }

  printDissectHeaderDetails(heroEval, villainEval, equity, rankingReference) {
    console.log("\n" + "-".repeat(80));
    console.log("Hero Hand Strength:", this.bitval.getHandStrengthFromMask(heroEval));
    console.log("Villain Hand Strength:", this.bitval.getHandStrengthFromMask(villainEval));
    console.log(`Equity: ${equity.toFixed(2)}%`);
    console.log("\nReference Evaluator:");
    console.log("Hero:", rankingReference.hero.strength);
    console.log("Villain:", rankingReference.villain.strength);
  }

  printDissectKickers(heroKickers, villainKickers, heroFullHand, villainFullHand, heroEval, villainEval) {
    const heroKickersMask = heroKickers ? (heroKickers & this.KICKER_MASK) : 0n;
    const villainKickersMask = villainKickers ? (villainKickers & this.KICKER_MASK) : 0n;
    this.printDebugOutput(heroFullHand, villainFullHand, heroEval, villainEval, heroKickersMask, villainKickersMask);
  }

  printDebugOutput(heroHand, villainHand, heroResult, villainResult, heroKickers, villainKickers) {
    const handRanks = "8765 4321 AAAA KKKK QQQQ JJJJ TTTT 9999 8888 7777 6666 5555 4444 3333 2222 AAAA";
    console.log("                      ", handRanks, " ", handRanks);
    
    const heroCards = this.getHandFromMask(heroHand).join(" ");
    console.log(heroCards, ":", this.printBitmask(heroResult), "=", this.printBitmask(heroKickers));
    
    const villainCards = this.getHandFromMask(villainHand).join(" ");
    console.log(villainCards, ":", this.printBitmask(villainResult), "=", this.printBitmask(villainKickers));
    
    console.log("\x1b[90m[9=SF, 8=Q, 7=FH, 6=FL, 5=ST, 4=TR, 3=TP, 2=P, 1=HC]\x1b[0m");
  }

  getHandFromMask(handMask) {
    const hand = [];
    for (const card in this.bitval.CARD_MASKS) {
      if ((this.bitval.CARD_MASKS[card] & handMask) === 0n) continue;
      hand.push(card);
    }
    return hand;
  }

  printBitmask(num, spacing = 4) {
    let bin = num.toString(2);
    while (bin.length < 64) bin = '0' + bin;
    bin = bin.split('').reverse().join('').match(/.{1,4}/g).join(' ').split('').reverse().join('');
    return bin;
  }

  printDissectRankingMatch(rankingMatch) {
    console.log("\nRanking Match:", rankingMatch.match ? "✓" : "✗");
    if (!rankingMatch.match) {
      console.log("  Hero strength match:", rankingMatch.heroStrengthMatch ? "✓" : "✗");
      console.log("  Villain strength match:", rankingMatch.villainStrengthMatch ? "✓" : "✗");
      console.log("  Winner match:", rankingMatch.winnerMatch ? "✓" : "✗");
    }
  }

  showHelp() {
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

  // ============================================================================
  // Main Execution
  // ============================================================================

  main() {
    const args = this.parseArgs();
    
    if (args.help || process.argv.length === 2) {
      this.showHelp();
      return;
    }
    
    if (args.list !== null) {
      this.listDiscrepancies(args.list === "" ? null : args.list);
      return;
    }
    
    if (args.dissect !== null) {
      this.dissectHand(args.dissect);
      return;
    }
    
    if (args.retest !== null) {
      this.runRetest(args);
      return;
    }
    
    this.runInitialTest(args);
  }

  runRetest(args) {
    const rows = this.readCSV();
    const handsToTest = this.getHandsToRetest(args, rows);
    
    if (handsToTest.length === 0) {
      console.log("No hands found to retest.");
      return;
    }
    
    if (args.flopsExplicit) {
      this.runRetestWithFlops(args, handsToTest);
    } else {
      this.runRetestNormal(args, handsToTest);
    }
  }

  getHandsToRetest(args, rows) {
    if (args.retest === "all") {
      return rows;
    }
    const idRange = this.parseIdRange(args.retest);
    if (idRange === null) {
      console.error(`Invalid retest argument: ${args.retest}`);
      return [];
    }
    return rows.filter(row => row.hand_id >= idRange.start && row.hand_id <= idRange.end);
  }

  runRetestWithFlops(args, handsToTest) {
    const preflopHands = handsToTest.filter(row => !row.board || row.board.trim() === "");
    const originalCount = handsToTest.length;
    
    if (preflopHands.length === 0) {
      console.log(`No hands with empty boards found (from ${originalCount} total)`);
      return;
    }
    
    process.stdout.write(`Re-testing ${preflopHands.length} hand(s)${args.retestClean ? ' (--clean mode: will delete passing tests)' : ''}${args.flopsExplicit ? ` with ${args.flops} flops per hand` : ''}...\n`);
    
    const totalFlopsToTest = preflopHands.length * args.flops;
    const overallStats = this.createStats();
    let totalFlopsCompleted = 0;
    let passed = 0, failed = 0, deleted = 0;
    
    this.updateProgressBar(0, totalFlopsToTest, 0, overallStats, 40, null);
    
    for (const row of preflopHands) {
      const result = this.processRetestFlopHand(args, row, overallStats, totalFlopsCompleted, totalFlopsToTest);
      totalFlopsCompleted = result.totalFlopsCompleted;
      if (result.passed) passed++;
      else failed++;
      if (result.deleted) deleted++;
    }
    
    this.finishRetest(passed, failed, deleted, args.retestClean);
  }

  createStats() {
    return {
      preflop: { found: 0, tested: 0, totalDiff: 0 },
      flop: { found: 0, tested: 0, totalDiff: 0 },
      turn: { found: 0, tested: 0, totalDiff: 0 },
      river: { found: 0, tested: 0, totalDiff: 0 }
    };
  }

  processRetestFlopHand(args, row, overallStats, totalFlopsCompleted, totalFlopsToTest) {
    const heroCards = row.hero.split(' ');
    const villainCards = row.villain.split(' ');
    
    this.updateProgressBar(totalFlopsCompleted, totalFlopsToTest, overallStats.river.found, overallStats, 40, null);
    
    const preflopEquityBitval = this.calculateEquityBitval(heroCards, villainCards, [], 100000);
    const preflopEquityReference = this.calculateEquityReference(heroCards, villainCards, []);
    const preflopDiff = this.roundEquity(preflopEquityBitval - preflopEquityReference);
    
    this.updateProgressBar(totalFlopsCompleted, totalFlopsToTest, overallStats.river.found, overallStats, 40, {
      bitval: preflopEquityReference,
      reference: preflopEquityReference
    });
    
    if (Math.abs(preflopDiff) <= args.tolerance) {
      return this.handleRetestPass(args, row, totalFlopsCompleted, args.flops, totalFlopsToTest, overallStats);
    }
    
    return this.handleRetestFail(args, row, heroCards, villainCards, preflopDiff, preflopEquityReference, overallStats, totalFlopsCompleted, totalFlopsToTest);
  }

  handleRetestPass(args, row, totalFlopsCompleted, flops, totalFlopsToTest, overallStats) {
    totalFlopsCompleted += flops;
    overallStats.preflop.tested++;
    
    if (args.retestClean) {
      if (this.deleteCSVRow(row.hand_id)) {
        this.updateProgressBar(totalFlopsCompleted, totalFlopsToTest, overallStats.river.found, overallStats, 40, null);
        return { totalFlopsCompleted, passed: true, failed: false, deleted: true };
      }
    } else {
      this.updateCSVRow(row.hand_id, {
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
    }
    
    this.updateProgressBar(totalFlopsCompleted, totalFlopsToTest, overallStats.river.found, overallStats, 40, null);
    return { totalFlopsCompleted, passed: true, failed: false, deleted: false };
  }

  handleRetestFail(args, row, heroCards, villainCards, preflopDiff, preflopEquityReference, overallStats, totalFlopsCompleted, totalFlopsToTest) {
    const baseFlopsCompleted = totalFlopsCompleted;
    let runningSumBitvalEquity = 0;
    let runningCountFlops = 0;
    let shouldExitEarly = false;
    
    const progressCallback = (flopStats) => {
      if (flopStats.currentEquityBitval !== undefined) {
        runningSumBitvalEquity += flopStats.currentEquityBitval;
        runningCountFlops++;
        const runningAvgBitvalEquity = runningSumBitvalEquity / runningCountFlops;
        const avgDiff = Math.abs(runningAvgBitvalEquity - preflopEquityReference);
        if (avgDiff <= args.tolerance && runningCountFlops >= 100) {
          shouldExitEarly = true;
        }
      }
      this.updateRetestProgress(flopStats, overallStats, baseFlopsCompleted, totalFlopsToTest);
      return shouldExitEarly;
    };
    
    const results = this.testHandSkipPreflop(heroCards, villainCards, args.tolerance, 0.00, args.flops, false, progressCallback, preflopDiff, preflopEquityReference);
    
    if (results && results.earlyExit) {
      return this.handleEarlyExit(args, row, baseFlopsCompleted, args.flops, totalFlopsToTest, overallStats);
    }
    
    return this.handleRetestFailSave(args, row, heroCards, villainCards, results, baseFlopsCompleted, args.flops, totalFlopsToTest, overallStats);
  }

  updateRetestProgress(flopStats, overallStats, baseFlopsCompleted, totalFlopsToTest) {
    overallStats.flop.tested = baseFlopsCompleted + (flopStats.flopsTested || 0);
    overallStats.flop.found = (overallStats.flop.found || 0) + (flopStats.flopDiscrepancies || 0);
    overallStats.flop.totalDiff = (overallStats.flop.totalDiff || 0) + (flopStats.flopTotalDiff || 0);
    overallStats.turn.tested = (overallStats.turn.tested || 0) + (flopStats.turnsTested || 0);
    overallStats.turn.found = (overallStats.turn.found || 0) + (flopStats.turnDiscrepancies || 0);
    overallStats.turn.totalDiff = (overallStats.turn.totalDiff || 0) + (flopStats.turnTotalDiff || 0);
    overallStats.river.tested = (overallStats.river.tested || 0) + (flopStats.riversTested || 0);
    overallStats.river.found = (overallStats.river.found || 0) + (flopStats.riverDiscrepancies || 0);
    overallStats.river.totalDiff = (overallStats.river.totalDiff || 0) + (flopStats.riverTotalDiff || 0);
    
    const foundCount = overallStats.river.found;
    this.updateProgressBar(overallStats.flop.tested, totalFlopsToTest, foundCount, overallStats, 40, null);
  }

  handleEarlyExit(args, row, baseFlopsCompleted, flops, totalFlopsToTest, overallStats) {
    const totalFlopsCompleted = baseFlopsCompleted + flops;
    let deleted = 0;
    
    if (args.retestClean) {
      if (this.deleteCSVRow(row.hand_id)) {
        deleted = 1;
      }
    } else {
      this.updateCSVRow(row.hand_id, {
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
    }
    
    this.updateProgressBar(totalFlopsCompleted, totalFlopsToTest, overallStats.river.found, overallStats, 40, null);
    return { totalFlopsCompleted, passed: true, failed: false, deleted: deleted > 0 };
  }

  handleRetestFailSave(args, row, heroCards, villainCards, results, baseFlopsCompleted, flops, totalFlopsToTest, overallStats) {
    overallStats.preflop.found++;
    overallStats.preflop.tested++;
    overallStats.preflop.totalDiff += Math.abs(results.preflopDiff);
    
    if (results.riverCount > 0) {
      overallStats.river.found += results.riverCount;
      overallStats.river.totalDiff += results.riverTotalDiff || 0;
    }
    
    const totalFlopsCompleted = baseFlopsCompleted + flops;
    this.updateProgressBar(totalFlopsCompleted, totalFlopsToTest, overallStats.river.found, overallStats, 40, null);
    
    this.deleteCSVRow(row.hand_id);
    
    if (results.discrepantRivers.length > 0) {
      this.saveRiverDiscrepancies(heroCards, villainCards, results);
    } else {
      this.savePreflopDiscrepancy(heroCards, villainCards, results);
    }
    
    return { totalFlopsCompleted, passed: false, failed: true, deleted: false };
  }

  saveRiverDiscrepancies(heroCards, villainCards, results) {
    for (const riverDiscrepancy of results.discrepantRivers) {
      const worstBoard = [...riverDiscrepancy.flop, riverDiscrepancy.turn, riverDiscrepancy.river].join(' ');
      const hero7CardNew = [...heroCards, ...worstBoard.split(' ')].join(' ');
      const villain7CardNew = [...villainCards, ...worstBoard.split(' ')].join(' ');
      
      const newRow = {
        hand_id: this.getNextHandId(),
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
      
      this.appendToCSV(newRow);
    }
  }

  savePreflopDiscrepancy(heroCards, villainCards, results) {
    const newRow = {
      hand_id: this.getNextHandId(),
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
    
    this.appendToCSV(newRow);
  }

  runRetestNormal(args, handsToTest) {
    const completeBoards = handsToTest.filter(row => row.board && row.board.trim() !== "");
    const originalCount = handsToTest.length;
    
    if (completeBoards.length === 0) {
      console.log(`No hands with complete boards found (from ${originalCount} total)`);
      return;
    }
    
    console.log(`Re-testing ${completeBoards.length} hand(s)${args.retestClean ? ' (--clean mode: will delete passing tests)' : ''}...\n`);
    
    let passed = 0, failed = 0, deleted = 0;
    
    for (const row of completeBoards) {
      const result = this.processRetestNormalHand(args, row);
      if (result.passed) passed++;
      else failed++;
      if (result.deleted) deleted++;
    }
    
    this.finishRetest(passed, failed, deleted, args.retestClean);
  }

  processRetestNormalHand(args, row) {
    const heroCards = row.hero.split(' ');
    const villainCards = row.villain.split(' ');
    const board = row.board.split(' ');
    
    const equityBitval = this.calculateEquityBitval(heroCards, villainCards, board);
    const equityReference = this.calculateEquityReference(heroCards, villainCards, board);
    const equityDiff = this.roundEquity(equityBitval - equityReference);
    
    const rankingBitval = this.evaluateHandRankingBitval(heroCards, villainCards, board);
    const rankingReference = this.evaluateHandRankingReference(heroCards, villainCards, board);
    const rankingMatch = this.compareHandRankings(rankingBitval, rankingReference);
    
    const equityFails = Math.abs(equityDiff) > 0.00;
    const rankingFails = !rankingMatch.match;
    const failureType = this.determineFailureType(equityDiff, rankingMatch, 0.00);
    
    if (failureType === "") {
      return this.handleNormalRetestPass(args, row);
    }
    
    return this.handleNormalRetestFail(args, row, equityBitval, equityReference, equityDiff, failureType);
  }

  handleNormalRetestPass(args, row) {
    if (args.retestClean) {
      if (this.deleteCSVRow(row.hand_id)) {
        return { passed: true, failed: false, deleted: true };
      }
    } else {
      this.updateCSVRow(row.hand_id, {
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
    }
    return { passed: true, failed: false, deleted: false };
  }

  handleNormalRetestFail(args, row, equityBitval, equityReference, equityDiff, failureType) {
    this.updateCSVRow(row.hand_id, {
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
    return { passed: false, failed: true, deleted: false };
  }

  finishRetest(passed, failed, deleted, retestClean) {
    if (retestClean) {
      console.log();
    }
    
    console.log("=".repeat(80));
    console.log(`Re-test complete: ${passed} passed, ${failed} failed`);
    if (retestClean) {
      console.log(`Deleted ${deleted} passing test(s) from CSV`);
    }
    console.log("=".repeat(80));
  }

  runInitialTest(args) {
    console.log(`Finding discrepancies...`);
    console.log(`Pre-flop hands to test: ${args.preflops}`);
    console.log(`Flops per hand: ${args.flops}`);
    console.log(`Pre-flop tolerance: ${args.tolerance}%`);
    console.log(`Flop/Turn/River tolerance: 0.00%`);
    console.log("=".repeat(80));
    
    const stats = this.createStats();
    let tested = 0;
    let found = 0;
    let handId = this.getNextHandId();
    
    this.updateProgressBar(0, args.preflops, 0, stats, 40, null);
    
    while (tested < args.preflops) {
      const { hero, villain } = this.generateRandomHand();
      tested++;
      stats.preflop.tested++;
      
      this.updateProgressBar(tested, args.preflops, found, stats, 40, null);
      
      const result = this.processInitialTestHand(args, hero, villain, stats, tested, found);
      
      if (result && result.shouldSave) {
        this.saveInitialTestResults(result, hero, villain, handId);
        found += result.discrepanciesFound;
        handId += result.discrepanciesFound;
      }
    }
    
    this.finishInitialTest(tested, found);
  }

  processInitialTestHand(args, hero, villain, stats, tested, found) {
    const state = this.initInitialTestState(stats);
    const progressCallback = this.createInitialProgressCallback(args, hero, villain, stats, tested, found, state);
    const results = this.testHand(hero, villain, args.tolerance, 0.00, args.flops, false, progressCallback);
    
    return this.processInitialTestResults(args, hero, villain, stats, tested, found, results, state);
  }

  initInitialTestState(stats) {
    return {
      runningSumBitvalEquity: 0,
      runningCountFlops: 0,
      preflopEquityReference: null,
      flopBaseTested: stats.flop.tested,
      flopBaseFound: stats.flop.found,
      flopBaseTotalDiff: stats.flop.totalDiff
    };
  }

  createInitialProgressCallback(args, hero, villain, stats, tested, found, state) {
    return (flopStats) => {
      this.updateProgressState(flopStats, state);
      this.updateProgressStats(flopStats, stats, state);
      const shouldExit = this.checkEarlyExit(args, state);
      this.updateProgressBar(tested, args.preflops, found, stats, 40, this.getEquityDisplay(state));
      return shouldExit;
    };
  }

  updateProgressState(flopStats, state) {
    if (flopStats.preflopEquityReference !== undefined) {
      state.preflopEquityReference = flopStats.preflopEquityReference;
    }
    if (flopStats.currentEquityBitval !== undefined) {
      state.runningSumBitvalEquity += flopStats.currentEquityBitval;
      state.runningCountFlops++;
    }
  }

  updateProgressStats(flopStats, stats, state) {
    stats.flop.tested = state.flopBaseTested + flopStats.flopsTested;
    stats.flop.found = state.flopBaseFound + flopStats.flopDiscrepancies;
    stats.flop.totalDiff = state.flopBaseTotalDiff + (flopStats.flopTotalDiff || 0);
  }

  checkEarlyExit(args, state) {
    const runningAvg = this.getRunningAverage(state);
    if (!runningAvg || !state.preflopEquityReference || state.runningCountFlops < 50) {
      return false;
    }
    const avgDiff = Math.abs(runningAvg - state.preflopEquityReference);
    return avgDiff <= args.tolerance;
  }

  getRunningAverage(state) {
    return state.runningCountFlops > 0 ? state.runningSumBitvalEquity / state.runningCountFlops : null;
  }

  getEquityDisplay(state) {
    const runningAvg = this.getRunningAverage(state);
    if (!runningAvg || !state.preflopEquityReference) return null;
    return { bitval: runningAvg, reference: state.preflopEquityReference };
  }

  processInitialTestResults(args, hero, villain, stats, tested, found, results, state) {
    if (results !== null && state.preflopEquityReference === null) {
      state.preflopEquityReference = results.preflopEquityReference || this.calculateEquityReference(hero, villain, []);
    }
    
    if (results !== null && results.earlyExit) {
      stats.flop.tested = state.flopBaseTested + (results.flopsTested || 0);
      this.updateProgressBar(tested, args.preflops, found, stats, 40, null);
      return { shouldSave: false };
    }
    
    if (results !== null) {
      this.updateStatsFromResults(results, stats, state.flopBaseTested, state.flopBaseFound, state.flopBaseTotalDiff);
    }
    
    this.updateProgressBar(tested, args.preflops, found, stats, 40, this.getEquityDisplay(state));
    
    if (results !== null) {
      return this.prepareInitialTestSave(results, hero, villain);
    }
    
    return { shouldSave: false };
  }

  updateStatsFromResults(results, stats, flopBaseTested, flopBaseFound, flopBaseTotalDiff) {
    this.updatePreflopStats(results, stats);
    this.updateFlopStatsFromResults(results, stats, flopBaseTested, flopBaseFound, flopBaseTotalDiff);
    this.updateTurnStatsFromResults(results, stats);
    this.updateRiverStatsFromResults(results, stats);
  }

  updatePreflopStats(results, stats) {
    stats.preflop.found++;
    stats.preflop.totalDiff += Math.abs(results.preflopDiff);
  }

  updateFlopStatsFromResults(results, stats, flopBaseTested, flopBaseFound, flopBaseTotalDiff) {
    stats.flop.tested = flopBaseTested + (results.flopsTested || 0);
    stats.flop.found = flopBaseFound + results.flopCount;
    stats.flop.totalDiff = flopBaseTotalDiff + (results.flopTotalDiff || 0);
  }

  updateTurnStatsFromResults(results, stats) {
    stats.turn.tested += results.turnsTested || 0;
    stats.turn.found += results.turnCount;
    stats.turn.totalDiff += results.turnTotalDiff || 0;
  }

  updateRiverStatsFromResults(results, stats) {
    stats.river.tested += results.riversTested || 0;
    stats.river.found += results.riverCount;
    stats.river.totalDiff += results.riverTotalDiff || 0;
  }

  prepareInitialTestSave(results, hero, villain) {
    if (results.discrepantRivers.length > 0) {
      return {
        shouldSave: true,
        discrepanciesFound: results.discrepantRivers.length,
        results,
        hero,
        villain
      };
    }
    
    return {
      shouldSave: true,
      discrepanciesFound: 1,
      results,
      hero,
      villain
    };
  }

  saveInitialTestResults(result, hero, villain, handId) {
    if (result.results.discrepantRivers.length > 0) {
      this.saveInitialRiverDiscrepancies(result.results, hero, villain, handId);
    } else {
      this.saveInitialPreflopDiscrepancy(result.results, hero, villain, handId);
    }
  }

  saveInitialRiverDiscrepancies(results, hero, villain, handId) {
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
        river_count: 1,
        total_discrepancies: 1
      };
      
      this.appendToCSV(row);
    }
  }

  saveInitialPreflopDiscrepancy(results, hero, villain, handId) {
    const hero7Card = hero.join(' ');
    const villain7Card = villain.join(' ');
    
    const row = {
      hand_id: handId,
      hero: hero7Card,
      villain: villain7Card,
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
    
    this.appendToCSV(row);
  }

  finishInitialTest(tested, found) {
    this.updateProgressBar(tested, tested, found, this.createStats(), 40, null);
    console.log("\n" + "=".repeat(80));
    console.log(`Completed: ${tested} hands tested, ${found} discrepancies found`);
    console.log(`CSV file: ${this.CSV_FILE}`);
  }
}

// Run main if executed directly
if (require.main === module) {
  const bitvalDebug = new bitvalDebug();
  evalDebug.main();
}

module.exports = bitvalDebug;

