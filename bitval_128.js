/*
 * Bitval128 is a 7 card poker hand evaluator and comparison tool.
 *
 * It uses a 128-bit bitmask to encapsulate a hand for rapid analysis.
 *
 * The 128 is divided into 3 conceptual checker bitmasks
 *
 * 1. Suit-counter -- bits 0 - 11 : 4 3bit masks representing the count of each suit used.
 * 2. Rank-counter -- bits 12 - 62 : 13 3bit masks rerpesenting the count of each rank.
 * 3. Hand -- bits 62 - 117 : 14 4bit masks representing each card in the deck (Aces are repeated at start and end of mask.)
 *
 * As such, the hand with 4c 2s 3h 5c 5d
 *
 * AAAA KKKK QQQQ JJJJ TTTT 9999 8888 7777 6666 5555 4444 3333 2222 AAAA AAA KKK QQQ JJJ TTT 999 888 777 666 555 444 333 222 hhh ddd ccc sss
 * 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 000 000 000 000 000 000 000 000 000 000 000 000 000 000 000 000 000 
 * <-------------------------------- CARDS ----------------------------> <------------------- RANK COUNTER ----------------> < SUIT COUNTER>
 * 
 */

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




class Bitval128{

  constructor(){

    this.rng = new XorShift32();
    this.CARD_RANGE = BigInt("0b11111111111111111111111111111111111111111111111111111111000000000000000000000000000000000000000000000000000000");
    this.COUNT_RANGE = ~this.CARD_RANGE;
    /* 
                      AKQJT98765432AAKQJT98765432AAKQJT98765432AAKQJT98765432A421421421421421421421421421421421421421421421421421421
                      <---HEARTS---><--DIAMONDS--><---CLUBS----><---SPADES--->AAAKKKQQQJJJTTT999888777666555444333222AAAhhhdddcccsss 
    */
    this.CARDS = {
      "2s": BigInt("0b00000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000001000000000000001"),
      "3s": BigInt("0b00000000000000000000000000000000000000000000000000000100000000000000000000000000000000000001000000000000000001"),
      "4s": BigInt("0b00000000000000000000000000000000000000000000000000001000000000000000000000000000000000001000000000000000000001"),
      "5s": BigInt("0b00000000000000000000000000000000000000000000000000010000000000000000000000000000000001000000000000000000000001"),
      "6s": BigInt("0b00000000000000000000000000000000000000000000000000100000000000000000000000000000001000000000000000000000000001"),
      "7s": BigInt("0b00000000000000000000000000000000000000000000000001000000000000000000000000000001000000000000000000000000000001"),
      "8s": BigInt("0b00000000000000000000000000000000000000000000000010000000000000000000000000001000000000000000000000000000000001"),
      "9s": BigInt("0b00000000000000000000000000000000000000000000000100000000000000000000000001000000000000000000000000000000000001"),
      "Ts": BigInt("0b00000000000000000000000000000000000000000000001000000000000000000000001000000000000000000000000000000000000001"),
      "Js": BigInt("0b00000000000000000000000000000000000000000000010000000000000000000001000000000000000000000000000000000000000001"),
      "Qs": BigInt("0b00000000000000000000000000000000000000000000100000000000000000001000000000000000000000000000000000000000000001"),
      "Ks": BigInt("0b00000000000000000000000000000000000000000001000000000000000001000000000000000000000000000000000000000000000001"),
      "As": BigInt("0b00000000000000000000000000000000000000000010000000000001001000000000000000000000000000000000000001000000000001"),
            BigInt("0b11111111111111111111111111111111111111111111111111111111000000000000000000000000000000000000000000000000000000");

    /* 
                      AKQJT98765432AAKQJT98765432AAKQJT98765432AAKQJT98765432A421421421421421421421421421421421421421421421421421421
                      <---HEARTS---><--DIAMONDS--><---CLUBS----><---SPADES--->AAAKKKQQQJJJTTT999888777666555444333222AAAhhhdddcccsss 
    */
      "2c": BigInt("0b00000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000001000000000001000"),
      "3c": BigInt("0b00000000000000000000000000000000000000010000000000000000000000000000000000000000000000000001000000000000001000"),
      "4c": BigInt("0b00000000000000000000000000000000000000100000000000000000000000000000000000000000000000001000000000000000001000"),
      "5c": BigInt("0b00000000000000000000000000000000000001000000000000000000000000000000000000000000000001000000000000000000001000"),
      "6c": BigInt("0b00000000000000000000000000000000000010000000000000000000000000000000000000000000001000000000000000000000001000"),
      "7c": BigInt("0b00000000000000000000000000000000000100000000000000000000000000000000000000000001000000000000000000000000001000"),
      "8c": BigInt("0b00000000000000000000000000000000001000000000000000000000000000000000000000001000000000000000000000000000001000"),
      "9c": BigInt("0b00000000000000000000000000000000010000000000000000000000000000000000000001000000000000000000000000000000001000"),
      "Tc": BigInt("0b00000000000000000000000000000000100000000000000000000000000000000000001000000000000000000000000000000000001000"),
      "Jc": BigInt("0b00000000000000000000000000000001000000000000000000000000000000000001000000000000000000000000000000000000001000"),
      "Qc": BigInt("0b00000000000000000000000000000010000000000000000000000000000000001000000000000000000000000000000000000000001000"),
      "Kc": BigInt("0b00000000000000000000000000000100000000000000000000000000000001000000000000000000000000000000000000000000001000"),
      "Ac": BigInt("0b00000000000000000000000000001000000000000000000000000000001000000000000000000000000000000000000001000000001000"),

    /* 
                      AKQJT98765432AAKQJT98765432AAKQJT98765432AAKQJT98765432A421421421421421421421421421421421421421421421421421421
                      <---HEARTS---><--DIAMONDS--><---CLUBS----><---SPADES--->AAAKKKQQQJJJTTT999888777666555444333222AAAhhhdddcccsss 
    */
      "2d": BigInt("0b00000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000001000000001000000"),
      "3d": BigInt("0b00000000000000000000000001000000000000000000000000000000000000000000000000000000000000000001000000000001000000"),
      "4d": BigInt("0b00000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000001000000"),
      "5d": BigInt("0b00000000000000000000000100000000000000000000000000000000000000000000000000000000000001000000000000000001000000"),
      "6d": BigInt("0b00000000000000000000001000000000000000000000000000000000000000000000000000000000001000000000000000000001000000"),
      "7d": BigInt("0b00000000000000000000010000000000000000000000000000000000000000000000000000000001000000000000000000000001000000"),
      "8d": BigInt("0b00000000000000000000100000000000000000000000000000000000000000000000000000001000000000000000000000000001000000"),
      "9d": BigInt("0b00000000000000000001000000000000000000000000000000000000000000000000000001000000000000000000000000000001000000"),
      "Td": BigInt("0b00000000000000000010000000000000000000000000000000000000000000000000001000000000000000000000000000000001000000"),
      "Jd": BigInt("0b00000000000000000100000000000000000000000000000000000000000000000001000000000000000000000000000000000001000000"),
      "Qd": BigInt("0b00000000000000001000000000000000000000000000000000000000000000001000000000000000000000000000000000000001000000"),
      "Kd": BigInt("0b00000000000000010000000000000000000000000000000000000000000001000000000000000000000000000000000000000001000000"),
      "Ad": BigInt("0b00000000000000100000000000010000000000000000000000000000001000000000000000000000000000000000000001000001000000"),

    /* 
                      AKQJT98765432AAKQJT98765432AAKQJT98765432AAKQJT98765432A421421421421421421421421421421421421421421421421421421
                      <---HEARTS---><--DIAMONDS--><---CLUBS----><---SPADES--->AAAKKKQQQJJJTTT999888777666555444333222AAAhhhdddcccsss 
    */
      "2h": BigInt("0b00000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000001000001000000000"),
      "3h": BigInt("0b00000000000100000000000000000000000000000000000000000000000000000000000000000000000000000001000000001000000000"),
      "4h": BigInt("0b00000000001000000000000000000000000000000000000000000000000000000000000000000000000000001000000000001000000000"),
      "5h": BigInt("0b00000000010000000000000000000000000000000000000000000000000000000000000000000000000001000000000000001000000000"),
      "6h": BigInt("0b00000000100000000000000000000000000000000000000000000000000000000000000000000000001000000000000000001000000000"),
      "7h": BigInt("0b00000001000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000001000000000"),
      "8h": BigInt("0b00000010000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000001000000000"),
      "9h": BigInt("0b00000100000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000001000000000"),
      "Th": BigInt("0b00001000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000001000000000"),
      "Jh": BigInt("0b00010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000001000000000"),
      "Qh": BigInt("0b00100000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000001000000000"),
      "Kh": BigInt("0b01000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000001000000000"),
      "Ah": BigInt("0b10000000000001000000000000000000000000000000000000000000001000000000000000000000000000000000000001001000000000"),
    }

    this.DECK = Object.values(this.CARDS);
  }



