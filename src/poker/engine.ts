import {
  BettingActionType,
  Card,
  ChatMessage,
  ClientGameState,
  ClientPlayerView,
  GamePhase,
  HandHistoryAction,
  HandHistoryPlayerSummary,
  HandHistorySummary,
  LegalActions,
  Player,
  Pot,
  PotAward,
  RoomConfig,
} from './types';
import {
  compareHands,
  createDeck,
  evaluateHand,
  shuffleDeck,
} from './evaluator';

export class PokerEngine {
  public roomId: string;
  public roomCode: string;
  public hostId: string;
  public config: RoomConfig;

  public phase: GamePhase = 'WAITING';
  public handNumber: number = 0;
  public deck: Card[] = [];
  public communityCards: Card[] = [];
  public pots: Pot[] = [];
  public players: Player[] = [];
  public spectators: { id: string; name: string; avatar: string }[] = [];

  public activePlayerId: string | null = null;
  public dealerSeatIndex: number = 0;
  public smallBlindSeatIndex: number = 0;
  public bigBlindSeatIndex: number = 0;

  public currentBet: number = 0;
  public minRaise: number = 0;
  public lastRaiseDelta: number = 0;
  public turnDeadline: number | null = null;

  public chatMessages: ChatMessage[] = [];
  public handHistory: HandHistorySummary[] = [];
  public recentAwards: PotAward[] = [];

  private actionHistory: HandHistoryAction[] = [];
  private handStartingChips: Record<string, number> = {};
  private actedThisRound: Set<string> = new Set();

  constructor(
    roomId: string,
    roomCode: string,
    hostId: string,
    options?: Partial<RoomConfig> & { mode?: 'ai' | 'multiplayer' }
  ) {
    this.roomId = roomId;
    this.roomCode = roomCode;
    this.hostId = hostId;

    this.config = {
      mode: options?.mode || 'multiplayer',
      smallBlind: Math.max(1, Number(options?.smallBlind) || 10),
      bigBlind: Math.max(2, Number(options?.bigBlind) || 20),
      startingChips: Math.max(200, Number(options?.startingChips) || 2000),
      maxPlayers: Math.min(8, Math.max(2, Number(options?.maxPlayers) || 8)),
      turnTimerSeconds:
        options?.turnTimerSeconds !== undefined
          ? Number(options?.turnTimerSeconds)
          : 25,
      allowSpectators:
        options?.allowSpectators !== undefined
          ? Boolean(options?.allowSpectators)
          : true,
    };
  }

  // ==========================================
  // Player & Seat Management
  // ==========================================

  public addPlayer(options: {
    id: string;
    name: string;
    avatar: string;
    isAI?: boolean;
    aiDifficulty?: any;
    aiPersonality?: any;
    asSpectator?: boolean;
  }): Player | null {
    // If existing player reconnects
    const existing = this.players.find((p) => p.id === options.id);
    if (existing) {
      existing.name = options.name;
      existing.avatar = options.avatar;
      existing.connected = true;
      return existing;
    }

    // Check if spectator
    if (options.asSpectator || this.players.length >= this.config.maxPlayers) {
      if (!this.spectators.some((s) => s.id === options.id)) {
        this.spectators.push({
          id: options.id,
          name: options.name,
          avatar: options.avatar,
        });
      }
      return null;
    }

    // Find first available seat index
    const takenSeats = new Set(this.players.map((p) => p.seatIndex));
    let seatIndex = 0;
    while (seatIndex < this.config.maxPlayers && takenSeats.has(seatIndex)) {
      seatIndex++;
    }

    const newPlayer: Player = {
      id: options.id,
      name: options.name,
      avatar: options.avatar,
      chips: this.config.startingChips,
      currentBet: 0,
      totalHandBet: 0,
      folded: true, // will participate on next hand
      isAllIn: false,
      isAI: Boolean(options.isAI),
      aiDifficulty: options.aiDifficulty,
      aiPersonality: options.aiPersonality,
      seatIndex,
      holeCards: [],
      connected: true,
    };

    this.players.push(newPlayer);
    this.players.sort((a, b) => a.seatIndex - b.seatIndex);
    return newPlayer;
  }

