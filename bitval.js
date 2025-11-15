class XorShift32 {
  constructor() {
    this.state = 1;//Math.floor(Math.random()*52);
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
class BitVal{


  /**
   * Constructor for PrtBitVal class. 
   * Initializes bitmask values for different card ranks and suits, 
   * along with other utility masks for hand evaluation.
   */
  constructor(){

    // Bitmask values for the FLUSH mask
    this._DIAMOND = 3n;
    this._HEART = 2n;
    this._CLUB = 1n;
    this._SPADE = 0n;
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



    // Lookup Table for specific cards [RANK, FLUSH]
    // Note that to formulate RANK masks, we rank|suit (OR) and for FLUSH
    // masks we _rank<<_suit (lshift.)
    this.CARD_MASKS = {
      'As': this._ACE    <<    this._SPADE,    
      'Ah': this._ACE    <<    this._HEART,  
      'Ad': this._ACE    <<    this._DIAMOND,  
      'Ac': this._ACE    <<    this._CLUB,
      'Ks': this._KING   <<    this._SPADE,  
      'Kh': this._KING   <<    this._HEART,
      'Kd': this._KING   <<    this._DIAMOND,
      'Kc': this._KING   <<    this._CLUB,
      'Qs': this._QUEEN  <<    this._SPADE,
      'Qh': this._QUEEN  <<    this._HEART,
      'Qd': this._QUEEN  <<    this._DIAMOND,
      'Qc': this._QUEEN  <<    this._CLUB,
      'Js': this._JACK   <<    this._SPADE,
      'Jh': this._JACK   <<    this._HEART,
      'Jd': this._JACK   <<    this._DIAMOND,
      'Jc': this._JACK   <<    this._CLUB,
      'Ts': this._TEN    <<    this._SPADE,
      'Th': this._TEN    <<    this._HEART,
      'Td': this._TEN    <<    this._DIAMOND,
      'Tc': this._TEN    <<    this._CLUB,
      '9s': this._NINE   <<    this._SPADE,
      '9h': this._NINE   <<    this._HEART,
      '9d': this._NINE   <<    this._DIAMOND,
      '9c': this._NINE   <<    this._CLUB,
      '8s': this._EIGHT  <<    this._SPADE,
      '8h': this._EIGHT  <<    this._HEART,
      '8d': this._EIGHT  <<    this._DIAMOND,
      '8c': this._EIGHT  <<    this._CLUB,
      '7s': this._SEVEN  <<    this._SPADE,
      '7h': this._SEVEN  <<    this._HEART,
      '7d': this._SEVEN  <<    this._DIAMOND,
      '7c': this._SEVEN  <<    this._CLUB,
      '6s': this._SIX    <<    this._SPADE,
      '6h': this._SIX    <<    this._HEART,
      '6d': this._SIX    <<    this._DIAMOND,
      '6c': this._SIX    <<    this._CLUB,
      '5s': this._FIVE   <<    this._SPADE,
      '5h': this._FIVE   <<    this._HEART,
      '5d': this._FIVE   <<    this._DIAMOND,
      '5c': this._FIVE   <<    this._CLUB,
      '4s': this._FOUR   <<    this._SPADE,
      '4h': this._FOUR   <<    this._HEART,
      '4d': this._FOUR   <<    this._DIAMOND,
      '4c': this._FOUR   <<    this._CLUB,
      '3s': this._THREE  <<    this._SPADE,
      '3h': this._THREE  <<    this._HEART,
      '3d': this._THREE  <<    this._DIAMOND,
      '3c': this._THREE  <<    this._CLUB,
      '2s': this._TWO    <<    this._SPADE,
      '2h': this._TWO    <<    this._HEART,
      '2d': this._TWO    <<    this._DIAMOND,
      '2c': this._TWO    <<    this._CLUB
    }

    this.ALL_HANDS = Object.keys(this.CARD_MASKS);

    // Bitmask for recording the hand
    this.PAIR_SCORE = 1n << 56n;
    this.TWO_PAIRS_SCORE = 1n << 57n;
    this.TRIPS_SCORE = 1n << 58n;
    this.STRAIGHT_SCORE = 1n << 59n;
    this.FLUSH_SCORE = 1n << 60n;
    this.FULL_HOUSE_SCORE = 1n << 61n;
    this.QUADS_SCORE = 1n << 62n;
    this.STRAIGHT_FLUSH_SCORE = 1n << 63n;

    // Quick reference masks, number indicates position from right of grouping.
    this.BIT_1 = BigInt("0b00010001000100010001000100010001000100010001000100010001");
    this.BIT_2 = BigInt("0b00100010001000100010001000100010001000100010001000100010");
    this.BIT_3 = BigInt("0b01000100010001000100010001000100010001000100010001000100");
    this.BIT_4 = BigInt("0b10001000100010001000100010001000100010001000100010001000");

    // Pre-computed rank masks for all 13 ranks (0=Two, 1=Three, ..., 12=Ace)
    // Each mask represents all 4 suits of that rank
    // Derived from rank constants: base | (base << 1) | (base << 2) | (base << 3)
    // Ace (rank 12) has dual representation: bits 0-3 and 52-55
    this.RANK_MASKS = [
      240n,                   // Rank 0 (Two)
      3840n,                  // Rank 1 (Three)
      61440n,                 // Rank 2 (Four)
      983040n,                // Rank 3 (Five)
      15728640n,              // Rank 4 (Six)
      251658240n,             // Rank 5 (Seven)
      4026531840n,            // Rank 6 (Eight)
      64424509440n,           // Rank 7 (Nine)
      1030792151040n,         // Rank 8 (Ten)
      16492674416640n,        // Rank 9 (Jack)
      263882790666240n,       // Rank 10 (Queen)
      4222124650659840n,      // Rank 11 (King)
      67553994410557455n      // Rank 12 (Ace - both high and low bits)
    ];

    // Precomputed lookup: bitmask (single rank at position rank*4+4) -> RANK_MASKS[rank]
    // Maps directly from _bitTrips/_bitQuads/_bitPairs result to rank mask
    // Fast O(1) lookup with no loops or conditionals
    this.RANK_MASK_LOOKUP = {
      16n: 240n,                    // rank 0 (2) - bit 4
      256n: 3840n,                  // rank 1 (3) - bit 8
      4096n: 61440n,                // rank 2 (4) - bit 12
      65536n: 983040n,              // rank 3 (5) - bit 16
      1048576n: 15728640n,          // rank 4 (6) - bit 20
      16777216n: 251658240n,        // rank 5 (7) - bit 24
      268435456n: 4026531840n,      // rank 6 (8) - bit 28
      4294967296n: 64424509440n,    // rank 7 (9) - bit 32
      68719476736n: 1030792151040n, // rank 8 (T) - bit 36
      1099511627776n: 16492674416640n, // rank 9 (J) - bit 40
      17592186044416n: 263882790666240n, // rank 10 (Q) - bit 44
      281474976710656n: 4222124650659840n, // rank 11 (K) - bit 48
      4503599627370496n: 67553994410557455n, // rank 12 (A) - bit 52 (trips/pairs)
      1n: 67553994410557455n        // rank 12 (A) - bit 0 (quads - low Ace)
    };

  }



  /**
   * Runs monte carlo simulations for 2 players.
   * @param {String[]} cards - An array of cards to be evaluated.
   * @returns {} - Returns an key/value pair for "win", "lose", "tie"
   */
  simulate(iterations, numberOfBoardCards = 5, hero = [], villain = [], board = [], deadCards = [], trackHands = false){

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
      "win": 0,           "tie": 0,         "lose": 0, 
      "High Card": 0,     "Pair": 0,        "Two Pair": 0, 
      "Trips": 0,         "Straight": 0,    "Flush": 0, 
      "Full House": 0,    "Quads": 0,       "Straight Flush": 0 
    };

    for (let i = 0; i < iterations; i++){
      let _board = isExhaustive && comboArray 
        ? board | comboArray[i]
        : this.deal(board, deadCards, numberOfCardsToDeal) | board;

      let [hero_eval, hero_tiebreaker] = this.evaluate(hero | _board);
      let [villain_eval, villain_tiebreaker] = this.evaluate(villain | _board);


      //this.debugString(hero, hero_eval, villain, villain_eval, _board);
      //this.debug(hero, villain, hero_eval, villain_eval);

      if (hero_eval > villain_eval){
        result["win"]++;
        continue;
      }
      if (hero_eval < villain_eval){
        result["lose"]++;
        continue;
      }
      if (hero_tiebreaker > villain_tiebreaker){
        result["win"]++;
        continue;
      }
      if (hero_tiebreaker < villain_tiebreaker){
        result["lose"]++;
        continue;
      }

      result["tie"]++
    }
    
    return result;
  }

  getHandStrengthFromMask(handMask){

    if (handMask & this.PAIR_SCORE){
        return "Pair";
    }

    if (handMask & this.TWO_PAIRS_SCORE){
        return "Two Pair";
    }

    if (handMask & this.TRIPS_SCORE){
        return "Trips";
    }

    if (handMask & this.STRAIGHT_SCORE){
        return "Straight";
    }

    if (handMask & this.FLUSH_SCORE){
        return "Flush";
    }

    if (handMask & this.FULL_HOUSE_SCORE){
        return "Full House";
    }

    if (handMask & this.QUADS_SCORE){
        return "Quads";
    }

    if (handMask & this.STRAIGHT_FLUSH_SCORE){
        return "Straight Flush";
    }

    return "High Card";
  }

  getHandFromMask(handMask){
    let hand = [];

    for (let card in this.CARD_MASKS){
      if ((this.CARD_MASKS[card] & handMask) === 0n) continue;
      hand.push(card);
      handMask = handMask ^ this.CARD_MASKS[card];
    }

      return hand;
  }

  debugString(hero, heroResult, villain, villainResult, board){
    let result = "Tie";
    if (heroResult > villainResult) result = "Hero wins.";
    if (heroResult < villainResult) result = "Hero loses.";
    console.log(this.getHandFromMask(hero).join(""),"\t",this.getHandFromMask(board).join(" "),"\t",this.getHandFromMask(villain).join(""),"\t",result);
    console.log(this.printBitmask(heroResult),this.getHandStrengthFromMask(heroResult));
    console.log(this.printBitmask(villainResult),this.getHandStrengthFromMask(villainResult));
  }
  debug(heroHand, villainHand, heroResult = false, villainResult = false, heroKickers = [], villainKickers = []){
    let maskSuits = "____ ____ dhcs dhcs dhcs dhcs dhcs dhcs dhcs dhcs dhcs dhcs dhcs dhcs dhcs dhcs";
    let maskRanks = "____ ____ AAAA KKKK QQQQ JJJJ TTTT 9999 8888 7777 6666 5555 4444 3333 2222 AAAA";
    let handRanks = "8765 4321 AAAA KKKK QQQQ JJJJ TTTT 9999 8888 7777 6666 5555 4444 3333 2222 AAAA";
    console.log("                      ",handRanks," ",handRanks);

    // Print hero row with cards
    let heroCards = this.getHandFromMask(heroHand).join(" ");
    console.log(heroCards, ":",this.printBitmask(heroResult),"=",this.printBitmask(heroKickers));

    // Print villain row with cards
    let villainCards = this.getHandFromMask(villainHand).join(" ");
    console.log(villainCards, ":",this.printBitmask(villainResult),"=",this.printBitmask(villainKickers));

    // Dark grey: ANSI escape code '\x1b[90m' (for "bright black"), reset with '\x1b[0m'
    console.log("\x1b[90m[9=SF, 8=Q, 7=FH, 6=FL, 5=ST, 4=TR, 3=TP, 2=P, 1=HC]\x1b[0m");
  }

  deal(hand, deadCards = 0n, numberOfCards = 7){
    if (numberOfCards < 1) return hand;
    let deck = ~(hand | deadCards); // XOR to find the remaining cards in the deck
    let card;

    for(let i = 0; i < numberOfCards; i++) {
      do {
        card = 1n << BigInt(this.xorShift.next(52)); // Deal a new card
      } while ((card & deck) == 0n); // Ensure the card is in the deck

      hand |= card; // Add the new card to the hand
      deck &= ~card; // Remove the dealt card from the deck
    }

    return hand;
  }

  /**
   * Unified kicker extraction and encoding
   * @param {BigInt} hand - Full hand bitmask
   * @param {BigInt} madeHandRanksMask - Mask of ranks used in the made hand (all suits)
   * @param {number} numKickers - Number of kickers needed (1, 2, or 3)
   * @returns {BigInt} - Encoded kickers at bits 13-25 (rank << 13) to avoid overlap with made hand ranks (bits 0-12)
   */
  _extractKickers(hand, madeHandRanksMask, numKickers) {
    const kickersOnly = hand & ~madeHandRanksMask;
    let kickerValue = 0n;
    let kickersFound = 0;
    
    // Extract highest kickers (descending rank order)
    for (let i = 12n; i >= 0n && kickersFound < numKickers; i--) {
      const rankMask = this.RANK_MASKS[i];
      if (kickersOnly & rankMask) {
        // Encode at bit position (rank + 13) to avoid overlap with made hand ranks
        kickerValue |= (1n << (i + 13n));
        kickersFound++;
      }
    }
    
    return kickerValue;
  }

  /**
   * Fast lookup to convert bitmask (from _bitTrips/_bitQuads/_bitPairs) to rank mask
   * Handles Ace quads special case (both bit 0 and bit 52) without conditionals
   * @param {BigInt} bitmask - Bitmask from _bitTrips, _bitQuads, or _bitPairs
   * @returns {BigInt} - RANK_MASKS value for the rank(s) in the bitmask
   */
  _getRankMaskFromBitmask(bitmask) {
    // Handle Ace quads (both bit 0 and bit 52) and normal cases
    // Uses bitwise operations - no conditionals, no loops
    return (this.RANK_MASK_LOOKUP[bitmask & 1n] || 0n) | 
           (this.RANK_MASK_LOOKUP[bitmask & (1n << 52n)] || 0n) | 
           (this.RANK_MASK_LOOKUP[bitmask] || 0n);
  }

  /**
   * Get combined rank mask for two pair (handles multiple ranks)
   * @param {BigInt} pairsBitmask - Bitmask from _bitPairs with multiple bits set
   * @returns {BigInt} - Combined RANK_MASKS for all pair ranks
   */
  _getTwoPairRanksMask(pairsBitmask) {
    // Extract first rank bit (lowest set bit)
    const firstBit = pairsBitmask & -pairsBitmask;
    const firstMask = this._getRankMaskFromBitmask(firstBit);
    
    // Extract second rank bit (remove first, then get lowest)
    const remaining = pairsBitmask & ~firstBit;
    const secondBit = remaining & -remaining;
    const secondMask = this._getRankMaskFromBitmask(secondBit);
    
    return firstMask | secondMask;
  }

  /**
   * Organize the bits in a single 13-bit bitmask.
   * @param {BigInt} hand - The bitmask of the hand to be normalized
   * @returns {BigInt[]} - Returns an array containing the card mask and straight flush mask for the given set of cards.
   */
  normalize(hand, bitShift = 4){
    let shift_bits = ((hand | hand >> 1n | hand >> 2n | hand >> 3n) & this.BIT_1) >> 4n;
    let normal_bits = 0n;
    bitShift = BigInt(bitShift);

    for (let i = 0n; i < 13n; i++) {
      let bit = (shift_bits & (1n << i*bitShift)) >> i*bitShift;
      normal_bits += bit << i;
    }
    return normal_bits;
  }


  stripBits(hand, desiredSizeOfMask = 5){
    let numberOfBitsToStrip = this.countBits(hand) - desiredSizeOfMask;

    while(numberOfBitsToStrip > 0){
      hand &= (hand - 1n);
      numberOfBitsToStrip--;
    }
    return hand;
  }





  /**
   * Constructs a bitmask pair for a given set of cards.
   * @param {String[]} cards - An array of cards to be evaluated.
   * @returns {BigInt[]} - Returns an array containing the card mask and straight flush mask for the given set of cards.
   */
  getBitMasked(cards){
    let sf_mask = 0n;

    for (let card of cards){
      sf_mask |= this.CARD_MASKS[card];
    }

    return sf_mask;
  }



  /**
   * Generates a random poker hand.
   * @param {String[]} randomHand - An optional existing hand of cards.
   * @param {Number} count - The desired size of the hand.
   * @param {String[]} deadCards - Cards that should not be included in the hand.
   * @returns {String[]} - Returns a random poker hand of the specified size.
   * 
   * Note: cards provided via randomHand are not considered dead, they must explicitly 
   * be included in deadCards. I'll probably fix this at some point.
   *
   * This would be more efficient if passed a deck.
   */



  /**
   * Counts the number of bits set in a given bitmask.
   *
   * @param {BigInt} handMask - The bitmask to count bits in.
   * @return {number} The number of bits set in handMask.
   */
  countBits(handMask){
    let count = 0;

    while (handMask) {
      handMask &= (handMask - 1n);
      count++;
    }
    return count;
  }

  combinations(n, k){
    if (k > n || k < 0) return 0;
    if (k === 0 || k === n) return 1;
    k = Math.min(k, n - k);
    let result = 1;
    for (let i = 0; i < k; i++) {
      result = result * (n - i) / (i + 1);
    }
    return Math.floor(result);
  }

  _getAvailableCardMasks(deadCards){
    let masks = [];
    let deck = ~deadCards;
    for (let i = 0; i < 52; i++) {
      let card = 1n << BigInt(i);
      if (card & deck) masks.push(card);
    }
    return masks;
  }

  _getAvailableCardMasksByLookUp(deadCards){
    let masks = [];
    let deck = ~deadCards;
    
    // Iterate through all actual card masks, not bit positions
    for (const card in this.CARD_MASKS) {
      const cardMask = this.CARD_MASKS[card];
      // Check if the entire card mask is available (not in deadCards)
      if ((cardMask & deck) === cardMask) {
        masks.push(cardMask);
      }
    }
    
    return masks;
  }

  _getCombinations(availableMasks, k){
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
   * Converts a BigInt to a binary string and formats it for readability.
   *
   * @param {BigInt} num - The number to convert and format.
   * @return {string} The formatted binary string.
   */
  printBitmask(num, spacing = 4){
      let bin = num.toString(2);
      while (bin.length < 64) bin = '0' + bin;
      bin = bin.split('').reverse().join('').match(/.{1,4}/g).join(' ').split('').reverse().join('');
      return bin;
  }

  evaluate(hand){

    let response = 0n;
    if (response = this._bitStraightFlush(hand)){ 
      return [response | this.STRAIGHT_FLUSH_SCORE, null];
    }

    if (response = this._bitQuads(hand)){
      // Extract highest kicker (quads use 4 cards, need 1 kicker)
      let quadsRanksMask = this._getRankMaskFromBitmask(response);
      let kickers = this._extractKickers(hand, quadsRanksMask, 1);
      return [(response | this.QUADS_SCORE), kickers];
    }

    let trips = this._bitTrips(hand) & (0xFFFFFFFFFFFF0n | (1n << 52n));
    let pairs = this._bitPairs(hand) & (0xFFFFFFFFFFFF0n | (1n << 52n));

    if ((trips && pairs && trips ^ pairs) || this.countBits(trips) > 1){
      // console.log();
      // console.log('Trips result: ', trips.toString(2).padStart(64, '0'));
      // console.log('Pairs result: ', pairs.toString(2).padStart(64, '0'));
      // console.log('Trips | Pairs:', (trips | pairs).toString(2).padStart(64, '0'));
      // console.log();
      return [trips | this.FULL_HOUSE_SCORE, this.stripBits(pairs & ~trips, 1)];
    }

    if (response = this._bitFlush(hand)){
      return [response | this.FLUSH_SCORE, null];
    }

    if (response = this._bitStraight(hand)){
      return [response | this.STRAIGHT_SCORE, null];
    }

    if (response = trips){
      // Extract 2 kickers (trips use 3 cards, need 2 kickers)
      let tripsRanksMask = this._getRankMaskFromBitmask(response);
      let kickers = this._extractKickers(hand, tripsRanksMask, 2);
      return [(response | this.TRIPS_SCORE), kickers];
    }

    if (response = pairs) {
      if (this.countBits(response) > 1){
        // Two Pair: Extract 1 kicker (two pairs use 4 cards, need 1 kicker)
        let pairRanksMask = this._getTwoPairRanksMask(response);
        let kickers = this._extractKickers(hand, pairRanksMask, 1);
        return [(response | this.TWO_PAIRS_SCORE), kickers];
      }
      // Pair: Extract 3 kickers (pair uses 2 cards, need 3 kickers)
      let pairRanksMask = this._getRankMaskFromBitmask(response);
      let kickers = this._extractKickers(hand, pairRanksMask, 3);
      return [(response | this.PAIR_SCORE), kickers];
    }

    return [this.stripBits(this.normalize(hand), 5), null];

  }

  compare(hand, compareTo){
    let pairs = this._bitPairs(hand);
    let trips = this._bitTrips(hand);
    let fullHouse = pairs | trips | this.FULL_HOUSE_SCORE;

    if ((trips && pairs) && (trips ^ pairs) && fullHouse >= compareTo){
      return fullHouse;
    }

    if (this.countBits(trips) > 1){
      return fullHouse;
    }

    if (pairs && (this.countBits(pairs) > 1)){
      pairs = pairs | this.TWO_PAIRS_SCORE;
    } else if (pairs) {
      pairs = pairs | this.PAIR_SCORE;
    }

    if (pairs >= compareTo){
      return pairs;
    }

    if (trips && ((trips | this.TRIPS_SCORE) >= compareTo)){
      return trips;
    }

    let straight = this._bitStraight(hand);
    if (straight && ((straight | this.STRAIGHT_SCORE) >= compareTo)){
      return straight | this.STRAIGHT_SCORE;
    }

    let flush = this._bitFlush(hand);
    if (flush && ((flush | this.FLUSH_SCORE) >= compareTo)){
      return flush | this.FLUSH_SCORE;
    }

    let quads = this._bitQuads(hand);
    if (quads && ((quads | this.QUADS_SCORE) >= compareTo)){
      return quads | this.QUADS_SCORE;
    }

    let straightFlush = this._bitStraightFlush(hand);
    if (straightFlush && ((straightFlush | this.STRAIGHT_FLUSH_SCORE) >= compareTo)){
      return straightFlush;
    }

    return this.normalize(hand);
  }

  _bitPairs(hand){
    let pairs = ( 
      ((this.BIT_1 & hand) << 1n) & (this.BIT_2 & hand) | // 1100
      ((this.BIT_1 & hand) << 2n) & (this.BIT_3 & hand) | // 1010
      ((this.BIT_1 & hand) << 3n) & (this.BIT_4 & hand) | // 1001 
      ((this.BIT_2 & hand) << 1n) & (this.BIT_3 & hand) | // 0110
      ((this.BIT_2 & hand) << 2n) & (this.BIT_4 & hand) | // 0101
      ((this.BIT_3 & hand) << 1n) & (this.BIT_4 & hand)); // 0011
    pairs = (pairs >> 1n | pairs >> 2n | pairs >> 3n) & this.BIT_1;
    return this.stripBits(pairs, 2);
  }

  _bitTrips(hand){ 
    let a = (((this.BIT_1 & hand) << 1n & (this.BIT_2 & hand)) << 1n & (this.BIT_3 & hand)) >> 2n; // 0111
    let b = (((this.BIT_2 & hand) << 1n & (this.BIT_3 & hand)) << 1n & (this.BIT_4 & hand)) >> 3n ; // 1110
    let c = (((this.BIT_1 & hand) << 2n & (this.BIT_3 & hand)) << 1n & (this.BIT_4 & hand)) >> 3n ; // 1101
    let d = (((this.BIT_1 & hand) << 1n & (this.BIT_2 & hand)) << 2n & (this.BIT_4 & hand)) >> 3n; // 1011
    return this.stripBits((a | b | c | d) & this.BIT_1, 1);
  }

  _bitFlush(hand){
    let i = 0n;
    while (i < 4){
      if (this.countBits((hand >> 4n) & (this.BIT_1 << i)) >= 5){
        return this.stripBits(((hand >> 4n) & (this.BIT_1 << i)) >> i, 5);
      }
      i++;
    }
    return 0n;
  }

  // Returns the flush bits in the LSB of the rank group.
  _bitFlush2(hand){

    hand = hand >> 4n;

    let spade = hand & this.BIT_1;
    if (this.countBits(spade) > 4) return this.stripBits(spade, 5);

    let club = hand & this.BIT_2;
    if (this.countBits(club) > 4) return this.stripBits(club, 5);

    let heart = hand & this.BIT_3;
    if (this.countBits(heart) > 4) return this.stripBits(heart, 5);

    let diamond = hand & this.BIT_4;
    if (this.countBits(diamond) > 4) return this.stripBits(diamond, 5);
}

  // Returns the high card in the straight, to be merged with the SCORE.
  _bitStraight(hand){
    hand = (hand | hand >> 1n | hand >> 2n | hand >> 3n) & this.BIT_1;

    hand = hand & 
      (hand << 4n) & 
      (hand << 8n) & 
      (hand << 12n) & 
      (hand << 16n);

    return this.stripBits(hand, 1);
  }

  // Returns the quad value in the LSB of the rank group.
  _bitQuads(hand){
    return ((((
      (hand & this.BIT_1) << 1n &   // 0001
      (hand & this.BIT_2)) << 1n &  // 0010
      (hand & this.BIT_3)) << 1n &  // 0100
      (hand & this.BIT_4))          // 1000
      & this.BIT_4) >> 3n;
  }

  // Only returns the high card in the straight flush, to be merged with the SCORE.
  _bitStraightFlush(hand){
    hand = hand & 
      (hand << 4n) & 
      (hand << 8n) & 
      (hand << 12n) & 
      (hand << 16n);

    return this.stripBits(hand, 1);
  }

}

if (typeof module !== 'undefined') module.exports = BitVal;
