// Where bitval-worker.js lives. Resolved against this script's own URL when it
// is loaded with a <script> tag (so it works from node_modules / a CDN path,
// not just next to the page); otherwise relative to the page. Override per
// instance with `bitval.workerUrl = '...'` (e.g. when bundling).
const _BITVAL_WORKER_URL = (function () {
  try {
    if (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) {
      return new URL('bitval-worker.js', document.currentScript.src).href;
    }
  } catch (e) { /* fall through */ }
  return './bitval-worker.js';
})();

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

class BitVal {
  constructor() {
    this.workerUrl = _BITVAL_WORKER_URL;
    // Opt-in Monte Carlo mode: sample boards once and evaluate every hand on
    // each board (see _compareRangeSharedBoards). Off = per-matchup sampling.
    this.mcSharedBoards = false;
    // Exact flop/turn jobs at least this big (unique hands x runouts) are split
    // across workers when workers are enabled.
    this._EXACT_WORKER_THRESHOLD = 300000;

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

    // ---- BigInt-free fast path (Number evaluator) lookups ----
    // Rank index 0..12 = 2..A; suit index 0..3. A card set is four 13-bit rank
    // masks (one per suit); evaluation and set-union run entirely on Numbers.
    this._N_RANK = { '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7, 'T': 8, 'J': 9, 'Q': 10, 'K': 11, 'A': 12 };
    this._N_SUIT = { s: 0, h: 1, d: 2, c: 3 };
    // Char-code lookups for evaluateCards (rank / suit index, -1 = invalid).
    this._RANK_CC = new Int8Array(128).fill(-1);
    this._SUIT_CC = new Int8Array(128).fill(-1);
    for (const r in this._N_RANK) this._RANK_CC[r.charCodeAt(0)] = this._N_RANK[r];
    for (const u in this._N_SUIT) this._SUIT_CC[u.charCodeAt(0)] = this._N_SUIT[u];
    this.CARD_SUITS = {};                 // 'As' -> { suit, bit }
    this._MASK_TO_SUIT = new Map();       // single-card BigInt mask -> { suit, bit }
    for (const card in this.CARD_MASKS) {
      const sr = { suit: this._N_SUIT[card[1]], bit: 1 << this._N_RANK[card[0]] };
      this.CARD_SUITS[card] = sr;
      this._MASK_TO_SUIT.set(this.CARD_MASKS[card], sr);
    }

    // 13-bit rank-mask lookup tables for the fast evaluator. Each is 8192
    // entries (~8-16 KB total), built once here, cache-resident at runtime.
    // _POPC13[m]     = number of set bits (suit length / rank count).
    // _STRAIGHT13[m] = top rank (4..12) of the best straight, 3 for the wheel,
    //                  or -1 for none. Replaces the per-eval straight scan loop.
    this._POPC13 = new Uint8Array(8192);
    this._STRAIGHT13 = new Int8Array(8192);
    for (let m = 0; m < 8192; m++) {
      let c = 0, x = m;
      while (x) { x &= x - 1; c++; }
      this._POPC13[m] = c;
      let run = 0, top = -1;
      for (let r = 12; r >= 0; r--) {
        if (m & (1 << r)) { if (++run >= 5) { top = r + 4; break; } } else run = 0;
      }
      if (top < 0 && (m & (1 << 12)) && (m & 0b1111) === 0b1111) top = 3; // wheel
      this._STRAIGHT13[m] = top;
    }
    // Kicker tables (replace the per-eval "peel the highest bit" loops):
    // _TOP5V13[m] = top five ranks of m packed as r1*65536+r2*4096+r3*256+r4*16+r5
    //              (flush / high card value; fewer ranks just sum fewer terms).
    // _KEEP2_13[m] / _KEEP3_13[m] = m with only its top 2 / top 3 bits kept, so
    //              _TOP5V13[_KEEP3_13[m]] >> 4 = k1*4096+k2*256+k3*16 (pair kickers).
    this._TOP5V13 = new Int32Array(8192);
    this._KEEP2_13 = new Uint16Array(8192);
    this._KEEP3_13 = new Uint16Array(8192);
    for (let m = 0; m < 8192; m++) {
      let v = 0, shift = 65536, n = 0, keep = 0;
      for (let r = 12; r >= 0 && n < 5; r--) {
        if (m & (1 << r)) {
          v += r * shift; shift >>= 4; n++; keep |= 1 << r;
          if (n === 2) this._KEEP2_13[m] = keep;
          if (n === 3) this._KEEP3_13[m] = keep;
        }
      }
      if (n < 2) this._KEEP2_13[m] = keep;
      if (n < 3) this._KEEP3_13[m] = keep;
      this._TOP5V13[m] = v;
    }

    // Preflop exact-equity table (loaded on demand via loadPreflopTable). The 24
    // suit permutations canonicalize a matchup for lookup (card index = rank*4+suit).
    // Lookup is an open-addressing hash in typed arrays (_pfKeys/_pfSlot).
    this._pfSlot = null; this._pfKeys = null; this._pfMask = 0; this._pfShift = 0;
    this._pfWin = null; this._pfTie = null; this._pfTotal = 0;
    this._S4 = (function () { const p = a => a.length <= 1 ? [a] : a.flatMap((x, i) => p(a.slice(0, i).concat(a.slice(i + 1))).map(r => [x, ...r])); return p([0, 1, 2, 3]); })();
  }

  // ============================================
  // PUBLIC API - Core Hand Evaluation
  // ============================================

  /**
   * Evaluates a poker hand represented as a BigInt bitmask (from
   * `getBitMasked`). This is the original (legacy) BigInt API, kept for
   * compatibility; `evaluateSuits` / `evaluateCards` order hands identically
   * and are ~5-28x faster.
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

  // ============================================
  // FAST PATH - BigInt-free (Number) evaluator
  // ============================================

  /**
   * Population count of a 13-bit rank mask.
   * @private
   */
  _popc(m) { return this._POPC13[m]; }

  /**
   * Index (0..12) of the highest set bit of a non-zero 13-bit rank mask.
   * @private
   */
  _high(m) { return 31 - Math.clz32(m); }

  /**
   * Top rank (4..12) of the best 5-card straight in a 13-bit rank mask, or -1.
   * Handles the A-2-3-4-5 wheel (returns 3, i.e. a five-high straight).
   * @private
   */
  _straightTop(m) { return this._STRAIGHT13[m]; }

  /**
   * Builds the four 13-bit suit rank masks [spades, hearts, diamonds, clubs]
   * for an array of card strings (e.g. ['As', 'Kd']), as `evaluateSuits`
   * takes them. Public as `toSuitMasks` (same function).
   * @param {Array} cards - card strings
   * @returns {Array} [s, h, d, c]
   */
  _suitsOfCards(cards) {
    const suits = [0, 0, 0, 0];
    for (let i = 0; i < cards.length; i++) {
      const sr = this.CARD_SUITS[cards[i]];
      if (sr === undefined) throw new Error(`Invalid card: ${JSON.stringify(cards[i])}`);
      suits[sr.suit] |= sr.bit;
    }
    return suits;
  }

  /**
   * Evaluates 5-7 distinct cards given as strings (e.g. ['As', 'Kd', ...]).
   * Returns the same value as `evaluateSuits(...toSuitMasks(cards))`, without
   * allocating. For repeated evaluation of the same hole cards, prebuilding
   * masks and calling `evaluateSuits` is faster still.
   * @param {Array} cards - card strings
   * @returns {Number} hand value (higher is stronger)
   */
  evaluateCards(cards) {
    const R = this._RANK_CC, S = this._SUIT_CC;
    let s = 0, h = 0, d = 0, c = 0;
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const r = R[card.charCodeAt(0)], u = S[card.charCodeAt(1)];
      if (!(r >= 0) || !(u >= 0) || card.length !== 2) throw new Error(`Invalid card: ${JSON.stringify(card)}`);
      const bit = 1 << r;
      if (u === 0) s |= bit; else if (u === 1) h |= bit; else if (u === 2) d |= bit; else c |= bit;
    }
    return this.evaluateSuits(s, h, d, c);
  }

  /**
   * Category name of a value from `evaluateSuits` / `evaluateCards`:
   * 'High Card', 'Pair', 'Two Pair', 'Trips', 'Straight', 'Flush',
   * 'Full House', 'Quads' or 'Straight Flush'.
   * @param {Number} value - hand value
   * @returns {String} category name
   */
  handCategory(value) {
    return BitVal.HAND_CATEGORIES[value >>> 20];
  }

  /**
   * Decomposes a BigInt card-set mask into four 13-bit suit rank masks.
   * Used once per matchup / combo, never in the innermost loop.
   * @private
   */
  _suitsFromBigMask(bigMask) {
    const suits = [0, 0, 0, 0];
    for (const [mask, sr] of this._MASK_TO_SUIT) {
      if ((bigMask & mask) === mask) suits[sr.suit] |= sr.bit;
    }
    return suits;
  }

  /**
   * Available cards (as {suit, bit}) not present in the given BigInt dead mask.
   * Built once per matchup for the Monte Carlo dealing loop.
   * @private
   */
  _availableSuitCards(deadMask) {
    const out = [];
    for (const [mask, sr] of this._MASK_TO_SUIT) {
      if ((deadMask & mask) === 0n) out.push((sr.suit << 16) | sr.bit);
    }
    return Int32Array.from(out); // packed: suit in bits 16-17, rank bit in low 13
  }

  /**
   * All k-card runouts (k = 0..2) from the cards NOT in `exclude` (a {lo, hi}
   * card bitset), as one flat Int32Array with 4 suit rank masks per runout
   * (s, h, d, c) — the layout the exact kernel reads. Built from card indices
   * directly (no BigInt).
   * @private
   */
  _runoutSuits(exclude, k) {
    const cards = [];
    for (let c = 0; c < 52; c++) if (!(c < 32 ? exclude.lo & (1 << c) : exclude.hi & (1 << (c - 32)))) cards.push(c);
    const n = cards.length;
    if (k === 0) return new Int32Array(4);
    if (k === 1) {
      const out = new Int32Array(n * 4);
      for (let i = 0; i < n; i++) out[i * 4 + (cards[i] & 3)] = 1 << (cards[i] >> 2);
      return out;
    }
    const out = new Int32Array((n * (n - 1) / 2) * 4);
    let o = 0;
    for (let i = 0; i < n; i++) {
      const ci = cards[i];
      for (let j = i + 1; j < n; j++, o += 4) {
        const cj = cards[j];
        out[o + (ci & 3)] |= 1 << (ci >> 2);
        out[o + (cj & 3)] |= 1 << (cj >> 2);
      }
    }
    return out;
  }

  /**
   * Converts BigInt runout masks to the 4-suit-masks-per-runout layout.
   * @private
   */
  _buildComboSuits(comboArray) {
    const out = new Int32Array(comboArray.length * 4);
    for (let i = 0; i < comboArray.length; i++) {
      const s = this._suitsFromBigMask(comboArray[i]);
      const b = i * 4;
      out[b] = s[0]; out[b + 1] = s[1]; out[b + 2] = s[2]; out[b + 3] = s[3];
    }
    return out;
  }

