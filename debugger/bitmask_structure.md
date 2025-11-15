# Evaluation Bitmask Structure (64-bit)

## Visual Layout (MSB to LSB, left to right)

```
Bits:  63    62    61    60    59    58    57    56  |  55-52  |  51-26  |  25    24    23    22    21    20    19    18    17    16    15    14    13  |  12    11-9  8    7-5   4    3-1   0
       ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐       │        │       ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐ ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
       │ SF  │  Q  │ FH  │ FL  │ ST  │ TR  │ TP  │  P  │       │  Ace   │        │  A  │  K  │  Q  │  J  │  T  │  9  │  8  │  7  │  6  │  5  │  4  │  3  │ │  2  │     │  3  │     │  2  │     │ Ace │
       │     │     │     │     │     │     │     │     │       │ (high) │        │kick │kick │kick │kick │kick │kick │kick │kick │kick │kick │kick │kick │ │rank │     │rank │     │rank │     │(low)│
       └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘       └────────┘        └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘ └─────┴─────┴─────┴─────┴─────┴─────┴─────┘
       Score Flags (Hand Type)                                  Ace Rank           Kicker Ranks (rank + 13)                                                      Made Hand Ranks
```

**Legend:**
- **SF** = Straight Flush, **Q** = Quads, **FH** = Full House, **FL** = Flush, **ST** = Straight, **TR** = Trips, **TP** = Two Pair, **P** = Pair
- **kick** = Kicker rank
- **rank** = Made hand rank (from _bitTrips, _bitPairs, _bitQuads)

## Bit Regions:

### Bits 56-63: Hand Type Score Flags
- **Bit 63**: STRAIGHT_FLUSH_SCORE (1n << 63n)
- **Bit 62**: QUADS_SCORE (1n << 62n)
- **Bit 61**: FULL_HOUSE_SCORE (1n << 61n)
- **Bit 60**: FLUSH_SCORE (1n << 60n)
- **Bit 59**: STRAIGHT_SCORE (1n << 59n)
- **Bit 58**: TRIPS_SCORE (1n << 58n)
- **Bit 57**: TWO_PAIRS_SCORE (1n << 57n)
- **Bit 56**: PAIR_SCORE (1n << 56n)

### Bits 13-25: Kicker Ranks (encoded as rank + 13)
- **Bit 25**: Ace kicker (rank 12 + 13 = 25)
- **Bit 24**: King kicker (rank 11 + 13 = 24) ⚠️
- **Bit 23**: Queen kicker (rank 10 + 13 = 23)
- **Bit 22**: Jack kicker (rank 9 + 13 = 22)
- **Bit 21**: Ten kicker (rank 8 + 13 = 21)
- **Bit 20**: Nine kicker (rank 7 + 13 = 20) ⚠️
- **Bit 19**: Eight kicker (rank 6 + 13 = 19)
- **Bit 18**: Seven kicker (rank 5 + 13 = 18) ⚠️
- **Bit 17**: Six kicker (rank 4 + 13 = 17)
- **Bit 16**: Five kicker (rank 3 + 13 = 16) ⚠️
- **Bit 15**: Four kicker (rank 2 + 13 = 15)
- **Bit 14**: Three kicker (rank 1 + 13 = 14)
- **Bit 13**: Two kicker (rank 0 + 13 = 13)

### Bits 0-12, 52: Made Hand Rank Bits (from _bitTrips, _bitPairs, _bitQuads)
- **Bit 52**: Ace rank (high representation, rank 12) = 1n << 52n
- **Bit 48**: King rank (rank 11) = 1n << 48n
- **Bit 44**: Queen rank (rank 10) = 1n << 44n
- **Bit 40**: Jack rank (rank 9) = 1n << 40n
- **Bit 36**: Ten rank (rank 8) = 1n << 36n
- **Bit 32**: Nine rank (rank 7) = 1n << 32n
- **Bit 28**: Eight rank (rank 6) = 1n << 28n
- **Bit 24**: Seven rank (rank 5) = 1n << 24n ⚠️ **OVERLAPS with King kicker!**
- **Bit 20**: Six rank (rank 4) = 1n << 20n ⚠️ **OVERLAPS with Nine kicker!**
- **Bit 16**: Five rank (rank 3) = 1n << 16n ⚠️ **OVERLAPS with Five kicker!**
- **Bit 12**: Four rank (rank 2) = 1n << 12n
- **Bit 8**: Three rank (rank 1) = 1n << 8n
- **Bit 4**: Two rank (rank 0) = 1n << 4n
- **Bit 0**: Ace rank (low representation, rank 12) = 1n - used for quads