  /**
   * Simulates a game between a hero and a villain on a board.
   * @param {Array} hero - Array of cards in the hero's hand.
   * @param {Array} villain - Array of cards in the villain's hand.
   * @param {Array} board - Array of cards on the board.
   * @param {number} iterations - Number of iterations to run the simulation (default: 100000).
   * @returns {Array} - Array containing the number of wins, losses, and ties.
   */
  simulate(hero, villain, board, iterations=100000){
    let heroHand = this.convertHandArrayToBitmask(hero);
    let villainHand = this.convertHandArrayToBitmask(villain);
    let boardHand = this.convertHandArrayToBitmask(board);
    let deadCards = heroHand | villainHand | boardHand;
    let cardsToDeal = 7 - [...hero, ...board].length;

    if (cardsToDeal === 0){
      iterations = Math.min(1, iterations);
    } else if (cardsToDeal === 1){
      iterations = Math.min(10000, iterations);
    }

    let win = 0;
    let lose = 0;
    let tie = 0;

    for(let count = 0; count < iterations; count++){

      let communityCards = cardsToDeal > 0 ? this.deal(boardHand, deadCards, 2) : boardHand;

      let heroFullHand = this.addToHand(heroHand, communityCards);
      let villainFullHand = this.addToHand(villainHand, communityCards);

      let heroEvaluation = this.lazyEvaluate(heroFullHand);
      let villainEvaluation = this.beats(villainFullHand, heroEvaluation);

      if (heroEvaluation > villainEvaluation){
        win++;
        continue;
      } else if (heroEvaluation < villainEvaluation){
        lose++;
        continue;
      }

      tie++;
    }
    return [win, lose, tie];
  }