  /**
   * Fast hand evaluator (public; also available as `_eval7`, the same
   * function). Evaluates 5-7 distinct cards given as four 13-bit rank masks,
   * one per suit in the order spades, hearts, diamonds, clubs; bit 0 = deuce
   * ... bit 12 = ace (build them with `toSuitMasks(cards)`).
   *
   * Returns an integer in [0, 2^24): higher beats lower, equal values tie.
   * `value >>> 20` is the category (0 high card, 1 pair, 2 two pair, 3 trips,
   * 4 straight, 5 flush, 6 full house, 7 quads, 8 straight flush); see
   * `handCategory(value)`. Orders hands exactly as `evaluate()` does. No
   * BigInt, no allocation (~20 ns per hand in V8).
   * @param {Number} s - spade rank mask
   * @param {Number} h - heart rank mask
   * @param {Number} d - diamond rank mask
   * @param {Number} c - club rank mask
   * @returns {Number} hand value (higher is stronger)
   */
  evaluateSuits(s, h, d, c) {
    const all = s | h | d | c;
    const POPC = this._POPC13, STR = this._STRAIGHT13;

    // Flush suit (>=5 of one suit), reused for straight-flush and flush.
    let fm = 0;
    if (POPC[s] >= 5) fm = s;
    else if (POPC[h] >= 5) fm = h;
    else if (POPC[d] >= 5) fm = d;
    else if (POPC[c] >= 5) fm = c;

    // Straight flush
    if (fm) {
      const t = STR[fm];
      if (t >= 0) return 8 * 1048576 + t * 65536;
    }

    // Per-rank suit-count masks (exact via boolean suit combinations)
    const four = s & h & d & c;
    const threePlus = (s & h & d) | (s & h & c) | (s & d & c) | (h & d & c);
    const twoPlus = (s & h) | (s & d) | (s & c) | (h & d) | (h & c) | (d & c);
    const trips = threePlus & ~four;   // exactly three
    const pairs = twoPlus & ~threePlus; // exactly two

    // Quads
    if (four) {
      const q = this._high(four);
      const k = this._high(all & ~(1 << q));
      return 7 * 1048576 + q * 65536 + k * 4096;
    }

    // Full house (a trip plus another trip or a pair)
    if (trips) {
      const t1 = this._high(trips);
      const restTrips = trips & ~(1 << t1);
      const p = restTrips ? this._high(restTrips) : (pairs ? this._high(pairs) : -1);
      if (p >= 0) return 6 * 1048576 + t1 * 65536 + p * 4096;
    }

    // Flush
    if (fm) return 5 * 1048576 + this._TOP5V13[fm];

    // Straight
    {
      const t = STR[all];
      if (t >= 0) return 4 * 1048576 + t * 65536;
    }

    // Trips
    if (trips) {
      const t = this._high(trips);
      return 3 * 1048576 + t * 65536 + (this._TOP5V13[this._KEEP2_13[all & ~(1 << t)]] >> 4);
    }

    // Two pair
    if (pairs && (pairs & (pairs - 1))) {
      const p1 = this._high(pairs);
      const p2 = this._high(pairs & ~(1 << p1));
      const k = this._high(all & ~(1 << p1) & ~(1 << p2));
      return 2 * 1048576 + p1 * 65536 + p2 * 4096 + k * 256;
    }

    // One pair
    if (pairs) {
      const p = this._high(pairs);
      return 1 * 1048576 + p * 65536 + (this._TOP5V13[this._KEEP3_13[all & ~(1 << p)]] >> 4);
    }

    // High card
    return this._TOP5V13[all];
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
    const numberOfCardsToDeal = numberOfBoardCards - board.length;
    const xorShift = this.xorShift = new XorShift32();

    const allDeadCards = [...hero, ...villain, ...board, ...deadCards];
    const deadMask = this.getBitMasked(allDeadCards);

    const availableCards = 52 - new Set(allDeadCards).size;
    const exhaustiveCombinations = this.combinations(availableCards, numberOfCardsToDeal);

    // For <=2 cards to come the full runout space is tiny (<=1326), so always
    // enumerate it exactly instead of Monte-Carloing a low iteration count.
    // 0 cards to come (a complete board) is also exhaustive: exactly one runout.
    // Exhaustive is exact and deterministic; the iteration count only matters
    // for larger (>=3 cards to come) scenarios.
    const isExhaustive = numberOfCardsToDeal >= 0 && numberOfCardsToDeal <= 2;
    iterations = isExhaustive ? exhaustiveCombinations : Math.min(iterations, exhaustiveCombinations);

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

    // BigInt-free hot loop (same engine as compareRange): cards are four 13-bit
    // suit rank masks and _eval7 orders hands identically to evaluate().
    const hs = this._suitsOfCards(hero), vs = this._suitsOfCards(villain), bs = this._suitsOfCards(board);
    const hs0 = hs[0] | bs[0], hs1 = hs[1] | bs[1], hs2 = hs[2] | bs[2], hs3 = hs[3] | bs[3];
    const vs0 = vs[0] | bs[0], vs1 = vs[1] | bs[1], vs2 = vs[2] | bs[2], vs3 = vs[3] | bs[3];
    let win = 0, tie = 0, lose = 0;

    if (isExhaustive) {
      const combos = this._runoutSuits(this._cardsBitset(allDeadCards), numberOfCardsToDeal);
      const n = Math.min(iterations, combos.length >> 2);
      for (let i = 0; i < n; i++) {
        const b = i << 2, d0 = combos[b], d1 = combos[b + 1], d2 = combos[b + 2], d3 = combos[b + 3];
        const hE = this._eval7(hs0 | d0, hs1 | d1, hs2 | d2, hs3 | d3);
        const vE = this._eval7(vs0 | d0, vs1 | d1, vs2 | d2, vs3 | d3);
        if (hE > vE) win++; else if (vE > hE) lose++; else tie++;
      }
    } else {
      // Partial Fisher-Yates draw from the packed pool of live cards.
      const pool = this._availableSuitCards(deadMask), poolLen = pool.length;
      const nDeal = poolLen < numberOfCardsToDeal ? 0 : numberOfCardsToDeal;
      let st = xorShift.state;
      for (let i = 0; i < iterations; i++) {
        let d0 = 0, d1 = 0, d2 = 0, d3 = 0;
        for (let k = 0; k < nDeal; k++) {
          st ^= st << 13; st ^= st >> 17; st ^= st << 5;
          const j = k + Math.abs(st) % (poolLen - k);
          const card = pool[j]; pool[j] = pool[k]; pool[k] = card;
          const bit = card & 0xFFFF, suit = card >> 16;
          if (suit === 0) d0 |= bit; else if (suit === 1) d1 |= bit; else if (suit === 2) d2 |= bit; else d3 |= bit;
        }
        const hE = this._eval7(hs0 | d0, hs1 | d1, hs2 | d2, hs3 | d3);
        const vE = this._eval7(vs0 | d0, vs1 | d1, vs2 | d2, vs3 | d3);
        if (hE > vE) win++; else if (vE > hE) lose++; else tie++;
      }
      xorShift.state = st;
    }

    result.win = win; result.tie = tie; result.lose = lose;
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
   * @param {Number} mcTargetPct - Monte Carlo early-stop target: stop sampling a
   *   matchup once its 95% CI half-width is within this many equity percentage
   *   points (default: 0.3). Pass 0 to force the full `iterations`. Only affects
   *   Monte Carlo (preflop); the exact flop/turn and preflop-table paths ignore it.
   * @returns {Promise<Object>} { win, tie, lose } - Results object
   */
  async compareRange(heroHands, villainHands, boardCards = [], deadCards = [], numberOfBoardCards = 5, iterations = 10000, optimize = true, progressCallback = null, progressInterval = 100, useWorkers = true, mcTargetPct = 0.3) {
    // Combo weights: entries may be 'AsKs', 'AsKs:0.5' or { hand, weight }.
    // weights === null means every hand has weight 1 (the unweighted path).
    const hero = this._normalizeRange(heroHands), villain = this._normalizeRange(villainHands);
    heroHands = hero.hands; villainHands = villain.hands;
    const heroWeights = hero.weights, villainWeights = villain.weights;

    // Preflop exact fast path: if the preflop equity table is loaded and this is
    // a full-board preflop query with no dead cards, look up every matchup's
    // exact equity instead of Monte Carlo. Instant and exact.
    if (this._pfSlot && boardCards.length === 0 && deadCards.length === 0 && numberOfBoardCards === 5) {
      const r = this._compareRangePreflopExact(heroHands, villainHands, heroWeights, villainWeights);
      if (progressCallback) progressCallback(1, 1, 'Complete');
      return r;
    }
    const setup = this._compareRangeSetup(heroHands, villainHands, boardCards, deadCards, numberOfBoardCards, iterations, optimize, heroWeights, villainWeights);
    // Monte Carlo early-stop target (95% CI half-width, in equity percentage
    // points). Default on; pass 0 to force full `iterations`. Ignored by the
    // exact (exhaustive) path. Only affects the remaining MC case (preflop with
    // dead cards, or preflop with no table loaded).
    setup.mcTarget = mcTargetPct;
    return optimize ? await this._compareRangeOptimized(setup, progressCallback, progressInterval, useWorkers) : await this._compareRangeUnoptimized(heroHands, villainHands, setup, progressCallback, progressInterval);
  }

  /**
   * Like compareRange, but also returns every hand's own result, from the same
   * single pass: each hero hand's win/tie/lose against the villain range, and
   * each villain hand's win/tie/lose against the hero range. Same arguments and
   * the same calculation paths as compareRange (exact flop/turn, preflop
   * table), except that Monte Carlo always uses shared boards (see
   * mcSharedBoards), since per-matchup sampling can't give per-hand results.
   *
   * A hand's counts are weighted by the OTHER side's weights only, so its
   * equity is (win + tie / 2) / (win + tie + lose); all three are 0 when no
   * matchup is possible (e.g. it's blocked by every opposing combo). The
   * totals equal sum(weight[i] * hero.win[i]) etc. and match compareRange.
   *
   * @returns {Promise<Object>} { win, tie, lose,
   *   hero:    { hands, weights, win, tie, lose },   // Float64Arrays, by hand index
   *   villain: { hands, weights, win, tie, lose } }  // villain.win = villain's wins
   *   `hands` are the normalized hand strings (weight-0 entries removed).
   */
  async compareRangeHands(heroHands, villainHands, boardCards = [], deadCards = [], numberOfBoardCards = 5, iterations = 10000, optimize = true, progressCallback = null, progressInterval = 100, useWorkers = true, mcTargetPct = 0.3) {
    const hero = this._normalizeRange(heroHands), villain = this._normalizeRange(villainHands);
    const H = hero.hands, V = villain.hands, hw = hero.weights, vw = villain.weights;
    const side = (hands, weights) => ({
      hands, weights: weights || new Float64Array(hands.length).fill(1),
      win: new Float64Array(hands.length), tie: new Float64Array(hands.length), lose: new Float64Array(hands.length)
    });
    const out = { win: 0, tie: 0, lose: 0, hero: side(H, hw), villain: side(V, vw) };

    if (this._pfSlot && boardCards.length === 0 && deadCards.length === 0 && numberOfBoardCards === 5) {
      const r = this._compareRangePreflopExact(H, V, hw, vw, out);
      out.win = r.win; out.tie = r.tie; out.lose = r.lose;
      if (progressCallback) progressCallback(1, 1, 'Complete');
      return out;
    }

    const setup = this._compareRangeSetup(H, V, boardCards, deadCards, numberOfBoardCards, iterations, optimize, hw, vw);
    setup.mcTarget = mcTargetPct;
    setup.perHand = true;
    if (!optimize) {
      await this._compareRangeHandsUnoptimized(setup, out, progressCallback);
      return out;
    }

    let work, acc;
    if (setup.isExhaustive) {
      work = this._buildExhaustiveWork(setup);
      const comboSuits = setup._comboSuits, nRun = comboSuits.length >> 2;
      if (useWorkers && typeof Worker !== 'undefined' && work.U * nRun >= this._EXACT_WORKER_THRESHOLD) {
        const nw = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
        const chunk = Math.max(1, Math.ceil(nRun / nw));
        let next = 0, done = 0;
        acc = this._emptyHandTotals(work.U);
        await this._runKernelBatches(work,
          () => { if (next >= nRun) return null; const a = next; next = Math.min(nRun, next + chunk); return comboSuits.slice(a * 4, next * 4); },
          (r, n) => { this._addHandTotals(acc, r); done += n; if (progressCallback) progressCallback(done, nRun, `Evaluating runouts ${done}/${nRun}`); },
          true, progressCallback);
      } else {
        acc = this._runExhaustiveHands(work, comboSuits, 0, nRun);
      }
      if (progressCallback) progressCallback(nRun, nRun, 'Complete');
    } else {
      const r = await this._compareRangeSharedBoards(setup, progressCallback, useWorkers);
      work = r.work; acc = r.hands;
    }
    out.win = acc.win; out.tie = acc.tie; out.lose = acc.lose;
    const fill = (dst, entryU, w, t, l) => {
      for (let i = 0; i < entryU.length; i++) {
        const u = entryU[i];
        if (u >= 0) { dst.win[i] = w[u]; dst.tie[i] = t[u]; dst.lose[i] = l[u]; }
      }
    };
    fill(out.hero, work.heroEntryU, acc.hw, acc.ht, acc.hl);
    fill(out.villain, work.villEntryU, acc.vw, acc.vt, acc.vl);
    return out;
  }

  /** Zeroed per-hand accumulator for U unique hands. @private */
  _emptyHandTotals(U) {
    return { win: 0, tie: 0, lose: 0,
      hw: new Float64Array(U), ht: new Float64Array(U), hl: new Float64Array(U),
      vw: new Float64Array(U), vt: new Float64Array(U), vl: new Float64Array(U) };
  }

  /** Adds one batch's per-hand kernel result into an accumulator. @private */
  _addHandTotals(acc, r) {
    acc.win += r.win; acc.tie += r.tie; acc.lose += r.lose;
    for (const f of ['hw', 'ht', 'hl', 'vw', 'vt', 'vl']) { const a = acc[f], b = r[f]; for (let u = 0; u < a.length; u++) a[u] += b[u]; }
  }

  /**
   * compareRangeHands with optimize=false: every valid pair evaluated on its
   * own (the reference the optimized per-hand paths are tested against).
   * @private
   */
  async _compareRangeHandsUnoptimized(setup, out, progressCallback = null) {
    const { heroHands: H, villainHands: V, heroWeights, villainWeights } = setup;
    const board = this._cardsBitset(setup.boardCards);
    const parse = (hands) => hands.map(h => { const p = this._parseHand(h); return { lo: p.lo, hi: p.hi, ok: !((p.lo & board.lo) | (p.hi & board.hi)), mask: this.getBitMasked(this._handStringToCards(h)) }; });
    const hp = parse(H), vp = parse(V);
    let done = 0;
    for (let i = 0; i < H.length; i++) {
      if (!hp[i].ok) continue;
      const hwi = heroWeights ? heroWeights[i] : 1;
      for (let j = 0; j < V.length; j++) {
        if (!vp[j].ok || (hp[i].lo & vp[j].lo) | (hp[i].hi & vp[j].hi)) continue;
        const vwj = villainWeights ? villainWeights[j] : 1;
        const r = this._evaluateMatchupSync(hp[i].mask, vp[j].mask, setup);
        out.hero.win[i] += r.matchupWin * vwj; out.hero.tie[i] += r.matchupTie * vwj; out.hero.lose[i] += r.matchupLose * vwj;
        out.villain.win[j] += r.matchupLose * hwi; out.villain.tie[j] += r.matchupTie * hwi; out.villain.lose[j] += r.matchupWin * hwi;
        const m = hwi * vwj;
        out.win += r.matchupWin * m; out.tie += r.matchupTie * m; out.lose += r.matchupLose * m;
      }
      if (progressCallback) progressCallback(++done, H.length, `Hero hand ${done}/${H.length}`);
    }
  }

  /**
   * Normalizes a range for compareRange. Each entry is a hand string 'AsKs'
   * (weight 1), a weighted string 'AsKs:0.5' (PioSolver / GTO+ style) or an
   * object { hand: 'AsKs', weight: 0.5 }. Weights must be finite and >= 0;
   * weight 0 drops the hand. Returns { hands, weights } where weights is a
   * Float64Array parallel to hands, or null when every weight is 1.
   * @private
   */
  _normalizeRange(range) {
    const hands = [], w = [];
    let weighted = false;
    for (const entry of range) {
      let hand, weight = 1;
      if (typeof entry === 'string') {
        const i = entry.indexOf(':');
        if (i < 0) hand = entry;
        else { hand = entry.slice(0, i).trim(); weight = Number(entry.slice(i + 1)); }
      } else if (entry && typeof entry === 'object') {
        hand = entry.hand;
        if (entry.weight !== undefined) weight = Number(entry.weight);
      }
      if (typeof hand !== 'string' || hand.length !== 4) throw new Error(`Invalid range entry: ${JSON.stringify(entry)}`);
      if (!Number.isFinite(weight) || weight < 0) throw new Error(`Invalid weight for ${hand}: ${JSON.stringify(entry)}`);
      if (weight === 0) continue;
      if (weight !== 1) weighted = true;
      hands.push(hand); w.push(weight);
    }
    return { hands, weights: weighted ? Float64Array.from(w) : null };
  }

  /**
   * Loads the exact preflop equity table (produced by bench/gen-preflop-table.js).
   * Accepts an ArrayBuffer (browser fetch) or Node Buffer. Enables the preflop
   * fast path in compareRange.
   * @param {ArrayBuffer|Uint8Array|Buffer} buffer
   * @returns {Number} number of canonical matchups loaded
   */
  loadPreflopTable(buffer) {
    const ab = buffer instanceof ArrayBuffer ? buffer : buffer.buffer;
    const off = buffer instanceof ArrayBuffer ? 0 : (buffer.byteOffset || 0);
    const view = new DataView(ab, off, buffer.byteLength !== undefined ? buffer.byteLength : ab.byteLength);
    if (view.getUint32(0, true) !== 0x50464551) throw new Error('invalid preflop table (bad magic)');
    const count = view.getUint32(4, true);
    this._pfTotal = view.getUint32(8, true);
    const win = new Uint32Array(count), tie = new Uint32Array(count);
    // Open-addressing hash (linear probing, load factor <= 0.5): key -> row.
    let bits = 1; while ((1 << bits) < count * 2) bits++;
    const size = 1 << bits, mask = size - 1, shift = 32 - bits;
    const keys = new Uint32Array(size), slot = new Int32Array(size).fill(-1);
    for (let i = 0; i < count; i++) {
      const o = 12 + i * 12, key = view.getUint32(o, true);
      win[i] = view.getUint32(o + 4, true);
      tie[i] = view.getUint32(o + 8, true);
      let h = Math.imul(key, 0x9E3779B1) >>> shift;
      while (slot[h] !== -1) h = (h + 1) & mask;
      keys[h] = key; slot[h] = i;
    }
    this._pfWin = win; this._pfTie = tie;
    this._pfKeys = keys; this._pfSlot = slot; this._pfMask = mask; this._pfShift = shift;
    return count;
  }

  /** Row index of a canonical preflop key in the loaded table, or -1. @private */
  _pfLookup(key) {
    const keys = this._pfKeys, slot = this._pfSlot, mask = this._pfMask;
    let h = Math.imul(key, 0x9E3779B1) >>> this._pfShift;
    for (let i = slot[h]; i !== -1; h = (h + 1) & mask, i = slot[h]) {
      if (keys[h] === key) return i;
    }
    return -1;
  }

  /** Card index (0..51) = rankIndex*4 + suitIndex, for a 2-char card string. @private */
  _cardIndex(card) { return this._N_RANK[card[0]] * 4 + this._N_SUIT[card[1]]; }

  /** Suit-isomorphic canonical key of a hero-vs-villain matchup (card indices). @private */
  _preflopCanonKey(h1, h2, v1, v2) {
    let best = Infinity;
    const S4 = this._S4;
    for (let pi = 0; pi < 24; pi++) {
      const p = S4[pi];
      const mh1 = (h1 & ~3) | p[h1 & 3], mh2 = (h2 & ~3) | p[h2 & 3];
      const mv1 = (v1 & ~3) | p[v1 & 3], mv2 = (v2 & ~3) | p[v2 & 3];
      const a = mh1 < mh2 ? mh1 : mh2, b = mh1 < mh2 ? mh2 : mh1;
      const c = mv1 < mv2 ? mv1 : mv2, d = mv1 < mv2 ? mv2 : mv1;
      const key = ((a * 52 + b) * 52 + c) * 52 + d;
      if (key < best) best = key;
    }
    return best;
  }

  /**
   * Exact preflop range-vs-range via the loaded table: sum each valid (hero,
   * villain) matchup's exact win/tie/lose over all C(48,5) boards.
   * @private
   */
  _compareRangePreflopExact(heroHands, villainHands, heroWeights = null, villainWeights = null, out = null) {
    const total = this._pfTotal;
    const heroC = [], villC = [];
    for (const h of heroHands) heroC.push(this._cardIndex(h.slice(0, 2)), this._cardIndex(h.slice(2, 4)));
    for (const v of villainHands) villC.push(this._cardIndex(v.slice(0, 2)), this._cardIndex(v.slice(2, 4)));
    // The canonical key ((a*52+b)*52+c)*52+d is minimized over the 24 suit
    // permutations; it's lexicographic in (hero part, villain part), so only
    // the permutations that minimize the hero part can win (2 for offsuit or
    // pairs, 6 for suited). Find those once per hero, then minimize the villain
    // part over just them — same key as _preflopCanonKey, ~4-12x less work.
    // The minimizing permutation set depends only on the hero hand's suit
    // pattern (a few dozen distinct sets), so each villain's minimized part is
    // computed once per set (bestVBySet) and every matchup is one array load.
    const S4 = this._S4, pWin = this._pfWin, pTie = this._pfTie;
    const nVill = villC.length >> 1;
    const bestVBySet = new Map();
    let win = 0, tie = 0, lose = 0;
    for (let hi = 0; hi < heroC.length; hi += 2) {
      const h1 = heroC[hi], h2 = heroC[hi + 1];
      let bestH = Infinity, set = 0;
      for (let pi = 0; pi < 24; pi++) {
        const p = S4[pi];
        const m1 = (h1 & ~3) | p[h1 & 3], m2 = (h2 & ~3) | p[h2 & 3];
        const hk = m1 < m2 ? m1 * 52 + m2 : m2 * 52 + m1;
        if (hk > bestH) continue;
        if (hk < bestH) { bestH = hk; set = 0; }
        set |= 1 << pi;
      }
      let bestV = bestVBySet.get(set);
      if (bestV === undefined) {
        bestV = new Int16Array(nVill);
        for (let j = 0; j < nVill; j++) {
          const v1 = villC[j * 2], v2 = villC[j * 2 + 1], b1 = v1 & ~3, s1 = v1 & 3, b2 = v2 & ~3, s2 = v2 & 3;
          let best = 2704;
          for (let pi = 0; pi < 24; pi++) {
            if (!(set & (1 << pi))) continue;
            const p = S4[pi], m1 = b1 | p[s1], m2 = b2 | p[s2];
            const vk = m1 < m2 ? m1 * 52 + m2 : m2 * 52 + m1;
            if (vk < best) best = vk;
          }
          bestV[j] = best;
        }
        bestVBySet.set(set, bestV);
      }
      const hBase = bestH * 2704;
      const hw = heroWeights ? heroWeights[hi >> 1] : 1;
      for (let vi = 0; vi < villC.length; vi += 2) {
        const v1 = villC[vi], v2 = villC[vi + 1];
        if (h1 === v1 || h1 === v2 || h2 === v1 || h2 === v2) continue; // conflicting hole cards
        const idx = this._pfLookup(hBase + bestV[vi >> 1]);
        if (idx < 0) throw new Error('preflop table is missing a matchup (corrupt or incomplete table)');
        const w = pWin[idx], t = pTie[idx];
        if (out) { // per-hand results for compareRangeHands
          const vwj = villainWeights ? villainWeights[vi >> 1] : 1, lz = total - w - t;
          out.hero.win[hi >> 1] += w * vwj; out.hero.tie[hi >> 1] += t * vwj; out.hero.lose[hi >> 1] += lz * vwj;
          out.villain.win[vi >> 1] += lz * hw; out.villain.tie[vi >> 1] += t * hw; out.villain.lose[vi >> 1] += w * hw;
        }
        if (heroWeights || villainWeights) {
          const m = hw * (villainWeights ? villainWeights[vi >> 1] : 1);
          win += w * m; tie += t * m; lose += (total - w - t) * m;
        } else {
          win += w; tie += t; lose += total - w - t;
        }
      }
    }
    return { win, tie, lose };
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
   * Parses a 2-card hand string into card indices (0..51, rank*4+suit) and a
   * split 64-bit card bitset (lo = cards 0..31, hi = cards 32..51) so overlap
   * tests are plain Number ANDs instead of BigInt work.
   * @private
   */
  _parseHand(hand) {
    const a = this._cardIndex(hand), b = this._cardIndex(hand.substring(2, 4));
    const lo = (a < 32 ? 1 << a : 0) | (b < 32 ? 1 << b : 0);
    const hi = (a >= 32 ? 1 << (a - 32) : 0) | (b >= 32 ? 1 << (b - 32) : 0);
    return { a, b, lo, hi };
  }

  /**
   * Card bitset (lo/hi halves) for an array of card strings.
   * @private
   */
  _cardsBitset(cards) {
    let lo = 0, hi = 0;
    for (const c of cards) { const i = this._cardIndex(c); if (i < 32) lo |= 1 << i; else hi |= 1 << (i - 32); }
    return { lo, hi };
  }

  /**
   * Generates all valid matchups between hero and villain hands, excluding overlaps.
   * Each hand is parsed once; the O(H*V) overlap test runs on Number bitsets.
   * @private
   */
  _generateValidMatchups(heroHands, villainHands, boardCards = [], heroWeights = null, villainWeights = null) {
    const valid = [];
    const board = this._cardsBitset(boardCards);
    const nV = villainHands.length;
    const vLo = new Int32Array(nV), vHi = new Int32Array(nV), vOk = new Uint8Array(nV), vMask = new Array(nV);
    for (let j = 0; j < nV; j++) {
      const p = this._parseHand(villainHands[j]);
      vLo[j] = p.lo; vHi[j] = p.hi;
      vOk[j] = ((p.lo & board.lo) | (p.hi & board.hi)) === 0 ? 1 : 0;
      vMask[j] = vOk[j] ? this.getBitMasked(this._handStringToCards(villainHands[j])) : 0n;
    }
    for (let i = 0; i < heroHands.length; i++) {
      const h = heroHands[i], p = this._parseHand(h);
      if ((p.lo & board.lo) | (p.hi & board.hi)) continue;
      const hMask = this.getBitMasked(this._handStringToCards(h));
      const hw = heroWeights ? heroWeights[i] : 1;
      for (let j = 0; j < nV; j++) {
        if (!vOk[j] || (p.lo & vLo[j]) | (p.hi & vHi[j])) continue;
        valid.push({ heroHand: h, villainHand: villainHands[j], heroMask: hMask, villainMask: vMask[j], weight: hw * (villainWeights ? villainWeights[j] : 1) });
      }
    }
    return valid;
  }

  /**
   * Sets up range comparison. The per-pair matchup list is only materialized
   * (lazily, via the `validMatchups` getter) by the paths that need it — the
   * Monte Carlo and unoptimized paths. The exact exhaustive path works straight
   * from the hand strings (see _buildExhaustiveWork).
   * @private
   */
  _compareRangeSetup(heroHands, villainHands, boardCards, deadCards, numberOfBoardCards, iterations, optimize, heroWeights = null, villainWeights = null) {
    // Calculate bitmasks
    const boardMask = this.getBitMasked(boardCards);
    const deadCardsMask = this.getBitMasked([...boardCards, ...deadCards]);

    // Calculate cards to deal and determine if exhaustive enumeration is possible.
    // 0 cards to come (a complete board) is exhaustive too: exactly one runout.
    const numberOfCardsToDeal = numberOfBoardCards - boardCards.length;
    const isExhaustive = numberOfCardsToDeal >= 0 && numberOfCardsToDeal <= 2;

    // For <=2 cards to come the full runout space is tiny (<=1326), so always
    // enumerate it exactly instead of Monte-Carloing a lower requested count.
    // Exhaustive is exact and deterministic; the requested iteration count only
    // matters for larger (>=3 cards to come, e.g. preflop) scenarios.
    // Runouts as suit masks, built from card indices (no BigInt).
    const comboSuits = isExhaustive
      ? this._runoutSuits(this._cardsBitset([...boardCards, ...deadCards]), numberOfCardsToDeal)
      : null;
    if (isExhaustive) iterations = comboSuits.length >> 2;

    const self = this;
    return {
      heroHands,
      villainHands,
      heroWeights,            // Float64Array parallel to heroHands, or null (all 1)
      villainWeights,
      boardMask,
      deadCardsMask,
      iterations,
      isExhaustive,
      comboArray: null,       // BigInt runouts are no longer built; see _comboSuits
      _comboSuits: comboSuits,
      numberOfCardsToDeal,
      boardCards,
      deadCards,
      numberOfBoardCards,
      _validMatchups: null,
      get validMatchups() {
        return this._validMatchups || (this._validMatchups = self._generateValidMatchups(heroHands, villainHands, boardCards, heroWeights, villainWeights));
      }
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
      numberOfCardsToDeal: setup.numberOfCardsToDeal,
      mcTarget: setup.mcTarget
      // Note: validMatchups is not needed in workers; matchups are
      // pre-serialized and sent separately
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
  /**
   * Synchronous single-matchup evaluation (no progress / yielding). Used by the
   * sequential path when there's no progress callback and by the Web Worker,
   * so both run the same tight loop with the RNG state held in a local.
   * @private
   */
  _evaluateMatchupSync(heroMask, villainMask, setup) {
    let win = 0, tie = 0, lose = 0;
    const hs = this._suitsFromBigMask(heroMask), vs = this._suitsFromBigMask(villainMask);
    const bb = setup._boardSuits || (setup._boardSuits = this._suitsFromBigMask(setup.boardMask));
    const hs0 = hs[0], hs1 = hs[1], hs2 = hs[2], hs3 = hs[3];
    const vs0 = vs[0], vs1 = vs[1], vs2 = vs[2], vs3 = vs[3];
    const bb0 = bb[0], bb1 = bb[1], bb2 = bb[2], bb3 = bb[3];

    if (setup.isExhaustive) {
      const comboSuits = setup._comboSuits || (setup._comboSuits = this._buildComboSuits(setup.comboArray));
      const n = comboSuits.length >> 2;
      const m0 = hs0 | vs0, m1 = hs1 | vs1, m2 = hs2 | vs2, m3 = hs3 | vs3;
      for (let i = 0; i < n; i++) {
        const b = i << 2;
        const c0 = comboSuits[b], c1 = comboSuits[b + 1], c2 = comboSuits[b + 2], c3 = comboSuits[b + 3];
        if ((c0 & m0) | (c1 & m1) | (c2 & m2) | (c3 & m3)) continue; // runout uses a hole card
        const d0 = bb0 | c0, d1 = bb1 | c1, d2 = bb2 | c2, d3 = bb3 | c3;
        const hE = this._eval7(hs0 | d0, hs1 | d1, hs2 | d2, hs3 | d3);
        const vE = this._eval7(vs0 | d0, vs1 | d1, vs2 | d2, vs3 | d3);
        if (hE > vE) win++; else if (vE > hE) lose++; else tie++;
      }
      return { matchupWin: win, matchupTie: tie, matchupLose: lose };
    }

    const xorShift = this.xorShift = new XorShift32();
    const pool = this._availableSuitCards(heroMask | villainMask | setup.deadCardsMask), poolLen = pool.length;
    const nDeal = setup.numberOfCardsToDeal;
    const iterations = setup.iterations;
    const mcTarget = setup.mcTarget > 0 ? setup.mcTarget / 100 : 0;
    let ran = iterations, st = xorShift.state;
    for (let i = 0; i < iterations; i++) {
      let d0 = bb0, d1 = bb1, d2 = bb2, d3 = bb3;
      for (let k = 0; k < nDeal; k++) {
        st ^= st << 13; st ^= st >> 17; st ^= st << 5;
        const j = k + Math.abs(st) % (poolLen - k);
        const card = pool[j]; pool[j] = pool[k]; pool[k] = card;
        const bit = card & 0xFFFF, suit = card >> 16;
        if (suit === 0) d0 |= bit; else if (suit === 1) d1 |= bit; else if (suit === 2) d2 |= bit; else d3 |= bit;
      }
      const hE = this._eval7(hs0 | d0, hs1 | d1, hs2 | d2, hs3 | d3);
      const vE = this._eval7(vs0 | d0, vs1 | d1, vs2 | d2, vs3 | d3);
      if (hE > vE) win++; else if (vE > hE) lose++; else tie++;

      // Monte Carlo early-stop check (every 4096 draws, past a warm-up).
      if (mcTarget && (i & 4095) === 4095 && i >= 8191) {
        const n = i + 1, p = (win + tie * 0.5) / n;
        if (1.96 * Math.sqrt(p * (1 - p) / n) < mcTarget) { ran = n; break; }
      }
    }
    xorShift.state = st;

    // If early-stopped, scale counts back to the requested iteration count so
    // every matchup is weighted equally in the aggregate.
    if (ran < iterations && ran > 0) {
      const s = iterations / ran;
      win = Math.round(win * s); tie = Math.round(tie * s); lose = Math.round(lose * s);
    }
    return { matchupWin: win, matchupTie: tie, matchupLose: lose };
  }

  async _evaluateMatchup(heroMask, villainMask, setup, progressCallback = null, matchupIndex = 0, totalMatchups = 1) {
    // No progress reporting: run the tight synchronous loop (no per-iteration
    // yield checks, RNG in a local).
    if (!progressCallback) return this._evaluateMatchupSync(heroMask, villainMask, setup);
    let win = 0, tie = 0, lose = 0;
    const deadMask = heroMask | villainMask | setup.deadCardsMask;

    // Initialize random number generator for Monte Carlo (not needed for exhaustive)
    if (!setup.isExhaustive) {
      this.xorShift = new XorShift32();
    }
    
    // Prepare BigInt-free (Number) representations for the hot loop. The old
    // path built a BigInt board and called the BigInt evaluate() twice per
    // iteration; here cards are four 13-bit suit rank masks and _eval7 does the
    // work with no BigInt and no allocation. The board suit-masks and the combo
    // suit-masks are constant across matchups, so they're computed once and
    // cached on `setup`.
    let iterations = setup.iterations;
    const heroSuits = this._suitsFromBigMask(heroMask);
    const villainSuits = this._suitsFromBigMask(villainMask);
    const boardBaseSuits = setup._boardSuits || (setup._boardSuits = this._suitsFromBigMask(setup.boardMask));
    const hs0 = heroSuits[0], hs1 = heroSuits[1], hs2 = heroSuits[2], hs3 = heroSuits[3];
    const vs0 = villainSuits[0], vs1 = villainSuits[1], vs2 = villainSuits[2], vs3 = villainSuits[3];
    const bb0 = boardBaseSuits[0], bb1 = boardBaseSuits[1], bb2 = boardBaseSuits[2], bb3 = boardBaseSuits[3];

    let comboSuits = null;              // flat Int32Array, 4 entries per combo
    let pool = null, poolLen = 0;       // packed Int32Array of available cards
    const nDeal = setup.numberOfCardsToDeal;
    if (setup.isExhaustive) {
      comboSuits = setup._comboSuits || (setup._comboSuits = this._buildComboSuits(setup.comboArray));
      iterations = comboSuits.length >> 2;
    } else {
      pool = this._availableSuitCards(deadMask);
      poolLen = pool.length;
    }

    // Main evaluation loop - adaptive yielding for UI responsiveness
    const yieldInterval = 5000;
    let lastProgressTime = 0;
    const progressUpdateInterval = 100; // Update progress at most every 100ms

    // Monte Carlo early-stop: stop once this matchup's 95% CI half-width is
    // within the target (lopsided matchups converge fast). Never exceeds the
    // requested iterations; disabled for exact enumeration and when mcTarget<=0.
    const mcTarget = setup.isExhaustive ? 0 : (setup.mcTarget > 0 ? setup.mcTarget / 100 : 0);
    const reqIters = iterations;
    let ran = iterations;

    for (let i = 0; i < iterations; i++) {
      // Build the runout as suit rank-masks: precomputed combo (exhaustive) or
      // a Fisher-Yates draw from the available pool (Monte Carlo).
      let d0, d1, d2, d3, live = true;
      if (comboSuits) {
        const b = i << 2;
        const c0 = comboSuits[b], c1 = comboSuits[b + 1], c2 = comboSuits[b + 2], c3 = comboSuits[b + 3];
        // Skip runouts that use a hole card (impossible deals).
        live = ((c0 & (hs0 | vs0)) | (c1 & (hs1 | vs1)) | (c2 & (hs2 | vs2)) | (c3 & (hs3 | vs3))) === 0;
        d0 = bb0 | c0; d1 = bb1 | c1; d2 = bb2 | c2; d3 = bb3 | c3;
      } else {
        d0 = bb0; d1 = bb1; d2 = bb2; d3 = bb3;
        for (let k = 0; k < nDeal; k++) {
          const j = k + this.xorShift.next(poolLen - k);
          const tmp = pool[k]; pool[k] = pool[j]; pool[j] = tmp;
          const p = pool[k], bit = p & 0xFFFF, suit = p >> 16;
          if (suit === 0) d0 |= bit;
          else if (suit === 1) d1 |= bit;
          else if (suit === 2) d2 |= bit;
          else d3 |= bit;
        }
      }

      if (live) {
        const hE = this._eval7(hs0 | d0, hs1 | d1, hs2 | d2, hs3 | d3);
        const vE = this._eval7(vs0 | d0, vs1 | d1, vs2 | d2, vs3 | d3);
        if (hE > vE) win++;
        else if (vE > hE) lose++;
        else tie++;
      }

      // Monte Carlo early-stop check (every 4096 draws, past a warm-up).
      if (mcTarget && (i & 4095) === 4095 && i >= 8191) {
        const n = i + 1, p = (win + tie * 0.5) / n;
        if (1.96 * Math.sqrt(p * (1 - p) / n) < mcTarget) { ran = n; break; }
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

    // If early-stopped, scale counts back to the requested iteration count so
    // the aggregate (which sums raw counts across matchups) weights every
    // matchup equally regardless of how early it converged.
    if (ran < reqIters && ran > 0) {
      const s = reqIters / ran;
      win = Math.round(win * s); tie = Math.round(tie * s); lose = Math.round(lose * s);
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
      const { heroMask, villainMask, weight } = setup.validMatchups[i];
      const { matchupWin, matchupTie, matchupLose } = await this._evaluateMatchup(heroMask, villainMask, setup, progressCallback, i, total);
      if (weight === 1) { win += matchupWin; tie += matchupTie; lose += matchupLose; }
      else { win += matchupWin * weight; tie += matchupTie * weight; lose += matchupLose * weight; }
      
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
   * Groups the valid (hero, villain) matchups by canonical key pair for the
   * Monte Carlo path. Canonical keys depend only on the hand (and board), so
   * they're computed once per hand string, and pairs are enumerated with Number
   * card bitsets — no per-pair objects or string keys. Each group keeps the
   * first matchup (hero-major order) as its representative. Cached on `setup`.
   * @private
   */
  _groupMonteCarloMatchups(setup) {
    if (setup._mcGroups) return setup._mcGroups;
    const { heroHands, villainHands, boardCards, numberOfBoardCards } = setup;
    const board = this._cardsBitset(boardCards);
    const boardSuitCounts = boardCards.length > 0 ? this._getBoardSuitCounts(boardCards) : null;
    const keyIds = new Map(), keyNames = [];
    const keyId = (hand) => {
      const k = this._getCanonicalKey(hand, boardCards, numberOfBoardCards, boardSuitCounts);
      let id = keyIds.get(k);
      if (id === undefined) { id = keyNames.length; keyIds.set(k, id); keyNames.push(k); }
      return id;
    };
    const parseSide = (hands) => {
      const n = hands.length, lo = new Int32Array(n), hi = new Int32Array(n), id = new Int32Array(n), ok = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        const p = this._parseHand(hands[i]);
        lo[i] = p.lo; hi[i] = p.hi;
        ok[i] = ((p.lo & board.lo) | (p.hi & board.hi)) === 0 ? 1 : 0;
        if (ok[i]) id[i] = keyId(hands[i]);
      }
      return { lo, hi, id, ok, n };
    };
    const H = parseSide(heroHands), V = parseSide(villainHands);
    const nK = keyNames.length;
    const groupOf = new Map(), groups = [];
    for (let h = 0; h < H.n; h++) {
      if (!H.ok[h]) continue;
      const hl = H.lo[h], hh = H.hi[h], hk = H.id[h] * nK;
      for (let v = 0; v < V.n; v++) {
        if (!V.ok[v] || (hl & V.lo[v]) | (hh & V.hi[v])) continue;
        const gk = hk + V.id[v];
        let g = groupOf.get(gk);
        if (g === undefined) {
          const heroHand = heroHands[h], villainHand = villainHands[v];
          const heroKey = keyNames[H.id[h]], villainKey = keyNames[V.id[v]];
          g = {
            key: `${heroKey}:${villainKey}`, validCount: 0, heroKey, villainKey, heroHand, villainHand,
            heroMask: this.getBitMasked(this._handStringToCards(heroHand)),
            villainMask: this.getBitMasked(this._handStringToCards(villainHand))
          };
          groupOf.set(gk, g); groups.push(g);
        }
        g.validCount += (setup.heroWeights ? setup.heroWeights[h] : 1) * (setup.villainWeights ? setup.villainWeights[v] : 1);
      }
    }
    return (setup._mcGroups = groups);
  }

  /**
   * Compares ranges with canonical key caching optimization (sequential version).
   * @private
   */
  async _compareRangeOptimizedSequential(setup, progressCallback = null, progressInterval = 100) {
    let win = 0, tie = 0, lose = 0;
    let lastProgressTime = 0;
    const progressUpdateInterval = 100; // Update progress at most every 100ms
    
    // Monte Carlo (>=3 cards to come): canonical grouping + independent
    // per-matchup sampling (each matchup deals its own boards, so runouts can't
    // be shared). Grouping only pays off here, where a matchup is expensive.
    if (!setup.isExhaustive) {
      const groups = this._groupMonteCarloMatchups(setup);
      const totalMatchups = groups.length;
      let matchupIndex = 0;
      for (const group of groups) {
        const validCount = group.validCount;
        const validPair = group;
        const { matchupWin, matchupTie, matchupLose } = await this._evaluateMatchup(
          validPair.heroMask, validPair.villainMask, setup, progressCallback, matchupIndex, totalMatchups
        );
        win += matchupWin * validCount;
        tie += matchupTie * validCount;
        lose += matchupLose * validCount;
        matchupIndex++;
        if (progressCallback && matchupIndex % progressInterval === 0) {
          const now = Date.now();
          const shouldUpdateProgress = now - lastProgressTime >= progressUpdateInterval;
          if (typeof scheduler !== 'undefined' && scheduler.postTask) {
            await scheduler.postTask(() => { if (shouldUpdateProgress) { progressCallback(matchupIndex, totalMatchups, `Evaluating ${matchupIndex}`); lastProgressTime = now; } }, { priority: 'user-blocking' });
          } else if (typeof requestIdleCallback !== 'undefined') {
            await new Promise(resolve => { requestIdleCallback(() => { if (shouldUpdateProgress) { progressCallback(matchupIndex, totalMatchups, `Evaluating ${matchupIndex}`); lastProgressTime = now; } resolve(); }, { timeout: 1 }); });
          } else {
            await new Promise(resolve => setTimeout(resolve, 0));
            if (shouldUpdateProgress) { progressCallback(matchupIndex, totalMatchups, `Evaluating ${matchupIndex}`); lastProgressTime = now; }
          }
        }
      }
      if (progressCallback) progressCallback(matchupIndex, matchupIndex, 'Complete');
      return { win, tie, lose };
    }

    // Exhaustive: EXACT evaluate-once. Build the shared work structure and run
    // the kernel over all runouts (on the main thread for both the worker and
    // non-worker paths, so they agree byte-for-byte).
    const work = this._buildExhaustiveWork(setup);
    const comboSuits = setup._comboSuits || (setup._comboSuits = this._buildComboSuits(setup.comboArray));
    const nRun = comboSuits.length >> 2;
    const r = this._runExhaustive(work, comboSuits, 0, nRun);
    if (progressCallback) progressCallback(nRun, nRun, 'Complete');
    return r;
  }

  /**
   * Builds the reusable per-run work for the exact exhaustive kernel straight
   * from the hand strings (no per-pair objects, no BigInt). Hands are
   * deduplicated into a UNION of hero+villain concrete hands — each evaluated
   * once per runout even when it appears in both ranges — with per-hand hero
   * and villain multiplicities, so duplicates count exactly as they do in the
   * per-pair unoptimized computation. Small fields get an explicit valid-pair
   * list; large fields are resolved by the counting sweep in _runExhaustive.
   * Everything is typed arrays so it could be shipped to workers unchanged.
   * @private
   */
  _buildExhaustiveWork(setup) {
    const board = this._cardsBitset(setup.boardCards);
    const uIndex = new Int32Array(52 * 52).fill(-1);
    const uSuitArr = [], uAArr = [], uBArr = [], uLoArr = [], uHiArr = [];
    const addSide = (hands, weights) => {
      const u = [], wt = [], entryU = new Int32Array(hands.length).fill(-1);
      for (let i = 0; i < hands.length; i++) {
        const hand = hands[i], p = this._parseHand(hand);
        if ((p.lo & board.lo) | (p.hi & board.hi)) continue; // conflicts with board
        const key = p.a < p.b ? p.a * 52 + p.b : p.b * 52 + p.a;
        let ui = uIndex[key];
        if (ui < 0) {
          ui = uIndex[key] = uAArr.length;
          const s = this._suitsOfCards([hand.substring(0, 2), hand.substring(2, 4)]);
          uSuitArr.push(s[0], s[1], s[2], s[3]);
          uAArr.push(p.a); uBArr.push(p.b); uLoArr.push(p.lo); uHiArr.push(p.hi);
        }
        u.push(ui); wt.push(weights ? weights[i] : 1); entryU[i] = ui;
      }
      return { u, wt, entryU };
    };
    const heroSide = addSide(setup.heroHands, setup.heroWeights);
    const villSide = addSide(setup.villainHands, setup.villainWeights);
    const heroU = heroSide.u, villU = villSide.u;
    const weighted = !!(setup.heroWeights || setup.villainWeights);
    const U = uAArr.length;
    const uSuit = Int32Array.from(uSuitArr), uA = Int32Array.from(uAArr), uB = Int32Array.from(uBArr);
    // Per unique hand: total hero / villain weight (= multiplicity when
    // unweighted; integer-valued doubles keep that path exact).
    const hMult = new Float64Array(U), vMult = new Float64Array(U);
    for (let i = 0; i < heroU.length; i++) hMult[heroU[i]] += heroSide.wt[i];
    for (let i = 0; i < villU.length; i++) vMult[villU[i]] += villSide.wt[i];
    const nH = heroU.length, nV = villU.length;
    const bb = setup._boardSuits || (setup._boardSuits = this._suitsFromBigMask(setup.boardMask));

    // cardU[cardUOff[c]..cardUOff[c+1]) = union hands holding card c, used to
    // drop hands whose hole cards appear in a runout (that deal is impossible).
    const cardUOff = new Int32Array(53);
    for (let u = 0; u < U; u++) { cardUOff[uA[u] + 1]++; cardUOff[uB[u] + 1]++; }
    for (let c = 0; c < 52; c++) cardUOff[c + 1] += cardUOff[c];
    const cardU = new Int32Array(U * 2), cfill = cardUOff.slice(0, 52);
    // Rank-pair class (0..168) per unique hand, for evaluation reuse (_evalRunout).
    const uCls = new Int32Array(U);
    for (let u = 0; u < U; u++) { const ra = uA[u] >> 2, rb = uB[u] >> 2; uCls[u] = ra > rb ? ra * 13 + rb : rb * 13 + ra; }
    for (let u = 0; u < U; u++) { cardU[cfill[uA[u]]++] = u; cardU[cfill[uB[u]]++] = u; }

    const perHand = !!setup.perHand;
    const useCount = nH >= 16 && nV >= 16;
    let pHa = null, pVa = null, pW = null, P = 0, cardTotal = null, cardTotalH = null;
    if (perHand && !useCount) {
      // Per-hand, small field: direct comparison over UNIQUE hand pairs (the
      // per-hand kernel applies hMult / vMult itself).
      const ph = [], pv = [];
      for (let h = 0; h < U; h++) {
        if (!hMult[h]) continue;
        for (let v = 0; v < U; v++) {
          if (!vMult[v] || (uLoArr[h] & uLoArr[v]) | (uHiArr[h] & uHiArr[v])) continue;
          ph.push(h); pv.push(v);
        }
      }
      pHa = Int32Array.from(ph); pVa = Int32Array.from(pv); P = pHa.length;
    }
    if (perHand && useCount) {
      // cardTotalH[c] = total hero weight holding card c (for villain-side counts).
      cardTotalH = new Float64Array(52);
      for (let u = 0; u < U; u++) { cardTotalH[uA[u]] += hMult[u]; cardTotalH[uB[u]] += hMult[u]; }
    }
    if (useCount) {
      // cardTotal[c] = total villain weight holding card c.
      cardTotal = new Float64Array(52);
      for (let u = 0; u < U; u++) { cardTotal[uA[u]] += vMult[u]; cardTotal[uB[u]] += vMult[u]; }
    } else if (!perHand) {
      const ph = [], pv = [], pw = [];
      for (let i = 0; i < heroU.length; i++) {
        const h = heroU[i], hl = uLoArr[h], hh = uHiArr[h];
        for (let j = 0; j < villU.length; j++) {
          const v = villU[j];
          if ((hl & uLoArr[v]) | (hh & uHiArr[v])) continue;
          ph.push(h); pv.push(v);
          if (weighted) pw.push(heroSide.wt[i] * villSide.wt[j]);
        }
      }
      pHa = Int32Array.from(ph); pVa = Int32Array.from(pv); P = pHa.length;
      if (weighted) pW = Float64Array.from(pw);
    }
    return {
      uSuit, uA, uB, hMult, vMult, U, nH, nV, useCount, pHa, pVa, pW, P, cardTotal, cardUOff, cardU,
      perHand, cardTotalH, uCls,
      heroEntryU: perHand ? heroSide.entryU : null, villEntryU: perHand ? villSide.entryU : null,
      bb0: bb[0], bb1: bb[1], bb2: bb[2], bb3: bb[3]
    };
  }

  /** Per-call scratch buffers for _evalRunout. @private */
  _runoutScratch(U) {
    return {
      clsVal: new Int32Array(169), clsStamp: new Int32Array(169).fill(-1), head: new Int32Array(169),
      next: new Int32Array(U), itemVal: new Int32Array(169 + U), itemRef: new Int32Array(169 + U),
      t1: new Int32Array(169 + U), t2: new Int32Array(169 + U), cnt: new Int32Array(3 * 257)
    };
  }

  /**
   * Scores every live hand (dead[u] !== i) for runout i (suit masks at
   * comboSuits[b..b+3]) into uVals, evaluating as few hands as possible:
   * the 5 community cards have at most one suit S with M >= 3 cards, and a
   * hand that can't reach 5 of S scores the same as every hand with the same
   * two ranks (the evaluator's non-flush result depends only on rank
   * multiplicities), so it reuses its rank class's value for this runout.
   * Only flush-capable hands and one hand per class are evaluated (~100-300
   * instead of ~1,200 for a full range).
   *
   * With `order`, also writes the live hands into order[0..L) sorted by value
   * (equal values adjacent) and returns L: it radix-sorts one item per class
   * plus one per flush-capable hand, then expands classes into their hands.
   * @private
   */
  _evalRunout(work, comboSuits, b, i, dead, uVals, sc, order) {
    const { uSuit, uA, uB, uCls, U, bb0, bb1, bb2, bb3 } = work;
    const d0 = bb0 | comboSuits[b], d1 = bb1 | comboSuits[b + 1], d2 = bb2 | comboSuits[b + 2], d3 = bb3 | comboSuits[b + 3];
    const P = this._POPC13;
    let S = -1, M = 0;
    { const c0 = P[d0], c1 = P[d1], c2 = P[d2], c3 = P[d3];
      if (c0 >= 3) { S = 0; M = c0; } else if (c1 >= 3) { S = 1; M = c1; } else if (c2 >= 3) { S = 2; M = c2; } else if (c3 >= 3) { S = 3; M = c3; } }
    const need = 5 - M; // a hand with >= need cards of suit S is flush-capable (S >= 0)
    const { clsVal, clsStamp, head, next, itemVal, itemRef } = sc;
    let n = 0;
    for (let u = 0; u < U; u++) {
      if (dead[u] === i) continue;
      if (S >= 0 && ((uA[u] & 3) === S) + ((uB[u] & 3) === S) >= need) {
        const q = u << 2;
        const v = uVals[u] = this._eval7(uSuit[q] | d0, uSuit[q + 1] | d1, uSuit[q + 2] | d2, uSuit[q + 3] | d3);
        if (order) { itemVal[n] = v; itemRef[n++] = 169 + u; }
        continue;
      }
      const cl = uCls[u];
      if (clsStamp[cl] !== i) {
        const q = u << 2;
        const v = clsVal[cl] = this._eval7(uSuit[q] | d0, uSuit[q + 1] | d1, uSuit[q + 2] | d2, uSuit[q + 3] | d3);
        clsStamp[cl] = i;
        if (order) { head[cl] = -1; itemVal[n] = v; itemRef[n++] = cl; }
      }
      uVals[u] = clsVal[cl];
      if (order) { next[u] = head[cl]; head[cl] = u; }
    }
    if (!order) return 0;

    // LSD radix sort of the n items by value (< 2^24: 3 x 8 bits), then expand.
    const { t1, t2, cnt } = sc;
    cnt.fill(0);
    for (let k = 0; k < n; k++) { const v = itemVal[k]; cnt[(v & 255) + 1]++; cnt[257 + ((v >> 8) & 255) + 1]++; cnt[514 + ((v >> 16) & 255) + 1]++; }
    for (let o = 0; o < 771; o += 257) for (let r = 0; r < 256; r++) cnt[o + r + 1] += cnt[o + r];
    for (let k = 0; k < n; k++) t1[cnt[itemVal[k] & 255]++] = k;
    for (let j = 0; j < n; j++) { const k = t1[j]; t2[cnt[257 + ((itemVal[k] >> 8) & 255)]++] = k; }
    for (let j = 0; j < n; j++) { const k = t2[j]; t1[cnt[514 + ((itemVal[k] >> 16) & 255)]++] = k; }
    let L = 0;
    for (let j = 0; j < n; j++) {
      const ref = itemRef[t1[j]];
      if (ref >= 169) order[L++] = ref - 169;
      else for (let u = head[ref]; u >= 0; u = next[u]) order[L++] = u;
    }
    return L;
  }

  /**
   * Exact exhaustive kernel over runouts [runStart, runEnd). Hands holding a
   * card dealt in the runout are dropped for that runout; every other unique
   * concrete hand is evaluated once. Matchups are then resolved by direct
   * comparison (small fields) or, for large fields, a radix sort of the live
   * hands by value followed by a linear sweep over equal-value groups that
   * keeps running villain counts in total and per hole card (to subtract
   * villains sharing a card with the hero). Byte-identical to unoptimized.
   * `comboSuits` holds 4 suit rank masks per runout (any number of cards).
   * @private
   */
  _runExhaustive(work, comboSuits, runStart, runEnd) {
    const { uSuit, uA, uB, hMult, vMult, U, useCount, pHa, pVa, pW, P, cardTotal, cardUOff, cardU, bb0, bb1, bb2, bb3 } = work;
    // Total villain weight (= villain entry count when unweighted).
    let nV = 0; for (let u = 0; u < U; u++) nV += vMult[u];
    // Counting by subtraction leaves floating-point residue with fractional
    // weights: a hero blocked by every villain can come out as +/-1e-15
    // instead of 0. A genuine per-hero count is a sum of villain weights, so
    // it is 0 or at least the smallest villain weight; anything below half of
    // that (negatives included) is residue and is snapped to exactly 0.
    // Unweighted counts are whole numbers, so they are never changed.
    let snap = Infinity;
    for (let u = 0; u < U; u++) { const m = vMult[u]; if (m > 0 && m < snap) snap = m; }
    snap = snap === Infinity ? 0 : snap * 0.5;
    const uVals = new Int32Array(U);
    // dead[u] === i  <=>  hand u holds a card dealt in runout i, so it takes no
    // part in that runout (neither as hero nor as villain).
    const dead = new Int32Array(U).fill(-1);
    const cardTot = useCount ? new Float64Array(52) : null;
    let win = 0, tie = 0, lose = 0;

    // Scratch: runout evaluation / ordering buffers, and (large fields) the
    // per-card villain counts strictly below / equal to the current value.
    const sc = this._runoutScratch(U);
    const order = useCount ? new Int32Array(U) : null;
    const lessC = useCount ? new Float64Array(52) : null;
    const eqC = useCount ? new Float64Array(52) : null;

    for (let i = runStart; i < runEnd; i++) {
      const b = i << 2;

      // Mark hands holding a runout card; for counting, also remove those
      // villains from the field total and the per-card totals.
      let nVi = nV;
      if (useCount) cardTot.set(cardTotal);
      for (let s = 0; s < 4; s++) {
        let m = comboSuits[b + s];
        while (m) {
          const low = m & -m; m ^= low;
          const c = (31 - Math.clz32(low)) * 4 + s;
          for (let k = cardUOff[c], e = cardUOff[c + 1]; k < e; k++) {
            const u = cardU[k];
            if (dead[u] === i) continue;
            dead[u] = i;
            if (useCount) { const vm = vMult[u]; if (vm) { nVi -= vm; cardTot[uA[u]] -= vm; cardTot[uB[u]] -= vm; } }
          }
        }
      }

      if (!useCount) {
        this._evalRunout(work, comboSuits, b, i, dead, uVals, sc, null);
        for (let p = 0; p < P; p++) {
          const hu = pHa[p], vu = pVa[p];
          if (dead[hu] === i || dead[vu] === i) continue;
          const hv = uVals[hu], vv = uVals[vu];
          if (pW) { const m = pW[p]; if (hv > vv) win += m; else if (vv > hv) lose += m; else tie += m; }
          else if (hv > vv) win++; else if (vv > hv) lose++; else tie++;
        }
        continue;
      }

      // Live hands sorted by value (equal values adjacent).
      const L = this._evalRunout(work, comboSuits, b, i, dead, uVals, sc, order);
      lessC.fill(0);

      let below = 0; // villain entries with value < current group value
      for (let g = 0; g < L;) {
        const x = uVals[order[g]];
        let e = g + 1; while (e < L && uVals[order[e]] === x) e++;
        // Villain counts at exactly x: total and per card.
        let eqTotal = 0;
        for (let k = g; k < e; k++) { const u = order[k], m = vMult[u]; if (m) { eqTotal += m; eqC[uA[u]] += m; eqC[uB[u]] += m; } }
        const above = nVi - below - eqTotal;
        // Heroes at x. A villain holding both hero cards (the identical hand)
        // is subtracted on each card, so add it back once (it ties at x).
        for (let k = g; k < e; k++) {
          const u = order[k], m = hMult[u];
          if (!m) continue;
          const a = uA[u], c = uB[u];
          let w = below - lessC[a] - lessC[c];
          let t = eqTotal - eqC[a] - eqC[c] + vMult[u];
          let l = above - (cardTot[a] - lessC[a] - eqC[a]) - (cardTot[c] - lessC[c] - eqC[c]);
          if (w < snap) w = 0;
          if (t < snap) t = 0;
          if (l < snap) l = 0;
          win += w * m; tie += t * m; lose += l * m;
        }
        // Fold this group into the running "below" counts.
        for (let k = g; k < e; k++) { const u = order[k], m = vMult[u]; if (m) { lessC[uA[u]] += m; lessC[uB[u]] += m; eqC[uA[u]] = 0; eqC[uB[u]] = 0; } }
        below += eqTotal;
        g = e;
      }
    }
    return { win, tie, lose };
  }

  /**
   * Per-hand kernel for small fields: compares the unique hand pairs directly
   * (no subtraction, so no residue), mirroring _runExhaustive's direct path.
   * @private
   */
  _runExhaustiveHandsDirect(work, comboSuits, runStart, runEnd) {
    const { uSuit, hMult, vMult, U, pHa, pVa, P, cardUOff, cardU, bb0, bb1, bb2, bb3 } = work;
    const hw = new Float64Array(U), ht = new Float64Array(U), hl = new Float64Array(U);
    const vw = new Float64Array(U), vt = new Float64Array(U), vl = new Float64Array(U);
    const uVals = new Int32Array(U), dead = new Int32Array(U).fill(-1), sc = this._runoutScratch(U);
    let win = 0, tie = 0, lose = 0;
    for (let i = runStart; i < runEnd; i++) {
      const b = i << 2;
      for (let s = 0; s < 4; s++) {
        let m = comboSuits[b + s];
        while (m) {
          const low = m & -m; m ^= low;
          const c = (31 - Math.clz32(low)) * 4 + s;
          for (let k = cardUOff[c], e = cardUOff[c + 1]; k < e; k++) dead[cardU[k]] = i;
        }
      }
      this._evalRunout(work, comboSuits, b, i, dead, uVals, sc, null);
      for (let p = 0; p < P; p++) {
        const hu = pHa[p], vu = pVa[p];
        if (dead[hu] === i || dead[vu] === i) continue;
        const hv = uVals[hu], vv = uVals[vu], hm = hMult[hu], vm = vMult[vu];
        if (hv > vv) { hw[hu] += vm; vl[vu] += hm; win += hm * vm; }
        else if (vv > hv) { hl[hu] += vm; vw[vu] += hm; lose += hm * vm; }
        else { ht[hu] += vm; vt[vu] += hm; tie += hm * vm; }
      }
    }
    return { win, tie, lose, hw, ht, hl, vw, vt, vl };
  }

  /**
   * Per-hand variant of _runExhaustive for compareRangeHands (counting sweep
   * only). One pass gives, for every unique hand u, its results as a hero
   * against the villain range (hw/ht/hl, weighted by villain weights) and as a
   * villain against the hero range (vw/vt/vl, weighted by hero weights), using
   * running counts for both sides, plus the weighted totals. Kept separate so
   * compareRange's kernel is untouched.
   * @private
   */
  _runExhaustiveHands(work, comboSuits, runStart, runEnd) {
    if (!work.useCount) return this._runExhaustiveHandsDirect(work, comboSuits, runStart, runEnd);
    const { uSuit, uA, uB, hMult, vMult, U, cardTotal, cardTotalH, cardUOff, cardU, bb0, bb1, bb2, bb3 } = work;
    let nV = 0, nH = 0, snapV = Infinity, snapH = Infinity;
    for (let u = 0; u < U; u++) {
      const vm = vMult[u], hm = hMult[u];
      nV += vm; nH += hm;
      if (vm > 0 && vm < snapV) snapV = vm;
      if (hm > 0 && hm < snapH) snapH = hm;
    }
    // Residue snapping as in _runExhaustive, per side.
    snapV = snapV === Infinity ? 0 : snapV * 0.5;
    snapH = snapH === Infinity ? 0 : snapH * 0.5;
    const hw = new Float64Array(U), ht = new Float64Array(U), hl = new Float64Array(U);
    const vw = new Float64Array(U), vt = new Float64Array(U), vl = new Float64Array(U);
    const uVals = new Int32Array(U), dead = new Int32Array(U).fill(-1);
    const cardTotV = new Float64Array(52), cardTotH = new Float64Array(52);
    const order = new Int32Array(U), sc = this._runoutScratch(U);
    const lessV = new Float64Array(52), eqV = new Float64Array(52), lessH = new Float64Array(52), eqH = new Float64Array(52);
    let win = 0, tie = 0, lose = 0;

    for (let i = runStart; i < runEnd; i++) {
      const b = i << 2;
      // Hands holding a runout card sit this runout out, on both sides.
      let nVi = nV, nHi = nH;
      cardTotV.set(cardTotal); cardTotH.set(cardTotalH);
      for (let s = 0; s < 4; s++) {
        let m = comboSuits[b + s];
        while (m) {
          const low = m & -m; m ^= low;
          const c = (31 - Math.clz32(low)) * 4 + s;
          for (let k = cardUOff[c], e = cardUOff[c + 1]; k < e; k++) {
            const u = cardU[k];
            if (dead[u] === i) continue;
            dead[u] = i;
            const vm = vMult[u], hm = hMult[u];
            if (vm) { nVi -= vm; cardTotV[uA[u]] -= vm; cardTotV[uB[u]] -= vm; }
            if (hm) { nHi -= hm; cardTotH[uA[u]] -= hm; cardTotH[uB[u]] -= hm; }
          }
        }
      }

      const L = this._evalRunout(work, comboSuits, b, i, dead, uVals, sc, order);
      lessV.fill(0); lessH.fill(0);

      let belowV = 0, belowH = 0; // villain / hero weight strictly below the current value
      for (let g = 0; g < L;) {
        const x = uVals[order[g]];
        let e = g + 1; while (e < L && uVals[order[e]] === x) e++;
        let eqTotV = 0, eqTotH = 0;
        for (let k = g; k < e; k++) {
          const u = order[k], vm = vMult[u], hm = hMult[u];
          if (vm) { eqTotV += vm; eqV[uA[u]] += vm; eqV[uB[u]] += vm; }
          if (hm) { eqTotH += hm; eqH[uA[u]] += hm; eqH[uB[u]] += hm; }
        }
        const aboveV = nVi - belowV - eqTotV, aboveH = nHi - belowH - eqTotH;
        for (let k = g; k < e; k++) {
          const u = order[k], a = uA[u], c = uB[u], hm = hMult[u], vm = vMult[u];
          if (hm) { // u as a hero, against the villain range
            let w = belowV - lessV[a] - lessV[c];
            let t = eqTotV - eqV[a] - eqV[c] + vm;
            let l = aboveV - (cardTotV[a] - lessV[a] - eqV[a]) - (cardTotV[c] - lessV[c] - eqV[c]);
            if (w < snapV) w = 0;
            if (t < snapV) t = 0;
            if (l < snapV) l = 0;
            hw[u] += w; ht[u] += t; hl[u] += l;
            win += w * hm; tie += t * hm; lose += l * hm;
          }
          if (vm) { // u as a villain, against the hero range
            let w = belowH - lessH[a] - lessH[c];
            let t = eqTotH - eqH[a] - eqH[c] + hm;
            let l = aboveH - (cardTotH[a] - lessH[a] - eqH[a]) - (cardTotH[c] - lessH[c] - eqH[c]);
            if (w < snapH) w = 0;
            if (t < snapH) t = 0;
            if (l < snapH) l = 0;
            vw[u] += w; vt[u] += t; vl[u] += l;
          }
        }
        for (let k = g; k < e; k++) {
          const u = order[k], a = uA[u], c = uB[u], vm = vMult[u], hm = hMult[u];
          if (vm) { lessV[a] += vm; lessV[c] += vm; }
          if (hm) { lessH[a] += hm; lessH[c] += hm; }
          eqV[a] = 0; eqV[c] = 0; eqH[a] = 0; eqH[c] = 0;
        }
        belowV += eqTotV; belowH += eqTotH;
        g = e;
      }
    }
    return { win, tie, lose, hw, ht, hl, vw, vt, vl };
  }

  /**
   * Compares ranges with canonical key caching optimization.
   * Supports Web Workers for parallelization when enabled.
   * @private
   */
  async _compareRangeOptimized(setup, progressCallback = null, progressInterval = 100, useWorkers = true) {
    // Exhaustive (flop/turn): the EXACT kernel. Large jobs are split by runout
    // across the worker pool (the work is a few small typed arrays, cheap to
    // post); small ones stay on the main thread where they're faster than the
    // messaging. Totals are integer sums, so both agree byte-for-byte.
    if (setup.isExhaustive) {
      if (useWorkers && typeof Worker !== 'undefined') {
        const work = this._buildExhaustiveWork(setup);
        const comboSuits = setup._comboSuits;
        const nRun = comboSuits.length >> 2;
        if (work.U * nRun >= this._EXACT_WORKER_THRESHOLD) {
          const nw = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
          // Runouts cost about the same, so one chunk per worker (fewer posts).
          const chunk = Math.max(1, Math.ceil(nRun / nw));
          let next = 0, done = 0, win = 0, tie = 0, lose = 0;
          await this._runKernelBatches(work,
            () => { if (next >= nRun) return null; const a = next; next = Math.min(nRun, next + chunk); return comboSuits.slice(a * 4, next * 4); },
            (r, n) => { win += r.win; tie += r.tie; lose += r.lose; done += n; if (progressCallback) progressCallback(done, nRun, `Evaluating runouts ${done}/${nRun}`); },
            true, progressCallback);
          if (progressCallback) progressCallback(nRun, nRun, 'Complete');
          return { win, tie, lose };
        }
      }
      return await this._compareRangeOptimizedSequential(setup, progressCallback, progressInterval);
    }

    // Opt-in shared-board Monte Carlo.
    if (this.mcSharedBoards) {
      return await this._compareRangeSharedBoards(setup, progressCallback, useWorkers);
    }

    // Group validMatchups by canonical key pair (only matchups that exist).
    const matchupsToEvaluate = this._groupMonteCarloMatchups(setup);
    const totalMatchups = matchupsToEvaluate.length;

    // Check if workers should be used
    const shouldUseWorkers = useWorkers &&
                             typeof Worker !== 'undefined' &&
                             totalMatchups >= 4;
    let workers = null;
    if (shouldUseWorkers) {
      const numWorkers = Math.min((typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4, totalMatchups);
      // Persistent pool (created once, reused across calls). Creation can throw
      // synchronously (e.g. a cross-origin worker URL); fall back to sequential.
      try { workers = this._acquireWorkers(numWorkers); } catch (e) { workers = null; }
    }
    if (!workers || workers.length === 0) {
      return await this._compareRangeOptimizedSequential(setup, progressCallback, progressInterval);
    }
    const numWorkers = workers.length;

    // Dynamic dispatch: hand out small chunks to whichever worker is free.
    // With Monte Carlo early-stop, matchup cost varies a lot (lopsided matchups
    // converge in ~8k draws, close ones run the full count), so equal static
    // batches left most workers idle behind the slowest one.
    const chunkSize = Math.max(1, Math.ceil(totalMatchups / (numWorkers * 8)));
    const serializedSetup = this._serializeSetup(setup);
    let next = 0, completedMatchups = 0, win = 0, tie = 0, lose = 0, alive = numWorkers;
    const addResult = (r) => {
      win += r.matchupWin * r.validCount; tie += r.matchupTie * r.validCount; lose += r.matchupLose * r.validCount;
      completedMatchups++;
    };

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

    // Each worker loop pulls the next chunk until none are left. A worker that
    // crashes is dropped from the pool and its in-flight chunk is evaluated on
    // the main thread, so one bad worker never loses work or fails the call.
    const runWorker = (worker, workerId) => new Promise((resolve, reject) => {
      let current = null;
      const cleanup = () => { worker.onmessage = null; worker.onerror = null; };
      const dispatch = () => {
        if (next >= totalMatchups) { cleanup(); resolve(); return; }
        const start = next; next = Math.min(totalMatchups, next + chunkSize);
        current = matchupsToEvaluate.slice(start, next);
        worker.postMessage({ matchups: current.map(m => this._serializeMatchup(m)), setupData: serializedSetup, workerId });
      };
      // One handler set per call; cleared on settle so the pooled worker is
      // clean for the next call. (Assumes compareRange calls don't overlap.)
      worker.onmessage = (e) => {
        if (!e.data.success) { cleanup(); reject(new Error(e.data.error || 'Worker error')); return; }
        for (const r of e.data.results) addResult(r);
        current = null;
        dispatch();
      };
      worker.onerror = (error) => {
        if (error && error.preventDefault) error.preventDefault();
        cleanup();
        this._discardWorker(worker);
        try {
          if (current) for (const m of current) addResult({ validCount: m.validCount, ...this._evaluateMatchupSync(m.heroMask, m.villainMask, setup) });
          current = null;
          // Last worker of this call died: finish the remaining chunks here.
          if (--alive === 0) {
            while (next < totalMatchups) { const m = matchupsToEvaluate[next++]; addResult({ validCount: m.validCount, ...this._evaluateMatchupSync(m.heroMask, m.villainMask, setup) }); }
          }
          resolve();
        } catch (err) { reject(err); }
      };
      dispatch();
    });

    try {
      await Promise.all(workers.map((w, i) => runWorker(w, i)));
    } finally {
      if (progressIntervalId) clearInterval(progressIntervalId);
      // Workers are NOT terminated - they stay in the pool for the next call.
      // Callers can free them explicitly with terminateWorkerPool().
      if (progressCallback) progressCallback(totalMatchups, totalMatchups, 'Complete');
    }

    return { win, tie, lose };
  }

  /**
   * Runs the exact kernel (_runExhaustive) over batches of runouts — on the
   * worker pool when allowed and available, otherwise on the main thread.
   * `nextBatch()` returns an Int32Array of runouts (4 suit masks each) or null
   * when there's nothing more to do (it may stop early); `onResult(r, n)` gets
   * each batch's { win, tie, lose } and its runout count. Batches are handed
   * out to whichever worker is free; a worker that fails is dropped and its
   * batch (and, if none are left, the rest) runs on the main thread.
   * @private
   */
  async _runKernelBatches(work, nextBatch, onResult, useWorkers, progressCallback = null) {
    const kernel = work.perHand ? this._runExhaustiveHands : this._runExhaustive;
    const runLocal = (b) => onResult(kernel.call(this, work, b, 0, b.length >> 2), b.length >> 2);
    let workers = null;
    if (useWorkers && typeof Worker !== 'undefined') {
      const n = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
      try { workers = this._acquireWorkers(n); } catch (e) { workers = null; }
    }
    if (!workers || workers.length === 0) {
      let b;
      while ((b = nextBatch())) {
        runLocal(b);
        // Keep the page responsive between batches when someone is watching.
        if (progressCallback) await new Promise(resolve => setTimeout(resolve, 0));
      }
      return;
    }
    let alive = workers.length;
    await Promise.all(workers.map((worker) => new Promise((resolve, reject) => {
      let current = null;
      const cleanup = () => { worker.onmessage = null; worker.onerror = null; };
      const dispatch = () => {
        current = nextBatch();
        if (!current) { cleanup(); resolve(); return; }
        worker.postMessage({ type: 'kernel', work, boards: current });
      };
      worker.onmessage = (e) => {
        if (!e.data.success) { cleanup(); reject(new Error(e.data.error || 'Worker error')); return; }
        onResult(e.data.result, current.length >> 2);
        dispatch();
      };
      worker.onerror = (error) => {
        if (error && error.preventDefault) error.preventDefault();
        cleanup();
        this._discardWorker(worker);
        try {
          if (current) runLocal(current);
          if (--alive === 0) { let b; while ((b = nextBatch())) runLocal(b); }
          resolve();
        } catch (err) { reject(err); }
      };
      dispatch();
    })));
  }

  /**
   * Opt-in Monte Carlo (bitval.mcSharedBoards = true): sample boards once from
   * the live deck and run the exact kernel over them, so every hand is
   * evaluated once per board and ALL valid pairs are counted on every board.
   * Hands that collide with a sampled board sit that board out, which is
   * exactly conditional sampling per matchup, so the equity is unbiased (and
   * there's no canonical grouping). `iterations` caps the number of boards;
   * sampling stops early once the batch-means 95% CI half-width of the
   * aggregate equity is below `mcTarget` percentage points.
   * @private
   */
  async _compareRangeSharedBoards(setup, progressCallback = null, useWorkers = true) {
    const work = this._buildExhaustiveWork(setup);
    const acc = work.perHand ? this._emptyHandTotals(work.U) : null;
    const ex = this._cardsBitset([...setup.boardCards, ...(setup.deadCards || [])]);
    const deck = [];
    for (let c = 0; c < 52; c++) if (!(c < 32 ? ex.lo & (1 << c) : ex.hi & (1 << (c - 32)))) deck.push(c);
    const pool = Int32Array.from(deck), poolLen = pool.length;
    const k = setup.numberOfCardsToDeal, total = setup.iterations;
    if (k > poolLen || total <= 0) return acc ? { win: 0, tie: 0, lose: 0, work, hands: acc } : { win: 0, tie: 0, lose: 0 };
    const batchSize = Math.max(64, Math.min(1024, Math.ceil(total / 16)));
    const target = setup.mcTarget > 0 ? setup.mcTarget / 100 : 0;
    let st = new XorShift32().state;
    let issued = 0, done = 0, stop = false, win = 0, tie = 0, lose = 0;
    let nb = 0, sumEq = 0, sumEq2 = 0;

    const nextBatch = () => {
      if (stop || issued >= total) return null;
      const n = Math.min(batchSize, total - issued);
      issued += n;
      const out = new Int32Array(n * 4);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < k; j++) { // partial Fisher-Yates over the live deck
          st ^= st << 13; st ^= st >> 17; st ^= st << 5;
          const r = j + Math.abs(st) % (poolLen - j);
          const c = pool[r]; pool[r] = pool[j]; pool[j] = c;
          out[i * 4 + (c & 3)] |= 1 << (c >> 2);
        }
      }
      return out;
    };
    const onResult = (r, n) => {
      win += r.win; tie += r.tie; lose += r.lose; done += n;
      if (acc) this._addHandTotals(acc, r);
      const t = r.win + r.tie + r.lose;
      if (t > 0) { const e = (r.win + r.tie / 2) / t; nb++; sumEq += e; sumEq2 += e * e; }
      if (target && nb >= 8) {
        const mean = sumEq / nb, v = Math.max(0, (sumEq2 - nb * mean * mean) / (nb - 1));
        if (1.96 * Math.sqrt(v / nb) < target) stop = true;
      }
      if (progressCallback) progressCallback(done, total, `Sampled ${done.toLocaleString()} boards`);
    };
    await this._runKernelBatches(work, nextBatch, onResult, useWorkers, progressCallback);
    if (progressCallback) progressCallback(total, total, 'Complete');
    return acc ? { win, tie, lose, work, hands: acc } : { win, tie, lose };
  }

  /**
   * Returns `count` persistent workers, lazily growing the pool as needed.
   * Reused across compareRange calls so thread-spawn + importScripts parse is
   * paid once rather than per query.
   * @private
   */
  _acquireWorkers(count) {
    if (!this._workerPool) this._workerPool = [];
    while (this._workerPool.length < count) {
      this._workerPool.push(new Worker(this.workerUrl));
    }
    return this._workerPool.slice(0, count);
  }

  /**
   * Removes a (typically crashed) worker from the pool and terminates it.
   * @private
   */
  _discardWorker(worker) {
    if (this._workerPool) {
      const idx = this._workerPool.indexOf(worker);
      if (idx !== -1) this._workerPool.splice(idx, 1);
    }
    try { worker.terminate(); } catch (e) { /* ignore */ }
  }

  /**
   * Terminates and clears the persistent worker pool. Call when done with an
   * instance (e.g. on teardown) to free the worker threads.
   */
  terminateWorkerPool() {
    if (!this._workerPool) return;
    for (const worker of this._workerPool) {
      try { worker.terminate(); } catch (e) { /* ignore */ }
    }
    this._workerPool = null;
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
    if (k === 0) return [0n]; // complete board: exactly one runout (the empty draw)
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

// Category names indexed by `value >>> 20` of an evaluateSuits() value.
BitVal.HAND_CATEGORIES = Object.freeze(['High Card', 'Pair', 'Two Pair', 'Trips', 'Straight', 'Flush', 'Full House', 'Quads', 'Straight Flush']);
// Public aliases: the SAME function objects, so there is no wrapper call.
// `_eval7` is kept for code that already calls it (internal hot loops use it).
BitVal.prototype._eval7 = BitVal.prototype.evaluateSuits;
BitVal.prototype.toSuitMasks = BitVal.prototype._suitsOfCards;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BitVal;
}
if (typeof window !== 'undefined') {
  window.BitVal = BitVal;
}