  public removePlayer(playerId: string, permanent: boolean = false): void {
    const pIdx = this.players.findIndex((p) => p.id === playerId);
    if (pIdx === -1) {
      this.spectators = this.spectators.filter((s) => s.id !== playerId);
      return;
    }

    const player = this.players[pIdx];

    // If game in progress, auto fold
    if (this.phase !== 'WAITING' && this.phase !== 'SHOWDOWN' && !player.folded) {
      this.handleAction(playerId, 'fold');
    }

    if (permanent) {
      this.players.splice(pIdx, 1);
      if (this.hostId === playerId && this.players.length > 0) {
        // Transfer host to first human or first remaining player
        const nextHost = this.players.find((p) => !p.isAI) || this.players[0];
        this.hostId = nextHost.id;
      }
    } else {
      player.connected = false;
    }
  }

  public toggleSpectator(
    playerId: string,
    playerName: string,
    avatar: string
  ): { ok: boolean; isSpectator: boolean; error?: string } {
    const playerIndex = this.players.findIndex((p) => p.id === playerId);

    if (playerIndex >= 0) {
      // Move from table seat to spectator
      if (this.phase !== 'WAITING' && this.phase !== 'SHOWDOWN') {
        const p = this.players[playerIndex];
        if (!p.folded) {
          this.handleAction(playerId, 'fold');
        }
      }
      this.players.splice(playerIndex, 1);
      this.spectators.push({ id: playerId, name: playerName, avatar });
      return { ok: true, isSpectator: true };
    } else {
      // Move from spectator to player seat
      if (this.players.length >= this.config.maxPlayers) {
        return {
          ok: false,
          isSpectator: true,
          error: 'Table is full. Cannot take a seat.',
        };
      }
      this.spectators = this.spectators.filter((s) => s.id !== playerId);
      const seated = this.addPlayer({
        id: playerId,
        name: playerName,
        avatar,
        asSpectator: false,
      });
      return { ok: true, isSpectator: !seated };
    }
  }

  public getPlayerBySeat(seatIndex: number): Player | undefined {
    return this.players.find((p) => p.seatIndex === seatIndex);
  }

  public rebuyPlayer(playerId: string): boolean {
    if (this.phase !== 'WAITING' && this.phase !== 'SHOWDOWN') {
      return false;
    }
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return false;

    if (player.chips < this.config.startingChips) {
      player.chips = this.config.startingChips;
      return true;
    }
    return false;
  }

  // ==========================================
  // Hand Initialization & Blinds
  // ==========================================

