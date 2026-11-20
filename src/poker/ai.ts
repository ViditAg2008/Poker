import {
  AIBotProfile,
  AIDifficulty,
  AIPersonality,
  BettingActionType,
  Card,
  HandRankCategory,
} from './types';
import { evaluateHand } from './evaluator';
import type { PokerEngine } from './engine';

export const AI_BOT_ROSTER: AIBotProfile[] = [
  {
    name: 'Viktor Vance',
    avatar: 'crown',
    difficulty: 'advanced',
    personality: 'aggressive',
  },
  {
    name: 'Elena Rostova',
    avatar: 'shield',
    difficulty: 'advanced',
    personality: 'balanced',
  },
  {
    name: 'Silas Sterling',
    avatar: 'star',
    difficulty: 'intermediate',
    personality: 'conservative',
  },
  {
    name: 'Maya Lin',
    avatar: 'gem',
    difficulty: 'intermediate',
    personality: 'unpredictable',
  },
  {
    name: 'Jax Thorne',
    avatar: 'tiger',
    difficulty: 'beginner',
    personality: 'aggressive',
  },
  {
    name: 'Chloe Davenport',
    avatar: 'clover',
    difficulty: 'beginner',
    personality: 'conservative',
  },
  {
    name: 'Damian Cross',
    avatar: 'skull',
    difficulty: 'advanced',
    personality: 'unpredictable',
  },
  {
    name: 'Sophia Vance',
    avatar: 'flame',
    difficulty: 'intermediate',
    personality: 'balanced',
  },
];

export interface AIDecision {
  action: BettingActionType;
  amount?: number;
}

/**
 * Score 2 preflop hole cards from 0.0 to 1.0 (approximate Chen formula / Sklansky tiers)
 */
function evaluatePreflopStrength(c1: Card, c2: Card): number {
  const high = Math.max(c1.rank, c2.rank);
  const low = Math.min(c1.rank, c2.rank);
  const isPair = high === low;
  const isSuited = c1.suit === c2.suit;
  const gap = high - low;

  let score = 0;
  // High card value
  if (high === 14) score += 10;
  else if (high === 13) score += 8;
  else if (high === 12) score += 7;
  else if (high === 11) score += 6;
  else score += high / 2;

  // Pair bonus
  if (isPair) {
    score = Math.max(score * 2, 5);
    if (high >= 10) score += 8; // Pocket 10s or higher are premium
  }

  // Suited bonus
  if (isSuited) score += 2;

  // Gap penalty
  if (!isPair) {
    if (gap === 1) score += 1; // Connectors
    else if (gap === 2) score -= 1;
    else if (gap === 3) score -= 2;
    else if (gap >= 4) score -= 4;
  }

  // Normalize score between 0.0 and 1.0 (max score around 25 for AA)
  return Math.min(1.0, Math.max(0.05, score / 22));
}

/**
 * Evaluates made hand strength postflop from 0.0 to 1.0
 */
function evaluatePostflopStrength(holeCards: Card[], communityCards: Card[]): number {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5) return 0.5;

  const evaluated = evaluateHand(allCards);
  switch (evaluated.category) {
    case HandRankCategory.RoyalFlush:
    case HandRankCategory.StraightFlush:
    case HandRankCategory.FourOfAKind:
      return 1.0;
    case HandRankCategory.FullHouse:
      return 0.95;
    case HandRankCategory.Flush:
      return 0.88;
    case HandRankCategory.Straight:
      return 0.80;
    case HandRankCategory.ThreeOfAKind:
      return 0.72;
    case HandRankCategory.TwoPair:
      return 0.60;
    case HandRankCategory.OnePair: {
      const topHoleRank = Math.max(holeCards[0].rank, holeCards[1].rank);
      // Top pair / high pair
      if (evaluated.tiebreakers[0] >= 11 || evaluated.tiebreakers[0] === topHoleRank) {
        return 0.48;
      }
      return 0.35;
    }
    case HandRankCategory.HighCard:
    default:
      return Math.max(0.1, Math.max(holeCards[0].rank, holeCards[1].rank) / 28);
  }
}

/**
 * Main AI decision maker for an active bot.
 */
