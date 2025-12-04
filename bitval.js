class XorShift32 {
  constructor(seed = null) {
    this.state = seed !== null ? seed : Math.floor(Math.random() * 2147483647) || 1;
  }

  next(max) {
    let x = this.state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    this.state = x;
    return Math.abs(x) % max;
  }
}

/**
 * Fastest auto-clearing cache with minimal overhead.
 * Uses bitwise counter check to avoid expensive modulo operations.
 */
class FastestAutoClearingCache {
  constructor(maxSize = 16000000) {
    this.maxSize = maxSize;
    this.clearThreshold = Math.floor(maxSize * 0.95); // Clear at 95% capacity
    this.cache = new Map();
    this.counter = 0;
  }
  
  has(key) {
    return this.cache.has(key); // No overhead on hot path
  }
  
  get(key) {
    return this.cache.get(key); // No overhead on hot path
  }
  
  set(key, value) {
    // Bitwise check is faster than modulo - check every ~1 million operations
    // 0xFFFFF = 1,048,576 (2^20)
    if ((++this.counter & 0xFFFFF) === 0) {
      if (this.cache.size >= this.clearThreshold) {
        this.cache.clear();
      }
    }
    this.cache.set(key, value);
  }
  
  clear() {
    this.cache.clear();
  }
  
  get size() {
    return this.cache.size;
  }
}

class BitVal {
  constructor() {
    // Suit constants
    this._DIAMOND = 3n;
    this._HEART = 2n;
    this._CLUB = 1n;
    this._SPADE = 0n;
    
    // Rank constants
    this._ACE = (1n << 52n) | 1n;
    this._KING = 1n << 48n;
    this._QUEEN = 1n << 44n;
    this._JACK = 1n << 40n;
    this._TEN = 1n << 36n;
    this._NINE = 1n << 32n;
    this._EIGHT = 1n << 28n;
    this._SEVEN = 1n << 24n;
    this._SIX = 1n << 20n;
    this._FIVE = 1n << 16n;
    this._FOUR = 1n << 12n;
    this._THREE = 1n << 8n;
    this._TWO = 1n << 4n;

    // Card masks lookup table
    this.CARD_MASKS = {
      'As': this._ACE << this._SPADE,
      'Ah': this._ACE << this._HEART,
      'Ad': this._ACE << this._DIAMOND,
      'Ac': this._ACE << this._CLUB,
      'Ks': this._KING << this._SPADE,
      'Kh': this._KING << this._HEART,
      'Kd': this._KING << this._DIAMOND,
      'Kc': this._KING << this._CLUB,
      'Qs': this._QUEEN << this._SPADE,
      'Qh': this._QUEEN << this._HEART,
      'Qd': this._QUEEN << this._DIAMOND,
      'Qc': this._QUEEN << this._CLUB,
      'Js': this._JACK << this._SPADE,
      'Jh': this._JACK << this._HEART,
      'Jd': this._JACK << this._DIAMOND,
      'Jc': this._JACK << this._CLUB,
      'Ts': this._TEN << this._SPADE,
      'Th': this._TEN << this._HEART,
      'Td': this._TEN << this._DIAMOND,
      'Tc': this._TEN << this._CLUB,
      '9s': this._NINE << this._SPADE,
      '9h': this._NINE << this._HEART,
      '9d': this._NINE << this._DIAMOND,
      '9c': this._NINE << this._CLUB,
      '8s': this._EIGHT << this._SPADE,
      '8h': this._EIGHT << this._HEART,
      '8d': this._EIGHT << this._DIAMOND,
      '8c': this._EIGHT << this._CLUB,
      '7s': this._SEVEN << this._SPADE,
      '7h': this._SEVEN << this._HEART,
      '7d': this._SEVEN << this._DIAMOND,
      '7c': this._SEVEN << this._CLUB,
      '6s': this._SIX << this._SPADE,
      '6h': this._SIX << this._HEART,
      '6d': this._SIX << this._DIAMOND,
      '6c': this._SIX << this._CLUB,
      '5s': this._FIVE << this._SPADE,
      '5h': this._FIVE << this._HEART,
      '5d': this._FIVE << this._DIAMOND,
      '5c': this._FIVE << this._CLUB,
      '4s': this._FOUR << this._SPADE,
      '4h': this._FOUR << this._HEART,
      '4d': this._FOUR << this._DIAMOND,
      '4c': this._FOUR << this._CLUB,
      '3s': this._THREE << this._SPADE,
      '3h': this._THREE << this._HEART,
      '3d': this._THREE << this._DIAMOND,
      '3c': this._THREE << this._CLUB,
      '2s': this._TWO << this._SPADE,
      '2h': this._TWO << this._HEART,
      '2d': this._TWO << this._DIAMOND,
      '2c': this._TWO << this._CLUB
    }

    this.ALL_CARD_MASKS = Object.values(this.CARD_MASKS);

    // Hand strength score constants
    this.PAIR_SCORE = 1n << 56n;
    this.TWO_PAIRS_SCORE = 1n << 57n;
    this.TRIPS_SCORE = 1n << 58n;
    this.STRAIGHT_SCORE = 1n << 59n;
    this.FLUSH_SCORE = 1n << 60n;
    this.FULL_HOUSE_SCORE = 1n << 61n;
    this.QUADS_SCORE = 1n << 62n;
    this.STRAIGHT_FLUSH_SCORE = 1n << 63n;

    // Bit manipulation constants
    this.BIT_1 = BigInt("0b00010001000100010001000100010001000100010001000100010001");
    this.BIT_2 = BigInt("0b00100010001000100010001000100010001000100010001000100010");
    this.BIT_3 = BigInt("0b01000100010001000100010001000100010001000100010001000100");
    this.BIT_4 = BigInt("0b10001000100010001000100010001000100010001000100010001000");

    // Rank masks for kicker extraction
    this.RANK_MASKS = [
      240n,
      3840n,
      61440n,
      983040n,
      15728640n,
      251658240n,
      4026531840n,
      64424509440n,
      1030792151040n,
      16492674416640n,
      263882790666240n,
      4222124650659840n,
      67553994410557455n
    ];

    this.RANK_MASK_LOOKUP = {
      16n: 240n,
      256n: 3840n,
      4096n: 61440n,
      65536n: 983040n,
      1048576n: 15728640n,
      16777216n: 251658240n,
      268435456n: 4026531840n,
      4294967296n: 64424509440n,
      68719476736n: 1030792151040n,
      1099511627776n: 16492674416640n,
      17592186044416n: 263882790666240n,
      281474976710656n: 4222124650659840n,
      4503599627370496n: 67553994410557455n,
      1n: 67553994410557455n
    };
  }

  // ============================================
  // PUBLIC API - Core Hand Evaluation
  // ============================================