  public startHand(): { ok: boolean; error?: string } {
    const activeCandidates = this.players.filter((p) => p.chips > 0);
    if (activeCandidates.length < 2) {
      return {
        ok: false,
        error: 'At least 2 players with chips are required to start a hand.',
      };
    }

    this.handNumber += 1;
    this.deck = shuffleDeck(createDeck());
    this.communityCards = [];
    this.pots = [];
    this.recentAwards = [];
    this.actionHistory = [];
    this.handStartingChips = {};
    this.actedThisRound.clear();

    // Reset players for new hand
    for (const p of this.players) {
      this.handStartingChips[p.id] = p.chips;
      p.currentBet = 0;
      p.totalHandBet = 0;
      p.lastAction = undefined;
      p.evaluatedHand = undefined;
      p.holeCards = [];
      if (p.chips > 0) {
        p.folded = false;
        p.isAllIn = false;
      } else {
        p.folded = true;
        p.isAllIn = false;
      }
    }

    const seatedActive = this.players.filter((p) => !p.folded);

    // Rotate dealer button
    if (this.handNumber === 1) {
      this.dealerSeatIndex = seatedActive[0].seatIndex;
    } else {
      this.dealerSeatIndex = this.getNextActiveSeat(this.dealerSeatIndex, seatedActive);
    }

    // Determine Small Blind and Big Blind seats
    if (seatedActive.length === 2) {
      // Heads-up rule: Dealer is Small Blind, other player is Big Blind
      this.smallBlindSeatIndex = this.dealerSeatIndex;
      this.bigBlindSeatIndex = this.getNextActiveSeat(this.dealerSeatIndex, seatedActive);
    } else {
      this.smallBlindSeatIndex = this.getNextActiveSeat(this.dealerSeatIndex, seatedActive);
      this.bigBlindSeatIndex = this.getNextActiveSeat(this.smallBlindSeatIndex, seatedActive);
    }

    // Deal 2 hole cards to each participating player
    for (let round = 0; round < 2; round++) {
      for (const p of seatedActive) {
        const card = this.deck.pop();
        if (card) p.holeCards.push(card);
      }
    }

    // Post blinds
    const sbPlayer = this.getPlayerBySeat(this.smallBlindSeatIndex);
    const bbPlayer = this.getPlayerBySeat(this.bigBlindSeatIndex);

    if (sbPlayer) {
      const sbAmount = Math.min(sbPlayer.chips, this.config.smallBlind);
      sbPlayer.chips -= sbAmount;
      sbPlayer.currentBet = sbAmount;
      sbPlayer.totalHandBet = sbAmount;
      sbPlayer.lastAction = { type: 'bet', amount: sbAmount };
      if (sbPlayer.chips === 0) sbPlayer.isAllIn = true;
    }

    if (bbPlayer) {
      const bbAmount = Math.min(bbPlayer.chips, this.config.bigBlind);
      bbPlayer.chips -= bbAmount;
      bbPlayer.currentBet = bbAmount;
      bbPlayer.totalHandBet = bbAmount;
      bbPlayer.lastAction = { type: 'bet', amount: bbAmount };
      if (bbPlayer.chips === 0) bbPlayer.isAllIn = true;
    }

    this.currentBet = this.config.bigBlind;
    this.minRaise = this.config.bigBlind * 2;
    this.lastRaiseDelta = this.config.bigBlind;

    this.phase = 'PREFLOP';

    // First to act preflop:
    // In Heads-up: Dealer (Small Blind) acts first preflop
    // In 3+ players: Under the Gun (player after Big Blind) acts first preflop
    let firstActorSeat: number;
    if (seatedActive.length === 2) {
      firstActorSeat = this.smallBlindSeatIndex;
    } else {
      firstActorSeat = this.getNextActiveSeat(this.bigBlindSeatIndex, seatedActive);
    }

    const firstActor = this.getPlayerBySeat(firstActorSeat);
    this.activePlayerId = firstActor ? firstActor.id : seatedActive[0].id;
    this.turnDeadline = Date.now() + this.config.turnTimerSeconds * 1000;

    return { ok: true };
  }

  // ==========================================
  // Turn & Action Validation
  // ==========================================

  public getLegalActions(playerId: string): LegalActions | null {
    if (this.phase === 'WAITING' || this.phase === 'SHOWDOWN') {
      return null;
    }
    const player = this.players.find((p) => p.id === playerId);
    if (!player || player.folded || player.isAllIn) {
      return null;
    }

    const canFold = true;
    const canCheck = player.currentBet === this.currentBet;
    const callAmount = Math.min(player.chips, this.currentBet - player.currentBet);
    const canCall = player.currentBet < this.currentBet && player.chips > 0;

    const canBet = this.currentBet === 0 && player.chips > 0;
    const minBet = Math.min(player.chips, this.config.bigBlind);
    const maxBet = player.chips;

    const remainingChips = player.chips - callAmount;
    const canRaise = this.currentBet > 0 && remainingChips > 0;
    const minRaiseTarget = this.currentBet + this.lastRaiseDelta;
    const minRaise = Math.min(player.currentBet + player.chips, minRaiseTarget);
    const maxRaise = player.currentBet + player.chips;

    return {
      canFold,
      canCheck,
      canCall,
      callAmount,
      canBet,
      minBet,
      maxBet,
      canRaise,
      minRaise,
      maxRaise,
      isAllIn: player.isAllIn,
    };
  }

