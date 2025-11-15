class XorShift32 {
  constructor() {
    this.state = 1;
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

class BitVal {
  constructor() {
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

    this.PAIR_SCORE = 1n << 56n;
    this.TWO_PAIRS_SCORE = 1n << 57n;
    this.TRIPS_SCORE = 1n << 58n;
    this.STRAIGHT_SCORE = 1n << 59n;
    this.FLUSH_SCORE = 1n << 60n;
    this.FULL_HOUSE_SCORE = 1n << 61n;
    this.QUADS_SCORE = 1n << 62n;
    this.STRAIGHT_FLUSH_SCORE = 1n << 63n;

    this.BIT_1 = BigInt("0b00010001000100010001000100010001000100010001000100010001");
    this.BIT_2 = BigInt("0b00100010001000100010001000100010001000100010001000100010");
    this.BIT_3 = BigInt("0b01000100010001000100010001000100010001000100010001000100");
    this.BIT_4 = BigInt("0b10001000100010001000100010001000100010001000100010001000");

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

  deal(hand, deadCards = 0n, numberOfCards = 7) {
    if (numberOfCards < 1) return hand;
    let deck = ~(hand | deadCards);
    let card;

    for (let i = 0; i < numberOfCards; i++) {
      do {
        card = 1n << BigInt(this.xorShift.next(52));
      } while ((card & deck) == 0n);

      hand |= card;
      deck &= ~card;
    }

    return hand;
  }

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

  _getRankMaskFromBitmask(bitmask) {
    return (this.RANK_MASK_LOOKUP[bitmask & 1n] || 0n) |
      (this.RANK_MASK_LOOKUP[bitmask & (1n << 52n)] || 0n) |
      (this.RANK_MASK_LOOKUP[bitmask] || 0n);
  }

  _getTwoPairRanksMask(pairsBitmask) {
    const firstBit = pairsBitmask & -pairsBitmask;
    const firstMask = this._getRankMaskFromBitmask(firstBit);

    const remaining = pairsBitmask & ~firstBit;
    const secondBit = remaining & -remaining;
    const secondMask = this._getRankMaskFromBitmask(secondBit);

    return firstMask | secondMask;
  }

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

  stripBits(hand, desiredSizeOfMask = 5) {
    let numberOfBitsToStrip = this.countBits(hand) - desiredSizeOfMask;

    while (numberOfBitsToStrip > 0) {
      hand &= (hand - 1n);
      numberOfBitsToStrip--;
    }
    return hand;
  }

  getBitMasked(cards) {
    let sf_mask = 0n;

    for (let card of cards) {
      sf_mask |= this.CARD_MASKS[card];
    }

    return sf_mask;
  }

  countBits(handMask) {
    let count = 0;

    while (handMask) {
      handMask &= (handMask - 1n);
      count++;
    }
    return count;
  }

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

  _bitTrips(hand) {
    let a = (((this.BIT_1 & hand) << 1n & (this.BIT_2 & hand)) << 1n & (this.BIT_3 & hand)) >> 2n;
    let b = (((this.BIT_2 & hand) << 1n & (this.BIT_3 & hand)) << 1n & (this.BIT_4 & hand)) >> 3n;
    let c = (((this.BIT_1 & hand) << 2n & (this.BIT_3 & hand)) << 1n & (this.BIT_4 & hand)) >> 3n;
    let d = (((this.BIT_1 & hand) << 1n & (this.BIT_2 & hand)) << 2n & (this.BIT_4 & hand)) >> 3n;
    return this.stripBits((a | b | c | d) & this.BIT_1, 1);
  }

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

  _bitStraight(hand) {
    hand = (hand | hand >> 1n | hand >> 2n | hand >> 3n) & this.BIT_1;

    hand = hand & 
      (hand << 4n) & 
      (hand << 8n) & 
      (hand << 12n) & 
      (hand << 16n);

    return this.stripBits(hand, 1);
  }

  _bitQuads(hand) {
    return ((((
      (hand & this.BIT_1) << 1n &
      (hand & this.BIT_2)) << 1n &
      (hand & this.BIT_3)) << 1n &
      (hand & this.BIT_4))
      & this.BIT_4) >> 3n;
  }

  _bitStraightFlush(hand) {
    hand = hand & 
      (hand << 4n) & 
      (hand << 8n) & 
      (hand << 12n) & 
      (hand << 16n);

    return this.stripBits(hand, 1);
  }

  _getCanonicalKey(hand) {
    const rankOrder = 'AKQJT98765432';
    const r1 = hand[0], r2 = hand[2], s1 = hand[1], s2 = hand[3];
    const r1Idx = rankOrder.indexOf(r1), r2Idx = rankOrder.indexOf(r2);
    const high = r1Idx < r2Idx ? r1 : r2, low = r1Idx < r2Idx ? r2 : r1;
    if (r1 === r2) return high + 'h' + low + 'c';
    if (s1 === s2) return high + 's' + low + 's';
    return high + 's' + low + 'h';
  }

  _flattenHandsToCanonical(hands) {
    const canonicalMap = new Map();
    for (const hand of hands) {
      const key = this._getCanonicalKey(hand);
      canonicalMap.set(key, (canonicalMap.get(key) || 0) + 1);
    }
    return canonicalMap;
  }

  _handStringToCards(hand) {
    return [hand.substring(0, 2), hand.substring(2, 4)];
  }

  _simulateMatchup(heroHand, villainHand, board, deadCards, numberOfBoardCards, iterations) {
    const heroCards = this._handStringToCards(heroHand);
    const villainCards = this._handStringToCards(villainHand);
    return this.simulate(iterations, numberOfBoardCards, heroCards, villainCards, board, deadCards);
  }

  compareRange(heroHands, villainHands, boardCards = [], deadCards = [], numberOfBoardCards = 5, iterations = 10000, optimize = true) {
    let win = 0, tie = 0, lose = 0;
    if (!optimize) {
      for (const h of heroHands) {
        for (const v of villainHands) {
          const r = this._simulateMatchup(h, v, boardCards, deadCards, numberOfBoardCards, iterations);
          win += r.win; tie += r.tie; lose += r.lose;
        }
      }
      return { win, tie, lose };
    }
    const hCanon = this._flattenHandsToCanonical(heroHands);
    const vCanon = this._flattenHandsToCanonical(villainHands);
    const cache = new Map();
    for (const [hk, hm] of hCanon) {
      for (const [vk, vm] of vCanon) {
        const ck = hk + vk;
        let r = cache.get(ck);
        if (!r) {
          r = this._simulateMatchup(hk, vk, boardCards, deadCards, numberOfBoardCards, iterations);
          cache.set(ck, r);
        }
        const m = hm * vm;
        win += r.win * m; tie += r.tie * m; lose += r.lose * m;
      }
    }
    return { win, tie, lose };
  }
}

if (typeof module !== 'undefined') module.exports = BitVal;
