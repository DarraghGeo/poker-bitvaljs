/*

prt_bitval is a 5-7 card poker hand evaluator.

It requires 2 bitmasks, one to store card information that can
be compressed into hand information, and the other to store straight flush 
information.

The RANK mask is divided into groupings. The groupings are 3 bit-long.
The first 4 track the suit of the card, and the remaining the rank of the
card.

 A   K   Q   J   T   9   8   7   6   5   4   3   2   A   s   c   h   d
000 000 000 000 000 000 000 000 000 000 000 000 000 000 000 000 000 000

So for example,
000 001 000 000 000 000 000 000 000 000 000 000 000 000 000 000 001 000 [Kh]
000 000 000 000 000 000 000 000 000 000 000 000 001 000 000 000 000 001 [2d]
000 000 000 000 000 000 000 000 000 000 000 001 000 000 000 001 000 000 [3c]
001 000 000 000 000 000 000 000 000 000 000 000 000 001 000 000 001 000 [Ah]
000 000 000 000 000 000 000 000 000 000 001 000 000 000 000 000 001 000 [4h]

Note that A has 2 groupings, for high and low.

We formulate our hand by simpling ANDing them together, with the cards above becoming

 A   K   Q   J   T   9   8   7   6   5   4   3   2   A   s   c   h   d
001 001 000 000 000 000 000 000 000 000 001 001 001 001 000 001 011 001 [Kh]

Notice how we are now counting 3-hearts. We lose understanding of which ranks
those hearts are, but we know we have 3 of them. This is why we need the
straight flush mask, to ensure we know which ranks of which suit. But for the
other possible hands we simply need to know how many occurances there are.

We then have two utilitie masks FLUSH_M and RANK_M

 A   K   Q   J   T   9   8   7   6   5   4   3   2   A   s   c   h   d
000 000 000 000 000 000 000 000 000 000 000 000 000 000 100 100 100 100 FLUSH_M
010 010 010 010 010 010 010 010 010 010 010 010 010 000 000 000 000 000 RANK_M

FLUSH_M masks for 4s of the same suit. 
FLUSH_M & (FLUSH_M >> 2) masks for 5 of the same suit.
FLUSH_M & (FLUSH_M >> 1) masks for 6 of the same suit.

RANK_M masks for pairs, the middle 
RANK_M << 1 masks for quads.
RANK_M & (RANK_M >> 1) masks for trips.
RANK_M << 3 masks for the next consecutive hand, repeated 5 times masks for a straight.

The straight flush mask works differently.
 A     K   Q    J    T     9    8   7    6    5    4    3    2    A
0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000
schd schd schd schd schd schd schd schd schd schd schd schd schd schd 

Each grouping is 4 bits, and each bit represents a suit. To check for a
straight flush we simply << 4 the mask 5 times.

Results are 34 bit masks grouped as 13 bits, 13 bits, and 8 bits.

STRENGTH CARDS-IN-HAND  TIEBREAKERS
000000000 0000000000000 0000000000000 
876543210 AKQJT98765432 AKQJT98765432

TIEBREAKERS are those cards that don't constitute the hand, but may act as a
tie-breaker.

CARDS-IN-HAND are those cards that do make up the hand strength (such as pairs,
trips, etc.)

STRENGTH are reverse-ordered hand strengths
8 - Striaght Flush
7 - Quads
6 - Full House
5 - Flush
4 - Straight
3 - Trips
2 - Two Pair
1 - Pair
0 - High Card

Rules : 
* Set the hand strength from Score.
* If its a five card hand (straight, flush, full house) set the CARDS-IN-HAND
* If its not then set the CARDS-IN-HAND, count the bits (b) and add the largest 5-n.


Extract the relevant bits. LSB() them. Remove 2 bits in between them. = CARDS-IN-HAND
Extract the inverse bits. LSB() them. Remove 2 bits in between them. Remove 5-n bits.

IMPROVEMENT IDEAS:
I think requiring 2 masks is maybe unnecessarily complicated. Potentially all evaluations
can be done (and done faster) using just the FLUSH/sf_check mask. Some thoughts:

Straight Flush:
- Already solved, and how we currently check for straight flushes.

Quads:
- MSB mask &

Full House:
- 

Flush:
- (1) LSB Mask and either count bits, repeating 3 times as necessary.

Straight:
- LSB(mask), and how we currently check for straight flushes.

Trips: 
- Check for combinations of trips and | them , such as 
- 1110 = MSB & MSB >> 1 & MSB >> 2
- 1011 = MSB & MSB >> 2 & MSB >> 3
- 0111 = MSB >> 1 & MSB >> 2 & MSB >> 3
- 1101 = MSB & MSB >> 1 & MSB >> 3

Pairs:
- Similar as above
- 1100 = MSB & MSB >> 1
- 1010 = MSB & MSB >> 2
- 1001 = MSB & MSB >> 3
- 0110 = MSB >> 1 & MSB >> 2
- 0101 = MSB >> 1 & MSB >> 3
- 0011 = MSB >> 2 & MSB >> 3
*/