### Bits 26-51: Unused/Reserved
- Currently not used in the evaluation bitmask (except bit 52 for Ace)

## ⚠️ OVERLAP ISSUES:

The kicker encoding `(rank + 13)` overlaps with made hand rank encoding `((rank + 1) * 4)`:

| Rank | Made Hand Bit | Kicker Bit | Overlap? |
|------|---------------|------------|----------|
| 12 (Ace) | 52 (high), 0 (low) | 25 | No |
| 11 (King) | 48 | 24 | **YES** - overlaps with rank 5 (Seven) |
| 10 (Queen) | 44 | 23 | No |
| 9 (Jack) | 40 | 22 | No |
| 8 (Ten) | 36 | 21 | No |
| 7 (Nine) | 32 | 20 | **YES** - overlaps with rank 4 (Six) |
| 6 (Eight) | 28 | 19 | No |
| 5 (Seven) | 24 | 18 | **YES** - overlaps with rank 11 (King) kicker |
| 4 (Six) | 20 | 17 | **YES** - overlaps with rank 7 (Nine) kicker |
| 3 (Five) | 16 | 16 | **YES** - overlaps with rank 3 (Five) kicker |
| 2 (Four) | 12 | 15 | No |
| 1 (Three) | 8 | 14 | No |
| 0 (Two) | 4 | 13 | No |

## Example: Full House (7s full of 4s)

```
Bit 61: FULL_HOUSE_SCORE = 1
Bit 24: Seven rank (trips) = 1  (from _bitTrips, rank 5)
Bit 12: Four rank (pair) = 1    (from _bitPairs, rank 2)
Bits 13-25: Kickers = 0 (no kickers for full house)
```

## Example: Trips (7s) with Ace and King kickers

```
Bit 58: TRIPS_SCORE = 1
Bit 24: Seven rank (trips) = 1  (from _bitTrips, rank 5 = bit 24)
Bit 25: Ace kicker = 1          (rank 12 + 13 = bit 25)
Bit 24: King kicker = 1         (rank 11 + 13 = bit 24) ⚠️ OVERLAPS with Seven rank!
```

**⚠️ OVERLAP ISSUE**: 
- King kicker (rank 11) = bit 24 (11 + 13 = 24)
- Seven made hand (rank 5) = bit 24 (5 * 4 + 4 = 24)
- **These overlap!** This causes the Ace kicker bug.

## Example: Pair (7s) with Ace, King, Queen kickers

```
Bit 56: PAIR_SCORE = 1
Bit 24: Seven rank (pair) = 1   (from _bitPairs, rank 5 = bit 24)
Bit 25: Ace kicker = 1           (rank 12 + 13 = bit 25)
Bit 24: King kicker = 1          (rank 11 + 13 = bit 24) ⚠️ OVERLAPS with pair rank!
Bit 23: Queen kicker = 1         (rank 10 + 13 = bit 23)
```

**The Problem**: 
- Kicker encoding: `1n << (rank + 13n)`
- Made hand rank encoding: `1n << ((rank + 1) * 4)`
- For rank 11 (King): kicker = bit 24, but rank 5 (Seven) also = bit 24
- When an Ace kicker is present, it sets bit 25, but residual bits from made hand detection can also set bits in overlapping positions

**This is the root cause of the Ace kicker issue** - the kicker encoding overlaps with made hand rank bits, causing residual bits to appear when an Ace is in the hand.