  /**
   * Evaluates a poker hand and returns the best possible combination.
   *
   * @param {Array} hand - The array of cards in the hand.
   * @returns {Array|String} - The best possible combination of cards or the original hand if no combination is found.
   */
  lazyEvaluate(hand){

    console.log("SF");
    let straightFlush = this.hasStraightFlush(hand);
    if (straightFlush) return straightFlush;

    console.log("4x");
    let fourOfAKind = this.hasFourOfAKind(hand);
    if (fourOfAKind) return fourOfAKind;

    console.log("FH");
    let fullHouse = this.hasFullHouse(hand);
    if (fullHouse) return fullHouse;

    console.log("F");
    let flush = this.hasFlush(hand);
    if (flush) return flush;

    console.log("S");
    let straight = this.hasStraight(hand);
    if (straight) return straight;

    console.log("3x");
    let threeOfAKind = this.hasThreeOfAKind(hand);
    if (threeOfAKind) return threeOfAKind;

    console.log("P");
    let pairs = this.hasPair(hand);
    if (pairs) return pairs;
    console.log("Not a pair.");

    return hand;
  }



  /**
   * Determines the winning hand based on different combinations of cards.
   * @param {Array} hand1 - The first hand to compare.
   * @param {Array} hand2 - The second hand to compare.
   * @returns {Array} - The winning hand.
   */
  beats(hand1, hand2){

    let pairs = this.hasPair(hand1);
    if (pairs > hand2) return pairs;

    let threeOfAKind = this.hasThreeOfAKind(hand1);
    if (threeOfAKind > hand2) return threeOfAKind;

    let straight = this.hasStraight(hand1);
    if (straight > hand2) return straight;

    let flush = this.hasFlush(hand1);
    if (flush > hand2) return flush;

    let fullHouse = this.hasFullHouse(hand1);
    if (fullHouse > hand2) return fullHouse;

    let fourOfAKind = this.hasFourOfAKind(hand1);
    if (fourOfAKind > hand2) return fourOfAKind;

    let straightFlush = this.hasStraightFlush(hand1);
    if (straightFlush > hand2) return straightFlush;

    return hand1;
  }



