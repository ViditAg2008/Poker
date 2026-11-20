import { Card, EvaluatedHand, HandRankCategory, Rank, Suit } from './types';

export const RANK_NAMES: Record<number, string> = {
  2: 'Two',
  3: 'Three',
  4: 'Four',
  5: 'Five',
  6: 'Six',
  7: 'Seven',
  8: 'Eight',
  9: 'Nine',
  10: 'Ten',
  11: 'Jack',
  12: 'Queen',
  13: 'King',
  14: 'Ace',
};

export const RANK_PLURALS: Record<number, string> = {
  2: 'Twos',
  3: 'Threes',
  4: 'Fours',
  5: 'Fives',
  6: 'Sixes',
  7: 'Sevens',
  8: 'Eights',
  9: 'Nines',
  10: 'Tens',
  11: 'Jacks',
  12: 'Queens',
  13: 'Kings',
  14: 'Aces',
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export function createCard(rank: Rank, suit: Suit): Card {
  let rankStr = rank.toString();
  if (rank === 14) rankStr = 'A';
  else if (rank === 13) rankStr = 'K';
  else if (rank === 12) rankStr = 'Q';
  else if (rank === 11) rankStr = 'J';

  const suitChar = suit[0];
  return {
    suit,
    rank,
    id: `${rankStr}${suitChar}`,
  };
}

export function createDeck(): Card[] {
  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push(createCard(rank, suit));
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Generate all combinations of k elements from array.
 */
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const head = arr[0];
  const tail = arr.slice(1);
  const withHead = combinations(tail, k - 1).map((c) => [head, ...c]);
  const withoutHead = combinations(tail, k);
  return [...withHead, ...withoutHead];
}

/**
 * Evaluates exactly 5 cards.
 */
function evaluate5Cards(cards: Card[]): EvaluatedHand {
  // Sort descending by rank
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);

  // Group by rank
  const rankCounts: Record<number, number> = {};
  for (const c of sorted) {
    rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
  }

  // Check flush
  const isFlush = sorted.every((c) => c.suit === sorted[0].suit);

  // Check straight
  // Distinct sorted ranks
  const distinctRanks = Array.from(new Set(sorted.map((c) => c.rank)));
  let isStraight = false;
  let straightHigh = 0;
  let isAceLowStraight = false;

  if (distinctRanks.length === 5) {
    if (distinctRanks[0] - distinctRanks[4] === 4) {
      isStraight = true;
      straightHigh = distinctRanks[0];
    } else if (
      distinctRanks[0] === 14 &&
      distinctRanks[1] === 5 &&
      distinctRanks[2] === 4 &&
      distinctRanks[3] === 3 &&
      distinctRanks[4] === 2
    ) {
      isStraight = true;
      straightHigh = 5;
      isAceLowStraight = true;
    }
  }

  // If ace low straight, reorder cards for best5: 5, 4, 3, 2, A
  let straightBest5 = sorted;
  if (isAceLowStraight) {
    const ace = sorted.find((c) => c.rank === 14)!;
    const others = sorted.filter((c) => c.rank !== 14);
    straightBest5 = [...others, ace];
  }

  // 1. Royal Flush / Straight Flush
  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      return {
        category: HandRankCategory.RoyalFlush,
        score: computeHandScore(HandRankCategory.RoyalFlush, [14]),
        description: `Royal Flush in ${sorted[0].suit}`,
        best5: sorted,
        tiebreakers: [14],
      };
    }
    return {
      category: HandRankCategory.StraightFlush,
      score: computeHandScore(HandRankCategory.StraightFlush, [straightHigh]),
      description: `Straight Flush, ${RANK_NAMES[straightHigh]} high`,
      best5: straightBest5,
      tiebreakers: [straightHigh],
    };
  }

  // Count frequencies
  const counts = Object.entries(rankCounts)
    .map(([rank, count]) => ({ rank: Number(rank), count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.rank - a.rank;
    });

  // 2. Four of a Kind
  if (counts[0].count === 4) {
    const quadRank = counts[0].rank;
    const kicker = counts[1].rank;
    const best5 = [
      ...sorted.filter((c) => c.rank === quadRank),
      ...sorted.filter((c) => c.rank === kicker),
    ];
    return {
      category: HandRankCategory.FourOfAKind,
      score: computeHandScore(HandRankCategory.FourOfAKind, [quadRank, kicker]),
      description: `Four of a Kind, ${RANK_PLURALS[quadRank]}`,
      best5,
      tiebreakers: [quadRank, kicker],
    };
  }

  // 3. Full House
  if (counts[0].count === 3 && counts[1].count === 2) {
    const tripsRank = counts[0].rank;
    const pairRank = counts[1].rank;
    const best5 = [
      ...sorted.filter((c) => c.rank === tripsRank),
      ...sorted.filter((c) => c.rank === pairRank),
    ];
    return {
      category: HandRankCategory.FullHouse,
      score: computeHandScore(HandRankCategory.FullHouse, [tripsRank, pairRank]),
      description: `Full House, ${RANK_PLURALS[tripsRank]} full of ${RANK_PLURALS[pairRank]}`,
      best5,
      tiebreakers: [tripsRank, pairRank],
    };
  }

  // 4. Flush
  if (isFlush) {
    const tiebreakers = sorted.map((c) => c.rank);
    return {
      category: HandRankCategory.Flush,
      score: computeHandScore(HandRankCategory.Flush, tiebreakers),
      description: `Flush, ${RANK_NAMES[tiebreakers[0]]} high`,
      best5: sorted,
      tiebreakers,
    };
  }

  // 5. Straight
  if (isStraight) {
    return {
      category: HandRankCategory.Straight,
      score: computeHandScore(HandRankCategory.Straight, [straightHigh]),
      description: `Straight, ${RANK_NAMES[straightHigh]} high`,
      best5: straightBest5,
      tiebreakers: [straightHigh],
    };
  }

  // 6. Three of a Kind
  if (counts[0].count === 3) {
    const tripsRank = counts[0].rank;
    const kickers = [counts[1].rank, counts[2].rank].sort((a, b) => b - a);
    const best5 = [
      ...sorted.filter((c) => c.rank === tripsRank),
      ...sorted.filter((c) => kickers.includes(c.rank)),
    ];
    return {
      category: HandRankCategory.ThreeOfAKind,
      score: computeHandScore(HandRankCategory.ThreeOfAKind, [tripsRank, ...kickers]),
      description: `Three of a Kind, ${RANK_PLURALS[tripsRank]}`,
      best5,
      tiebreakers: [tripsRank, ...kickers],
    };
  }

  // 7. Two Pair
  if (counts[0].count === 2 && counts[1].count === 2) {
    const highPair = Math.max(counts[0].rank, counts[1].rank);
    const lowPair = Math.min(counts[0].rank, counts[1].rank);
    const kicker = counts[2].rank;
    const best5 = [
      ...sorted.filter((c) => c.rank === highPair),
      ...sorted.filter((c) => c.rank === lowPair),
      ...sorted.filter((c) => c.rank === kicker),
    ];
    return {
      category: HandRankCategory.TwoPair,
      score: computeHandScore(HandRankCategory.TwoPair, [highPair, lowPair, kicker]),
      description: `Two Pair, ${RANK_PLURALS[highPair]} and ${RANK_PLURALS[lowPair]}`,
      best5,
      tiebreakers: [highPair, lowPair, kicker],
    };
  }

  // 8. One Pair
  if (counts[0].count === 2) {
    const pairRank = counts[0].rank;
    const kickers = [counts[1].rank, counts[2].rank, counts[3].rank].sort((a, b) => b - a);
    const best5 = [
      ...sorted.filter((c) => c.rank === pairRank),
      ...sorted.filter((c) => kickers.includes(c.rank)),
    ];
    return {
      category: HandRankCategory.OnePair,
      score: computeHandScore(HandRankCategory.OnePair, [pairRank, ...kickers]),
      description: `Pair of ${RANK_PLURALS[pairRank]}`,
      best5,
      tiebreakers: [pairRank, ...kickers],
    };
  }

  // 9. High Card
  const tiebreakers = sorted.map((c) => c.rank);
  return {
    category: HandRankCategory.HighCard,
    score: computeHandScore(HandRankCategory.HighCard, tiebreakers),
    description: `High Card, ${RANK_NAMES[tiebreakers[0]]}`,
    best5: sorted,
    tiebreakers,
  };
}

