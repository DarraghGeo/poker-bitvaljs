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

    this.SUIT_MSB = BigInt("0b100100100100");
    this.SUIT_MB = this.SUIT_MSB >> 1n;
    this.SUIT_LSB = this.SUIT_MSB >> 2n;

    this.RANK_MSB = BigInt("0b100100100100100100100100100100100100100000000000000");
    this.RANK_MB = this.RANK_MSB >> 1n;
    this.RANK_LSB = this.RANK_MSB >> 2n;

    this.HAND_LSB = BigInt("0b000100010001000100010001000100010001000100010001000100010000000000000000000000000000000000000000000000000000");
    this.CARD_RANGE = BigInt("0b111111111111111111111111111111111111111111111111000000000000000000000000000000000000000000000000000000000000");
    this.COUNT_RANGE = ~this.CARD_RANGE;

    this.ONE_PAIR = 1n << 108n;
    this.TWO_PAIR = 1n << 109n;
    this.THREE_OF_A_KIND = 1n << 110n;
    this.STRAIGHT = 1n << 111n;
    this.FLUSH = 1n << 112n;
    this.FULL_HOUSE = 1n << 113n;
    this.FOUR_OF_A_KIND = 1n << 114n;
    this.STRAIGHT_FLUSH = 1n << 115n;


    this.rng = new XorShift32();

    this.CARDS = {
                   /* hdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcs421421421421421421421421421421421421421421421421421
                      AAAAKKKKQQQQJJJJTTTT99998888777766665555444433332222AAAAAAAKKKQQQJJJTTT999888777666555444333222hhhdddcccsss */
      "2s": BigInt("0b00000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000001000000000001"),
      "2c": BigInt("0b00000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000001000000001000"),
      "2d": BigInt("0b00000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000001000001000000"),
      "2h": BigInt("0b00000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000001001000000000"),

                   /* hdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcs421421421421421421421421421421421421421421421421421
                      AAAAKKKKQQQQJJJJTTTT99998888777766665555444433332222AAAAAAAKKKQQQJJJTTT999888777666555444333222hhhdddcccsss */
      "3s": BigInt("0b00000000000000000000000000000000000000000000000100000000000000000000000000000000000000000001000000000000001"),
      "3c": BigInt("0b00000000000000000000000000000000000000000000001000000000000000000000000000000000000000000001000000000001000"),
      "3d": BigInt("0b00000000000000000000000000000000000000000000010000000000000000000000000000000000000000000001000000001000000"),
      "3h": BigInt("0b00000000000000000000000000000000000000000000100000000000000000000000000000000000000000000001000001000000000"),

                   /* hdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcs421421421421421421421421421421421421421421421421421
                      AAAAKKKKQQQQJJJJTTTT99998888777766665555444433332222AAAAAAAKKKQQQJJJTTT999888777666555444333222hhhdddcccsss */
      "4s": BigInt("0b00000000000000000000000000000000000000000001000000000000000000000000000000000000000000001000000000000000001"),
      "4c": BigInt("0b00000000000000000000000000000000000000000010000000000000000000000000000000000000000000001000000000000001000"),
      "4d": BigInt("0b00000000000000000000000000000000000000000100000000000000000000000000000000000000000000001000000000001000000"),
      "4h": BigInt("0b00000000000000000000000000000000000000001000000000000000000000000000000000000000000000001000000001000000000"),

                   /* hdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcs421421421421421421421421421421421421421421421421421
                      AAAAKKKKQQQQJJJJTTTT99998888777766665555444433332222AAAAAAAKKKQQQJJJTTT999888777666555444333222hhhdddcccsss */
      "5s": BigInt("0b00000000000000000000000000000000000000010000000000000000000000000000000000000000000001000000000000000000001"),
      "5c": BigInt("0b00000000000000000000000000000000000000100000000000000000000000000000000000000000000001000000000000000001000"),
      "5d": BigInt("0b00000000000000000000000000000000000001000000000000000000000000000000000000000000000001000000000000001000000"),
      "5h": BigInt("0b00000000000000000000000000000000000010000000000000000000000000000000000000000000000001000000000001000000000"),

                   /* hdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcs421421421421421421421421421421421421421421421421421
                      AAAAKKKKQQQQJJJJTTTT99998888777766665555444433332222AAAAAAAKKKQQQJJJTTT999888777666555444333222hhhdddcccsss */
      "6s": BigInt("0b00000000000000000000000000000000000100000000000000000000000000000000000000000000001000000000000000000000001"),
      "6c": BigInt("0b00000000000000000000000000000000001000000000000000000000000000000000000000000000001000000000000000000001000"),
      "6d": BigInt("0b00000000000000000000000000000000010000000000000000000000000000000000000000000000001000000000000000001000000"),
      "6h": BigInt("0b00000000000000000000000000000000100000000000000000000000000000000000000000000000001000000000000001000000000"),

                   /* hdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcs421421421421421421421421421421421421421421421421421
                      AAAAKKKKQQQQJJJJTTTT99998888777766665555444433332222AAAAAAAKKKQQQJJJTTT999888777666555444333222hhhdddcccsss */
      "7s": BigInt("0b00000000000000000000000000000001000000000000000000000000000000000000000000000001000000000000000000000000001"),
      "7c": BigInt("0b00000000000000000000000000000010000000000000000000000000000000000000000000000001000000000000000000000001000"),
      "7d": BigInt("0b00000000000000000000000000000100000000000000000000000000000000000000000000000001000000000000000000001000000"),
      "7h": BigInt("0b00000000000000000000000000001000000000000000000000000000000000000000000000000001000000000000000001000000000"),

                   /* hdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcs421421421421421421421421421421421421421421421421421
                      AAAAKKKKQQQQJJJJTTTT99998888777766665555444433332222AAAAAAAKKKQQQJJJTTT999888777666555444333222hhhdddcccsss */
      "8s": BigInt("0b00000000000000000000000000010000000000000000000000000000000000000000000000001000000000000000000000000000001"),
      "8c": BigInt("0b00000000000000000000000000100000000000000000000000000000000000000000000000001000000000000000000000000001000"),
      "8d": BigInt("0b00000000000000000000000001000000000000000000000000000000000000000000000000001000000000000000000000001000000"),
      "8h": BigInt("0b00000000000000000000000010000000000000000000000000000000000000000000000000001000000000000000000001000000000"),

                   /* hdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcs421421421421421421421421421421421421421421421421421
                      AAAAKKKKQQQQJJJJTTTT99998888777766665555444433332222AAAAAAAKKKQQQJJJTTT999888777666555444333222hhhdddcccsss */
      "9s": BigInt("0b00000000000000000000000100000000000000000000000000000000000000000000000001000000000000000000000000000000001"),
      "9c": BigInt("0b00000000000000000000001000000000000000000000000000000000000000000000000001000000000000000000000000000001000"),
      "9d": BigInt("0b00000000000000000000010000000000000000000000000000000000000000000000000001000000000000000000000000001000000"),
      "9h": BigInt("0b00000000000000000000100000000000000000000000000000000000000000000000000001000000000000000000000001000000000"),

                   /* hdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcs421421421421421421421421421421421421421421421421421
                      AAAAKKKKQQQQJJJJTTTT99998888777766665555444433332222AAAAAAAKKKQQQJJJTTT999888777666555444333222hhhdddcccsss */
      "Ts": BigInt("0b00000000000000000001000000000000000000000000000000000000000000000000001000000000000000000000000000000000001"),
      "Tc": BigInt("0b00000000000000000010000000000000000000000000000000000000000000000000001000000000000000000000000000000001000"),
      "Td": BigInt("0b00000000000000000100000000000000000000000000000000000000000000000000001000000000000000000000000000001000000"),
      "Th": BigInt("0b00000000000000001000000000000000000000000000000000000000000000000000001000000000000000000000000001000000000"),

                   /* hdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcs421421421421421421421421421421421421421421421421421
                      AAAAKKKKQQQQJJJJTTTT99998888777766665555444433332222AAAAAAAKKKQQQJJJTTT999888777666555444333222hhhdddcccsss */
      "Js": BigInt("0b00000000000000010000000000000000000000000000000000000000000000000001000000000000000000000000000000000000001"),
      "Jc": BigInt("0b00000000000000100000000000000000000000000000000000000000000000000001000000000000000000000000000000000001000"),
      "Jd": BigInt("0b00000000000001000000000000000000000000000000000000000000000000000001000000000000000000000000000000001000000"),
      "Jh": BigInt("0b00000000000010000000000000000000000000000000000000000000000000000001000000000000000000000000000001000000000"),

                   /* hdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcs421421421421421421421421421421421421421421421421421
                      AAAAKKKKQQQQJJJJTTTT99998888777766665555444433332222AAAAAAAKKKQQQJJJTTT999888777666555444333222hhhdddcccsss */
      "Qs": BigInt("0b00000000000100000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000001"),
      "Qc": BigInt("0b00000000001000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000001000"),
      "Qd": BigInt("0b00000000010000000000000000000000000000000000000000000000000000001000000000000000000000000000000000001000000"),
      "Qh": BigInt("0b00000000100000000000000000000000000000000000000000000000000000001000000000000000000000000000000001000000000"),

                   /* hdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcs421421421421421421421421421421421421421421421421421
                      AAAAKKKKQQQQJJJJTTTT99998888777766665555444433332222AAAAAAAKKKQQQJJJTTT999888777666555444333222hhhdddcccsss */
      "Ks": BigInt("0b00000001000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000001"),
      "Kc": BigInt("0b00000010000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000001000"),
      "Kd": BigInt("0b00000100000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000001000000"),
      "Kh": BigInt("0b00001000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000001000000000"),

                   /* hdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcshdcs421421421421421421421421421421421421421421421421421
                      AAAAKKKKQQQQJJJJTTTT99998888777766665555444433332222AAAAAAAKKKQQQJJJTTT999888777666555444333222hhhdddcccsss */
      "As": BigInt("0b00010000000000000000000000000000000000000000000000000001001000000000000000000000000000000000000000000000001"),
      "Ac": BigInt("0b00100000000000000000000000000000000000000000000000000010001000000000000000000000000000000000000000000001000"),
      "Ad": BigInt("0b01000000000000000000000000000000000000000000000000000100001000000000000000000000000000000000000000001000000"),
      "Ah": BigInt("0b10000000000000000000000000000000000000000000000000001000001000000000000000000000000000000000000001000000000"),
    }
    this.DECK = Object.values(this.CARDS);
  }

  printBitmask(bitmask, guides = true){

    let bitmaskString = bitmask.toString(2).padStart(107, "0");

    let hand = bitmaskString.substring(0, 56).replace(/(.{4})/g,"$1 ");
    let ranks = bitmaskString.substring(56, 95).replace(/(.{3})/g,"$1 ");
    let suits = bitmaskString.substring(95, 107).replace(/(.{3})/g,"$1 ");
    if (guides){
      console.log("\nAAAA KKKK QQQQ JJJJ TTTT 9999 8888 7777 6666 5555 4444 3333 2222 AAAA  AAA KKK QQQ JJJ TTT 999 888 777 666 555 444 333 222  hhh ddd ccc sss");
    }
    console.log(hand, ranks, suits);
  }

  convertHandArrayToBitmask(hand, handBitmask = 0n){
    for (let card of hand){
      handBitmask = this.addToHand(handBitmask, this.CARDS[card]);
    }
    return handBitmask;
  }

  mayHaveStrongHand(hand){
    // Flush = 4 of same suit.
    // Quads = 4 of same rank.
    // Full House = 3 of a kind (Pair & Singlet)
    // Straight =
  }

  hasFourOfAKind(hand){
    let four_of_a_kind = hand & this.RANK_MSB;

    return four_of_a_kind ? four_of_a_kind | this.FOUR_OF_A_KIND : 0n;
  }

  hasFlush(hand){
    let flush = (hand & this.SUIT_MSB) >> 2n & ((hand & this.SUIT_MB) >> 1n | (hand & this.SUIT_LSB))

    return flush ? flush | this.FLUSH : 0n;
  }

  hasThreeOfAKind(hand){
    let trips = (hand & this.RANK_MB) >> 1n & (hand & this.RANK_LSB);

    if (!trips) return 0n;

    return this.countBits == 1 ? trips | this.THREE_OF_A_KIND : trips | this.FULL_HOUSE;
  }

  hasFullHouse(hand){
    let fullHouse = (hand & this.RANK_MB) >> 1n & (hand & this.RANK_LSB) << 1n ^ (hand & this.RANK_MB);
    return fullHouse ? fullHouse | this.FULL_HOUSE : 0n;
  }

  hasPair(hand){
    let pairs = this.RANK_MB & hand;

    if (pairs === 0n) return 0n;

    return this.countBits(pairs) == 1 ? pairs | this.ONE_PAIR : pairs | this.TWO_PAIR;
  }

  hasStraightFlush(hand){
    let lsb = (((((hand >> 1n | hand) >> 1n) | hand) >> 1n) | hand) & this.HAND_LSB;

    let consecutive1 = lsb << 4n & lsb;
    let consecutive2 = lsb & (consecutive1 << 4n)
    let consecutive3 = lsb & (consecutive2 << 4n)
    let consecutive4 = lsb & (consecutive3 << 4n)

    return consecutive4;
  }

  hasStraight(hand){
    let lsb = (((hand >> 1n | hand) >> 1n) | hand) & this.RANK_LSB;

    let consecutive1 = lsb << 3n & lsb;
    let consecutive2 = lsb & (consecutive1 << 3n)
    let consecutive3 = lsb & (consecutive2 << 3n)
    let consecutive4 = lsb & (consecutive3 << 3n)

    return consecutive4;
  }

  countBits(hand){
    let count = 0;

    while (hand) {
      hand &= (hand - 1n);
      count++;
    }
    return count;
  }

  lazyEvaluate(hand){

    let straightFlush = this.hasStraightFlush(hand);
    if (straightFlush) return straightFlush;

    let fourOfAKind = this.hasFourOfAKind(hand);
    if (fourOfAKind) return fourOfAKind;

    let fullHouse = this.hasFullHouse(hand);
    if (fullHouse) return fullHouse;

    let flush = this.hasFlush(hand);
    if (flush) return flush;

    let straight = this.hasStraight(hand);
    if (straight) return straight;

    let threeOfAKind = this.hasThreeOfAKind(hand);
    if (threeOfAKind) return threeOfAKind;

    let pairs = this.hasPair(hand);
    if (pairs) return pairs;

    return hand;
  }

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

  addToHand(hand, toAdd){
    return (hand | (toAdd & this.CARD_RANGE)) + (toAdd & this.COUNT_RANGE)
  }

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

      console.log("\nFull hands:");
      this.printBitmask(heroFullHand)
      this.printBitmask(villainFullHand)

      let heroEvaluation = this.lazyEvaluate(heroFullHand);
      let villainEvaluation = this.beats(villainFullHand, heroEvaluation);

      console.log("\nEvals:");
      this.printBitmask(heroEvaluation);
      this.printBitmask(villainEvaluation);
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
}

const bitval = new Bitval128();
let startTime = performance.now();

//bitval.simulate(["Ac","Ad"], ["Ks","Jh"], ["3c","8d","9s","4h","2d"], 1000000);
//bitval.convertHandArrayToBitmask(["Ac","Ad"]);

let hero = ["Ac","Ad"];
let villain = ["Ks","Jh"];
let board = ["Tc","8d","9s"];
console.log(bitval.simulate(hero, villain, board, 10));

let endTime = performance.now();
console.log(parseFloat(endTime - startTime,2), "miliseconds");