  public handleAction(
    playerId: string,
    action: BettingActionType,
    amount?: number
  ): { ok: boolean; error?: string } {
    if (this.phase === 'WAITING' || this.phase === 'SHOWDOWN') {
      return { ok: false, error: 'No hand is currently active.' };
    }
    if (this.activePlayerId !== playerId) {
      return { ok: false, error: 'It is not your turn to act.' };
    }

    const legal = this.getLegalActions(playerId);
    if (!legal) {
      return { ok: false, error: 'No legal actions available.' };
    }

    const player = this.players.find((p) => p.id === playerId)!;
    const now = Date.now();

    switch (action) {
      case 'fold': {
        player.folded = true;
        player.lastAction = { type: 'fold', timestamp: now };
        this.actionHistory.push({
          playerId: player.id,
          playerName: player.name,
          type: 'fold',
          amount: 0,
          phase: this.phase,
          timestamp: now,
        });
        break;
      }

      case 'check': {
        if (!legal.canCheck) {
          return { ok: false, error: 'Cannot check when facing a bet.' };
        }
        player.lastAction = { type: 'check', timestamp: now };
        this.actionHistory.push({
          playerId: player.id,
          playerName: player.name,
          type: 'check',
          amount: 0,
          phase: this.phase,
          timestamp: now,
        });
        this.actedThisRound.add(player.id);
        break;
      }

      case 'call': {
        if (!legal.canCall) {
          return { ok: false, error: 'Cannot call when no bet is pending.' };
        }
        const callAmt = legal.callAmount;
        player.chips -= callAmt;
        player.currentBet += callAmt;
        player.totalHandBet += callAmt;
        if (player.chips === 0) player.isAllIn = true;

        player.lastAction = { type: 'call', amount: callAmt, timestamp: now };
        this.actionHistory.push({
          playerId: player.id,
          playerName: player.name,
          type: 'call',
          amount: callAmt,
          phase: this.phase,
          timestamp: now,
        });
        this.actedThisRound.add(player.id);
        break;
      }

      case 'bet': {
        if (!legal.canBet) {
          return { ok: false, error: 'Cannot bet when a bet already exists.' };
        }
        const betAmount = Math.max(legal.minBet, Math.min(legal.maxBet, Math.floor(amount || legal.minBet)));
        player.chips -= betAmount;
        player.currentBet += betAmount;
        player.totalHandBet += betAmount;
        if (player.chips === 0) player.isAllIn = true;

        this.currentBet = player.currentBet;
        this.lastRaiseDelta = betAmount;
        this.minRaise = this.currentBet + this.lastRaiseDelta;

        player.lastAction = { type: 'bet', amount: betAmount, timestamp: now };
        this.actionHistory.push({
          playerId: player.id,
          playerName: player.name,
          type: 'bet',
          amount: betAmount,
          phase: this.phase,
          timestamp: now,
        });

        // Re-open action for others
        this.actedThisRound.clear();
        this.actedThisRound.add(player.id);
        break;
      }

      case 'raise': {
        if (!legal.canRaise) {
          return { ok: false, error: 'Cannot raise at this time.' };
        }
        let targetTotal = Math.floor(amount || legal.minRaise);
        targetTotal = Math.max(legal.minRaise, Math.min(legal.maxRaise, targetTotal));

        const chipsNeeded = targetTotal - player.currentBet;
        if (chipsNeeded > player.chips) {
          return { ok: false, error: 'Not enough chips to complete raise.' };
        }

        const raiseDelta = targetTotal - this.currentBet;
        if (raiseDelta >= this.lastRaiseDelta) {
          this.lastRaiseDelta = raiseDelta;
        }

        player.chips -= chipsNeeded;
        player.currentBet = targetTotal;
        player.totalHandBet += chipsNeeded;
        if (player.chips === 0) player.isAllIn = true;

        this.currentBet = targetTotal;
        this.minRaise = this.currentBet + this.lastRaiseDelta;

        player.lastAction = { type: 'raise', amount: targetTotal, timestamp: now };
        this.actionHistory.push({
          playerId: player.id,
          playerName: player.name,
          type: 'raise',
          amount: targetTotal,
          phase: this.phase,
          timestamp: now,
        });

        // Re-open action
        this.actedThisRound.clear();
        this.actedThisRound.add(player.id);
        break;
      }

      case 'all-in': {
        const totalAvail = player.currentBet + player.chips;
        if (totalAvail <= this.currentBet) {
          // All-in as a call
          const callAmt = player.chips;
          player.chips = 0;
          player.currentBet += callAmt;
          player.totalHandBet += callAmt;
          player.isAllIn = true;
          player.lastAction = { type: 'all-in', amount: player.currentBet, timestamp: now };
          this.actionHistory.push({
            playerId: player.id,
            playerName: player.name,
            type: 'all-in',
            amount: player.currentBet,
            phase: this.phase,
            timestamp: now,
          });
          this.actedThisRound.add(player.id);
        } else {
          // All-in as a bet/raise
          const chipsNeeded = player.chips;
          const newBet = player.currentBet + chipsNeeded;
          const raiseDelta = newBet - this.currentBet;
          if (raiseDelta >= this.lastRaiseDelta) {
            this.lastRaiseDelta = raiseDelta;
          }

          player.chips = 0;
          player.currentBet = newBet;
          player.totalHandBet += chipsNeeded;
          player.isAllIn = true;

          this.currentBet = newBet;
          this.minRaise = this.currentBet + this.lastRaiseDelta;

          player.lastAction = { type: 'all-in', amount: newBet, timestamp: now };
          this.actionHistory.push({
            playerId: player.id,
            playerName: player.name,
            type: 'all-in',
            amount: newBet,
            phase: this.phase,
            timestamp: now,
          });

          this.actedThisRound.clear();
          this.actedThisRound.add(player.id);
        }
        break;
      }

      default:
        return { ok: false, error: 'Unknown action type.' };
    }

    this.checkRoundOrHandProgress();
    return { ok: true };
  }