  /**
   * Evaluates a poker hand represented as a BigInt bitmask.
   * @param {BigInt} handMask - Bitmask representing 5-7 cards
   * @returns {Array} [evaluation, kickers] - Evaluation score and kicker bits
   */
  evaluate(hand) {
    let response = 0n;
    if (response = this._bitStraightFlush(hand)) {
      return [response | this.STRAIGHT_FLUSH_SCORE, null];
    }

    if (response = this._bitQuads(hand)) {
      let quadsRanksMask = this._getRankMaskFromBitmask(response);
      let kickers = this._extractKickers(hand, quadsRanksMask, 1);
      return [(response | this.QUADS_SCORE), kickers];
    }

    let trips = this._bitTrips(hand) & (0xFFFFFFFFFFFF0n | (1n << 52n));
    let pairs = this._bitPairs(hand) & (0xFFFFFFFFFFFF0n | (1n << 52n));

    if ((trips && pairs && trips ^ pairs) || this.countBits(trips) > 1) {
      return [trips | this.FULL_HOUSE_SCORE, this.stripBits(pairs & ~trips, 1)];
    }

    if (response = this._bitFlush(hand)) {
      return [response | this.FLUSH_SCORE, null];
    }

    if (response = this._bitStraight(hand)) {
      return [response | this.STRAIGHT_SCORE, null];
    }

    if (response = trips) {
      let tripsRanksMask = this._getRankMaskFromBitmask(response);
      let kickers = this._extractKickers(hand, tripsRanksMask, 2);
      return [(response | this.TRIPS_SCORE), kickers];
    }

    if (response = pairs) {
      if (this.countBits(response) > 1) {
        let pairRanksMask = this._getTwoPairRanksMask(response);
        let kickers = this._extractKickers(hand, pairRanksMask, 1);
        return [(response | this.TWO_PAIRS_SCORE), kickers];
    }
      let pairRanksMask = this._getRankMaskFromBitmask(response);
      let kickers = this._extractKickers(hand, pairRanksMask, 3);
      return [(response | this.PAIR_SCORE), kickers];
    }

    return [this.stripBits(this.normalize(hand), 5), null];
  }

  /**
   * Gets the human-readable hand strength from an evaluation mask.
   * @param {BigInt} handMask - Evaluation mask with score bits
   * @returns {String} Hand strength name
   */
  getHandStrengthFromMask(handMask) {
    if (handMask & this.PAIR_SCORE) {
      return "Pair";
    }
    if (handMask & this.TWO_PAIRS_SCORE) {
      return "Two Pair";
    }
    if (handMask & this.TRIPS_SCORE) {
      return "Trips";
    }
    if (handMask & this.STRAIGHT_SCORE) {
      return "Straight";
    }
    if (handMask & this.FLUSH_SCORE) {
      return "Flush";
    }
    if (handMask & this.FULL_HOUSE_SCORE) {
      return "Full House";
    }
    if (handMask & this.QUADS_SCORE) {
      return "Quads";
    }
    if (handMask & this.STRAIGHT_FLUSH_SCORE) {
      return "Straight Flush";
    }
    return "High Card";
  }

  /**
   * Simulates a single hand vs hand matchup using Monte Carlo or exhaustive enumeration.
   * @param {Number} iterations - Number of simulations
   * @param {Number} numberOfBoardCards - Total board cards (default: 5)
   * @param {Array} hero - Hero's hole cards as array of strings
   * @param {Array} villain - Villain's hole cards as array of strings
   * @param {Array} board - Board cards as array of strings
   * @param {Array} deadCards - Dead cards as array of strings
   * @returns {Object} { win, tie, lose, ...handStrengths } - Results object
   */
  simulate(iterations, numberOfBoardCards = 5, hero = [], villain = [], board = [], deadCards = []) {
    let numberOfCardsToDeal = (numberOfBoardCards + 2) - (hero.length + board.length);
    this.xorShift = new XorShift32();

    const allDeadCards = [...hero, ...villain, ...board, ...deadCards];
    deadCards = this.getBitMasked(allDeadCards);
    numberOfCardsToDeal = numberOfBoardCards - board.length;
    hero = this.getBitMasked(hero);
    villain = this.getBitMasked(villain);
    board = this.getBitMasked(board);

    const availableCards = 52 - new Set(allDeadCards).size;
    const exhaustiveCombinations = this.combinations(availableCards, numberOfCardsToDeal);
    iterations = Math.min(iterations, exhaustiveCombinations);

    const isExhaustive = iterations === exhaustiveCombinations && numberOfCardsToDeal > 0 && numberOfCardsToDeal <= 2;
    let comboArray = null;
    if (isExhaustive) {
      const availableMasks = this._getAvailableCardMasksByLookUp(deadCards);
      comboArray = this._getCombinations(availableMasks, numberOfCardsToDeal);
    }

    let result = { 
      "win": 0,
      "tie": 0,
      "lose": 0,
      "High Card": 0,
      "Pair": 0,
      "Two Pair": 0,
      "Trips": 0,
      "Straight": 0,
      "Flush": 0,
      "Full House": 0,
      "Quads": 0,
      "Straight Flush": 0
    };

    for (let i = 0; i < iterations; i++) {
      let _board = isExhaustive && comboArray
        ? board | comboArray[i]
        : this.deal(board, deadCards, numberOfCardsToDeal) | board;

      let [hero_eval, hero_tiebreaker] = this.evaluate(hero | _board);
      let [villain_eval, villain_tiebreaker] = this.evaluate(villain | _board);

      if (hero_eval > villain_eval) {
        result["win"]++;
        continue;
      }
      if (hero_eval < villain_eval) {
        result["lose"]++;
        continue;
      }
      if (hero_tiebreaker > villain_tiebreaker) {
        result["win"]++;
        continue;
      }
      if (hero_tiebreaker < villain_tiebreaker) {
        result["lose"]++;
        continue;
      }

      result["tie"]++
    }
    
    return result;
  }

  // ============================================
  // PUBLIC API - Range Comparison
  // ============================================

  /**
   * Compares two ranges of hands with optional canonical key caching optimization.
   * @param {Array} heroHands - Array of hero hand strings (e.g., ['AsAh', 'AsAd'])
   * @param {Array} villainHands - Array of villain hand strings
   * @param {Array} boardCards - Board cards as strings (default: [])
   * @param {Array} deadCards - Dead cards as strings (default: [])
   * @param {Number} numberOfBoardCards - Total board cards (default: 5)
   * @param {Number} iterations - Number of simulations per matchup (default: 10000)
   * @param {Boolean} optimize - Use canonical key caching (default: true)
   * @param {Function} progressCallback - Optional progress callback (current, total, message)
   * @param {Number} progressInterval - Update progress every N matchups (default: 100)
   * @param {Boolean} useWorkers - Use Web Workers for parallelization (default: true)
   * @returns {Promise<Object>} { win, tie, lose } - Results object
   */
  async compareRange(heroHands, villainHands, boardCards = [], deadCards = [], numberOfBoardCards = 5, iterations = 10000, optimize = true, progressCallback = null, progressInterval = 100, useWorkers = true) {
    const setup = this._compareRangeSetup(heroHands, villainHands, boardCards, deadCards, numberOfBoardCards, iterations, optimize);
    return optimize ? await this._compareRangeOptimized(setup, progressCallback, progressInterval, useWorkers) : await this._compareRangeUnoptimized(heroHands, villainHands, setup, progressCallback, progressInterval);
  }