/**
 * Computes a unique numeric score for hand comparison.
 * Category has highest weight, followed by up to 5 tie-breaking ranks.
 */
function computeHandScore(category: HandRankCategory, tiebreakers: number[]): number {
  let score = category * 100_000_000_000;
  let multiplier = 1_000_000_000;
  for (let i = 0; i < 5; i++) {
    const rank = tiebreakers[i] || 0;
    score += rank * multiplier;
    multiplier /= 100;
  }
  return score;
}

/**
 * Evaluates any hand containing between 5 and 7 cards.
 * Returns the best possible 5-card evaluation.
 */
export function evaluateHand(cards: Card[]): EvaluatedHand {
  if (cards.length < 5) {
    throw new Error(`Cannot evaluate poker hand with only ${cards.length} cards.`);
  }

  if (cards.length === 5) {
    return evaluate5Cards(cards);
  }

  // Choose best 5-card combo out of 6 or 7 cards
  const allCombos = combinations(cards, 5);
  let bestHand: EvaluatedHand | null = null;

  for (const combo of allCombos) {
    const evaluated = evaluate5Cards(combo);
    if (!bestHand || evaluated.score > bestHand.score) {
      bestHand = evaluated;
    }
  }

  return bestHand!;
}

/**
 * Compare two hands. Returns > 0 if a wins, < 0 if b wins, 0 if tie.
 */
export function compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
  return a.score - b.score;
}