  // ==========================================
  // Game Flow & Round Advancement
  // ==========================================

  private checkRoundOrHandProgress(): void {
    const nonFolded = this.players.filter((p) => !p.folded);

    // 1. If only 1 player remains unfolded -> they win immediately
    if (nonFolded.length === 1) {
      this.collectBetsIntoPots();
      this.resolveSingleWinner(nonFolded[0]);
      return;
    }

    // 2. Check if betting round is complete
    // Betting round is complete when every active (non-folded, non-all-in) player
    // has acted this round AND has matched this.currentBet
    const activeContenders = nonFolded.filter((p) => !p.isAllIn);

    const isRoundComplete =
      activeContenders.length === 0 ||
      activeContenders.every(
        (p) => this.actedThisRound.has(p.id) && p.currentBet === this.currentBet
      );

    if (isRoundComplete) {
      this.advanceBettingRound();
    } else {
      // Move to next player in turn
      this.advanceTurn();
    }
  }

  private advanceTurn(): void {
    const nonFolded = this.players.filter((p) => !p.folded && !p.isAllIn);
    if (nonFolded.length === 0) {
      this.advanceBettingRound();
      return;
    }

    const currentSeat = this.players.find((p) => p.id === this.activePlayerId)?.seatIndex ?? 0;
    const nextSeat = this.getNextActiveSeat(currentSeat, nonFolded);
    const nextPlayer = this.getPlayerBySeat(nextSeat);

    this.activePlayerId = nextPlayer ? nextPlayer.id : nonFolded[0].id;
    this.turnDeadline = Date.now() + this.config.turnTimerSeconds * 1000;
  }

  private advanceBettingRound(): void {
    this.collectBetsIntoPots();
    this.currentBet = 0;
    this.lastRaiseDelta = this.config.bigBlind;
    this.minRaise = this.config.bigBlind;
    this.actedThisRound.clear();

    for (const p of this.players) {
      p.currentBet = 0;
    }

    const nonFolded = this.players.filter((p) => !p.folded);
    const canStillBet = nonFolded.filter((p) => !p.isAllIn);

    // If 0 or 1 player can still bet, we can run out the board
    const fastForwardBoard = canStillBet.length <= 1;

    switch (this.phase) {
      case 'PREFLOP': {
        this.phase = 'FLOP';
        this.deck.pop(); // Burn card
        this.communityCards.push(this.deck.pop()!, this.deck.pop()!, this.deck.pop()!);
        break;
      }
      case 'FLOP': {
        this.phase = 'TURN';
        this.deck.pop(); // Burn card
        this.communityCards.push(this.deck.pop()!);
        break;
      }
      case 'TURN': {
        this.phase = 'RIVER';
        this.deck.pop(); // Burn card
        this.communityCards.push(this.deck.pop()!);
        break;
      }
      case 'RIVER': {
        this.phase = 'SHOWDOWN';
        this.resolveShowdown();
        return;
      }
      default:
        return;
    }

    if (fastForwardBoard) {
      // Automatically advance remaining cards to showdown
      this.advanceBettingRound();
      return;
    }

    // Set active player for postflop: first active seat clockwise from dealer
    const nextSeat = this.getNextActiveSeat(this.dealerSeatIndex, canStillBet);
    const nextPlayer = this.getPlayerBySeat(nextSeat);
    this.activePlayerId = nextPlayer ? nextPlayer.id : canStillBet[0].id;
    this.turnDeadline = Date.now() + this.config.turnTimerSeconds * 1000;
  }

