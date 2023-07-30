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

  }



  /**
   * Runs monte carlo simulations for 2 players.
   * @param {String[]} cards - An array of cards to be evaluated.
   * @returns {} - Returns an key/value pair for "win", "lose", "tie"
   */
  simulate(iterations, numberOfBoardCards = 5, hero = [], villain = [], board = [], deadCards = [], trackHands = false){

    let numberOfCardsToDeal = (numberOfBoardCards + 2) - (hero.length + board.length);
    this.xorShift = new XorShift32();

    deadCards = this.getBitMasked([...hero,...villain,...board,...deadCards]);
    numberOfCardsToDeal = numberOfBoardCards - board.length;
    hero = this.getBitMasked(hero);
    villain = this.getBitMasked(villain);
    board = this.getBitMasked(board);

    let result = { 
      "win": 0,           "tie": 0,         "lose": 0, 
      "High Card": 0,     "Pair": 0,        "Two Pair": 0, 
      "Trips": 0,         "Straight": 0,    "Flush": 0, 
      "Full House": 0,    "Quads": 0,       "Straight Flush": 0 
    };

    for (let i = 0; i < iterations; i++){
      let _board = this.deal(board, deadCards, numberOfCardsToDeal) | board;
      console.log("");
      console.log(this.getHandFromMask(hero).join(""),this.getHandFromMask(_board).join(" "), this.getHandFromMask(villain).join(""));

      let hero_eval = this.evaluate(hero | _board);
      let villain_eval = this.compare(villain | _board, hero_eval);
      //let villain_eval = this.compare(villain | _board, hero_eval);


      this.debugString(hero, hero_eval, villain, villain_eval);
      //this.debug(hero, villain, hero_eval, villain_eval);

      if (hero_eval > villain_eval){
        result["win"]++;
        continue;
      }
      if (hero_eval < villain_eval){
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

  debugString(hero, heroResult, villain, villainResult){
    let result = "ties with";
    if (heroResult > villainResult) result = "beats";
    if (heroResult < villainResult) result = "loses to";
    console.log(this.getHandFromMask(hero).join(" "),result,this.getHandFromMask(villain).join(" "));
    console.log(this.printBitmask(heroResult),this.getHandStrengthFromMask(heroResult));
    console.log(this.printBitmask(villainResult),this.getHandStrengthFromMask(villainResult));
  }
  debug(heroHand, villainHand, heroResult = false, villainResult = false){
    let maskSuits = "____ ____ dhcs dhcs dhcs dhcs dhcs dhcs dhcs dhcs dhcs dhcs dhcs dhcs dhcs dhcs";
    let maskRanks = "____ ____ AAAA KKKK QQQQ JJJJ TTTT 9999 8888 7777 6666 5555 4444 3333 2222 AAAA";
    let handRanks = "8765 4321 AAAA KKKK QQQQ JJJJ TTTT 9999 8888 7777 6666 5555 4444 3333 2222 AAAA";
    console.log("  ",maskSuits,"\t","  ",handRanks);
    console.log("Hh",this.printBitmask(heroHand),"\t","Hr",this.printBitmask(heroResult));
    console.log("Vh",this.printBitmask(villainHand),"\t","Vr",this.printBitmask(villainResult));
    console.log("  ",maskRanks,"\t","  ",handRanks);
    console.log("[9=SF, 8=Q, 7=FH, 6=FL, 5=ST, 4=TR, 3=TP, 2=P, 1=HC]");
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
   * Organize the bits in a single 13-bit bitmask.
   * @param {BigInt} hand - The bitmask of the hand to be normalized
   * @returns {BigInt[]} - Returns an array containing the card mask and straight flush mask for the given set of cards.
   */
  normalize(hand, bitShift = 4){
    let shift_bits = ((hand | hand >> 1n | hand >> 2n) & this.BIT_1) >> 4n;
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
      return response | this.STRAIGHT_FLUSH_SCORE;
    }

    if (response = this._bitQuads(hand)){
      return response | this.QUADS_SCORE;
    }

    let trips = this._bitTrips(hand);
    let pairs = this._bitPairs(hand);

    if ((trips && pairs && trips ^ pairs) || this.countBits(trips) > 1){
      return trips | pairs | this.FULL_HOUSE_SCORE;
    }

    if (response = this._bitFlush(hand)){
      return response | this.FLUSH_SCORE;
    }

    if (response = this._bitStraight(hand)){
      return response | this.STRAIGHT_SCORE;
    }

    if (response = trips){
      return response | this.TRIPS_SCORE;
    }

    if (response = pairs) {
      if (this.countBits(response) > 1){
        return  response | this.TWO_PAIRS_SCORE;
      }
      return  response | this.PAIR_SCORE;
    }

    return this.normalize(hand);

  }

  compare(hand, compareTo){
    let pairs = this._bitPairs(hand);
    let trips = this._bitTrips(hand);
    let fullHouse = pairs | trips | this.FULL_HOUSE_SCORE;

    if (trips && pairs && trips ^ pairs && fullHouse >= compareTo){
      return fullHouse;
    }

    if (this.countBits(trips) > 1){
      return fullHouse;
    }

    if (pairs && this.countBits(pairs) > 1){
      pairs = pairs | this.TWO_PAIRS_SCORE;
    } else if (pairs) {
      pairs = pairs | this.PAIR_SCORE;
    }

    if (pairs >= compareTo){
      return pairs;
    }

    if (trips && (trips | this.TRIPS_SCORE) >= compareTo){
      return trips;
    }

    let straight = this._bitStraight(hand);
    if (straight && (straight | this.STRAIGHT_SCORE) >= compareTo){
      return straight | this.STRAIGHT_SCORE;
    }

    let flush = this._bitFlush(hand);
    if (flush && (flush | this.FLUSH_SCORE) >= compareTo){
      return flush | this.FLUSH_SCORE;
    }

    let quads = this._bitQuads(hand);
    if (quads && (quads | this.QUADS_SCORE) >= compareTo){
      return quads | this.QUADS_SCORE;
    }

    let straightFlush = this._bitStraightFlush(hand);
    if (straightFlush && (straightFlush | this.STRAIGHT_FLUSH_SCORE) >= compareTo){
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
    return ((pairs >> 1n | pairs >> 2n | pairs >> 3n) & this.BIT_1);
  }

  _bitTrips(hand){ 
    let a = (((this.BIT_1 & hand) << 1n & (this.BIT_2 & hand)) << 1n & (this.BIT_3 & hand)) >> 2n; // 0111
    let b = (((this.BIT_2 & hand) << 1n & (this.BIT_3 & hand)) << 1n & (this.BIT_4 & hand)) >> 3n ; // 1110
    let c = (((this.BIT_1 & hand) << 2n & (this.BIT_3 & hand)) << 1n & (this.BIT_4 & hand)) >> 3n ; // 1101
    let d = (((this.BIT_1 & hand) << 1n & (this.BIT_2 & hand)) << 2n & (this.BIT_4 & hand)) >> 3n; // 1011
    return (a | b | c | d) & this.BIT_1;
  }

  _bitFlush(hand){
    let i = 0n;
    while (i < 4){
      if (this.countBits((hand >> 4n) & (this.BIT_1 << i)) >= 5){
        return ((hand >> 4n) & (this.BIT_1 << i)) >> i;
      }
      i++;
    }
    return 0n;
  }

  _bitFlush2(hand){

    hand = hand >> 4n;

    let spade = hand & this.BIT_1;
    if (this.countBits(spade) > 4) return spade;

    let club = hand & this.BIT_2;
    if (this.countBits(club) > 4) return club;

    let heart = hand & this.BIT_3;
    if (this.countBits(heart) > 4) return heart;

    let diamond = hand & this.BIT_4;
    if (this.countBits(diamond) > 4) return spade;
}

  _bitStraight(hand){
    hand = (hand | hand >> 1n | hand >> 2n | hand >> 3n) & this.BIT_1;

    hand = hand & 
      (hand << 4n) & 
      (hand << 8n) & 
      (hand << 12n) & 
      (hand << 16n);

    return this.stripBits(hand, 1);
  }

  _bitQuads(hand){
    return ((((
      (hand & this.BIT_1) << 1n &   // 0001
      (hand & this.BIT_2)) << 1n &  // 0010
      (hand & this.BIT_3)) << 1n &  // 0100
      (hand & this.BIT_4))          // 1000
      & this.BIT_4) >> 3n;
  }

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