  // ============================================
  // PUBLIC API - Utility Methods
  // ============================================

  /**
   * Converts an array of card strings to a BigInt bitmask.
   * @param {Array} cards - Array of card strings (e.g., ['As', 'Kh', 'Qd'])
   * @returns {BigInt} Bitmask representing the cards
   */
  getBitMasked(cards) {
    let sf_mask = 0n;

    for (let card of cards) {
      sf_mask |= this.CARD_MASKS[card];
    }

    return sf_mask;
  }

  /**
   * Counts the number of set bits in a bitmask.
   * @param {BigInt} handMask - Bitmask to count
   * @returns {Number} Number of set bits
   */
  countBits(handMask) {
    let count = 0;

    while (handMask) {
      handMask &= (handMask - 1n);
      count++;
    }
    return count;
  }

  /**
   * Calculates combinations C(n, k).
   * @param {Number} n - Total items
   * @param {Number} k - Items to choose
   * @returns {Number} Number of combinations
   */
  combinations(n, k) {
    if (k > n || k < 0) return 0;
    if (k === 0 || k === n) return 1;
    k = Math.min(k, n - k);
    let result = 1;
    for (let i = 0; i < k; i++) {
      result = result * (n - i) / (i + 1);
    }
    return Math.floor(result);
  }

  /**
   * Normalizes a hand bitmask by extracting rank information.
   * @param {BigInt} hand - Hand bitmask
   * @param {Number} bitShift - Bit shift amount (default: 4)
   * @returns {BigInt} Normalized bitmask
   */
  normalize(hand, bitShift = 4) {
    let shift_bits = ((hand | hand >> 1n | hand >> 2n | hand >> 3n) & this.BIT_1) >> 4n;
    let normal_bits = 0n;
    bitShift = BigInt(bitShift);

    for (let i = 0n; i < 13n; i++) {
      let bit = (shift_bits & (1n << i * bitShift)) >> i * bitShift;
      normal_bits += bit << i;
    }
    return normal_bits;
  }

  /**
   * Strips bits from a hand mask to reduce it to desired size.
   * @param {BigInt} hand - Hand bitmask
   * @param {Number} desiredSizeOfMask - Desired number of bits (default: 5)
   * @returns {BigInt} Stripped bitmask
   */
  stripBits(hand, desiredSizeOfMask = 5) {
    let numberOfBitsToStrip = this.countBits(hand) - desiredSizeOfMask;

    while (numberOfBitsToStrip > 0) {
      hand &= (hand - 1n);
      numberOfBitsToStrip--;
    }
    return hand;
  }

  /**
   * Deals random cards from the deck, excluding dead cards.
   * Optimized version that pre-computes available cards to avoid collision loops.
   * @param {BigInt} hand - Current hand bitmask
   * @param {BigInt} deadCards - Dead cards bitmask (default: 0n)
   * @param {Number} numberOfCards - Number of cards to deal (default: 7)
   * @returns {BigInt} Hand bitmask with new cards added
   */
  deal(hand, deadCards = 0n, numberOfCards = 7) {
    if (numberOfCards < 1) return hand;
    
    // Pre-compute available cards once (major optimization - eliminates do-while collision loop)
    const availableCards = this._getAvailableCardMasksByLookUp(hand | deadCards);
    const availableCount = availableCards.length;
    
    if (availableCount < numberOfCards) return hand;
    
    // Use Fisher-Yates style selection with direct indexing (much faster than do-while)
    for (let i = 0; i < numberOfCards; i++) {
      const randomIndex = this.xorShift.next(availableCount - i);
      const card = availableCards[randomIndex];
      hand |= card;
      
      // Swap selected card with last unselected card (Fisher-Yates shuffle)
      availableCards[randomIndex] = availableCards[availableCount - 1 - i];
    }

    return hand;
  }

  // ============================================
  // PRIVATE - Core Bitwise Evaluation Helpers
  // ============================================

  /**
   * Detects pairs in a hand using bitwise operations.
   * @private
   */
  _bitPairs(hand) {
    let pairs = ( 
      ((this.BIT_1 & hand) << 1n) & (this.BIT_2 & hand) |
      ((this.BIT_1 & hand) << 2n) & (this.BIT_3 & hand) |
      ((this.BIT_1 & hand) << 3n) & (this.BIT_4 & hand) |
      ((this.BIT_2 & hand) << 1n) & (this.BIT_3 & hand) |
      ((this.BIT_2 & hand) << 2n) & (this.BIT_4 & hand) |
      ((this.BIT_3 & hand) << 1n) & (this.BIT_4 & hand));
    pairs = (pairs >> 1n | pairs >> 2n | pairs >> 3n) & this.BIT_1;
    return this.stripBits(pairs, 2);
  }

  /**
   * Detects trips (three of a kind) in a hand using bitwise operations.
   * @private
   */
  _bitTrips(hand) {
    let a = (((this.BIT_1 & hand) << 1n & (this.BIT_2 & hand)) << 1n & (this.BIT_3 & hand)) >> 2n;
    let b = (((this.BIT_2 & hand) << 1n & (this.BIT_3 & hand)) << 1n & (this.BIT_4 & hand)) >> 3n;
    let c = (((this.BIT_1 & hand) << 2n & (this.BIT_3 & hand)) << 1n & (this.BIT_4 & hand)) >> 3n;
    let d = (((this.BIT_1 & hand) << 1n & (this.BIT_2 & hand)) << 2n & (this.BIT_4 & hand)) >> 3n;
    return this.stripBits((a | b | c | d) & this.BIT_1, 1);
  }

  /**
   * Detects a flush in a hand using bitwise operations.
   * @private
   */
  _bitFlush(hand) {
    let i = 0n;
    while (i < 4) {
      if (this.countBits((hand >> 4n) & (this.BIT_1 << i)) >= 5) {
        return this.stripBits(((hand >> 4n) & (this.BIT_1 << i)) >> i, 5);
      }
      i++;
    }
    return 0n;
  }

  /**
   * Detects a straight in a hand using bitwise operations.
   * @private
   */
  _bitStraight(hand) {
    hand = (hand | hand >> 1n | hand >> 2n | hand >> 3n) & this.BIT_1;

    hand = hand & 
      (hand << 4n) & 
      (hand << 8n) & 
      (hand << 12n) & 
      (hand << 16n);

    return this.stripBits(hand, 1);
  }