  // ==========================================
  // Pot Building & Resolution
  // ==========================================

  private collectBetsIntoPots(): void {
    const contributors = this.players
      .filter((p) => p.totalHandBet > 0)
      .sort((a, b) => a.totalHandBet - b.totalHandBet);

    if (contributors.length === 0) return;

    // Reset pots and recalculate multi-way side pots cleanly based on totalHandBet
    this.pots = [];
    let previousLevel = 0;

    for (let i = 0; i < contributors.length; i++) {
      const currentLevel = contributors[i].totalHandBet;
      const incremental = currentLevel - previousLevel;

      if (incremental > 0) {
        let potAmount = 0;
        const eligiblePlayerIds: string[] = [];

        for (const p of this.players) {
          if (p.totalHandBet >= currentLevel) {
            potAmount += incremental;
            if (!p.folded) {
              eligiblePlayerIds.push(p.id);
            }
          } else if (p.totalHandBet > previousLevel) {
            potAmount += p.totalHandBet - previousLevel;
            if (!p.folded) {
              eligiblePlayerIds.push(p.id);
            }
          }
        }

        if (potAmount > 0) {
          const potName = this.pots.length === 0 ? 'Main Pot' : `Side Pot ${this.pots.length}`;
          this.pots.push({
            name: potName,
            amount: potAmount,
            eligiblePlayerIds,
          });
        }

        previousLevel = currentLevel;
      }
    }
  }

  private resolveSingleWinner(winner: Player): void {
    const totalPot = this.pots.reduce((sum, p) => sum + p.amount, 0);

    winner.chips += totalPot;
    this.currentBet = 0;
    for (const p of this.players) {
      p.currentBet = 0;
    }

    const award: PotAward = {
      potName: 'Main Pot',
      amount: totalPot,
      winnerIds: [winner.id],
      winnerNames: [winner.name],
      winningHandName: 'Uncontested (Everyone else folded)',
      winningCardIds: [],
    };

    this.recentAwards = [award];
    this.recordHandSummary([award]);
    this.phase = 'SHOWDOWN';
    this.activePlayerId = null;
    this.turnDeadline = null;
  }

  private resolveShowdown(): void {
    // Evaluate hands for non-folded players
    for (const p of this.players) {
      if (!p.folded && p.holeCards.length === 2 && this.communityCards.length >= 5) {
        p.evaluatedHand = evaluateHand([...p.holeCards, ...this.communityCards]);
      }
    }

    const awards: PotAward[] = [];

    for (const pot of this.pots) {
      if (pot.amount <= 0) continue;

      const contenders = this.players.filter(
        (p) => pot.eligiblePlayerIds.includes(p.id) && !p.folded && p.evaluatedHand
      );

      if (contenders.length === 0) {
        // Fallback: refund to eligible contributors
        continue;
      }

      // Sort contenders by best evaluated hand
      contenders.sort((a, b) => compareHands(b.evaluatedHand!, a.evaluatedHand!));

      // Find all winners who tied for the best hand
      const bestScore = contenders[0].evaluatedHand!.score;
      const winners = contenders.filter((p) => p.evaluatedHand!.score === bestScore);

      const splitShare = Math.floor(pot.amount / winners.length);
      let remainder = pot.amount % winners.length;

      for (const w of winners) {
        w.chips += splitShare;
      }

      // Remainder chips go to winner closest clockwise to dealer
      if (remainder > 0) {
        winners[0].chips += remainder;
      }

      const winningHand = winners[0].evaluatedHand!;
      awards.push({
        potName: pot.name,
        amount: pot.amount,
        winnerIds: winners.map((w) => w.id),
        winnerNames: winners.map((w) => w.name),
        winningHandName: winningHand.description,
        winningCardIds: winningHand.best5.map((c) => c.id),
      });
    }

    this.recentAwards = awards;
    this.recordHandSummary(awards);
    this.activePlayerId = null;
    this.turnDeadline = null;
  }