export function computeAIDecision(engine: PokerEngine, botId: string): AIDecision {
  const legal = engine.getLegalActions(botId);
  if (!legal) {
    return { action: 'fold' };
  }

  const bot = engine.players.find((p) => p.id === botId);
  if (!bot || bot.holeCards.length < 2) {
    return legal.canCheck ? { action: 'check' } : { action: 'fold' };
  }

  const personality: AIPersonality = bot.aiPersonality || 'balanced';
  const difficulty: AIDifficulty = bot.aiDifficulty || 'intermediate';

  // Base hand strength
  let strength: number;
  if (engine.phase === 'PREFLOP' || engine.communityCards.length === 0) {
    strength = evaluatePreflopStrength(bot.holeCards[0], bot.holeCards[1]);
  } else {
    strength = evaluatePostflopStrength(bot.holeCards, engine.communityCards);
  }

  // Adjust for personality
  if (personality === 'aggressive') {
    strength += 0.12;
  } else if (personality === 'conservative') {
    strength -= 0.10;
  } else if (personality === 'unpredictable') {
    // Add random noise
    strength += (Math.random() - 0.45) * 0.3;
  }

  // Pot odds calculation
  const totalPot = engine.pots.reduce((sum, p) => sum + p.amount, 0) +
    engine.players.reduce((sum, p) => sum + p.currentBet, 0);
  const callAmount = legal.callAmount || 0;
  const potOdds = callAmount > 0 ? callAmount / (totalPot + callAmount) : 0;

  // Sizing helpers
  const bb = engine.config.bigBlind;
  const chooseRaiseAmount = (multiplier: number): number => {
    let target = Math.round(multiplier * (totalPot > 0 ? totalPot : bb * 3));
    if (legal.canRaise) {
      target = Math.max(legal.minRaise, Math.min(legal.maxRaise, target));
      return target;
    }
    if (legal.canBet) {
      target = Math.max(legal.minBet, Math.min(legal.maxBet, target));
      return target;
    }
    return 0;
  };

  // 1. Monster Hand (Strength >= 0.85)
  if (strength >= 0.85) {
    // Strong raise or all-in
    if (legal.canRaise) {
      const amount = chooseRaiseAmount(personality === 'aggressive' ? 0.75 : 0.5);
      return { action: 'raise', amount };
    }
    if (legal.canBet) {
      const amount = chooseRaiseAmount(0.6);
      return { action: 'bet', amount };
    }
    if (legal.canCall) {
      return { action: 'call' };
    }
    return legal.canCheck ? { action: 'check' } : { action: 'call' };
  }

  // 2. Strong Hand (0.65 <= Strength < 0.85)
  if (strength >= 0.65) {
    if (legal.canBet && Math.random() < 0.8) {
      return { action: 'bet', amount: chooseRaiseAmount(0.4) };
    }
    if (legal.canRaise && Math.random() < 0.6) {
      return { action: 'raise', amount: chooseRaiseAmount(0.35) };
    }
    if (legal.canCall) {
      return { action: 'call' };
    }
    return legal.canCheck ? { action: 'check' } : { action: 'call' };
  }

  // 3. Medium Hand / Drawing Hand (0.42 <= Strength < 0.65)
  if (strength >= 0.42) {
    if (legal.canCheck) {
      // Occasional bluff probe bet
      if (legal.canBet && personality === 'aggressive' && Math.random() < 0.35) {
        return { action: 'bet', amount: legal.minBet };
      }
      return { action: 'check' };
    }
    // Call if pot odds are reasonable or bet is small
    if (legal.canCall) {
      if (callAmount <= bb * 2 || potOdds < 0.35 || Math.random() < 0.5) {
        return { action: 'call' };
      }
      return { action: 'fold' };
    }
    return { action: 'fold' };
  }

  // 4. Weak Hand (Strength < 0.42)
  if (legal.canCheck) {
    // Occasional bluff when checked to
    if (legal.canBet && personality === 'unpredictable' && Math.random() < 0.2) {
      return { action: 'bet', amount: legal.minBet };
    }
    return { action: 'check' };
  }

  // Facing a bet/raise with a weak hand
  if (callAmount === 0 && legal.canCheck) {
    return { action: 'check' };
  }

  // Beginner bots call too much
  if (difficulty === 'beginner' && callAmount <= bb && Math.random() < 0.35) {
    if (legal.canCall) return { action: 'call' };
  }

  // Otherwise fold
  return legal.canFold ? { action: 'fold' } : { action: 'check' };
}
