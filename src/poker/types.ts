export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

// Rank: 2-14 (11=J, 12=Q, 13=K, 14=A)
export type Rank = number;

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // e.g. 'As', '10h', 'Kd'
}

export type GamePhase =
  | 'WAITING'
  | 'PREFLOP'
  | 'FLOP'
  | 'TURN'
  | 'RIVER'
  | 'SHOWDOWN';

export type BettingActionType =
  | 'fold'
  | 'check'
  | 'call'
  | 'bet'
  | 'raise'
  | 'all-in'
  | 'thinking';

export enum HandRankCategory {
  HighCard = 1,
  OnePair = 2,
  TwoPair = 3,
  ThreeOfAKind = 4,
  Straight = 5,
  Flush = 6,
  FullHouse = 7,
  FourOfAKind = 8,
  StraightFlush = 9,
  RoyalFlush = 10,
}

export interface EvaluatedHand {
  category: HandRankCategory;
  score: number;
  description: string;
  best5: Card[];
  tiebreakers: number[];
}

export type AIDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type AIPersonality =
  | 'conservative'
  | 'aggressive'
  | 'balanced'
  | 'unpredictable';

export interface AIBotProfile {
  name: string;
  avatar: string;
  difficulty: AIDifficulty;
  personality: AIPersonality;
}

export interface RoomConfig {
  mode: 'ai' | 'multiplayer';
  smallBlind: number;
  bigBlind: number;
  startingChips: number;
  maxPlayers: number;
  turnTimerSeconds: number;
  allowSpectators: boolean;
}

export interface PlayerActionRecord {
  type: BettingActionType;
  amount?: number;
  timestamp?: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  chips: number;
  currentBet: number;
  totalHandBet: number;
  folded: boolean;
  isAllIn: boolean;
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
  aiPersonality?: AIPersonality;
  seatIndex: number;
  isSpectator?: boolean;
  holeCards: Card[];
  lastAction?: PlayerActionRecord;
  evaluatedHand?: EvaluatedHand;
  connected?: boolean;
}

export interface Pot {
  name: string;
  amount: number;
  eligiblePlayerIds: string[];
}

export interface PotAward {
  potName: string;
  amount: number;
  winnerIds: string[];
  winnerNames: string[];
  winningHandName: string;
  winningCardIds: string[];
}

export interface HandHistoryAction {
  playerId: string;
  playerName: string;
  type: BettingActionType;
  amount: number;
  phase: GamePhase;
  timestamp: number;
}

export interface HandHistoryPlayerSummary {
  id: string;
  name: string;
  isAI: boolean;
  startingChips: number;
  endingChips: number;
  netChange: number;
  holeCards: Card[];
  folded: boolean;
  handName: string;
}

export interface HandHistorySummary {
  handId: string;
  roomCode: string;
  handNumber: number;
  timestamp: number;
  communityCards: Card[];
  totalPot: number;
  awards: PotAward[];
  actions: HandHistoryAction[];
  players: HandHistoryPlayerSummary[];
}

export interface PlayerStats {
  playerName: string;
  avatar: string;
  handsPlayed: number;
  handsWon: number;
  totalGamesSessions: number;
  biggestPotWon: number;
  totalChipsWon: number;
  bestHandCategory: number;
  bestHandName: string;
  opponentsPlayed: Record<string, number>;
  recentHands: HandHistorySummary[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text?: string;
  emote?: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canBet: boolean;
  minBet: number;
  maxBet: number;
  canRaise: boolean;
  minRaise: number;
  maxRaise: number;
  isAllIn: boolean;
}

export interface ClientPlayerView {
  id: string;
  name: string;
  avatar: string;
  chips: number;
  currentBet: number;
  folded: boolean;
  isAllIn: boolean;
  isAI: boolean;
  seatIndex: number;
  isSpectator?: boolean;
  lastAction?: PlayerActionRecord;
  holeCards?: Card[]; // Only provided if self or during Showdown
  cardCount: number;
  evaluatedHand?: EvaluatedHand; // Only provided at Showdown
}

export interface ClientGameState {
  roomCode: string;
  roomId: string;
  hostId: string;
  phase: GamePhase;
  handNumber: number;
  players: ClientPlayerView[];
  spectators: { id: string; name: string; avatar: string }[];
  communityCards: Card[];
  pots: Pot[];
  currentPot: number;
  activePlayerId: string | null;
  dealerSeatIndex: number;
  smallBlindSeatIndex: number;
  bigBlindSeatIndex: number;
  turnDeadline: number | null;
  config: RoomConfig;
  legalActions: LegalActions | null;
  recentAwards?: PotAward[];
  handHistory?: HandHistorySummary[];
  chatMessages: ChatMessage[];
  minRaise: number;
  currentBet: number;
}