  /**
   * Detects quads (four of a kind) in a hand using bitwise operations.
   * @private
   */
  _bitQuads(hand) {
    return ((((
      (hand & this.BIT_1) << 1n &
      (hand & this.BIT_2)) << 1n &
      (hand & this.BIT_3)) << 1n &
      (hand & this.BIT_4))
      & this.BIT_4) >> 3n;
  }

  /**
   * Detects a straight flush in a hand using bitwise operations.
   * @private
   */
  _bitStraightFlush(hand) {
    hand = hand & 
      (hand << 4n) & 
      (hand << 8n) & 
      (hand << 12n) & 
      (hand << 16n);

    return this.stripBits(hand, 1);
  }

  /**
   * Extracts kicker bits from a hand given the made hand rank mask.
   * @private
   */
  _extractKickers(hand, madeHandRanksMask, numKickers) {
    const kickersOnly = hand & ~madeHandRanksMask;
    let kickerValue = 0n;
    let kickersFound = 0;

    for (let i = 12n; i >= 0n && kickersFound < numKickers; i--) {
      const rankMask = this.RANK_MASKS[i];
      if (kickersOnly & rankMask) {
        kickerValue |= (1n << (i + 13n));
        kickersFound++;
      }
    }

    return kickerValue;
  }

  /**
   * Gets the rank mask from a bitmask for kicker extraction.
   * @private
   */
  _getRankMaskFromBitmask(bitmask) {
    return (this.RANK_MASK_LOOKUP[bitmask & 1n] || 0n) |
      (this.RANK_MASK_LOOKUP[bitmask & (1n << 52n)] || 0n) |
      (this.RANK_MASK_LOOKUP[bitmask] || 0n);
  }

  /**
   * Gets the rank mask for two pairs.
   * @private
   */
  _getTwoPairRanksMask(pairsBitmask) {
    const firstBit = pairsBitmask & -pairsBitmask;
    const firstMask = this._getRankMaskFromBitmask(firstBit);

    const remaining = pairsBitmask & ~firstBit;
    const secondBit = remaining & -remaining;
    const secondMask = this._getRankMaskFromBitmask(secondBit);

    return firstMask | secondMask;
  }

  // ============================================
  // PRIVATE - Range Comparison Helpers
  // ============================================

  /**
   * Generates all valid matchups between hero and villain hands, excluding overlaps.
   * @private
   */
  _generateValidMatchups(heroHands, villainHands, boardCards = []) {
    const valid = [];
    const boardMask = boardCards.length > 0 ? this.getBitMasked(boardCards) : 0n;
    for (const h of heroHands) {
      const hMask = this.getBitMasked(this._handStringToCards(h));
      if (boardMask && (hMask & boardMask) !== 0n) continue;
      for (const v of villainHands) {
        const vMask = this.getBitMasked(this._handStringToCards(v));
        if ((vMask & boardMask) !== 0n || (hMask & vMask) !== 0n) continue;
        valid.push({ heroHand: h, villainHand: v, heroMask: hMask, villainMask: vMask });
      }
    }
    return valid;
  }

