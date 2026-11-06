// poker-rangeman 4.0.0-beta.1 (https://github.com/DarraghGeo/poker-rangeman), bundled for the demo page as a
// classic script that sets window.RangeManager. Generated, do not edit. Rebuild with:
//   npm install poker-rangeman@4.0.0-beta.1 esbuild@0.24.2
//   echo "import { RangeManager } from 'poker-rangeman'; window.RangeManager = RangeManager;" > entry.js
//   npx esbuild entry.js --bundle --format=iife --platform=browser --target=es2020 \
//     --external:poker-bitvaljs --external:poker-extval --legal-comments=inline --outfile=poker-rangeman.js
// poker-bitvaljs / poker-extval are loaded lazily only by rangeman's equity and hand-strength features, which this
// page doesn't use (it calls new RangeManager(notation).toArray() and runs equity with bitval.js).
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);

  // node_modules/poker-rangeman/src/core/cards.js
  var RANK_CHARS = "23456789TJQKA";
  var SUIT_CHARS = "shdc";
  var COMBO_COUNT = 1326;
  var RANK_OF = new Int8Array(128).fill(-1);
  var SUIT_OF = new Int8Array(128).fill(-1);
  for (let r = 0; r < 13; r++) {
    RANK_OF[RANK_CHARS.charCodeAt(r)] = r;
    RANK_OF[RANK_CHARS.toLowerCase().charCodeAt(r)] = r;
  }
  for (let s = 0; s < 4; s++) {
    SUIT_OF[SUIT_CHARS.charCodeAt(s)] = s;
    SUIT_OF[SUIT_CHARS.toUpperCase().charCodeAt(s)] = s;
  }
  var CARD_STRINGS = [];
  for (let c = 0; c < 52; c++) CARD_STRINGS.push(RANK_CHARS[c >> 2] + SUIT_CHARS[c & 3]);
  function cardIndex(card) {
    if (typeof card !== "string" || card.length !== 2) return -1;
    const r = RANK_OF[card.charCodeAt(0)];
    const s = SUIT_OF[card.charCodeAt(1)];
    return r < 0 || s < 0 ? -1 : r * 4 + s;
  }
  var COMBO_LO = new Uint8Array(COMBO_COUNT);
  var COMBO_HI = new Uint8Array(COMBO_COUNT);
  var COMBO_ID = new Int16Array(52 * 52).fill(-1);
  var COMBO_LANE = [new Uint16Array(COMBO_COUNT), new Uint16Array(COMBO_COUNT), new Uint16Array(COMBO_COUNT), new Uint16Array(COMBO_COUNT)];
  var HAND_STRINGS = new Array(COMBO_COUNT);
  var HAND_ID = /* @__PURE__ */ new Map();
  {
    let id = 0;
    for (let a = 0; a < 52; a++) {
      for (let b = a + 1; b < 52; b++) {
        COMBO_LO[id] = a;
        COMBO_HI[id] = b;
        COMBO_ID[a * 52 + b] = id;
        COMBO_ID[b * 52 + a] = id;
        COMBO_LANE[a & 3][id] |= 1 << (a >> 2);
        COMBO_LANE[b & 3][id] |= 1 << (b >> 2);
        let first = CARD_STRINGS[b];
        let second = CARD_STRINGS[a];
        if (a >> 2 === b >> 2 && first[1] > second[1]) [first, second] = [second, first];
        HAND_STRINGS[id] = first + second;
        HAND_ID.set(first + second, id);
        id++;
      }
    }
  }
  function idOfHand(hand) {
    return HAND_ID.get(hand) ?? -1;
  }

  // node_modules/poker-rangeman/src/core/equity.js
  var [LANE_S, LANE_H, LANE_D, LANE_C] = COMBO_LANE;
  var valueById = new Int32Array(COMBO_COUNT);
  var sortedA = { ids: new Uint16Array(COMBO_COUNT), values: new Int32Array(COMBO_COUNT) };
  var sortedB = { ids: new Uint16Array(COMBO_COUNT), values: new Int32Array(COMBO_COUNT) };
  var sortedC = { ids: new Uint16Array(COMBO_COUNT), values: new Int32Array(COMBO_COUNT) };
  var less = new Float64Array(52);
  var lessEq = new Float64Array(52);
  var all = new Float64Array(52);
  function rangeEquity(bv, job) {
    const { heroIds, villainIds, heroWeight, villainWeight, board, dead = [], both = false } = job;
    const onBoard = new Uint8Array(52);
    for (const c of board) onBoard[c] = 1;
    const blocked = onBoard.slice();
    for (const c of dead) blocked[c] = 1;
    const hero = side(heroIds);
    const villain = both ? side(villainIds) : null;
    const heroLive = liveIds(heroIds, onBoard, null);
    const villainLive = liveIds(villainIds, onBoard, villainWeight);
    const heroPos = positions(heroIds);
    const villainPos = both ? positions(villainIds) : null;
    if (heroLive.length === 0 || villainLive.length === 0) return { hero, villain, runouts: 0 };
    let heroLiveW = both ? liveIds(heroIds, onBoard, heroWeight) : null;
    if (heroLiveW && heroLiveW.length === heroLive.length) heroLiveW = heroLive;
    const scored = new Uint8Array(COMBO_COUNT);
    const union = [];
    for (const id of heroLive) if (!scored[id]) {
      scored[id] = 1;
      union.push(id);
    }
    for (const id of villainLive) if (!scored[id]) {
      scored[id] = 1;
      union.push(id);
    }
    if (heroLiveW) {
      for (const id of heroLiveW) if (!scored[id]) {
        scored[id] = 1;
        union.push(id);
      }
    }
    let bs = 0, bh = 0, bd = 0, bc = 0;
    for (const c of board) {
      const bit = 1 << (c >> 2);
      switch (c & 3) {
        case 0:
          bs |= bit;
          break;
        case 1:
          bh |= bit;
          break;
        case 2:
          bd |= bit;
          break;
        default:
          bc |= bit;
      }
    }
    const deck = [];
    for (let c = 0; c < 52; c++) if (!blocked[c]) deck.push(c);
    const missing = 5 - board.length;
    const runout = (r1, r2, r3, r4, r5, s, h, d, cl) => {
      for (let i = 0; i < union.length; i++) {
        const id = union[i];
        const lo = COMBO_LO[id], hi = COMBO_HI[id];
        if (lo === r1 || lo === r2 || lo === r3 || lo === r4 || lo === r5 || hi === r1 || hi === r2 || hi === r3 || hi === r4 || hi === r5) {
          valueById[id] = -1;
        } else {
          valueById[id] = bv.evaluateSuits(s | LANE_S[id], h | LANE_H[id], d | LANE_D[id], cl | LANE_C[id]);
        }
      }
      const nh = sortByValue(heroLive, sortedA);
      const nv = sortByValue(villainLive, sortedB);
      sweep(sortedA, nh, heroPos, sortedB, nv, villainWeight, hero);
      if (both) {
        if (heroLiveW === heroLive) sweep(sortedB, nv, villainPos, sortedA, nh, heroWeight, villain);
        else sweep(sortedB, nv, villainPos, sortedC, sortByValue(heroLiveW, sortedC), heroWeight, villain);
      }
    };
    let runouts = 0;
    const from = job.from ?? 0;
    const to = job.to ?? Infinity;
    if (missing === 0) {
      runout(-1, -1, -1, -1, -1, bs, bh, bd, bc);
      runouts = 1;
    } else if (missing <= 2) {
      let index = 0;
      const n = deck.length;
      if (missing === 1) {
        for (let i = 0; i < n; i++, index++) {
          if (index < from || index >= to) continue;
          const a = deck[i];
          const [s, h, d, cl] = addCard(bs, bh, bd, bc, a);
          runout(a, -1, -1, -1, -1, s, h, d, cl);
          runouts++;
        }
      } else {
        for (let i = 0; i < n; i++) {
          const a = deck[i];
          const [s1, h1, d1, c1] = addCard(bs, bh, bd, bc, a);
          for (let j = i + 1; j < n; j++, index++) {
            if (index < from || index >= to) continue;
            const b = deck[j];
            const [s, h, d, cl] = addCard(s1, h1, d1, c1, b);
            runout(a, b, -1, -1, -1, s, h, d, cl);
            runouts++;
          }
        }
      }
    } else {
      const iterations = job.iterations ?? 1e4;
      let seed = (job.seed ?? Math.random() * 2147483647) | 0 || 1;
      const random = () => {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        return (seed >>> 0) / 4294967296;
      };
      const cards = deck.slice();
      const picked = [-1, -1, -1, -1, -1];
      for (let it = 0; it < iterations; it++) {
        let s = bs, h = bh, d = bd, cl = bc;
        for (let k = 0; k < missing; k++) {
          const j = k + Math.floor(random() * (cards.length - k));
          const t = cards[k];
          cards[k] = cards[j];
          cards[j] = t;
          picked[k] = cards[k];
          [s, h, d, cl] = addCard(s, h, d, cl, cards[k]);
        }
        runout(picked[0], picked[1], picked[2], picked[3], picked[4], s, h, d, cl);
      }
      runouts = iterations;
    }
    return { hero, villain, runouts };
  }
  function side(ids) {
    return { win: new Float64Array(ids.length), tie: new Float64Array(ids.length), lose: new Float64Array(ids.length) };
  }
  function liveIds(ids, blocked, weight) {
    const out = [];
    for (const id of ids) {
      if (blocked[COMBO_LO[id]] || blocked[COMBO_HI[id]]) continue;
      if (weight && !(weight[id] > 0)) continue;
      out.push(id);
    }
    return out;
  }
  function positions(ids) {
    const pos = new Int32Array(COMBO_COUNT).fill(-1);
    for (let i = 0; i < ids.length; i++) pos[ids[i]] = i;
    return pos;
  }
  function addCard(s, h, d, c, card) {
    const bit = 1 << (card >> 2);
    switch (card & 3) {
      case 0:
        return [s | bit, h, d, c];
      case 1:
        return [s, h | bit, d, c];
      case 2:
        return [s, h, d | bit, c];
      default:
        return [s, h, d, c | bit];
    }
  }
  var tmpValues = new Int32Array(COMBO_COUNT);
  var tmpIds = new Uint16Array(COMBO_COUNT);
  var counts = new Int32Array(256);
  function sortByValue(ids, out) {
    let n = 0;
    const values = out.values, outIds = out.ids;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const v = valueById[id];
      if (v >= 0) {
        values[n] = v;
        outIds[n] = id;
        n++;
      }
    }
    let srcV = values, srcI = outIds, dstV = tmpValues, dstI = tmpIds;
    for (let shift = 0; shift < 24; shift += 8) {
      counts.fill(0);
      for (let i = 0; i < n; i++) counts[srcV[i] >>> shift & 255]++;
      let sum = 0;
      for (let b = 0; b < 256; b++) {
        const c = counts[b];
        counts[b] = sum;
        sum += c;
      }
      for (let i = 0; i < n; i++) {
        const pos = counts[srcV[i] >>> shift & 255]++;
        dstV[pos] = srcV[i];
        dstI[pos] = srcI[i];
      }
      [srcV, dstV] = [dstV, srcV];
      [srcI, dstI] = [dstI, srcI];
    }
    values.set(srcV.subarray(0, n));
    outIds.set(srcI.subarray(0, n));
    return n;
  }
  function sweep(a, na, posA, b, nb, weightB, out) {
    less.fill(0);
    lessEq.fill(0);
    all.fill(0);
    const idsA = a.ids, valuesA = a.values, idsB = b.ids, valuesB = b.values;
    let total = 0;
    for (let k2 = 0; k2 < nb; k2++) {
      const id = idsB[k2];
      const w = weightB[id];
      total += w;
      all[COMBO_LO[id]] += w;
      all[COMBO_HI[id]] += w;
    }
    let lessTotal = 0, lessEqTotal = 0;
    let j = 0, k = 0;
    const { win, tie, lose } = out;
    for (let i = 0; i < na; i++) {
      const id = idsA[i];
      const value = valuesA[i];
      while (j < nb && valuesB[j] < value) {
        const vid = idsB[j];
        const w2 = weightB[vid];
        lessTotal += w2;
        less[COMBO_LO[vid]] += w2;
        less[COMBO_HI[vid]] += w2;
        j++;
      }
      while (k < nb && valuesB[k] <= value) {
        const vid = idsB[k];
        const w2 = weightB[vid];
        lessEqTotal += w2;
        lessEq[COMBO_LO[vid]] += w2;
        lessEq[COMBO_HI[vid]] += w2;
        k++;
      }
      const lo = COMBO_LO[id], hi = COMBO_HI[id];
      const w = lessTotal - less[lo] - less[hi];
      const same = valueById[id] >= 0 ? weightB[id] || 0 : 0;
      const t = lessEqTotal - lessEq[lo] - lessEq[hi] + same - w;
      const totalLive = total - all[lo] - all[hi] + same;
      const p = posA[id];
      win[p] += w;
      tie[p] += t;
      lose[p] += totalLive - w - t;
    }
  }

  // node_modules/poker-rangeman/src/core/notation.js
  var VALID_RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  var VALID_SUITS = ["s", "h", "d", "c"];
  var RANK_VALUES = { A: 14, K: 13, Q: 12, J: 11, T: 10, 9: 9, 8: 8, 7: 7, 6: 6, 5: 5, 4: 4, 3: 3, 2: 2 };
  var ALL_SUITS = ["c", "d", "h", "s"];
  var buildNonPairPatterns = (suffix) => ({
    plus: new RegExp(`^([AKQJT2-9])([AKQJT2-9])${suffix}\\+$`),
    range: new RegExp(`^([AKQJT2-9])([AKQJT2-9])${suffix}-([AKQJT2-9])([AKQJT2-9])${suffix}$`),
    single: new RegExp(`^([AKQJT2-9])([AKQJT2-9])${suffix}$`)
  });
  var NON_PAIR_PATTERNS = { s: buildNonPairPatterns("s"), o: buildNonPairPatterns("o") };
  var ANY_SUIT_PATTERN = /^([AKQJT2-9])([AKQJT2-9])(\+?)$|^([AKQJT2-9])([AKQJT2-9])-([AKQJT2-9])([AKQJT2-9])$/;
  var rankValue = (rank) => RANK_VALUES[rank] ?? NaN;
  var isValidRank = (rank) => typeof rank === "string" && VALID_RANKS.includes(rank);
  var isValidSuit = (suit) => typeof suit === "string" && suit !== "" && VALID_SUITS.includes(suit.toLowerCase());
  function isValidCard(card) {
    if (!card || typeof card !== "string" || card.length !== 2) return false;
    const rank = card[0].toUpperCase();
    const suit = card[1].toLowerCase();
    if (rank === "X" && isValidSuit(suit)) return true;
    if (isValidRank(rank) && suit === "x") return true;
    return isValidRank(rank) && isValidSuit(suit);
  }
  function isValidConcreteCard(card) {
    if (!card || typeof card !== "string" || card.length !== 2) return false;
    return isValidRank(card[0].toUpperCase()) && isValidSuit(card[1]);
  }
  var normalizeCard = (card) => card[0].toUpperCase() + card[1].toLowerCase();
  function isValidHand(hand, allowWildcards = false) {
    if (!hand || typeof hand !== "string" || hand.length !== 4) return false;
    const card1 = hand.substring(0, 2);
    const card2 = hand.substring(2, 4);
    const valid = allowWildcards ? isValidCard : isValidConcreteCard;
    if (!valid(card1) || !valid(card2)) return false;
    return normalizeCard(card1) !== normalizeCard(card2);
  }
  var compareRanks = (a, b) => Math.sign(rankValue(a) - rankValue(b));
  function normalizeHand(hand) {
    if (!isValidHand(hand)) throw new Error(`Invalid hand: ${hand}`);
    const card1 = normalizeCard(hand.substring(0, 2));
    const card2 = normalizeCard(hand.substring(2, 4));
    const [high, low] = compareRanks(card1[0], card2[0]) >= 0 ? [card1, card2] : [card2, card1];
    if (high[0] === low[0]) {
      const suits = [high[1], low[1]].sort();
      return high[0] + suits[0] + high[0] + suits[1];
    }
    return high + low;
  }
  var handCards = (hand) => !hand || hand.length !== 4 ? [] : [hand.substring(0, 2), hand.substring(2, 4)];
  var normalizeHandSegment = (segment) => normalizeCard(segment.substring(0, 2)) + normalizeCard(segment.substring(2, 4));
  function normalizeSegment(segment) {
    const trimmed = segment.trim();
    if (trimmed.length === 4 && isValidHand(trimmed, true)) return normalizeHandSegment(trimmed);
    if (trimmed.includes("-")) {
      return trimmed.split("-").map((p) => {
        const lastChar2 = p.slice(-1).toLowerCase();
        return lastChar2 === "s" || lastChar2 === "o" ? p.slice(0, -1).toUpperCase() + lastChar2 : p.toUpperCase();
      }).join("-");
    }
    const lastChar = trimmed.slice(-1).toLowerCase();
    const secondLastChar = trimmed.length > 1 ? trimmed.slice(-2, -1).toLowerCase() : "";
    if (lastChar === "+" && secondLastChar === "s") return trimmed.slice(0, -2).toUpperCase() + "s+";
    if (lastChar === "+" && secondLastChar === "o") return trimmed.slice(0, -2).toUpperCase() + "o+";
    if (lastChar === "s" || lastChar === "o") return trimmed.slice(0, -1).toUpperCase() + lastChar;
    return trimmed.toUpperCase();
  }
  function splitWeight(entry) {
    const index = entry.indexOf(":");
    return index === -1 ? [entry, void 0] : [entry.slice(0, index), entry.slice(index + 1)];
  }
  function normalizeNotation(notation) {
    if (typeof notation !== "string") return notation;
    const trimmed = notation.trim().replace(/\s+/g, " ");
    const normalizeEntry = (entry) => {
      const [range, weight] = splitWeight(entry);
      return weight === void 0 ? normalizeSegment(range) : `${normalizeSegment(range)}:${weight.trim()}`;
    };
    return trimmed.includes(",") ? trimmed.split(",").map(normalizeEntry).join(",") : normalizeEntry(trimmed);
  }
  function parseWeight(value, entry) {
    const weight = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0 || weight > 1) {
      throw new Error(`Invalid weight for ${entry}: ${value}. Weights are numbers from 0 to 1`);
    }
    return weight;
  }
  function allRanksBetween(startRank, endRank) {
    const startIdx = VALID_RANKS.indexOf(startRank);
    const endIdx = VALID_RANKS.indexOf(endRank);
    if (startIdx === -1 || endIdx === -1) return [];
    if (startIdx <= endIdx) return VALID_RANKS.slice(startIdx, endIdx + 1);
    return VALID_RANKS.slice(endIdx, startIdx + 1).reverse();
  }
  function rankBelow(rank) {
    const index = VALID_RANKS.indexOf(rank);
    if (index === -1 || index === VALID_RANKS.length - 1) return null;
    return VALID_RANKS[index + 1];
  }
  function isPairNotation(segment) {
    if (/^([AKQJT2-9])\1\+$/.test(segment) || /^([AKQJT2-9])\1$/.test(segment)) return true;
    if (!segment.includes("-")) return false;
    const parts = segment.split("-");
    return parts.length === 2 && /^([AKQJT2-9])\1$/.test(parts[0]) && /^([AKQJT2-9])\1$/.test(parts[1]);
  }
  function isSuitedNotation(segment) {
    return /^[AKQJT2-9]{1,2}[AKQJT2-9]{1,2}s\+$/.test(segment) || /^[AKQJT2-9]{1,2}[AKQJT2-9]{1,2}s-[AKQJT2-9]{1,2}[AKQJT2-9]{1,2}s$/.test(segment) || /^[AKQJT2-9]{1,2}[AKQJT2-9]{1,2}s$/.test(segment);
  }
  function isOffsuitNotation(segment) {
    return /^[AKQJT2-9]{1,2}[AKQJT2-9]{1,2}o\+$/.test(segment) || /^[AKQJT2-9]{1,2}[AKQJT2-9]{1,2}o-[AKQJT2-9]{1,2}[AKQJT2-9]{1,2}o$/.test(segment) || /^[AKQJT2-9]{1,2}[AKQJT2-9]{1,2}o$/.test(segment);
  }
  function isRankXNotation(segment) {
    if (segment.length !== 3) return false;
    return isValidRank(segment[0]) && (segment[1] === "X" || segment[1] === "x") && (segment[2] === "o" || segment[2] === "s");
  }
  function isAnySuitNotation(segment) {
    const match = segment.match(ANY_SUIT_PATTERN);
    if (!match) return false;
    if (match[1]) return match[1] !== match[2];
    return match[4] !== match[5] && match[6] !== match[7];
  }
  var isWildcardNotation = (segment) => segment.length === 4 && (segment.includes("x") || segment.includes("X"));
  function detectNotationType(segment) {
    if (!segment || typeof segment !== "string") return null;
    if (isPairNotation(segment)) return "pair";
    if (isRankXNotation(segment)) return "rankX";
    if (isAnySuitNotation(segment)) return "anySuit";
    if (isSuitedNotation(segment)) return "suited";
    if (isOffsuitNotation(segment)) return "offsuit";
    if (isWildcardNotation(segment)) return "wildcard";
    if (segment.length === 4 && isValidHand(segment)) return "specific";
    return null;
  }
  function pairCombos(rank) {
    const combos = [];
    for (let i = 0; i < ALL_SUITS.length; i++) {
      for (let j = i + 1; j < ALL_SUITS.length; j++) combos.push(normalizeHand(rank + ALL_SUITS[i] + rank + ALL_SUITS[j]));
    }
    return combos;
  }
  var suitedCombos = (rank1, rank2) => ALL_SUITS.map((suit) => normalizeHand(rank1 + suit + rank2 + suit));
  function offsuitCombos(rank1, rank2) {
    const hands = [];
    for (const s1 of ALL_SUITS) for (const s2 of ALL_SUITS) if (s1 !== s2) hands.push(normalizeHand(rank1 + s1 + rank2 + s2));
    return hands;
  }
  function parsePairRange(range) {
    let start, end;
    if (range.endsWith("+")) [start, end] = [range[0], "A"];
    else {
      const parts = range.split("-");
      [start, end] = parts.length === 1 ? [parts[0][0], parts[0][0]] : [parts[0][0], parts[1][0]];
    }
    if (!start || !end) throw new Error(`Invalid pair range: ${range}`);
    return allRanksBetween(start, end).flatMap(pairCombos);
  }
  function parseNonPairRange(range, suffix) {
    const label = suffix === "s" ? "suited" : "offsuit";
    const generate = suffix === "s" ? suitedCombos : offsuitCombos;
    const patterns = NON_PAIR_PATTERNS[suffix];
    let info = null;
    let match = range.match(patterns.plus);
    if (match) info = { rank1: match[1], rank2: match[2], isPlus: true };
    else if (match = range.match(patterns.range)) info = { rank1: match[1], rank2: match[2], endRank1: match[3], endRank2: match[4] };
    else if (match = range.match(patterns.single)) info = { rank1: match[1], rank2: match[2], isPlus: false };
    if (!info) throw new Error(`Invalid ${label} range: ${range}`);
    let ranks;
    if (info.isPlus) {
      const target = rankBelow(info.rank1);
      if (!target) return [];
      ranks = allRanksBetween(info.rank2, target).filter((r) => r !== info.rank1);
    } else if (info.endRank2) {
      if (info.rank1 !== info.endRank1) throw new Error(`Invalid ${label} range: ${range}`);
      ranks = allRanksBetween(info.rank2, info.endRank2);
    } else {
      ranks = [info.rank2];
    }
    return ranks.flatMap((rank) => generate(info.rank1, rank));
  }
  function parseAnySuitRange(segment) {
    const withSuffix = (suffix) => segment.includes("-") ? segment.split("-").map((part) => part + suffix).join("-") : segment.replace(/^(..)(\+?)$/, `$1${suffix}$2`);
    return [...parseNonPairRange(withSuffix("s"), "s"), ...parseNonPairRange(withSuffix("o"), "o")];
  }
  function parseRankX(segment) {
    const rank = segment[0].toUpperCase();
    const offsuit = segment[2].toLowerCase() === "o";
    if (!isValidRank(rank)) throw new Error(`Invalid rank in notation: ${segment}`);
    const hands = [];
    for (const other of VALID_RANKS) if (other !== rank) hands.push(...offsuit ? offsuitCombos(rank, other) : suitedCombos(rank, other));
    if (offsuit) hands.push(...pairCombos(rank));
    return [...new Set(hands)];
  }
  function parseWildcard(hand) {
    let card1 = hand.substring(0, 2);
    let card2 = hand.substring(2, 4);
    if (card1[0] === "X") [card1, card2] = [card2, card1];
    const info = card1[0] === "X" ? null : { card1Rank: card1[0] };
    if (info) {
      if (card2[0] === "X") {
        info.card2RankWildcard = true;
        info.card2ExcludeRank = card1[0];
        if (card2[1].toLowerCase() === "x") info.card2SuitWildcard = true;
        else info.card2Suit = card2[1].toLowerCase();
      } else {
        info.card2Rank = card2[0];
        info.card2Suit = card2[1].toLowerCase();
      }
      if (card1[1].toLowerCase() === "x") {
        info.card1SuitWildcard = true;
        info.card1ExcludeSuit = info.card2SuitWildcard ? null : info.card2Suit;
      } else {
        info.card1Suit = card1[1].toLowerCase();
      }
    }
    const hands = [];
    if (info) {
      const card1Suits = info.card1SuitWildcard ? VALID_SUITS.filter((s) => s !== info.card1ExcludeSuit) : [info.card1Suit];
      const card2Ranks = info.card2RankWildcard && info.card2SuitWildcard ? VALID_RANKS : info.card2RankWildcard ? VALID_RANKS.filter((r) => r !== info.card2ExcludeRank) : [info.card2Rank];
      const card2Suits = info.card2SuitWildcard ? VALID_SUITS : [info.card2Suit];
      for (const s1 of card1Suits) {
        for (const r2 of card2Ranks) {
          for (const s2 of card2Suits) {
            const card2Full = r2 + s2;
            if (card2Full === info.card1Rank + s1) continue;
            const combo = info.card1Rank + s1 + card2Full;
            if (isValidHand(combo)) hands.push(normalizeHand(combo));
          }
        }
      }
    }
    if (hands.length === 0) throw new Error(`Invalid wildcard hand: ${hand}`);
    return [...new Set(hands)];
  }
  var parsedSegments = /* @__PURE__ */ new Map();
  function parseSegment(segment) {
    let hands = parsedSegments.get(segment);
    if (!hands) {
      hands = parseSegmentUncached(segment);
      if (parsedSegments.size >= 4096) parsedSegments.delete(parsedSegments.keys().next().value);
      parsedSegments.set(segment, hands);
    }
    return hands;
  }
  function parseSegmentUncached(segment) {
    const type = detectNotationType(segment);
    if (type === "pair") return parsePairRange(segment);
    if (type === "suited") return parseNonPairRange(segment, "s");
    if (type === "offsuit") return parseNonPairRange(segment, "o");
    if (type === "rankX") return parseRankX(segment);
    if (type === "anySuit") return parseAnySuitRange(segment);
    if (type === "wildcard") return parseWildcard(segment);
    if (type === "specific") return [normalizeHand(segment)];
    throw new Error(`Unrecognized notation: ${segment}`);
  }
  var isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
  var parsedNotation = /* @__PURE__ */ new Map();
  function parseWeighted(input) {
    if (typeof input !== "string") return parseUncached(input);
    let parsed = parsedNotation.get(input);
    if (!parsed) {
      parsed = parseUncached(input);
      if (parsedNotation.size >= 256) parsedNotation.delete(parsedNotation.keys().next().value);
      parsedNotation.set(input, parsed);
    }
    return { hands: parsed.hands.slice(), weights: { ...parsed.weights } };
  }
  function parseUncached(input) {
    const entries = /* @__PURE__ */ new Map();
    const set = (hands2, weight) => hands2.forEach((hand) => {
      entries.delete(hand);
      entries.set(hand, weight);
    });
    const exactHand = (hand, where) => {
      if (!isValidHand(hand)) throw new Error(`Invalid hand in ${where}: ${hand}`);
      return normalizeHand(hand);
    };
    if (typeof input === "string") {
      normalizeNotation(input).split(",").map((s) => s.trim()).filter((s) => s).forEach((entry) => {
        const [range, weight] = splitWeight(entry);
        set(parseSegment(range.trim()), weight === void 0 ? 1 : parseWeight(weight, range));
      });
    } else if (Array.isArray(input)) {
      if (input.length === 0) throw new Error("Array cannot be empty");
      input.forEach((item) => {
        if (Array.isArray(item)) {
          set([exactHand(item[0], "array")], parseWeight(item[1], item[0]));
        } else if (isPlainObject(item) && typeof item.hand === "string") {
          set([exactHand(item.hand, "array")], item.weight === void 0 ? 1 : parseWeight(item.weight, item.hand));
        } else if (typeof item === "string" && item.includes(":")) {
          const [hand, weight] = splitWeight(item);
          set([exactHand(hand.trim(), "array")], parseWeight(weight, hand));
        } else {
          set([exactHand(item, "array")], 1);
        }
      });
    } else if (isPlainObject(input)) {
      const items = Object.entries(input);
      if (items.length === 0) throw new Error("Object cannot be empty");
      items.forEach(([hand, weight]) => set([exactHand(hand, "object")], parseWeight(weight, hand)));
    } else {
      throw new Error("Input must be a string, array or object");
    }
    const hands = [];
    const weights = {};
    for (const [hand, weight] of entries) {
      if (weight === 0) continue;
      hands.push(hand);
      if (weight !== 1) weights[hand] = weight;
    }
    return { hands, weights };
  }
  function handClass(hand) {
    const [c1, c2] = handCards(hand);
    const [high, low] = compareRanks(c1[0], c2[0]) >= 0 ? [c1, c2] : [c2, c1];
    if (high[0] === low[0]) return { type: "pair", notation: high[0] + low[0] };
    if (high[1] === low[1]) return { type: "suited", notation: high[0] + low[0] + "s" };
    return { type: "offsuit", notation: high[0] + low[0] + "o" };
  }
  function classNotation(hands) {
    if (hands.length === 0) return "";
    const categories = { pairs: [], suited: [], offsuit: [] };
    for (const hand of hands) {
      const cls = handClass(hand);
      categories[cls.type === "pair" ? "pairs" : cls.type === "suited" ? "suited" : "offsuit"].push(cls.notation);
    }
    const parts = [];
    if (categories.pairs.length > 0) parts.push([...new Set(categories.pairs)].join(","));
    if (categories.suited.length > 0) parts.push([...new Set(categories.suited)].join(","));
    if (categories.offsuit.length > 0) parts.push([...new Set(categories.offsuit)].join(","));
    return parts.join(",");
  }
  function consecutiveSequences(ranks) {
    if (ranks.length === 0) return [];
    const sorted = [...new Set(ranks)].sort((a, b) => rankValue(a) - rankValue(b));
    const sequences = [];
    let start = sorted[0], end = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      if (rankValue(sorted[i]) === rankValue(end) + 1) end = sorted[i];
      else {
        sequences.push({ start, end });
        start = end = sorted[i];
      }
    }
    return [...sequences, { start, end }];
  }
  function abbreviatePairs(pairs) {
    if (pairs.length === 0) return [];
    return consecutiveSequences([...new Set(pairs)].map((p) => p[0])).map((seq) => seq.start === seq.end ? seq.start + seq.start : seq.end === "A" ? seq.start + seq.start + "+" : seq.end + seq.end + "-" + seq.start + seq.start).sort((a, b) => rankValue(b[0]) - rankValue(a[0]));
  }
  function abbreviateNonPairs(list, suffix) {
    var _a;
    if (list.length === 0) return [];
    const groups = {};
    for (const notation of list) (groups[_a = notation[0]] || (groups[_a] = [])).push(notation);
    const result = [];
    for (const group of Object.values(groups)) {
      const firstRank = group[0][0];
      for (const seq of consecutiveSequences([...new Set(group)].map((h) => h[1]))) {
        if (seq.start === seq.end) result.push(firstRank + seq.start + suffix);
        else if (seq.end === rankBelow(firstRank)) result.push(firstRank + seq.start + suffix + "+");
        else result.push(firstRank + seq.start + suffix + "-" + firstRank + seq.end + suffix);
      }
    }
    return result;
  }
  function abbreviatedNotation(hands) {
    const notation = classNotation(hands);
    if (!notation) return "";
    const parts = notation.split(",");
    return [
      ...abbreviatePairs(parts.filter((p) => /^([AKQJT2-9])\1$/.test(p))),
      ...abbreviateNonPairs(parts.filter((p) => /^[AKQJT2-9]{2}s$/.test(p)), "s"),
      ...abbreviateNonPairs(parts.filter((p) => /^[AKQJT2-9]{2}o$/.test(p)), "o")
    ].join(",");
  }
  function weightedNotation(hands, weightOf, write = abbreviatedNotation) {
    const roundWeight = (hand) => Math.round(weightOf(hand) * 1e4) / 1e4;
    const classWeights = /* @__PURE__ */ new Map();
    for (const hand of hands) {
      const cls = handClass(hand).notation;
      if (!classWeights.has(cls)) classWeights.set(cls, /* @__PURE__ */ new Set());
      classWeights.get(cls).add(roundWeight(hand));
    }
    const groups = /* @__PURE__ */ new Map();
    for (const hand of hands) {
      const weight = roundWeight(hand);
      if (!groups.has(weight)) groups.set(weight, []);
      groups.get(weight).push(hand);
    }
    return [...groups.entries()].sort((a, b) => b[0] - a[0]).map(([weight, list]) => {
      const mixed = (hand) => classWeights.get(handClass(hand).notation).size > 1;
      const parts = [write(list.filter((hand) => !mixed(hand))), ...list.filter(mixed)].filter(Boolean).join(",");
      if (!parts || weight === 1) return parts;
      return parts.split(",").map((part) => `${part}:${weight}`).join(",");
    }).filter(Boolean).join(",");
  }

  // node_modules/poker-rangeman/src/core/load.js
  var bitval = null;
  var extval = null;
  async function loadBitVal() {
    if (!bitval) {
      const mod = await import("poker-bitvaljs");
      const BitVal = mod.default || mod;
      bitval = new BitVal();
    }
    return bitval;
  }
  async function loadExtVal() {
    if (!extval) {
      const mod = await import("poker-extval");
      const pick = (name) => mod[name] || mod.default && mod.default[name];
      extval = { evaluateHand: pick("evaluateHand"), evaluate: pick("evaluate"), board: pick("board"), FLAGS: pick("FLAGS"), hasFlag: pick("hasFlag") };
    }
    return extval;
  }

  // node_modules/poker-rangeman/src/core/flags.js
  var layouts = /* @__PURE__ */ new WeakMap();
  function flagLayout(extval3) {
    let layout = layouts.get(extval3.FLAGS);
    if (!layout) {
      const names = Object.keys(extval3.FLAGS);
      const word = {}, bit = {};
      for (const name of names) {
        const flag = extval3.FLAGS[name];
        for (let b = 0; b < 32 && word[name] === void 0; b++) {
          const mask = 1 << b;
          if (extval3.hasFlag(mask, 0, flag)) {
            word[name] = 0;
            bit[name] = mask;
          } else if (extval3.hasFlag(0, mask, flag)) {
            word[name] = 1;
            bit[name] = mask;
          }
        }
        if (word[name] === void 0) throw new Error(`poker-extval flag ${name} has no bit`);
      }
      layout = { names, word, bit };
      layouts.set(extval3.FLAGS, layout);
    }
    return layout;
  }
  function hasFlagAt(layout, classified, id, name) {
    return ((layout.word[name] ? classified.hi[id] : classified.lo[id]) & layout.bit[name]) !== 0;
  }
  function flagMasks(layout, names) {
    const masks = { lo: 0, hi: 0 };
    for (const name of names) {
      if (layout.word[name]) masks.hi |= layout.bit[name];
      else masks.lo |= layout.bit[name];
    }
    return masks;
  }

  // node_modules/poker-rangeman/src/core/criteria.js
  var CRITERIA_MAPPING = {
    // Made Hands
    "Pair": "isPair",
    "Two Pair": "isTwoPair",
    "Three of a Kind": "isThreeOfAKind",
    "Straight": "isStraight",
    "Flush": "isFlush",
    "Full House": "isFullHouse",
    "Four of a Kind": "isFourOfAKind",
    "Straight Flush": "isStraightFlush",
    "Royal Flush": "isRoyalFlush",
    "High Card": "isHighCard",
    // Pair Categorization
    "Top Pair": "isTopPair",
    "Middle Pair": "isMiddlePair",
    "Bottom Pair": "isBottomPair",
    "Overpair": "isOverPair",
    "Over Pair": "isOverPair",
    "Underpair": "isUnderPair",
    "Under Pair": "isUnderPair",
    "Middling Pair": "isMiddlingPair",
    // Two Pair Categorization
    "Top And Middle Pair": "isTopAndMiddlePair",
    "Top And Bottom Pair": "isTopAndBottomPair",
    "Middle And Bottom Pair": "isMiddleAndBottomPair",
    // Three of a Kind Categorization
    "Top Three Of A Kind": "isTopThreeOfAKind",
    "Middle Three Of A Kind": "isMiddleThreeOfAKind",
    "Bottom Three Of A Kind": "isBottomThreeOfAKind",
    // Draws
    "Flush Draw": "isFlushDraw",
    "Backdoor Flush Draw": "isBackdoorFlushDraw",
    "Open Ended Straight Draw": "isOpenEndedStraightDraw",
    "Inside Straight Draw": "isInsideStraightDraw",
    "Straight Draw": "isStraightDraw",
    "Combo Draw": "isComboDraw",
    // Draws added in poker-extval 6
    "Nut Flush Draw": "isNutFlushDraw",
    "Nut Backdoor Flush Draw": "isNutBackdoorFlushDraw",
    "Double Gutshot": "isDoubleGutshot",
    "Backdoor Straight Draw": "isBackdoorStraightDraw",
    "Backdoor Combo Draw": "isBackdoorComboDraw",
    // Wheel Straight Support
    "Straight Wheel": "isStraightWheel",
    "Open Ended Straight Draw Wheel": "isOpenEndedStraightDrawWheel",
    "Inside Straight Draw Wheel": "isInsideStraightDrawWheel",
    // Hole cards against the board
    "Overcard": "isOvercard",
    "Two Overcards": "isTwoOvercards",
    "Overcard And Middle Card": "isOvercardAndMiddleCard",
    "Overcard And Undercard": "isOvercardAndUndercard",
    "Two Middle Cards": "isTwoMiddleCards",
    "Middle And Undercard": "isMiddleAndUndercard",
    "Two Undercards": "isTwoUndercards"
  };
  var CRITERION_ALIASES = { isOverpair: "isOverPair" };
  var CRITERIA_LOOKUP = new Map([...Object.entries(CRITERIA_MAPPING), ...Object.entries(CRITERION_ALIASES)]);
  var VALID_CRITERIA = new Set(Object.values(CRITERIA_MAPPING));
  var MADE_HANDS = /* @__PURE__ */ new Set([
    "isRoyalFlush",
    "isStraightFlush",
    "isFourOfAKind",
    "isFullHouse",
    "isFlush",
    "isStraight",
    "isThreeOfAKind",
    "isTwoPair",
    "isPair",
    "isHighCard"
  ]);

  // node_modules/poker-rangeman/src/rangeManager.js
  var VALID_RANKS2 = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  var VALID_SUITS2 = ["s", "h", "d", "c"];
  var RANK_VALUES2 = { A: 14, K: 13, Q: 12, J: 11, T: 10, 9: 9, 8: 8, 7: 7, 6: 6, 5: 5, 4: 4, 3: 3, 2: 2 };
  var extval2 = null;
  var bitval2 = null;
  var STREETS = /* @__PURE__ */ new Set(["flop", "turn", "river"]);
  var BAND_PRESETS = {
    acevedo: [
      { name: "strong", min: 0.75 },
      { name: "good", min: 0.5 },
      { name: "weak", min: 0.33 },
      { name: "trash", min: 0 }
    ],
    quartiles: [
      { name: "strong", min: 0.75 },
      { name: "good", min: 0.5 },
      { name: "weak", min: 0.25 },
      { name: "trash", min: 0 }
    ]
  };
  var ACEVEDO_FLOP_AVERAGES = {
    source: "Acevedo, Modern Poker Theory, Ch. 10 (PDF p. 600): average over all 1,755 flops, BB vs in-position opener, 20-40bb MTT ranges",
    bigBlind: { strong: 0.07, good: 0.25, weak: 0.23, trash: 0.45 },
    inPosition: { strong: 0.22, good: 0.43, weak: 0.29, trash: 0.06 }
  };
  var HAND_CLASSES = [
    "straightFlush",
    "quads",
    "fullHouse",
    "flush",
    "straight",
    "set",
    "trips",
    "twoPair",
    "overpair",
    "topPair",
    "pocketPair12",
    "secondPair",
    "pocketPair23",
    "thirdPair",
    "pocketPair34",
    "fourthPair",
    "pocketPair45",
    "bottomPair",
    "underpair",
    "flushDraw",
    "oesd",
    "gutshot",
    "aceHigh",
    "kingHigh",
    "air"
  ];
  var PAIR_POSITIONS = ["topPair", "secondPair", "thirdPair", "fourthPair"];
  var VILLAIN_DRAWS = [
    "isFlushDraw",
    "isBackdoorFlushDraw",
    "isOpenEndedStraightDraw",
    "isInsideStraightDraw",
    "isStraightDraw",
    "isComboDraw"
  ];
  var classifiedBoards = /* @__PURE__ */ new Map();
  function classifiedBoard(board, street) {
    const key = `${board.join(",")}|${street ?? ""}`;
    let result = classifiedBoards.get(key);
    if (!result) {
      const pairs = new Uint8Array(COMBO_COUNT * 2);
      for (let id = 0; id < COMBO_COUNT; id++) {
        pairs[id * 2] = COMBO_LO[id];
        pairs[id * 2 + 1] = COMBO_HI[id];
      }
      const all2 = extval2.board(board, street ? { street } : void 0).classifyAll(pairs);
      result = { lo: all2.lo, hi: all2.hi, strength: all2.strength, score: all2.score, blocked: all2.blocked };
      if (classifiedBoards.size >= 64) classifiedBoards.delete(classifiedBoards.keys().next().value);
      classifiedBoards.set(key, result);
    }
    return result;
  }
  function strictFlagsOf(classified, id, hand) {
    const layout = flagLayout(extval2);
    const flags = layout.names.filter((name) => hasFlagAt(layout, classified, id, name));
    if (flags.includes("isMiddlePair") && hand[0] === hand[2]) flags.push("isMiddlingPair");
    return flags;
  }
  function flagObject(classified, id, hand) {
    const object = { usesHoleCards: true };
    for (const flag of strictFlagsOf(classified, id, hand)) object[flag] = true;
    return object;
  }
  function criteriaMasks(criteria) {
    const layout = flagLayout(extval2);
    const masks = flagMasks(layout, criteria.filter((c) => c !== "isMiddlingPair"));
    masks.middling = criteria.includes("isMiddlingPair");
    masks.middlePair = flagMasks(layout, ["isMiddlePair"]);
    return masks;
  }
  var RangeManager = class _RangeManager {
    constructor(input, deadCards = []) {
      this.rawInput = input;
      this.hands = [];
      this.filteredHands = [];
      this.lastBoardCards = null;
      this.lastHandStrength = null;
      this.lastStrict = null;
      this.lastStreet = null;
      this.evaluationCache = /* @__PURE__ */ new Map();
      this.evaluatedKeys = /* @__PURE__ */ new Set();
      this.equityCache = /* @__PURE__ */ new Map();
      this.handEquity = null;
      this.matchup = null;
      if (!input) throw new Error("Input is required");
      if (!Array.isArray(input) && typeof input !== "string" && !this._isPlainObject(input)) {
        throw new Error("Input must be a string, array or object");
      }
      this.deadCards = this._validateAndExpandDeadCards(deadCards || []);
      const { hands, weights } = this._parseWeighted(input);
      this.hands = hands;
      this.handWeights = weights;
      this.filteredHands = this._filterDeadCards(hands);
    }
    _isPlainObject(value) {
      return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
    }
    // ============================================================================
    // VALIDATION METHODS
    // ============================================================================
    _isValidRank(rank) {
      if (!rank || typeof rank !== "string") return false;
      return VALID_RANKS2.includes(rank);
    }
    _isValidSuit(suit) {
      if (!suit || typeof suit !== "string") return false;
      return VALID_SUITS2.includes(suit.toLowerCase());
    }
    _isValidCard(card) {
      if (!card || typeof card !== "string" || card.length !== 2) return false;
      const rank = card[0].toUpperCase();
      const suit = card[1].toLowerCase();
      if (rank === "X" && this._isValidSuit(suit)) return true;
      if (this._isValidRank(rank) && suit === "x") return true;
      return this._isValidRank(rank) && this._isValidSuit(suit);
    }
    _isValidConcreteCard(card) {
      if (!card || typeof card !== "string" || card.length !== 2) return false;
      return this._isValidRank(card[0].toUpperCase()) && this._isValidSuit(card[1]);
    }
    // Wildcard cards ('Ax', 'Xs') are only accepted when allowWildcards is true
    _isValidHand(hand, allowWildcards = false) {
      if (!hand || typeof hand !== "string" || hand.length !== 4) return false;
      const card1 = hand.substring(0, 2);
      const card2 = hand.substring(2, 4);
      const isValidCard2 = allowWildcards ? (c) => this._isValidCard(c) : (c) => this._isValidConcreteCard(c);
      if (!isValidCard2(card1) || !isValidCard2(card2)) return false;
      return this._normalizeCard(card1) !== this._normalizeCard(card2);
    }
    // ============================================================================
    // NORMALIZATION METHODS
    // ============================================================================
    _normalizeCardOrder(card1, card2) {
      if (this._compareRanks(card1[0], card2[0]) >= 0) return [card1, card2];
      return [card2, card1];
    }
    _normalizeCard(card) {
      return card[0].toUpperCase() + card[1].toLowerCase();
    }
    _normalizeHand(hand) {
      if (!this._isValidHand(hand)) throw new Error(`Invalid hand: ${hand}`);
      const normalizedCard1 = this._normalizeCard(hand.substring(0, 2));
      const normalizedCard2 = this._normalizeCard(hand.substring(2, 4));
      const [high, low] = this._normalizeCardOrder(normalizedCard1, normalizedCard2);
      if (high[0] === low[0]) {
        const suits = [high[1], low[1]].sort();
        return high[0] + suits[0] + high[0] + suits[1];
      }
      return high + low;
    }
    normalizeNotation(input) {
      return normalizeNotation(input);
    }
    // A combo weight: a number from 0 to 1 (or a numeric string)
    _parseWeight(value, entry) {
      const weight = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
      if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0 || weight > 1) {
        throw new Error(`Invalid weight for ${entry}: ${value}. Weights are numbers from 0 to 1`);
      }
      return weight;
    }
    // ============================================================================
    // RANK & SUIT UTILITY METHODS
    // ============================================================================
    _getRankValue(rank) {
      return RANK_VALUES2[rank] ?? NaN;
    }
    _compareRanks(rank1, rank2) {
      const val1 = this._getRankValue(rank1);
      const val2 = this._getRankValue(rank2);
      if (val1 > val2) return 1;
      if (val1 < val2) return -1;
      return 0;
    }
    _getRankBelow(rank) {
      const rankIdx = VALID_RANKS2.indexOf(rank);
      if (rankIdx === -1) return null;
      if (rankIdx === VALID_RANKS2.length - 1) return null;
      return VALID_RANKS2[rankIdx + 1];
    }
    _isPocketPair(handCards2) {
      if (!handCards2 || handCards2.length !== 2) return false;
      return handCards2[0][0].toUpperCase() === handCards2[1][0].toUpperCase();
    }
    // ============================================================================
    // PATTERN DETECTION METHODS
    // ============================================================================
    // ============================================================================
    // EXTRACTION METHODS
    // ============================================================================
    _extractCardsFromHand(hand) {
      if (!hand || hand.length !== 4) return [];
      return [hand.substring(0, 2), hand.substring(2, 4)];
    }
    // ============================================================================
    // GENERATION METHODS
    // ============================================================================
    // ============================================================================
    // PARSING METHODS
    // ============================================================================
    // Parses notation, an array or an object into { hands, weights }. Later entries override earlier ones, and a
    // weight of 0 removes the combo. weights holds only combos whose weight is not 1.
    //   string: 'AA,AKs:0.5,TT+:0.25,AhKh:0.4'
    //   array:  exact combos, each 'AhKh', 'AhKh:0.4' or ['AhKh', 0.4]
    //   object: { AhKh: 0.4, AsKs: 1 } (exact combos)
    _parseWeighted(input) {
      return parseWeighted(input);
    }
    _parse(input) {
      return this._parseWeighted(input).hands;
    }
    // ============================================================================
    // INTERNAL HELPER METHODS (INSTANCE CREATION & NORMALIZATION)
    // ============================================================================
    _createFilteredInstance(filteredHands, weights = null) {
      const newInstance = Object.create(Object.getPrototypeOf(this));
      Object.assign(newInstance, this);
      if (weights) newInstance.handWeights = weights;
      newInstance.filteredHands = this._filterDeadCards(filteredHands);
      return newInstance;
    }
    // { hands, weights } from an input to include/exclude/intersect/setWeight; a RangeManager gives its own
    _weightedInput(input) {
      if (input instanceof _RangeManager) return { hands: input.filteredHands, weights: input.handWeights };
      if (typeof input === "string" || Array.isArray(input) || this._isPlainObject(input)) return this._parseWeighted(input);
      throw new Error("Input must be range notation, an array of hands, an object of weights or a RangeManager");
    }
    // ============================================================================
    // COMBO WEIGHTS (frequencies from 0 to 1)
    // ============================================================================
    /** The weight of a combo in the range: 0 to 1, 0 when it is not in the range. */
    weightOf(hand) {
      const normalized = this._normalizeHand(hand);
      if (!this.contains(normalized)) return 0;
      return this._weight(normalized);
    }
    _weight(hand) {
      return this.handWeights[hand] ?? 1;
    }
    /** Every combo in the range with its weight: { AhKh: 0.5, AsAd: 1, ... }. */
    weights() {
      return Object.fromEntries(this.filteredHands.map((hand) => [hand, this._weight(hand)]));
    }
    /** The sum of the combos' weights: the range's size in weighted combos. */
    weightedSize() {
      return this.filteredHands.reduce((sum, hand) => sum + this._weight(hand), 0);
    }
    /** True when any combo has a weight other than 1. */
    isWeighted() {
      return this.filteredHands.some((hand) => this._weight(hand) !== 1);
    }
    // A new range from hand -> weight pairs; weights at or below 0 drop the combo, above 1 are capped at 1
    _withWeightMap(map) {
      const hands = [];
      const weights = {};
      for (const [hand, raw] of map) {
        const weight = Math.min(1, raw);
        if (!(weight > 1e-12)) continue;
        hands.push(hand);
        if (weight !== 1) weights[hand] = weight;
      }
      return this._createFilteredInstance(hands, weights);
    }
    /** Multiplies every combo's weight by factor (capped at 1). scale(0.5) halves the range's frequencies. */
    scale(factor) {
      if (typeof factor !== "number" || !Number.isFinite(factor) || factor < 0) throw new Error("scale needs a number of 0 or more");
      return this._withWeightMap(this.filteredHands.map((hand) => [hand, this._weight(hand) * factor]));
    }
    /** Sets the weight of the combos of `input` that are in the range: setWeight('AKs', 0.5). 0 removes them. */
    setWeight(input, weight) {
      const value = this._parseWeight(weight, "setWeight");
      const targets = new Set(this._parse(input));
      return this._withWeightMap(this.filteredHands.map((hand) => [hand, targets.has(hand) ? value : this._weight(hand)]));
    }
    // ============================================================================
    // FILTERING METHODS
    // ============================================================================
    handContainsDeadCard(hand, deadCards) {
      if (!deadCards || deadCards.length === 0) return false;
      return this._handHasCardIn(hand, this._toCardSet(deadCards));
    }
    // Expands wildcards once so per-hand checks are O(1) Set lookups
    _toCardSet(cards) {
      return new Set(this._parseCardArray(cards));
    }
    _handHasCardIn(hand, cardSet) {
      return cardSet.has(this._normalizeCard(hand.substring(0, 2))) || cardSet.has(this._normalizeCard(hand.substring(2, 4)));
    }
    _withoutCards(hands, cards) {
      if (!cards || cards.length === 0) return hands;
      const cardSet = this._toCardSet(cards);
      return hands.filter((hand) => !this._handHasCardIn(hand, cardSet));
    }
    _filterDeadCards(hands) {
      return this._withoutCards(hands, this.deadCards);
    }
    handHasSuit(hand, suit) {
      const normalizedSuit = suit.toLowerCase();
      if (!this._isValidSuit(normalizedSuit)) return false;
      const [card1, card2] = this._extractCardsFromHand(hand);
      return card1[1] === normalizedSuit || card2[1] === normalizedSuit;
    }
    handSuitedOf(hand, suit) {
      const normalizedSuit = suit.toLowerCase();
      if (!this._isValidSuit(normalizedSuit)) return false;
      const [card1, card2] = this._extractCardsFromHand(hand);
      return card1[1] === normalizedSuit && card2[1] === normalizedSuit;
    }
    /**
     * Removes hands (notation, an array of hands, weights or a RangeManager) or every hand holding one of a list of
     * cards (['Ah', 'Kx']). A weighted input removes that share of each combo: excluding 'AKs:0.25' keeps 75% of AKs.
     */
    exclude(input) {
      if (Array.isArray(input) && (input.length === 0 || this._isValidCard(input[0]))) {
        return this._createFilteredInstance(this._withoutCards(this.filteredHands, input));
      }
      const { hands, weights } = this._weightedInput(input);
      const removed = new Map(hands.map((hand) => [hand, weights[hand] ?? 1]));
      return this._withWeightMap(this.filteredHands.map((hand) => [hand, this._weight(hand) * (1 - (removed.get(hand) ?? 0))]));
    }
    hasSuit(suit) {
      const normalizedSuit = suit.toLowerCase();
      if (!this._isValidSuit(normalizedSuit)) throw new Error(`Invalid suit: ${suit}`);
      const filtered = this.filteredHands.filter((hand) => this.handHasSuit(hand, normalizedSuit));
      return this._createFilteredInstance(filtered);
    }
    suitedOf(suit) {
      const normalizedSuit = suit.toLowerCase();
      if (!this._isValidSuit(normalizedSuit)) throw new Error(`Invalid suit: ${suit}`);
      const filtered = this.filteredHands.filter((hand) => this.handSuitedOf(hand, normalizedSuit));
      return this._createFilteredInstance(filtered);
    }
    _toCriterionKey(criterion) {
      return CRITERIA_LOOKUP.get(criterion) || criterion;
    }
    _normalizeCriteria(criteria) {
      if (!Array.isArray(criteria)) throw new Error("Criteria must be an array");
      return criteria.map((c) => this._toCriterionKey(c));
    }
    _normalizeBoardCards(boardCards) {
      if (!Array.isArray(boardCards) || boardCards.length === 0) throw new Error("Board cards are required");
      const normalized = boardCards.map((card) => {
        if (!this._isValidConcreteCard(card)) throw new Error(`Invalid board card: ${card}`);
        return this._normalizeCard(card);
      });
      if (new Set(normalized).size !== normalized.length) throw new Error("Board cards must be unique");
      return normalized;
    }
    // Normalizes a hand + board for the public evaluation methods and rejects overlapping cards
    _prepareEvaluationInput(hand, boardCards) {
      const normalizedHand = this._normalizeHand(hand);
      const board = this._normalizeBoardCards(boardCards);
      const overlap = this._extractCardsFromHand(normalizedHand).filter((c) => board.includes(c));
      if (overlap.length > 0) throw new Error(`Hand ${hand} shares cards with board: ${overlap.join(", ")}`);
      return [normalizedHand, board];
    }
    async _loadEvaluator() {
      extval2 = await loadExtVal();
      return extval2;
    }
    async _loadBitVal() {
      bitval2 = await loadBitVal();
      return bitval2;
    }
    // Accepts the positional `strict` boolean used by earlier versions, or an options object
    _parseEvaluationOptions(strictOrOptions) {
      const options = strictOrOptions && typeof strictOrOptions === "object" ? strictOrOptions : { strict: strictOrOptions };
      const strict = options.strict ?? true;
      if (typeof strict !== "boolean") throw new Error("strict must be a boolean");
      const street = this._validateStreet(options.street);
      return { strict, street, excludeBoardPlays: options.excludeBoardPlays === true };
    }
    _validateStreet(street) {
      if (street === void 0 || street === null) return null;
      if (!STREETS.has(street)) throw new Error(`Invalid street: ${street}. Use 'flop', 'turn' or 'river'`);
      return street;
    }
    // Synchronous: callers must `await this._loadEvaluator()` first. Hand and board must not overlap.
    // The hand is passed as hole cards, so board-relative labels, draws and usesHoleCards are the hand's own.
    _evaluateSync(hand, boardCards, strict, street = null) {
      const handCards2 = this._extractCardsFromHand(hand);
      const cards = [...handCards2, ...boardCards];
      if (cards.length < 5) {
        throw new Error(`Need at least 5 unique cards total (hand + board). Got ${cards.length} unique cards from hand [${handCards2.join(", ")}] and board [${boardCards.join(", ")}]`);
      }
      const result = extval2.evaluateHand(cards, { strict, holeCards: handCards2, street });
      for (const evalObj of Object.values(result)) this._addDerivedFlags(evalObj, handCards2);
      return result;
    }
    // isMiddlingPair: a pocket pair between the highest and lowest board cards (extval's isMiddlePair also
    // covers pairing a middle board card)
    _addDerivedFlags(evalObj, handCards2) {
      const isMiddlingPair = evalObj.isMiddlePair === true && this._isPocketPair(handCards2);
      evalObj.isMiddlingPair = isMiddlingPair;
      if (evalObj.keyCards) evalObj.keyCards.isMiddlingPair = isMiddlingPair ? [...evalObj.keyCards.isMiddlePair] : [];
      if (evalObj.kickerCards) evalObj.kickerCards.isMiddlingPair = isMiddlingPair ? [...evalObj.kickerCards.isMiddlePair] : [];
      return evalObj;
    }
    async _evaluateHandWithBoard(hand, boardCards, options) {
      await this._loadEvaluator();
      return this._evaluateSync(hand, boardCards, options.strict, options.street);
    }
    _cacheKey(hand, boardKey, strict, street = null) {
      return `${hand}|${boardKey}|strict:${strict}|street:${street ?? "auto"}`;
    }
    // Synchronous cached evaluation; boardKey is boardCards.join(',') computed once per call
    _getCachedOrEvaluate(hand, boardCards, boardKey, strict, street = null) {
      const cacheKey = this._cacheKey(hand, boardKey, strict, street);
      let evaluations = this.evaluationCache.get(cacheKey);
      if (!evaluations) {
        evaluations = Object.values(this._evaluateSync(hand, boardCards, strict, street));
        this.evaluationCache.set(cacheKey, evaluations);
      }
      return evaluations;
    }
    // With excludeBoardPlays, a made hand that uses no hole card (e.g. AK on 8-8-3 "making" a pair) does not count
    _criterionMatches(evalObj, criterion, excludeBoardPlays) {
      if (evalObj[criterion] !== true) return false;
      return !(excludeBoardPlays && MADE_HANDS.has(criterion) && evalObj.usesHoleCards === false);
    }
    _evaluationsMatchCriteria(evaluations, normalizedCriteria, excludeBoardPlays) {
      return evaluations.some(
        (evalObj) => normalizedCriteria.some((c) => this._criterionMatches(evalObj, c, excludeBoardPlays))
      );
    }
    async makesHand(criteria, boardCards = [], strictOrOptions = true) {
      const { normalizedCriteria, board } = this._validateCriteriaAndBoard(criteria, boardCards);
      const options = this._parseEvaluationOptions(strictOrOptions);
      await this._loadEvaluator();
      const boardSet = new Set(board);
      const boardKey = board.join(",");
      if (options.strict && !options.excludeBoardPlays && board.length >= 3 && board.length <= 5) {
        const { lo, hi } = classifiedBoard(board, options.street);
        const masks = criteriaMasks(normalizedCriteria);
        const filtered2 = this.filteredHands.filter((hand) => {
          const handCards2 = this._extractCardsFromHand(hand);
          if (handCards2.some((card) => boardSet.has(card))) return false;
          this.evaluatedKeys.add(this._cacheKey(hand, boardKey, true, options.street));
          const id = idOfHand(hand);
          if ((lo[id] & masks.lo) !== 0 || (hi[id] & masks.hi) !== 0) return true;
          return masks.middling && ((lo[id] & masks.middlePair.lo) !== 0 || (hi[id] & masks.middlePair.hi) !== 0) && hand[0] === hand[2];
        });
        return this._createEvaluatedInstance(filtered2, board, normalizedCriteria, options);
      }
      const filtered = this.filteredHands.filter((hand) => {
        const handCards2 = this._extractCardsFromHand(hand);
        if (handCards2.some((card) => boardSet.has(card))) return false;
        const evaluations = this._getCachedOrEvaluate(hand, board, boardKey, options.strict, options.street);
        return this._evaluationsMatchCriteria(evaluations, normalizedCriteria, options.excludeBoardPlays);
      });
      return this._createEvaluatedInstance(filtered, board, normalizedCriteria, options);
    }
    async evaluateHand(hand, boardCards, strictOrOptions = true) {
      const [normalizedHand, board] = this._prepareEvaluationInput(hand, boardCards);
      const evaluation = await this._evaluateHandWithBoard(normalizedHand, board, this._parseEvaluationOptions(strictOrOptions));
      return {
        is: (criteria) => this._filterEvaluation(evaluation, criteria, false),
        isAll: (criteria) => this._filterEvaluation(evaluation, criteria, true)
      };
    }
    async getObject(hand, boardCards, strictOrOptions = true) {
      const [normalizedHand, board] = this._prepareEvaluationInput(hand, boardCards);
      return await this._evaluateHandWithBoard(normalizedHand, board, this._parseEvaluationOptions(strictOrOptions));
    }
    /** Adds hands; a combo already in the range keeps the larger of its two weights. */
    include(input) {
      const { hands, weights } = this._weightedInput(input);
      const map = new Map(this.filteredHands.map((hand) => [hand, this._weight(hand)]));
      hands.forEach((hand) => map.set(hand, Math.max(map.get(hand) ?? 0, weights[hand] ?? 1)));
      return this._withWeightMap(map);
    }
    /** Keeps the hands also in `input`; weights multiply, so intersecting with 'AKs:0.5' halves AKs. */
    intersect(input) {
      const { hands, weights } = this._weightedInput(input);
      const other = new Map(hands.map((hand) => [hand, weights[hand] ?? 1]));
      return this._withWeightMap(this.filteredHands.filter((hand) => other.has(hand)).map((hand) => [hand, this._weight(hand) * other.get(hand)]));
    }
    _validateAndExpandDeadCards(deadCards) {
      if (!Array.isArray(deadCards)) throw new Error("Dead cards must be an array");
      deadCards.forEach((card) => {
        if (!this._isValidCard(card)) throw new Error(`Invalid card: ${card}`);
      });
      return this._parseCardArray(deadCards);
    }
    setDeadCards(deadCards) {
      const expanded = this._validateAndExpandDeadCards(deadCards);
      const filtered = this._withoutCards(this.filteredHands, expanded);
      const newInstance = this._createFilteredInstance(filtered);
      newInstance.deadCards = expanded;
      newInstance.handEquity = null;
      newInstance.matchup = null;
      return newInstance;
    }
    _validateCriteriaAndBoard(criteria, boardCards) {
      if (!Array.isArray(criteria)) throw new Error("Criteria must be an array");
      const board = this._normalizeBoardCards(boardCards);
      const invalidCriteria = criteria.filter((c) => typeof c !== "string" || !VALID_CRITERIA.has(this._toCriterionKey(c)));
      if (invalidCriteria.length > 0) throw new Error(`Invalid criteria: ${invalidCriteria.join(", ")}`);
      return { normalizedCriteria: this._normalizeCriteria(criteria), board };
    }
    // Board/criteria/strict/street state is set only on the returned instance, never on `this`
    _createEvaluatedInstance(filtered, board, normalizedCriteria, options) {
      const instance = this._createFilteredInstance(filtered);
      instance.lastBoardCards = board;
      instance.lastHandStrength = normalizedCriteria;
      instance.lastStrict = options.strict;
      instance.lastStreet = options.street;
      return instance;
    }
    async _filterByCombinations(criteria, boardCards, minHandCards, strictOrOptions = true) {
      const { normalizedCriteria, board } = this._validateCriteriaAndBoard(criteria, boardCards);
      const options = this._parseEvaluationOptions(strictOrOptions);
      if (board.length + 2 < 5) return this._createEvaluatedInstance([], board, normalizedCriteria, options);
      await this._loadEvaluator();
      const boardSet = new Set(board);
      const boardKey = board.join(",");
      const filtered = this.filteredHands.filter((hand) => {
        const handCards2 = this._extractCardsFromHand(hand);
        if (handCards2.some((card) => boardSet.has(card))) return false;
        const evaluations = this._getCachedOrEvaluate(hand, board, boardKey, options.strict, options.street);
        return this._evaluationsMatchWithHandCards(evaluations, normalizedCriteria, handCards2, minHandCards, options.excludeBoardPlays);
      });
      return this._createEvaluatedInstance(filtered, board, normalizedCriteria, options);
    }
    async hitsHand(criteria, boardCards, strictOrOptions = true) {
      return await this._filterByCombinations(criteria, boardCards, 1, strictOrOptions);
    }
    async hitsHandBoth(criteria, boardCards, strictOrOptions = true) {
      return await this._filterByCombinations(criteria, boardCards, 2, strictOrOptions);
    }
    _getCachedOnly(hand, boardCards) {
      if (!boardCards) return null;
      const boardKey = boardCards.join(",");
      const street = this.lastStreet ?? null;
      if (this.lastStrict !== null && this.lastStrict !== void 0) {
        const key = this._cacheKey(hand, boardKey, this.lastStrict, street);
        const cached = this.evaluationCache.get(key);
        if (cached) return cached;
        return this.evaluatedKeys.has(key) ? this._getCachedOrEvaluate(hand, boardCards, boardKey, this.lastStrict, street) : null;
      }
      return this.evaluationCache.get(this._cacheKey(hand, boardKey, true, street)) || this.evaluationCache.get(this._cacheKey(hand, boardKey, false, street)) || null;
    }
    _parseSingleCard(card) {
      if (!card || typeof card !== "string" || card.length !== 2) return [card];
      const rank = card[0].toUpperCase();
      const suit = card[1].toLowerCase();
      if (rank === "X" && this._isValidSuit(suit)) return VALID_RANKS2.map((r) => r + suit);
      if (this._isValidRank(rank) && suit === "x") return VALID_SUITS2.map((s) => rank + s);
      return [rank + suit];
    }
    _parseCardArray(cards) {
      if (!Array.isArray(cards)) throw new Error("Cards must be an array");
      return cards.flatMap((c) => this._parseSingleCard(c));
    }
    _checkCardsInArray(cards, targetArray, and) {
      if (!Array.isArray(cards)) throw new Error("Cards must be an array");
      if (cards.length === 0) return false;
      const expandedCards = this._parseCardArray(cards);
      const normalizedTarget = targetArray.map((c) => {
        if (!c || typeof c !== "string") return c;
        return c[0].toUpperCase() + (c[1] || "").toLowerCase();
      });
      if (and) return expandedCards.every((c) => normalizedTarget.includes(c));
      return expandedCards.some((c) => normalizedTarget.includes(c));
    }
    _normalizeHandStrength(handStrength) {
      return this._toCriterionKey(handStrength);
    }
    _getHandStrengthKeys(handStrength, cachedCriteria) {
      if (handStrength) return [this._normalizeHandStrength(handStrength)];
      return cachedCriteria || [];
    }
    _checkCardsInHandStrengthObject(cards, strengthObj, handStrengthKeys, and) {
      if (!strengthObj || !handStrengthKeys || handStrengthKeys.length === 0) return false;
      const results = handStrengthKeys.map((key) => {
        const cardArray = strengthObj[key] || [];
        return this._checkCardsInArray(cards, cardArray, and);
      });
      return and ? results.every((r) => r) : results.some((r) => r);
    }
    _filterByHandStrengthCards(cards, propertyName, handStrengthKeys, and) {
      const filtered = [];
      for (const hand of this.filteredHands) {
        const evaluations = this._getCachedOnly(hand, this.lastBoardCards);
        if (evaluations && evaluations.some((evalObj) => this._checkCardsInHandStrengthObject(cards, evalObj[propertyName], handStrengthKeys, and))) filtered.push(hand);
      }
      return this._createFilteredInstance(filtered);
    }
    hasKicker(cards, and = false, handStrength = null) {
      if (!this.lastBoardCards) return this._createFilteredInstance([]);
      const handStrengthKeys = this._getHandStrengthKeys(handStrength, this.lastHandStrength);
      if (handStrengthKeys.length === 0) return this._createFilteredInstance([]);
      return this._filterByHandStrengthCards(cards, "kickerCards", handStrengthKeys, and);
    }
    hasKeyCard(cards, and = false, handStrength = null) {
      if (!this.lastBoardCards) return this._createFilteredInstance([]);
      const handStrengthKeys = this._getHandStrengthKeys(handStrength, this.lastHandStrength);
      if (handStrengthKeys.length === 0) return this._createFilteredInstance([]);
      return this._filterByHandStrengthCards(cards, "keyCards", handStrengthKeys, and);
    }
    getKeyCards(handStrength = null) {
      if (!this.lastBoardCards) return [];
      const handStrengthKeys = this._getHandStrengthKeys(handStrength, this.lastHandStrength);
      if (handStrengthKeys.length === 0) return [];
      const allKeyCards = /* @__PURE__ */ new Set();
      for (const hand of this.filteredHands) {
        const evaluations = this._getCachedOnly(hand, this.lastBoardCards);
        if (!evaluations) continue;
        for (const evalObj of evaluations) {
          if (!evalObj.keyCards) continue;
          for (const criterion of handStrengthKeys) {
            const keyCards = evalObj.keyCards[criterion];
            if (Array.isArray(keyCards)) {
              keyCards.forEach((card) => {
                if (card && typeof card === "string") {
                  const normalized = card[0].toUpperCase() + (card[1] || "").toLowerCase();
                  allKeyCards.add(normalized);
                }
              });
            }
          }
        }
      }
      return Array.from(allKeyCards).sort();
    }
    // A criterion counts only when at least minHandCards of the hand's cards are among its key cards
    _evaluationsMatchWithHandCards(evaluations, criteria, handCards2, minHandCards, excludeBoardPlays = false) {
      return evaluations.some((evalObj) => criteria.some(
        (c) => this._criterionMatches(evalObj, c, excludeBoardPlays) && this._handCardsInKeyCardsForCriterion(handCards2, evalObj, c) >= minHandCards
      ));
    }
    _handCardsInKeyCardsForCriterion(normalizedHandCards, evalObj, criterion) {
      const keyCards = (evalObj.keyCards?.[criterion] || []).map((c) => {
        if (!c || typeof c !== "string") return c;
        return c[0].toUpperCase() + (c[1] || "").toLowerCase();
      });
      return normalizedHandCards.filter((c) => keyCards.includes(c)).length;
    }
    _filterEvaluation(evaluation, criteria, matchAll) {
      const criteriaArray = Array.isArray(criteria) ? criteria : [criteria];
      const normalizedCriteria = criteriaArray.map((c) => this._toCriterionKey(c));
      const filtered = {};
      for (const [combo, evalObj] of Object.entries(evaluation)) {
        let matches = false;
        if (matchAll) {
          matches = normalizedCriteria.every((c) => evalObj[c] === true);
        } else {
          matches = normalizedCriteria.some((c) => evalObj[c] === true);
        }
        if (matches) {
          filtered[combo] = evalObj;
        }
      }
      return filtered;
    }
    // ============================================================================
    // ANALYSIS METHODS (EQUITY, STRENGTH, BREAKDOWN, BLOCKERS)
    // ============================================================================
    // A board for analysis: empty (preflop), or 3-5 unique cards
    _normalizeAnalysisBoard(boardCards) {
      if (boardCards === void 0 || boardCards === null) return [];
      if (!Array.isArray(boardCards)) throw new Error("Board cards must be an array");
      if (boardCards.length === 0) return [];
      const board = this._normalizeBoardCards(boardCards);
      if (board.length < 3 || board.length > 5) throw new Error(`Board must have 0 or 3 to 5 cards, got ${board.length}`);
      return board;
    }
    // A board for per-hand evaluation: 3-5 unique cards
    _requireEvaluationBoard(boardCards) {
      const board = this._normalizeAnalysisBoard(boardCards);
      if (board.length === 0) throw new Error("Board cards are required");
      return board;
    }
    // Villain as { hands, weights }: range notation, an array of hands or cards, weights, or another RangeManager
    _resolveVillain(villain) {
      if (villain instanceof _RangeManager) return { hands: villain.toArray(), weights: villain.handWeights };
      if (Array.isArray(villain) && villain.length === 2 && villain.every((c) => typeof c === "string" && this._isValidConcreteCard(c))) {
        return { hands: [this._normalizeHand(villain.join(""))], weights: {} };
      }
      if (typeof villain === "string" || Array.isArray(villain) || this._isPlainObject(villain)) return this._parseWeighted(villain);
      throw new Error("Villain must be range notation, an array of hands, an object of weights, or a RangeManager");
    }
    _weightKey(hands, weights) {
      return hands.map((hand) => weights[hand] === void 0 ? hand : `${hand}:${weights[hand]}`).sort().join(",");
    }
    // A share of 0-1, as a number (0.8) or a percentage string ('80%')
    _parseShare(value, label = "Equity") {
      let share = value;
      if (typeof value === "string") {
        const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*%$/);
        if (!match) throw new Error(`${label} must be a number from 0 to 1 or a percentage like '80%', got '${value}'`);
        share = Number(match[1]) / 100;
      }
      if (typeof share !== "number" || Number.isNaN(share) || share < 0 || share > 1) {
        throw new Error(`${label} must be a number from 0 to 1 or a percentage like '80%', got ${value}`);
      }
      return share;
    }
    _prepareEquity(villain, boardCards, options = {}) {
      const board = this._normalizeAnalysisBoard(boardCards);
      const { hands: villainHands, weights: villainWeights } = this._resolveVillain(villain);
      const extraDead = options.deadCards ? this._validateAndExpandDeadCards(options.deadCards) : [];
      const deadCards = [.../* @__PURE__ */ new Set([...this.deadCards, ...extraDead])];
      const iterations = options.iterations ?? 1e4;
      if (!Number.isInteger(iterations) || iterations < 1) throw new Error("iterations must be a positive integer");
      const key = `${this._weightKey(villainHands, villainWeights)}|${board.join(",")}|${[...deadCards].sort().join(",")}|${iterations}`;
      return { board, villainHands, villainWeights, deadCards, iterations, key };
    }
    /**
     * Equity of this whole range against villain, counting every possible runout (exact on the flop and
     * turn, a Monte Carlo estimate preflop). Combos that clash with the board or dead cards are skipped.
     * With no arguments, totals the equity stored by getEquity() for the hands in the range.
     */
    async equity(villain, boardCards = [], options = {}) {
      if (villain === void 0) {
        const handEquity = this._requireStoredEquity();
        const totals = { win: 0, tie: 0, lose: 0 };
        for (const hand of this.filteredHands) {
          const weight = this._weight(hand);
          for (const key of ["win", "tie", "lose"]) totals[key] += handEquity[hand][key] * weight;
        }
        const total = totals.win + totals.tie + totals.lose;
        return { ...totals, equity: total ? (totals.win + totals.tie / 2) / total : null };
      }
      const { board, villainHands, villainWeights, deadCards, iterations } = this._prepareEquity(villain, boardCards, options);
      if (this.filteredHands.length === 0 || villainHands.length === 0) return { win: 0, tie: 0, lose: 0, equity: null };
      const bv = await this._loadBitVal();
      const entries = (hands, weights) => hands.map((hand) => weights[hand] === void 0 ? hand : { hand, weight: weights[hand] });
      const result = await bv.compareRange(entries(this.filteredHands, this.handWeights), entries(villainHands, villainWeights), board, deadCards, 5, iterations, true, null, 100, false);
      return this._equityResult(result.win, result.tie, result.lose);
    }
    /**
     * Equity of each hand in this range against villain, as { hand: { win, tie, lose, equity } }.
     * equity is null for a hand that cannot be dealt (it shares a card with the board or dead cards).
     * With no arguments, returns the equity stored by getEquity() for the hands in the range.
     */
    async equityByHand(villain, boardCards = [], options = {}) {
      if (villain === void 0) {
        const handEquity = this._requireStoredEquity();
        return Object.fromEntries(this.filteredHands.map((hand) => [hand, handEquity[hand]]));
      }
      const prepared = this._prepareEquity(villain, boardCards, options);
      await this._fillHandEquity(this.filteredHands, prepared);
      return Object.fromEntries(this.filteredHands.map((hand) => [hand, this.equityCache.get(`${hand}|${prepared.key}`)]));
    }
    // Runs the equity engine: per-hand { win, tie, lose } arrays for hero (and villain against hero with both)
    async _runEngine(heroHands, heroWeights, villainHands, villainWeights, board, deadCards, iterations, both) {
      const bv = await this._loadBitVal();
      const heroIds = heroHands.map(idOfHand);
      const villainIds = villainHands.map(idOfHand);
      const weightArray = (hands, ids, weights) => {
        const array = new Float64Array(COMBO_COUNT);
        hands.forEach((hand, i) => {
          array[ids[i]] += weights[hand] ?? 1;
        });
        return array;
      };
      return rangeEquity(bv, {
        heroIds,
        villainIds,
        heroWeight: weightArray(heroHands, heroIds, heroWeights),
        villainWeight: weightArray(villainHands, villainIds, villainWeights),
        board: board.map(cardIndex),
        dead: deadCards.map(cardIndex),
        iterations,
        both
      });
    }
    // Computes and caches the equity of every hand not cached yet, in one engine pass
    async _fillHandEquity(hands, { board, villainHands, villainWeights, deadCards, iterations, key }) {
      const missing = hands.filter((hand) => !this.equityCache.has(`${hand}|${key}`));
      if (missing.length === 0) return;
      const blockedCards = /* @__PURE__ */ new Set([...board, ...deadCards]);
      const isBlocked = (hand) => this._extractCardsFromHand(hand).some((c) => blockedCards.has(c));
      const live = villainHands.length === 0 ? [] : missing.filter((hand) => !isBlocked(hand));
      const none = () => ({ win: 0, tie: 0, lose: 0, equity: null });
      for (const hand of missing) this.equityCache.set(`${hand}|${key}`, none());
      if (live.length === 0) return;
      const { hero } = await this._runEngine(live, {}, villainHands, villainWeights, board, deadCards, iterations, false);
      live.forEach((hand, i) => this.equityCache.set(`${hand}|${key}`, this._equityResult(hero.win[i], hero.tie[i], hero.lose[i])));
    }
    _equityResult(win, tie, lose) {
      const total = win + tie + lose;
      return { win, tie, lose, equity: total ? (win + tie / 2) / total : null };
    }
    /**
     * Runs equity against villain once for every hand and stores it on the returned range, so the equity
     * filters (equityAbove, equityBelow, equityBetween) and equity()/equityByHand() can read it without
     * recomputing. Chainable: await rm.getEquity('QQ+', board).equityAbove('60%').hasSuit('s')
     */
    async getEquity(villain, boardCards = [], options = {}) {
      if (villain === void 0) throw new Error("getEquity needs a villain range");
      const bands = this._resolveBands(options.bands);
      const shapeEnough = this._parseShare(options.shape?.enough ?? 0.1, "shape.enough");
      if (shapeEnough === 0) throw new Error("shape.enough must be above 0");
      const topEnd = this._parseShare(options.shape?.topEnd ?? 0.05, "shape.topEnd");
      if (topEnd === 0) throw new Error("shape.topEnd must be above 0");
      const minDominant = this._parseShare(options.shape?.minDominant ?? 0.5, "shape.minDominant");
      const nutsMinEquity = this._parseShare(options.nuts?.minEquity ?? 0.9, "nuts.minEquity");
      const prepared = this._prepareEquity(villain, boardCards, options);
      await this._fillHandEquity(this.filteredHands, prepared);
      const handEquity = {};
      for (const hand of this.filteredHands) handEquity[hand] = this.equityCache.get(`${hand}|${prepared.key}`);
      const instance = this._createFilteredInstance(this.filteredHands);
      instance.handEquity = handEquity;
      instance.matchup = {
        villainHands: prepared.villainHands,
        villainWeights: prepared.villainWeights,
        parentWeights: this.handWeights,
        board: prepared.board,
        deadCards: prepared.deadCards,
        iterations: prepared.iterations,
        key: prepared.key,
        bands,
        shapeEnough,
        topEnd,
        minDominant,
        nutsMinEquity,
        // The range at against() time: the hands later filters choose from, for shape contiguity
        parentHands: [...this.filteredHands]
      };
      return instance;
    }
    /**
     * Sets villain's range and the board for range vs range analysis: runs hero's equity once (as getEquity)
     * and stores the matchup, so buckets, bucket filters, compare(), compareTo(), defend() and
     * bluffCandidates() work without repeating villain and board.
     * options: { bands, deadCards, iterations, shape: { enough, minDominant, topEnd } }: enough is the share at
     * which an end of the range counts as fully present for the shape scores (default 0.1); minDominant the
     * score a shape needs to be named dominant (default 0.5); topEnd the strongest share of combos that counts
     * as the top end for capping (default 0.05); nuts.minEquity the equity against the other range a hand needs
     * to count as effective nuts (default 0.9).
     */
    async against(villain, boardCards = [], options = {}) {
      if (villain === void 0) throw new Error("against needs a villain range");
      return this.getEquity(villain, boardCards, options);
    }
    _requireStoredEquity() {
      if (!this.handEquity) throw new Error("No equity yet: call getEquity(villain, board) first");
      const missing = this.filteredHands.filter((hand) => !Object.hasOwn(this.handEquity, hand));
      if (missing.length > 0) {
        throw new Error(`${missing.length} hand(s) have no equity (e.g. ${missing[0]}, added after getEquity): call getEquity again`);
      }
      return this.handEquity;
    }
    _filterByStoredEquity(matches) {
      const handEquity = this._requireStoredEquity();
      const filtered = this.filteredHands.filter((hand) => handEquity[hand].equity !== null && matches(handEquity[hand].equity));
      return this._createFilteredInstance(filtered);
    }
    // With only thresholds, filters synchronously on the equity stored by getEquity(). Given villain (and board,
    // options) as in 3.6.0, runs getEquity first and returns a RangeQuery.
    _equityFilter(buildMatcher, equityArgs) {
      if (equityArgs.length > 0 && equityArgs[0] !== void 0) {
        return new RangeQuery(Promise.resolve().then(() => {
          const matches = buildMatcher();
          return this.getEquity(...equityArgs).then((range) => range._filterByStoredEquity(matches));
        }));
      }
      return this._filterByStoredEquity(buildMatcher());
    }
    /** Hands whose stored equity is greater than min (0-1 or '80%'). */
    equityAbove(min, ...equityArgs) {
      return this._equityFilter(() => {
        const threshold = this._parseShare(min);
        return (e) => e > threshold;
      }, equityArgs);
    }
    /** Hands whose stored equity is less than max (0-1 or '20%'). */
    equityBelow(max, ...equityArgs) {
      return this._equityFilter(() => {
        const threshold = this._parseShare(max);
        return (e) => e < threshold;
      }, equityArgs);
    }
    /** Hands whose stored equity is between min and max, inclusive (0-1 or '70%'). */
    equityBetween(min, max, ...equityArgs) {
      return this._equityFilter(() => {
        const low = this._parseShare(min);
        const high = this._parseShare(max);
        if (low > high) throw new Error(`Equity range is empty: min ${min} is above max ${max}`);
        return (e) => e >= low && e <= high;
      }, equityArgs);
    }
    /**
     * Every hand that can be dealt on this board, strongest first, with its made hand:
     * [{ hand, category, strength, rank, value, weight }]. rank compares element by element (higher is better);
     * value is the same order as one integer (sorted by it);
     * it reflects the made hand only, not draws.
     */
    async rankHands(boardCards, options = {}) {
      const board = this._requireEvaluationBoard(boardCards);
      const street = this._validateStreet(options.street);
      await Promise.all([this._loadEvaluator(), this._loadBitVal()]);
      const boardSet = new Set(board);
      const ranked = [];
      for (const hand of this.filteredHands) {
        const handCards2 = this._extractCardsFromHand(hand);
        if (handCards2.some((c) => boardSet.has(c))) continue;
        ranked.push({ ...this._rankSync(hand, board, street), value: this._handValue(hand, board), weight: this._weight(hand) });
      }
      return ranked.sort((a, b) => b.value - a.value);
    }
    // The made hand's strength as one integer (poker-bitvaljs's evaluateSuits value, which poker-extval's core
    // returns for every combo of a board at once): higher beats lower, equal ties. Needs _loadEvaluator() first.
    _handValue(hand, board) {
      return classifiedBoard(board, null).score[idOfHand(hand)];
    }
    // Synchronous, cached: the made hand of one combo on the board. Needs _loadEvaluator() first.
    _rankSync(hand, board, street = null) {
      const cacheKey = `rank|${hand}|${board.join(",")}|street:${street ?? "auto"}`;
      let result = this.evaluationCache.get(cacheKey);
      if (!result) {
        const handCards2 = this._extractCardsFromHand(hand);
        const flat = extval2.evaluate([...handCards2, ...board], { holeCards: handCards2, street });
        result = { hand, category: flat.category, strength: flat.strength, rank: flat.rank };
        this.evaluationCache.set(cacheKey, result);
      }
      return result;
    }
    // The given share of hands from one end of the ranking; hands tied with the last one taken are kept too
    async _takeByStrength(portion, boardCards, options, fromTop) {
      const share = this._parseShare(portion, "Portion");
      const ranked = await this.rankHands(boardCards, options);
      if (fromTop === false) ranked.reverse();
      const target = share * ranked.reduce((sum, r) => sum + r.weight, 0);
      if (ranked.length === 0 || target <= 1e-12) return this._createFilteredInstance([]);
      let cumulative = 0;
      let cutoff = ranked[ranked.length - 1].value;
      for (const r of ranked) {
        cumulative += r.weight;
        if (cumulative >= target - 1e-9) {
          cutoff = r.value;
          break;
        }
      }
      const kept = new Set(ranked.filter((r) => fromTop ? r.value >= cutoff : r.value <= cutoff).map((r) => r.hand));
      return this._createFilteredInstance(this.filteredHands.filter((hand) => kept.has(hand)));
    }
    /** The strongest share of the range on this board (0-1 or '20%'), by made hand. */
    async strongest(portion, boardCards, options = {}) {
      return this._takeByStrength(portion, boardCards, options, true);
    }
    /** The weakest share of the range on this board (0-1 or '20%'), by made hand. */
    async weakest(portion, boardCards, options = {}) {
      return this._takeByStrength(portion, boardCards, options, false);
    }
    /**
     * How the range hits the board: { total, flags: { isPair: { count, share, combos }, ... } } for every flag
     * held by at least one hand, most common first. Hands that share a card with the board are left out.
     */
    async breakdown(boardCards, options = {}) {
      const board = this._requireEvaluationBoard(boardCards);
      const street = this._validateStreet(options.street);
      await this._loadEvaluator();
      const boardSet = new Set(board);
      const boardKey = board.join(",");
      const combosByFlag = /* @__PURE__ */ new Map();
      const classified = classifiedBoard(board, street);
      let total = 0;
      let totalWeight = 0;
      for (const hand of this.filteredHands) {
        if (this._extractCardsFromHand(hand).some((c) => boardSet.has(c))) continue;
        total++;
        totalWeight += this._weight(hand);
        for (const flag of strictFlagsOf(classified, idOfHand(hand), hand)) {
          if (!combosByFlag.has(flag)) combosByFlag.set(flag, []);
          combosByFlag.get(flag).push(hand);
        }
      }
      const flags = {};
      [...combosByFlag.entries()].map(([flag, combos]) => [flag, combos, combos.reduce((sum, hand) => sum + this._weight(hand), 0)]).sort((a, b) => b[2] - a[2]).forEach(([flag, combos, weight]) => {
        flags[flag] = { count: combos.length, weight, share: weight / totalWeight, combos };
      });
      return { total, weight: totalWeight, flags };
    }
    /**
     * Treats this range as villain's and splits it by which known cards block it (as poker-extval's classifyRange):
     * { boardBlocks, heroBlocks, allBlocks }, each { unblocked, blocked }. heroCards are hero's hole cards
     * ('AhKd' or ['Ah', 'Kd']), optional; board plus hero cards must be at least 5 cards.
     */
    async blockers(boardCards, heroCards = null, options = {}) {
      const board = this._requireEvaluationBoard(boardCards);
      const street = this._validateStreet(options.street);
      let hole = null;
      if (heroCards !== null && heroCards !== void 0) {
        const hand = Array.isArray(heroCards) ? heroCards.join("") : heroCards;
        hole = this._extractCardsFromHand(this._prepareEvaluationInput(hand, board)[0]);
      }
      const cards = [...board, ...hole || []];
      if (cards.length < 5) throw new Error("Blockers need at least 5 known cards: a turn or river board, or a flop with hero cards");
      await this._loadEvaluator();
      return this._classifyBlockers(board, hole || [], street);
    }
    // Each view lists unblocked combos, and groups blocked ones under the made hand and draws villain would
    // hold with them (evaluated with the combo as villain's hole cards), or under onBoard if a board card blocks it
    _classifyBlockers(board, heroCards, street) {
      const boardCards = new Set(board);
      const heroSet = new Set(heroCards);
      const allCards = /* @__PURE__ */ new Set([...board, ...heroCards]);
      const categories = /* @__PURE__ */ new Map();
      const categoriesOf = (hand) => {
        if (!categories.has(hand)) {
          const villainCards = this._extractCardsFromHand(hand);
          const [evalObj] = Object.values(extval2.evaluateHand([...board, ...villainCards], { strict: true, holeCards: villainCards, street }));
          categories.set(hand, [[...MADE_HANDS].find((flag) => evalObj[flag]), ...VILLAIN_DRAWS.filter((flag) => evalObj[flag])]);
        }
        return categories.get(hand);
      };
      const split = (blockerSet) => {
        const blocked = Object.fromEntries([...MADE_HANDS, ...VILLAIN_DRAWS, "onBoard"].map((key) => [key, []]));
        const unblocked = [];
        for (const hand of this.filteredHands) {
          const cards = this._extractCardsFromHand(hand);
          if (!cards.some((c) => blockerSet.has(c))) unblocked.push(hand);
          else if (cards.some((c) => boardCards.has(c))) blocked.onBoard.push(hand);
          else categoriesOf(hand).forEach((category) => blocked[category].push(hand));
        }
        return { unblocked, blocked };
      };
      return { boardBlocks: split(boardCards), heroBlocks: split(heroSet), allBlocks: split(allCards) };
    }
    // ============================================================================
    // RANGE VS RANGE ANALYSIS (needs against() or getEquity() first)
    // ============================================================================
    // 'acevedo' (default), 'quartiles', or [{ name, min }, ...] with min from 0 to 1 (or '75%')
    _resolveBands(bands) {
      if (bands === void 0 || bands === null) return BAND_PRESETS.acevedo;
      if (typeof bands === "string") {
        if (!Object.hasOwn(BAND_PRESETS, bands)) throw new Error(`Unknown bands preset: ${bands}. Use ${Object.keys(BAND_PRESETS).join(" or ")}, or an array of { name, min }`);
        return BAND_PRESETS[bands];
      }
      if (!Array.isArray(bands) || bands.length === 0) throw new Error("bands must be a preset name or a non-empty array of { name, min }");
      const resolved = bands.map((band) => {
        if (!band || typeof band.name !== "string" || band.name === "") throw new Error("Each band needs a name");
        return { name: band.name, min: this._parseShare(band.min, `Band ${band.name} min`) };
      }).sort((a, b) => b.min - a.min);
      if (new Set(resolved.map((b) => b.name)).size !== resolved.length) throw new Error("Band names must be unique");
      if (resolved[resolved.length - 1].min !== 0) throw new Error("The lowest band must start at 0 so every hand has a band");
      return resolved;
    }
    _requireMatchup() {
      if (!this.matchup) throw new Error("No matchup yet: call against(villain, board) first");
      return this.matchup;
    }
    _bandOf(equity, bands) {
      return bands.find((band) => equity >= band.min).name;
    }
    /** The equity band of each hand against villain, e.g. { AcAd: 'strong', ... } (null when it cannot be dealt). */
    bandsByHand() {
      const { bands } = this._requireMatchup();
      const handEquity = this._requireStoredEquity();
      return Object.fromEntries(this.filteredHands.map((hand) => {
        const equity = handEquity[hand].equity;
        return [hand, equity === null ? null : this._bandOf(equity, bands)];
      }));
    }
    /** Hands in the named equity band(s) against villain: bucket('good'), bucket('strong', 'good'). */
    bucket(...names) {
      const { bands } = this._requireMatchup();
      const handEquity = this._requireStoredEquity();
      const wanted = names.flat();
      const known = new Set(bands.map((b) => b.name));
      const unknown = wanted.filter((name) => !known.has(name));
      if (wanted.length === 0) throw new Error("bucket needs at least one band name");
      if (unknown.length > 0) throw new Error(`Unknown band: ${unknown.join(", ")}. Bands: ${[...known].join(", ")}`);
      const wantedSet = new Set(wanted);
      const filtered = this.filteredHands.filter((hand) => {
        const equity = handEquity[hand].equity;
        return equity !== null && wantedSet.has(this._bandOf(equity, bands));
      });
      return this._createFilteredInstance(filtered);
    }
    // Villain's equity per hand against hero's current hands; cached per set of hero hands
    async _villainEquityByHand() {
      const { villainHands, board, deadCards, iterations, key } = this._requireMatchup();
      const heroHands = this.filteredHands;
      const cacheKey = `villain|${key}|${this._weightKey(heroHands, this.handWeights)}`;
      if (!this.equityCache.has(cacheKey)) {
        const results = {};
        const blockedCards = /* @__PURE__ */ new Set([...board, ...deadCards]);
        const live = heroHands.length === 0 ? [] : villainHands.filter((hand) => !this._extractCardsFromHand(hand).some((c) => blockedCards.has(c)));
        for (const hand of villainHands) results[hand] = { win: 0, tie: 0, lose: 0, equity: null };
        if (live.length) {
          const { hero: side2 } = await this._runEngine(live, {}, heroHands, this.handWeights, board, deadCards, iterations, false);
          live.forEach((hand, i) => {
            results[hand] = this._equityResult(side2.win[i], side2.tie[i], side2.lose[i]);
          });
        }
        this.equityCache.set(cacheKey, results);
      }
      return this.equityCache.get(cacheKey);
    }
    // { combos, equity, buckets: { name: { count, share, combos } }, shape } for one side. parentHands: the
    // range the hands were chosen from (for contiguity); null when the hands are the whole range.
    // Shares are by weight: each combo counts its weight (1 unless the range is weighted).
    _sideSummary(equityByHand, hands, bands, parentHands = null, enough = 0.1, minDominant = 0.5, weights = {}, parentWeights = {}) {
      const live = hands.filter((hand) => equityByHand[hand] && equityByHand[hand].equity !== null);
      const weightOf = (hand) => weights[hand] ?? 1;
      const totals = { win: 0, tie: 0, lose: 0 };
      const buckets = Object.fromEntries(bands.map((band) => [band.name, { count: 0, weight: 0, share: 0, combos: [] }]));
      let totalWeight = 0;
      let sum = 0;
      let sumSquares = 0;
      for (const hand of live) {
        const result = equityByHand[hand];
        const weight = weightOf(hand);
        sum += result.equity * weight;
        sumSquares += result.equity * result.equity * weight;
        totals.win += result.win * weight;
        totals.tie += result.tie * weight;
        totals.lose += result.lose * weight;
        const bucket = buckets[this._bandOf(result.equity, bands)];
        bucket.combos.push(hand);
        bucket.weight += weight;
        totalWeight += weight;
      }
      for (const bucket of Object.values(buckets)) {
        bucket.count = bucket.combos.length;
        bucket.share = totalWeight ? bucket.weight / totalWeight : 0;
      }
      const runouts = totals.win + totals.tie + totals.lose;
      const contiguity = this._contiguity(live, parentHands, equityByHand, weightOf, (hand) => parentWeights[hand] ?? 1);
      const mean = totalWeight ? sum / totalWeight : 0;
      const variance = totalWeight ? Math.max(0, sumSquares / totalWeight - mean * mean) : 0;
      return {
        combos: live.length,
        weight: totalWeight,
        equity: runouts ? (totals.win + totals.tie / 2) / runouts : null,
        buckets,
        shape: live.length ? this._shapeOf(buckets, bands, contiguity, enough, minDominant, { mean, variance }) : null
      };
    }
    // Share of the hands that are among the parent range's top N hands by equity (N = the hands' count; hands
    // tied with the Nth count too). 1 means no gaps: the hands are a top slice of what they were chosen from.
    // By weight: the parent's top slice holds as much weight as the hands do.
    _contiguity(live, parentHands, equityByHand, weightOf = () => 1, parentWeightOf = () => 1) {
      if (!parentHands || live.length === 0) return 1;
      const parent = parentHands.filter((hand) => equityByHand[hand] && equityByHand[hand].equity !== null).map((hand) => ({ equity: equityByHand[hand].equity, weight: parentWeightOf(hand) })).sort((a, b) => b.equity - a.equity);
      const mine = live.reduce((sum, hand) => sum + weightOf(hand), 0);
      const parentTotal = parent.reduce((sum, p) => sum + p.weight, 0);
      if (mine >= parentTotal - 1e-9) return 1;
      let cumulative = 0;
      let cutoff = parent[parent.length - 1].equity;
      for (const p of parent) {
        cumulative += p.weight;
        if (cumulative >= mine - 1e-9) {
          cutoff = p.equity;
          break;
        }
      }
      return live.filter((hand) => equityByHand[hand].equity >= cutoff).reduce((sum, hand) => sum + weightOf(hand), 0) / mine;
    }
    /**
     * The three competing range shapes of Modern Poker Theory (Ch. 1, Range Morphology), each scored 0 to 1.
     * The range's equity against villain is split into the top band (T), the bottom band (B) and the bands
     * between (M). Each share is compared with an even spread across equity: density = share / band width
     * (with the default bands 0.25, 0.42 and 0.33), so 1 means as many hands as an even spread would have.
     * A part is hollow when it is thinner than its neighbours: hollow(part, than) = 1 - part / than, from 0 to 1.
     * - polarized = Var(e) / (mean(e) x (1 - mean(e))), over each hand's equity e against villain (weighted).
     *   By the Bhatia-Davis inequality this is 1 only when every hand has 0% or 100% equity (perfectly
     *   polarized: nuts and air against this opponent) and 0 when every hand has the same equity. It needs no
     *   bands, and doesn't depend on the range's average equity. A range with no spread at all scores 0.
     * - linear    = enough(T) x hollow(bottom, middle) x contiguity: the top, then medium hands, without gaps
     * - condensed = hollow(thicker end, middle): the top and bottom removed
     * enough(x) = min(1, x / enough), default 10%. An even spread scores 0 on linear and condensed. The scores are
     * independent and need not add up to 1. dominant is the highest when it reaches minDominant, else null.
     */
    _shapeOf(buckets, bands, contiguity, enough, minDominant = 0.5, { mean = 0, variance = 0 } = {}) {
      const top = buckets[bands[0].name].share;
      const bottom = bands.length > 1 ? buckets[bands[bands.length - 1].name].share : 0;
      const middle = bands.slice(1, -1).reduce((sum, band) => sum + buckets[band.name].share, 0);
      const widths = this._bandWidths(bands);
      const density = (share, width) => width > 0 ? share / width : 0;
      const dTop = density(top, widths.top);
      const dMiddle = density(middle, widths.middle);
      const dBottom = density(bottom, widths.bottom);
      const present = (share) => Math.min(1, share / enough);
      const hollow = (part, than) => than <= 0 ? part <= 0 ? 1 : 0 : Math.max(0, Math.min(1, 1 - part / than));
      const scores = {
        // Rounded so floating-point noise doesn't turn a perfect 1 into 0.9999999999999999
        polarized: mean > 0 && mean < 1 ? Math.round(Math.min(1, variance / (mean * (1 - mean))) * 1e12) / 1e12 : 0,
        linear: present(top) * hollow(dBottom, dMiddle) * contiguity,
        condensed: middle > 0 ? hollow(Math.max(dTop, dBottom), dMiddle) : 0
      };
      const best = Object.entries(scores).reduce((a, b) => b[1] > a[1] ? b : a);
      return {
        ...scores,
        dominant: best[1] > 0 && best[1] >= minDominant ? best[0] : null,
        contiguity,
        top,
        middle,
        bottom,
        density: { top: dTop, middle: dMiddle, bottom: dBottom },
        equity: { mean, sd: Math.sqrt(variance) }
      };
    }
    // Equity width of the top band, the bands between, and the bottom band
    _bandWidths(bands) {
      const topMin = bands[0].min;
      const bottomMax = bands.length > 1 ? bands[bands.length - 2].min : 0;
      return { top: 1 - topMin, middle: Math.max(0, topMin - bottomMax), bottom: bottomMax };
    }
    /** Equity bucket shares for both sides: { bands, hero, villain }, each { combos, equity, buckets, shape }. */
    async buckets() {
      const { bands, board, deadCards, parentHands, parentWeights, shapeEnough, minDominant, topEnd, villainHands, villainWeights } = this._requireMatchup();
      const villainEquity = await this._villainEquityByHand();
      const hero = this._sideSummary(this._requireStoredEquity(), this.filteredHands, bands, parentHands, shapeEnough, minDominant, this.handWeights, parentWeights);
      const villain = this._sideSummary(villainEquity, villainHands, bands, null, shapeEnough, minDominant, villainWeights);
      await this._loadEvaluator();
      hero.capped = this._cappedFor(this.filteredHands, villainHands, board, deadCards, topEnd, this.handWeights, villainWeights);
      villain.capped = this._cappedFor(villainHands, this.filteredHands, board, deadCards, topEnd, villainWeights, this.handWeights);
      const { nutsMinEquity } = this.matchup;
      hero.nuts = this._nutsByEquity(this.handEquity, this.filteredHands, nutsMinEquity, this.handWeights);
      villain.nuts = this._nutsByEquity(villainEquity, villainHands, nutsMinEquity, villainWeights);
      return { bands, hero, villain };
    }
    // Effective nuts: hands with at least minEquity (default 90%) equity against the other range
    _nutsByEquity(equityByHand, hands, minEquity, weights = {}) {
      const live = hands.filter((hand) => equityByHand[hand] && equityByHand[hand].equity !== null);
      if (live.length === 0) return { count: 0, weight: 0, share: null };
      const weightOf = (hand) => weights[hand] ?? 1;
      const nuts = live.filter((hand) => equityByHand[hand].equity >= minEquity);
      const weight = nuts.reduce((sum, hand) => sum + weightOf(hand), 0);
      const total = live.reduce((sum, hand) => sum + weightOf(hand), 0);
      return { count: nuts.length, weight, share: weight / total };
    }
    /**
     * How much of the top end a range is missing, 0 (uncapped) to 1 (capped), from made hands on the board:
     * - relative: the top end is the strongest `topEnd` share (default 5%) of the combos in both ranges;
     *   1 - min(1, the range's share of that top end / its share of all their combos)
     * - absolute: the top end is the strongest `topEnd` share of every combo that can be dealt on the board;
     *   1 - min(1, the share of the range in that top end / the share of all combos in it)
     * Ties at the cut-off count as top end. null preflop (no board to rank on) or with no live combos.
     */
    _cappedFor(hands, otherHands, board, deadCards, topEnd, weights = {}, otherWeights = {}) {
      return this._topEndFor(hands, otherHands, board, deadCards, topEnd, weights, otherWeights).capped;
    }
    // Capping from the made-hand top end, by weight; null preflop
    _topEndFor(hands, otherHands, board, deadCards, topEnd, weights = {}, otherWeights = {}) {
      const none = { capped: { relative: null, absolute: null } };
      if (board.length < 3) return none;
      const blocked = /* @__PURE__ */ new Set([...board, ...deadCards]);
      const live = (list) => list.filter((hand) => !this._extractCardsFromHand(hand).some((c) => blocked.has(c)));
      const mine = live(hands);
      if (mine.length === 0) return none;
      const rankOf = (hand) => this._handValue(hand, board);
      const ratioToCap = (ratio) => Math.max(0, 1 - ratio);
      const theirs = live(otherHands);
      const all2 = [
        ...mine.map((hand) => ({ rank: rankOf(hand), mine: true, weight: weights[hand] ?? 1 })),
        ...theirs.map((hand) => ({ rank: rankOf(hand), mine: false, weight: otherWeights[hand] ?? 1 }))
      ].sort((a, b) => b.rank - a.rank);
      const sum = (list) => list.reduce((total, x) => total + x.weight, 0);
      const allWeight = sum(all2);
      let cumulative = 0;
      let relCutoff = all2[all2.length - 1].rank;
      for (const x of all2) {
        cumulative += x.weight;
        if (cumulative >= topEnd * allWeight - 1e-9) {
          relCutoff = x.rank;
          break;
        }
      }
      const relTop = all2.filter((x) => x.rank >= relCutoff);
      const mineWeight = sum(all2.filter((x) => x.mine));
      const relative = ratioToCap(sum(relTop.filter((x) => x.mine)) / sum(relTop) / (mineWeight / allWeight));
      const absKey = `abs-top|${board.join(",")}|${[...deadCards].sort().join(",")}|${topEnd}`;
      let abs = this.evaluationCache.get(absKey);
      if (!abs) {
        const { score } = classifiedBoard(board, null);
        const blockedNumbers = new Uint8Array(52);
        for (const card of blocked) blockedNumbers[cardIndex(card)] = 1;
        const ranks = [];
        for (let id = 0; id < COMBO_COUNT; id++) if (!blockedNumbers[COMBO_LO[id]] && !blockedNumbers[COMBO_HI[id]]) ranks.push(score[id]);
        ranks.sort((a, b) => b - a);
        const cutoff = ranks[Math.max(1, Math.ceil(topEnd * ranks.length - 1e-9)) - 1];
        const share = ranks.filter((rank) => rank >= cutoff).length / ranks.length;
        abs = { cutoff, share };
        this.evaluationCache.set(absKey, abs);
      }
      const mineInTop = mine.filter((hand) => rankOf(hand) >= abs.cutoff).reduce((total, hand) => total + (weights[hand] ?? 1), 0) / mineWeight;
      const absolute = ratioToCap(mineInTop / abs.share);
      return { capped: { relative, absolute } };
    }
    /**
     * Splits the range into hand classes on the board, each combo in exactly one, so the shares add up to 1:
     * { total, classes: { set: { count, share, combos }, ..., air } } in Modern Poker Theory's order (made
     * hands first, then flush draws, OESDs, gutshots, then ace-high and king-high, then air). A made hand
     * counts only when it uses a hole card. options: { highCards } (default true; false counts ace-high and
     * king-high as air, as the book's Chapter 1 breakdown does), { street }.
     */
    async handClasses(boardCards, options = {}) {
      const board = this._requireEvaluationBoard(boardCards);
      const street = this._validateStreet(options.street);
      const highCards = options.highCards ?? true;
      await this._loadEvaluator();
      const boardSet = new Set(board);
      const boardKey = board.join(",");
      const boardRanks = [...new Set(board.map((c) => c[0]))].sort((a, b) => this._getRankValue(b) - this._getRankValue(a));
      const classes = Object.fromEntries(HAND_CLASSES.map((name) => [name, { count: 0, weight: 0, share: 0, combos: [] }]));
      const noBoardPlays = board.length <= 4 && boardRanks.length === board.length;
      const classified = noBoardPlays ? classifiedBoard(board, street) : null;
      let total = 0;
      let totalWeight = 0;
      for (const hand of this.filteredHands) {
        const cards = this._extractCardsFromHand(hand);
        if (cards.some((c) => boardSet.has(c))) continue;
        total++;
        const weight = this._weight(hand);
        totalWeight += weight;
        const evalObj = noBoardPlays ? flagObject(classified, idOfHand(hand), hand) : this._getCachedOrEvaluate(hand, board, boardKey, true, street)[0];
        const entry = classes[this._handClassOf(cards, evalObj, boardRanks, highCards)];
        entry.combos.push(hand);
        entry.weight += weight;
      }
      for (const entry of Object.values(classes)) {
        entry.count = entry.combos.length;
        entry.share = totalWeight ? entry.weight / totalWeight : 0;
      }
      return { total, weight: totalWeight, classes };
    }
    _handClassOf(cards, evalObj, boardRanks, highCards) {
      const made = [...MADE_HANDS].find((flag) => evalObj[flag]);
      const usesHole = evalObj.usesHoleCards !== false;
      const [r1, r2] = cards.map((c) => c[0]);
      const pocketPair = r1 === r2;
      if (usesHole) {
        if (made === "isRoyalFlush" || made === "isStraightFlush") return "straightFlush";
        if (made === "isFourOfAKind") return "quads";
        if (made === "isFullHouse") return "fullHouse";
        if (made === "isFlush") return "flush";
        if (made === "isStraight") return "straight";
        if (made === "isThreeOfAKind") return pocketPair ? "set" : "trips";
        if (made === "isTwoPair") return "twoPair";
        if (made === "isPair") {
          if (pocketPair) {
            const value = this._getRankValue(r1);
            const above = boardRanks.filter((r) => this._getRankValue(r) > value).length;
            if (above === 0) return "overpair";
            if (above === boardRanks.length) return "underpair";
            return `pocketPair${above}${above + 1}`;
          }
          const paired = [r1, r2].find((r) => boardRanks.includes(r));
          const position = boardRanks.indexOf(paired);
          if (position === 0) return "topPair";
          if (position === boardRanks.length - 1) return "bottomPair";
          return PAIR_POSITIONS[position];
        }
      }
      if (evalObj.isFlushDraw) return "flushDraw";
      if (evalObj.isOpenEndedStraightDraw || evalObj.isOpenEndedStraightDrawWheel) return "oesd";
      if (evalObj.isInsideStraightDraw || evalObj.isInsideStraightDrawWheel) return "gutshot";
      if (highCards && (r1 === "A" || r2 === "A")) return "aceHigh";
      if (highCards && (r1 === "K" || r2 === "K")) return "kingHigh";
      return "air";
    }
    /**
     * Range vs range report: both sides' equity, buckets, shape, capping and effective nuts; advantage, each
     * hero minus villain: range (equity, Modern Poker Theory's "range vs range equity advantage"), nut (share of
     * effective nuts, hands with 90%+ equity against the other range: the book's "effective nut hands make up a
     * larger portion of his range"), polarization
     * (shape.polarized), and the share of each equity band and hand class (positive = hero has more of it);
     * hand classes side by side, exclusive (handClasses, adding up to 1) and overlapping flags (flags), flop,
     * turn or river only; capped (relative and absolute) per side; and the book's flop averages as a reference
     * when the default bands are used.
     */
    async compare() {
      const matchup = this._requireMatchup();
      const { bands, board } = matchup;
      const { hero, villain } = await this.buckets();
      const report = {
        board,
        bands,
        hero,
        villain,
        advantage: {
          range: hero.equity !== null && villain.equity !== null ? hero.equity - villain.equity : null,
          nut: hero.nuts.share !== null && villain.nuts.share !== null ? hero.nuts.share - villain.nuts.share : null,
          polarization: hero.shape && villain.shape ? hero.shape.polarized - villain.shape.polarized : null,
          bands: Object.fromEntries(bands.map((band) => [band.name, hero.buckets[band.name].share - villain.buckets[band.name].share])),
          classes: null
        },
        handClasses: null,
        flags: null,
        reference: bands === BAND_PRESETS.acevedo ? ACEVEDO_FLOP_AVERAGES : null
      };
      if (board.length >= 3) {
        const heroExclusive = await this.handClasses(board);
        const villainExclusive = await this._villainRange().handClasses(board);
        report.handClasses = Object.fromEntries(HAND_CLASSES.map((name) => [name, {
          hero: heroExclusive.classes[name].share,
          villain: villainExclusive.classes[name].share,
          heroCount: heroExclusive.classes[name].count,
          villainCount: villainExclusive.classes[name].count
        }]));
        report.advantage.classes = Object.fromEntries(HAND_CLASSES.map((name) => [
          name,
          heroExclusive.classes[name].share - villainExclusive.classes[name].share
        ]));
        const heroClasses = await this.breakdown(board);
        const villainClasses = await this._villainRange().breakdown(board);
        const flags = /* @__PURE__ */ new Set([...Object.keys(heroClasses.flags), ...Object.keys(villainClasses.flags)]);
        const rows = [...flags].map((flag) => [flag, {
          hero: heroClasses.flags[flag]?.share ?? 0,
          villain: villainClasses.flags[flag]?.share ?? 0,
          heroCount: heroClasses.flags[flag]?.count ?? 0,
          villainCount: villainClasses.flags[flag]?.count ?? 0
        }]);
        rows.sort((a, b) => Math.max(b[1].hero, b[1].villain) - Math.max(a[1].hero, a[1].villain));
        report.flags = Object.fromEntries(rows);
      }
      return report;
    }
    _villainRange() {
      const { villainHands, villainWeights, deadCards } = this._requireMatchup();
      return new _RangeManager(villainHands.map((hand) => [hand, villainWeights[hand] ?? 1]), deadCards);
    }
    // Area between two weighted equity CDFs on [0, 1]: 0 for identical distributions, up to 1. Each input is a
    // list of equities or of [equity, weight] pairs.
    _earthMoversDistance(a, b) {
      if (a.length === 0 || b.length === 0) return null;
      const pairs = (list) => list.map((x) => Array.isArray(x) ? x : [x, 1]).sort((x, y) => x[0] - y[0]);
      const xs = pairs(a);
      const ys = pairs(b);
      const totalX = xs.reduce((sum, x) => sum + x[1], 0);
      const totalY = ys.reduce((sum, y) => sum + y[1], 0);
      const points = [...new Set([...xs, ...ys].map((p) => p[0]))].sort((x, y) => x - y);
      let i = 0;
      let j = 0;
      let cx = 0;
      let cy = 0;
      let area = 0;
      for (let k = 0; k < points.length - 1; k++) {
        while (i < xs.length && xs[i][0] <= points[k]) cx += xs[i++][1];
        while (j < ys.length && ys[j][0] <= points[k]) cy += ys[j++][1];
        area += Math.abs(cx / totalX - cy / totalY) * (points[k + 1] - points[k]);
      }
      return area;
    }
    /**
     * Compares this range with a reference range (notation, hands or a RangeManager): combos in common,
     * missing (in the reference only) and extra (in this range only), and overlap (common / union). After
     * against(), also both ranges' equity, buckets and shape against the same villain and board, and the
     * earth mover's distance between their equity distributions (0 = identical shape).
     */
    async compareTo(reference) {
      const referenceRange = reference instanceof _RangeManager ? reference : new _RangeManager(reference);
      const mine = new Set(this.filteredHands);
      const theirs = new Set(referenceRange.toArray());
      const common = this.filteredHands.filter((hand) => theirs.has(hand));
      const missing = referenceRange.toArray().filter((hand) => !mine.has(hand));
      const extra = this.filteredHands.filter((hand) => !theirs.has(hand));
      const weightIn = (range, hand) => range.contains(hand) ? range._weight(hand) : 0;
      const everyHand = [.../* @__PURE__ */ new Set([...this.filteredHands, ...referenceRange.filteredHands])];
      const shared = everyHand.reduce((sum, hand) => sum + Math.min(weightIn(this, hand), weightIn(referenceRange, hand)), 0);
      const union = everyHand.reduce((sum, hand) => sum + Math.max(weightIn(this, hand), weightIn(referenceRange, hand)), 0);
      const notation = (hands) => hands.length ? new _RangeManager(hands).toNotation() : "";
      const report = {
        combos: { range: mine.size, reference: theirs.size },
        common,
        missing,
        extra,
        notation: { common: notation(common), missing: notation(missing), extra: notation(extra) },
        overlap: union ? shared / union : 1,
        equity: null,
        buckets: null,
        distance: null
      };
      if (!this.matchup) return report;
      const { villainHands, villainWeights, board, deadCards, iterations, bands, parentHands, parentWeights, shapeEnough, minDominant, topEnd } = this.matchup;
      const villainInput = villainHands.length ? villainHands.map((hand) => [hand, villainWeights[hand] ?? 1]) : villainHands;
      const referenceWithEquity = await referenceRange.against(villainInput, board, {
        deadCards,
        iterations,
        bands,
        shape: { enough: shapeEnough, minDominant, topEnd }
      });
      const rangeSummary = this._sideSummary(this._requireStoredEquity(), this.filteredHands, bands, parentHands, shapeEnough, minDominant, this.handWeights, parentWeights);
      const referenceSummary = this._sideSummary(
        referenceWithEquity.handEquity,
        referenceWithEquity.filteredHands,
        bands,
        null,
        shapeEnough,
        minDominant,
        referenceWithEquity.handWeights
      );
      await this._loadEvaluator();
      rangeSummary.capped = this._cappedFor(this.filteredHands, villainHands, board, deadCards, topEnd, this.handWeights, villainWeights);
      referenceSummary.capped = this._cappedFor(referenceWithEquity.filteredHands, villainHands, board, deadCards, topEnd, referenceWithEquity.handWeights, villainWeights);
      const equities = (byHand, hands, range) => hands.filter((hand) => byHand[hand].equity !== null).map((hand) => [byHand[hand].equity, range._weight(hand)]);
      report.equity = { range: rangeSummary.equity, reference: referenceSummary.equity };
      report.buckets = { range: rangeSummary, reference: referenceSummary };
      report.distance = this._earthMoversDistance(
        equities(this.handEquity, this.filteredHands, this),
        equities(referenceWithEquity.handEquity, referenceWithEquity.filteredHands, referenceWithEquity)
      );
      return report;
    }
    _parseBet({ pot, bet } = {}) {
      for (const [name, value] of [["pot", pot], ["bet", bet]]) {
        if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number`);
      }
      return { pot, bet };
    }
    /**
     * Bet-size math for a bet into a pot (Modern Poker Theory Ch. 2): alpha = bet / (pot + bet), how often a
     * bluff must work; mdf = 1 - alpha; potOdds = bet / (pot + 2 bet), the equity a call needs (also the
     * bluff share of a balanced river betting range); valueToBluff = (pot + bet) / bet value combos per bluff.
     * On earlier streets MDF is only a rough guide: the book shows real defence well below it.
     */
    bettingMath(options) {
      const { pot, bet } = this._parseBet(options);
      const potOdds = bet / (pot + 2 * bet);
      return { alpha: bet / (pot + bet), mdf: pot / (pot + bet), potOdds, bluffShare: potOdds, valueToBluff: (pot + bet) / bet };
    }
    /**
     * As the defender facing villain's bet (villain = the betting range given to against()): the hands to
     * continue with. by: 'equity' (default) keeps hands whose equity x realization is at least the pot odds;
     * 'mdf' keeps the strongest MDF share of the range by equity (ties kept). Hands that cannot be dealt are
     * dropped. realization (default 1) scales equity for how much of it the hand realizes: Modern Poker Theory
     * gives about 0.9 out of position and 1.1 in position for symmetric ranges (it needs a solver to know).
     */
    defend(options = {}) {
      const { pot, bet } = this._parseBet(options);
      const by = options.by ?? "equity";
      if (by !== "equity" && by !== "mdf") throw new Error(`Unknown defend method: ${by}. Use 'equity' or 'mdf'`);
      const realization = options.realization ?? 1;
      if (typeof realization !== "number" || !Number.isFinite(realization) || realization <= 0) {
        throw new Error("realization must be a positive number");
      }
      const handEquity = this._requireStoredEquity();
      this._requireMatchup();
      const { potOdds, mdf } = this.bettingMath({ pot, bet });
      const live = this.filteredHands.filter((hand) => handEquity[hand].equity !== null);
      if (by === "equity") {
        return this._createFilteredInstance(live.filter((hand) => handEquity[hand].equity * realization >= potOdds));
      }
      const ranked = [...live].sort((a, b) => handEquity[b].equity - handEquity[a].equity);
      const target = mdf * ranked.reduce((sum, hand) => sum + this._weight(hand), 0);
      if (ranked.length === 0 || target <= 1e-12) return this._createFilteredInstance([]);
      let cumulative = 0;
      let cutoff = handEquity[ranked[ranked.length - 1]].equity;
      for (const hand of ranked) {
        cumulative += this._weight(hand);
        if (cumulative >= target - 1e-9) {
          cutoff = handEquity[hand].equity;
          break;
        }
      }
      return this._createFilteredInstance(live.filter((hand) => handEquity[hand].equity >= cutoff));
    }
    /**
     * As the bettor: bluffs to pair with the value hands (bands in options.value, default the top band) at this
     * bet size. Count = value combos x alpha, so bluffs are bet / (pot + 2 bet) of the betting range. Picks the
     * lowest-band hands first, preferring those that block more of villain's continuing range (villain hands
     * with at least the pot odds against this range), then lower equity.
     */
    async bluffCandidates(options = {}) {
      const { pot, bet } = this._parseBet(options);
      const { bands } = this._requireMatchup();
      const handEquity = this._requireStoredEquity();
      const valueBands = new Set([options.value ?? bands[0].name].flat());
      const unknown = [...valueBands].filter((name) => !bands.some((b) => b.name === name));
      if (unknown.length > 0) throw new Error(`Unknown band: ${unknown.join(", ")}`);
      const { alpha, potOdds } = this.bettingMath({ pot, bet });
      const live = this.filteredHands.filter((hand) => handEquity[hand].equity !== null);
      const bandIndex = (hand) => bands.findIndex((b) => b.name === this._bandOf(handEquity[hand].equity, bands));
      const value = live.filter((hand) => valueBands.has(bands[bandIndex(hand)].name));
      const target = value.reduce((sum, hand) => sum + this._weight(hand), 0) * alpha;
      if (target < 0.5) return this._createFilteredInstance([]);
      const villainEquity = await this._villainEquityByHand();
      const { villainWeights } = this.matchup;
      const continuing = this.matchup.villainHands.filter((hand) => villainEquity[hand].equity !== null && villainEquity[hand].equity >= potOdds);
      const blocks = (hand) => {
        const cards = this._extractCardsFromHand(hand);
        return continuing.filter((v) => cards.some((c) => v.includes(c))).reduce((sum, v) => sum + (villainWeights[v] ?? 1), 0);
      };
      const candidates = live.filter((hand) => !valueBands.has(bands[bandIndex(hand)].name)).map((hand) => ({ hand, band: bandIndex(hand), blocked: blocks(hand), equity: handEquity[hand].equity })).sort((a, b) => b.band - a.band || b.blocked - a.blocked || a.equity - b.equity);
      const chosen = /* @__PURE__ */ new Set();
      let taken = 0;
      for (const candidate of candidates) {
        if (taken >= Math.round(target) - 1e-9 && this.isWeighted() === false) break;
        if (this.isWeighted() && taken >= target - 1e-9) break;
        chosen.add(candidate.hand);
        taken += this._weight(candidate.hand);
      }
      return this._createFilteredInstance(this.filteredHands.filter((hand) => chosen.has(hand)));
    }
    // ============================================================================
    // QUERY METHODS
    // ============================================================================
    toArray() {
      return [...this.filteredHands];
    }
    getHands() {
      return this.toArray();
    }
    size() {
      return this.filteredHands.length;
    }
    contains(hand) {
      const normalized = this._normalizeHand(hand);
      if (this._handSetSource !== this.filteredHands) {
        this._handSet = new Set(this.filteredHands);
        this._handSetSource = this.filteredHands;
      }
      return this._handSet.has(normalized);
    }
    toString() {
      return weightedNotation(this.filteredHands, (hand) => this._weight(hand), classNotation);
    }
    /** Abbreviated notation; weighted combos get their weight after a colon: 'QQ+,AKs:0.5'. */
    toNotation() {
      if (this._notationSource !== this.filteredHands || this._notationWeights !== this.handWeights) {
        this._notation = weightedNotation(this.filteredHands, (hand) => this._weight(hand));
        this._notationSource = this.filteredHands;
        this._notationWeights = this.handWeights;
      }
      return this._notation;
    }
    // ============================================================================
    // INTERNAL HELPER METHODS
    // ============================================================================
    _findConsecutiveSequences(ranks) {
      if (ranks.length === 0) return [];
      const sorted = [...new Set(ranks)].sort((a, b) => this._getRankValue(a) - this._getRankValue(b));
      const sequences = [];
      let start = sorted[0], end = sorted[0];
      for (let i = 1; i < sorted.length; i++) {
        if (this._getRankValue(sorted[i]) === this._getRankValue(end) + 1) end = sorted[i];
        else {
          sequences.push({ start, end });
          start = end = sorted[i];
        }
      }
      return [...sequences, { start, end }];
    }
    _groupByFirstRank(notations) {
      const groups = {};
      notations.forEach((not) => {
        if (!groups[not[0]]) groups[not[0]] = [];
        groups[not[0]].push(not);
      });
      return groups;
    }
    _processSequence(seq, firstRank, suffix) {
      if (seq.start === seq.end) return [firstRank + seq.start + suffix];
      if (seq.end === this._getRankBelow(firstRank)) return [firstRank + seq.start + suffix + "+"];
      return [firstRank + seq.start + suffix + "-" + firstRank + seq.end + suffix];
    }
    _processGroup(group, suffix) {
      const secondRanks = [...new Set(group)].map((h) => h[1]);
      const sequences = this._findConsecutiveSequences(secondRanks);
      const firstRank = group[0][0];
      return sequences.flatMap((seq) => this._processSequence(seq, firstRank, suffix));
    }
    _abbreviateGroup(groups, suffix) {
      const result = [];
      Object.values(groups).forEach((group) => result.push(...this._processGroup(group, suffix)));
      return result;
    }
    _abbreviateOffsuit(offsuit) {
      if (offsuit.length === 0) return [];
      return this._abbreviateGroup(this._groupByFirstRank(offsuit), "o");
    }
  };
  var ASYNC_RANGE_METHODS = [
    "makesHand",
    "hitsHand",
    "hitsHandBoth",
    "getEquity",
    "against",
    "strongest",
    "weakest",
    "bluffCandidates"
  ];
  var SYNC_RANGE_METHODS = [
    "exclude",
    "include",
    "intersect",
    "hasSuit",
    "suitedOf",
    "setDeadCards",
    "hasKicker",
    "hasKeyCard",
    "scale",
    "setWeight",
    "equityAbove",
    "equityBelow",
    "equityBetween",
    "bucket",
    "defend"
  ];
  var VALUE_METHODS = [
    "toArray",
    "getHands",
    "size",
    "contains",
    "toNotation",
    "getKeyCards",
    "normalizeNotation",
    "weights",
    "weightOf",
    "weightedSize",
    "isWeighted",
    "handContainsDeadCard",
    "handHasSuit",
    "handSuitedOf",
    "evaluateHand",
    "getObject",
    "equity",
    "equityByHand",
    "rankHands",
    "breakdown",
    "blockers",
    "bandsByHand",
    "buckets",
    "compare",
    "compareTo",
    "bettingMath",
    "handClasses"
  ];
  var _promise;
  var RangeQuery = class {
    constructor(promise) {
      __privateAdd(this, _promise);
      __privateSet(this, _promise, Promise.resolve(promise));
    }
    then(onFulfilled, onRejected) {
      return __privateGet(this, _promise).then(onFulfilled, onRejected);
    }
    catch(onRejected) {
      return __privateGet(this, _promise).catch(onRejected);
    }
    finally(onFinally) {
      return __privateGet(this, _promise).finally(onFinally);
    }
    get [Symbol.toStringTag]() {
      return "RangeQuery";
    }
  };
  _promise = new WeakMap();
  for (const name of ASYNC_RANGE_METHODS) {
    const run = RangeManager.prototype[name];
    RangeManager.prototype[name] = function(...args) {
      return new RangeQuery(Promise.resolve().then(() => run.apply(this, args)));
    };
  }
  for (const name of [...ASYNC_RANGE_METHODS, ...SYNC_RANGE_METHODS]) {
    RangeQuery.prototype[name] = function(...args) {
      return new RangeQuery(this.then((range) => range[name](...args)));
    };
  }
  for (const name of VALUE_METHODS) {
    RangeQuery.prototype[name] = function(...args) {
      return this.then((range) => range[name](...args));
    };
  }

  // entry.js
  window.RangeManager = RangeManager;
})();
