import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Card,
  ClientGameState,
  ClientPlayerView,
  PotAward,
} from '../poker/types';
import { PlayingCard } from './PlayingCard';
import { ChipStack } from './ChipStack';
import { AvatarIcon } from './AvatarIcon';

interface PokerTableProps {
  gameState: ClientGameState;
  myPlayerId: string;
  theme?: 'emerald' | 'royal' | 'crimson';
  fourColorDeck?: boolean;
}

export const PokerTable: React.FC<PokerTableProps> = ({
  gameState,
  myPlayerId,
  theme = 'emerald',
  fourColorDeck = true,
}) => {
  const {
    players,
    communityCards,
    pots,
    currentPot,
    activePlayerId,
    dealerSeatIndex,
    smallBlindSeatIndex,
    bigBlindSeatIndex,
    phase,
    recentAwards,
  } = gameState;

  // Felt color schemes
  const themeStyles = {
    emerald: 'from-emerald-900 via-emerald-950 to-[#032014] border-amber-900/60 shadow-emerald-950/80',
    royal: 'from-indigo-900 via-slate-950 to-[#070b19] border-blue-900/60 shadow-indigo-950/80',
    crimson: 'from-rose-950 via-slate-950 to-[#1e0508] border-rose-900/60 shadow-rose-950/80',
  };

  // 8 seats standard coordinates around an oval (in percentages: x: 0-100, y: 0-100)
  // Adjusted so seat 0 is bottom center (where user sits), going clockwise
  const seatPositions = [
    { x: 50, y: 84 },  // Seat 0: Bottom Center
    { x: 22, y: 80 },  // Seat 1: Bottom Left
    { x: 8,  y: 50 },  // Seat 2: Middle Left
    { x: 22, y: 18 },  // Seat 3: Top Left
    { x: 50, y: 14 },  // Seat 4: Top Center
    { x: 78, y: 18 },  // Seat 5: Top Right
    { x: 92, y: 50 },  // Seat 6: Middle Right
    { x: 78, y: 80 },  // Seat 7: Bottom Right
  ];

  // Map seats relative to myPlayerId so myPlayer sits at bottom center
  const myPlayer = players.find((p) => p.id === myPlayerId);
  const mySeatOffset = myPlayer ? myPlayer.seatIndex : 0;

  const getPositionForSeat = (seatIndex: number) => {
    const relativeSeat = (seatIndex - mySeatOffset + 8) % 8;
    return seatPositions[relativeSeat] || seatPositions[seatIndex % 8];
  };

  const isShowdown = phase === 'SHOWDOWN';

  return (
    <div className="relative w-full max-w-5xl aspect-[16/10] sm:aspect-[16/9] mx-auto select-none my-2">
      {/* Outer Wooden / Leather Rail */}
      <div className="absolute inset-0 rounded-[90px] sm:rounded-[140px] bg-gradient-to-b from-[#2a170b] via-[#1c0f07] to-[#120904] p-3 sm:p-5 shadow-2xl border-4 border-[#3e2210]">
        {/* Golden Inner Trim Accent */}
        <div className="w-full h-full rounded-[76px] sm:rounded-[124px] border-2 border-amber-600/40 p-1 bg-amber-950/20">
          {/* Felt Surface */}
          <div
            className={`w-full h-full rounded-[72px] sm:rounded-[120px] bg-radial ${themeStyles[theme]} relative flex flex-col items-center justify-center overflow-hidden border border-amber-500/20`}
          >
            {/* Center Felt Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
              <span className="font-serif font-extrabold text-5xl sm:text-7xl tracking-widest text-amber-300">
                POKERVERSE
              </span>
            </div>

            {/* ========================================= */}
            {/* Table Center: Pots & Community Cards      */}
            {/* ========================================= */}
            <div className="z-10 flex flex-col items-center gap-2 sm:gap-3 -mt-4">
              {/* Main Pot & Side Pots Badges */}
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {pots.length > 0 ? (
                  pots.map((pot, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-slate-950/80 backdrop-blur border border-amber-500/40 rounded-full px-3 py-1 flex items-center gap-2 shadow-lg"
                    >
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                        {pot.name}:
                      </span>
                      <ChipStack amount={pot.amount} size="sm" />
                    </motion.div>
                  ))
                ) : (
                  <div className="bg-slate-950/70 border border-slate-700 rounded-full px-3 py-0.5 text-xs text-slate-300 font-bold">
                    Pot: ${currentPot}
                  </div>
                )}
              </div>

              {/* Community Cards Board (5 slots) */}
              <div className="flex items-center gap-1.5 sm:gap-2.5 p-2 bg-slate-950/40 rounded-2xl border border-slate-800/60 backdrop-blur-sm">
                {[0, 1, 2, 3, 4].map((slotIdx) => {
                  const card = communityCards[slotIdx];
                  const winningCardIds = recentAwards?.[0]?.winningCardIds || [];
                  const isWinning = card && winningCardIds.includes(card.id);

                  if (!card) {
                    return (
                      <div
                        key={slotIdx}
                        className="w-10 h-14 sm:w-14 sm:h-20 rounded-lg border-2 border-dashed border-slate-700/50 bg-slate-900/30 flex items-center justify-center text-slate-600 text-xs font-bold"
                      >
                        {slotIdx === 0 ? 'FLOP' : slotIdx === 3 ? 'TURN' : slotIdx === 4 ? 'RIVER' : ''}
                      </div>
                    );
                  }

                  return (
                    <PlayingCard
                      key={card.id}
                      card={card}
                      size="md"
                      fourColor={fourColorDeck}
                      isWinning={isWinning}
                      delay={slotIdx * 0.08}
                    />
                  );
                })}
              </div>

              {/* Showdown Winner Announcement Banner */}
              <AnimatePresence>
                {isShowdown && recentAwards && recentAwards.length > 0 && (
                  <motion.div
                    initial={{ y: 20, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="bg-gradient-to-r from-amber-600/95 via-yellow-500/95 to-amber-600/95 text-slate-950 px-4 py-1.5 rounded-full shadow-2xl font-black text-xs sm:text-sm tracking-wide border-2 border-amber-200 flex items-center gap-2"
                  >
                    <span>🏆</span>
                    <span>{recentAwards[0].winnerNames.join(', ')} won with {recentAwards[0].winningHandName}!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ========================================= */}
            {/* Player Seats (Radially Arranged)          */}
            {/* ========================================= */}
            {players.map((player) => {
              const pos = getPositionForSeat(player.seatIndex);
              const isTurn = activePlayerId === player.id;
              const isDealer = dealerSeatIndex === player.seatIndex;
              const isSB = smallBlindSeatIndex === player.seatIndex;
              const isBB = bigBlindSeatIndex === player.seatIndex;
              const isMe = player.id === myPlayerId;

              const winningIds = recentAwards?.[0]?.winnerIds || [];
              const isWinner = isShowdown && winningIds.includes(player.id);

              return (
                <div
                  key={player.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                >
                  {/* Player Cards (Hole Cards) */}
                  <div className="flex items-center -space-x-3 mb-1">
                    {player.holeCards && player.holeCards.length > 0 ? (
                      player.holeCards.map((c, cIdx) => (
                        <PlayingCard
                          key={c.id || cIdx}
                          card={c}
                          size="sm"
                          fourColor={fourColorDeck}
                          isWinning={isWinner}
                        />
                      ))
                    ) : player.folded ? null : player.cardCount > 0 ? (
                      <>
                        <PlayingCard faceDown size="sm" />
                        <PlayingCard faceDown size="sm" />
                      </>
                    ) : null}
                  </div>

                  {/* Player Avatar Pod & HUD */}
                  <div
                    className={`relative flex items-center gap-2 px-3 py-1.5 rounded-2xl backdrop-blur-md shadow-xl transition-all duration-300 ${
                      isTurn
                        ? 'bg-amber-950/90 border-2 border-amber-400 ring-4 ring-amber-400/30 scale-105'
                        : isWinner
                        ? 'bg-yellow-950/90 border-2 border-yellow-400 ring-4 ring-yellow-400/40'
                        : player.folded
                        ? 'bg-slate-900/60 border border-slate-800 opacity-50'
                        : 'bg-slate-950/85 border border-slate-700/80'
                    }`}
                  >
                    {/* Avatar Icon */}
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-slate-100 ${
                        player.isAI
                          ? 'bg-purple-900 border border-purple-400'
                          : 'bg-slate-800 border border-amber-400'
                      }`}
                    >
                      <AvatarIcon name={player.avatar} size={16} />
                    </div>

                    {/* Name & Chips */}
                    <div className="flex flex-col text-left leading-tight">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-slate-100 truncate max-w-[80px] sm:max-w-[100px]">
                          {player.name}
                        </span>
                        {isMe && (
                          <span className="text-[9px] bg-amber-500/30 text-amber-300 font-extrabold px-1 rounded">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] font-bold text-amber-300">
                        ${player.chips.toLocaleString()}
                      </span>
                    </div>

                    {/* Dealer / Blind Badges */}
                    {isDealer && (
                      <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center shadow border border-amber-200">
                        D
                      </div>
                    )}
                    {isSB && !isDealer && (
                      <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center shadow border border-blue-400">
                        SB
                      </div>
                    )}
                    {isBB && !isDealer && (
                      <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[9px] flex items-center justify-center shadow border border-purple-400">
                        BB
                      </div>
                    )}
                  </div>

                  {/* Status Action Pill (Folded, Thinking, Call, Raise, All-in) */}
                  {player.lastAction && !player.folded && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`mt-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md uppercase tracking-wider ${
                        player.lastAction.type === 'thinking'
                          ? 'bg-purple-900/80 text-purple-200 border border-purple-600 animate-pulse'
                          : player.lastAction.type === 'all-in'
                          ? 'bg-rose-600 text-white border border-rose-300'
                          : player.lastAction.type === 'raise'
                          ? 'bg-amber-600 text-slate-950 border border-amber-300'
                          : player.lastAction.type === 'call'
                          ? 'bg-blue-600 text-white'
                          : player.lastAction.type === 'check'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {player.lastAction.type} {player.lastAction.amount ? `$${player.lastAction.amount}` : ''}
                    </motion.div>
                  )}

                  {player.folded && (
                    <div className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/80 text-rose-400 border border-rose-900/50 uppercase">
                      Folded
                    </div>
                  )}

                  {/* Current Bet on Table */}
                  {player.currentBet > 0 && (
                    <div className="mt-1 bg-slate-950/90 border border-amber-500/40 rounded-full px-2 py-0.5 shadow-md">
                      <ChipStack amount={player.currentBet} size="sm" />
                    </div>
                  )}

                  {/* Made Hand Label (Showdown or My Hand) */}
                  {player.evaluatedHand && (!player.folded || isMe) && (
                    <div className="mt-1 max-w-[120px] text-center text-[10px] font-semibold text-amber-200 bg-black/60 px-2 py-0.5 rounded border border-amber-500/20 truncate">
                      {player.evaluatedHand.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