  /**
   * convertHandArrayToBitmask - Converts an array of cards into a bitmask.
   *
   * @param {Array} hand - The array of cards.
   * @param {BigInt} handBitmask - The initial bitmask value (default is 0n).
   * @returns {BigInt} - The resulting bitmask.
   */
  convertHandArrayToBitmask(hand, handBitmask = 0n){
    for (let card of hand){
      handBitmask = this.addToHand(handBitmask, this.CARDS[card]);
    }
    return handBitmask;
  }



  /**
   * Returns the value of four of a kind in a hand.
   * @param {number} hand - The hand to check for four of a kind.
   * @returns {number} - The value of four of a kind in the hand.
   */
  hasFourOfAKind(hand){
    let four_of_a_kind = hand & this.RANK_MSB;

    return four_of_a_kind ? four_of_a_kind | this.FOUR_OF_A_KIND : 0n;
  }



  /**
   * Checks if a hand has a flush.
   *
   * @param {bigint} hand - The hand to check for a flush.
   * @returns {bigint} - The flush value if the hand has a flush, otherwise 0.
   */
  hasFlush(hand){
    let flush = (hand & this.SUIT_MSB) >> 2n & ((hand & this.SUIT_MB) >> 1n | (hand & this.SUIT_LSB))

    return flush ? flush | this.FLUSH : 0n;
  }



  /**
   * Calculates if the given hand has three of a kind.
   *
   * @param {bigint} hand - The hand to evaluate.
   * @returns {bigint} - Returns 0n if the hand does not have three of a kind, 
   * otherwise returns the hand with the appropriate flag set based on the count of bits.
   */
  hasThreeOfAKind(hand){
    let trips = (hand & this.RANK_MB) >> 1n & (hand & this.RANK_LSB);

    if (!trips) return 0n;

    return this.countBits == 1 ? trips | this.THREE_OF_A_KIND : trips | this.FULL_HOUSE;
  }



  /**
   * Determines if a hand has a full house and returns a value indicating the result.
   * 
   * @param {BigInt} hand - The hand to check for a full house.
   * @returns {BigInt} - A value indicating if the hand has a full house or not.
   */
  hasFullHouse(hand){
    let singles = hand & this.RANK_LSB;
    let pairs = hand & this.RANK_MB;
    let fullHouse = (
      (
        (pairs >> 1n) & singles
      ) << 1n ^ (pairs)
    );
    console.log("RUN");
    console.log(singles.toString(2).padStart(50,"0"));
    console.log(pairs.toString(2).padStart(50,"0"));
    console.log((hand & this.RANK_LSB).toString(2));
    // console.log(.toString(2));
    // console.log(.toString(2));
    console.log("/RUN");
    return fullHouse ? fullHouse | this.FULL_HOUSE : 0n;
  }



  /**
   * Determines if a hand has a pair or two pair.
   * @param {BigInt} hand - The hand to check for pairs.
   * @returns {BigInt} - Returns the bitmask representing one pair or two pair.
   */
  hasPair(hand){
    let pairs = this.RANK_MB & hand;

    if (pairs === 0n) return 0n;

    return this.countBits(pairs) == 1 ? pairs | this.ONE_PAIR : pairs | this.TWO_PAIR;
  }