  /**
   * Calculates valid matchup counts per canonical key pair.
   * @private
   */
  _calculateValidCounts(validMatchups, hCanon, vCanon, boardCards, numberOfBoardCards) {
    const counts = new Map();
    const boardSuitCounts = boardCards.length > 0 ? this._getBoardSuitCounts(boardCards) : null;
    for (const { heroHand, villainHand } of validMatchups) {
      const hKey = this._getCanonicalKey(heroHand, boardCards, numberOfBoardCards, boardSuitCounts);
      const vKey = this._getCanonicalKey(villainHand, boardCards, numberOfBoardCards, boardSuitCounts);
      const key = `${hKey}:${vKey}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }

  /**
   * Sets up range comparison by generating valid matchups and canonical mappings.
   * @private
   */
  _compareRangeSetup(heroHands, villainHands, boardCards, deadCards, numberOfBoardCards, iterations, optimize) {
    // Generate valid matchups (always needed)
    const validMatchups = this._generateValidMatchups(heroHands, villainHands, boardCards);
    
    // Log all valid matchups for debugging
    console.log(`\n[Valid Matchups] Generated ${validMatchups.length} valid matchups:`);
    for (let i = 0; i < validMatchups.length; i++) {
      const m = validMatchups[i];
      console.log(`  ${i + 1}. Hero: ${m.heroHand} vs Villain: ${m.villainHand}`);
    }
    
    // Calculate canonical mappings only if optimization is enabled
    let hCanon = null;
    let vCanon = null;
    let validCounts = null;
    if (optimize) {
      hCanon = this._flattenHandsToCanonical(heroHands, boardCards, numberOfBoardCards);
      vCanon = this._flattenHandsToCanonical(villainHands, boardCards, numberOfBoardCards);
      validCounts = this._calculateValidCounts(validMatchups, hCanon, vCanon, boardCards, numberOfBoardCards);
    }
    
    // Calculate bitmasks
    const boardMask = this.getBitMasked(boardCards);
    const deadCardsMask = this.getBitMasked([...boardCards, ...deadCards]);
    
    // Calculate cards to deal and determine if exhaustive enumeration is possible
    const numberOfCardsToDeal = numberOfBoardCards - boardCards.length;
    const canBeExhaustive = numberOfCardsToDeal > 0 && numberOfCardsToDeal <= 2;
    
    // Calculate available cards using bitmask (more efficient than Set)
    const availableCards = 52 - this.countBits(deadCardsMask);
    
    // Determine if we should use exhaustive enumeration
    const exhaustiveCombinations = canBeExhaustive 
      ? this.combinations(availableCards, numberOfCardsToDeal) 
      : Infinity;
    iterations = Math.min(iterations, exhaustiveCombinations);
    const isExhaustive = canBeExhaustive && iterations === exhaustiveCombinations && exhaustiveCombinations < Infinity;
    
    // Generate combo array only if exhaustive
    const comboArray = isExhaustive 
      ? this._getCombinations(this._getAvailableCardMasksByLookUp(deadCardsMask), numberOfCardsToDeal) 
      : null;
    
    return { 
      hCanon, 
      vCanon, 
      boardMask, 
      deadCardsMask, 
      iterations, 
      isExhaustive, 
      comboArray, 
      numberOfCardsToDeal, 
      validMatchups, 
      validCounts, 
      boardCards, 
      numberOfBoardCards 
    };
  }

  /**
   * Serializes setup object for worker communication (converts BigInts to strings).
   * Note: Maps and complex objects are not sent to workers - workers only need basic setup data.
   * @private
   */
  _serializeSetup(setup) {
    return {
      boardMask: setup.boardMask.toString(),
      deadCardsMask: setup.deadCardsMask.toString(),
      comboArray: setup.comboArray ? setup.comboArray.map(m => m.toString()) : null,
      boardCards: setup.boardCards,
      numberOfBoardCards: setup.numberOfBoardCards,
      iterations: setup.iterations,
      isExhaustive: setup.isExhaustive,
      numberOfCardsToDeal: setup.numberOfCardsToDeal
      // Note: hCanon, vCanon, validMatchups, validCounts are not needed in workers
      // as matchups are pre-serialized and sent separately
    };
  }

  /**
   * Deserializes setup data from worker (converts string BigInts back to BigInt).
   * @private
   */
  _deserializeSetup(setupData) {
    return {
      ...setupData,
      boardMask: BigInt(setupData.boardMask),
      deadCardsMask: BigInt(setupData.deadCardsMask),
      comboArray: setupData.comboArray ? setupData.comboArray.map(s => BigInt(s)) : null
    };
  }

  /**
   * Serializes matchup data for worker communication (converts BigInt masks to strings).
   * @private
   */
  _serializeMatchup(matchup) {
    return {
      ...matchup,
      heroMask: matchup.heroMask.toString(),
      villainMask: matchup.villainMask.toString()
    };
  }

  /**
   * Deserializes matchup data from worker (converts string BigInts back to BigInt).
   * @private
   */
  _deserializeMatchup(matchupData) {
    return {
      ...matchupData,
      heroMask: BigInt(matchupData.heroMask),
      villainMask: BigInt(matchupData.villainMask)
    };
  }

  /**
   * Evaluates a single matchup with optional caching.
   * Optimized for browser performance with adaptive yielding and inlined hot loop.
   * @private
   */
  async _evaluateMatchup(heroMask, villainMask, setup, evalCache = null, progressCallback = null, matchupIndex = 0, totalMatchups = 1) {
    let win = 0, tie = 0, lose = 0;
    const deadMask = heroMask | villainMask | setup.deadCardsMask;
    
    // Initialize random number generator for Monte Carlo (not needed for exhaustive)
    if (!setup.isExhaustive) {
      this.xorShift = new XorShift32();
    }
    
    // Prepare for exhaustive enumeration if applicable
    let comboArray = null;
    let iterations = setup.iterations;
    if (setup.isExhaustive) {
      // Reuse pre-computed comboArray from setup (already computed in _compareRangeSetup)
      comboArray = setup.comboArray;
      iterations = comboArray.length;
    }
    
    // Main evaluation loop - optimized with inlined functions and adaptive yielding
    const yieldInterval = 5000; // Increased from 1000 - reduces async overhead while maintaining responsiveness
    let lastProgressTime = 0;
    const progressUpdateInterval = 100; // Update progress at most every 100ms
    
    for (let i = 0; i < iterations; i++) {
      // Generate board: use pre-computed combo for exhaustive, or deal randomly
      const board = setup.isExhaustive 
        ? setup.boardMask | comboArray[i]
        : this.deal(setup.boardMask, deadMask, setup.numberOfCardsToDeal) | setup.boardMask;
      
      // Evaluate both hands - inlined for performance (no function call overhead)
      let hEval, hKick, vEval, vKick;
      if (evalCache) {
        [hEval, hKick] = this._getCachedEvaluation(evalCache.heroKey, evalCache.heroHand, board, evalCache.cache);
        [vEval, vKick] = this._getCachedEvaluation(evalCache.villainKey, evalCache.villainHand, board, evalCache.cache);
      } else {
        [hEval, hKick] = this.evaluate(heroMask | board);
        [vEval, vKick] = this.evaluate(villainMask | board);
      }
      
      // Compare and accumulate results - inlined for performance
      if (hEval > vEval || (hEval === vEval && hKick > vKick)) {
        win++;
      } else if (vEval > hEval || (vEval === hEval && vKick > hKick)) {
        lose++;
      } else {
        tie++;
      }
      
      // Adaptive yielding: less frequent but still maintains UI responsiveness
      if (progressCallback && i > 0 && i % yieldInterval === 0) {
        const now = Date.now();
        const shouldUpdateProgress = now - lastProgressTime >= progressUpdateInterval;
        
        // Use modern browser APIs for better scheduling when available
        if (typeof scheduler !== 'undefined' && scheduler.postTask) {
          await scheduler.postTask(() => {
            if (shouldUpdateProgress) {
              const total = totalMatchups * iterations;
              const current = matchupIndex * iterations + i;
              progressCallback(current, total, `Matchup ${matchupIndex + 1}/${totalMatchups}: ${i.toLocaleString()}/${iterations.toLocaleString()}`);
              lastProgressTime = now;
            }
          }, { priority: 'user-blocking' });
        } else if (typeof requestIdleCallback !== 'undefined') {
          await new Promise(resolve => {
            requestIdleCallback(() => {
              if (shouldUpdateProgress) {
                const total = totalMatchups * iterations;
                const current = matchupIndex * iterations + i;
                progressCallback(current, total, `Matchup ${matchupIndex + 1}/${totalMatchups}: ${i.toLocaleString()}/${iterations.toLocaleString()}`);
                lastProgressTime = now;
              }
              resolve();
            }, { timeout: 1 });
          });
        } else {
          // Fallback to setTimeout
          await new Promise(resolve => setTimeout(resolve, 0));
          if (shouldUpdateProgress) {
            const total = totalMatchups * iterations;
            const current = matchupIndex * iterations + i;
            progressCallback(current, total, `Matchup ${matchupIndex + 1}/${totalMatchups}: ${i.toLocaleString()}/${iterations.toLocaleString()}`);
            lastProgressTime = now;
          }
        }
      }
    }
    
    return { matchupWin: win, matchupTie: tie, matchupLose: lose };
  }

  /**
   * Compares ranges without optimization (evaluates all matchups individually).
   * @private
   */
  async _compareRangeUnoptimized(heroHands, villainHands, setup, progressCallback = null, progressInterval = 100) {
    let win = 0, tie = 0, lose = 0;
    const total = setup.validMatchups.length;
    let lastProgressTime = 0;
    const progressUpdateInterval = 100; // Update progress at most every 100ms
    
    for (let i = 0; i < total; i++) {
      const { heroMask, villainMask } = setup.validMatchups[i];
      const { matchupWin, matchupTie, matchupLose } = await this._evaluateMatchup(heroMask, villainMask, setup, null, progressCallback, i, total);
      win += matchupWin; tie += matchupTie; lose += matchupLose;
      
      if (progressCallback && i % progressInterval === 0) {
        const now = Date.now();
        const shouldUpdateProgress = now - lastProgressTime >= progressUpdateInterval;
        
        // Use modern browser APIs for better scheduling when available
        if (typeof scheduler !== 'undefined' && scheduler.postTask) {
          await scheduler.postTask(() => {
            if (shouldUpdateProgress) {
              progressCallback(i, total, `Evaluating ${i}/${total}`);
              lastProgressTime = now;
            }
          }, { priority: 'user-blocking' });
        } else if (typeof requestIdleCallback !== 'undefined') {
          await new Promise(resolve => {
            requestIdleCallback(() => {
              if (shouldUpdateProgress) {
                progressCallback(i, total, `Evaluating ${i}/${total}`);
                lastProgressTime = now;
              }
              resolve();
            }, { timeout: 1 });
          });
        } else {
          // Fallback to setTimeout
          await new Promise(resolve => setTimeout(resolve, 0));
          if (shouldUpdateProgress) {
            progressCallback(i, total, `Evaluating ${i}/${total}`);
            lastProgressTime = now;
          }
        }
      }
    }
    if (progressCallback) progressCallback(total, total, 'Complete');
    return { win, tie, lose };
  }

  /**
   * Compares ranges with canonical key caching optimization (sequential version).
   * @private
   */
  async _compareRangeOptimizedSequential(setup, progressCallback = null, progressInterval = 100) {
    let win = 0, tie = 0, lose = 0;
    const evalCache = new FastestAutoClearingCache(16000000);
    let lastProgressTime = 0;
    const progressUpdateInterval = 100; // Update progress at most every 100ms
    
    // Pre-calculate board suit counts once (constant for all matchups)
    const boardSuitCounts = setup.boardCards.length > 0 
      ? this._getBoardSuitCounts(setup.boardCards) 
      : null;
    
    // Group validMatchups by canonical key pair
    // This ensures we only process matchups that actually exist, avoiding Cartesian product issues
    const matchupGroups = new Map();
    console.log(`\n[Sequential - Grouping Matchups] Processing ${setup.validMatchups.length} valid matchups:`);
    for (const matchup of setup.validMatchups) {
      const mHKey = this._getCanonicalKey(
        matchup.heroHand, 
        setup.boardCards, 
        setup.numberOfBoardCards, 
        boardSuitCounts
      );
      const mVKey = this._getCanonicalKey(
        matchup.villainHand, 
        setup.boardCards, 
        setup.numberOfBoardCards, 
        boardSuitCounts
      );
      const key = `${mHKey}:${mVKey}`;
      
      console.log(`  Hero: ${matchup.heroHand} (${mHKey}) vs Villain: ${matchup.villainHand} (${mVKey}) -> Key: ${key}`);
      
      if (!matchupGroups.has(key)) {
        matchupGroups.set(key, {
          heroKey: mHKey,
          villainKey: mVKey,
          representative: matchup,
          count: 0
        });
      }
      matchupGroups.get(key).count++;
    }
    console.log(`\n[Sequential - Matchup Groups] Created ${matchupGroups.size} unique canonical key pairs:`);
    for (const [key, group] of matchupGroups) {
      console.log(`  ${key}: ${group.count} matchup(s), example: ${group.representative.heroHand} vs ${group.representative.villainHand}`);
    }
    
    // Calculate accurate total matchups (number of unique canonical key pairs)
    const totalMatchups = matchupGroups.size;
    
    let matchupIndex = 0;
    // Iterate over actual matchup groups (not Cartesian product)
    console.log(`\n[Sequential - Evaluating Matchups] Starting evaluation of ${totalMatchups} unique matchups:`);
    for (const [key, group] of matchupGroups) {
      const validCount = group.count;
      const validPair = group.representative;
      
      // Log hand and canonical key mapping for debugging
      console.log(`[Matchup] Hero: ${validPair.heroHand} (Key: ${group.heroKey}) vs Villain: ${validPair.villainHand} (Key: ${group.villainKey}) | Count: ${validCount}`);
      
      const cache = { 
        heroKey: group.heroKey, 
        heroHand: validPair.heroHand, 
        villainKey: group.villainKey, 
        villainHand: validPair.villainHand, 
        cache: evalCache 
      };
      
      const { matchupWin, matchupTie, matchupLose } = await this._evaluateMatchup(
        validPair.heroMask, 
        validPair.villainMask, 
        setup, 
        cache, 
        progressCallback, 
        matchupIndex, 
        totalMatchups
      );
      
      // Log equity results for this matchup
      const totalIterations = matchupWin + matchupTie + matchupLose;
      const equity = totalIterations > 0 ? (matchupWin + matchupTie / 2) / totalIterations * 100 : 0;
      const weightedEquity = equity * validCount;
      console.log(`[Equity] ${validPair.heroHand} vs ${validPair.villainHand} (${validCount}x): Win=${matchupWin}, Tie=${matchupTie}, Lose=${matchupLose}, Total=${totalIterations}, Equity=${equity.toFixed(2)}%, Weighted=${weightedEquity.toFixed(2)}%`);
      
      win += matchupWin * validCount;
      tie += matchupTie * validCount;
      lose += matchupLose * validCount;
      
      matchupIndex++;
      if (progressCallback && matchupIndex % progressInterval === 0) {
        const now = Date.now();
        const shouldUpdateProgress = now - lastProgressTime >= progressUpdateInterval;
        
        // Use modern browser APIs for better scheduling when available
        if (typeof scheduler !== 'undefined' && scheduler.postTask) {
          await scheduler.postTask(() => {
            if (shouldUpdateProgress) {
              progressCallback(matchupIndex, totalMatchups, `Evaluating ${matchupIndex}`);
              lastProgressTime = now;
            }
          }, { priority: 'user-blocking' });
        } else if (typeof requestIdleCallback !== 'undefined') {
          await new Promise(resolve => {
            requestIdleCallback(() => {
              if (shouldUpdateProgress) {
                progressCallback(matchupIndex, totalMatchups, `Evaluating ${matchupIndex}`);
                lastProgressTime = now;
              }
              resolve();
            }, { timeout: 1 });
          });
        } else {
          // Fallback to setTimeout
          await new Promise(resolve => setTimeout(resolve, 0));
          if (shouldUpdateProgress) {
            progressCallback(matchupIndex, totalMatchups, `Evaluating ${matchupIndex}`);
            lastProgressTime = now;
          }
        }
      }
    }
    
    if (progressCallback) progressCallback(matchupIndex, matchupIndex, 'Complete');
    return { win, tie, lose };
  }

  /**
   * Compares ranges with canonical key caching optimization.
   * Supports Web Workers for parallelization when enabled.
   * @private
   */
  async _compareRangeOptimized(setup, progressCallback = null, progressInterval = 100, useWorkers = true) {
    // Pre-calculate board suit counts once (constant for all matchups)
    const boardSuitCounts = setup.boardCards.length > 0 
      ? this._getBoardSuitCounts(setup.boardCards) 
      : null;
    
    // Group validMatchups by canonical key pair
    // This ensures we only process matchups that actually exist, avoiding Cartesian product issues
    const matchupGroups = new Map();
    console.log(`\n[Parallel - Grouping Matchups] Processing ${setup.validMatchups.length} valid matchups:`);
    for (const matchup of setup.validMatchups) {
      const mHKey = this._getCanonicalKey(
        matchup.heroHand, 
        setup.boardCards, 
        setup.numberOfBoardCards, 
        boardSuitCounts
      );
      const mVKey = this._getCanonicalKey(
        matchup.villainHand, 
        setup.boardCards, 
        setup.numberOfBoardCards, 
        boardSuitCounts
      );
      const key = `${mHKey}:${mVKey}`;
      
      console.log(`  Hero: ${matchup.heroHand} (${mHKey}) vs Villain: ${matchup.villainHand} (${mVKey}) -> Key: ${key}`);
      
      if (!matchupGroups.has(key)) {
        matchupGroups.set(key, {
          heroKey: mHKey,
          villainKey: mVKey,
          representative: matchup,
          count: 0
        });
      }
      matchupGroups.get(key).count++;
    }
    console.log(`\n[Parallel - Matchup Groups] Created ${matchupGroups.size} unique canonical key pairs:`);
    for (const [key, group] of matchupGroups) {
      console.log(`  ${key}: ${group.count} matchup(s), example: ${group.representative.heroHand} vs ${group.representative.villainHand}`);
    }
    
    // Collect all matchups to evaluate (only those that actually exist)
    const matchupsToEvaluate = [];
    console.log(`\n[Parallel - Collecting Matchups] Building matchup list from ${matchupGroups.size} groups:`);
    for (const [key, group] of matchupGroups) {
      const validPair = group.representative;
      console.log(`  Adding: ${key} (${group.count}x) - Hero: ${validPair.heroHand} vs Villain: ${validPair.villainHand}`);
      matchupsToEvaluate.push({
        key,
        validCount: group.count,
        heroKey: group.heroKey,
        heroHand: validPair.heroHand,
        heroMask: validPair.heroMask,
        villainKey: group.villainKey,
        villainHand: validPair.villainHand,
        villainMask: validPair.villainMask
      });
    }
    console.log(`\n[Parallel - Matchups to Evaluate] Total: ${matchupsToEvaluate.length} unique matchups`);
    
    // Calculate total matchups (number of unique canonical key pairs)
    const totalMatchups = matchupsToEvaluate.length;
    
    // Check if workers should be used
    const shouldUseWorkers = useWorkers && 
                             typeof Worker !== 'undefined' && 
                             matchupsToEvaluate.length >= 4;
    
    if (!shouldUseWorkers) {
      // Fallback to sequential execution
      return await this._compareRangeOptimizedSequential(setup, progressCallback, progressInterval);
    }
    
    // Use Web Workers for parallelization
    const numWorkers = Math.min(navigator.hardwareConcurrency || 4, matchupsToEvaluate.length);
    const batchSize = Math.ceil(matchupsToEvaluate.length / numWorkers);
    const batches = [];
    for (let i = 0; i < matchupsToEvaluate.length; i += batchSize) {
      batches.push(matchupsToEvaluate.slice(i, i + batchSize));
    }
    
    // Serialize setup for workers
    const serializedSetup = this._serializeSetup(setup);
    
    // Create workers and distribute work
    const workers = [];
    const promises = [];
    let completedMatchups = 0;
    
    // Progress tracking
    let lastProgressTime = 0;
    const progressUpdateInterval = 100;
    const progressIntervalId = progressCallback ? setInterval(() => {
      const now = Date.now();
      if (now - lastProgressTime >= progressUpdateInterval) {
        progressCallback(completedMatchups, totalMatchups, `Evaluating with ${numWorkers} workers: ${completedMatchups}/${totalMatchups}`);
        lastProgressTime = now;
      }
    }, progressUpdateInterval) : null;
    
    for (let i = 0; i < batches.length; i++) {
      const worker = new Worker('./bitval-worker.js');
      workers.push(worker);
      
      const promise = new Promise((resolve, reject) => {
        worker.onmessage = (e) => {
          if (e.data.success) {
            completedMatchups += e.data.results.length;
            resolve(e.data.results);
          } else {
            reject(new Error(e.data.error || 'Worker error'));
          }
          worker.terminate();
        };
        worker.onerror = (error) => {
          reject(error);
          worker.terminate();
        };
        
        // Serialize matchups for this batch
        const serializedBatch = batches[i].map(m => this._serializeMatchup(m));
        
        worker.postMessage({
          matchups: serializedBatch,
          setupData: serializedSetup,
          workerId: i
        });
      });
      
      promises.push(promise);
    }
    
    // Wait for all workers and aggregate results
    let win = 0, tie = 0, lose = 0;
    try {
      const allResults = await Promise.all(promises);
      
      for (const batchResults of allResults) {
        for (const result of batchResults) {
          // Log equity results for this matchup
          const totalIterations = result.matchupWin + result.matchupTie + result.matchupLose;
          const equity = totalIterations > 0 ? (result.matchupWin + result.matchupTie / 2) / totalIterations * 100 : 0;
          const weightedEquity = equity * result.validCount;
          
          // Find the matchup details from matchupsToEvaluate
          const matchup = matchupsToEvaluate.find(m => m.key === result.key);
          const heroHand = matchup ? matchup.heroHand : 'Unknown';
          const villainHand = matchup ? matchup.villainHand : 'Unknown';
          
          console.log(`[Equity] ${heroHand} vs ${villainHand} (${result.validCount}x): Win=${result.matchupWin}, Tie=${result.matchupTie}, Lose=${result.matchupLose}, Total=${totalIterations}, Equity=${equity.toFixed(2)}%, Weighted=${weightedEquity.toFixed(2)}%`);
          
          win += result.matchupWin * result.validCount;
          tie += result.matchupTie * result.validCount;
          lose += result.matchupLose * result.validCount;
        }
      }
    } finally {
      // Clean up progress interval
      if (progressIntervalId) {
        clearInterval(progressIntervalId);
      }
      
      // Ensure all workers are terminated
      workers.forEach(worker => {
        try {
          worker.terminate();
        } catch (e) {
          // Ignore termination errors
        }
      });
      
      // Final progress update
      if (progressCallback) {
        progressCallback(totalMatchups, totalMatchups, 'Complete');
      }
    }
    
    return { win, tie, lose };
  }

  /**
   * Generates a numeric hash key from canonical key and board for faster cache lookups.
   * @private
   */
  _getCacheKeyHash(canonicalKey, board) {
    // Hash the canonical key string
    let hash = 0;
    for (let i = 0; i < canonicalKey.length; i++) {
      hash = ((hash << 5) - hash) + canonicalKey.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Combine with board bits (use lower 32 bits of BigInt for fast XOR)
    // This creates a unique numeric key from both components
    const boardBits = Number(board & 0xFFFFFFFFn);
    return hash ^ boardBits;
  }

  /**
   * Gets cached evaluation or evaluates and caches the result.
   * Uses numeric hash keys for faster cache lookups.
   * @private
   */
  _getCachedEvaluation(canonicalKey, originalHand, completeBoard, evalCache) {
    const cacheKey = this._getCacheKeyHash(canonicalKey, completeBoard);
    if (evalCache.has(cacheKey)) return evalCache.get(cacheKey);
    const handMask = this.getBitMasked(this._handStringToCards(originalHand));
    const evaluation = this.evaluate(handMask | completeBoard);
    evalCache.set(cacheKey, evaluation);
    return evaluation;
  }

  /**
   * Compares two hand evaluations to determine winner.
   * @private
   */
  _compareEvaluations(heroEval, heroKicker, villainEval, villainKicker) {
    if (heroEval > villainEval || (heroEval === villainEval && heroKicker > villainKicker)) return 1;
    if (villainEval > heroEval || (villainEval === heroEval && villainKicker > heroKicker)) return -1;
    return 0;
  }

  /**
   * Gets canonical key for a hand based on board context (for caching optimization).
   * @private
   */
  _getCanonicalKey(hand, boardCards = [], numberOfBoardCards = 5, boardSuitCounts = null) {
    const r1 = hand[0], r2 = hand[2], s1 = hand[1], s2 = hand[3];
    const rankOrder = 'AKQJT98765432';
    const r1Idx = rankOrder.indexOf(r1), r2Idx = rankOrder.indexOf(r2);
    const high = r1Idx < r2Idx ? r1 : r2, low = r1Idx < r2Idx ? r2 : r1;
    const highSuit = r1Idx < r2Idx ? s1 : s2, lowSuit = r1Idx < r2Idx ? s2 : s1;
    if (boardCards.length === 0) {
      if (r1 === r2) return high + low;
      return high + low + (s1 === s2 ? 's' : 'o');
    }
    if (!boardSuitCounts) boardSuitCounts = this._getBoardSuitCounts(boardCards);
    const cardsToCome = this._getCardsToCome(boardCards, numberOfBoardCards);
    if (r1 === r2) {
      const s1Pot = this._suitHasFlushPotential(s1, boardSuitCounts, cardsToCome);
      const s2Pot = this._suitHasFlushPotential(s2, boardSuitCounts, cardsToCome);
      if (s1Pot) return high + low + s1;
      if (s2Pot) return high + low + s2;
      return high + low;
    }
    
    // Postflop non-pairs: use 'x' notation to remove ambiguity
    const isSuited = s1 === s2;
    const highPot = this._suitHasFlushPotential(highSuit, boardSuitCounts, cardsToCome);
    const lowPot = this._suitHasFlushPotential(lowSuit, boardSuitCounts, cardsToCome);
    
    if (isSuited) {
      // Both cards same suit
      if (highPot) {
        return high + highSuit + low + lowSuit; // e.g., "AsKs" (both spades)
      } else {
        return high + low + 's'; // e.g., "AKs" (suited, no flush potential)
      }
    } else {
      // Offsuit hands
      if (highPot && !lowPot) {
        // Only high has flush potential
        return high + highSuit + low + 'x'; // e.g., "AsKx" (A is spade, K is not)
      } else if (!highPot && lowPot) {
        // Only low has flush potential
        return high + 'x' + low + lowSuit; // e.g., "AxKs" (K is spade, A is not)
      } else if (highPot && lowPot) {
        // Both have flush potential (different suits)
        return high + highSuit + low + lowSuit; // e.g., "AsKh" (both suits specified, no x)
      } else {
        // Neither has flush potential
        return high + low + 'o'; // e.g., "AKo"
      }
    }
  }

  /**
   * Flattens hands to canonical keys for caching optimization.
   * @private
   */
  _flattenHandsToCanonical(hands, boardCards = [], numberOfBoardCards = 5) {
    const canonicalMap = new Map();
    const canonicalToHand = new Map();
    const boardSuitCounts = boardCards.length > 0 ? this._getBoardSuitCounts(boardCards) : null;
    
    console.log(`\n[Canonical Mapping] Processing ${hands.length} hands:`);
    for (const hand of hands) {
      const key = this._getCanonicalKey(hand, boardCards, numberOfBoardCards, boardSuitCounts);
      canonicalMap.set(key, (canonicalMap.get(key) || 0) + 1);
      if (!canonicalToHand.has(key)) {
        canonicalToHand.set(key, hand);
      }
      console.log(`  Hand: ${hand} -> Canonical Key: ${key}`);
    }
    
    // Show summary of canonical key groupings
    console.log(`\n[Canonical Summary] ${canonicalMap.size} unique canonical keys from ${hands.length} hands:`);
    for (const [key, count] of canonicalMap.entries()) {
      const representativeHand = canonicalToHand.get(key);
      console.log(`  ${key}: ${count} hand(s), example: ${representativeHand}`);
    }
    
    return { canonicalMap, canonicalToHand };
  }

  /**
   * Gets board suit counts for flush potential calculation.
   * @private
   */
  _getBoardSuitCounts(boardCards) {
    const suitCounts = new Map();
    for (const card of boardCards) {
      const suit = card[1];
      suitCounts.set(suit, (suitCounts.get(suit) || 0) + 1);
    }
    return suitCounts;
  }

  /**
   * Gets number of cards to come.
   * @private
   */
  _getCardsToCome(boardCards, numberOfBoardCards) {
    return numberOfBoardCards - boardCards.length;
  }

  /**
   * Checks if a suit has flush potential given board and cards to come.
   * @private
   */
  _suitHasFlushPotential(suit, boardSuitCounts, cardsToCome) {
    return (boardSuitCounts.get(suit) || 0) + cardsToCome >= 4;
  }

  // ============================================
  // PRIVATE - Utility Helpers
  // ============================================

  /**
   * Converts a hand string to an array of card strings.
   * @private
   */
  _handStringToCards(hand) {
    return [hand.substring(0, 2), hand.substring(2, 4)];
  }

  /**
   * Gets available card masks by lookup, excluding dead cards.
   * @private
   */
  _getAvailableCardMasksByLookUp(deadCards) {
    let masks = [];
    let deck = ~deadCards;

    for (const card in this.CARD_MASKS) {
      const cardMask = this.CARD_MASKS[card];
      if ((cardMask & deck) === cardMask) {
        masks.push(cardMask);
      }
    }

    return masks;
  }

  /**
   * Gets combinations of available card masks.
   * @private
   */
  _getCombinations(availableMasks, k) {
    if (k === 1) return availableMasks;
    if (k === 2) {
      let combos = [];
      for (let i = 0; i < availableMasks.length; i++) {
        for (let j = i + 1; j < availableMasks.length; j++) {
          combos.push(availableMasks[i] | availableMasks[j]);
        }
      }
      return combos;
    }
    return [];
  }

  /**
   * Simulates a single matchup (legacy method, uses simulate internally).
   * @private
   */
  _simulateMatchup(heroHand, villainHand, board, deadCards, numberOfBoardCards, iterations) {
    const heroCards = this._handStringToCards(heroHand);
    const villainCards = this._handStringToCards(villainHand);
    return this.simulate(iterations, numberOfBoardCards, heroCards, villainCards, board, deadCards);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BitVal;
}
if (typeof window !== 'undefined') {
  window.BitVal = BitVal;
}