  private recordHandSummary(awards: PotAward[]): void {
    const totalPot = awards.reduce((sum, a) => sum + a.amount, 0);

    const playerSummaries: HandHistoryPlayerSummary[] = this.players.map((p) => {
      const starting = this.handStartingChips[p.id] ?? p.chips;
      const netChange = p.chips - starting;
      return {
        id: p.id,
        name: p.name,
        isAI: p.isAI,
        startingChips: starting,
        endingChips: p.chips,
        netChange,
        holeCards: [...p.holeCards],
        folded: p.folded,
        handName: p.evaluatedHand?.description || (p.folded ? 'Folded' : 'Active'),
      };
    });

    const summary: HandHistorySummary = {
      handId: `H${this.handNumber}-${Date.now().toString().slice(-6)}`,
      roomCode: this.roomCode,
      handNumber: this.handNumber,
      timestamp: Date.now(),
      communityCards: [...this.communityCards],
      totalPot,
      awards,
      actions: [...this.actionHistory],
      players: playerSummaries,
    };

    this.handHistory.unshift(summary);
    if (this.handHistory.length > 50) {
      this.handHistory.pop();
    }
  }

  // ==========================================
  // Helper & Sanitization Methods
  // ==========================================

  private getNextActiveSeat(fromSeat: number, pool: Player[]): number {
    const sortedSeats = pool.map((p) => p.seatIndex).sort((a, b) => a - b);
    for (const seat of sortedSeats) {
      if (seat > fromSeat) return seat;
    }
    return sortedSeats[0];
  }

  /**
   * Sanitizes the state sent to each client:
   * Protects private hole cards unless showdown or viewing self.
   */
  public getClientState(playerId: string): ClientGameState {
    const isShowdown = this.phase === 'SHOWDOWN';

    const clientPlayers: ClientPlayerView[] = this.players.map((p) => {
      const isSelf = p.id === playerId;
      const canSeeCards = isSelf || (isShowdown && !p.folded);

      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        chips: p.chips,
        currentBet: p.currentBet,
        folded: p.folded,
        isAllIn: p.isAllIn,
        isAI: p.isAI,
        seatIndex: p.seatIndex,
        isSpectator: p.isSpectator,
        lastAction: p.lastAction,
        holeCards: canSeeCards ? p.holeCards : undefined,
        cardCount: p.holeCards.length,
        evaluatedHand: isShowdown ? p.evaluatedHand : isSelf && p.holeCards.length === 2 && this.communityCards.length >= 3 ? evaluateHand([...p.holeCards, ...this.communityCards]) : undefined,
      };
    });

    const currentPot =
      this.pots.reduce((sum, p) => sum + p.amount, 0) +
      this.players.reduce((sum, p) => sum + p.currentBet, 0);

    return {
      roomCode: this.roomCode,
      roomId: this.roomId,
      hostId: this.hostId,
      phase: this.phase,
      handNumber: this.handNumber,
      players: clientPlayers,
      spectators: this.spectators,
      communityCards: this.communityCards,
      pots: this.pots,
      currentPot,
      activePlayerId: this.activePlayerId,
      dealerSeatIndex: this.dealerSeatIndex,
      smallBlindSeatIndex: this.smallBlindSeatIndex,
      bigBlindSeatIndex: this.bigBlindSeatIndex,
      turnDeadline: this.turnDeadline,
      config: this.config,
      legalActions: this.activePlayerId === playerId ? this.getLegalActions(playerId) : null,
      recentAwards: this.recentAwards,
      handHistory: this.handHistory,
      chatMessages: this.chatMessages.slice(-40),
      minRaise: this.minRaise,
      currentBet: this.currentBet,
    };
  }
}