  /**
   * Checks if the given hand has a straight flush.
   * @param {bigint} hand - The hand to check for a straight flush.
   * @returns {bigint} - The straight flush hand if found, otherwise 0.
   */
  hasStraightFlush(hand){
    let lsb = (((((hand >> 1n | hand) >> 1n) | hand) >> 1n) | hand) & this.HAND_LSB;

    let consecutive1 = lsb << 4n & lsb;
    let consecutive2 = lsb & (consecutive1 << 4n)
    let consecutive3 = lsb & (consecutive2 << 4n)
    let consecutive4 = lsb & (consecutive3 << 4n)

    return consecutive4 ? consecutive4 | this.STRAIGHT_FLUSH : 0n;
  }



  /**
   * Determines if a given hand has a straight.
   *
   * @param {number} hand - The hand to check for a straight.
   * @returns {number} - The straight hand.
   */
  hasStraight(hand){
    let lsb = (((hand >> 1n | hand) >> 1n) | hand) & this.RANK_LSB;

    let consecutive1 = lsb << 3n & lsb;
    let consecutive2 = lsb & (consecutive1 << 3n)
    let consecutive3 = lsb & (consecutive2 << 3n)
    let consecutive4 = lsb & (consecutive3 << 3n)

    return consecutive4 ? consecutive4 | this.STRAIGHT_FLUSH : 0n;
  }



  /**
   * Counts the number of bits that are set to 1 in a given hand.
   *
   * @param {bigint} hand - The hand to count the bits in.
   * @returns {number} The count of bits set to 1 in the hand.
   */
  countBits(hand){
    let count = 0;

    while (hand) {
      hand &= (hand - 1n);
      count++;
    }
    return count;
  }



  /**
   * Deals a specified number of cards to a hand, excluding any cards that are already in the hand or dead cards.
   * 
   * @param {BigInt} [hand=0n] - The hand to deal cards to. Default is 0.
   * @param {BigInt} [deadCards=0n] - The dead cards to exclude from the deal. Default is 0.
   * @param {number} [cardsToDeal=2] - The number of cards to deal. Default is 2.
   * @returns {BigInt} - The updated hand after dealing the cards.
   */
  deal(hand = 0n, deadCards = 0n, cardsToDeal = 2){

    let count = 0;
    while (count < cardsToDeal){
      let index = this.rng.next(52);
      if (this.DECK[index] >> 51n & ((hand | deadCards) >> 51n)) continue;

      hand = this.addToHand(hand, this.DECK[index]);
      count++;
    }
    return hand;
  }



  /**
   * Adds the specified card to the hand.
   * 
   * @param {number} hand - The current hand.
   * @param {number} toAdd - The card to add to the hand.
   * @returns {number} - The updated hand.
   */
  addToHand(hand = 0n, toAdd){
    return (hand | (toAdd & this.CARD_RANGE)) + (toAdd & this.COUNT_RANGE)
  }



  /**
   * Print the bitmask in a formatted way.
   * 
   * @param {number} bitmask - The bitmask to be printed.
   * @param {boolean} [guides=true] - Whether to print guides or not. Default is true.
   */
  formatBitmask(bitmask, guides = true){

    let bitmaskString = bitmask.toString(2).padStart(110, "0");

    let hand = bitmaskString.substring(0, 56).replace(/(.{14})/g,"$1 ");
    let ranks = bitmaskString.substring(56, 98).replace(/(.{3})/g,"$1 ");
    let suits = bitmaskString.substring(98, 110).replace(/(.{3})/g,"$1 ");
    let guide = "AKQJT98765432A AKQJT98765432A AKQJT98765432A AKQJT98765432A  AAA KKK QQQ JJJ TTT 999 888 777 666 555 444 333 222 AAA  hhh ddd ccc sss";
    return `\n${guides ? guide : ""}\n${hand} ${ranks} ${suits}`;
  }
}

if (typeof module !== 'undefined') module.exports = Bitval128;