class PrtBitVal{


  /**
   * Constructor for PrtBitVal class. 
   * Initializes bitmask values for different card ranks and suits, 
   * along with other utility masks for hand evaluation.
   */
  constructor(){

    // Bitmask values for the RANK mask.
    this.DIAMOND = BigInt(1);
    this.HEART = BigInt(1) << BigInt(3);
    this.CLUB = BigInt(1) << BigInt(6);
    this.SPADE = BigInt(1) << BigInt(9);
    this.ACE = (BigInt(1) << BigInt(51)) | (BigInt(1) << BigInt(12));
    this.KING = BigInt(1) << BigInt(48);
    this.QUEEN = BigInt(1) << BigInt(45);
    this.JACK = BigInt(1) << BigInt(42);
    this.TEN = BigInt(1) << BigInt(39);
    this.NINE = BigInt(1) << BigInt(36);
    this.EIGHT = BigInt(1) << BigInt(33);
    this.SEVEN = BigInt(1) << BigInt(30);
    this.SIX = BigInt(1) << BigInt(27);
    this.FIVE = BigInt(1) << BigInt(24);
    this.FOUR = BigInt(1) << BigInt(21);
    this.THREE = BigInt(1) << BigInt(18);
    this.TWO = BigInt(1) << BigInt(15);


    // Bitmask values for the FLUSH mask
    this._DIAMOND = BigInt(3);
    this._HEART = BigInt(2);
    this._CLUB = BigInt(1);
    this._SPADE = BigInt(0);
    this._ACE = (BigInt(1) << BigInt(52)) | BigInt(1);
    this._KING = BigInt(1) << BigInt(48);
    this._QUEEN = BigInt(1) << BigInt(44);
    this._JACK = BigInt(1) << BigInt(40);
    this._TEN = BigInt(1) << BigInt(36);
    this._NINE = BigInt(1) << BigInt(32);
    this._EIGHT = BigInt(1) << BigInt(28);
    this._SEVEN = BigInt(1) << BigInt(24);
    this._SIX = BigInt(1) << BigInt(20);
    this._FIVE = BigInt(1) << BigInt(16);
    this._FOUR = BigInt(1) << BigInt(12);
    this._THREE = BigInt(1) << BigInt(8);
    this._TWO = BigInt(1) << BigInt(4);



    // Lookup Table for specific cards [RANK, FLUSH]
    // Note that to formulate RANK masks, we rank|suit (OR) and for FLUSH
    // masks we _rank<<_suit (lshift.)
    this.CARD_MASKS = {
      'As': [this.ACE    |   this.SPADE,    this._ACE    <<    this._SPADE],    
      'Ah': [this.ACE    |   this.HEART,    this._ACE    <<    this._HEART],  
      'Ad': [this.ACE    |   this.DIAMOND,  this._ACE    <<    this._DIAMOND],  
      'Ac': [this.ACE    |   this.CLUB,     this._ACE    <<    this._CLUB],
      'Ks': [this.KING   |   this.SPADE,    this._KING   <<    this._SPADE],  
      'Kh': [this.KING   |   this.HEART,    this._KING   <<    this._HEART],
      'Kd': [this.KING   |   this.DIAMOND,  this._KING   <<    this._DIAMOND],
      'Kc': [this.KING   |   this.CLUB,     this._KING   <<    this._CLUB],
      'Qs': [this.QUEEN  |   this.SPADE,    this._QUEEN  <<    this._SPADE],
      'Qh': [this.QUEEN  |   this.HEART,    this._QUEEN  <<    this._HEART],
      'Qd': [this.QUEEN  |   this.DIAMOND,  this._QUEEN  <<    this._DIAMOND],
      'Qc': [this.QUEEN  |   this.CLUB,     this._QUEEN  <<    this._CLUB],
      'Js': [this.JACK   |   this.SPADE,    this._JACK   <<    this._SPADE],
      'Jh': [this.JACK   |   this.HEART,    this._JACK   <<    this._HEART],
      'Jd': [this.JACK   |   this.DIAMOND,  this._JACK   <<    this._DIAMOND],
      'Jc': [this.JACK   |   this.CLUB,     this._JACK   <<    this._CLUB],
      'Ts': [this.TEN    |   this.SPADE,    this._TEN    <<    this._SPADE],
      'Th': [this.TEN    |   this.HEART,    this._TEN    <<    this._HEART],
      'Td': [this.TEN    |   this.DIAMOND,  this._TEN    <<    this._DIAMOND],
      'Tc': [this.TEN    |   this.CLUB,     this._TEN    <<    this._CLUB],
      '9s': [this.NINE   |   this.SPADE,    this._NINE   <<    this._SPADE],
      '9h': [this.NINE   |   this.HEART,    this._NINE   <<    this._HEART],
      '9d': [this.NINE   |   this.DIAMOND,  this._NINE   <<    this._DIAMOND],
      '9c': [this.NINE   |   this.CLUB,     this._NINE   <<    this._CLUB],
      '8s': [this.EIGHT  |   this.SPADE,    this._EIGHT  <<    this._SPADE],
      '8h': [this.EIGHT  |   this.HEART,    this._EIGHT  <<    this._HEART],
      '8d': [this.EIGHT  |   this.DIAMOND,  this._EIGHT  <<    this._DIAMOND],
      '8c': [this.EIGHT  |   this.CLUB,     this._EIGHT  <<    this._CLUB],
      '7s': [this.SEVEN  |   this.SPADE,    this._SEVEN  <<    this._SPADE],
      '7h': [this.SEVEN  |   this.HEART,    this._SEVEN  <<    this._HEART],
      '7d': [this.SEVEN  |   this.DIAMOND,  this._SEVEN  <<    this._DIAMOND],
      '7c': [this.SEVEN  |   this.CLUB,     this._SEVEN  <<    this._CLUB],
      '6s': [this.SIX    |   this.SPADE,    this._SIX    <<    this._SPADE],
      '6h': [this.SIX    |   this.HEART,    this._SIX    <<    this._HEART],
      '6d': [this.SIX    |   this.DIAMOND,  this._SIX    <<    this._DIAMOND],
      '6c': [this.SIX    |   this.CLUB,     this._SIX    <<    this._CLUB],
      '5s': [this.FIVE   |   this.SPADE,    this._FIVE   <<    this._SPADE],
      '5h': [this.FIVE   |   this.HEART,    this._FIVE   <<    this._HEART],
      '5d': [this.FIVE   |   this.DIAMOND,  this._FIVE   <<    this._DIAMOND],
      '5c': [this.FIVE   |   this.CLUB,     this._FIVE   <<    this._CLUB],
      '4s': [this.FOUR   |   this.SPADE,    this._FOUR   <<    this._SPADE],
      '4h': [this.FOUR   |   this.HEART,    this._FOUR   <<    this._HEART],
      '4d': [this.FOUR   |   this.DIAMOND,  this._FOUR   <<    this._DIAMOND],
      '4c': [this.FOUR   |   this.CLUB,     this._FOUR   <<    this._CLUB],
      '3s': [this.THREE  |   this.SPADE,    this._THREE  <<    this._SPADE],
      '3h': [this.THREE  |   this.HEART,    this._THREE  <<    this._HEART],
      '3d': [this.THREE  |   this.DIAMOND,  this._THREE  <<    this._DIAMOND],
      '3c': [this.THREE  |   this.CLUB,     this._THREE  <<    this._CLUB],
      '2s': [this.TWO    |   this.SPADE,    this._TWO    <<    this._SPADE],
      '2h': [this.TWO    |   this.HEART,    this._TWO    <<    this._HEART],
      '2d': [this.TWO    |   this.DIAMOND,  this._TWO    <<    this._DIAMOND],
      '2c': [this.TWO    |   this.CLUB,     this._TWO    <<    this._CLUB]
    }

    this.ALL_HANDS = Object.keys(this.CARD_MASKS);

    // Utility masks 
    //    MSB = Most Significant Bit (furtherst left in grouping)
    //    LSB = Least Significant Bit (furtherst right in grouping)
    //    M = Middle Bit
    this.FLUSH_MSB = BigInt(0x924);
    this.FLUSH_M = this.FLUSH_MSB >> BigInt(1);
    this.FLUSH_LSB = this.FLUSH_MSB >> BigInt(2);
    this.RANK_M = BigInt(0x12492492492000);
    this.RANK_MSB = this.RANK_M << BigInt(1);
    this.RANK_LSB = this.RANK_M >> BigInt(1);

    // This is the same as RANK_M but without the final A group masked, for counting bits.
    this.RANK_MX = BigInt(0x2492492492000);
    this.RANK_MSBX = this.RANK_MX << BigInt(1);
    this.RANK_LSBX = this.RANK_MX >> BigInt(1);


    // Bitmask for recording the hand
    this.HIGH_CARD_SCORE = BigInt(1) << BigInt(55);
    this.PAIR_SCORE = BigInt(1) << BigInt(56);
    this.TWO_PAIRS_SCORE = BigInt(1) << BigInt(57);
    this.TRIPS_SCORE = BigInt(1) << BigInt(58);
    this.STRAIGHT_SCORE = BigInt(1) << BigInt(59);
    this.FLUSH_SCORE = BigInt(1) << BigInt(60);
    this.FULL_HOUSE_SCORE = BigInt(1) << BigInt(61);
    this.QUADS_SCORE = BigInt(1) << BigInt(62);
    this.STRAIGHT_FLUSH_SCORE = BigInt(1) << BigInt(63);

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
  simulate(iterations, numberOfBoardCards = 5, hero = [], villain = [], board = [], deadCards = []){
    deadCards = [...hero, ...villain, ...board, ...deadCards];

    let result = { 
      "win": 0,           "tie": 0,         "lose": 0, 
      "High Card": 0,     "Pair": 0,        "Two Pair": 0, 
      "Trips": 0,         "Straight": 0,    "Flush": 0, 
      "Full House": 0,    "Quads": 0,       "Straight Flush": 0 
    };

    for (let i = 0; i < iterations; i++){
      let _hero = this.getRandomHand(hero, 2, [...hero, ...villain, ...board, ...deadCards]);
      let _villain = this.getRandomHand(villain, 2, [..._hero, ...villain, ...board, ...deadCards]);
      let _board = this.getRandomHand(board, numberOfBoardCards, [..._hero, ..._villain, ...board, ...deadCards]);

      let hero_bitmask = this.getBitMasked([..._hero, ..._board]);
      let villain_bitmask = this.getBitMasked([..._villain, ..._board]);

      let hero_eval = this.evaluate(hero_bitmask[0], hero_bitmask[1]);
      let villain_eval = this.evaluate(villain_bitmask[0], villain_bitmask[1]);
      
      if (hero_eval[0] > villain_eval[0]){
        result["win"]++;
      } else if (hero_eval[0] < villain_eval[0]){
        result["lose"]++;
      } else {
        result["tie"]++;
      }

      result[hero_eval[1]]++;
    }
    
    return result;
  }


  /**
   * Evaluates a hand of cards.
   * @param {String[]} cards - An array of cards to be evaluated.
   * @returns {BigInt} - Returns a BigInt representing the score of the hand.
   * 
   * 
   * Known issues: We don't properly return the flush response, meaning there are
   * a lot of situations where 2 flush hands compare unexpectedly. This can be resolved
   * by normalizing on SF_Check, I just haven't sat to figure out how.
   * 
   * Note that the Full House response is different from the others. It returns the
   * trip value in the cards-in-hand and the pair value in tiebreakers. This is to
   * resolve 33322 vs 22333 issues that would come by storing both in the cards-in-hand
   * (that would return equal when they're not.)
   */
  evaluate(hand, sf_check) {
    if (this.PAIR(hand)){
      let cards_in_hand = this.normalize(this._pairs(hand));
      let tiebreakers = this.stripBits(this.normalize(hand) ^ cards_in_hand, 3);
      return [this.PAIR_SCORE |  cards_in_hand << 13n | tiebreakers,"Pair"];
    }
    if (this.TWO_PAIR(hand)){
      let cards_in_hand = this.normalize(this._pairs(hand));
      let tiebreakers = this.stripBits(this.normalize(hand) ^ cards_in_hand, 1);
      return [this.TWO_PAIRS_SCORE |  cards_in_hand << 13n | tiebreakers,"Two Pair"];
    }
    if (this.TRIPS(hand)){
      let cards_in_hand = this.normalize(this._trips(hand));
      let tiebreakers = this.stripBits(this.normalize(hand) ^ cards_in_hand, 2);
      return [this.TRIPS_SCORE |  cards_in_hand | tiebreakers,"Trips"];
    }
    if (this.STRAIGHT(hand)){
      let cards_in_hand = this.normalize(this.stripBits(this._straight(hand),1)) << 13n;
      return [this.STRAIGHT_SCORE |  cards_in_hand,"Straight"];
    }
    if (this.FLUSH(hand, sf_check)){
      let cards_in_hand = this.stripBits(this.normalize(hand),5) << 13n;
      return [this.FLUSH_SCORE |  cards_in_hand << 13n,"Flush"];
    }
    if (this.FULL_HOUSE(hand, sf_check)){
      let cards_in_hand = this.normalize(this._trips(hand));
      let tiebreakers = this.stripBits(this.normalize(this._pairs(hand)) ^ cards_in_hand, 1);
      return [this.FULL_HOUSE_SCORE |  cards_in_hand << 13n | tiebreakers,"Full House"];
    }
    if (this.QUADS(hand)){
      let cards_in_hand = this.normalize(this._quads(hand));
      let tiebreakers = this.stripBits(this.normalize(hand) ^ cards_in_hand, 1);
      return [this.QUADS_SCORE |  cards_in_hand << 13n | tiebreakers,"Quads"];
    }
    if (this.STRAIGHT_FLUSH(sf_check)){
      let cards_in_hand = this.normalize(this.stripBits(this._straight(hand),1));
      return [this.STRAIGHT_FLUSH_SCORE |  cards_in_hand << 13n,"Straight Flush"];
    }
    
    return [this.HIGH_CARD_SCORE | this.stripBits(this.normalize(hand),5), "High Card"]
  }






  /**
   * Organize the bits in a single 13-bit bitmask.
   * @param {BigInt} hand - The bitmask of the hand to be normalized
   * @returns {BigInt[]} - Returns an array containing the card mask and straight flush mask for the given set of cards.
   */
  normalize(hand, bitShift = 3){
    let shift_bits = ((hand | hand >> BigInt(1) | hand >> BigInt(2)) & this.RANK_LSB) >> BigInt(15);
    let normal_bits = BigInt(0);

    for (let i = 0; i < 13; i++) {
      let bit = (shift_bits & (BigInt(1) << BigInt(i*bitShift))) >> BigInt(i*bitShift);
      normal_bits += bit << BigInt(i);
    }
    return normal_bits;
  }


  stripBits(hand, numberOfBits = 5){
    let bitsToStrip = this.countBits(hand) - numberOfBits;

    while(bitsToStrip > 0){
      hand &= (hand - 1n);
      bitsToStrip--;
    }
    return hand;
  }





  /**
   * Constructs a bitmask pair for a given set of cards.
   * @param {String[]} cards - An array of cards to be evaluated.
   * @returns {BigInt[]} - Returns an array containing the card mask and straight flush mask for the given set of cards.
   */
  getBitMasked(cards){
    let card_mask = BigInt(0);
    let sf_mask = BigInt(0);

    for (let card of cards){
      card_mask += this.CARD_MASKS[card][0];
      sf_mask |= this.CARD_MASKS[card][1];
    }

    return [card_mask, sf_mask];
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
   */
  getRandomHand(randomHand = [], count = 7, deadCards = []){
    if (randomHand.length === count) return randomHand;
    if (randomHand.length === 1 && randomHand[0] === "") randomHand = [];

    let hands = this.ALL_HANDS.slice();
    let _randomHand = randomHand.slice();

    while (_randomHand.length < count) {
      let randomIndex = Math.floor(Math.random() * hands.length);
      if (!deadCards.includes(hands[randomIndex])) _randomHand.push(hands[randomIndex]);
      hands.splice(randomIndex, 1);
    }
    
    return _randomHand;
  }



  /**
   * Counts the number of bits set in a given bitmask.
   *
   * @param {BigInt} handMask - The bitmask to count bits in.
   * @return {number} The number of bits set in handMask.
   */
  countBits(handMask){
    let count = 0;

    while (handMask) {
      handMask &= (handMask - BigInt(1));
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
  printBitmask(num, spacing = 3, size = 54){
      let bin = num.toString(2);
      while (bin.length < size) bin = '0' + bin;
      bin = bin.split('').reverse().join('').match(/.{1,54}/g).join(' ').split('').reverse().join('');
      return bin;
  }



  /**
   * Counts the number of pairs in a poker hand.
   *
   * @param {BigInt} hand - The bitmask representation of a poker hand.
   * @return {number} The number of pairs in the hand.
   */
  countPairs(hand){
    return this.countBits(((hand & this.RANK_MX) >> BigInt(1) ^ (hand & this.RANK_LSBX)) & ((hand & this.RANK_MX) >> BigInt(1)));
  }



  /**
   * Counts the number of three of a kinds in a poker hand.
   *
   * @param {BigInt} hand - The bitmask representation of a poker hand.
   * @return {number} The number of triples in the hand.
   */
  countTrips(hand){
    return this.countBits(((hand & this.RANK_MX) >> BigInt(1)) & (hand & this.RANK_LSBX));
  }



  /**
   * Counts the number of four of a kinds in a poker hand.
   *
   * @param {BigInt} hand - The bitmask representation of a poker hand.
   * @return {number} The number of quadruples in the hand.
   */
  countQuads(hand){
    return this.countBits(hand & this.RANK_MSBX);
  }

  /**
   * Checks whether there's a flush in the RANK mask.
   *
   * @param {BigInt} hand - The bitmask representation of a poker hand.
   * @return {number} Wehther or not there's a flush.
   * 
   * 
   * A flush is represented at the first 12 bits and can be
   * 
   * 000 000 000 101 [5 Flush]
   * 000 000 000 110 [6 Flush]
   * 000 000 000 111 [7 Flush]
   * 
   * It can have this pattern across any of the flush groupings, such as
   * 
   * 101 000 000 000
   * 000 110 000 000
   * 111 000 000 000
   * 000 000 110 000
   * etc.
   * 
   * So it always needs the FLUSH_MSB set and one of the others. The available
   * masks are
   * 
   * 100 100 100 100 [FLUSH_MSB]
   * 010 010 010 010 [Flush_M]
   * 001 001 001 001 [Flush_LSB]
   */
  hasFlush(hand){
    return ((((this.FLUSH_LSB & hand) << BigInt(1)) | (this.FLUSH_M & hand)) << BigInt(1)) & (this.FLUSH_MSB & hand) ? true : false;
  }


  hasStraight(hand){
    return this.LSB(hand) & (this.LSB(hand) << BigInt(3)) & (this.LSB(hand) << BigInt(6)) & (this.LSB(hand) << BigInt(9)) & (this.LSB(hand) << BigInt(12)) ? true : false
  }



  /**
   * Calculates the Least Significant Bit (LSB) of a given hand. It's used for further calculations in other poker hand recognition methods.
   * @param {BigInt} hand - A bitmask representing the given poker hand.
   * @returns {BigInt} - Returns the LSB of the hand.
   */
  LSB(hand) {
    return (((((hand & this.RANK_MSB) >> BigInt(1)) | (hand & this.RANK_M)) >> BigInt(1)) | (hand & this.RANK_LSB));
  }



  /**
   * Checks if the given hand is a pair. A pair in poker is a hand with two cards of the same rank.
   * @param {BigInt} hand - A bitmask representing the given poker hand.
   * @returns {BigInt} - If the hand is a pair, returns the hand itself. Otherwise, returns 0.
   */
  PAIR(hand){
      return this.countPairs(hand) === 1 && this.countTrips(hand) === 0 && this.countQuads(hand) === 0 && this.hasStraight(hand) === false && this.hasFlush(hand) === false ? hand : BigInt(0);
  }



  /**
   * Checks if the given hand is two pair. Two pair in poker is a hand that contains two cards of the same rank, plus two cards of another rank.
   * @param {BigInt} hand - A bitmask representing the given poker hand.
   * @returns {BigInt} - If the hand is two pair, returns the hand itself. Otherwise, returns 0.
   */
  TWO_PAIR(hand){
      return this.countPairs(hand) > 1 && this.countTrips(hand) === 0 && this.countQuads(hand) === 0 && !this.hasFlush(hand) && !this.hasStraight(hand) ? hand : BigInt(0);
  }



  /**
   * Checks if the given hand is four of a kind, also known as quads. This is a poker hand that contains all four cards of one rank.
   * @param {BigInt} hand - A bitmask representing the given poker hand.
   * @returns {BigInt} - If the hand is four of a kind, returns the hand itself. Otherwise, returns 0.
   */
  QUADS(hand){
    return this.countQuads(hand) > 0 ? hand : BigInt(0);
  }



  /**
   * Checks if the given hand is a full house. A full house in poker is a hand that contains three cards of one rank and two cards of another rank.
   * @param {BigInt} hand - A bitmask representing the given poker hand.
   * @returns {BigInt} - If the hand is a full house, returns the hand itself. Otherwise, returns 0.
   */
  FULL_HOUSE(hand){
    return this.countTrips(hand) === 2 || (this.countTrips(hand) === 1 && this.countPairs(hand) > 0) ? hand : BigInt(0);
  }


  /**
   * Checks if the given hand is three of a kind, also known as trips. This is a poker hand that contains three cards of the same rank.
   * @param {BigInt} hand - A bitmask representing the given poker hand.
   * @returns {BigInt} - If the hand is three of a kind, returns the hand itself. Otherwise, returns 0.
   */
  TRIPS(hand){
    return this.countTrips(hand) === 1 && this.countPairs(hand) === 0 && !this.hasFlush(hand) && !this.hasStraight(hand) ? hand : BigInt(0);
  }



  /**
   * Checks if the given hand is a straight. A straight in poker is a hand that contains five cards of sequential rank.
   * @param {BigInt} hand - A bitmask representing the given poker hand.
   * @returns {BigInt} - If the hand is a straight, returns the hand itself. Otherwise, returns 0.
   */
  STRAIGHT(hand) {
    return this.hasStraight(hand) && !this.hasFlush(hand) ? hand : BigInt(0);
  }



  /**
   * Checks if the given hand is a flush. A flush in poker is a hand where all five cards are of the same suit.
   * @param {BigInt} hand - A bitmask representing the given poker hand.
   * @returns {BigInt} - If the hand is a flush, returns the hand itself. Otherwise, returns 0.
   */
  FLUSH(hand, sf_check) {
    if (sf_check === undefined) return this.hasFlush(hand) ? hand : BigInt(0);
    return this.hasFlush(hand) && this.STRAIGHT_FLUSH(sf_check) === BigInt(0) ? hand : BigInt(0);
  }



  /**
   * Evaluates a straight flush in a hand.
   * @param {BigInt} hand - The hand to be evaluated.
   * @returns {BigInt} - Returns the hand if it contains a straight flush, otherwise returns 0.
   */
  STRAIGHT_FLUSH(hand) {
    return hand & (hand << BigInt(4)) & (hand << BigInt(8)) & (hand << BigInt(12)) & (hand << BigInt(16)) ? hand : BigInt(0);
  }


  _bitEvaluate(hand){
    let normalized = this.normalize(hand);

    if (this._bitFlush){

      if (this._bitStraightFlush){

        normalizedStrength = this.normalize(flushBits);
        return this.STRAIGHT_FLUSH_SCORE | 
          normalizedStrength << 14 | 
          this.stripBits(normalized ^ normalizedStrength);
      }

      normalizedStrength = this.normalize(flushBits);
      return this.FLUSH_SCORE | 
        normalizedStrength << 14 | 
        this.stripBits(normalized ^ normalizedStrength);
    }

    if (this._bitStraight){

      normalizedStrength = this.normalize(flushBits);
      return this.FLUSH_SCORE | 
        normalizedStrength << 14 | 
        this.stripBits(normalized ^ normalizedStrength);
    }

    if (this._bitPairs){

      if (this._bitQuads){

        normalizedStrength = this.normalize(flushBits);
        return this.FLUSH_SCORE | 
          normalizedStrength << 14 | 
          this.stripBits(normalized ^ normalizedStrength);
      }

      if (this._bitTrips){

        if (this._bitFullHouse){
          normalizedStrength = this.normalize(flushBits);
          return this.FLUSH_SCORE | 
            normalizedStrength << 14 | 
            this.stripBits(normalized ^ normalizedStrength);
        }
        normalizedStrength = this.normalize(flushBits);
        return this.FLUSH_SCORE | 
          normalizedStrength << 14 | 
          this.stripBits(normalized ^ normalizedStrength);

      }

        if (this._bitTwoPairs){
          normalizedStrength = this.normalize(flushBits);
          return this.FLUSH_SCORE | 
            normalizedStrength << 14 | 
            this.stripBits(normalized ^ normalizedStrength);
        }

          normalizedStrength = this.normalize(flushBits);
          return this.FLUSH_SCORE | normalizedStrength << 14 | this.stripBits(normalized ^ normalizedStrength);
    }

    normalizedStrength = this.normalize(flushBits);
    return this.FLUSH_SCORE | normalizedStrength << 14 | this.stripBits(normalized ^ normalizedStrength);
  }

  _pairs(hand){
    return ((hand & (this.RANK_MX<<3n)) >> BigInt(1) ^ (hand & (this.RANK_LSBX<<3n))) & ((hand & (this.RANK_MX<<3n)) >> BigInt(1));
  }

  _trips(hand){
    return ((hand & (this.RANK_MX<<3n)) >> BigInt(1)) & (hand & (this.RANK_LSBX<<3n));
  }

  _straight(hand){
    return this.LSB(hand) & (this.LSB(hand) << BigInt(3)) & (this.LSB(hand) << BigInt(6)) & (this.LSB(hand) << BigInt(9)) & (this.LSB(hand) << BigInt(12));
  }

  _quads(hand){
    return hand & this.RANK_MSBX<<3n;
  }

  _fullHouse(hand){
    return this._trips(hand) | this._pairs(hand);
  }

  _bitPairs(hand){
    return ( 
      ((this.BIT_1 & hand) << 1n) & (this.BIT_2 & hand) | // 1100
      ((this.BIT_1 & hand) << 2n) & (this.BIT_3 & hand) | // 1010
      ((this.BIT_1 & hand) << 3n) & (this.BIT_4 & hand) | // 1001 
      ((this.BIT_2 & hand) << 1n) & (this.BIT_3 & hand) | // 0110
      ((this.BIT_2 & hand) << 2n) & (this.BIT_4 & hand) | // 0101
      ((this.BIT_3 & hand) << 1n) & (this.BIT_4 & hand)); // 0011
  }

  _bitTwoPairs(hand){

  }

  _bitTrips(hand){ 
/*
Trips:
- Check for combinations of trips and | them , such as 
- 1110 = MSB & MSB >> 1 & MSB >> 2
- 1011 = MSB & MSB >> 2 & MSB >> 3
- 0111 = MSB >> 1 & MSB >> 2 & MSB >> 3
- 1101 = MSB & MSB >> 1 & MSB >> 3
*/
    return (
      (((((this.BIT_1 & hand) << 1n) & (this.BIT_2 & hand)) << 1n) & (this.BIT_3)) |  //1110
      (((((this.BIT_1 & hand) << 1n) & (this.BIT_2 & hand)) << 2n) & (this.BIT_4)) |  //1101
      (((((this.BIT_2 & hand) << 1n) & (this.BIT_3 & hand)) << 1n) & (this.BIT_4)) |  //0111
      (((((this.BIT_1 & hand) << 2n) & (this.BIT_3 & hand)) << 1n) & (this.BIT_4)));  //1011
  }

  _bitFlush(hand){

  }

  _bitStraight(hand){
    return this._bitStraightFlush((hand | hand >> 1n | hand >> 2n | hand >> 3n) & this.BIT_1);

  }

  _bitFullHouse(hand){

  }

  _bitQuads(hand){
    return (((
      (hand & this.BIT_1) << 1n &   // 0001
      (hand & this.BIT_2)) << 1n &  // 0010
      (hand & this.BIT_3)) << 1n &  // 0100
      (hand & this.BIT_4));         // 1000
  }

  _bitStraightFlush(hand){
    console.log(this.printBitmask(hand,4));
    return hand & 
      (hand << 4n) & 
      (hand << 8n) & 
      (hand << 12n) & 
      (hand << 16n);

  }

}
